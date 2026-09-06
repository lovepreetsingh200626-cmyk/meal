const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    // Hostel identification
    hostelNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    // Display name
    name: {
      type: String,
      required: true,
      trim: true
    },

    // Hostel type
    type: {
      type: String,
      enum: ['boys', 'girls'],
      required: true,
      lowercase: true
    },

    // Current mess/diet rates
    mealCosts: {
      breakfast: {
        type: Number,
        default: 40,
        min: 0
      },

      lunch: {
        type: Number,
        default: 60,
        min: 0
      },

      dinner: {
        type: Number,
        default: 60,
        min: 0
      }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Hostel', hostelSchema);