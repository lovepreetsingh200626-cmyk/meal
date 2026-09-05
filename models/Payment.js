const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  rollNo: { type: String, required: true },
  hostelNo: { type: String, required: true },
  amount: { type: Number, required: true },
  
  // Optional breakdown for detailed auditing & receipt generation
  breakdown: {
    baseFee: { type: Number, default: 0 },
    mealsCost: { type: Number, default: 0 }
  },

  paymentChannel: { type: String, default: 'Online UPI / NetBanking' },
  month: { type: String, required: true }, // Format: 'YYYY-MM'
  receiptNo: { type: String, required: true, unique: true },
  txnId: { type: String, required: true },
  status: { type: String, default: 'CLEARED' },
  remarks: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);