import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { requirePasswordChanged } from '../middlewares/password-change.js';
import { validate } from '../middlewares/validate.js';
import { expenseSchema } from '../schemas/expense.schema.js';
import { idParamSchema } from '../schemas/id-param.schema.js';
import { expenseController } from '../controllers/expense.controller.js';

const router = Router();

router.use(requireAuth);
router.use(requirePasswordChanged);

router.get('/', expenseController.getAll);
router.post('/', validate(expenseSchema), expenseController.create);
router.put('/:id', validate(expenseSchema), expenseController.update);
router.delete('/:id', validate(idParamSchema), expenseController.remove);

export { router as expenseRouter };
