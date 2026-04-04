import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '@/controllers/auth.controller';
import { authenticate } from '@/middleware/authenticate';

const router = Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
  ],
  authController.register,
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login,
);

router.post('/refresh',    authController.refresh);
router.post('/logout',     authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

export default router;