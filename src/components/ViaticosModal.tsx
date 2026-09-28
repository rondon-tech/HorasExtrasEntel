import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppContext } from '../context/AppContext';
import { formatCLP } from '../utils/format';

interface ViaticosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Formatea 'YYYY-MM-DD' en fecha local (sin desfase de zona horaria). */
function formatExpenseDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return format(new Date(y, m - 1, d), "EEEE dd/MM", { locale: es });
}

const ViaticosModal: React.FC<ViaticosModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { expenses, params, currentMonth } = useAppContext();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const prefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = expenses
    .filter((e) => e.date.startsWith(prefix))
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = monthExpenses.length * (params.viaticoRate || 0);
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es });

  const goToExpenses = () => {
    onClose();
    navigate('/expenses');
  };

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
        aria-label={`Viáticos de ${monthLabel}`}
        style={{ width: '100%', maxWidth: '440px', padding: '1.5rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-between mb-4">
          <h3 className="m-0 flex-center" style={{ gap: '0.5rem', textTransform: 'capitalize' }}>
            <Receipt size={20} className="text-green" aria-hidden="true" />
            Viáticos ({monthLabel})
          </h3>
          <button onClick={onClose} className="btn-icon" aria-label="Cerrar detalle de viáticos" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {monthExpenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p className="text-sm text-secondary mb-4">Sin viáticos registrados este mes.</p>
            <button className="btn btn-primary" onClick={goToExpenses}>Añadir Viático</button>
          </div>
        ) : (
          <>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {monthExpenses.map((e) => (
                <div key={e.id} className="flex-between" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '0.5rem', gap: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <p className="font-bold text-sm m-0" style={{ textTransform: 'capitalize' }}>{formatExpenseDate(e.date)}</p>
                    <p className="text-xs text-muted m-0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</p>
                  </div>
                  <span className="badge" style={{ whiteSpace: 'nowrap' }}>{e.nemonico}</span>
                </div>
              ))}
            </div>
            <div className="flex-between mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <span className="text-sm text-secondary">
                {monthExpenses.length} viático{monthExpenses.length === 1 ? '' : 's'} × {formatCLP(params.viaticoRate)}
              </span>
              <span className="font-bold text-green">{formatCLP(total)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ViaticosModal;
