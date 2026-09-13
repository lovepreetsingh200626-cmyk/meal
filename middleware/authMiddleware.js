const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'GNDU_MESS_PORTAL_SECRET_2026';


// =========================================================
// AUTHENTICATION MIDDLEWARE
// =========================================================

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No authorization header
    if (!authHeader) {
      return res.status(401).json({
        message: 'Authentication required.'
      });
    }

    // Wrong authorization format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Invalid authentication format.'
      });
    }

    // Extract token
    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        message: 'Authentication token missing.'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    // Validate JWT payload
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({
        message: 'Invalid authentication token.'
      });
    }

    // Attach authenticated user
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (error) {

    console.error(
      '❌ JWT verification error:',
      error.message
    );

    return res.status(401).json({
      message: 'Invalid or expired authentication token.'
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


module.exports = {
  authMiddleware,
  requireStudent,
  requireAdmin
};