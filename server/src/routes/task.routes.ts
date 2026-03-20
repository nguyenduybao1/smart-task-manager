import { Router } from 'express';
import { body } from 'express-validator';
import * as taskController from '@/controllers/task.controller';
import { authenticate } from '@/middleware/authenticate';

const router = Router();

// All task routes require authentication
router.use(authenticate);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
    body('deadline').optional().isISO8601().withMessage('Invalid deadline format'),
  ],
  taskController.create,
);

router.get('/',    taskController.getAll);
router.get('/analytics', taskController.getAnalytics);
router.get('/:id', taskController.getById);

router.patch(
  '/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid priority'),
    body('deadline').optional({ nullable: true }).isISO8601().withMessage('Invalid deadline format'),
  ],
  taskController.update,
);

router.delete('/:id', taskController.deleteTask);

export default router;