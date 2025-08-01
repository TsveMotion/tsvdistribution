import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Order } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';

// GET a single order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const order = await db.collection<Order>('orders').findOne({
      _id: new ObjectId(id),
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update an order by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    
    // Prevent updating _id field
    if (updateData._id) {
      delete updateData._id;
    }

    // Prevent updating orderNumber
    if (updateData.orderNumber) {
      delete updateData.orderNumber;
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Handle status changes with timestamps
    if (updateData.status) {
      if (updateData.status === 'shipped' && !updateData.shippedAt) {
        updateData.shippedAt = new Date();
      } else if (updateData.status === 'delivered' && !updateData.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
    }

    const db = await getDatabase();
    
    // Check if order exists
    const existingOrder = await db.collection<Order>('orders').findOne({
      _id: new ObjectId(id),
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const result = await db.collection<Order>('orders').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No changes made to the order' },
        { status: 400 }
      );
    }

    // Get updated order
    const updatedOrder = await db.collection<Order>('orders').findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      message: 'Order updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE an order by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if order exists
    const existingOrder = await db.collection<Order>('orders').findOne({
      _id: new ObjectId(id),
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Allow deletion of pending and delivered orders
    if (!['pending', 'delivered', 'cancelled'].includes(existingOrder.status)) {
      return NextResponse.json(
        { error: 'Only pending, delivered, or cancelled orders can be deleted' },
        { status: 400 }
      );
    }

    const result = await db.collection<Order>('orders').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Order deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
