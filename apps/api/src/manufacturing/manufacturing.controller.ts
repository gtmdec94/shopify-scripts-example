import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ManufacturingService } from './manufacturing.service';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, JobStatus } from '@b2b/prisma-schema';

@ApiTags('Manufacturing')
@ApiBearerAuth()
@Controller('manufacturing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManufacturingController {
  constructor(private readonly manufacturingService: ManufacturingService) {}

  @Get('job-items')
  @Roles(UserRole.ADMIN, UserRole.FACTORY_MANAGER, UserRole.QC_INSPECTOR, UserRole.PACKER)
  getJobItems(
    @Query('status') status?: JobStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.manufacturingService.getJobItems(status, page, limit);
  }

  @Get('job-items/:id')
  @Roles(UserRole.ADMIN, UserRole.FACTORY_MANAGER, UserRole.QC_INSPECTOR, UserRole.PACKER)
  getJobItem(@Param('id') id: string) {
    return this.manufacturingService.getJobItemById(id);
  }

  @Patch('job-items/:id/status')
  @Roles(UserRole.ADMIN, UserRole.FACTORY_MANAGER, UserRole.QC_INSPECTOR, UserRole.PACKER)
  updateJobStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.manufacturingService.updateJobStatus(id, dto, userId, userRole);
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN, UserRole.FACTORY_MANAGER)
  getAnalytics() {
    return this.manufacturingService.getAnalytics();
  }
}
