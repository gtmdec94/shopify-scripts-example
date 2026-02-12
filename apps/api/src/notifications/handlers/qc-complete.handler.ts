import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import { JobStatus } from '@b2b/prisma-schema';

@Injectable()
export class QcCompleteHandler {
  private readonly logger = new Logger(QcCompleteHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('job.status.changed')
  async handle(event: { jobItemId: string; toStatus: string; userId: string }) {
    // Only send notification when item moves to PACKED (QC passed)
    if (event.toStatus !== JobStatus.PACKED) return;

    const jobItem = await this.prisma.jobItem.findUnique({
      where: { id: event.jobItemId },
      include: {
        order: {
          include: {
            user: { select: { email: true, firstName: true } },
          },
        },
        productVariant: {
          include: { product: { select: { title: true } } },
        },
      },
    });

    if (!jobItem || !jobItem.qcPhotoUrl) return;

    const reseller = jobItem.order.user;
    const productTitle = jobItem.productVariant.product.title;

    await this.notifications.sendEmail(
      reseller.email,
      `QC Passed: ${productTitle} - Order ${jobItem.order.shopifyOrderNumber}`,
      `
        <h2>Quality Check Passed</h2>
        <p>Hi ${reseller.firstName},</p>
        <p>Your item <strong>${productTitle}</strong> (SKU: ${jobItem.manufacturerSku}) has passed quality check and is packed.</p>
        <p><strong>QC Photo:</strong></p>
        <img src="${jobItem.qcPhotoUrl}" alt="QC Photo" style="max-width: 400px;" />
        ${jobItem.qcNotes ? `<p><strong>Notes:</strong> ${jobItem.qcNotes}</p>` : ''}
        <p>The item will be dispatched soon with tracking information.</p>
      `,
    );

    this.logger.log(`QC notification sent to ${reseller.email} for job ${event.jobItemId}`);
  }
}
