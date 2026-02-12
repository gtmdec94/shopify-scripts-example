import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyHmacGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const hmacHeader = request.headers['x-shopify-hmac-sha256'];
    const secret = this.config.get<string>('shopify.webhookSecret');

    if (!hmacHeader || !secret) {
      throw new UnauthorizedException('Missing HMAC signature');
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException('Missing request body for HMAC verification');
    }

    const computedHmac = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(hmacHeader),
      Buffer.from(computedHmac),
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid HMAC signature');
    }

    return true;
  }
}
