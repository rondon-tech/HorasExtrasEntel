import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MonthGrid from './MonthGrid';

interface MonthCalendarProps {
  year: number;
  /** Mes 0-indexado (0 = enero), igual que Date. */
  month: number;
  /** Fechas 'YYYY-MM-DD' resaltadas en tono fuerte (días con tareas registradas). */
  marked: Set<string>;
  /** Fechas 'YYYY-MM-DD' resaltadas en tono suave (ingresos manuales). */
  softMarked?: Set<string>;
  accent?: string;
  accentSoft?: string;
  /** Texto de leyenda del tono fuerte, ej: "12 días TAP". */
  summary?: string;
  /** Texto de leyenda del tono suave, ej: "3 por disposición". */
  summarySoft?: string;
  /** Solo se invoca para fechas en tono suave (manuales). */
  onDayClick?: (isoDate: string) => void;
}

/**
 * Mini-calendario mensual: resalta visualmente las fechas marcadas.
 * Semana de lunes a domingo. Compacto para modales.
 */
const MonthCalendar: React.FC<MonthCalendarProps> = ({
  year,
  month,
  marked,
  softMarked,
  accent = '#34d399',
  accentSoft = 'rgba(52,211,153,0.18)',
  summary,
  summarySoft,
  onDayClick,
}) => {
  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const renderDay = (day: number, iso: string) => {
    const isMarked = marked.has(iso);
    const isSoft = !isMarked && (softMarked?.has(iso) ?? false);
    const isClickable = isSoft && typeof onDayClick === 'function';
    const todayMark = isToday(day);
    // Tono fuerte (orgánico): igual que siempre. Tono suave (manual): misma gama
    // pero más claro, con borde punteado para diferenciarlo a simple vista.
    const softText = `color-mix(in srgb, ${accent} 72%, white)`;
    const softBorder = `color-mix(in srgb, ${accent} 55%, transparent)`;
    const commonStyle: React.CSSProperties = {
      aspectRatio: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.75rem',
      borderRadius: '0.5rem',
      color: isMarked ? accent : isSoft ? softText : 'var(--text-muted)',
      background: isMarked ? accentSoft : 'transparent',
      border: isMarked ? `1px solid ${accent}` : isSoft ? `1px dashed ${softBorder}` : '1px solid transparent',
      outline: todayMark ? `1px dashed ${isMarked || isSoft ? accent : 'var(--text-muted)'}` : 'none',
      outlineOffset: '-3px',
      fontWeight: isMarked || isSoft ? 700 : 400,
      cursor: isClickable ? 'pointer' : 'default',
      padding: 0,
    };
    const title = isMarked
      ? `${day} — día con tareas registradas`
      : isSoft
        ? `${day} — ingresado manualmente (clic para quitar)`
        : `${day}`;
    return isClickable ? (
      <button type="button" title={title} aria-label={title} onClick={() => onDayClick(iso)} style={commonStyle}>
        {day}
      </button>
    ) : (
      <span title={title} style={commonStyle}>
        {day}
      </span>
    );
  };

  const monthName = format(new Date(year, month, 1), 'MMMM yyyy', { locale: es });
  const inMonth = (d: string) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
  const markedDays = [...marked]
    .filter(inMonth)
    .map((d) => Number(d.slice(8, 10)))
    .sort((a, b) => a - b);
  const softDays = [...(softMarked ?? [])]
    .filter((d) => inMonth(d) && !marked.has(d))
    .map((d) => Number(d.slice(8, 10)))
    .sort((a, b) => a - b);

  return (
    <div
      role="img"
      aria-label={`Calendario de ${monthName}, días con tareas: ${markedDays.join(', ') || 'ninguno'}, días manuales: ${softDays.join(', ') || 'ninguno'}`}
      style={{
        background: 'rgba(0,0,0,0.2)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '0.75rem',
        marginBottom: '1rem',
      }}
    >
      <MonthGrid year={year} month={month} renderDay={renderDay} />
      {(summary || summarySoft) && (
        <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {summary && (
            <p className="text-xs text-secondary m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: accentSoft, border: `1px solid ${accent}`, display: 'inline-block', flexShrink: 0 }} />
              {summary}
            </p>
          )}
          {summarySoft && (
            <p className="text-xs text-secondary m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, border: `1px dashed ${accent}`, display: 'inline-block', flexShrink: 0 }} />
              {summarySoft}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthCalendar;
