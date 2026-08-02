import { paramsRepository } from '../repositories/params.repository.js';
import { paramsUpdateToDb } from '../mappers/index.js';
import { logAudit } from '../utils/audit.js';
import { payrollController } from './payroll.controller.js';

export const paramsController = {
  async get(req, res, next) {
    try {
      const userId = req.user.id;
      let params = await paramsRepository.findByUserId(userId);
      if (!params) {
        await paramsRepository.createDefault(userId);
        params = await paramsRepository.findByUserId(userId);
      }
      res.json(params);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const userId = req.user.id;
      const values = paramsUpdateToDb(req.body);
      // Ensure params row exists before updating
      const existing = await paramsRepository.findByUserId(userId);
      if (!existing) {
        await paramsRepository.createDefault(userId);
      }
      await paramsRepository.update(userId, values);
      payrollController.invalidateCache();
      logAudit({ action: 'UPDATE', entity: 'params', entityId: userId, changedBy: req.user?.username, userId });
      res.json({ message: 'Params updated' });
    } catch (err) {
      next(err);
    }
  },
};
