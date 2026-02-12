import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, OrderStatus } from '@b2b/prisma-schema';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (user.role === UserRole.ADMIN || user.role === UserRole.FACTORY_MANAGER) {
      return this.ordersService.findAllForAdmin(status, page, limit);
    }
    return this.ordersService.findAllForUser(user.id, status, page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user.role === UserRole.ADMIN ? undefined : user.id;
    return this.ordersService.findById(id, userId);
  }

  @Post(':id/push-to-production')
  @Roles(UserRole.RESELLER)
  pushToProduction(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.pushToProduction(id, userId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.RESELLER)
  cancelOrder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.cancelOrder(id, userId);
  }
}
