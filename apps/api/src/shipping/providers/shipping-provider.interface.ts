export interface CreateShipmentParams {
  orderId: string;
  recipientName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  weight: number; // in grams
  dimensions?: { length: number; width: number; height: number }; // in cm
}

export interface ShipmentResult {
  trackingNumber: string;
  labelUrl: string;
  carrier: string;
  estimatedDelivery?: string;
}

export interface TrackingStatus {
  trackingNumber: string;
  status: string;
  currentLocation?: string;
  events: Array<{
    timestamp: string;
    description: string;
    location?: string;
  }>;
}

export interface ShippingProvider {
  createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;
  getTrackingStatus(trackingNumber: string): Promise<TrackingStatus>;
  cancelShipment(trackingNumber: string): Promise<void>;
}
