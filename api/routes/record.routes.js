import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { recordSchema } from '../schemas/record.schema.js';
import { recordController } from '../controllers/record.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', recordController.getAll);
router.post('/', validate(recordSchema), recordController.create);
router.put('/:id', validate(recordSchema), recordController.update);
router.delete('/:id', recordController.remove);

export { router as recordRouter };
