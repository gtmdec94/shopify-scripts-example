import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ShopifySyncService } from './shopify-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@b2b/prisma-schema';

@ApiTags('Shopify Sync')
@ApiBearerAuth()
@Controller('shopify-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopifySyncController {
  constructor(private readonly shopifySyncService: ShopifySyncService) {}

  @Post('import')
  @Roles(UserRole.RESELLER)
  importProduct(
    @Body('productId') productId: string,
    @Body('shopifyStoreId') shopifyStoreId: string,
    @Body('resellerPrice') resellerPrice?: number,
  ) {
    return this.shopifySyncService.importProduct(productId, shopifyStoreId, resellerPrice);
  }

  @Post('resync/:productId')
  @Roles(UserRole.ADMIN)
  resyncProduct(@Param('productId') productId: string) {
    return this.shopifySyncService.resyncProduct(productId);
  }

  @Get('store/:shopifyStoreId/mappings')
  @Roles(UserRole.RESELLER, UserRole.ADMIN)
  getStoreMappings(@Param('shopifyStoreId') shopifyStoreId: string) {
    return this.shopifySyncService.getStoreMappings(shopifyStoreId);
  }
}
