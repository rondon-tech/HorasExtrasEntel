import { describe, it, expect, vi } from 'vitest';
import { recordRepository } from '../repositories/record.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { paramsRepository } from '../repositories/params.repository.js';

const USER_ID = '00000000-0000-0000-0000-000000000001';

// Mock the shared database pool
vi.mock('../config/db.js', () => {
  const mockQuery = vi.fn();
  return {
    pool: {
      query: mockQuery,
      on: vi.fn(),
    },
    __mockQuery: mockQuery,
  };
});

const { __mockQuery: query } = await import('../config/db.js');

describe('Record Repository', () => {
  it('should fetch all records and map to DTOs', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'r1', date: new Date('2026-07-15'), day_type: 'Normal',
        is_feriado: false, is_contingencia: false,
        start_time: '18:00:00', end_time: '22:00:00',
        sitio: 'Site A', numero_tarea: 'T1', tarea: 'Test', extra_hours: '4.0',
        user_id: USER_ID,
      }],
    });

    const records = await recordRepository.findAll(USER_ID);
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('r1');
    expect(records[0].extraHours).toBe(4.0);
    expect(records[0].startTime).toBe('18:00');
  });

  it('should create a record and return the id', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'new-id' }] });
    const id = await recordRepository.create(USER_ID, {
      date: '2026-07-15', dayType: 'Normal', isFeriado: false, isContingencia: false,
      startTime: '08:00', endTime: '17:00', sitio: 'X', numeroTarea: 'T2',
      tarea: 'Test', extraHours: 0,
    });
    expect(id).toBe('new-id');
  });

  it('should delete a record scoped to user', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    await expect(recordRepository.remove(USER_ID, 'r1')).resolves.toBeUndefined();
  });

  it('should count total records for a user', async () => {
    query.mockResolvedValueOnce({ rows: [{ total: 42 }] });
    const total = await recordRepository.countTotal(USER_ID);
    expect(total).toBe(42);
  });
});

describe('Expense Repository', () => {
  it('should fetch expenses mapped to DTOs', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'e1', date: new Date('2026-07-01'), nemonico: 'SA575', description: 'Test' }],
    });
    const expenses = await expenseRepository.findAll(USER_ID);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].nemonico).toBe('SA575');
  });

  it('should create an expense', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'e2' }] });
    const id = await expenseRepository.create(USER_ID, { date: '2026-07-01', nemonico: 'FN699', description: 'X' });
    expect(id).toBe('e2');
  });
});

describe('Params Repository', () => {
  it('should fetch and map params for a user', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        sueldo_base: 639908, gratificacion: 213354, incentivo_produccion: 203192,
        horas_jornada: 44, bono_tad: 9800, bono_contingencia: 9800, viatico_rate: 9800,
        afp_rate: '11.27', salud_rate: '7.0', cesantia_rate: '0.60',
        otros_descuentos: 0,
      }],
    });
    const params = await paramsRepository.findByUserId(USER_ID);
    expect(params?.baseSalary).toBe(639908);
    expect(params?.afpRate).toBe(11.27);
  });

  it('should return null when no params row exists for user', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const params = await paramsRepository.findByUserId(USER_ID);
    expect(params).toBeNull();
  });

  it('should update params for a user', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    await expect(paramsRepository.update(USER_ID, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]))
      .resolves.toBeUndefined();
  });

  it('should create default params for a new user', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'new-params-id' }] });
    await expect(paramsRepository.createDefault(USER_ID)).resolves.toBeUndefined();
  });
});
