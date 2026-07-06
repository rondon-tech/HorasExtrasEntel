import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

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
  payrollSummary: any; // Using any for brevity here, should be strictly typed later
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
  payrollSummary: {}
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// --- Provider Component ---
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<AppState>(initialState);

  // Fetch initial data from backend
  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;
      try {
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth() + 1; // JS months are 0-indexed, API expects 1-indexed

        const [paramsRes, recordsRes, expensesRes, payrollRes] = await Promise.all([
          apiClient.get('/params'),
          apiClient.get('/records'),
          apiClient.get('/expenses'),
          apiClient.get(`/payroll/${year}/${month}`)
        ]);
        
        setState(s => ({
          ...s,
          params: paramsRes.data,
          records: recordsRes.data,
          expenses: expensesRes.data,
          payrollSummary: payrollRes.data
        }));
      } catch (err) {
        console.error('Error fetching data from API:', err);
      }
    };
    fetchData();
  }, [isAuthenticated, state.currentMonth]);

  const setCurrentMonth = (date: Date) => setState(s => ({ ...s, currentMonth: date }));
  
  const addRecord = async (record: Omit<DailyRecord, 'id'>) => {
    try {
      const res = await apiClient.post('/records', record);
      const { id } = res.data;
      setState(s => ({ ...s, records: [{ ...record, id }, ...s.records] }));
    } catch (e) { console.error(e); }
  };
  
  const editRecord = async (id: string, record: Omit<DailyRecord, 'id'>) => {
    try {
      await apiClient.put(`/records/${id}`, record);
      setState(s => ({
        ...s,
        records: s.records.map(r => r.id === id ? { ...record, id } : r)
      }));
    } catch (e) { console.error(e); }
  };
  
  const deleteRecord = async (id: string) => {
    try {
      await apiClient.delete(`/records/${id}`);
      setState(s => ({ ...s, records: s.records.filter(r => r.id !== id) }));
    } catch (e) { console.error(e); }
  };
  
  const addExpense = async (expense: Omit<ExpenseRecord, 'id'>) => {
    try {
      const res = await apiClient.post('/expenses', expense);
      const { id } = res.data;
      setState(s => ({ ...s, expenses: [{ ...expense, id }, ...s.expenses] }));
    } catch (e) { console.error(e); }
  };
  
  const editExpense = async (id: string, expense: Omit<ExpenseRecord, 'id'>) => {
    try {
      await apiClient.put(`/expenses/${id}`, expense);
      setState(s => ({
        ...s,
        expenses: s.expenses.map(e => e.id === id ? { ...expense, id } : e)
      }));
    } catch (e) { console.error(e); }
  };
  
  const deleteExpense = async (id: string) => {
    try {
      await apiClient.delete(`/expenses/${id}`);
      setState(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }));
    } catch (e) { console.error(e); }
  };

  const updateParams = async (params: MonthlyParams) => {
    try {
      await apiClient.put('/params', params);
      setState(s => ({ ...s, params }));
    } catch (e) { console.error(e); }
  };

  // computations are now handled by the backend!
  const p = state.payrollSummary || {};

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
    totalExtraHoursThisMonth: p.totalExtraHoursThisMonth || 0,
    extraHourRate: p.extraHourRate || 0,
    totalExtraPayThisMonth: p.totalExtraPayThisMonth || 0,
    totalExpensesThisMonth: p.totalExpensesThisMonth || 0,
    tadDaysThisMonth: p.tadDaysThisMonth || 0,
    pureTadDays: p.pureTadDays || 0,
    apoyoTadDays: p.apoyoTadDays || 0,
    contingencyDaysThisMonth: p.contingencyDaysThisMonth || 0,
    diasCompensatoriosGanados: p.diasCompensatoriosGanados || 0,
    bonoCompensatorio: p.bonoCompensatorio || 0,
    totalSueldoBase: p.totalSueldoBase || 0,
    totalHaberesImponibles: p.totalHaberesImponibles || 0,
    totalDescuentosLegales: p.totalDescuentosLegales || 0,
    baseTributable: p.baseTributable || 0,
    impuestoUnico: p.impuestoUnico || 0,
    totalHaberesExentos: p.totalHaberesExentos || 0,
    totalDescuentosVarios: p.totalDescuentosVarios || 0,
    liquidoAPagar: p.liquidoAPagar || 0,
    montoAFP: p.montoAFP || 0,
    montoSalud: p.montoSalud || 0,
    montoCesantia: p.montoCesantia || 0
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
