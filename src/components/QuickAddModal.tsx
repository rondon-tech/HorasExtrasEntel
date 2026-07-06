import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Trash2, CalendarPlus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'TAD' | 'Contingencia';
}

const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, type }) => {
  const { currentMonth, records, addRecord, deleteRecord } = useAppContext();
  
  // Default date to today, but if today is not in currentMonth, default to the 1st of currentMonth
  const today = new Date();
  const defaultDate = (today.getMonth() === currentMonth.getMonth() && today.getFullYear() === currentMonth.getFullYear())
    ? format(today, 'yyyy-MM-dd')
    : format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd');
    
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async () => {
    setLoading(true);
    
    // We create a ghost record with 0 extra hours just to trigger the bonuses
    const ghostRecord = {
      date: selectedDate,
      dayType: type === 'TAD' ? 'TAD' as const : 'Normal' as const,
      isFeriado: false,
      isContingencia: type === 'Contingencia',
      startTime: '00:00',
      endTime: '00:00',
      sitio: '-',
      numeroTarea: '-',
      tarea: type === 'TAD' ? 'Disposición TAD' : 'Disposición Contingencia',
      extraHours: 0,
      notes: 'Guardia / Disposición sin salida a terreno'
    };

    await addRecord(ghostRecord);
    setLoading(false);
  };

  // Find all ghost records of this type for the current month
  const existingGhosts = records.filter(r => {
    const rDate = parseISO(r.date);
    const isInMonth = rDate.getMonth() === currentMonth.getMonth() && rDate.getFullYear() === currentMonth.getFullYear();
    const isGhost = r.extraHours === 0;
    const isThisType = type === 'TAD' ? r.dayType === 'TAD' : r.isContingencia;
    
    return isInMonth && isGhost && isThisType;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
        <div className="flex-between mb-4">
          <h3 className="m-0 flex-center" style={{ gap: '0.5rem' }}>
            <CalendarPlus size={20} className={type === 'TAD' ? 'text-green' : 'text-purple'} />
            Días {type} (Sin Horas)
          </h3>
          <button onClick={onClose} className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-secondary mb-4">
          Agrega días en los que estuviste de guardia o en disposición <b>sin trabajar horas extras</b> reales. Esto activará el bono compensatorio automático.
        </p>

        <div className="form-group">
          <label className="form-label">Fecha del Turno</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="date" 
              className="form-control" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
            />
            <button className="btn btn-primary" onClick={handleAdd} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
              {loading ? '...' : 'Añadir'}
            </button>
          </div>
        </div>

        {existingGhosts.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-secondary font-bold uppercase mb-2">Registros Rápidos ({format(currentMonth, 'MMM yyyy', {locale: es})})</p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {existingGhosts.map(r => (
                <div key={r.id} className="flex-between" style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
                  <div>
                    <p className="font-bold text-sm m-0">{format(parseISO(r.date), "EEEE dd 'de' MMM", { locale: es })}</p>
                    <p className="text-xs text-muted m-0">{r.tarea}</p>
                  </div>
                  <button onClick={() => deleteRecord(r.id)} className="btn-icon text-danger" style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none' }} title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickAddModal;
