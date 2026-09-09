const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required.'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                message: 'Authentication token missing.'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            role: decoded.role
        };

        next();

    } catch (error) {
        console.error('Auth middleware error:', error.message);

        return res.status(401).json({
            message: 'Invalid or expired authentication token.'
        });
    }
};


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