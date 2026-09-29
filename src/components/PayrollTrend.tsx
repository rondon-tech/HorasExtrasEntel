import React from 'react';
import { useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiClient } from '../api/client';
import { queryKeys } from '../hooks/useApi';
import { formatCLP, abbreviateCLP } from '../utils/format';

interface PayrollTrendProps {
  currentMonth: Date;
  currentLiquido: number;
  /** Si es true, los montos se muestran enmascarados (privacidad). */
  maskAmounts?: boolean;
}

/**
 * Mini-gráfico de barras del líquido a pagar (rango 3/6/12 meses).
 * Solo se muestra cuando TODOS los valores llegaron bien (nunca parciales).
 */
const PayrollTrend: React.FC<PayrollTrendProps> = ({ currentMonth, currentLiquido, maskAmounts = false }) => {
  const [historyRange, setHistoryRange] = React.useState<3 | 6 | 12>(3);

  const historyMonths = Array.from({ length: historyRange }, (_, i) => {
    const back = historyRange - 1 - i;
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - back, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, date: d };
  });
  const historyQueries = useQueries({
    queries: historyMonths.slice(0, -1).map((m) => ({
      queryKey: queryKeys.payroll(m.year, m.month),
      queryFn: () => apiClient.get(`/payroll/${m.year}/${m.month}`).then((r) => r.data),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const historyValues = [
    ...historyQueries.map((q) => q.data?.liquidoAPagar),
    currentLiquido,
  ];
  if (!historyValues.every((v) => typeof v === 'number')) return null;

  const values = historyValues as number[];
  const historyMax = Math.max(...values, 1);
  const history = historyMonths.map((m, i) => ({
    ...m,
    value: values[i] ?? 0,
    label: format(m.date, 'MMM', { locale: es }).replace('.', '').slice(0, 3),
    isCurrent: i === historyMonths.length - 1,
  }));

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
      <div className="flex-between mb-2">
        <p className="text-xs text-secondary uppercase font-bold tracking-wider m-0">Tendencia</p>
        <select
          className="form-control text-sm"
          value={historyRange}
          onChange={(e) => setHistoryRange(Number(e.target.value) as 3 | 6 | 12)}
          aria-label="Rango del gráfico"
          style={{ padding: '0.3rem 0.5rem', width: 'auto' }}
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
        </select>
      </div>
      <div
        role="img"
        aria-label={maskAmounts
          ? `Tendencia de líquido a pagar últimos ${historyRange} meses (montos ocultos)`
          : `Líquido a pagar últimos ${historyRange} meses: ${history.map((h) => `${h.label} ${formatCLP(h.value)}`).join(', ')}`}
        style={{ display: 'flex', alignItems: 'flex-end', gap: historyRange > 6 ? '0.35rem' : '0.75rem', height: '104px' }}
      >
        {history.map((h) => (
          <div key={`${h.year}-${h.month}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', height: '100%', minWidth: 0 }} title={maskAmounts ? `${h.label} ${h.year}` : `${h.label} ${h.year}: ${formatCLP(h.value)}`}>
            <span className="text-xs font-bold" style={{ color: h.isCurrent ? 'var(--accent-blue)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {maskAmounts ? '•••' : abbreviateCLP(h.value)}
            </span>
            <div style={{
              width: '100%',
              maxWidth: '56px',
              height: `${Math.max(8, (h.value / historyMax) * 100)}%`,
              maxHeight: '56px',
              background: h.isCurrent ? 'var(--accent-blue)' : 'rgba(148,163,184,0.35)',
              borderRadius: '6px',
            }} />
            <span className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PayrollTrend;
