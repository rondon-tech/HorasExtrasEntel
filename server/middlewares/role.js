/**
 * Role-based authorization middleware.
 *
 * Usage:  router.put('/params', requireRole('admin'), controller.update);
 *
 * The JWT token must contain a `role` claim (set during login).
 * If the user's role is not in the allowed list, the request is rejected
 * with 403 Forbidden.
 *
 * Roles:  admin | supervisor | tecnico
 */

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({ error: 'Acceso denegado: Sin rol asignado' });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: `Acceso denegado: El rol '${userRole}' no está autorizado. Se requiere: ${allowedRoles.join(' o ')}`,
      });
    }

    next();
  };
}
