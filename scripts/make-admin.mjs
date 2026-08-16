import fs from 'fs';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const [, , email] = process.argv;

if (!email) {
  console.error('Usage: node scripts/make-admin.mjs <email>');
  process.exit(1);
}

if (!process.env.MONGODB_URI && fs.existsSync('.env')) {
  const envText = fs.readFileSync('.env', 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

const normalizedEmail = email.toLowerCase().trim();

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOneAndUpdate(
    { email: normalizedEmail },
    { role: 'admin' },
    { new: true }
  );

  if (user) {
    console.log(`Successfully upgraded ${normalizedEmail} to admin.`);
  } else {
    console.log(`User ${normalizedEmail} not found. Please create the user first.`);
  }
} catch (err) {
  console.error(err);
} finally {
  await mongoose.disconnect();
}
