const express = require('express');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const Payment = require('../models/Payment');
const User = require('../models/User');

const {
  authMiddleware,
  requireStudent,
  requireAdmin
} = require('../middleware/authMiddleware');

const router = express.Router();


// =========================================================
// RAZORPAY SETUP
// =========================================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


// =========================================================
// CREATE ONLINE PAYMENT ORDER
// POST /payments/create-order
// STUDENT ONLY
// =========================================================

router.post(
  '/create-order',
  authMiddleware,
  requireStudent,
  async (req, res) => {
    try {
      const {
        amount,
        month
      } = req.body;

      // Basic validation
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          message: 'Invalid payment amount.'
        });
      }

      if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({
          message: 'Invalid payment month.'
        });
      }

      // Get authenticated student
      const student = await User.findById(req.user.id);

      if (!student) {
        return res.status(404).json({
          message: 'Student account not found.'
        });
      }

      // Amount in paise
      const amountInPaise = Math.round(numericAmount * 100);

      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `MESS_${student._id}_${Date.now()}`,
        notes: {
          studentId: String(student._id),
          studentName: student.name || '',
          month
        }
      });

      return res.status(200).json({
        success: true,
        order
      });

    } catch (error) {

      console.error(
        '❌ Razorpay order creation error:',
        error
      );

      return res.status(500).json({
        message: 'Unable to create online payment order.'
      });
    }
  }
);


// =========================================================
// VERIFY ONLINE PAYMENT
// POST /payments/verify
// STUDENT ONLY
// =========================================================

router.post(
  '/verify',
  authMiddleware,
  requireStudent,
  async (req, res) => {

    try {

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount,
        month
      } = req.body;


      // -----------------------------------------------------
      // Validate required fields
      // -----------------------------------------------------

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          message: 'Incomplete payment verification data.'
        });
      }


      // -----------------------------------------------------
      // Verify Razorpay signature
      // -----------------------------------------------------

      const generatedSignature = crypto
        .createHmac(
          'sha256',
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest('hex');


      if (generatedSignature !== razorpay_signature) {

        return res.status(400).json({
          message: 'Payment verification failed.'
        });
      }


      // -----------------------------------------------------
      // Get authenticated student
      // -----------------------------------------------------

      const student = await User.findById(req.user.id);

      if (!student) {
        return res.status(404).json({
          message: 'Student account not found.'
        });
      }


      // -----------------------------------------------------
      // Prevent duplicate payment record
      // -----------------------------------------------------

      const existingPayment = await Payment.findOne({
        txnId: razorpay_payment_id
      });

      if (existingPayment) {

        return res.status(200).json({
          success: true,
          message: 'Payment already recorded.',
          payment: existingPayment
        });
      }


      // -----------------------------------------------------
      // Validate month
      // -----------------------------------------------------

      if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {

        return res.status(400).json({
          message: 'Invalid payment month.'
        });
      }


      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {

        return res.status(400).json({
          message: 'Invalid payment amount.'
        });
      }


      // -----------------------------------------------------
      // Generate receipt number
      // -----------------------------------------------------

      const receiptNo =
        `ONLINE/${new Date().getFullYear()}/${Date.now()}`;


      // -----------------------------------------------------
      // Save payment
      // -----------------------------------------------------

      const payment = await Payment.create({

        userId: student._id,

        studentName:
          student.name || 'Student',

        rollNo:
          student.rollNo || 'N/A',

        hostelNo:
          student.hostelNo || 'BH1',

        amount:
          numericAmount,

        breakdown: {
          baseFee: 0,
          mealsCost: 0,
          extraItems: 0
        },

        paymentChannel:
          'Online - Razorpay',

        month,

        receiptNo,

        txnId:
          razorpay_payment_id,

        status:
          'CLEARED',

        remarks:
          `Razorpay Order: ${razorpay_order_id}`
      });


      return res.status(200).json({

        success: true,

        message:
          'Payment verified and recorded successfully.',

        payment

      });


    } catch (error) {

      console.error(
        '❌ Razorpay payment verification error:',
        error
      );

      return res.status(500).json({
        message:
          'Payment was received but could not be recorded automatically. Please contact Accounts.'
      });
    }
  }
);


// =========================================================
// RECORD CASH / DESK PAYMENT
// POST /payments/record
// ADMIN ONLY
// =========================================================

router.post(
  '/record',
  authMiddleware,
  requireAdmin,
  async (req, res) => {

    try {

      const {
        userId,
        studentName,
        rollNo,
        hostelNo,
        amount,
        breakdown,
        paymentChannel,
        month,
        receiptNo,
        txnId,
        remarks
      } = req.body;


      if (
        !userId ||
        !studentName ||
        !rollNo ||
        !hostelNo ||
        amount === undefined ||
        !month ||
        !receiptNo ||
        !txnId
      ) {

        return res.status(400).json({
          message: 'Required payment information is missing.'
        });
      }


      const payment = await Payment.create({

        userId,

        studentName,

        rollNo,

        hostelNo,

        amount: Number(amount),

        breakdown: breakdown || {
          baseFee: 0,
          mealsCost: 0,
          extraItems: 0
        },

        paymentChannel:
          paymentChannel ||
          'Physical Desk Cash Settlement',

        month,

        receiptNo,

        txnId,

        status: 'CLEARED',

        remarks:
          remarks || ''
      });


      return res.status(201).json({

        success: true,

        message:
          'Cash payment recorded successfully.',

        payment

      });


    } catch (error) {

      console.error(
        '❌ Cash payment recording error:',
        error
      );

      return res.status(500).json({
        message: 'Unable to record cash payment.'
      });
    }
  }
);


// =========================================================
// GET STUDENT PAYMENT HISTORY
// GET /payments/user/:userId
// =========================================================

router.get(
  '/user/:userId',
  authMiddleware,
  async (req, res) => {

    try {

      // Student can only see their own payments
      if (
        req.user.role === 'student' &&
        req.user.id !== req.params.userId
      ) {

        return res.status(403).json({
          message: 'You can only access your own payment records.'
        });
      }


      const payments = await Payment.find({
        userId: req.params.userId
      })
        .sort({ createdAt: -1 });


      return res.status(200).json(
        payments
      );


    } catch (error) {

      console.error(
        '❌ Payment history error:',
        error
      );

      return res.status(500).json({
        message: 'Unable to fetch payment history.'
      });
    }
  }
);


// =========================================================
// GET ALL PAYMENTS
// GET /payments/admin/all-payments
// ADMIN ONLY
// =========================================================

router.get(
  '/admin/all-payments',
  authMiddleware,
  requireAdmin,
  async (req, res) => {

    try {

      const payments = await Payment.find()
        .populate(
          'userId',
          'name rollNo mobileNo studentId'
        )
        .sort({
          createdAt: -1
        });


      return res.status(200).json(
        payments
      );


    } catch (error) {

      console.error(
        '❌ Admin payments error:',
        error
      );

      return res.status(500).json({
        message: 'Unable to fetch payment records.'
      });
    }
  }
);


// =========================================================
// DELETE PAYMENT
// DELETE /payments/:id
// ADMIN ONLY
// =========================================================

router.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  async (req, res) => {

    try {

      const payment =
        await Payment.findByIdAndDelete(
          req.params.id
        );


      if (!payment) {

        return res.status(404).json({
          message: 'Payment record not found.'
        });
      }


      return res.status(200).json({

        success: true,

        message:
          'Payment record deleted successfully.'

      });


    } catch (error) {

      console.error(
        '❌ Payment deletion error:',
        error
      );

      return res.status(500).json({
        message: 'Unable to delete payment record.'
      });
    }
  }
);


module.exports = router;