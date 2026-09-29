/**
 * API integration test — boots the real Express app (api/index.js) with a
 * mocked DB pool and exercises the main routes over HTTP (supertest).
 *
 * DB is mocked as DOWN, so this suite proves:
 * - the app boots and mounts all routers without a database,
 * - auth is enforced on protected routes,
 * - input validation runs before controllers,
 * - failures return generic errors (no stack / detail leaks).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Env must be set before importing the app (getConfig() runs at module load).
process.env.VERCEL = '1'; // prevents app.listen()
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-route-tests-32c';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/testdb';
process.env.ADMIN_USER = 'admin';
process.env.ADMIN_PASSWORD = 'test-admin-password-123';

vi.mock('../../server/config/db.js', () => ({
  pool: {
    query: async () => {
      throw new Error('db down (mocked)');
    },
    on: () => {},
    end: async () => {},
  },
}));

import request from 'supertest';
import jwt from 'jsonwebtoken';

let app;
beforeAll(async () => {
  ({ default: app } = await import('../index.js'));
});

function userToken(overrides = {}) {
  return jwt.sign(
    { id: 'uid-1', username: 'tester', role: 'user', passwordChangeRequired: false, ...overrides },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
}

describe('API routes (DB down)', () => {
  it('GET /api/health returns 503 unhealthy (no internals leaked)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('unhealthy');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('GET /api/records without token returns 401', async () => {
    const res = await request(app).get('/api/records');
    expect(res.status).toBe(401);
  });

  it('GET /api/expenses without token returns 401', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });

  it('GET /api/payroll/abcd/99 with token returns 400 (validation before controller)', async () => {
    const res = await request(app)
      .get('/api/payroll/abcd/99')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid year or month');
  });

  it('GET /api/payroll/2026/13 with token returns 400', async () => {
    const res = await request(app)
      .get('/api/payroll/2026/13')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(400);
  });

  it('POST /api/login with DB down fails closed with 401 (no leak)', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'nobody', password: 'whatever123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
    expect(JSON.stringify(res.body)).not.toContain('db down');
    expect(res.body).not.toHaveProperty('stack');
  });

  it('GET /api/debug/db-check without token returns 401', async () => {
    const res = await request(app).get('/api/debug/db-check');
    expect(res.status).toBe(401);
  });

  it('POST /api/records ghost (00:00/00:00, 0 hrs) passes validation (DB error, not 400)', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({
        date: '2026-09-23',
        dayType: 'TAD',
        isFeriado: false,
        isContingencia: false,
        startTime: '00:00',
        endTime: '00:00',
        sitio: '-',
        numeroTarea: '-',
        tarea: 'Disposición TAD',
        extraHours: 0,
      });
    // DB mock rejects → 500 proves it got PAST validation (was 400 before).
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Error interno del servidor');
  });

  it('POST /api/records equal times with hours > 0 returns 400 with details', async () => {
    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${userToken()}`)
      .send({
        date: '2026-09-23',
        dayType: 'Normal',
        startTime: '08:00',
        endTime: '08:00',
        sitio: 'SA575',
        tarea: 'Mantenimiento Correctivo RAN',
        extraHours: 2,
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});
