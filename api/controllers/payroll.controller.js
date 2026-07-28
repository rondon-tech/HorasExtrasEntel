import { recordRepository } from '../repositories/record.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { paramsRepository } from '../repositories/params.repository.js';
import { calculatePayroll } from '../services/payroll.service.js';

const payrollCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const payrollController = {
  async get(req, res, next) {
    try {
      const { year, month } = req.params;
      const cacheKey = `${year}-${month}`;

      const cached = payrollCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return res.json(cached.data);
      }

      const paramsRow = await paramsRepository.findFirstRaw();
      if (!paramsRow) return res.status(500).json({ error: 'Params missing' });

      const records = await recordRepository.findByMonth(year, month);
      const expenses = await expenseRepository.findByMonth(year, month);

      const payrollSummary = calculatePayroll(records, expenses, paramsRow);

      payrollCache.set(cacheKey, {
        data: payrollSummary,
        expires: Date.now() + CACHE_TTL_MS,
      });

      res.json(payrollSummary);
    } catch (err) {
      next(err);
    }
  },

  /** Invalidate cache when records/expenses/params change (called by mutations) */
  invalidateCache() {
    payrollCache.clear();
  },
};
