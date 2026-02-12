import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Handles importing products from B2B catalog to reseller's Shopify store.
 *
 * Uses Shopify GraphQL Admin API to:
 * 1. Create product on Shopify with hidden metafields (manufacturer_sku, print_config_id)
 * 2. Track the mapping in ShopifyProductMapping table
 */
@Injectable()
export class ShopifySyncService {
  private readonly logger = new Logger(ShopifySyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Import a product from B2B catalog to a reseller's Shopify store.
   */
  async importProduct(productId: string, shopifyStoreId: string, resellerPrice?: number) {
    // 1. Get the product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { isActive: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');

    // 2. Get the Shopify store
    const store = await this.prisma.shopifyStore.findUnique({
      where: { id: shopifyStoreId },
    });
    if (!store || !store.isActive) throw new NotFoundException('Shopify store not found or inactive');

    // 3. Check if already imported
    const existingMapping = await this.prisma.shopifyProductMapping.findUnique({
      where: {
        shopifyStoreId_productId: {
          shopifyStoreId: store.id,
          productId: product.id,
        },
      },
    });
    if (existingMapping) {
      throw new BadRequestException('Product already imported to this store');
    }

    // 4. Create product on Shopify via GraphQL Admin API
    // In production, this would call the actual Shopify API:
    //
    // const mutation = `mutation productCreate($input: ProductInput!) {
    //   productCreate(input: $input) {
    //     product { id handle }
    //     userErrors { field message }
    //   }
    // }`;
    //
    // const variables = {
    //   input: {
    //     title: product.title,
    //     bodyHtml: product.description,
    //     vendor: "B2B Platform",
    //     productType: product.category,
    //     images: product.images.map(url => ({ src: url })),
    //     variants: product.variants.map(v => ({
    //       sku: v.sku,
    //       price: String(resellerPrice || v.price),
    //       title: v.title,
    //       options: Object.values(v.options),
    //     })),
    //     metafields: [
    //       {
    //         namespace: "$app:b2b_reseller",
    //         key: "manufacturer_sku",
    //         type: "single_line_text_field",
    //         value: product.manufacturerSku,
    //       },
    //       {
    //         namespace: "$app:b2b_reseller",
    //         key: "print_config_id",
    //         type: "single_line_text_field",
    //         value: product.printConfigId || "",
    //       },
    //       {
    //         namespace: "$app:b2b_reseller",
    //         key: "customization_schema",
    //         type: "json",
    //         value: JSON.stringify(product.customizationSchema || {}),
    //       },
    //     ],
    //   },
    // };

    // Placeholder: simulate Shopify response
    const mockShopifyProductId = `gid://shopify/Product/${Date.now()}`;
    const mockHandle = product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    this.logger.log(
      `Importing product ${product.manufacturerSku} to store ${store.shopDomain} with hidden metafields`,
    );

    // 5. Create the mapping record
    const mapping = await this.prisma.shopifyProductMapping.create({
      data: {
        shopifyStoreId: store.id,
        productId: product.id,
        shopifyProductId: mockShopifyProductId,
        shopifyProductHandle: mockHandle,
        resellerPrice: resellerPrice || Number(product.basePrice),
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
      },
    });

    return {
      mapping,
      shopifyProductId: mockShopifyProductId,
      shopifyHandle: mockHandle,
      message: `Product "${product.title}" imported to ${store.shopDomain}`,
    };
  }

  /**
   * Re-sync product (update images/metafields only, NOT title/description/price).
   */
  async resyncProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const mappings = await this.prisma.shopifyProductMapping.findMany({
      where: { productId },
      include: { shopifyStore: true },
    });

    const results = [];
    for (const mapping of mappings) {
      if (!mapping.shopifyStore.isActive) continue;

      // In production: call Shopify productUpdate mutation
      // Only update: images, metafields (manufacturer_sku, print_config_id)
      // Do NOT update: title, description, price (reseller controls these)

      await this.prisma.shopifyProductMapping.update({
        where: { id: mapping.id },
        data: { lastSyncedAt: new Date(), syncStatus: 'SYNCED' },
      });

      results.push({
        storeId: mapping.shopifyStoreId,
        shopDomain: mapping.shopifyStore.shopDomain,
        status: 'synced',
      });
    }

    return { productId, syncedStores: results };
  }

  /**
   * Get all product mappings for a store.
   */
  async getStoreMappings(shopifyStoreId: string) {
    return this.prisma.shopifyProductMapping.findMany({
      where: { shopifyStoreId },
      include: {
        product: {
          select: { id: true, title: true, manufacturerSku: true, images: true, basePrice: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
