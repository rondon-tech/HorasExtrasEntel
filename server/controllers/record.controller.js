import { recordRepository } from '../repositories/record.repository.js';
import { logAudit } from '../utils/audit.js';

export const recordController = {
  async getAll(req, res, next) {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const [records, total] = await Promise.all([
        recordRepository.findAll({ limit, offset }),
        recordRepository.countTotal(),
      ]);
      res.json({ data: records, total, limit, offset });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const id = await recordRepository.create(req.body);
      logAudit({ action: 'INSERT', entity: 'records', entityId: id, changedBy: req.user?.username });
      res.json({ id });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      await recordRepository.update(req.params.id, req.body);
      logAudit({ action: 'UPDATE', entity: 'records', entityId: req.params.id, changedBy: req.user?.username });
      res.json({ message: 'Record updated' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await recordRepository.remove(req.params.id);
      logAudit({ action: 'DELETE', entity: 'records', entityId: req.params.id, changedBy: req.user?.username });
      res.json({ message: 'Record deleted' });
    } catch (err) {
      next(err);
    }
  },
};
