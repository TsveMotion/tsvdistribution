import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Invoice } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';

// GET a single invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const invoice = await db.collection<Invoice>('invoices').findOne({
      _id: new ObjectId(id),
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update an invoice by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    
    // Prevent updating _id field
    if (updateData._id) {
      delete updateData._id;
    }

    // Prevent updating invoiceNumber and orderId
    if (updateData.invoiceNumber) {
      delete updateData.invoiceNumber;
    }
    
    if (updateData.orderId) {
      delete updateData.orderId;
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    // Handle status changes with timestamps
    if (updateData.status) {
      if (updateData.status === 'sent' && !updateData.sentAt) {
        updateData.sentAt = new Date();
      } else if (updateData.status === 'paid' && !updateData.paidAt) {
        updateData.paidAt = new Date();
      }
    }

    const db = await getDatabase();
    
    // Check if invoice exists
    const existingInvoice = await db.collection<Invoice>('invoices').findOne({
      _id: new ObjectId(id),
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const result = await db.collection<Invoice>('invoices').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No changes made to the invoice' },
        { status: 400 }
      );
    }

    // Get updated invoice
    const updatedInvoice = await db.collection<Invoice>('invoices').findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE an invoice by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if invoice exists
    const existingInvoice = await db.collection<Invoice>('invoices').findOne({
      _id: new ObjectId(id),
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of draft invoices
    if (existingInvoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft invoices can be deleted' },
        { status: 400 }
      );
    }

    const result = await db.collection<Invoice>('invoices').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete invoice' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
