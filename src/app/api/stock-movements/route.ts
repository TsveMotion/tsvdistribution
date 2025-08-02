import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getClient } from '@/lib/mongodb';
import { StockMovement, Product } from '@/types/database';
import { ObjectId } from 'mongodb';
import { getUserFromToken } from '@/lib/auth';

// GET all stock movements
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDatabase();
    const stockMovements = await db.collection<StockMovement>('stockMovements')
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    
    return NextResponse.json(stockMovements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new stock movement and update product quantity
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const movementData = await request.json();
    
    // Validate required fields
    const requiredFields = ['productId', 'locationId', 'movementType', 'quantity', 'reason'];
    for (const field of requiredFields) {
      if (!movementData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate IDs
    if (!ObjectId.isValid(movementData.productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(movementData.locationId)) {
      return NextResponse.json(
        { error: 'Invalid location ID format' },
        { status: 400 }
      );
    }

    const productId = new ObjectId(movementData.productId);
    const locationId = new ObjectId(movementData.locationId);
    const quantity = Number(movementData.quantity);
    const movementType = movementData.movementType;

    // Validate movement type
    if (!['in', 'out', 'transfer', 'adjustment'].includes(movementType)) {
      return NextResponse.json(
        { error: 'Invalid movement type' },
        { status: 400 }
      );
    }

    // Validate quantity
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be a positive number' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Get the product
    const product = await db.collection<Product>('products').findOne({
      _id: productId
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if location exists
    const locationExists = await db.collection('locations').findOne({
      _id: locationId
    });

    if (!locationExists) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Find the product location
    const locationIndex = product.locations.findIndex(
      loc => loc.locationId.toString() === locationId.toString()
    );

    let previousQuantity = 0;
    let newQuantity = 0;
    let totalNewQuantity = product.quantity;

    // Process the movement based on type
    if (movementType === 'in') {
      // Add stock to location
      if (locationIndex >= 0) {
        previousQuantity = product.locations[locationIndex].quantity;
        newQuantity = previousQuantity + quantity;
        product.locations[locationIndex].quantity = newQuantity;
        product.locations[locationIndex].lastUpdated = new Date();
      } else {
        previousQuantity = 0;
        newQuantity = quantity;
        product.locations.push({
          locationId,
          quantity,
          lastUpdated: new Date()
        });
      }
      totalNewQuantity = product.quantity + quantity;
    } else if (movementType === 'out') {
      // Remove stock from location
      if (locationIndex >= 0) {
        previousQuantity = product.locations[locationIndex].quantity;
        
        if (previousQuantity < quantity) {
          return NextResponse.json(
            { error: 'Insufficient stock at this location' },
            { status: 400 }
          );
        }
        
        newQuantity = previousQuantity - quantity;
        product.locations[locationIndex].quantity = newQuantity;
        product.locations[locationIndex].lastUpdated = new Date();
        
        // Remove location if quantity becomes zero
        if (newQuantity === 0) {
          product.locations.splice(locationIndex, 1);
        }
      } else {
        return NextResponse.json(
          { error: 'Product not found at this location' },
          { status: 404 }
        );
      }
      totalNewQuantity = product.quantity - quantity;
    } else if (movementType === 'adjustment') {
      // Adjust stock at location
      if (locationIndex >= 0) {
        previousQuantity = product.locations[locationIndex].quantity;
        newQuantity = quantity;
        
        const difference = newQuantity - previousQuantity;
        totalNewQuantity = product.quantity + difference;
        
        product.locations[locationIndex].quantity = newQuantity;
        product.locations[locationIndex].lastUpdated = new Date();
      } else {
        previousQuantity = 0;
        newQuantity = quantity;
        totalNewQuantity = product.quantity + quantity;
        
        product.locations.push({
          locationId,
          quantity,
          lastUpdated: new Date()
        });
      }
    } else if (movementType === 'transfer') {
      // Transfer requires a destination location
      if (!movementData.destinationLocationId || !ObjectId.isValid(movementData.destinationLocationId)) {
        return NextResponse.json(
          { error: 'Valid destination location ID is required for transfers' },
          { status: 400 }
        );
      }
      
      const destinationLocationId = new ObjectId(movementData.destinationLocationId);
      
      // Check if destination location exists
      const destinationExists = await db.collection('locations').findOne({
        _id: destinationLocationId
      });

      if (!destinationExists) {
        return NextResponse.json(
          { error: 'Destination location not found' },
          { status: 404 }
        );
      }
      
      // Check if source location has enough stock
      if (locationIndex < 0) {
        return NextResponse.json(
          { error: 'Product not found at source location' },
          { status: 404 }
        );
      }
      
      previousQuantity = product.locations[locationIndex].quantity;
      
      if (previousQuantity < quantity) {
        return NextResponse.json(
          { error: 'Insufficient stock at source location' },
          { status: 400 }
        );
      }
      
      // Remove from source
      product.locations[locationIndex].quantity -= quantity;
      product.locations[locationIndex].lastUpdated = new Date();
      
      // Remove source location if quantity becomes zero
      if (product.locations[locationIndex].quantity === 0) {
        product.locations.splice(locationIndex, 1);
      }
      
      // Add to destination
      const destIndex = product.locations.findIndex(
        loc => loc.locationId.toString() === destinationLocationId.toString()
      );
      
      if (destIndex >= 0) {
        product.locations[destIndex].quantity += quantity;
        product.locations[destIndex].lastUpdated = new Date();
      } else {
        product.locations.push({
          locationId: destinationLocationId,
          quantity,
          lastUpdated: new Date()
        });
      }
      
      // Total quantity doesn't change for transfers
      totalNewQuantity = product.quantity;
      newQuantity = quantity;
    }

    // Create the stock movement record
    const stockMovement: StockMovement = {
      productId,
      locationId,
      movementType,
      quantity,
      previousQuantity,
      newQuantity,
      reason: movementData.reason,
      reference: movementData.reference || undefined,
      userId: new ObjectId(user.userId),
      createdAt: new Date()
    };

    // Update the product
    product.quantity = totalNewQuantity;
    product.updatedAt = new Date();

    // Start a session for transaction
    const client = await getClient();
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Update the product
        await db.collection<Product>('products').updateOne(
          { _id: productId },
          { 
            $set: { 
              quantity: product.quantity,
              locations: product.locations,
              updatedAt: product.updatedAt
            } 
          },
          { session }
        );
        
        // Insert the stock movement
        await db.collection<StockMovement>('stockMovements').insertOne(
          stockMovement,
          { session }
        );
      });
      
      return NextResponse.json({
        message: 'Stock movement recorded successfully',
        stockMovement,
        product: {
          _id: product._id,
          name: product.name,
          quantity: product.quantity,
          locations: product.locations
        }
      }, { status: 201 });
    } catch (error) {
      console.error('Transaction error:', error);
      return NextResponse.json(
        { error: 'Failed to process stock movement' },
        { status: 500 }
      );
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
