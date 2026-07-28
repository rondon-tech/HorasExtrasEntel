import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { expenseSchema } from '../schemas/expense.schema.js';
import { expenseController } from '../controllers/expense.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', expenseController.getAll);
router.post('/', validate(expenseSchema), expenseController.create);
router.put('/:id', validate(expenseSchema), expenseController.update);
router.delete('/:id', expenseController.remove);

export { router as expenseRouter };
