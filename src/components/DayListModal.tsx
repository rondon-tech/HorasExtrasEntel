import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { formatShortDate } from '../utils/dates';

export interface DayGroup {
  date: string; // YYYY-MM-DD
  subtitle: string;
  badge: string;
}

interface DayListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  monthLabel: string;
  days: DayGroup[];
  footer: React.ReactNode;
  emptyMessage: string;
  addLabel?: string;
  onAdd?: () => void;
  /** Contenido opcional sobre la lista (ej: un calendario visual del mes). */
  calendar?: React.ReactNode;
}

/**
 * Modal genérico: lista de días (TAP, Contingencia, etc.) del mes.
 * Muestra Fecha + detalle + badge por día, con total en el pie.
 */
const DayListModal: React.FC<DayListModalProps> = ({
  isOpen,
  onClose,
  title,
  monthLabel,
  days,
  footer,
  emptyMessage,
  addLabel,
  onAdd,
  calendar,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
        aria-label={`${title} de ${monthLabel}`}
        style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between mb-4">
          <h3 className="m-0 flex-center" style={{ gap: '0.5rem', textTransform: 'capitalize' }}>
            {title} ({monthLabel})
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label={`Cerrar ${title}`} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {calendar}
        {days.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p className="text-sm text-secondary mb-4">{emptyMessage}</p>
            {onAdd && addLabel && <button className="btn btn-primary" onClick={onAdd}>{addLabel}</button>}
          </div>
        ) : (
          <>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {days.map((d) => (
                <div key={d.date} className="flex-between" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '0.5rem', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="font-bold text-sm m-0" style={{ textTransform: 'capitalize' }}>{formatShortDate(d.date)}</p>
                    <p className="text-xs text-muted m-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.subtitle}</p>
                  </div>
                  <span className="badge" style={{ whiteSpace: 'nowrap' }}>{d.badge}</span>
                </div>
              ))}
            </div>
            <div className="mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              {footer}
            </div>
            {onAdd && addLabel && <button className="btn btn-secondary btn-block mt-4" onClick={onAdd}>{addLabel}</button>}
          </>
        )}
      </div>
    </div>
  );
};

export default DayListModal;
