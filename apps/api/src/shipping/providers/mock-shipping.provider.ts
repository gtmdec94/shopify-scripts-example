import { ShippingProvider, CreateShipmentParams, ShipmentResult, TrackingStatus } from './shipping-provider.interface';
import * as crypto from 'crypto';

export class MockShippingProvider implements ShippingProvider {
  async createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
    const trackingNumber = `MOCK-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    return {
      trackingNumber,
      labelUrl: `https://mock-shipping.example.com/labels/${trackingNumber}.pdf`,
      carrier: 'Mock Carrier',
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  async getTrackingStatus(trackingNumber: string): Promise<TrackingStatus> {
    return {
      trackingNumber,
      status: 'in_transit',
      currentLocation: 'Mock Hub, India',
      events: [
        {
          timestamp: new Date().toISOString(),
          description: 'Package picked up',
          location: 'Origin Facility',
        },
      ],
    };
  }

  async cancelShipment(trackingNumber: string): Promise<void> {
    // Mock: no-op
  }
}
