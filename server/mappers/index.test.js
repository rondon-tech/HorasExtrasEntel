import { describe, it, expect } from 'vitest';
import { toRecordDTO, toExpenseDTO, toParamsDTO, recordRequestToDb, expenseRequestToDb, paramsUpdateToDb } from './index.js';

describe('DTO Mappers', () => {
  describe('toRecordDTO', () => {
    it('should map a database row to camelCase DTO', () => {
      const row = {
        id: 'abc-123',
        date: new Date('2026-07-15'),
        day_type: 'TAD',
        is_feriado: true,
        is_contingencia: false,
        start_time: '18:00:00',
        end_time: '22:30:00',
        sitio: 'Florida 1',
        numero_tarea: 'T-001',
        tarea: 'Mantenimiento Correctivo RAN',
        extra_hours: '4.50',
      };
      const dto = toRecordDTO(row);
      expect(dto.id).toBe('abc-123');
      expect(dto.date).toBe('2026-07-15');
      expect(dto.dayType).toBe('TAD');
      expect(dto.isFeriado).toBe(true);
      expect(dto.isContingencia).toBe(false);
      expect(dto.startTime).toBe('18:00');
      expect(dto.endTime).toBe('22:30');
      expect(dto.sitio).toBe('Florida 1');
      expect(dto.numeroTarea).toBe('T-001');
      expect(dto.tarea).toBe('Mantenimiento Correctivo RAN');
      expect(dto.extraHours).toBe(4.5);
    });

    it('should handle missing numero_tarea', () => {
      const row = {
        id: 'abc', date: new Date('2026-07-15'), day_type: 'Normal',
        is_feriado: false, is_contingencia: false,
        start_time: '08:00:00', end_time: '17:00:00',
        sitio: 'Test', numero_tarea: '', tarea: 'Test',
        extra_hours: '0',
      };
      const dto = toRecordDTO(row);
      expect(dto.numeroTarea).toBe('');
    });
  });

  describe('recordRequestToDb', () => {
    it('should return ordered array of values for INSERT', () => {
      const body = {
        date: '2026-07-15', dayType: 'Normal', isFeriado: false, isContingencia: false,
        startTime: '08:00', endTime: '17:00', sitio: 'Test', numeroTarea: 'T1',
        tarea: 'Test', extraHours: 0,
      };
      const values = recordRequestToDb(body);
      expect(values).toEqual(['2026-07-15', 'Normal', false, false, '08:00', '17:00', 'Test', 'T1', 'Test', 0]);
    });
  });

  describe('toExpenseDTO', () => {
    it('should map expense row to DTO', () => {
      const row = { id: 'e1', date: new Date('2026-07-01'), nemonico: 'SA575', description: 'Viatico test' };
      const dto = toExpenseDTO(row);
      expect(dto.id).toBe('e1');
      expect(dto.date).toBe('2026-07-01');
      expect(dto.nemonico).toBe('SA575');
      expect(dto.description).toBe('Viatico test');
    });
  });

  describe('expenseRequestToDb', () => {
    it('should return [date, nemonico, description]', () => {
      expect(expenseRequestToDb({ date: '2026-07-01', nemonico: 'FN699', description: 'X' }))
        .toEqual(['2026-07-01', 'FN699', 'X']);
    });
  });

  describe('toParamsDTO', () => {
    it('should map params row with defaults for missing fields', () => {
      const row = {
        sueldo_base: 639908, gratificacion: 213354, incentivo_produccion: 203192,
        horas_jornada: 44, bono_tad: 9800, bono_contingencia: 9800,
        viatico_rate: 9800, afp_rate: '11.27', salud_rate: '7.00', cesantia_rate: '0.60',
        impuesto_rate: '0.00', otros_descuentos: 555,
      };
      const dto = toParamsDTO(row);
      expect(dto.baseSalary).toBe(639908);
      expect(dto.afpRate).toBe(11.27);
      expect(dto.otrosDescuentos).toBe(555);
      expect(dto.asignacionAlimentacion).toBe(91401); // default
      expect(dto.desgasteHerramientas).toBe(20000);    // default
    });
  });

  describe('paramsUpdateToDb', () => {
    it('should return 15-element array in column order', () => {
      const values = paramsUpdateToDb({
        baseSalary: 1, gratificacion: 2, incentivoProduccion: 3, weeklyHours: 4,
        tadRate: 5, contingencyRate: 6, viaticoRate: 7,
        afpRate: 8, saludRate: 9, cesantiaRate: 10,
        asignacionAlimentacion: 11, desgasteHerramientas: 12,
        cuotaSindicato: 13, prestamo: 14, otrosDescuentos: 15,
      });
      expect(values).toHaveLength(15);
      expect(values[0]).toBe(1);
      expect(values[14]).toBe(15);
    });
  });
});
