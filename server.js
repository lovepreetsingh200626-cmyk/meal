const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

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
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Parses incoming JSON requests

// MongoDB Connection
// Appended 'hostel_tracker' so Mongoose creates/uses the correct database
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://lovepreetsingh200626_db_user:yt5csle8Py6cLcJn@cluster0.kih67sm.mongodb.net/hostel_tracker?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

// API Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/meals', mealRoutes);

// Root Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'active', message: 'Hostel Meal & Attendance API is running!' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});