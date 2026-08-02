import { userRepository } from '../repositories/user.repository.js';
import { logAudit } from '../utils/audit.js';

export const adminController = {
  async listUsers(req, res, next) {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const result = await userRepository.findAll({ page, limit });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const userId = req.params.id;
      const tempPassword = await userRepository.resetPassword(userId);
      logAudit({ action: 'PASSWORD_RESET', entity: 'users', entityId: userId, changedBy: req.user?.username, userId: req.user?.id });
      res.json({ tempPassword });
    } catch (err) {
      next(err);
    }
  },

  async removeUser(req, res, next) {
    try {
      const userId = req.params.id;
      if (userId === req.user.id) {
        return res.status(409).json({ error: 'No puedes eliminarte a ti mismo.' });
      }
      const result = await userRepository.remove(userId);
      if (result.forbidden) {
        return res.status(409).json({ error: 'No se puede eliminar al administrador global.' });
      }
      logAudit({ action: 'DELETE', entity: 'users', entityId: userId, changedBy: req.user?.username, userId: req.user?.id });
      res.json({ message: 'Usuario eliminado' });
    } catch (err) {
      next(err);
    }
  },
};
