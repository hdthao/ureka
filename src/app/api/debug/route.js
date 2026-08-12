import { NextResponse } from 'next/server';
import { connectDB } from '../../../lib/db';
import User from '../../../models/User';
import Report from '../../../models/Report';

export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}, '-password'); // Exclude password hashes
    const reports = await Report.find({});
    
    const connectionUri = global.__mongoUri__ || 'Using MONGODB_URI from environment';

    return NextResponse.json({
      connectionUri,
      users,
      reports
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
