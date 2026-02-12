import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QcCompleteHandler } from './handlers/qc-complete.handler';

@Module({
  providers: [NotificationsService, QcCompleteHandler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
