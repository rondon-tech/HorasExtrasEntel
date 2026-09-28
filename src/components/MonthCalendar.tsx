import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthCalendarProps {
  year: number;
  /** Mes 0-indexado (0 = enero), igual que Date. */
  month: number;
  /** Fechas 'YYYY-MM-DD' a resaltar. */
  marked: Set<string>;
  accent?: string;
  accentSoft?: string;
  /** Texto de leyenda, ej: "12 días TAP". */
  summary?: string;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Mini-calendario mensual: resalta visualmente las fechas marcadas.
 * Semana de lunes a domingo. Compacto para modales.
 */
const MonthCalendar: React.FC<MonthCalendarProps> = ({
  year,
  month,
  marked,
  accent = '#34d399',
  accentSoft = 'rgba(52,211,153,0.18)',
  summary,
}) => {
  const firstDowMondayFirst = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDowMondayFirst; i++) {
    cells.push(<span key={`blank-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isMarked = marked.has(iso);
    const todayMark = isToday(day);
    cells.push(
      <span
        key={day}
        title={`${day} — ${isMarked ? 'marcado' : 'sin marca'}`}
        style={{
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          borderRadius: '0.5rem',
          color: isMarked ? accent : 'var(--text-muted)',
          background: isMarked ? accentSoft : 'transparent',
          border: `1px solid ${isMarked ? accent : 'transparent'}`,
          outline: todayMark ? `1px dashed ${isMarked ? accent : 'var(--text-muted)'}` : 'none',
          outlineOffset: '-3px',
          fontWeight: isMarked ? 700 : 400,
        }}
      >
        {day}
      </span>,
    );
  }

  const monthName = format(new Date(year, month, 1), 'MMMM yyyy', { locale: es });
  const markedDays = [...marked]
    .filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .map((d) => Number(d.slice(8, 10)))
    .sort((a, b) => a - b);

  return (
    <div
      role="img"
      aria-label={`Calendario de ${monthName}, días marcados: ${markedDays.join(', ') || 'ninguno'}`}
      style={{
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '0.75rem',
        marginBottom: '1rem',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
        {WEEKDAYS.map((w) => (
          <span key={w} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '2px 0' }}>
            {w}
          </span>
        ))}
        {cells}
      </div>
      {summary && (
        <p className="text-xs text-secondary m-0 mt-2" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: accentSoft, border: `1px solid ${accent}`, display: 'inline-block' }} />
          {summary}
        </p>
      )}
    </div>
  );
};

export default MonthCalendar;
