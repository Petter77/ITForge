const express = require('express');
const { body, validationResult } = require('express-validator');
const Risk = require('../models/Risk');
const { RiskSetting } = require('../models/RiskSetting');
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');

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

const checkEditPermission = (req, res, next) => {
  if (req.project.role !== 'owner' && req.project.role !== 'admin') {
    return res.status(403).json({ message: 'Tylko właściciel lub administrator projektu może zarządzać ryzykiem' });
  }
  next();
};

router.get('/:projectId/risks', checkProjectAccess, async (req, res) => {
  try {
    const [settings, risks] = await Promise.all([
      RiskSetting.findByProjectId(req.params.projectId),
      Risk.findByProjectId(req.params.projectId),
    ]);

    res.json({ settings, risks });
  } catch (error) {
    console.error('Get risks error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

router.put('/:projectId/risks/settings', checkProjectAccess, checkEditPermission, async (req, res) => {
  try {
    const { probabilityScale, impactScale } = req.body;

    if (!Array.isArray(probabilityScale) || probabilityScale.length === 0 || !Array.isArray(impactScale) || impactScale.length === 0) {
      return res.status(400).json({ message: 'Skale prawdopodobieństwa i wpływu muszą zawierać co najmniej jedną wartość' });
    }

    const updatedSettings = await RiskSetting.update(req.params.projectId, { probabilityScale, impactScale });

    res.json({
      message: 'Skale ryzyka zostały zaktualizowane',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Update risk settings error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

router.post(
  '/:projectId/risks',
  checkProjectAccess,
  checkEditPermission,
  [
    body('title').trim().notEmpty().withMessage('Tytuł jest wymagany').isLength({ min: 1, max: 255 }),
    body('description').optional().trim(),
    body('probabilityValue').isInt({ min: 1 }).withMessage('Wartość prawdopodobieństwa musi być liczbą dodatnią'),
    body('probabilityLabel').trim().notEmpty(),
    body('impactValue').isInt({ min: 1 }).withMessage('Wartość wpływu musi być liczbą dodatnią'),
    body('impactLabel').trim().notEmpty(),
    body('status').optional().isIn(['open', 'monitoring', 'resolved', 'closed']),
    body('responsePlan').optional().trim(),
    body('ownerId').optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const risk = await Risk.create({
        projectId: req.params.projectId,
        title: req.body.title,
        description: req.body.description,
        probabilityValue: req.body.probabilityValue,
        probabilityLabel: req.body.probabilityLabel,
        impactValue: req.body.impactValue,
        impactLabel: req.body.impactLabel,
        status: req.body.status,
        responsePlan: req.body.responsePlan,
        ownerId: req.body.ownerId,
        createdBy: req.user.id,
      });

      res.status(201).json({
        message: 'Ryzyko zostało utworzone pomyślnie',
        risk,
      });
    } catch (error) {
      console.error('Create risk error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

router.put(
  '/:projectId/risks/:id',
  checkProjectAccess,
  checkEditPermission,
  [
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
    body('description').optional().trim(),
    body('probabilityValue').optional().isInt({ min: 1 }),
    body('probabilityLabel').optional().trim().notEmpty(),
    body('impactValue').optional().isInt({ min: 1 }),
    body('impactLabel').optional().trim().notEmpty(),
    body('status').optional().isIn(['open', 'monitoring', 'resolved', 'closed']),
    body('responsePlan').optional().trim(),
    body('ownerId').optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const risk = await Risk.update(req.params.id, req.params.projectId, {
        title: req.body.title,
        description: req.body.description,
        probabilityValue: req.body.probabilityValue,
        probabilityLabel: req.body.probabilityLabel,
        impactValue: req.body.impactValue,
        impactLabel: req.body.impactLabel,
        status: req.body.status,
        responsePlan: req.body.responsePlan,
        ownerId: req.body.ownerId,
      });

      if (!risk) {
        return res.status(404).json({ message: 'Ryzyko nie zostało znalezione' });
      }

      res.json({
        message: 'Ryzyko zostało zaktualizowane pomyślnie',
        risk,
      });
    } catch (error) {
      console.error('Update risk error:', error);
      res.status(500).json({ message: 'Błąd serwera', error: error.message });
    }
  }
);

router.delete('/:projectId/risks/:id', checkProjectAccess, checkEditPermission, async (req, res) => {
  try {
    const deleted = await Risk.delete(req.params.id, req.params.projectId);
    if (!deleted) {
      return res.status(404).json({ message: 'Ryzyko nie zostało znalezione' });
    }

    res.json({ message: 'Ryzyko zostało usunięte pomyślnie' });
  } catch (error) {
    console.error('Delete risk error:', error);
    res.status(500).json({ message: 'Błąd serwera', error: error.message });
  }
});

module.exports = router;

