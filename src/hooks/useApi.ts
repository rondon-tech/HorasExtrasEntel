import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

// ---------------------------------------------------------------------------
// Query keys (centralised so cache invalidation is reliable)
// ---------------------------------------------------------------------------

export const queryKeys = {
  params: ['params'] as const,
  records: ['records'] as const,
  expenses: ['expenses'] as const,
  payroll: (year: number, month: number) => ['payroll', year, month] as const,
};

// ---------------------------------------------------------------------------
// Queries (read)
// ---------------------------------------------------------------------------

export function useParamsQuery() {
  return useQuery({
    queryKey: queryKeys.params,
    queryFn: () => apiClient.get('/params').then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

export function useRecordsQuery() {
  return useQuery({
    queryKey: queryKeys.records,
    queryFn: () => apiClient.get('/records').then(r => r.data.data ?? r.data),
    staleTime: 30 * 1000,
  });
}

export function useExpensesQuery() {
  return useQuery({
    queryKey: queryKeys.expenses,
    queryFn: () => apiClient.get('/expenses').then(r => r.data),
    staleTime: 30 * 1000,
  });
}

export function usePayrollQuery(year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.payroll(year, month),
    queryFn: () => apiClient.get(`/payroll/${year}/${month}`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
    enabled: !!year && !!month,
  });
}

// ---------------------------------------------------------------------------
// Mutations (create / update / delete)
// ---------------------------------------------------------------------------

export function useCreateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/records', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.records });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useUpdateRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiClient.put(`/records/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.records });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/records/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.records });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/expenses', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiClient.put(`/expenses/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}

export function useUpdateParams() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.put('/params', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.params });
      qc.invalidateQueries({ queryKey: ['payroll'] });
    },
  });
}
