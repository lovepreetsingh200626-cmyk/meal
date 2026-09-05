const express = require('express');
const Payment = require('../models/Payment');
const router = express.Router();

// 1. Save a new payment record when a student settles their fee
router.post('/record', async (req, res) => {
  try {
    const { userId, studentName, rollNo, hostelNo, amount, paymentChannel, month, receiptNo, txnId } = req.body;
    
    const newPayment = new Payment({
      userId,
      studentName,
      rollNo,
      hostelNo,
      amount,
      paymentChannel: paymentChannel || 'Online UPI / NetBanking',
      month: month || new Date().toISOString().substring(0, 7),
      receiptNo,
      txnId,
      status: 'CLEARED'
    });

    await newPayment.save();
    res.status(201).json({ message: 'Payment recorded and verified successfully', payment: newPayment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Get all payments for a specific student (for Student Dashboard)
router.get('/user/:userId', async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Get all campus-wide payments for Admin Audit Ledger (for Admin Dashboard)
router.get('/admin/all-payments', async (req, res) => {
  try {
    const payments = await Payment.find().sort({ createdAt: -1 }).populate('userId', 'name rollNo mobileNo');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Delete/Revoke a payment record by its ID (Reset to Unpaid)
router.delete('/:id', async (req, res) => {
  try {
    const deletedPayment = await Payment.findByIdAndDelete(req.params.id);
    if (!deletedPayment) {
      return res.status(404).json({ message: 'Payment record not found on server.' });
    }
    res.json({ message: 'Financial clearance revoked and reverted to unpaid successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;