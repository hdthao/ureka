import mongoose from 'mongoose';

const DailySettingSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    unique: true
  },
  rpmLimit: {
    type: Number,
    required: true
  }
}, { timestamps: true });

export default mongoose.models.DailySetting || mongoose.model('DailySetting', DailySettingSchema);
