import { Module } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service';
import { ManufacturingController } from './manufacturing.controller';
import { JobStatusMachine } from './job-status-machine';
import { ShopifySyncModule } from '../shopify-sync/shopify-sync.module';

@Module({
  imports: [ShopifySyncModule],
  providers: [ManufacturingService, JobStatusMachine],
  controllers: [ManufacturingController],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}
