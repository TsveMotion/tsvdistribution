import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Invoice } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';

// GET generate PDF for an invoice
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

    // Update invoice status to 'sent' if it's in 'draft' status
    if (invoice.status === 'draft') {
      await db.collection<Invoice>('invoices').updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: 'sent',
            sentAt: new Date(),
            updatedAt: new Date()
          } 
        }
      );
    }

    // Return the invoice data for client-side PDF generation
    return NextResponse.json({
      message: 'Invoice data for PDF generation',
      invoice
    });
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
