const mongoose = require('mongoose');

const extraItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  cost: { type: Number, required: true }
});

const mealRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  meals: {
    breakfast: { type: Boolean, default: false },
    lunch: { type: Boolean, default: false },
    dinner: { type: Boolean, default: false }
  },
  extras: [extraItemSchema],
  dailyTotalCost: { type: Number, default: 0 }
}, { timestamps: true });

// Prevent duplicate entries for the same user on the same day
mealRecordSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('MealRecord', mealRecordSchema);