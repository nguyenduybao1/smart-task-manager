import { Router } from 'express';
import { body, query } from 'express-validator';
import * as syncController from '@/controllers/sync.controller';
import { authenticate } from '@/middleware/authenticate';

const router = Router();

// All sync routes require authentication
router.use(authenticate);

// Sync single task
router.post(
  '/tasks/:id',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('status').isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
    body('priority').isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
    body('baseVersion').isInt({ min: 1 }).withMessage('baseVersion must be a positive integer'),
    body('updatedAt').isISO8601().withMessage('updatedAt must be a valid ISO date'),
  ],
  syncController.syncTask,
);

// Batch sync
router.post(
  '/tasks',
  [
    body('tasks').isArray({ min: 1 }).withMessage('tasks must be a non-empty array'),
    body('tasks.*.title').trim().notEmpty().withMessage('Each task must have a title'),
    body('tasks.*.baseVersion').isInt({ min: 1 }).withMessage('Each task must have a valid baseVersion'),
    body('tasks.*.updatedAt').isISO8601().withMessage('Each task must have a valid updatedAt'),
  ],
  syncController.syncBatch,
);

// Pull — get tasks modified since timestamp
router.get(
  '/tasks',
  [
    query('since').isISO8601().withMessage('since must be a valid ISO date'),
  ],
  syncController.getModifiedSince,
);

export default router;