import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword, generateToken } from '@/lib/auth';
import { User } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = 'employee' } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Check if user already exists
    const existingUser = await db.collection<User>('users').findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const newUser: Omit<User, '_id'> = {
      name,
      email,
      password: hashedPassword,
      role: role as 'admin' | 'manager' | 'employee',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection<User>('users').insertOne(newUser);
    const token = generateToken(result.insertedId.toString(), email);

    return NextResponse.json({
      message: 'User created successfully',
      token,
      user: {
        id: result.insertedId,
        name,
        email,
        role
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
