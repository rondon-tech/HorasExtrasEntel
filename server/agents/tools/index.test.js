import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db.js', () => {
  const mockQuery = vi.fn();
  return {
    pool: { query: mockQuery, on: vi.fn() },
    __mockQuery: mockQuery,
  };
});

const { __mockQuery: query } = await import('../../config/db.js');
const { createUserTools } = await import('./index.js');

const USER_ID = '00000000-0000-0000-0000-000000000009';

const RAW_PARAMS = {
  sueldo_base: '639908', gratificacion: '213354', incentivo_produccion: '203192',
  horas_jornada: '44', bono_tad: '9800', bono_contingencia: '9800', viatico_rate: '9800',
  afp_rate: '11.27', salud_rate: '7.00', cesantia_rate: '0.60',
  asignacion_alimentacion: '91401', desgaste_herramientas: '20000',
  cuota_sindicato: '6392', prestamo: '10000', otros_descuentos: '0',
};

const RAW_RECORD = {
  id: 'r1', date: new Date('2026-07-15'), day_type: 'TAD',
  is_feriado: false, is_contingencia: false,
  start_time: '18:00:00', end_time: '22:00:00',
  sitio: 'Nagarone', numero_tarea: 'T1', tarea: 'Fibra', extra_hours: '4.0',
  user_id: USER_ID,
};

describe('agent tools (read-only)', () => {
  beforeEach(() => {
    query.mockReset();
  });

  it('getMyPayroll computes payroll from month data scoped to user', async () => {
    query.mockResolvedValueOnce({ rows: [RAW_RECORD] });
    query.mockResolvedValueOnce({ rows: [{ id: 'e1', date: new Date('2026-07-16'), nemonico: 'VIA', description: 'Colación' }] });
    query.mockResolvedValueOnce({ rows: [RAW_PARAMS] });

    const tools = createUserTools(USER_ID);
    const result = await tools.getMyPayroll.execute({ year: 2026, month: 7 });

    expect(result.error).toBeUndefined();
    expect(result.mes).toBe('2026-07');
    expect(result.totalExtraHoursThisMonth).toBe(4);
    expect(result.liquidoAPagar).toBeGreaterThan(0);
    expect(query.mock.calls[0][1]).toEqual([USER_ID, 2026, 7]);
  });

  it('getMyPayroll reports missing params instead of throwing', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [] });

    const tools = createUserTools(USER_ID);
    const result = await tools.getMyPayroll.execute({ year: 2026, month: 7 });
    expect(result.error).toContain('parámetros');
  });

  it('getMyRecords maps raw rows to compact DTOs', async () => {
    query.mockResolvedValueOnce({ rows: [RAW_RECORD] });

    const tools = createUserTools(USER_ID);
    const result = await tools.getMyRecords.execute({ year: 2026, month: 7 });

    expect(result.totalRegistros).toBe(1);
    expect(result.totalHorasExtras).toBe(4);
    expect(result.registros[0]).toMatchObject({
      fecha: '2026-07-15', tipoDia: 'TAD', horasExtras: 4, inicio: '18:00', fin: '22:00',
    });
  });

  it('getMyExpenses returns compact expense list', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'e1', date: new Date('2026-07-16'), nemonico: 'VIA', description: 'Colación' }] });

    const tools = createUserTools(USER_ID);
    const result = await tools.getMyExpenses.execute({ year: 2026, month: 7 });

    expect(result.totalGastos).toBe(1);
    expect(result.gastos[0]).toMatchObject({ nemonico: 'VIA', descripcion: 'Colación' });
  });

  it('getMyParams returns DTO', async () => {
    query.mockResolvedValueOnce({ rows: [RAW_PARAMS] });

    const tools = createUserTools(USER_ID);
    const result = await tools.getMyParams.execute({});

    expect(result.baseSalary).toBe(639908);
    expect(result.afpRate).toBeCloseTo(11.27);
  });
});
