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
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    const members = await ProjectMember.findByProjectId(projectId);
    res.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/projects/:projectId/members
// @desc    Add a member to the project
// @access  Private (Owner/Admin only)
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('role')
      .optional()
      .isIn(['owner', 'member', 'observer'])
      .withMessage('Role must be owner, member, or observer'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const projectId = req.params.projectId;
      const { email, role = 'member' } = req.body;

      // Check if user is owner of the project
      const project = await Project.findById(projectId, req.user.id);
      if (!project || project.role !== 'owner') {
        return res.status(403).json({ message: 'Only project owner can add members' });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User with this email not found' });
      }

      // Check if user is not already a member
      const existingMember = await ProjectMember.findByProjectAndUser(projectId, user.id);
      if (existingMember) {
        return res.status(400).json({ message: 'User is already a member of this project' });
      }

      // Add member
      await ProjectMember.addMember(projectId, user.id, role);

      // Get updated member list
      const members = await ProjectMember.findByProjectId(projectId);
      res.status(201).json({
        message: 'Member added successfully',
        members,
      });
    } catch (error) {
      console.error('Add member error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
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
      .isIn(['owner', 'member', 'observer'])
      .withMessage('Role must be owner, member, or observer'),
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

      // Check if user is owner of the project
      const project = await Project.findById(projectId, req.user.id);
      if (!project || project.role !== 'owner') {
        return res.status(403).json({ message: 'Only project owner can update member roles' });
      }

      // Check if member exists
      const member = await ProjectMember.findByProjectAndUser(projectId, userId);
      if (!member) {
        return res.status(404).json({ message: 'Member not found' });
      }

      // Prevent removing the last owner
      if (member.role === 'owner' && role !== 'owner') {
        const owners = await ProjectMember.findByProjectId(projectId);
        const ownerCount = owners.filter(m => m.role === 'owner').length;
        if (ownerCount === 1) {
          return res.status(400).json({ message: 'Cannot remove the last owner from the project' });
        }
      }

      // Update role
      await ProjectMember.updateRole(projectId, userId, role);

      // Get updated member list
      const members = await ProjectMember.findByProjectId(projectId);
      res.json({
        message: 'Member role updated successfully',
        members,
      });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
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
      return res.status(404).json({ message: 'Project not found or access denied' });
    }

    // Check if member exists
    const member = await ProjectMember.findByProjectAndUser(projectId, userId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Allow removal if: user is owner OR user is removing themselves
    const isOwner = project.role === 'owner';
    const isSelfRemoval = req.user.id === userId;

    if (!isOwner && !isSelfRemoval) {
      return res.status(403).json({ message: 'Only project owner can remove members' });
    }

    // Prevent removing the last owner
    if (member.role === 'owner' && isOwner) {
      const owners = await ProjectMember.findByProjectId(projectId);
      const ownerCount = owners.filter(m => m.role === 'owner').length;
      if (ownerCount === 1) {
        return res.status(400).json({ message: 'Cannot remove the last owner from the project' });
      }
    }

    // Remove member
    await ProjectMember.removeMember(projectId, userId);

    // Get updated member list
    const members = await ProjectMember.findByProjectId(projectId);
    res.json({
      message: 'Member removed successfully',
      members,
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

