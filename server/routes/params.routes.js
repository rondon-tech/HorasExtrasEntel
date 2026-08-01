import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';
import { validate } from '../middlewares/validate.js';
import { paramsSchema } from '../schemas/params.schema.js';
import { paramsController } from '../controllers/params.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', paramsController.get);
router.put('/', requireRole('admin'), validate(paramsSchema), paramsController.update);

export { router as paramsRouter };
