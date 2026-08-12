import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  allowedSites: {
    type: [Number],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Avoid compiling model twice during hot reload
export default mongoose.models.User || mongoose.model('User', UserSchema);
