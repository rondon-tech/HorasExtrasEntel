import { expenseRepository } from '../repositories/expense.repository.js';
import { logAudit } from '../utils/audit.js';
import { payrollController } from './payroll.controller.js';

export const expenseController = {
  async getAll(req, res, next) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const [expenses, total] = await Promise.all([
        expenseRepository.findAll({ limit, offset }),
        expenseRepository.countTotal(),
      ]);
      res.json({ data: expenses, total, limit, offset });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const id = await expenseRepository.create(req.body);
      payrollController.invalidateCache();
      logAudit({ action: 'INSERT', entity: 'expenses', entityId: id, changedBy: req.user?.username });
      res.json({ id });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      await expenseRepository.update(req.params.id, req.body);
      payrollController.invalidateCache();
      logAudit({ action: 'UPDATE', entity: 'expenses', entityId: req.params.id, changedBy: req.user?.username });
      res.json({ message: 'Expense updated' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await expenseRepository.remove(req.params.id);
      payrollController.invalidateCache();
      logAudit({ action: 'DELETE', entity: 'expenses', entityId: req.params.id, changedBy: req.user?.username });
      res.json({ message: 'Expense deleted' });
    } catch (err) {
      next(err);
    }
  },
};
