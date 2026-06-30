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
  numeroTarea: string;
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
  otrosDescuentos: number;
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
  pureTadDays: number;
  apoyoTadDays: number;
  
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
  otrosDescuentos: 0
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
  const [state, setState] = useState<AppState>(initialState);

  // Fetch initial data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [paramsRes, recordsRes, expensesRes] = await Promise.all([
          fetch('/api/params'),
          fetch('/api/records'),
          fetch('/api/expenses')
        ]);
        
        if (paramsRes.ok && recordsRes.ok && expensesRes.ok) {
          const params = await paramsRes.json();
          const records = await recordsRes.json();
          const expenses = await expensesRes.json();
          
          setState(s => ({
            ...s,
            params,
            records,
            expenses
          }));
        }
      } catch (err) {
        console.error('Error fetching data from API:', err);
      }
    };
    fetchData();
  }, []);

  const setCurrentMonth = (date: Date) => setState(s => ({ ...s, currentMonth: date }));
  
  const addRecord = async (record: Omit<DailyRecord, 'id'>) => {
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        const { id } = await res.json();
        setState(s => ({ ...s, records: [{ ...record, id }, ...s.records] }));
      }
    } catch (e) { console.error(e); }
  };
  
  const editRecord = async (id: string, record: Omit<DailyRecord, 'id'>) => {
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        setState(s => ({
          ...s,
          records: s.records.map(r => r.id === id ? { ...record, id } : r)
        }));
      }
    } catch (e) { console.error(e); }
  };
  
  const deleteRecord = async (id: string) => {
    try {
      await fetch(`/api/records/${id}`, { method: 'DELETE' });
      setState(s => ({ ...s, records: s.records.filter(r => r.id !== id) }));
    } catch (e) { console.error(e); }
  };
  
  const addExpense = async (expense: Omit<ExpenseRecord, 'id'>) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (res.ok) {
        const { id } = await res.json();
        setState(s => ({ ...s, expenses: [{ ...expense, id }, ...s.expenses] }));
      }
    } catch (e) { console.error(e); }
  };
  
  const editExpense = async (id: string, expense: Omit<ExpenseRecord, 'id'>) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense)
      });
      if (res.ok) {
        setState(s => ({
          ...s,
          expenses: s.expenses.map(e => e.id === id ? { ...expense, id } : e)
        }));
      }
    } catch (e) { console.error(e); }
  };
  
  const deleteExpense = async (id: string) => {
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
    } catch (e) { console.error(e); }
  };

  const updateParams = async (params: MonthlyParams) => {
    try {
      await fetch('/api/params', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      setState(s => ({ ...s, params }));
    } catch (e) { console.error(e); }
  };

  // Computations
  const start = startOfMonth(state.currentMonth);
  const end = endOfMonth(state.currentMonth);

  const thisMonthRecords = state.records.filter(r => isWithinInterval(parseISO(r.date), { start, end }));
  const thisMonthExpenses = state.expenses.filter(e => isWithinInterval(parseISO(e.date), { start, end }));

  // A. Sueldo Base (Agrupado)
  const totalSueldoBase = state.params.baseSalary + state.params.gratificacion + state.params.incentivoProduccion;

  // D. Cálculo de Horas Extras según Código de Trabajo (y liquidación Entel)
  // La liquidación de Entel usa: (Sueldo Base + Incentivo de Producción) / 120
  // Lo cual equivale matemáticamente a una jornada de 42 horas exactas.
  const baseParaHorasExtras = state.params.baseSalary + state.params.incentivoProduccion;
  const extraHourRate = baseParaHorasExtras / 120;
  const totalExtraHoursThisMonth = thisMonthRecords.reduce((acc, r) => acc + r.extraHours, 0);
  const totalExtraPayThisMonth = Math.round(totalExtraHoursThisMonth * extraHourRate);

  // B. Bono de Gestión (Corresponde a los Viáticos del mes)
  // Como cada registro de viático tiene un valor fijo, se multiplica la cantidad de viáticos por la tarifa.
  const totalExpensesThisMonth = thisMonthExpenses.length * state.params.viaticoRate;

  // C. Bono Compensatorio (Bono TAD + Bono Contingencia)
  // Utilizamos Set para extraer fechas únicas. Así, si hay 3 registros en 1 día TAD, solo se paga 1 bono.
  const uniquePureTADDates = new Set(thisMonthRecords.filter(r => r.dayType === 'TAD').map(r => r.date));
  const uniqueApoyoTADDates = new Set(thisMonthRecords.filter(r => r.dayType === 'TAD Apoyo').map(r => r.date));
  const uniqueContingenciaDates = new Set(thisMonthRecords.filter(r => r.isContingencia).map(r => r.date));
  
  const pureTadDays = uniquePureTADDates.size;
  const apoyoTadDays = uniqueApoyoTADDates.size;
  const tadDaysThisMonth = pureTadDays + apoyoTadDays;
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
  const totalDescuentosVarios = state.params.cuotaSindicato + state.params.prestamo + state.params.otrosDescuentos;

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
    pureTadDays,
    apoyoTadDays,
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
