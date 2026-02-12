import { Module } from '@nestjs/common';
import { ShopifySyncService } from './shopify-sync.service';
import { ShopifySyncController } from './shopify-sync.controller';
import { FulfillmentService } from './fulfillment.service';

@Module({
  providers: [ShopifySyncService, FulfillmentService],
  controllers: [ShopifySyncController],
  exports: [ShopifySyncService, FulfillmentService],
})
export class ShopifySyncModule {}
