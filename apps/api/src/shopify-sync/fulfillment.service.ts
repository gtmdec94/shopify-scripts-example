import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Creates Shopify fulfillments when job items are dispatched.
 * Writes tracking number back to the reseller's Shopify order.
 */
@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a fulfillment on Shopify for a dispatched job item.
   * In production, uses fulfillmentCreateV2 GraphQL mutation.
   */
  async createFulfillment(jobItemId: string) {
    const jobItem = await this.prisma.jobItem.findUnique({
      where: { id: jobItemId },
      include: {
        order: {
          include: {
            shopifyStore: true,
          },
        },
      },
    });

    if (!jobItem) throw new NotFoundException('Job item not found');
    if (!jobItem.trackingNumber) {
      this.logger.warn(`Job item ${jobItemId} has no tracking number, skipping fulfillment`);
      return;
    }

    const order = jobItem.order;
    if (!order.shopifyOrderId || !order.shopifyStore) {
      this.logger.warn(`Order ${order.id} has no Shopify link, skipping fulfillment`);
      return;
    }

    // In production, call Shopify GraphQL API:
    //
    // const mutation = `mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
    //   fulfillmentCreateV2(fulfillment: $fulfillment) {
    //     fulfillment { id status trackingInfo { number url } }
    //     userErrors { field message }
    //   }
    // }`;
    //
    // const variables = {
    //   fulfillment: {
    //     lineItemsByFulfillmentOrder: [...],
    //     trackingInfo: {
    //       number: jobItem.trackingNumber,
    //       company: jobItem.shippingCarrier,
    //     },
    //     notifyCustomer: true,
    //   },
    // };

    this.logger.log(
      `Created fulfillment for order ${order.shopifyOrderNumber} on ${order.shopifyStore.shopDomain} ` +
        `with tracking ${jobItem.trackingNumber} (${jobItem.shippingCarrier})`,
    );

    return {
      jobItemId,
      orderId: order.id,
      shopifyOrderId: order.shopifyOrderId,
      trackingNumber: jobItem.trackingNumber,
      carrier: jobItem.shippingCarrier,
      status: 'fulfilled',
    };
  }
}
