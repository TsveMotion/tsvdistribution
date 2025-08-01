import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { Location } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';

// GET all locations
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const locations = await db.collection<Location>('locations').find({}).toArray();
    
    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new location
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const locationData = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'type', 'code', 'capacity'];
    for (const field of requiredFields) {
      if (!locationData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Handle parent location ID if provided
    if (locationData.parentLocationId && typeof locationData.parentLocationId === 'string') {
      if (!ObjectId.isValid(locationData.parentLocationId)) {
        return NextResponse.json(
          { error: 'Invalid parent location ID format' },
          { status: 400 }
        );
      }
      locationData.parentLocationId = new ObjectId(locationData.parentLocationId);
    }

    // Create new location with timestamps
    const newLocation: Location = {
      ...locationData,
      isActive: locationData.isActive !== undefined ? locationData.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = await getDatabase();
    
    // Check if location code already exists
    const existingLocation = await db.collection<Location>('locations').findOne({
      code: newLocation.code
    });

    if (existingLocation) {
      return NextResponse.json(
        { error: 'Location code already exists' },
        { status: 409 }
      );
    }

    const result = await db.collection<Location>('locations').insertOne(newLocation);

    return NextResponse.json(
      { 
        message: 'Location created successfully',
        locationId: result.insertedId,
        location: { ...newLocation, _id: result.insertedId }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
