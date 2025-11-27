const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');
const projectMemberRoutes = require('./projectMembers');
const kanbanRoutes = require('./kanban');
const backlogRoutes = require('./backlog');
const requirementsRoutes = require('./requirements');
const riskRoutes = require('./risks');
const ganttRoutes = require('./gantt');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// @route   GET /api/projects
// @desc    Get all projects for the authenticated user
// @access  Private
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findByUserId(req.user.id);
    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   GET /api/projects/:id
// @desc    Get a single project by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id, req.user.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony lub dostęp zabroniony' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Nazwa projektu jest wymagana')
      .isLength({ min: 1, max: 255 })
      .withMessage('Nazwa projektu musi mieć od 1 do 255 znaków'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Opis musi mieć mniej niż 2000 znaków'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;
      const project = await Project.create({
        name,
        description,
        ownerId: req.user.id,
      });

      // Get the project with member count
      const projectWithDetails = await Project.findById(project.id, req.user.id);

      res.status(201).json({
        message: 'Projekt został utworzony pomyślnie',
        project: projectWithDetails,
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private (Owner only)
router.put(
  '/:id',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Nazwa projektu musi mieć od 1 do 255 znaków'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Opis musi mieć mniej niż 2000 znaków'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;
      const project = await Project.update(req.params.id, req.user.id, {
        name,
        description,
      });

      // Get the updated project with details
      const projectWithDetails = await Project.findById(project.id, req.user.id);

      res.json({
        message: 'Projekt został zaktualizowany pomyślnie',
        project: projectWithDetails,
      });
    } catch (error) {
      if (error.message.includes('Only project owner')) {
        return res.status(403).json({ message: error.message });
      }
      console.error('Update project error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private (Owner only)
router.delete('/:id', async (req, res) => {
  try {
    await Project.delete(req.params.id, req.user.id);
    res.json({ message: 'Projekt został usunięty pomyślnie' });
  } catch (error) {
    if (error.message.includes('Only project owner')) {
      return res.status(403).json({ message: error.message });
    }
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// Mount project members routes
router.use('/:projectId/members', projectMemberRoutes);

// Mount kanban routes
router.use('/', kanbanRoutes);

// Mount backlog routes
router.use('/', backlogRoutes);

// Mount requirements routes
router.use('/', requirementsRoutes);

// Mount gantt routes
router.use('/', ganttRoutes);

// Mount risk routes
router.use('/', riskRoutes);

module.exports = router;

