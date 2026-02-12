import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ResolvedLineItem {
  productVariantId: string;
  manufacturerSku: string;
  printConfigId: string | null;
  unitCost: number;
  quantity: number;
  shopifyLineItemId: string;
  customizationData: Record<string, string> | null;
  fileUploads: Array<{ url: string; name: string; type: string }> | null;
}

@Injectable()
export class LineItemResolverService {
  private readonly logger = new Logger(LineItemResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a Shopify line item to our internal product/variant.
   *
   * IMPORTANT: We resolve via the ShopifyProductMapping table, NOT via metafields
   * in the webhook payload (Shopify orders/create webhook does NOT include product metafields).
   */
  async resolve(
    shopifyStoreId: string,
    lineItem: {
      product_id: number;
      variant_id: number;
      quantity: number;
      properties: Array<{ name: string; value: string }>;
    },
    parsedCustomization: {
      customizationData: Record<string, string>;
      fileUploads: Array<{ url: string; name: string; type: string }>;
    },
  ): Promise<ResolvedLineItem | null> {
    // Look up the product mapping by Shopify product ID
    const shopifyProductGid = `gid://shopify/Product/${lineItem.product_id}`;

    const mapping = await this.prisma.shopifyProductMapping.findFirst({
      where: {
        shopifyStoreId,
        shopifyProductId: shopifyProductGid,
      },
      include: {
        product: {
          include: {
            variants: true,
          },
        },
      },
    });

    if (!mapping) {
      this.logger.warn(
        `No mapping found for Shopify product ${lineItem.product_id} in store ${shopifyStoreId}. ` +
          'This product may not have been imported through our platform.',
      );
      return null;
    }

    // Find the matching variant by Shopify variant ID or fall back to first variant
    const shopifyVariantGid = `gid://shopify/ProductVariant/${lineItem.variant_id}`;
    // For now, use the first variant. In production, maintain variant-level mapping.
    const variant = mapping.product.variants[0];

    if (!variant) {
      this.logger.warn(`No variants found for product ${mapping.product.id}`);
      return null;
    }

    return {
      productVariantId: variant.id,
      manufacturerSku: mapping.product.manufacturerSku,
      printConfigId: mapping.product.printConfigId,
      unitCost: Number(variant.costPrice),
      quantity: lineItem.quantity,
      shopifyLineItemId: String(lineItem.variant_id),
      customizationData:
        Object.keys(parsedCustomization.customizationData).length > 0
          ? parsedCustomization.customizationData
          : null,
      fileUploads:
        parsedCustomization.fileUploads.length > 0
          ? parsedCustomization.fileUploads
          : null,
    };
  }
}
