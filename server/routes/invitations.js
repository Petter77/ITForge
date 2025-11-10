const express = require('express');
const { body, validationResult } = require('express-validator');
const ProjectInvitation = require('../models/ProjectInvitation');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/invitations
// @desc    Get all pending invitations for the authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const invitations = await ProjectInvitation.findByUserId(req.user.id, 'pending');
    res.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/invitations
// @desc    Create a new project invitation
// @access  Private (Owner only)
router.post(
  '/',
  [
    body('projectId').isInt().withMessage('ID projektu jest wymagane'),
    body('email').isEmail().normalizeEmail().withMessage('Podaj prawidłowy adres e-mail'),
    body('role')
      .optional()
      .isIn(['admin', 'member', 'observer'])
      .withMessage('Rola musi być admin, member lub observer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { projectId, email, role = 'member' } = req.body;

      // Check if user is owner or admin of the project
      const project = await Project.findById(projectId, req.user.id);
      if (!project || (project.role !== 'owner' && project.role !== 'admin')) {
        return res.status(403).json({ message: 'Tylko właściciel lub administrator projektu może wysyłać zaproszenia' });
      }
      
      // Prevent assigning 'owner' role - only the project creator can be owner
      if (role === 'owner') {
        return res.status(400).json({ message: 'Nie można przypisać roli właściciela. Tylko założyciel projektu może być właścicielem.' });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'Użytkownik z tym adresem e-mail nie został znaleziony' });
      }

      // Check if user is not already a member
      const existingMember = await ProjectMember.findByProjectAndUser(projectId, user.id);
      if (existingMember) {
        return res.status(400).json({ message: 'Użytkownik jest już członkiem tego projektu' });
      }

      // Check if there's already a pending invitation
      const existingInvitations = await ProjectInvitation.findByUserId(user.id, 'pending');
      const existingInvitation = existingInvitations.find(inv => inv.projectId === projectId);
      if (existingInvitation) {
        return res.status(400).json({ message: 'Użytkownik ma już oczekujące zaproszenie do tego projektu' });
      }

      // Create invitation
      const invitation = await ProjectInvitation.create({
        projectId,
        userId: user.id,
        inviterId: req.user.id,
        role,
      });

      if (!invitation) {
        return res.status(400).json({ message: 'Nie udało się utworzyć zaproszenia' });
      }

      res.status(201).json({
        message: 'Zaproszenie zostało wysłane pomyślnie',
        invitation,
      });
    } catch (error) {
      console.error('Create invitation error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   POST /api/invitations/:id/accept
// @desc    Accept a project invitation
// @access  Private
router.post('/:id/accept', async (req, res) => {
  try {
    const invitationId = parseInt(req.params.id);

    const result = await ProjectInvitation.accept(invitationId, req.user.id);

    res.json({
      message: 'Zaproszenie zostało zaakceptowane pomyślnie',
      projectId: result.projectId,
      role: result.role,
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    console.error('Accept invitation error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/invitations/:id/reject
// @desc    Reject a project invitation
// @access  Private
router.post('/:id/reject', async (req, res) => {
  try {
    const invitationId = parseInt(req.params.id);

    await ProjectInvitation.reject(invitationId, req.user.id);

    res.json({
      message: 'Zaproszenie zostało odrzucone pomyślnie',
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    console.error('Reject invitation error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

