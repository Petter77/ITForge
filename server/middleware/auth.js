const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Brak tokenu, autoryzacja odrzucona' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Token jest nieprawidłowy' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Nieprawidłowy token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token wygasł' });
    }
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
};

module.exports = authMiddleware;

