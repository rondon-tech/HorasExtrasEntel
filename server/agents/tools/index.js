import { tool } from 'ai';
import { z } from 'zod';
import { recordRepository } from '../../repositories/record.repository.js';
import { expenseRepository } from '../../repositories/expense.repository.js';
import { paramsRepository } from '../../repositories/params.repository.js';
import { calculatePayroll } from '../../services/payroll.service.js';

const monthArgs = {
  year: z.number().int().min(2000).max(2100).describe('Año (ej: 2026)'),
  month: z.number().int().min(1).max(12).describe('Mes (1-12)'),
};

const sumExtraHours = (records) =>
  records.reduce((acc, r) => acc + Number(r.extra_hours || 0), 0);

export function createUserTools(userId) {
  return {
    getMyPayroll: tool({
      description:
        'Obtiene la liquidación de sueldo calculada del usuario para un mes: sueldo base, horas extras, bonos TAD/Contingencia, viáticos, descuentos legales (AFP, salud, cesantía), impuesto único y líquido a pagar.',
      inputSchema: z.object(monthArgs),
      execute: async ({ year, month }) => {
        const [records, expenses, params] = await Promise.all([
          recordRepository.findByMonth(userId, year, month),
          expenseRepository.findByMonth(userId, year, month),
          paramsRepository.findFirstRaw(userId),
        ]);
        if (!params) return { error: 'El usuario aún no tiene parámetros de liquidación configurados.' };
        return { mes: `${year}-${String(month).padStart(2, '0')}`, ...calculatePayroll(records, expenses, params) };
      },
    }),

    getMyRecords: tool({
      description:
        'Lista los registros diarios del usuario en un mes: fecha, tipo de día, horas extras, sitio, tarea y horario de turno.',
      inputSchema: z.object(monthArgs),
      execute: async ({ year, month }) => {
        const records = await recordRepository.findByMonth(userId, year, month);
        return {
          totalRegistros: records.length,
          totalHorasExtras: sumExtraHours(records),
          registros: records.map((r) => ({
            fecha: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date,
            tipoDia: r.day_type,
            esFeriado: Boolean(r.is_feriado),
            esContingencia: Boolean(r.is_contingencia),
            inicio: String(r.start_time ?? '').slice(0, 5),
            fin: String(r.end_time ?? '').slice(0, 5),
            horasExtras: Number(r.extra_hours || 0),
            sitio: r.sitio,
            tarea: r.tarea,
          })),
        };
      },
    }),

    getMyExpenses: tool({
      description: 'Lista los gastos (viáticos) registrados por el usuario en un mes, con su mnemónico y descripción.',
      inputSchema: z.object(monthArgs),
      execute: async ({ year, month }) => {
        const expenses = await expenseRepository.findByMonth(userId, year, month);
        return {
          totalGastos: expenses.length,
          gastos: expenses.map((e) => ({
            fecha: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : e.date,
            nemonico: e.nemonico,
            descripcion: e.description,
          })),
        };
      },
    }),

    getMyParams: tool({
      description:
        'Obtiene los parámetros de liquidación configurados por el usuario: sueldo base, gratificación, incentivo, bonos, tasas de AFP/salud/cesantía y descuentos varios.',
      inputSchema: z.object({}),
      execute: async () => {
        const params = await paramsRepository.findByUserId(userId);
        if (!params) return { error: 'El usuario aún no tiene parámetros configurados.' };
        return params;
      },
    }),
  };
}
