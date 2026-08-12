import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  let uri = process.env.MONGODB_URI;

  if (!uri) {
    if (!global.__mongoMemoryServer__) {
      console.log('Starting MongoDB Memory Server...');
      try {
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        global.__mongoMemoryServer__ = mongoServer;
        global.__mongoUri__ = uri;
        console.log('MongoDB Memory Server started at:', uri);
      } catch (err) {
        console.error('Failed to start MongoDB Memory Server:', err.message);
        throw err;
      }
    } else {
      uri = global.__mongoUri__;
    }
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully!');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}
