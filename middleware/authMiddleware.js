const jwt = require('jsonwebtoken');

// =========================================================
// JWT SECRET
// =========================================================
//
// IMPORTANT:
// authRoutes.js and this middleware MUST use the same
// JWT_SECRET.
//
// JWT_SECRET should be defined in Vercel Environment Variables.
//
// Example:
// JWT_SECRET=your-long-random-secret
//
// The fallback is only for local development.
// =========================================================

const JWT_SECRET =
  process.env.JWT_SECRET || 'GNDU_MESS_PORTAL_SECRET_2026';


// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================

const authMiddleware = (req, res, next) => {
  try {
    // -----------------------------------------------------
    // Get Authorization header
    // -----------------------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }


    // -----------------------------------------------------
    // Validate Bearer format
    // -----------------------------------------------------

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Invalid authentication format.'
      });
    }


    // -----------------------------------------------------
    // Extract token
    // -----------------------------------------------------

    const token = authHeader
      .substring(7)
      .trim();

    if (!token) {
      return res.status(401).json({
        message: 'Authentication token missing.'
      });
    }


    // -----------------------------------------------------
    // Verify JWT
    // -----------------------------------------------------

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );


    // -----------------------------------------------------
    // Validate JWT payload
    // -----------------------------------------------------

    if (
      !decoded ||
      !decoded.id ||
      !decoded.role
    ) {
      return res.status(401).json({
        message: 'Invalid authentication token.'
      });
    }


    // -----------------------------------------------------
    // Validate allowed roles
    // -----------------------------------------------------

    if (
      decoded.role !== 'student' &&
      decoded.role !== 'admin'
    ) {
      return res.status(403).json({
        message: 'Invalid account role.'
      });
    }


    // -----------------------------------------------------
    // Attach authenticated user
    // -----------------------------------------------------

    req.user = {
      id: String(decoded.id),
      role: decoded.role
    };


    // -----------------------------------------------------
    // Continue request
    // -----------------------------------------------------

    next();

  } catch (error) {

    // -----------------------------------------------------
    // JWT errors
    // -----------------------------------------------------

    console.error(
      '❌ JWT verification error:',
      error.message
    );

    return res.status(401).json({
      message:
        'Invalid or expired authentication token.'
    });
  }
};


// =========================================================
// STUDENT AUTHORIZATION
// =========================================================

const requireStudent = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required.'
    });
  }


  if (req.user.role !== 'student') {
    return res.status(403).json({
      message: 'Student access required.'
    });
  }


  next();
};


// =========================================================
// ADMIN AUTHORIZATION
// =========================================================

const requireAdmin = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({
      message: 'Authentication required.'
    });
  }


  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin access required.'
    });
  }


  next();
};


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  authMiddleware,
  requireStudent,
  requireAdmin
};