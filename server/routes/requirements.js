const express = require('express');
const { body, validationResult } = require('express-validator');
const Requirement = require('../models/Requirement');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authMiddleware);

// Middleware to check project access and permissions
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

// Middleware to check if user can edit (owner or admin only)
const checkEditPermission = (req, res, next) => {
  if (req.project.role !== 'owner' && req.project.role !== 'admin') {
    return res.status(403).json({ message: 'Tylko właściciel lub administrator projektu może zarządzać wymaganiami' });
  }
  next();
};

// @route   GET /api/projects/:projectId/requirements
// @desc    Get all requirements for a project
// @access  Private
router.get('/:projectId/requirements', checkProjectAccess, async (req, res) => {
  try {
    const requirements = await Requirement.findByProjectId(req.params.projectId);
    res.json({ requirements });
  } catch (error) {
    console.error('Get requirements error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/projects/:projectId/requirements
// @desc    Create a new requirement
// @access  Private (Owner/Admin only)
router.post(
  '/:projectId/requirements',
  checkProjectAccess,
  checkEditPermission,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Tytuł wymagania jest wymagany')
      .isLength({ min: 1, max: 255 })
      .withMessage('Tytuł musi mieć od 1 do 255 znaków'),
    body('description').optional().trim(),
    body('type')
      .isIn(['functional', 'non-functional'])
      .withMessage('Typ musi być "functional" lub "non-functional"'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priorytet musi być low, medium, high lub critical'),
    body('status')
      .optional()
      .isIn(['draft', 'approved', 'implemented', 'rejected'])
      .withMessage('Status musi być draft, approved, implemented lub rejected'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, type, priority, status } = req.body;

      const requirement = await Requirement.create({
        projectId: req.params.projectId,
        title,
        description,
        type,
        priority,
        status,
        createdBy: req.user.id,
      });

      res.status(201).json({
        message: 'Wymaganie zostało utworzone pomyślnie',
        requirement,
      });
    } catch (error) {
      console.error('Create requirement error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   PUT /api/projects/:projectId/requirements/:id
// @desc    Update a requirement
// @access  Private (Owner/Admin only)
router.put(
  '/:projectId/requirements/:id',
  checkProjectAccess,
  checkEditPermission,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Tytuł musi mieć od 1 do 255 znaków'),
    body('description').optional().trim(),
    body('type')
      .optional()
      .isIn(['functional', 'non-functional'])
      .withMessage('Typ musi być "functional" lub "non-functional"'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priorytet musi być low, medium, high lub critical'),
    body('status')
      .optional()
      .isIn(['draft', 'approved', 'implemented', 'rejected'])
      .withMessage('Status musi być draft, approved, implemented lub rejected'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, type, priority, status } = req.body;

      const requirement = await Requirement.update(req.params.id, req.params.projectId, {
        title,
        description,
        type,
        priority,
        status,
      });

      if (!requirement) {
        return res.status(404).json({ message: 'Wymaganie nie zostało znalezione' });
      }

      res.json({
        message: 'Wymaganie zostało zaktualizowane pomyślnie',
        requirement,
      });
    } catch (error) {
      console.error('Update requirement error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   DELETE /api/projects/:projectId/requirements/:id
// @desc    Delete a requirement
// @access  Private (Owner/Admin only)
router.delete('/:projectId/requirements/:id', checkProjectAccess, checkEditPermission, async (req, res) => {
  try {
    const deleted = await Requirement.delete(req.params.id, req.params.projectId);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Wymaganie nie zostało znalezione' });
    }

    res.json({ message: 'Wymaganie zostało usunięte pomyślnie' });
  } catch (error) {
    console.error('Delete requirement error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

