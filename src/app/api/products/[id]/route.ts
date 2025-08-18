import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Product } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';
import { cacheGetOrSet } from '@/lib/cache';
import { productKey, stockKey, PRODUCTS_VERSION_KEY } from '@/lib/cacheKeys';
import { TTL } from '@/lib/cacheTtl';
import { redis } from '@/lib/redis';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';

// GET a single product by ID
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
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = await rateLimit(ip, 120, 60);
    if (!allowed) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });

    const db = await getDatabase();

    // We don't know sku yet; fetcher reads doc, then cache by sku if available else by id fallback
    const fetcher = async () => {
      const doc = await db.collection<Product>('products').findOne({ _id: new ObjectId(id) });
      if (!doc) return null as any;
      return doc;
    };

    const fresh = request.nextUrl.searchParams.get('fresh') === '1';
    const direct = await fetcher();
    if (fresh) {
      if (direct) {
        const k = direct.sku ? productKey(direct.sku) : `products:id:${id}`;
        await redis.set(k, direct, { ex: TTL.PRODUCT });
      }
      if (!direct) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json(direct);
    }

    // Prefer key by sku when possible; if not, use id key as fallback
    const primaryKey = direct?.sku ? productKey(direct.sku) : `products:id:${id}`;
    const data = await cacheGetOrSet(primaryKey, fetcher, TTL.PRODUCT);
    if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update a product by ID
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
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    const productData = await request.json();
    
    // Prevent updating _id field
    if (productData._id) {
      delete productData._id;
    }

    // Properly handle and validate update data
    const updateData: Partial<Product> = {
      ...(productData.name && { name: productData.name }),
      ...(productData.description !== undefined && { description: productData.description }),
      ...(productData.sku && { sku: productData.sku }),
      ...(productData.category && { category: productData.category }),
      ...(productData.price !== undefined && { price: Number(productData.price) }),
      ...(productData.cost !== undefined && { cost: Number(productData.cost) }),
      ...(productData.quantity !== undefined && { quantity: Number(productData.quantity) }),
      ...(productData.minStockLevel !== undefined && { minStockLevel: Number(productData.minStockLevel) }),
      ...(productData.supplier !== undefined && { supplier: productData.supplier }),
      ...(productData.supplierLink !== undefined && { supplierLink: productData.supplierLink || undefined }),
      ...(productData.barcode !== undefined && { barcode: productData.barcode || undefined }),
      ...(productData.weight !== undefined && { weight: productData.weight ? Number(productData.weight) : undefined }),
      ...(productData.dimensions && {
        dimensions: {
          length: Number(productData.dimensions.length) || 0,
          width: Number(productData.dimensions.width) || 0,
          height: Number(productData.dimensions.height) || 0,
        }
      }),
      ...(productData.images !== undefined && { images: productData.images }),
      ...(productData.locations !== undefined && { locations: productData.locations }),
      ...(productData.aiGeneratedDescription !== undefined && { aiGeneratedDescription: productData.aiGeneratedDescription || undefined }),
      ...(productData.aiGeneratedTitle !== undefined && { aiGeneratedTitle: productData.aiGeneratedTitle || undefined }),
      updatedAt: new Date(),
    };

    const db = await getDatabase();
    
    // Check if product exists
    const existingProduct = await db.collection<Product>('products').findOne({
      _id: new ObjectId(id),
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const result = await db.collection<Product>('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No changes made to the product' },
        { status: 400 }
      );
    }

    // Get updated product
    const updatedProduct = await db.collection<Product>('products').findOne({
      _id: new ObjectId(id),
    });

    // Write-through cache for product and stock keys
    if (updatedProduct) {
      const k = updatedProduct.sku ? productKey(updatedProduct.sku) : `products:id:${id}`;
      await redis.set(k, updatedProduct, { ex: TTL.PRODUCT });
      if (typeof (updatedProduct as any).quantity === 'number') {
        await redis.set(stockKey(updatedProduct.sku ?? id), (updatedProduct as any).quantity, { ex: TTL.STOCK });
      }
      // Invalidate versioned product lists
      await redis.incr(PRODUCTS_VERSION_KEY);
    }

    return NextResponse.json({
      message: 'Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a product by ID
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
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if product exists
    const existingProduct = await db.collection<Product>('products').findOne({
      _id: new ObjectId(id),
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const result = await db.collection<Product>('products').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
