import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShippingProvider, CreateShipmentParams, ShipmentResult, TrackingStatus } from './providers/shipping-provider.interface';
import { MockShippingProvider } from './providers/mock-shipping.provider';

@Injectable()
export class ShippingService {
  private provider: ShippingProvider;

  constructor(private readonly config: ConfigService) {
    const providerName = this.config.get<string>('shipping.provider') || 'mock';

    switch (providerName) {
      // Future: case 'shiprocket': this.provider = new ShiprocketProvider(config); break;
      // Future: case 'delhivery': this.provider = new DelhiveryProvider(config); break;
      default:
        this.provider = new MockShippingProvider();
    }
  }

  createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
    return this.provider.createShipment(params);
  }

  getTrackingStatus(trackingNumber: string): Promise<TrackingStatus> {
    return this.provider.getTrackingStatus(trackingNumber);
  }

  cancelShipment(trackingNumber: string): Promise<void> {
    return this.provider.cancelShipment(trackingNumber);
  }
}
