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
      await userRepository.resetPassword(userId);
      logAudit({ action: 'PASSWORD_RESET', entity: 'users', entityId: userId, changedBy: req.user?.username, userId: req.user?.id });
      res.json({ message: 'Password reset successfully' });
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

  async updateUser(req, res, next) {
    try {
      const userId = req.params.id;
      const { firstName, lastName, email, phone } = req.body;

      if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
        return res.status(400).json({ error: 'El nombre es requerido.' });
      }
      if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
        return res.status(400).json({ error: 'El apellido es requerido.' });
      }
      if (!email || typeof email !== 'string' || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'El email es requerido y debe tener formato válido.' });
      }

      await userRepository.updateProfile(userId, {
        firstName: firstName.trim().slice(0, 100),
        lastName: lastName.trim().slice(0, 100),
        email: email.trim().slice(0, 255),
        phone: (phone && typeof phone === 'string') ? phone.trim().slice(0, 20) : '000000000',
      });

      logAudit({ action: 'UPDATE', entity: 'users', entityId: userId, changedBy: req.user?.username, userId: req.user?.id });

      res.json({ message: 'Usuario actualizado correctamente.' });
    } catch (err) {
      next(err);
    }
  },
};
