import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { WalletModule } from './wallet/wallet.module';
import { OrdersModule } from './orders/orders.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ShopifySyncModule } from './shopify-sync/shopify-sync.module';
import { ManufacturingModule } from './manufacturing/manufacturing.module';
import { UploadsModule } from './uploads/uploads.module';
import { ShippingModule } from './shipping/shipping.module';
import { NotificationsModule } from './notifications/notifications.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    WalletModule,
    OrdersModule,
    WebhooksModule,
    ShopifySyncModule,
    ManufacturingModule,
    UploadsModule,
    ShippingModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
