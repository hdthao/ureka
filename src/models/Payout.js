import mongoose from 'mongoose';

const PayoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestSum: {
    type: Number,
    required: true
  },
  siteId: {
    type: String,
    required: false
  },
  siteName: {
    type: String,
    required: false
  },
  paymentMethod: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  },
  payoutDate: {
    type: Date
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Avoid compiling model twice during hot reload
export default mongoose.models.Payout || mongoose.model('Payout', PayoutSchema);
