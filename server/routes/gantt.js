const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const Project = require('../models/Project');
const GanttTask = require('../models/GanttTask');
const BacklogItem = require('../models/BacklogItem');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

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

const ganttValidations = [
  body('title').optional().trim().isLength({ min: 1, max: 255 }).withMessage('Tytuł musi mieć od 1 do 255 znaków'),
  body('startDate').optional().isISO8601().toDate().withMessage('Nieprawidłowy format daty startu'),
  body('endDate').optional().isISO8601().toDate().withMessage('Nieprawidłowy format daty zakończenia'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Postęp musi być liczbą całkowitą z zakresu 0-100'),
  body('status')
    .optional()
    .isIn(['planned', 'in_progress', 'blocked', 'done'])
    .withMessage('Nieprawidłowy status zadania'),
  body('dependencies')
    .optional({ nullable: true })
    .isString()
    .withMessage('Pole dependencies musi być tekstem'),
  body('backlogItemId')
    .optional({ nullable: true })
    .custom((value) => value === null || Number.isInteger(Number(value)))
    .withMessage('backlogItemId musi być liczbą całkowitą'),
];

router.get('/:projectId/gantt/tasks', checkProjectAccess, async (req, res) => {
  try {
    const tasks = await GanttTask.findByProjectId(req.params.projectId);
    res.json({ tasks });
  } catch (error) {
    console.error('Get Gantt tasks error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

router.post(
  '/:projectId/gantt/tasks',
  checkProjectAccess,
  [
    body('title').trim().notEmpty().withMessage('Tytuł jest wymagany').isLength({ max: 255 }),
    body('startDate').notEmpty().withMessage('Data startu jest wymagana'),
    body('endDate').notEmpty().withMessage('Data zakończenia jest wymagana'),
    ...ganttValidations,
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, startDate, endDate, progress, status, dependencies, backlogItemId } = req.body;

      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({ message: 'Data zakończenia musi być późniejsza niż data rozpoczęcia' });
      }

      if (backlogItemId) {
        const item = await BacklogItem.findById(backlogItemId, req.params.projectId);
        if (!item) {
          return res.status(404).json({ message: 'Element backlogu nie został znaleziony' });
        }
      }

      const task = await GanttTask.create({
        projectId: req.params.projectId,
        title,
        description,
        startDate,
        endDate,
        progress: typeof progress === 'number' ? progress : progress ? Number(progress) : 0,
        status: status || 'planned',
        dependencies,
        backlogItemId,
        userId: req.user.id,
      });

      res.status(201).json({ message: 'Zadanie Gantta zostało utworzone', task });
    } catch (error) {
      console.error('Create Gantt task error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

router.put('/:projectId/gantt/tasks/:taskId', checkProjectAccess, ganttValidations, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, backlogItemId } = req.body;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Data zakończenia musi być późniejsza niż data rozpoczęcia' });
    }

    if (backlogItemId) {
      const item = await BacklogItem.findById(backlogItemId, req.params.projectId);
      if (!item) {
        return res.status(404).json({ message: 'Element backlogu nie został znaleziony' });
      }
    }

    const task = await GanttTask.update(req.params.taskId, req.params.projectId, req.body);
    if (!task) {
      return res.status(404).json({ message: 'Zadanie nie zostało znalezione' });
    }

    res.json({ message: 'Zadanie Gantta zostało zaktualizowane', task });
  } catch (error) {
    console.error('Update Gantt task error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

router.delete('/:projectId/gantt/tasks/:taskId', checkProjectAccess, async (req, res) => {
  try {
    const success = await GanttTask.delete(req.params.taskId, req.params.projectId);
    if (!success) {
      return res.status(404).json({ message: 'Zadanie nie zostało znalezione' });
    }
    res.json({ message: 'Zadanie Gantta zostało usunięte' });
  } catch (error) {
    console.error('Delete Gantt task error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

