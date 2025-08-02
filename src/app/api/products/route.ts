import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Product } from '@/types/database';
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

    // Create new product with timestamps and proper field handling
    const newProduct: Product = {
      name: productData.name,
      description: productData.description || '',
      sku: productData.sku,
      category: productData.category,
      price: Number(productData.price) || 0,
      cost: Number(productData.cost) || 0,
      quantity: Number(productData.quantity) || 0,
      minStockLevel: Number(productData.minStockLevel) || 5,
      supplier: productData.supplier || '',
      supplierLink: productData.supplierLink || undefined,
      barcode: productData.barcode || undefined,
      weight: productData.weight ? Number(productData.weight) : undefined,
      dimensions: productData.dimensions ? {
        length: Number(productData.dimensions.length) || 0,
        width: Number(productData.dimensions.width) || 0,
        height: Number(productData.dimensions.height) || 0,
      } : undefined,
      images: productData.images || [],
      locations: productData.locations || [],
      aiGeneratedDescription: productData.aiGeneratedDescription || undefined,
      aiGeneratedTitle: productData.aiGeneratedTitle || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
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
