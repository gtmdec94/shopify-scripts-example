import { Controller, Post, Headers, Body, UseGuards, Logger, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ShopifyHmacGuard } from './guards/shopify-hmac.guard';
import { OrdersCreateHandler } from './handlers/orders-create.handler';
import { AppUninstalledHandler } from './handlers/app-uninstalled.handler';
import { ProductsDeleteHandler } from './handlers/products-delete.handler';

@ApiTags('Webhooks')
@Controller('webhooks/shopify')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly ordersCreateHandler: OrdersCreateHandler,
    private readonly appUninstalledHandler: AppUninstalledHandler,
    private readonly productsDeleteHandler: ProductsDeleteHandler,
  ) {}

  @Post('orders-create')
  @UseGuards(ShopifyHmacGuard)
  async handleOrdersCreate(
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-webhook-id') webhookId: string,
    @Body() payload: any,
  ) {
    this.logger.log(`Received orders/create webhook ${webhookId} from ${shopDomain}`);
    // In production, this should enqueue to BullMQ and return 200 immediately.
    // For now, process synchronously.
    await this.ordersCreateHandler.handle(shopDomain, payload);
    return { received: true };
  }

  @Post('app-uninstalled')
  @UseGuards(ShopifyHmacGuard)
  async handleAppUninstalled(
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Body() payload: any,
  ) {
    await this.appUninstalledHandler.handle(shopDomain);
    return { received: true };
  }

  @Post('products-delete')
  @UseGuards(ShopifyHmacGuard)
  async handleProductsDelete(
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Body() payload: any,
  ) {
    await this.productsDeleteHandler.handle(shopDomain, payload);
    return { received: true };
  }
}
