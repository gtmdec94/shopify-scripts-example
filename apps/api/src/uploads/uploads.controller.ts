import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presigned-url')
  @UseGuards(JwtAuthGuard)
  getPresignedUrl(
    @Body('folder') folder: string,
    @Body('filename') filename: string,
    @Body('contentType') contentType: string,
  ) {
    return this.uploadsService.getPresignedUploadUrl(
      folder || 'general',
      filename,
      contentType,
    );
  }

  /**
   * Storefront upload endpoint (called via Shopify App Proxy).
   * Does not require JWT — authenticated by Shopify proxy signature.
   */
  @Post('storefront')
  storefrontUpload(
    @Body('filename') filename: string,
    @Body('contentType') contentType: string,
  ) {
    return this.uploadsService.getPresignedUploadUrl('storefront-uploads', filename, contentType);
  }
}
