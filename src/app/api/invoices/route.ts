import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Invoice, Order } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET all invoices
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const invoices = await db.collection<Invoice>('invoices')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new invoice
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
    
    // Check if order exists
    const order = await db.collection<Order>('orders').findOne({
      _id: new ObjectId(orderId)
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if invoice already exists for this order
    const existingInvoice = await db.collection<Invoice>('invoices').findOne({
      orderId: new ObjectId(orderId)
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice already exists for this order', invoiceId: existingInvoice._id },
        { status: 409 }
      );
    }

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    // Set due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice items from order items
    const invoiceItems = order.items.map(item => ({
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      price: item.price,
      total: item.total
    }));

    // Create new invoice
    const newInvoice: Invoice = {
      invoiceNumber,
      orderId: new ObjectId(orderId),
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      items: invoiceItems,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      status: 'draft',
      dueDate,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection<Invoice>('invoices').insertOne(newInvoice);

    return NextResponse.json({
      message: 'Invoice created successfully',
      invoiceId: result.insertedId,
      invoice: { ...newInvoice, _id: result.insertedId }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
