import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { TrackingUpdate, Order } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';
import { trackPackage, createTrackingUpdate } from '@/lib/tracking-services';

// GET tracking updates for an order
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const trackingNumber = searchParams.get('trackingNumber');

    if (!orderId && !trackingNumber) {
      return NextResponse.json(
        { error: 'Either orderId or trackingNumber is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    let query = {};

    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { error: 'Invalid order ID format' },
          { status: 400 }
        );
      }
      query = { orderId: new ObjectId(orderId) };
    } else if (trackingNumber) {
      query = { trackingNumber };
    }

    const trackingUpdates = await db.collection<TrackingUpdate>('trackingUpdates')
      .find(query)
      .sort({ timestamp: -1 })
      .toArray();

    return NextResponse.json(trackingUpdates);
  } catch (error) {
    console.error('Error fetching tracking updates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to refresh tracking information
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { error: 'Valid order ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Get the order
    const order = await db.collection<Order>('orders').findOne({
      _id: new ObjectId(orderId)
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.trackingNumber || !order.carrier) {
      return NextResponse.json(
        { error: 'Order does not have tracking information' },
        { status: 400 }
      );
    }

    // Get tracking information from the carrier
    const trackingResponse = await trackPackage(order.trackingNumber, order.carrier);

    if (!trackingResponse.isSuccess) {
      return NextResponse.json(
        { error: trackingResponse.error || 'Failed to retrieve tracking information' },
        { status: 500 }
      );
    }

    // Create tracking update
    const trackingUpdate = createTrackingUpdate(order._id!, trackingResponse);

    // Save tracking update to database
    await db.collection<TrackingUpdate>('trackingUpdates').insertOne(trackingUpdate);

    // Update order status if needed
    if (trackingResponse.status.toLowerCase() === 'delivered' && order.status !== 'delivered') {
      await db.collection<Order>('orders').updateOne(
        { _id: order._id },
        { 
          $set: { 
            status: 'delivered',
            deliveredAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );
    } else if (
      ['in transit', 'shipped', 'picked up', 'accepted'].some(
        status => trackingResponse.status.toLowerCase().includes(status)
      ) && 
      order.status === 'pending'
    ) {
      await db.collection<Order>('orders').updateOne(
        { _id: order._id },
        { 
          $set: { 
            status: 'shipped',
            shippedAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );
    }

    return NextResponse.json({
      message: 'Tracking information updated successfully',
      trackingUpdate
    });
  } catch (error) {
    console.error('Error updating tracking information:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
