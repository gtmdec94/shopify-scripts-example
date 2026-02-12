import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomizationParserService } from '../parsers/customization-parser.service';
import { LineItemResolverService } from '../parsers/line-item-resolver.service';
import { Prisma } from '@b2b/prisma-schema';

@Injectable()
export class OrdersCreateHandler {
  private readonly logger = new Logger(OrdersCreateHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customizationParser: CustomizationParserService,
    private readonly lineItemResolver: LineItemResolverService,
  ) {}

  /**
   * Handle the Shopify orders/create webhook.
   *
   * Critical algorithm:
   * 1. Extract shop domain from header
   * 2. Look up ShopifyStore by domain
   * 3. For each line_item:
   *    a. Resolve via ShopifyProductMapping (NOT metafields — webhook doesn't include them)
   *    b. Extract customization data (file uploads, text inputs) from line item properties
   *    c. Calculate cost from B2B costPrice (NOT reseller's selling price)
   * 4. Create Order (status: NEW) + JobItem records atomically
   */
  async handle(shopDomain: string, payload: any) {
    this.logger.log(`Processing order ${payload.id} from ${shopDomain}`);

    // 1. Find the Shopify store
    const store = await this.prisma.shopifyStore.findUnique({
      where: { shopDomain },
    });

    if (!store) {
      this.logger.warn(`No store found for domain ${shopDomain}`);
      return;
    }

    if (!store.isActive) {
      this.logger.warn(`Store ${shopDomain} is inactive, skipping order`);
      return;
    }

    // 2. Check for duplicate (idempotency)
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        shopifyStoreId: store.id,
        shopifyOrderId: String(payload.id),
      },
    });

    if (existingOrder) {
      this.logger.log(`Order ${payload.id} already exists, skipping`);
      return;
    }

    // 3. Resolve line items to internal products
    const resolvedItems = [];
    let totalCost = new Prisma.Decimal(0);
    let totalResellerPrice = new Prisma.Decimal(0);

    for (const lineItem of payload.line_items || []) {
      const parsedCustomization = this.customizationParser.parse(lineItem.properties || []);

      const resolved = await this.lineItemResolver.resolve(
        store.id,
        lineItem,
        parsedCustomization,
      );

      if (resolved) {
        resolvedItems.push(resolved);
        totalCost = totalCost.add(
          new Prisma.Decimal(resolved.unitCost).mul(resolved.quantity),
        );
        totalResellerPrice = totalResellerPrice.add(
          new Prisma.Decimal(lineItem.price || '0').mul(resolved.quantity),
        );
      } else {
        this.logger.warn(
          `Could not resolve line item ${lineItem.product_id} / ${lineItem.variant_id}`,
        );
      }
    }

    if (resolvedItems.length === 0) {
      this.logger.log(`No resolvable items in order ${payload.id}, skipping`);
      return;
    }

    // 4. Create order + job items atomically
    const order = await this.prisma.order.create({
      data: {
        userId: store.userId,
        shopifyStoreId: store.id,
        shopifyOrderId: String(payload.id),
        shopifyOrderNumber: payload.name || `#${payload.order_number}`,
        status: 'NEW',
        totalCost,
        totalResellerPrice,
        currency: payload.currency || 'INR',
        shippingAddress: payload.shipping_address
          ? JSON.stringify(payload.shipping_address)
          : null,
        customerInfo: JSON.stringify({
          email: payload.email,
          firstName: payload.customer?.first_name,
          lastName: payload.customer?.last_name,
          phone: payload.phone || payload.customer?.phone,
        }),
        jobItems: {
          create: resolvedItems.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            status: 'NEW',
            manufacturerSku: item.manufacturerSku,
            printConfigId: item.printConfigId,
            customizationData: item.customizationData
              ? JSON.stringify(item.customizationData)
              : null,
            fileUploads: item.fileUploads ? JSON.stringify(item.fileUploads) : null,
          })),
        },
      },
      include: { jobItems: true },
    });

    this.logger.log(
      `Created order ${order.id} with ${order.jobItems.length} job items for store ${shopDomain}`,
    );

    return order;
  }
}
