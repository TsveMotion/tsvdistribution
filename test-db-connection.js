const { MongoClient } = require('mongodb');
require('dotenv').config();

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  console.log('Testing MongoDB connection...');
  console.log('URI (censored):', uri.replace(/:[^@]+@/, ':***@'));
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment');
    return;
  }
  
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
  });

  try {
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // Test database access
    const db = client.db('tsvdistribution');
    const collections = await db.listCollections().toArray();
    console.log('📁 Available collections:', collections.map(c => c.name));
    
    // Test a simple query
    const users = await db.collection('users').countDocuments();
    console.log('👤 Users count:', users);
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    // Provide specific guidance based on error
    if (error.code === 8000) {
      console.log('\n🔧 Solutions for authentication error (8000):');
      console.log('1. Check MongoDB Atlas username/password');
      console.log('2. Verify IP whitelist includes your current IP');
      console.log('3. Ensure database user has proper permissions');
      console.log('4. Try URL encoding special characters in password');
    }
  } finally {
    await client.close();
  }
}

testConnection();
