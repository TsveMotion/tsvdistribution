import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Order, Product } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET all orders
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const orders = await db.collection<Order>('orders')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new order
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderData = await request.json();
    
    // Validate required fields
    const requiredFields = ['customerName', 'customerEmail', 'customerAddress', 'items'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate address
    const addressFields = ['street', 'city', 'state', 'zipCode', 'country'];
    for (const field of addressFields) {
      if (!orderData.customerAddress[field]) {
        return NextResponse.json(
          { error: `Missing address field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate items
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Generate order number
    const orderNumber = `TSV-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Calculate totals
    let subtotal = 0;
    const processedItems = [];
    
    // Validate and process each item
    for (const item of orderData.items) {
      if (!item.productId || !ObjectId.isValid(item.productId)) {
        return NextResponse.json(
          { error: 'Invalid product ID in order items' },
          { status: 400 }
        );
      }
      
      const productId = new ObjectId(item.productId);
      const quantity = Number(item.quantity);
      
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity must be a positive number' },
          { status: 400 }
        );
      }
      
      // Get product details
      const product = await db.collection<Product>('products').findOne({ _id: productId });
      
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }
      
      // Check stock availability
      if (product.quantity < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for product: ${product.name}` },
          { status: 400 }
        );
      }
      
      const itemTotal = product.price * quantity;
      subtotal += itemTotal;
      
      processedItems.push({
        productId,
        productName: product.name,
        sku: product.sku,
        quantity,
        price: product.price,
        total: itemTotal
      });
    }
    
    // Calculate tax and total
    const taxRate = 0.20; // 20% VAT
    const tax = subtotal * taxRate;
    const shipping = orderData.shipping || 0;
    const total = subtotal + tax + shipping;
    
    // Create new order
    const newOrder: Order = {
      orderNumber,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerAddress: orderData.customerAddress,
      items: processedItems,
      status: 'pending',
      trackingNumber: orderData.trackingNumber,
      carrier: orderData.carrier,
      subtotal,
      tax,
      shipping,
      total,
      notes: orderData.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection<Order>('orders').insertOne(newOrder);
    
    return NextResponse.json({
      message: 'Order created successfully',
      orderId: result.insertedId,
      order: { ...newOrder, _id: result.insertedId }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
