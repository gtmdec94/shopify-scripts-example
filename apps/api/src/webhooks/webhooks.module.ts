import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { OrdersCreateHandler } from './handlers/orders-create.handler';
import { AppUninstalledHandler } from './handlers/app-uninstalled.handler';
import { ProductsDeleteHandler } from './handlers/products-delete.handler';
import { CustomizationParserService } from './parsers/customization-parser.service';
import { LineItemResolverService } from './parsers/line-item-resolver.service';
import { ShopifyHmacGuard } from './guards/shopify-hmac.guard';

@Module({
  controllers: [WebhooksController],
  providers: [
    OrdersCreateHandler,
    AppUninstalledHandler,
    ProductsDeleteHandler,
    CustomizationParserService,
    LineItemResolverService,
    ShopifyHmacGuard,
  ],
})
export class WebhooksModule {}
