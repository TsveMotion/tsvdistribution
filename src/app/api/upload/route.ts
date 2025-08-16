import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import { getClient } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const data = await request.formData();
    const files = data.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db('tsvdistribution');
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    const uploadedFiles: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: `Invalid file type: ${file.name}` }, { status: 400 });
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `File too large: ${file.name}` }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Store in GridFS
      const uploadStream = bucket.openUploadStream(file.name, {
        contentType: (file as any).type || 'application/octet-stream',
        metadata: {
          originalName: file.name,
          size: file.size,
          uploadedAt: new Date(),
          uploadedBy: decoded.userId,
        },
      });

      await new Promise<void>((resolve, reject) => {
        Readable.from(buffer)
          .pipe(uploadStream)
          .on('error', reject)
          .on('finish', () => resolve());
      });

      const id = uploadStream.id?.toString();
      if (!id) {
        return NextResponse.json({ error: 'Failed to store file' }, { status: 500 });
      }
      const publicUrl = `/api/files/${id}`;
      uploadedFiles.push(publicUrl);
    }

    return NextResponse.json({ success: true, files: uploadedFiles });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload files' 
    }, { status: 500 });
  }
}

