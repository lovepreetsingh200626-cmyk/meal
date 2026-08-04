const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const complaintRoutes = require('./routes/complaintRoutes');
const noticeRoutes = require('./routes/noticeRoutes');

// Explicitly set reliable fallback DNS servers (Cloudflare / Google)
// Used to prevent SRV lookup failures on campus/local ISP networks
try {
  dns.setServers(['1.1.1.1', '8.8.8.8', '8.8.4.4']);
} catch (error) {
  console.warn('⚠️ Could not set custom DNS servers:', error.message);
}

require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/authRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const mealRoutes = require('./routes/mealRoutes');

const app = express();

// Middleware: CORS Configured for Vite React Dev Server
// Added both localhost and 127.0.0.1 to prevent CORS blocking
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// INCREASE THE BODY LIMIT HERE:
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Parses incoming JSON requests

// MongoDB Connection
// Appended 'hostel_tracker' so Mongoose creates/uses the correct database
const MONGO_URI = process.env.MONGO_URI 

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notices', noticeRoutes);


// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'active', message: 'Hostel Meal & Attendance API is running good!' });
});

// Start Server ONLY AFTER MongoDB connects successfully
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000 // Fail fast after 5s instead of hanging for 10s
})
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
    
    // Server starts listening only when DB is ready
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("👉 TIP: Check your internet connection or MongoDB Atlas IP Whitelist (0.0.0.0/0)");
    process.exit(1); // Stop the process so you don't run a broken server
  });