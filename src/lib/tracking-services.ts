/**
 * Tracking service integrations for various carriers
 * 
 * This module provides interfaces to different carrier tracking APIs
 * using Ship24 as the primary tracking provider
 */

import { TrackingUpdate } from '@/types/database';
import { ObjectId } from 'mongodb';
import { Ship24Service, Ship24TrackerData } from './ship24';

// Base interface for tracking responses
interface TrackingResponse {
  isSuccess: boolean;
  trackingNumber: string;
  carrier: string;
  status: string;
  location?: string;
  timestamp?: Date;
  description?: string;
  error?: string;
}

// Ship24 tracking service for all carriers
export async function trackWithShip24(trackingNumber: string, courierCode?: string[]): Promise<TrackingResponse> {
  try {
    const ship24 = new Ship24Service();
    
    // Auto-detect courier if not provided
    const detectedCouriers = courierCode || Ship24Service.detectCourierFromTrackingNumber(trackingNumber);
    
    // Get tracking results
    const result = await ship24.getSingleTrackingResult(trackingNumber);
    
    if (!result || !result.events || result.events.length === 0) {
      return {
        isSuccess: false,
        trackingNumber,
        carrier: detectedCouriers.join(', ') || 'Unknown',
        status: 'No tracking information available',
        error: 'No tracking events found'
      };
    }
    
    // Get the latest event
    const latestEvent = result.events[0]; // Events are ordered by date
    
    return {
      isSuccess: true,
      trackingNumber,
      carrier: latestEvent.courierCode || detectedCouriers.join(', ') || 'Unknown',
      status: latestEvent.statusMilestone || latestEvent.status,
      location: latestEvent.location,
      timestamp: new Date(latestEvent.occurrenceDatetime),
      description: latestEvent.statusDescription
    };
    
    return {
      isSuccess: true,
      trackingNumber,
      carrier: 'Royal Mail',
      status: randomStatus,
      location: randomLocation,
      timestamp: new Date(),
      description: `Package ${randomStatus.toLowerCase()} at ${randomLocation}`
    };
  } catch (error) {
    console.error('Royal Mail tracking error:', error);
    return {
      isSuccess: false,
      trackingNumber,
      carrier: 'Royal Mail',
      status: 'Error',
      error: 'Failed to retrieve tracking information'
    };
  }
}

// Evri tracking service
export async function trackEvri(trackingNumber: string): Promise<TrackingResponse> {
  try {
    // In a real implementation, this would call the Evri API
    // For now, we'll simulate a response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a random status for demonstration
    const statuses = [
      'Picked up',
      'At local depot',
      'With courier',
      'Delivered',
      'Delivery attempted'
    ];
    
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const locations = [
      'Leeds Hub',
      'Newcastle Depot',
      'Bristol Distribution Center',
      'Local Courier Facility',
      'Regional Sorting Center'
    ];
    
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    return {
      isSuccess: true,
      trackingNumber,
      carrier: 'Evri',
      status: randomStatus,
      location: randomLocation,
      timestamp: new Date(),
      description: `Package ${randomStatus.toLowerCase()} at ${randomLocation}`
    };
  } catch (error) {
    console.error('Evri tracking error:', error);
    return {
      isSuccess: false,
      trackingNumber,
      carrier: 'Evri',
      status: 'Error',
      error: 'Failed to retrieve tracking information'
    };
  }
}

// Track17 tracking service
export async function trackTrack17(trackingNumber: string): Promise<TrackingResponse> {
  try {
    // In a real implementation, this would call the Track17 API
    // For now, we'll simulate a response
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate a random status for demonstration
    const statuses = [
      'Accepted',
      'In Transit',
      'Arrived at Destination',
      'Out for Delivery',
      'Delivered'
    ];
    
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const locations = [
      'Origin Country',
      'Transit Country',
      'Destination Country',
      'Local Distribution Center',
      'Delivery Area'
    ];
    
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    
    return {
      isSuccess: true,
      trackingNumber,
      carrier: 'Track17',
      status: randomStatus,
      location: randomLocation,
      timestamp: new Date(),
      description: `Package ${randomStatus.toLowerCase()} at ${randomLocation}`
    };
  } catch (error) {
    console.error('Track17 tracking error:', error);
    return {
      isSuccess: false,
      trackingNumber,
      carrier: 'Track17',
      status: 'Error',
      error: 'Failed to retrieve tracking information'
    };
  }
}

// Generic tracking function that selects the appropriate service
export async function trackPackage(
  trackingNumber: string, 
  carrier: string
): Promise<TrackingResponse> {
  switch (carrier.toLowerCase()) {
    case 'royal mail':
      return trackRoyalMail(trackingNumber);
    case 'evri':
      return trackEvri(trackingNumber);
    case 'track17':
      return trackTrack17(trackingNumber);
    default:
      // Default to Track17 for unknown carriers
      return trackTrack17(trackingNumber);
  }
}

// Convert tracking response to database tracking update
export function createTrackingUpdate(
  orderId: ObjectId,
  response: TrackingResponse
): TrackingUpdate {
  return {
    orderId,
    trackingNumber: response.trackingNumber,
    status: response.status,
    location: response.location || 'Unknown',
    timestamp: response.timestamp || new Date(),
    description: response.description || `Status updated to ${response.status}`,
    createdAt: new Date()
  };
}
