import { paramsRepository } from '../repositories/params.repository.js';
import { paramsUpdateToDb } from '../mappers/index.js';
import { logAudit } from '../utils/audit.js';

export const paramsController = {
  async get(_req, res, next) {
    try {
      const params = await paramsRepository.findFirst();
      if (params) {
        res.json(params);
      } else {
        res.status(404).json({ error: 'Params not found' });
      }
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const values = paramsUpdateToDb(req.body);
      await paramsRepository.update(values);
      logAudit({ action: 'UPDATE', entity: 'params', entityId: '1', changedBy: req.user?.username });
      res.json({ message: 'Params updated' });
    } catch (err) {
      next(err);
    }
  },
};
