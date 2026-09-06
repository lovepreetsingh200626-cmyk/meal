const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
require('dotenv').config();

// Route Imports
const complaintRoutes = require('./routes/complaintRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const authRoutes = require('./routes/authRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const mealRoutes = require('./routes/mealRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // ✨ Payment Ledger Routes

// Explicitly set reliable fallback DNS servers (Cloudflare / Google)
try {
  dns.setServers(['1.1.1.1', '8.8.8.8', '8.8.4.4']);
} catch (error) {
  console.warn('⚠️ Could not set custom DNS servers:', error.message);
}

const app = express();

// Middleware: CORS Configured for Vite React Dev Server & Production
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers: 10MB payload limit for student/admin Base64 photo uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Primary API Route Mounts (Standard /api prefix)
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/payments', paymentRoutes);

// Fallback Aliases (Ensures frontend requests work with or without /api baseURL)
app.use('/auth', authRoutes);
app.use('/hostels', hostelRoutes);
app.use('/meals', mealRoutes);
app.use('/complaints', complaintRoutes);
app.use('/notices', noticeRoutes);
app.use('/payments', paymentRoutes);

// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'active', message: 'Hostel Meal & Attendance API is running good!' });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('⚠️ Server Error:', err.message);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large. Please upload an image under 10MB.' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

// Database Connection & Server Initialization
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ FATAL: MONGO_URI is not defined in your environment variables.');
  process.exit(1);
}

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000 
})
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });