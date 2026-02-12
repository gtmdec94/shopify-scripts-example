import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@b2b/prisma-schema';

export class InsufficientBalanceException extends HttpException {
  constructor(currentBalance: Prisma.Decimal, requiredAmount: Prisma.Decimal) {
    super(
      {
        message: 'Insufficient wallet balance',
        currentBalance: currentBalance.toString(),
        requiredAmount: requiredAmount.toString(),
        shortfall: requiredAmount.minus(currentBalance).toString(),
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, balance: true, currency: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * CRITICAL: ACID-compliant order payment debit.
   * Uses SELECT FOR UPDATE to prevent concurrent double-debit.
   *
   * Flow:
   * 1. Lock wallet row
   * 2. Calculate total cost from order job items
   * 3. Check sufficient balance
   * 4. Debit wallet with optimistic lock version check
   * 5. Create ledger transaction
   * 6. Update order status to QUEUED
   * 7. All atomic — any failure rolls back everything
   */
  async processOrderPayment(orderId: string, userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Lock the wallet row to prevent concurrent modifications
        const walletRows = await tx.$queryRaw<
          Array<{ id: string; balance: string; version: number }>
        >`SELECT id, balance, version FROM wallets WHERE user_id = ${userId} FOR UPDATE`;

        if (!walletRows.length) {
          throw new NotFoundException('Wallet not found');
        }
        const wallet = walletRows[0];
        const currentBalance = new Prisma.Decimal(wallet.balance);

        // 2. Get the order and calculate total cost
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { jobItems: true },
        });

        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new BadRequestException('Order does not belong to this user');
        if (order.status !== 'NEW' && order.status !== 'AWAITING_PAYMENT') {
          throw new BadRequestException(`Order cannot be pushed to production from status: ${order.status}`);
        }

        const totalCost = order.jobItems.reduce(
          (sum, item) => sum.add(new Prisma.Decimal(item.unitCost.toString()).mul(item.quantity)),
          new Prisma.Decimal(0),
        );

        // 3. Check sufficient balance
        if (currentBalance.lessThan(totalCost)) {
          // Update order status to AWAITING_PAYMENT so reseller knows
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'AWAITING_PAYMENT' },
          });
          throw new InsufficientBalanceException(currentBalance, totalCost);
        }

        // 4. Debit wallet with optimistic lock
        const newBalance = currentBalance.minus(totalCost);
        const updateResult = await tx.wallet.updateMany({
          where: { id: wallet.id, version: wallet.version },
          data: {
            balance: newBalance,
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new BadRequestException('Concurrent wallet modification detected, please retry');
        }

        // 5. Create transaction ledger entry
        const walletTxn = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: 'DEBIT_ORDER',
            amount: totalCost,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            reference: orderId,
            description: `Order ${order.shopifyOrderNumber || order.id}`,
          },
        });

        // 6. Update order status to QUEUED
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'QUEUED',
            walletTransactionId: walletTxn.id,
            pushedToProductionAt: new Date(),
            totalCost,
          },
        });

        return walletTxn;
      },
      {
        timeout: 10000,
      },
    );
  }

  /**
   * Admin credits a reseller's wallet (e.g., bank transfer received).
   */
  async topup(userId: string, amount: number, description?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    return this.prisma.$transaction(async (tx) => {
      const walletRows = await tx.$queryRaw<
        Array<{ id: string; balance: string; version: number }>
      >`SELECT id, balance, version FROM wallets WHERE user_id = ${userId} FOR UPDATE`;

      if (!walletRows.length) throw new NotFoundException('Wallet not found');
      const wallet = walletRows[0];
      const currentBalance = new Prisma.Decimal(wallet.balance);
      const creditAmount = new Prisma.Decimal(amount);
      const newBalance = currentBalance.add(creditAmount);

      await tx.wallet.updateMany({
        where: { id: wallet.id, version: wallet.version },
        data: { balance: newBalance, version: { increment: 1 } },
      });

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'CREDIT_TOPUP',
          amount: creditAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          description: description || 'Wallet topup',
        },
      });
    });
  }

  /**
   * Refund an order back to wallet. Only allowed if all job items are still NEW.
   */
  async refundOrder(orderId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { jobItems: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== 'QUEUED') {
        throw new BadRequestException('Only QUEUED orders can be refunded');
      }

      // Check that no job items have started manufacturing
      const startedItems = order.jobItems.filter((item) => item.status !== 'NEW');
      if (startedItems.length > 0) {
        throw new BadRequestException('Cannot refund: some items have already entered production');
      }

      const walletRows = await tx.$queryRaw<
        Array<{ id: string; balance: string; version: number }>
      >`SELECT id, balance, version FROM wallets WHERE user_id = ${userId} FOR UPDATE`;

      if (!walletRows.length) throw new NotFoundException('Wallet not found');
      const wallet = walletRows[0];
      const currentBalance = new Prisma.Decimal(wallet.balance);
      const refundAmount = new Prisma.Decimal(order.totalCost.toString());
      const newBalance = currentBalance.add(refundAmount);

      await tx.wallet.updateMany({
        where: { id: wallet.id, version: wallet.version },
        data: { balance: newBalance, version: { increment: 1 } },
      });

      const walletTxn = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: 'CREDIT_REFUND',
          amount: refundAmount,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          reference: orderId,
          description: `Refund for order ${order.shopifyOrderNumber || order.id}`,
        },
      });

      // Update order and job items
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      return walletTxn;
    });
  }
}
