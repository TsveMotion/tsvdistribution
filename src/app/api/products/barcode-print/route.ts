import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Product } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';
import { generateBulkBarcodes } from '@/lib/barcode';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productIds } = await request.json();

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs array is required' },
        { status: 400 }
      );
    }

    // Validate all product IDs
    const validIds = productIds.filter(id => ObjectId.isValid(id));
    if (validIds.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some product IDs are invalid' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const objectIds = validIds.map(id => new ObjectId(id));
    
    const products = await db.collection<Product>('products').find({
      _id: { $in: objectIds }
    }).toArray();

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found' },
        { status: 404 }
      );
    }

    // Prepare products for barcode generation
    const productsForBarcode = products.map(product => ({
      id: product._id!.toString(),
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || 'N/A'
    }));

    const barcodeHtml = generateBulkBarcodes(productsForBarcode);

    return new NextResponse(barcodeHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'inline; filename="barcodes.html"',
      },
    });

  } catch (error) {
    console.error('Error generating barcode print sheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
