import { recordRepository } from '../repositories/record.repository.js';
import { logAudit } from '../utils/audit.js';
import { payrollController } from './payroll.controller.js';
import { logger } from '../utils/logger.js';

export const recordController = {
  async getAll(req, res, next) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const userId = req.user.id;
      const [records, total] = await Promise.all([
        recordRepository.findAll(userId, { limit, offset }),
        recordRepository.countTotal(userId),
      ]);
      res.json({ data: records, total, limit, offset });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const userId = req.user.id;
      logger.info('Creating record', { userId, body: req.body });
      const id = await recordRepository.create(userId, req.body);
      payrollController.invalidateCache();
      logAudit({ action: 'INSERT', entity: 'records', entityId: id, changedBy: req.user?.username, userId });
      res.json({ id });
    } catch (err) {
      logger.error('Failed to create record', {
        userId: req.user?.id,
        body: req.body,
        error: err.message,
        code: err.code,
        detail: err.detail,
        stack: err.stack,
      });
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const userId = req.user.id;
      await recordRepository.update(userId, req.params.id, req.body);
      payrollController.invalidateCache();
      logAudit({ action: 'UPDATE', entity: 'records', entityId: req.params.id, changedBy: req.user?.username, userId });
      res.json({ message: 'Record updated' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const userId = req.user.id;
      await recordRepository.remove(userId, req.params.id);
      payrollController.invalidateCache();
      logAudit({ action: 'DELETE', entity: 'records', entityId: req.params.id, changedBy: req.user?.username, userId });
      res.json({ message: 'Record deleted' });
    } catch (err) {
      next(err);
    }
  },
};
