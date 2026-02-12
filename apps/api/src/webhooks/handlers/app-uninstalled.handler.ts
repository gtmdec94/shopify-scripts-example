import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AppUninstalledHandler {
  private readonly logger = new Logger(AppUninstalledHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(shopDomain: string) {
    this.logger.log(`App uninstalled from ${shopDomain}`);

    // Mark store as inactive but do NOT delete data
    await this.prisma.shopifyStore.updateMany({
      where: { shopDomain },
      data: {
        isActive: false,
        uninstalledAt: new Date(),
      },
    });
  }
}
