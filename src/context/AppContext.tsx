import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  useParamsQuery,
  useRecordsQuery,
  useExpensesQuery,
  usePayrollQuery,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useUpdateParams,
} from '../hooks/useApi';

// --- Types (kept for backward compat) ---
export type DayType = 'Normal' | 'TAD' | 'TAD Apoyo';

export interface DailyRecord {
  id: string;
  date: string;
  dayType: DayType;
  isFeriado?: boolean;
  isContingencia?: boolean;
  startTime: string;
  endTime: string;
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
  description: string;
}

export interface MonthlyParams {
  baseSalary: number;
  gratificacion: number;
  incentivoProduccion: number;
  weeklyHours: number;
  tadRate: number;
  contingencyRate: number;
  viaticoRate: number;
  afpRate: number;
  saludRate: number;
  cesantiaRate: number;
  asignacionAlimentacion: number;
  desgasteHerramientas: number;
  cuotaSindicato: number;
  prestamo: number;
  otrosDescuentos: number;
}

interface AppContextType {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;

  records: DailyRecord[];
  expenses: ExpenseRecord[];
  params: MonthlyParams;
  isLoading: boolean;

  addRecord: (record: Omit<DailyRecord, 'id'>) => Promise<unknown>;
  editRecord: (id: string, record: Omit<DailyRecord, 'id'>) => Promise<unknown>;
  deleteRecord: (id: string) => Promise<unknown>;
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => Promise<unknown>;
  editExpense: (id: string, expense: Omit<ExpenseRecord, 'id'>) => Promise<unknown>;
  deleteExpense: (id: string) => Promise<unknown>;
  updateParams: (params: MonthlyParams) => Promise<unknown>;

  totalExtraHoursThisMonth: number;
  extraHourRate: number;
  totalExtraPayThisMonth: number;
  totalExpensesThisMonth: number;
  tadDaysThisMonth: number;
  contingencyDaysThisMonth: number;
  diasCompensatoriosGanados: number;
  bonoCompensatorio: number;
  pureTadDays: number;
  apoyoTadDays: number;
  totalSueldoBase: number;
  totalHaberesImponibles: number;
  totalDescuentosLegales: number;
  baseTributable: number;
  impuestoUnico: number;
  totalHaberesExentos: number;
  totalDescuentosVarios: number;
  liquidoAPagar: number;
  montoAFP: number;
  montoSalud: number;
  montoCesantia: number;
}

const defaultParams: MonthlyParams = {
  baseSalary: 639908,
  gratificacion: 213354,
  incentivoProduccion: 203192,
  weeklyHours: 44,
  tadRate: 9800,
  contingencyRate: 9800,
  viaticoRate: 9800,
  afpRate: 11.27,
  saludRate: 7.0,
  cesantiaRate: 0.6,
  asignacionAlimentacion: 63765 + 17004 + 10632,
  desgasteHerramientas: 20000,
  cuotaSindicato: 6392,
  prestamo: 10000,
  otrosDescuentos: 0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // React Query hooks — disabled when not authenticated
  const paramsQuery = useParamsQuery(isAuthenticated);
  const recordsQuery = useRecordsQuery(isAuthenticated);
  const expensesQuery = useExpensesQuery(isAuthenticated);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;
  const payrollQuery = usePayrollQuery(year, month, isAuthenticated);

  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();
  const removeRecord = useDeleteRecord();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const removeExpense = useDeleteExpense();
  const updateParamsMutation = useUpdateParams();

  // Mapper adapters: keep backward-compatible signature with callbacks
  const addRecord = (record: Omit<DailyRecord, 'id'>) => createRecord.mutateAsync(record);
  const editRecord = (id: string, record: Omit<DailyRecord, 'id'>) => updateRecord.mutateAsync({ id, ...record });
  const deleteRecord = (id: string) => removeRecord.mutateAsync(id);
  const addExpense = (expense: Omit<ExpenseRecord, 'id'>) => createExpense.mutateAsync(expense);
  const editExpense = (id: string, expense: Omit<ExpenseRecord, 'id'>) => updateExpense.mutateAsync({ id, ...expense });
  const deleteExpense = (id: string) => removeExpense.mutateAsync(id);
  const updateParams = (params: MonthlyParams) => updateParamsMutation.mutateAsync(params);

  // When not authenticated, don't run queries and use defaults
  const records: DailyRecord[] = isAuthenticated ? (recordsQuery.data ?? []) : [];
  const expenses: ExpenseRecord[] = isAuthenticated ? (expensesQuery.data ?? []) : [];
  const params: MonthlyParams = isAuthenticated ? (paramsQuery.data ?? defaultParams) : defaultParams;

  const isLoading = isAuthenticated && (
    recordsQuery.isLoading ||
    expensesQuery.isLoading ||
    paramsQuery.isLoading
  );

  const p = (isAuthenticated ? payrollQuery.data : {}) || {};

  const value = useMemo<AppContextType>(() => ({
    currentMonth,
    setCurrentMonth,
    records,
    expenses,
    params,
    addRecord,
    editRecord,
    deleteRecord,
    addExpense,
    editExpense,
    deleteExpense,
    updateParams,
    isLoading,
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
    montoCesantia: p.montoCesantia || 0,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentMonth, records, expenses, params, p]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
