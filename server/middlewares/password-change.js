/**
 * Password-change enforcement middleware.
 *
 * Blocks all API access for users whose password_change_required
 * flag is still true. The only allowed route is /api/change-password.
 *
 * Must be mounted AFTER requireAuth (which sets req.user)
 * and BEFORE any route handlers that require a changed password.
 */

export function requirePasswordChanged(req, res, next) {
  if (
    req.user?.passwordChangeRequired === true &&
    req.path !== '/api/change-password' &&
    !req.path.startsWith('/api/auth')
  ) {
    return res.status(403).json({
      error: 'Debe cambiar su contraseña antes de continuar.',
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  }
  next();
}
