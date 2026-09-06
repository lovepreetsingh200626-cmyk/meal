const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // Student who made the payment
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Student snapshot at the time of payment
    // Keeping these fields means old receipts remain accurate
    // even if the student's profile changes later.
    studentName: {
      type: String,
      required: true,
      trim: true
    },

    rollNo: {
      type: String,
      required: true,
      trim: true
    },

    hostelNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },

    // Total amount settled
    amount: {
      type: Number,
      required: true,
      min: 0
    },

    // Payment breakdown
    breakdown: {
      baseFee: {
        type: Number,
        default: 0,
        min: 0
      },

      mealsCost: {
        type: Number,
        default: 0,
        min: 0
      },

      extraItems: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    // Payment method
    paymentChannel: {
      type: String,
      default: 'Online UPI / NetBanking',
      trim: true
    },

    // Billing month
    // Format: YYYY-MM
    month: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      index: true
    },

    // Official receipt number
    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },

    // Transaction reference
    txnId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    // Payment status
    status: {
      type: String,
      enum: ['PENDING', 'CLEARED', 'FAILED', 'REFUNDED'],
      default: 'CLEARED',
      index: true
    },

    // Optional administrative remark
    remarks: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

// Quickly find a student's payment history
paymentSchema.index({
  userId: 1,
  month: -1
});

// Quickly find payments for a hostel/month
paymentSchema.index({
  hostelNo: 1,
  month: -1
});

module.exports = mongoose.model('Payment', paymentSchema);