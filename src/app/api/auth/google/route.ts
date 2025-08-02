import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { generateToken } from '@/lib/auth';
import { User } from '@/types/database';
import { ObjectId } from 'mongodb';

// Google OAuth login endpoint
export async function POST(request: NextRequest) {
  console.log('Google OAuth POST endpoint called');
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { googleId, email, name, action, userId } = body;

    if (!googleId || !email || !name) {
      return NextResponse.json(
        { error: 'Missing required Google account information' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    if (action === 'login') {
      // Login with Google - check if account is linked
      const user = await db.collection<User>('users').findOne({ 
        googleId: googleId 
      });

      if (!user) {
        return NextResponse.json(
          { error: 'This Google account is not linked to any user. This software is invite-only. Please contact an administrator.' },
          { status: 401 }
        );
      }

      if (!user.active) {
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact an administrator.' },
          { status: 401 }
        );
      }

      const token = generateToken(user._id!.toString(), user.email, user.role);

      return NextResponse.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    if (action === 'link') {
      // Link Google account to existing user
      
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required for linking' },
          { status: 400 }
        );
      }

      // Check if Google account is already linked to another user
      const existingUser = await db.collection<User>('users').findOne({ 
        googleId: googleId 
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'This Google account is already linked to another user' },
          { status: 400 }
        );
      }

      // Update user with Google account info
      const result = await db.collection<User>('users').updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: { 
            googleId: googleId,
            googleEmail: email,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Google account linked successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Google OAuth error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Unlink Google account
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    const result = await db.collection<User>('users').updateOne(
      { _id: userId },
      { 
        $unset: { 
          googleId: "",
          googleEmail: ""
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Google account unlinked successfully'
    });

  } catch (error) {
    console.error('Google OAuth unlink error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
