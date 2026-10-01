import React, { useEffect, useState } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { TAREA_VACACIONES, TAREA_COMPENSATORIO } from '../constants/tasks';
import { formatShortDate } from '../utils/dates';
import { ConfirmDialog } from './ConfirmDialog';
import MonthGrid from './MonthGrid';
import { useTheme } from '../hooks/useTheme';
import { darkenHex } from '../utils/color';

type TimeOffType = typeof TAREA_VACACIONES | typeof TAREA_COMPENSATORIO;

interface TimeOffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_STYLE: Record<TimeOffType, { accent: string; soft: string; label: string }> = {
  [TAREA_VACACIONES]: { accent: '#60a5fa', soft: 'rgba(96,165,250,0.18)', label: 'Vacaciones' },
  [TAREA_COMPENSATORIO]: { accent: '#fb923c', soft: 'rgba(251,146,60,0.18)', label: 'Compensatorio' },
};

const isTimeOffRecord = (r: { extraHours?: number; dayType?: string; tarea?: string }) =>
  (r.extraHours || 0) === 0 &&
  r.dayType === 'Normal' &&
  (r.tarea === TAREA_VACACIONES || r.tarea === TAREA_COMPENSATORIO);

/**
 * Días libres del mes: calendario interactivo para marcar Vacaciones o
 * Compensatorios. Tocar un día guardado pide confirmación para quitarlo.
 * Se guarda como registros fantasma de 0 hrs (sin efecto en liquidación).
 */
const TimeOffModal: React.FC<TimeOffModalProps> = ({ isOpen, onClose }) => {
  const { records, currentMonth, addRecord, deleteRecord } = useAppContext();
  const theme = useTheme();
  // Acentos oscurecidos en modo claro para mantener contraste sobre blanco.
  const TS: typeof TYPE_STYLE = {
    [TAREA_VACACIONES]: {
      ...TYPE_STYLE[TAREA_VACACIONES],
      accent: theme === 'light' ? darkenHex(TYPE_STYLE[TAREA_VACACIONES].accent, 0.45) : TYPE_STYLE[TAREA_VACACIONES].accent,
    },
    [TAREA_COMPENSATORIO]: {
      ...TYPE_STYLE[TAREA_COMPENSATORIO],
      accent: theme === 'light' ? darkenHex(TYPE_STYLE[TAREA_COMPENSATORIO].accent, 0.45) : TYPE_STYLE[TAREA_COMPENSATORIO].accent,
    },
  };
  const [activeType, setActiveType] = useState<TimeOffType>(TAREA_VACACIONES);
  const [pending, setPending] = useState<Map<string, TimeOffType>>(new Map());
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Limpiar selección pendiente al cambiar de mes o cerrar.
  useEffect(() => {
    if (!isOpen) setPending(new Map());
  }, [isOpen, currentMonth]);

  if (!isOpen) return null;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es });

  const savedOf = (iso: string): TimeOffType | null => {
    const rec = records.find(
      (r) => r.date === iso && isTimeOffRecord(r),
    );
    return rec ? (rec.tarea as TimeOffType) : null;
  };

  const toggleDay = (iso: string) => {
    const saved = savedOf(iso);
    if (saved) {
      setPendingDelete(iso);
      return;
    }
    setPending((prev) => {
      const next = new Map(prev);
      if (next.has(iso)) next.delete(iso);
      else next.set(iso, activeType);
      return next;
    });
  };

  const handleSave = async () => {
    if (pending.size === 0 || saving) return;
    setSaving(true);
    let ok = 0;
    for (const [iso, type] of pending) {
      try {
        await addRecord({
          date: iso,
          dayType: 'Normal',
          isFeriado: false,
          isContingencia: false,
          startTime: '00:00',
          endTime: '00:00',
          sitio: '-',
          numeroTarea: '-',
          tarea: type,
          extraHours: 0,
        });
        ok++;
      } catch {
        // se reporta al final
      }
    }
    setSaving(false);
    if (ok === pending.size) {
      toast.success(`${ok} día${ok === 1 ? '' : 's'} libre${ok === 1 ? '' : 's'} guardado${ok === 1 ? '' : 's'}`);
      setPending(new Map());
    } else {
      toast.error(`Se guardaron ${ok} de ${pending.size}. Reintente los restantes.`);
    }
  };

  const confirmRemove = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const victims = records.filter((r) => r.date === pendingDelete && isTimeOffRecord(r));
      for (const v of victims) {
        await deleteRecord(v.id);
      }
      toast.success('Día libre eliminado');
      setPendingDelete(null);
    } catch {
      toast.error('No se pudo eliminar el día libre');
    } finally {
      setDeleting(false);
    }
  };

  const today = new Date();

  const renderDay = (day: number, iso: string) => {
    const saved = savedOf(iso);
    const pend = pending.get(iso) ?? null;
    const shown: TimeOffType | null = pend ?? saved;
    const styleFor = shown ? TS[shown] : null;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    return (
      <button
        type="button"
        onClick={() => toggleDay(iso)}
        title={saved ? `${day} — ${saved} (clic para quitar)` : pend ? `${day} — ${pend} (clic para desmarcar)` : `${day} — marcar como ${activeType}`}
        aria-pressed={shown !== null}
        aria-label={`${day} de ${monthLabel}${shown ? `, ${shown}` : ''}`}
        style={{
          aspectRatio: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          borderRadius: '0.5rem',
          color: shown ? (pend ? '#0b1220' : styleFor!.accent) : 'var(--text-muted)',
          background: shown ? (pend ? styleFor!.accent : styleFor!.soft) : 'transparent',
          border: shown ? `1px solid ${styleFor!.accent}` : '1px solid transparent',
          outline: isToday ? `1px dashed ${shown ? styleFor!.accent : 'var(--text-muted)'}` : 'none',
          outlineOffset: '-3px',
          fontWeight: shown ? 700 : 400,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {day}
      </button>
    );
  };

  const pendVac = [...pending.values()].filter((t) => t === TAREA_VACACIONES).length;
  const pendComp = pending.size - pendVac;

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
        aria-label={`Días libres de ${monthLabel}`}
        style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between mb-4">
          <h3 className="m-0 flex-center" style={{ gap: '0.5rem', textTransform: 'capitalize' }}>
            <CalendarPlus size={20} className="text-blue" aria-hidden="true" />
            Días Libres ({monthLabel})
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar días libres" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }} role="group" aria-label="Tipo de día libre">
          {([TAREA_VACACIONES, TAREA_COMPENSATORIO] as const).map((t) => {
            const st = TS[t];
            const active = activeType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                aria-pressed={active}
                className="btn flex-1"
                style={{
                  background: active ? st.soft : 'var(--bg-secondary)',
                  border: `1px solid ${active ? st.accent : 'var(--border-color)'}`,
                  color: active ? st.accent : 'var(--text-secondary)',
                  padding: '0.55rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {st.label}
              </button>
            );
          })}
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
            {([TAREA_VACACIONES, TAREA_COMPENSATORIO] as const).map((t) => (
              <p key={t} className="text-xs text-secondary m-0" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: TS[t].soft, border: `1px solid ${TS[t].accent}`, display: 'inline-block', flexShrink: 0 }} />
                {TS[t].label}
              </p>
            ))}
          </div>
        </div>

        <p className="text-xs text-secondary m-0 mb-4">
          Toque un día para marcarlo como {activeType}. Los días guardados se quitan con confirmación.
        </p>

        <button
          className="btn btn-primary btn-block"
          onClick={handleSave}
          disabled={pending.size === 0 || saving}
        >
          {saving ? 'Guardando...' : pending.size === 0
            ? 'Guardar días libres'
            : `Guardar ${pending.size} día${pending.size === 1 ? '' : 's'} (${pendVac} vac · ${pendComp} comp)`}
        </button>
      </div>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Quitar día libre"
        message={pendingDelete ? `¿Quitar el día libre del ${formatShortDate(pendingDelete, 'dd/MM')}? Esta acción no se puede deshacer.` : ''}
        confirmLabel={deleting ? 'Quitando...' : 'Sí, quitar'}
        cancelLabel="Cancelar"
        onConfirm={confirmRemove}
        onCancel={() => { if (!deleting) setPendingDelete(null); }}
        danger
      />
    </div>
  );
};

export default TimeOffModal;

