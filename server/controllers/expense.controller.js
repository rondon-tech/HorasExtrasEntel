import { expenseRepository } from '../repositories/expense.repository.js';
import { logAudit } from '../utils/audit.js';
import { payrollController } from './payroll.controller.js';
import { clearSnapshotCache } from '../agents/context.js';

export const expenseController = {
  async getAll(req, res, next) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const userId = req.user.id;
      const [expenses, total] = await Promise.all([
        expenseRepository.findAll(userId, { limit, offset }),
        expenseRepository.countTotal(userId),
      ]);
      res.json({ data: expenses, total, limit, offset });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const userId = req.user.id;
      const id = await expenseRepository.create(userId, req.body);
      payrollController.invalidateCache();
      clearSnapshotCache();
      logAudit({ action: 'INSERT', entity: 'expenses', entityId: id, changedBy: req.user?.username, userId });
      res.json({ id });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const userId = req.user.id;
      await expenseRepository.update(userId, req.params.id, req.body);
      payrollController.invalidateCache();
      clearSnapshotCache();
      logAudit({ action: 'UPDATE', entity: 'expenses', entityId: req.params.id, changedBy: req.user?.username, userId });
      res.json({ message: 'Expense updated' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const userId = req.user.id;
      await expenseRepository.remove(userId, req.params.id);
      payrollController.invalidateCache();
      clearSnapshotCache();
      logAudit({ action: 'DELETE', entity: 'expenses', entityId: req.params.id, changedBy: req.user?.username, userId });
      res.json({ message: 'Expense deleted' });
    } catch (err) {
      next(err);
    }
  },
};
