import { recordRepository } from '../repositories/record.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { paramsRepository } from '../repositories/params.repository.js';
import { calculatePayroll } from '../services/payroll.service.js';

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

export function clearSnapshotCache() {
  cache.clear();
}

export async function getMonthSnapshot(userId) {
  const now = new Date();
  const key = `${userId}:${now.getFullYear()}-${now.getMonth() + 1}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const [records, expenses, params] = await Promise.all([
    recordRepository.findByMonth(userId, now.getFullYear(), now.getMonth() + 1),
    expenseRepository.findByMonth(userId, now.getFullYear(), now.getMonth() + 1),
    paramsRepository.findFirstRaw(userId),
  ]);

  let data;
  if (!params) {
    data = { mes: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, disponible: false };
  } else {
    const payroll = calculatePayroll(records, expenses, params);
    data = {
      mes: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      disponible: true,
      liquidacion: {
        horasExtras: payroll.totalExtraHoursThisMonth,
        valorHoraExtra: payroll.extraHourRate,
        pagoHorasExtras: payroll.totalExtraPayThisMonth,
        diasTAD: payroll.tadDaysThisMonth,
        diasContingencia: payroll.contingencyDaysThisMonth,
        diasFeriado: payroll.diasCompensatoriosGanados,
        sueldoBase: payroll.totalSueldoBase,
        bonoCompensatorio: payroll.bonoCompensatorio,
        viaticos: payroll.totalExpensesThisMonth,
        haberesImponibles: payroll.totalHaberesImponibles,
        montoAFP: payroll.montoAFP,
        montoSalud: payroll.montoSalud,
        montoCesantia: payroll.montoCesantia,
        descuentosLegales: payroll.totalDescuentosLegales,
        impuestoUnico: payroll.impuestoUnico,
        haberesExentos: payroll.totalHaberesExentos,
        descuentosVarios: payroll.totalDescuentosVarios,
        liquidoAPagar: payroll.liquidoAPagar,
      },
      registros: records.length,
      gastos: expenses.length,
    };
  }

  cache.set(key, { at: Date.now(), data });
  return data;
}
