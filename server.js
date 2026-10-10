const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

require('dotenv').config();

// ============================================================
// ROUTE IMPORTS
// ============================================================

const complaintRoutes = require('./routes/complaintRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const authRoutes = require('./routes/authRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const mealRoutes = require('./routes/mealRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// ============================================================
// RELIABLE DNS SERVERS
// ============================================================
//
// Helps prevent MongoDB Atlas SRV lookup problems on some
// campus/local ISP networks.
// ============================================================

try {
  dns.setServers([
    '1.1.1.1',
    '8.8.8.8',
    '8.8.4.4'
  ]);
} catch (error) {
  console.warn(
    '⚠️ Could not set custom DNS servers:',
    error.message
  );
}

// ============================================================
// EXPRESS APP
// ============================================================

const app = express();

// Trust Vercel's proxy
app.set('trust proxy', 1);

// ============================================================
// CORS CONFIGURATION
// ============================================================

const allowedOrigins = [
  'https://messrecord.vercel.app',

  process.env.FRONTEND_URL,

  'http://localhost:5173',
  'http://127.0.0.1:5173',

  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Requests such as Postman/server-to-server may not
    // contain an Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(
      `🚫 CORS blocked origin: ${origin}`
    );

    return callback(
      new Error('Not allowed by CORS')
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ],

  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// ============================================================
// BODY PARSERS
// ============================================================

// 10 MB limit for current Base64/profile-image usage.

app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({
    limit: '10mb',
    extended: true
  })
);

// ============================================================
// BASIC HEALTH ENDPOINTS
// ============================================================

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'active',

    message:
      'Hostel Meal & Attendance API is running.',

    environment:
      process.env.VERCEL
        ? 'vercel'
        : 'local'
  });
});

app.get('/api/health', (req, res) => {
  const mongoState =
    mongoose.connection.readyState;

  res.status(200).json({
    status: 'ok',

    message:
      'Hostel Meal & Attendance API is healthy.',

    database:
      mongoState === 1
        ? 'connected'
        : 'disconnected',

    environment:
      process.env.VERCEL
        ? 'vercel'
        : 'local'
  });
});

// ============================================================
// PRIMARY API ROUTES
// ============================================================

app.use(
  '/api/auth',
  authRoutes
);

app.use(
  '/api/hostels',
  hostelRoutes
);

app.use(
  '/api/meals',
  mealRoutes
);

app.use(
  '/api/complaints',
  complaintRoutes
);

app.use(
  '/api/notices',
  noticeRoutes
);

app.use(
  '/api/payments',
  paymentRoutes
);

// ============================================================
// FALLBACK API ALIASES
// ============================================================
//
// Keeps compatibility with any existing frontend code that
// may call endpoints without the /api prefix.
// ============================================================

app.use(
  '/auth',
  authRoutes
);

app.use(
  '/hostels',
  hostelRoutes
);

app.use(
  '/meals',
  mealRoutes
);

app.use(
  '/complaints',
  complaintRoutes
);

app.use(
  '/notices',
  noticeRoutes
);

app.use(
  '/payments',
  paymentRoutes
);

// ============================================================
// API 404 HANDLER
// ============================================================

app.use((req, res, next) => {
  const apiPrefixes = [
    '/api/',
    '/auth/',
    '/hostels/',
    '/meals/',
    '/complaints/',
    '/notices/',
    '/payments/'
  ];

  const isApiRequest =
    apiPrefixes.some((prefix) =>
      req.path.startsWith(prefix)
    );

  if (isApiRequest) {
    return res.status(404).json({
      message:
        'API endpoint not found.'
    });
  }

  next();
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (err, req, res, next) => {
    console.error(
      '⚠️ Server Error:',
      err
    );

    // --------------------------------------------------------
    // CORS ERROR
    // --------------------------------------------------------

    if (
      err &&
      err.message ===
        'Not allowed by CORS'
    ) {
      return res.status(403).json({
        message:
          'CORS policy blocked this request.'
      });
    }

    // --------------------------------------------------------
    // PAYLOAD TOO LARGE
    // --------------------------------------------------------

    if (
      err &&
      err.type ===
        'entity.too.large'
    ) {
      return res.status(413).json({
        message:
          'Payload too large. Please upload an image under 10MB.'
      });
    }

    // --------------------------------------------------------
    // GENERAL ERROR
    // --------------------------------------------------------

    return res.status(
      err?.status || 500
    ).json({
      message:
        err?.message ||
        'Internal Server Error.'
    });
  }
);

// ============================================================
// MONGODB CONFIGURATION
// ============================================================

const PORT =
  process.env.PORT || 5000;

const MONGO_URI =
  process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    '❌ FATAL: MONGO_URI is not defined in your environment variables.'
  );
}

// ============================================================
// MONGODB CONNECTION PROMISE
// ============================================================
//
// Keeps one connection promise so multiple Vercel
// invocations do not unnecessarily create connections.
// ============================================================

let mongoConnectionPromise = null;

// ============================================================
// CONNECT TO MONGODB
// ============================================================

const connectDB = async () => {
  if (!MONGO_URI) {
    throw new Error(
      'MONGO_URI is not configured.'
    );
  }

  // ----------------------------------------------------------
  // Already connected
  // ----------------------------------------------------------

  if (
    mongoose.connection.readyState === 1
  ) {
    return;
  }

  // ----------------------------------------------------------
  // Connection currently being established
  // ----------------------------------------------------------

  if (
    mongoose.connection.readyState === 2 &&
    mongoConnectionPromise
  ) {
    await mongoConnectionPromise;
    return;
  }

  // ----------------------------------------------------------
  // Start connection
  // ----------------------------------------------------------

  if (!mongoConnectionPromise) {
    mongoConnectionPromise =
      mongoose
        .connect(MONGO_URI, {
          serverSelectionTimeoutMS: 10000,
          maxPoolSize: 10
        })
        .then(() => {
          console.log(
            '✅ Connected to MongoDB successfully'
          );
        })
        .catch((error) => {
          mongoConnectionPromise = null;

          console.error(
            '❌ MongoDB connection error:',
            error.message
          );

          throw error;
        });
  }

  await mongoConnectionPromise;
};

// ============================================================
// VERCEL / LOCAL SERVER STARTUP
// ============================================================

if (process.env.VERCEL) {

  // ==========================================================
  // VERCEL SERVERLESS
  // ==========================================================

  module.exports = async (
    req,
    res
  ) => {
    try {
      await connectDB();

      return app(
        req,
        res
      );

    } catch (error) {
      console.error(
        '❌ Vercel request error:',
        error.message
      );

      return res.status(500).json({
        message:
          'Database connection failed.'
      });
    }
  };

} else {

  // ==========================================================
  // LOCAL DEVELOPMENT
  // ==========================================================

  connectDB()
    .then(() => {
      app.listen(
        PORT,
        () => {
          console.log(
            `🚀 Server listening on port ${PORT}`
          );
        }
      );
    })
    .catch((error) => {
      console.error(
        '❌ Server startup failed:',
        error.message
      );

      process.exit(1);
    });

  module.exports = app;
}
