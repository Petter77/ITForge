const express = require('express');
const { body, validationResult } = require('express-validator');
const KanbanColumn = require('../models/KanbanColumn');
const KanbanTask = require('../models/KanbanTask');
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
      message: 'Nie można przypisać zadań do obserwatorów. Obserwatorzy mają tylko dostęp do podglądu projektu.'
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

// @route   GET /api/projects/:projectId/kanban
// @desc    Get all columns and tasks for a project
// @access  Private
router.get('/:projectId/kanban', checkProjectAccess, async (req, res) => {
  try {
    // Initialize default columns if they don't exist
    const columns = await KanbanColumn.initializeDefaultColumns(req.params.projectId);
    
    // Get all tasks for the project
    const allTasks = await KanbanTask.findByProjectId(req.params.projectId);
    
    // Group tasks by column
    const columnsWithTasks = await Promise.all(
      columns.map(async (column) => {
        const tasks = allTasks.filter(task => task.columnId === column.id);
        return {
          ...column,
          tasks: tasks.sort((a, b) => a.position - b.position),
        };
      })
    );

    res.json({ columns: columnsWithTasks });
  } catch (error) {
    console.error('Get kanban error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

// @route   POST /api/projects/:projectId/kanban/tasks
// @desc    Create a new task
// @access  Private
router.post(
  '/:projectId/kanban/tasks',
  checkProjectAccess,
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Tytuł zadania jest wymagany')
      .isLength({ min: 1, max: 255 })
      .withMessage('Tytuł zadania musi mieć od 1 do 255 znaków'),
    body('description')
      .optional()
      .trim(),
    body('columnId')
      .notEmpty()
      .withMessage('ID kolumny jest wymagane')
      .isInt()
      .withMessage('ID kolumny musi być liczbą całkowitą'),
    body('position')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Pozycja musi być liczbą całkowitą'),
    body('assignedTo')
      .optional()
      .isArray()
      .withMessage('Przypisani użytkownicy muszą być tablicą'),
    body('assignedTo.*')
      .optional()
      .isInt()
      .withMessage('Każdy ID użytkownika musi być liczbą całkowitą'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify column belongs to project
      const column = await KanbanColumn.findById(req.body.columnId, req.params.projectId);
      if (!column) {
        return res.status(404).json({ message: 'Kolumna nie została znaleziona' });
      }

      const { title, description, columnId, position, assignedTo } = req.body;

      // Validate that assigned users are not observers
      if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
        const validation = await validateAssignedUsers(req.params.projectId, assignedTo);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.message });
        }
      }
      const task = await KanbanTask.create({
        columnId,
        projectId: req.params.projectId,
        title,
        description,
        position: position !== undefined ? position : 0,
        assignedTo: assignedTo || null,
        createdBy: req.user.id,
      });

      res.status(201).json({
        message: 'Zadanie zostało utworzone pomyślnie',
        task,
      });
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   PUT /api/projects/:projectId/kanban/tasks/:taskId
// @desc    Update a task
// @access  Private
router.put(
  '/:projectId/kanban/tasks/:taskId',
  checkProjectAccess,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Tytuł zadania musi mieć od 1 do 255 znaków'),
    body('description')
      .optional()
      .trim(),
    body('columnId')
      .optional()
      .isInt()
      .withMessage('ID kolumny musi być liczbą całkowitą'),
    body('position')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Pozycja musi być liczbą całkowitą'),
    body('assignedTo')
      .optional()
      .isArray()
      .withMessage('Przypisani użytkownicy muszą być tablicą'),
    body('assignedTo.*')
      .optional()
      .isInt()
      .withMessage('Każdy ID użytkownika musi być liczbą całkowitą'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // If columnId is being updated, verify it belongs to project
      if (req.body.columnId) {
        const column = await KanbanColumn.findById(req.body.columnId, req.params.projectId);
        if (!column) {
          return res.status(404).json({ message: 'Kolumna nie została znaleziona' });
        }
      }

      const { title, description, columnId, position, assignedTo } = req.body;

      // Validate that assigned users are not observers
      if (assignedTo !== undefined && Array.isArray(assignedTo) && assignedTo.length > 0) {
        const validation = await validateAssignedUsers(req.params.projectId, assignedTo);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.message });
        }
      }
      const task = await KanbanTask.update(req.params.taskId, req.params.projectId, {
        title,
        description,
        columnId,
        position,
        assignedTo,
      });

      if (!task) {
        return res.status(404).json({ message: 'Zadanie nie zostało znalezione' });
      }

      res.json({
        message: 'Zadanie zostało zaktualizowane pomyślnie',
        task,
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   PUT /api/projects/:projectId/kanban/tasks/:taskId/move
// @desc    Move a task to another column/position
// @access  Private
router.put(
  '/:projectId/kanban/tasks/:taskId/move',
  checkProjectAccess,
  [
    body('columnId')
      .notEmpty()
      .withMessage('ID kolumny jest wymagane')
      .isInt()
      .withMessage('ID kolumny musi być liczbą całkowitą'),
    body('position')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Pozycja musi być liczbą całkowitą'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify column belongs to project
      const column = await KanbanColumn.findById(req.body.columnId, req.params.projectId);
      if (!column) {
        return res.status(404).json({ message: 'Kolumna nie została znaleziona' });
      }

      const { columnId, position } = req.body;
      const task = await KanbanTask.moveTask(
        req.params.taskId,
        req.params.projectId,
        columnId,
        position !== undefined ? position : 0
      );

      if (!task) {
        return res.status(404).json({ message: 'Zadanie nie zostało znalezione' });
      }

      res.json({
        message: 'Zadanie zostało przeniesione pomyślnie',
        task,
      });
    } catch (error) {
      console.error('Move task error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

// @route   DELETE /api/projects/:projectId/kanban/tasks/:taskId
// @desc    Delete a task
// @access  Private
router.delete('/:projectId/kanban/tasks/:taskId', checkProjectAccess, async (req, res) => {
  try {
    const deleted = await KanbanTask.delete(req.params.taskId, req.params.projectId);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Zadanie nie zostało znalezione' });
    }

    res.json({ message: 'Zadanie zostało usunięte pomyślnie' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

