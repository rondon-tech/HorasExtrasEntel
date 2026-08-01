import { describe, it, expect, vi } from 'vitest';

// Set env vars before importing the middleware (dotenv will load them in env.ts)
process.env.JWT_SECRET = 'test-jwt-secret-key-for-middleware-tests';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'pass';

vi.mock('../config/db.js', () => ({ pool: { query: vi.fn(), on: vi.fn() } }));

import jwt from 'jsonwebtoken';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/role.js';

function mockReqRes(headers = {}) {
  const req = { headers: { authorization: headers.Authorization || '' }, user: null };
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  return { req, res, next };
}

describe('Auth Middleware', () => {
  it('should call next() for a valid token', () => {
    const token = jwt.sign({ username: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { req, res, next } = mockReqRes({ Authorization: `Bearer ${token}` });
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.username).toBe('admin');
  });

  it('should return 401 when no token is provided', () => {
    const { req, res, next } = mockReqRes();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for an expired token', () => {
    const token = jwt.sign({ username: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '0s' });
    const { req, res, next } = mockReqRes({ Authorization: `Bearer ${token}` });
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 for a token signed with wrong secret', () => {
    const token = jwt.sign({ username: 'admin' }, 'wrong-secret', { expiresIn: '1h' });
    const { req, res, next } = mockReqRes({ Authorization: `Bearer ${token}` });
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('Role Middleware', () => {
  it('should call next() for allowed role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { username: 'admin', role: 'admin' };
    requireRole('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 for disallowed role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { username: 'user', role: 'tecnico' };
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 403 when user has no role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { username: 'anon' };
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
