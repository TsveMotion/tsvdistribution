import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Product } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

// POST - Upload photos for a product
export async function POST(
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

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No photos provided' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const product = await db.collection<Product>('products').findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'products', id);
    
    const uploadedFiles: string[] = [];
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 5MB.` },
          { status: 400 }
        );
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} is not a supported image format. Use JPEG, PNG, or WebP.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `${product.sku}-${timestamp}.${extension}`;
      const filepath = join(uploadDir, filename);
      
      try {
        // Ensure directory exists
        const { mkdir } = await import('fs/promises');
        await mkdir(uploadDir, { recursive: true });
        
        await writeFile(filepath, buffer);
        const publicPath = `/uploads/products/${id}/${filename}`;
        uploadedFiles.push(publicPath);
      } catch (fsError) {
        console.error('File system error:', fsError);
        return NextResponse.json(
          { error: 'Failed to save uploaded file' },
          { status: 500 }
        );
      }
    }

    // Update product with new image paths
    const currentImages = product.images || [];
    const updatedImages = [...currentImages, ...uploadedFiles];

    await db.collection<Product>('products').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          images: updatedImages,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({
      message: 'Photos uploaded successfully',
      uploadedFiles,
      totalImages: updatedImages.length
    });

  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a photo from a product
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
    const { photoPath } = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    if (!photoPath) {
      return NextResponse.json(
        { error: 'Photo path is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const product = await db.collection<Product>('products').findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Remove photo path from product
    const updatedImages = (product.images || []).filter(img => img !== photoPath);

    await db.collection<Product>('products').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          images: updatedImages,
          updatedAt: new Date()
        } 
      }
    );

    // Delete physical file
    try {
      const { unlink } = await import('fs/promises');
      const filepath = join(process.cwd(), 'public', photoPath);
      await unlink(filepath);
    } catch (fsError) {
      // File might not exist or be accessible, but database is updated
      console.warn('Could not delete physical file:', fsError);
    }

    return NextResponse.json({
      message: 'Photo removed successfully',
      remainingImages: updatedImages.length
    });

  } catch (error) {
    console.error('Error removing photo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
