import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Product } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';

// GET all products
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const products = await db.collection<Product>('products').find({}).toArray();
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const productData = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'sku', 'category', 'price', 'quantity'];
    for (const field of requiredFields) {
      if (!productData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create new product with timestamps
    const newProduct: Product = {
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
      locations: productData.locations || [],
      minStockLevel: productData.minStockLevel || 5,
    };

    const db = await getDatabase();
    const result = await db.collection<Product>('products').insertOne(newProduct);

    return NextResponse.json(
      { 
        message: 'Product created successfully',
        productId: result.insertedId,
        product: { ...newProduct, _id: result.insertedId }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
