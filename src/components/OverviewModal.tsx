import React, { useEffect } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import { TAREA_VACACIONES, TAREA_COMPENSATORIO } from '../constants/tasks';
import { monthPrefix } from '../utils/dates';
import MonthGrid from './MonthGrid';

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DayStatus = 'tap' | 'vac' | 'comp' | 'normal' | 'off';

const STATUS_STYLE: Record<Exclude<DayStatus, 'off'>, { accent: string; soft: string; label: string }> = {
  tap: { accent: '#34d399', soft: 'rgba(52,211,153,0.18)', label: 'TAP' },
  vac: { accent: '#60a5fa', soft: 'rgba(96,165,250,0.18)', label: 'Vacaciones' },
  comp: { accent: '#fb923c', soft: 'rgba(251,146,60,0.18)', label: 'Compensatorio' },
  normal: { accent: '#94a3b8', soft: 'rgba(148,163,184,0.18)', label: 'Jornada normal' },
};

/**
 * Resumen visual del mes: un solo calendario con TAP, días libres y
 * días sin jornada. Solo lectura.
 */
const OverviewModal: React.FC<OverviewModalProps> = ({ isOpen, onClose }) => {
  const { records, currentMonth } = useAppContext();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const prefix = monthPrefix(currentMonth);
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es });

  const byDate = new Map<string, typeof records>();
  records
    .filter((r) => r.date.startsWith(prefix))
    .forEach((r) => {
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    });

  const statusOf = (iso: string): DayStatus => {
    const dayRecords = byDate.get(iso) ?? [];
    if (dayRecords.some((r) => r.dayType === 'TAD')) return 'tap';
    if (dayRecords.some((r) => (r.extraHours || 0) === 0 && r.tarea === TAREA_VACACIONES)) return 'vac';
    if (dayRecords.some((r) => (r.extraHours || 0) === 0 && r.tarea === TAREA_COMPENSATORIO)) return 'comp';
    // Jornada normal: lunes a viernes sin marca especial (se trabaja igual
    // aunque no haya registro), o cualquier día con registros. El fin de
    // semana sin registros es día sin jornada.
    const [y, m, d] = iso.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const isWeekday = dow >= 1 && dow <= 5;
    if (dayRecords.length > 0 || isWeekday) return 'normal';
    return 'off';
  };

  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const counts: Record<DayStatus, number> = { tap: 0, vac: 0, comp: 0, normal: 0, off: 0 };
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    counts[statusOf(iso)]++;
  }

  const renderDay = (day: number, iso: string) => {
    const status = statusOf(iso);
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    if (status === 'off') {
      return (
        <span
          key={day}
          title={`${day} — sin jornada`}
          style={{
            aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', borderRadius: '0.5rem', color: 'var(--text-muted)', opacity: 0.38,
            outline: isToday ? '1px dashed var(--text-muted)' : 'none', outlineOffset: '-3px',
          }}
        >
          {day}
        </span>
      );
    }
    const st = STATUS_STYLE[status];
    return (
      <span
        key={day}
        title={`${day} — ${st.label}`}
        style={{
          aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', borderRadius: '0.5rem', fontWeight: 700,
          color: st.accent, background: st.soft, border: `1px solid ${st.accent}`,
          outline: isToday ? `1px dashed ${st.accent}` : 'none', outlineOffset: '-3px',
        }}
      >
        {day}
      </span>
    );
  };

  // counts se llena durante el render del grid; se lee después.
  const legend = (
    <>
      {(['tap', 'vac', 'comp', 'normal'] as const).map((s) => (
        <p key={s} className="text-xs text-secondary m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_STYLE[s].soft, border: `1px solid ${STATUS_STYLE[s].accent}`, display: 'inline-block', flexShrink: 0 }} />
          {STATUS_STYLE[s].label}
        </p>
      ))}
      <p className="text-xs text-secondary m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, display: 'inline-block', flexShrink: 0, color: 'var(--text-muted)', opacity: 0.5, border: '1px solid var(--text-muted)', textAlign: 'center', fontSize: '0.55rem', lineHeight: '8px' }}>·</span>
        Sin jornada (fin de semana libre)
      </p>
    </>
  );

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Resumen del mes de ${monthLabel}: ${counts.tap} días TAP, ${counts.vac} de vacaciones, ${counts.comp} compensatorios, ${counts.normal} de jornada normal, ${counts.off} sin jornada`}
        style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between mb-4">
          <h3 className="m-0 flex-center" style={{ gap: '0.5rem', textTransform: 'capitalize' }}>
            <CalendarDays size={20} className="text-blue" aria-hidden="true" />
            Resumen ({monthLabel})
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar resumen del mes" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color)',
            borderRadius: '0.75rem',
            padding: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <MonthGrid year={year} month={month} renderDay={renderDay} />
          <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {legend}
          </div>
        </div>

        <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
          <span className="text-sm text-secondary">
            {counts.tap} TAP · {counts.vac} vac · {counts.comp} comp · {counts.normal} normal
          </span>
          <span className="text-sm text-muted">{counts.off} sin jornada</span>
        </div>
      </div>
    </div>
  );
};

export default OverviewModal;
