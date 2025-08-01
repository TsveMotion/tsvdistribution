// Ship24 API Integration for shipment tracking

interface Ship24TrackerData {
  trackingNumber: string;
  shipmentReference?: string;
  clientTrackerId?: string;
  originCountryCode?: string;
  destinationCountryCode?: string;
  destinationPostCode?: string;
  shippingDate?: string;
  courierCode?: string[];
  courierName?: string;
  trackingUrl?: string;
  orderNumber?: string;
  title?: string;
  recipient?: {
    email?: string;
    name?: string;
  };
  settings?: {
    restrictTrackingToCourierCode?: boolean;
  };
}

interface Ship24Tracker {
  trackerId: string;
  trackingNumber: string;
  shipmentReference?: string;
  clientTrackerId?: string;
  isSubscribed: boolean;
  isTracked: boolean;
  createdAt: string;
}

interface Ship24TrackingEvent {
  eventId: string;
  trackingNumber: string;
  eventTrackingNumber: string;
  status: string;
  occurrenceDatetime: string;
  order: number;
  datetime: string;
  hasNoTime: boolean;
  utcOffset: string;
  location: string;
  sourceFile: string;
  courierCode: string;
  statusCode: string;
  statusCategory: string;
  statusMilestone: string;
  statusDescription: string;
}

interface Ship24TrackingResult {
  trackingNumber: string;
  shipmentReference?: string;
  events: Ship24TrackingEvent[];
}

class Ship24Service {
  private apiKey: string;
  private baseUrl = 'https://api.ship24.com/public/v1';

  constructor() {
    const apiKey = process.env.SHIP24_API_KEY;
    if (!apiKey) {
      throw new Error('Ship24 API key not found in environment variables');
    }
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ship24 API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Create a new tracker for a shipment
   */
  async createTracker(data: Ship24TrackerData): Promise<Ship24Tracker> {
    try {
      const response = await this.makeRequest('/trackers', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return response.data.tracker;
    } catch (error) {
      console.error('Error creating Ship24 tracker:', error);
      throw error;
    }
  }

  /**
   * Get tracking results for a tracker
   */
  async getTrackingResults(trackingNumbers: string[]): Promise<Ship24TrackingResult[]> {
    try {
      const response = await this.makeRequest('/trackers/track', {
        method: 'POST',
        body: JSON.stringify({
          trackingNumbers,
        }),
      });

      return response.data.trackings || [];
    } catch (error) {
      console.error('Error fetching tracking results:', error);
      throw error;
    }
  }

  /**
   * Get a single tracking result
   */
  async getSingleTrackingResult(trackingNumber: string): Promise<Ship24TrackingResult | null> {
    try {
      const results = await this.getTrackingResults([trackingNumber]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching single tracking result:', error);
      return null;
    }
  }

  /**
   * Get tracking results by tracker IDs
   */
  async getTrackerResults(trackerIds: string[]): Promise<Ship24TrackingResult[]> {
    try {
      const response = await this.makeRequest('/trackers/search', {
        method: 'POST',
        body: JSON.stringify({
          trackerIds,
        }),
      });

      return response.data.trackings || [];
    } catch (error) {
      console.error('Error fetching tracker results:', error);
      throw error;
    }
  }

  /**
   * Convert Ship24 events to our TrackingUpdate format
   */
  convertToTrackingUpdates(ship24Result: Ship24TrackingResult, orderId: string) {
    return ship24Result.events.map((event) => ({
      orderId,
      trackingNumber: ship24Result.trackingNumber,
      status: event.statusMilestone || event.status,
      location: event.location,
      timestamp: new Date(event.occurrenceDatetime),
      description: event.statusDescription,
      createdAt: new Date(),
      // Additional Ship24 specific data
      eventId: event.eventId,
      courierCode: event.courierCode,
      statusCode: event.statusCode,
      statusCategory: event.statusCategory,
    }));
  }

  /**
   * Get common courier codes for different carriers
   */
  static getCommonCourierCodes() {
    return {
      'fedex': ['fedex'],
      'ups': ['ups'],
      'usps': ['us-post'],
      'dhl': ['dhl', 'dhl-express'],
      'royal-mail': ['royal-mail'],
      'dpd': ['dpd', 'dpd-uk'],
      'hermes': ['hermes-uk'],
      'yodel': ['yodel'],
      'amazon': ['amazon-logistics'],
      'parcelforce': ['parcelforce'],
    };
  }

  /**
   * Auto-detect courier code from tracking number pattern
   */
  static detectCourierFromTrackingNumber(trackingNumber: string): string[] {
    const patterns = {
      'fedex': /^(\d{12}|\d{14}|\d{20})$/,
      'ups': /^1Z[0-9A-Z]{16}$/,
      'usps': /^(\d{20}|\d{9}|\d{13})$/,
      'dhl': /^(\d{10}|\d{11})$/,
      'royal-mail': /^[A-Z]{2}\d{9}GB$/,
    };

    for (const [courier, pattern] of Object.entries(patterns)) {
      if (pattern.test(trackingNumber)) {
        const courierCodes = Ship24Service.getCommonCourierCodes();
        return courierCodes[courier as keyof typeof courierCodes] || [courier];
      }
    }

    return [];
  }
}

export { Ship24Service, type Ship24TrackerData, type Ship24Tracker, type Ship24TrackingResult, type Ship24TrackingEvent };
