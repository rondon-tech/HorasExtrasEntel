import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requirePasswordChanged } from '../middlewares/password-change.js';
import { requireGlobalAdmin } from '../middlewares/role.js';
import { adminController } from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);
router.use(requireGlobalAdmin);

router.get('/users', adminController.listUsers);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.removeUser);

export { router as adminRouter };
