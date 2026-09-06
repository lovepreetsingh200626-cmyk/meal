const mongoose = require('mongoose');

const extraItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    cost: {
      type: Number,
      required: true,
      min: 0
    }
  },
  {
    _id: true
  }
);

const mealRecordSchema = new mongoose.Schema(
  {
    // Student
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Hostel
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true
    },

    // Local calendar date: YYYY-MM-DD
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    },

    // Meals taken by the student
    meals: {
      breakfast: {
        type: Boolean,
        default: false
      },

      lunch: {
        type: Boolean,
        default: false
      },

      dinner: {
        type: Boolean,
        default: false
      }
    },

    // Additional items purchased
    extras: {
      type: [extraItemSchema],
      default: []
    },

    // Final calculated cost for the day
    dailyTotalCost: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate meal records for the same student and date
mealRecordSchema.index(
  { userId: 1, date: 1 },
  { unique: true }
);

// Useful for hostel/admin meal reports
mealRecordSchema.index({
  hostelId: 1,
  date: -1
});

module.exports = mongoose.model('MealRecord', mealRecordSchema);