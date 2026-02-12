import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { OrderStatus } from '@b2b/prisma-schema';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  async findAllForUser(userId: string, status?: OrderStatus, page = 1, limit = 20) {
    const where: any = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          jobItems: {
            select: {
              id: true,
              status: true,
              manufacturerSku: true,
              quantity: true,
              unitCost: true,
              customizationData: true,
              qcPhotoUrl: true,
              trackingNumber: true,
            },
          },
          shopifyStore: {
            select: { shopDomain: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAllForAdmin(status?: OrderStatus, page = 1, limit = 20) {
    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, companyName: true } },
          jobItems: true,
          shopifyStore: { select: { shopDomain: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        user: { select: { id: true, email: true, companyName: true, firstName: true, lastName: true } },
        jobItems: {
          include: {
            productVariant: {
              include: { product: { select: { title: true, images: true } } },
            },
            statusHistory: { orderBy: { createdAt: 'asc' } },
          },
        },
        shopifyStore: { select: { shopDomain: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * Push order to production: debit wallet and move to QUEUED.
   */
  async pushToProduction(orderId: string, userId: string) {
    return this.walletService.processOrderPayment(orderId, userId);
  }

  /**
   * Cancel an order and refund wallet (only if all items are still NEW).
   */
  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'QUEUED') {
      return this.walletService.refundOrder(orderId, userId);
    }

    if (order.status === 'NEW') {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
      return { message: 'Order cancelled' };
    }

    throw new BadRequestException(`Cannot cancel order with status: ${order.status}`);
  }
}
