const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Podaj prawidłowy adres e-mail'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Hasło musi mieć co najmniej 6 znaków')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Hasło musi zawierać co najmniej jedną wielką literę, jedną małą literę i jedną cyfrę'),
    body('firstName').trim().notEmpty().withMessage('Imię jest wymagane'),
    body('lastName').trim().notEmpty().withMessage('Nazwisko jest wymagane'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'Użytkownik z tym adresem e-mail już istnieje' });
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
      });

      // Generate token
      const token = generateToken(user.id);

      res.status(201).json({
        message: 'Użytkownik został zarejestrowany pomyślnie',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Błąd serwera podczas rejestracji', error: error.message });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Podaj prawidłowy adres e-mail'),
    body('password').notEmpty().withMessage('Hasło jest wymagane'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Nieprawidłowy e-mail lub hasło' });
      }

      // Verify password
      const isPasswordValid = await User.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Nieprawidłowy e-mail lub hasło' });
      }

      // Generate token
      const token = generateToken(user.id);

      res.json({
        message: 'Logowanie zakończone sukcesem',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Błąd serwera podczas logowania', error: error.message });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

