import { expenseRepository } from '../repositories/expense.repository.js';
import { logAudit } from '../utils/audit.js';

export const expenseController = {
  async getAll(_req, res, next) {
    try {
      const expenses = await expenseRepository.findAll();
      res.json(expenses);
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const id = await expenseRepository.create(req.body);
      logAudit({ action: 'INSERT', entity: 'expenses', entityId: id, changedBy: req.user?.username });
      res.json({ id });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      await expenseRepository.update(req.params.id, req.body);
      logAudit({ action: 'UPDATE', entity: 'expenses', entityId: req.params.id, changedBy: req.user?.username });
      res.json({ message: 'Expense updated' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await expenseRepository.remove(req.params.id);
      logAudit({ action: 'DELETE', entity: 'expenses', entityId: req.params.id, changedBy: req.user?.username });
      res.json({ message: 'Expense deleted' });
    } catch (err) {
      next(err);
    }
  },
};
