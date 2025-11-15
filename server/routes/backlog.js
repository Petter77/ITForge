const express = require('express');
const { body, validationResult } = require('express-validator');
const BacklogItem = require('../models/BacklogItem');
const Sprint = require('../models/Sprint');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const authMiddleware = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authMiddleware);

// Helper function to validate that assigned users are not observers
const validateAssignedUsers = async (projectId, userIds) => {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return { valid: true };
  }

  const members = await ProjectMember.findByProjectId(projectId);
  const observerIds = members
    .filter(m => m.role === 'observer')
    .map(m => m.userId);

  const hasObservers = userIds.some(userId => observerIds.includes(userId));
  
  if (hasObservers) {
    return {
      valid: false,
      message: 'Nie można przypisać elementów backlogu do obserwatorów. Obserwatorzy mają tylko dostęp do podglądu projektu.'
    };
  }

  return { valid: true };
};

// Middleware to check project access
const checkProjectAccess = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony lub dostęp zabroniony' });
    }
    req.project = project;
    next();
  } catch (error) {
    console.error('Check project access error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
};

// @route   GET /api/projects/:projectId/backlog
// @desc    Get backlog items for a project
// @access  Private
router.get('/:projectId/backlog', checkProjectAccess, async (req, res) => {
  try {
    const { sprintId } = req.query;
    const items = await BacklogItem.findByProjectId(req.params.projectId, sprintId ? parseInt(sprintId) : null);
    res.json({ items });
  } catch (error) {
    console.error('Get backlog error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/projects/:projectId/backlog/items
// @desc    Create a new backlog item
// @access  Private
router.post(
  '/:projectId/backlog/items',
  checkProjectAccess,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Tytuł jest wymagany')
      .isLength({ min: 1, max: 255 })
      .withMessage('Tytuł musi mieć od 1 do 255 znaków'),
    body('description').optional().trim(),
    body('type').optional().isIn(['story', 'bug', 'task', 'epic']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('storyPoints').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('sprintId').optional().isInt(),
    body('assignedTo').optional().isArray(),
    body('assignedTo.*').optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, type, priority, storyPoints, status, sprintId, assignedTo } = req.body;

      // Verify sprint belongs to project if provided
      if (sprintId) {
        const sprint = await Sprint.findById(sprintId, req.params.projectId);
        if (!sprint) {
          return res.status(404).json({ message: 'Sprint nie został znaleziony' });
        }
      }

      // Validate that assigned users are not observers
      if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
        const validation = await validateAssignedUsers(req.params.projectId, assignedTo);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.message });
        }
      }

      const item = await BacklogItem.create({
        projectId: req.params.projectId,
        sprintId: sprintId || null,
        title,
        description,
        type,
        priority,
        storyPoints,
        status,
        assignedTo: assignedTo || [],
        createdBy: req.user.id,
      });

      res.status(201).json({
        message: 'Element backlogu został utworzony pomyślnie',
        item,
      });
    } catch (error) {
      console.error('Create backlog item error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   PUT /api/projects/:projectId/backlog/items/:itemId
// @desc    Update a backlog item
// @access  Private
router.put(
  '/:projectId/backlog/items/:itemId',
  checkProjectAccess,
  [
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().trim(),
    body('type').optional().isIn(['story', 'bug', 'task', 'epic']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    body('storyPoints').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('sprintId').optional().isInt(),
    body('assignedTo').optional().isArray(),
    body('assignedTo.*').optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, type, priority, storyPoints, status, sprintId, assignedTo } = req.body;

      // Verify sprint belongs to project if provided
      if (sprintId !== undefined && sprintId !== null) {
        const sprint = await Sprint.findById(sprintId, req.params.projectId);
        if (!sprint) {
          return res.status(404).json({ message: 'Sprint nie został znaleziony' });
        }
      }

      // Validate that assigned users are not observers
      if (assignedTo !== undefined && Array.isArray(assignedTo) && assignedTo.length > 0) {
        const validation = await validateAssignedUsers(req.params.projectId, assignedTo);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.message });
        }
      }

      const item = await BacklogItem.update(req.params.itemId, req.params.projectId, {
        title,
        description,
        type,
        priority,
        storyPoints,
        status,
        sprintId: sprintId !== undefined ? sprintId : undefined,
        assignedTo,
      });

      if (!item) {
        return res.status(404).json({ message: 'Element backlogu nie został znaleziony' });
      }

      res.json({
        message: 'Element backlogu został zaktualizowany pomyślnie',
        item,
      });
    } catch (error) {
      console.error('Update backlog item error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   DELETE /api/projects/:projectId/backlog/items/:itemId
// @desc    Delete a backlog item
// @access  Private
router.delete('/:projectId/backlog/items/:itemId', checkProjectAccess, async (req, res) => {
  try {
    const deleted = await BacklogItem.delete(req.params.itemId, req.params.projectId);
    if (!deleted) {
      return res.status(404).json({ message: 'Element backlogu nie został znaleziony' });
    }

    res.json({ message: 'Element backlogu został usunięty pomyślnie' });
  } catch (error) {
    console.error('Delete backlog item error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   PUT /api/projects/:projectId/backlog/items/:itemId/move
// @desc    Move a backlog item to/from a sprint
// @access  Private
router.put(
  '/:projectId/backlog/items/:itemId/move',
  checkProjectAccess,
  [
    body('sprintId').optional().isInt(),
    body('position').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { sprintId, position } = req.body;

      let item;
      if (sprintId === null || sprintId === undefined) {
        // Remove from sprint
        item = await BacklogItem.removeFromSprint(req.params.itemId, req.params.projectId);
      } else {
        // Verify sprint belongs to project
        const sprint = await Sprint.findById(sprintId, req.params.projectId);
        if (!sprint) {
          return res.status(404).json({ message: 'Sprint nie został znaleziony' });
        }

        // Move to sprint
        item = await BacklogItem.moveToSprint(req.params.itemId, req.params.projectId, sprintId, position);
      }

      if (!item) {
        return res.status(404).json({ message: 'Element backlogu nie został znaleziony' });
      }

      res.json({
        message: 'Element backlogu został przeniesiony pomyślnie',
        item,
      });
    } catch (error) {
      console.error('Move backlog item error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   GET /api/projects/:projectId/sprints
// @desc    Get all sprints for a project
// @access  Private
router.get('/:projectId/sprints', checkProjectAccess, async (req, res) => {
  try {
    const sprints = await Sprint.findByProjectId(req.params.projectId);
    res.json({ sprints });
  } catch (error) {
    console.error('Get sprints error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/projects/:projectId/sprints
// @desc    Create a new sprint
// @access  Private
router.post(
  '/:projectId/sprints',
  checkProjectAccess,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Nazwa sprintu jest wymagana')
      .isLength({ min: 1, max: 255 })
      .withMessage('Nazwa sprintu musi mieć od 1 do 255 znaków'),
    body('goal').optional().trim(),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate(),
    body('status').optional().isIn(['planned', 'active', 'completed', 'cancelled']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, goal, startDate, endDate, status } = req.body;

      const sprint = await Sprint.create({
        projectId: req.params.projectId,
        name,
        goal,
        startDate,
        endDate,
        status,
        createdBy: req.user.id,
      });

      res.status(201).json({
        message: 'Sprint został utworzony pomyślnie',
        sprint,
      });
    } catch (error) {
      console.error('Create sprint error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   PUT /api/projects/:projectId/sprints/:sprintId
// @desc    Update a sprint
// @access  Private
router.put(
  '/:projectId/sprints/:sprintId',
  checkProjectAccess,
  [
    body('name').optional().trim().isLength({ min: 1, max: 255 }),
    body('goal').optional().trim(),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate(),
    body('status').optional().isIn(['planned', 'active', 'completed', 'cancelled']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, goal, startDate, endDate, status } = req.body;

      const sprint = await Sprint.update(req.params.sprintId, req.params.projectId, {
        name,
        goal,
        startDate,
        endDate,
        status,
      });

      if (!sprint) {
        return res.status(404).json({ message: 'Sprint nie został znaleziony' });
      }

      res.json({
        message: 'Sprint został zaktualizowany pomyślnie',
        sprint,
      });
    } catch (error) {
      console.error('Update sprint error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   DELETE /api/projects/:projectId/sprints/:sprintId
// @desc    Delete a sprint
// @access  Private
router.delete('/:projectId/sprints/:sprintId', checkProjectAccess, async (req, res) => {
  try {
    const deleted = await Sprint.delete(req.params.sprintId, req.params.projectId);
    if (!deleted) {
      return res.status(404).json({ message: 'Sprint nie został znaleziony' });
    }

    res.json({ message: 'Sprint został usunięty pomyślnie' });
  } catch (error) {
    console.error('Delete sprint error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

