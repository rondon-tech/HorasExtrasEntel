import { Money } from '../utils/money.js';

export const calculatePayroll = (records, expenses, params) => {
  // A. Sueldo Base (Agrupado)
  const baseSalary = new Money(params.sueldo_base);
  const gratificacion = new Money(params.gratificacion);
  const incentivoProduccion = new Money(params.incentivo_produccion);
  
  const totalSueldoBase = baseSalary.add(gratificacion).add(incentivoProduccion);

  // D. Cálculo de Horas Extras según Código de Trabajo (y liquidación Entel)
  const baseParaHorasExtras = baseSalary.add(incentivoProduccion);
  // (base + incentivo) / 120 gives the hourly rate for extra hours
  const extraHourRate = Math.round(baseParaHorasExtras.amount / 120);
  
  const totalExtraHoursThisMonth = records.reduce((acc, r) => acc + Number(r.extra_hours), 0);
  const totalExtraPayThisMonth = new Money(Math.round(totalExtraHoursThisMonth * extraHourRate));

  // B. Bono de Gestión (Corresponde a los Viáticos del mes)
  const viaticoRate = new Money(params.viatico_rate);
  const totalExpensesThisMonth = viaticoRate.multiply(expenses.length);

  // C. Bono Compensatorio (Bono TAD + Bono Contingencia)
  const uniquePureTADDates = new Set(records.filter(r => r.day_type === 'TAD').map(r => r.date.toISOString().split('T')[0]));
  const uniqueApoyoTADDates = new Set(records.filter(r => r.day_type === 'TAD Apoyo').map(r => r.date.toISOString().split('T')[0]));
  const uniqueContingenciaDates = new Set(records.filter(r => r.is_contingencia).map(r => r.date.toISOString().split('T')[0]));
  
  const pureTadDays = uniquePureTADDates.size;
  const apoyoTadDays = uniqueApoyoTADDates.size;
  const tadDaysThisMonth = pureTadDays + apoyoTadDays;
  const contingencyDaysThisMonth = uniqueContingenciaDates.size;
  
  const tadRate = new Money(params.bono_tad);
  const contingencyRate = new Money(params.bono_contingencia);
  
  const bonoTAD = tadRate.multiply(tadDaysThisMonth);
  const bonoContingencia = contingencyRate.multiply(contingencyDaysThisMonth);
  
  const bonoCompensatorio = bonoTAD.add(bonoContingencia);

  const uniqueFeriadoDates = new Set(records.filter(r => r.is_feriado).map(r => r.date.toISOString().split('T')[0]));
  const diasCompensatoriosGanados = uniqueFeriadoDates.size;

  // 1. Haberes Imponibles
  const totalHaberesImponibles = totalSueldoBase
    .add(totalExtraPayThisMonth)
    .add(bonoCompensatorio)
    .add(totalExpensesThisMonth);

  // 2. Descuentos Legales
  // Using percentage rates (e.g., 11.27 / 100)
  const montoAFP = totalHaberesImponibles.multiply(Number(params.afp_rate) / 100);
  const montoSalud = totalHaberesImponibles.multiply(Number(params.salud_rate) / 100);
  const montoCesantia = totalHaberesImponibles.multiply(Number(params.cesantia_rate) / 100);
  
  const totalDescuentosLegales = montoAFP.add(montoSalud).add(montoCesantia);

  // 3. Tributable e Impuesto
  const baseTributable = totalHaberesImponibles.subtract(totalDescuentosLegales);
  let impuestoUnico = new Money(0);
  
  const bt = baseTributable.amount;
  if (bt > 862822 && bt <= 1917382) {
    impuestoUnico = baseTributable.multiply(0.04).subtract(new Money(34512));
  } else if (bt > 1917382 && bt <= 3195637) {
    impuestoUnico = baseTributable.multiply(0.08).subtract(new Money(111208));
  } else if (bt > 3195637) {
    impuestoUnico = baseTributable.multiply(0.135).subtract(new Money(286968));
  }
  
  if (impuestoUnico.amount < 0) impuestoUnico = new Money(0);

  // 4. Haberes Exentos y Descuentos Varios
  const totalHaberesExentos = new Money(params.asignacion_alimentacion || 0)
    .add(new Money(params.desgaste_herramientas || 0));
    
  const totalDescuentosVarios = new Money(params.cuota_sindicato || 0)
    .add(new Money(params.prestamo || 0))
    .add(new Money(params.otros_descuentos || 0));

  // 5. Liquido a Pagar
  const liquidoAPagar = totalHaberesImponibles
    .subtract(totalDescuentosLegales)
    .subtract(impuestoUnico)
    .add(totalHaberesExentos)
    .subtract(totalDescuentosVarios);

  return {
    totalSueldoBase: totalSueldoBase.amount,
    totalExtraHoursThisMonth,
    extraHourRate,
    totalExtraPayThisMonth: totalExtraPayThisMonth.amount,
    totalExpensesThisMonth: totalExpensesThisMonth.amount,
    tadDaysThisMonth,
    pureTadDays,
    apoyoTadDays,
    contingencyDaysThisMonth,
    diasCompensatoriosGanados,
    bonoCompensatorio: bonoCompensatorio.amount,
    totalHaberesImponibles: totalHaberesImponibles.amount,
    totalDescuentosLegales: totalDescuentosLegales.amount,
    baseTributable: baseTributable.amount,
    impuestoUnico: impuestoUnico.amount,
    totalHaberesExentos: totalHaberesExentos.amount,
    totalDescuentosVarios: totalDescuentosVarios.amount,
    liquidoAPagar: liquidoAPagar.amount,
    montoAFP: montoAFP.amount,
    montoSalud: montoSalud.amount,
    montoCesantia: montoCesantia.amount
  };
};
