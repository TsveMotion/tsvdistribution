import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Location } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';

// GET a single location by ID
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
        { error: 'Invalid location ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const location = await db.collection<Location>('locations').findOne({
      _id: new ObjectId(id),
    });

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update a location by ID
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
        { error: 'Invalid location ID format' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    
    // Prevent updating _id field
    if (updateData._id) {
      delete updateData._id;
    }

    // Handle parent location ID if provided
    if (updateData.parentLocationId && typeof updateData.parentLocationId === 'string') {
      if (!ObjectId.isValid(updateData.parentLocationId)) {
        return NextResponse.json(
          { error: 'Invalid parent location ID format' },
          { status: 400 }
        );
      }
      updateData.parentLocationId = new ObjectId(updateData.parentLocationId);
    }

    // Add updated timestamp
    updateData.updatedAt = new Date();

    const db = await getDatabase();
    
    // Check if location exists
    const existingLocation = await db.collection<Location>('locations').findOne({
      _id: new ObjectId(id),
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if updating code and if it already exists
    if (updateData.code && updateData.code !== existingLocation.code) {
      const duplicateCode = await db.collection<Location>('locations').findOne({
        code: updateData.code,
        _id: { $ne: new ObjectId(id) }
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: 'Location code already exists' },
          { status: 409 }
        );
      }
    }

    const result = await db.collection<Location>('locations').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'No changes made to the location' },
        { status: 400 }
      );
    }

    // Get updated location
    const updatedLocation = await db.collection<Location>('locations').findOne({
      _id: new ObjectId(id),
    });

    return NextResponse.json({
      message: 'Location updated successfully',
      location: updatedLocation,
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a location by ID
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
        { error: 'Invalid location ID format' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if location exists
    const existingLocation = await db.collection<Location>('locations').findOne({
      _id: new ObjectId(id),
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Check if any products are using this location
    const productsUsingLocation = await db.collection('products').countDocuments({
      'locations.locationId': new ObjectId(id)
    });

    if (productsUsingLocation > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location because it is being used by products' },
        { status: 409 }
      );
    }

    // Check if any child locations exist
    const childLocations = await db.collection<Location>('locations').countDocuments({
      parentLocationId: new ObjectId(id)
    });

    if (childLocations > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location because it has child locations' },
        { status: 409 }
      );
    }

    const result = await db.collection<Location>('locations').deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Location deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
