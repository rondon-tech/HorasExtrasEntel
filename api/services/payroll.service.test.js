import { describe, it, expect } from 'vitest';
import { calculatePayroll } from './payroll.service.js';

describe('Payroll Service Engine', () => {
  const defaultParams = {
    sueldo_base: 639908,
    gratificacion: 213354,
    incentivo_produccion: 203192,
    bono_tad: 9800,
    bono_contingencia: 9800,
    viatico_rate: 9800,
    afp_rate: 11.27,
    salud_rate: 7.0,
    cesantia_rate: 0.6,
    asignacion_alimentacion: 91401,
    desgaste_herramientas: 20000,
    cuota_sindicato: 6392,
    prestamo: 10000,
    otros_descuentos: 0
  };

  it('should calculate base salary and haberes exponibles correctly for a month without extras', () => {
    const result = calculatePayroll([], [], defaultParams);
    
    // Sueldo Base = 639908 + 213354 + 203192 = 1056454
    expect(result.totalSueldoBase).toBe(1056454);
    expect(result.totalHaberesImponibles).toBe(1056454);
    expect(result.totalExtraPayThisMonth).toBe(0);
    expect(result.totalExpensesThisMonth).toBe(0);
  });

  it('should calculate extra hours correctly according to Entel logic', () => {
    // base + incentivo = 639908 + 203192 = 843100
    // extraHourRate = 843100 / 120 = 7025.8333... -> rounded 7026
    
    const records = [
      { extra_hours: 2, day_type: 'Normal', is_contingencia: false, is_feriado: false, date: new Date('2026-07-01') },
      { extra_hours: 3.5, day_type: 'Normal', is_contingencia: false, is_feriado: false, date: new Date('2026-07-02') }
    ];
    
    const result = calculatePayroll(records, [], defaultParams);
    
    expect(result.totalExtraHoursThisMonth).toBe(5.5);
    // 5.5 * 7025.8333... = 38642.0833... -> 38642
    expect(result.totalExtraPayThisMonth).toBe(38642);
  });

  it('should calculate compensations and viaticos correctly', () => {
    const records = [
      { extra_hours: 0, day_type: 'TAD', is_contingencia: false, is_feriado: false, date: new Date('2026-07-01') },
      { extra_hours: 0, day_type: 'TAD Apoyo', is_contingencia: false, is_feriado: false, date: new Date('2026-07-02') },
      { extra_hours: 0, day_type: 'Normal', is_contingencia: true, is_feriado: false, date: new Date('2026-07-03') }
    ];
    const expenses = [
      { nemonico: 'V', description: 'Viatico 1', date: new Date('2026-07-01') },
      { nemonico: 'V', description: 'Viatico 2', date: new Date('2026-07-02') }
    ];
    
    const result = calculatePayroll(records, expenses, defaultParams);
    
    expect(result.tadDaysThisMonth).toBe(2);
    expect(result.contingencyDaysThisMonth).toBe(1);
    
    // Bono Compensatorio = (2 * 9800) + (1 * 9800) = 29400
    expect(result.bonoCompensatorio).toBe(29400);
    
    // Viaticos = 2 * 9800 = 19600
    expect(result.totalExpensesThisMonth).toBe(19600);
  });
});
