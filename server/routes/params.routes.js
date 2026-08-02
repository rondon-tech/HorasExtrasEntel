import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requirePasswordChanged } from '../middlewares/password-change.js';
import { requireRole } from '../middlewares/role.js';
import { validate } from '../middlewares/validate.js';
import { paramsSchema } from '../schemas/params.schema.js';
import { paramsController } from '../controllers/params.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get('/', paramsController.get);
router.put('/', requireRole('global_admin', 'user'), validate(paramsSchema), paramsController.update);

export { router as paramsRouter };
