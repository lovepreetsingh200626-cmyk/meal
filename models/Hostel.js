const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema({
  hostelNumber: { type: String, required: true, unique: true, uppercase: true }, // e.g., 'BH1', 'GH1'
  name: { type: String, required: true },
  type: { type: String, enum: ['boys', 'girls'], required: true },
  mealCosts: {
    breakfast: { type: Number, default: 40 },
    lunch: { type: Number, default: 60 },
    dinner: { type: Number, default: 60 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Hostel', hostelSchema);