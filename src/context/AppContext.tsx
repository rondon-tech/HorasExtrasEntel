import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

// --- Types ---
export type DayType = 'Normal' | 'TAD' | 'TAD Apoyo';

export interface DailyRecord {
  id: string;
  date: string;
  dayType: DayType;
  isFeriado?: boolean;
  isContingencia?: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  sitio: string;
  tarea: string;
  extraHours: number;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  nemonico: string;
  description: string; // Tarea
}

export interface MonthlyParams {
  baseSalary: number;
  gratificacion: number;
  incentivoProduccion: number;
  weeklyHours: number;
  tadRate: number; // Bono por día TAD ($9.800)
  contingencyRate: number; // Bono por Contingencia ($9.800)
  viaticoRate: number; // Monto por cada viático (Bono Gestión)
  afpRate: number;
  saludRate: number;
  cesantiaRate: number;
  asignacionAlimentacion: number;
  desgasteHerramientas: number;
  cuotaSindicato: number;
  prestamo: number;
}

export interface AppState {
  currentMonth: Date;
  records: DailyRecord[];
  expenses: ExpenseRecord[];
  params: MonthlyParams;
}

interface AppContextType extends AppState {
  setCurrentMonth: (date: Date) => void;
  addRecord: (record: Omit<DailyRecord, 'id'>) => void;
  editRecord: (id: string, record: Omit<DailyRecord, 'id'>) => void;
  deleteRecord: (id: string) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  editExpense: (id: string, expense: Omit<ExpenseRecord, 'id'>) => void;
  deleteExpense: (id: string) => void;
  updateParams: (params: MonthlyParams) => void;
  
  // Computed properties
  totalExtraHoursThisMonth: number;
  extraHourRate: number;
  totalExtraPayThisMonth: number;
  totalExpensesThisMonth: number; // Viáticos (Bono de Gestión)
  
  tadDaysThisMonth: number;
  contingencyDaysThisMonth: number;
  diasCompensatoriosGanados: number; // Días feriados/domingos trabajados únicos
  bonoCompensatorio: number; // TAD + Contingencia
  
  // Liquidacion specifics
  totalSueldoBase: number;
  totalHaberesImponibles: number;
  totalDescuentosLegales: number;
  baseTributable: number;
  impuestoUnico: number;
  totalHaberesExentos: number;
  totalDescuentosVarios: number;
  liquidoAPagar: number;
  
  // Detalle Descuentos Legales
  montoAFP: number;
  montoSalud: number;
  montoCesantia: number;
}

// --- Defaults ---
const defaultParams: MonthlyParams = {
  baseSalary: 639908,
  gratificacion: 213354,
  incentivoProduccion: 203192,
  weeklyHours: 44, // 44 o 45 hrs comunes en Chile
  tadRate: 9800, // Bono TAD
  contingencyRate: 9800, // Bono Contingencia
  viaticoRate: 9800, // Monto por viático
  afpRate: 11.27,
  saludRate: 7.0,
  cesantiaRate: 0.6,
  asignacionAlimentacion: 63765 + 17004 + 10632,
  desgasteHerramientas: 20000,
  cuotaSindicato: 6392,
  prestamo: 10000,
};

const initialState: AppState = {
  currentMonth: new Date(),
  records: [],
  expenses: [],
  params: defaultParams,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- Provider Component ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('entel_horas_extras_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      const mergedParams = { ...defaultParams, ...(parsed.params || {}) };
      return {
        ...parsed,
        currentMonth: new Date(),
        records: parsed.records || [],
        expenses: parsed.expenses || [],
        params: mergedParams,
      };
    }
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem('entel_horas_extras_data', JSON.stringify({
      records: state.records,
      expenses: state.expenses,
      params: state.params,
    }));
  }, [state.records, state.expenses, state.params]);

  const setCurrentMonth = (date: Date) => setState(s => ({ ...s, currentMonth: date }));
  
  // Notice we removed the "filter by date" on addRecord because the user might want multiple tasks per day.
  // We keep all records uniquely by their UUID.
  const addRecord = (record: Omit<DailyRecord, 'id'>) => {
    const newRecord = { ...record, id: crypto.randomUUID() };
    setState(s => ({ ...s, records: [...s.records, newRecord] }));
  };
  
  const editRecord = (id: string, record: Omit<DailyRecord, 'id'>) => {
    setState(s => ({
      ...s,
      records: s.records.map(r => r.id === id ? { ...record, id } : r)
    }));
  };
  
  const deleteRecord = (id: string) => setState(s => ({ ...s, records: s.records.filter(r => r.id !== id) }));
  
  const addExpense = (expense: Omit<ExpenseRecord, 'id'>) => {
    const newExpense = { ...expense, id: crypto.randomUUID() };
    setState(s => ({ ...s, expenses: [newExpense, ...s.expenses] }));
  };
  
  const editExpense = (id: string, expense: Omit<ExpenseRecord, 'id'>) => {
    setState(s => ({
      ...s,
      expenses: s.expenses.map(e => e.id === id ? { ...expense, id } : e)
    }));
  };
  
  const deleteExpense = (id: string) => setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
  const updateParams = (params: MonthlyParams) => setState(s => ({ ...s, params }));

  // Computations
  const start = startOfMonth(state.currentMonth);
  const end = endOfMonth(state.currentMonth);

  const thisMonthRecords = state.records.filter(r => isWithinInterval(parseISO(r.date), { start, end }));
  const thisMonthExpenses = state.expenses.filter(e => isWithinInterval(parseISO(e.date), { start, end }));

  // A. Sueldo Base (Agrupado)
  const totalSueldoBase = state.params.baseSalary + state.params.gratificacion + state.params.incentivoProduccion;

  // D. Cálculo de Horas Extras según Código de Trabajo
  const extraHourRate = (state.params.baseSalary / 30) * 28 / state.params.weeklyHours * 1.5;
  const totalExtraHoursThisMonth = thisMonthRecords.reduce((acc, r) => acc + r.extraHours, 0);
  const totalExtraPayThisMonth = Math.round(totalExtraHoursThisMonth * extraHourRate);

  // B. Bono de Gestión (Corresponde a los Viáticos del mes)
  // Como cada registro de viático tiene un valor fijo, se multiplica la cantidad de viáticos por la tarifa.
  const totalExpensesThisMonth = thisMonthExpenses.length * state.params.viaticoRate;

  // C. Bono Compensatorio (Bono TAD + Bono Contingencia)
  // Utilizamos Set para extraer fechas únicas. Así, si hay 3 registros en 1 día TAD, solo se paga 1 bono.
  const uniqueTADDates = new Set(thisMonthRecords.filter(r => r.dayType === 'TAD' || r.dayType === 'TAD Apoyo').map(r => r.date));
  const uniqueContingenciaDates = new Set(thisMonthRecords.filter(r => r.isContingencia).map(r => r.date));
  
  const tadDaysThisMonth = uniqueTADDates.size;
  const contingencyDaysThisMonth = uniqueContingenciaDates.size;
  
  const bonoTAD = tadDaysThisMonth * state.params.tadRate;
  const bonoContingencia = contingencyDaysThisMonth * state.params.contingencyRate;
  
  const bonoCompensatorio = bonoTAD + bonoContingencia;

  // Días compensatorios ganados (Feriados)
  const uniqueFeriadoDates = new Set(thisMonthRecords.filter(r => r.isFeriado).map(r => r.date));
  const diasCompensatoriosGanados = uniqueFeriadoDates.size;

  // 1. Haberes Imponibles
  const totalHaberesImponibles = 
    totalSueldoBase + 
    totalExtraPayThisMonth + 
    bonoCompensatorio + 
    totalExpensesThisMonth; 

  // 2. Descuentos Legales
  const montoAFP = Math.round((totalHaberesImponibles * state.params.afpRate) / 100);
  const montoSalud = Math.round((totalHaberesImponibles * state.params.saludRate) / 100);
  const montoCesantia = Math.round((totalHaberesImponibles * state.params.cesantiaRate) / 100);
  const totalDescuentosLegales = montoAFP + montoSalud + montoCesantia;

  // 3. Tributable e Impuesto
  const baseTributable = totalHaberesImponibles - totalDescuentosLegales;
  let impuestoUnico = 0;
  
  if (baseTributable > 862822 && baseTributable <= 1917382) {
    impuestoUnico = Math.round((baseTributable * 0.04) - 34512);
  } else if (baseTributable > 1917382 && baseTributable <= 3195637) {
    impuestoUnico = Math.round((baseTributable * 0.08) - 111208);
  } else if (baseTributable > 3195637) {
    impuestoUnico = Math.round((baseTributable * 0.135) - 286968);
  }
  if (impuestoUnico < 0) impuestoUnico = 0;

  // 4. Haberes Exentos y Descuentos Varios
  const totalHaberesExentos = state.params.asignacionAlimentacion + state.params.desgasteHerramientas;
  const totalDescuentosVarios = state.params.cuotaSindicato + state.params.prestamo;

  // 5. Liquido a Pagar
  const liquidoAPagar = totalHaberesImponibles - totalDescuentosLegales - impuestoUnico + totalHaberesExentos - totalDescuentosVarios;

  const value: AppContextType = {
    ...state,
    setCurrentMonth,
    addRecord,
    editRecord,
    deleteRecord,
    addExpense,
    editExpense,
    deleteExpense,
    updateParams,
    totalExtraHoursThisMonth,
    extraHourRate,
    totalExtraPayThisMonth,
    totalExpensesThisMonth,
    tadDaysThisMonth,
    contingencyDaysThisMonth,
    diasCompensatoriosGanados,
    bonoCompensatorio,
    totalSueldoBase,
    totalHaberesImponibles,
    totalDescuentosLegales,
    baseTributable,
    impuestoUnico,
    totalHaberesExentos,
    totalDescuentosVarios,
    liquidoAPagar,
    montoAFP,
    montoSalud,
    montoCesantia
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
