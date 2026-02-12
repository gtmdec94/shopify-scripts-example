import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsDeleteHandler {
  private readonly logger = new Logger(ProductsDeleteHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(shopDomain: string, payload: any) {
    this.logger.log(`Product ${payload.id} deleted from ${shopDomain}`);

    const store = await this.prisma.shopifyStore.findUnique({
      where: { shopDomain },
    });

    if (!store) return;

    const shopifyProductGid = `gid://shopify/Product/${payload.id}`;

    await this.prisma.shopifyProductMapping.updateMany({
      where: {
        shopifyStoreId: store.id,
        shopifyProductId: shopifyProductGid,
      },
      data: {
        syncStatus: 'ERROR',
      },
    });
  }
}
