import { NextRequest, NextResponse } from 'next/server';
import { GridFSBucket, ObjectId } from 'mongodb';
import { getClient } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid file id' }, { status: 400 });
    }

    const client = await getClient();
    const db = client.db('tsvdistribution');
    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

    // Try to get file metadata first to determine content type and existence
    const files = await db
      .collection('uploads.files')
      .find({ _id: new ObjectId(id) })
      .limit(1)
      .toArray();

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileDoc = files[0] as any;
    const contentType = fileDoc.contentType || fileDoc.metadata?.contentType || 'application/octet-stream';
    const fileName = fileDoc.filename || 'file';

    // Download the file into a single Buffer (simple + compatible)
    const downloadStream = bucket.openDownloadStream(new ObjectId(id));
    const chunks: Buffer[] = [];

    const data: Buffer = await new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      downloadStream.on('error', reject);
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}
