import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const [, , email, password, sitesArg = ''] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/upsert-user.mjs <email> <password> <siteIds>');
  console.error('Example: node scripts/upsert-user.mjs user@example.com StrongPass123 106083,106095');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

const allowedSites = sitesArg
  .split(',')
  .map(siteId => Number(siteId.trim()))
  .filter(Boolean);

await mongoose.connect(process.env.MONGODB_URI);

const hashedPassword = await bcrypt.hash(password, 10);
const normalizedEmail = email.toLowerCase().trim();

await User.findOneAndUpdate(
  { email: normalizedEmail },
  {
    email: normalizedEmail,
    password: hashedPassword,
    allowedSites
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

await mongoose.disconnect();

console.log(`User ${normalizedEmail} saved with allowedSites: ${allowedSites.join(', ') || 'none'}`);
