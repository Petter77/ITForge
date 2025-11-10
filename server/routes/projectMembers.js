const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/projects/:projectId/members
// @desc    Get all members of a project
// @access  Private
router.get('/', async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Check if user has access to this project
    const project = await Project.findById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony lub dostęp zabroniony' });
    }

    const members = await ProjectMember.findByProjectId(projectId);
    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/projects/:projectId/members
// @desc    Add a member to the project
// @access  Private (Owner/Admin only)
router.post(
  '/',
  [
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

      const projectId = req.params.projectId;
      const { email, role = 'member' } = req.body;

      // Check if user is owner or admin of the project
      const project = await Project.findById(projectId, req.user.id);
      if (!project || (project.role !== 'owner' && project.role !== 'admin')) {
        return res.status(403).json({ message: 'Tylko właściciel lub administrator projektu może dodawać członków' });
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

      // Instead of adding directly, send an invitation
      const ProjectInvitation = require('../models/ProjectInvitation');
      
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

      // Get updated member list
      const members = await ProjectMember.findByProjectId(projectId);
      res.status(201).json({
        message: 'Zaproszenie zostało wysłane pomyślnie',
        members,
      });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   PUT /api/projects/:projectId/members/:userId
// @desc    Update member role
// @access  Private (Owner only)
router.put(
  '/:userId',
  [
    body('role')
      .isIn(['admin', 'member', 'observer'])
      .withMessage('Rola musi być admin, member lub observer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const projectId = req.params.projectId;
      const userId = parseInt(req.params.userId);
      const { role } = req.body;

      // Check if user is owner or admin of the project
      const project = await Project.findById(projectId, req.user.id);
      if (!project || (project.role !== 'owner' && project.role !== 'admin')) {
        return res.status(403).json({ message: 'Tylko właściciel lub administrator projektu może aktualizować role członków' });
      }

      // Check if member exists
      const member = await ProjectMember.findByProjectAndUser(projectId, userId);
      if (!member) {
        return res.status(404).json({ message: 'Członek nie został znaleziony' });
      }

      // Prevent assigning 'owner' role - only the project creator can be owner
      if (role === 'owner') {
        return res.status(400).json({ message: 'Nie można przypisać roli właściciela. Tylko założyciel projektu może być właścicielem.' });
      }

      // Prevent changing owner's role - owner role cannot be changed
      if (member.role === 'owner') {
        return res.status(403).json({ message: 'Nie można zmienić roli właściciela. Rola właściciela projektu jest stała.' });
      }

      // Update role
      await ProjectMember.updateRole(projectId, userId, role);

      // Get updated member list
      const members = await ProjectMember.findByProjectId(projectId);
      res.json({
        message: 'Rola członka została zaktualizowana pomyślnie',
        members,
      });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   DELETE /api/projects/:projectId/members/:userId
// @desc    Remove a member from the project
// @access  Private (Owner only, or self-removal)
router.delete('/:userId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const userId = parseInt(req.params.userId);

    // Check if user has access to the project
    const project = await Project.findById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony lub dostęp zabroniony' });
    }

    // Check if member exists
    const member = await ProjectMember.findByProjectAndUser(projectId, userId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Allow removal if: user is owner/admin OR user is removing themselves
    const isOwnerOrAdmin = project.role === 'owner' || project.role === 'admin';
    const isSelfRemoval = req.user.id === userId;

    if (!isOwnerOrAdmin && !isSelfRemoval) {
      return res.status(403).json({ message: 'Tylko właściciel lub administrator projektu może usuwać członków' });
    }

    // Prevent removing the owner (only owner can remove themselves, but not recommended)
    if (member.role === 'owner') {
      return res.status(403).json({ message: 'Nie można usunąć właściciela projektu' });
    }

    // Remove member
    await ProjectMember.removeMember(projectId, userId);

    // Get updated member list
    const members = await ProjectMember.findByProjectId(projectId);
    res.json({
      message: 'Członek został usunięty pomyślnie',
      members,
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

