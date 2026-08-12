import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date_range_type: {
    type: String,
    required: true,
    enum: ['dynamic', 'custom'],
    default: 'dynamic'
  },
  date_dynamic: {
    type: String,
    default: ''
  },
  start_date: {
    type: String,
    default: ''
  },
  end_date: {
    type: String,
    default: ''
  },
  dimensions: {
    type: [String],
    default: []
  },
  metrics: {
    type: [String],
    default: []
  },
  filters: {
    type: [Number],
    default: []
  },
  status: {
    type: Number,
    default: 1
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Report || mongoose.model('Report', ReportSchema);
