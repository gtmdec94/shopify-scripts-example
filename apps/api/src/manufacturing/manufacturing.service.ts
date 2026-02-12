import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatusMachine } from './job-status-machine';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { JobStatus, OrderStatus, UserRole } from '@b2b/prisma-schema';
import { FulfillmentService } from '../shopify-sync/fulfillment.service';

@Injectable()
export class ManufacturingService {
  private readonly logger = new Logger(ManufacturingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly statusMachine: JobStatusMachine,
    private readonly eventEmitter: EventEmitter2,
    private readonly fulfillmentService: FulfillmentService,
  ) {}

  async getJobItems(status?: JobStatus, page = 1, limit = 50) {
    const where: any = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.jobItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          order: {
            select: {
              id: true,
              shopifyOrderNumber: true,
              shippingAddress: true,
              customerInfo: true,
              user: { select: { companyName: true, email: true } },
            },
          },
          productVariant: {
            include: { product: { select: { title: true, images: true } } },
          },
        },
      }),
      this.prisma.jobItem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getJobItemById(id: string) {
    const item = await this.prisma.jobItem.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            user: { select: { id: true, email: true, companyName: true } },
            shopifyStore: { select: { shopDomain: true } },
          },
        },
        productVariant: {
          include: { product: true },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!item) throw new NotFoundException('Job item not found');
    return item;
  }

  /**
   * Update job item status with validation, conditional requirements, and side effects.
   */
  async updateJobStatus(
    jobItemId: string,
    dto: UpdateJobStatusDto,
    userId: string,
    userRole: UserRole,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const jobItem = await tx.jobItem.findUnique({
        where: { id: jobItemId },
        include: { order: true },
      });

      if (!jobItem) throw new NotFoundException('Job item not found');

      // 1. Validate the transition (checks allowed transitions, required fields, roles)
      this.statusMachine.validateTransition(jobItem.status, dto.status, dto, userRole);

      // 2. Update the job item
      const updated = await tx.jobItem.update({
        where: { id: jobItemId },
        data: {
          status: dto.status,
          qcPhotoUrl: dto.qcPhotoUrl ?? jobItem.qcPhotoUrl,
          qcNotes: dto.qcNotes ?? jobItem.qcNotes,
          trackingNumber: dto.trackingNumber ?? jobItem.trackingNumber,
          shippingCarrier: dto.shippingCarrier ?? jobItem.shippingCarrier,
          assignedTo: dto.assignedTo ?? jobItem.assignedTo,
          startedAt: dto.status === JobStatus.PRINTING ? new Date() : jobItem.startedAt,
          completedAt: dto.status === JobStatus.DISPATCHED ? new Date() : jobItem.completedAt,
        },
      });

      // 3. Create status log entry
      await tx.jobStatusLog.create({
        data: {
          jobItemId,
          fromStatus: jobItem.status,
          toStatus: dto.status,
          changedBy: userId,
          notes: dto.notes,
          photoUrl: dto.qcPhotoUrl,
        },
      });

      // 4. Update order status based on job item statuses
      await this.updateOrderStatus(tx, jobItem.orderId);

      return updated;
    }).then(async (updated) => {
      // 5. Post-transaction side effects (non-transactional)
      this.eventEmitter.emit('job.status.changed', {
        jobItemId,
        fromStatus: dto.status, // Will be current status at this point
        toStatus: dto.status,
        userId,
      });

      // If dispatched, trigger Shopify fulfillment
      if (dto.status === JobStatus.DISPATCHED && dto.trackingNumber) {
        await this.fulfillmentService
          .createFulfillment(jobItemId)
          .catch((err) => this.logger.error(`Failed to create Shopify fulfillment: ${err.message}`));
      }

      return updated;
    });
  }

  /**
   * Check all job items for an order and update the order status accordingly.
   */
  private async updateOrderStatus(tx: any, orderId: string) {
    const jobItems = await tx.jobItem.findMany({
      where: { orderId },
      select: { status: true },
    });

    const statuses = jobItems.map((i: any) => i.status);
    let newOrderStatus: OrderStatus | null = null;

    if (statuses.every((s: JobStatus) => s === JobStatus.DISPATCHED)) {
      newOrderStatus = OrderStatus.SHIPPED;
    } else if (statuses.some((s: JobStatus) => s === JobStatus.DISPATCHED)) {
      newOrderStatus = OrderStatus.PARTIALLY_SHIPPED;
    } else if (
      statuses.some(
        (s: JobStatus) =>
          s === JobStatus.PRINTING ||
          s === JobStatus.QUALITY_CHECK ||
          s === JobStatus.PACKED ||
          s === JobStatus.QC_FAILED,
      )
    ) {
      newOrderStatus = OrderStatus.IN_PRODUCTION;
    }

    if (newOrderStatus) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: newOrderStatus },
      });
    }
  }

  /**
   * Get manufacturing analytics summary.
   */
  async getAnalytics() {
    const statusCounts = await this.prisma.jobItem.groupBy({
      by: ['status'],
      _count: true,
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCompleted = await this.prisma.jobItem.count({
      where: {
        status: JobStatus.DISPATCHED,
        completedAt: { gte: todayStart },
      },
    });

    const qcFailRate = await this.prisma.jobStatusLog.count({
      where: { toStatus: JobStatus.QC_FAILED },
    });

    const totalQcChecks = await this.prisma.jobStatusLog.count({
      where: {
        fromStatus: JobStatus.QUALITY_CHECK,
      },
    });

    return {
      statusCounts: statusCounts.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count }),
        {} as Record<string, number>,
      ),
      todayDispatched: todayCompleted,
      qcFailureRate: totalQcChecks > 0 ? (qcFailRate / totalQcChecks) * 100 : 0,
    };
  }
}
