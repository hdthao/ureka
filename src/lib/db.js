import mongoose from 'mongoose';

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required. Add it to your local .env and Vercel Environment Variables.');
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully!');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}
