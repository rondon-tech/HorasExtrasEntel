import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Share2 } from 'lucide-react';
import { formatCLP } from '../utils/format';
import { usePayrollPDF } from '../hooks/usePayrollPDF';
import QuickAddModal from '../components/QuickAddModal';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [quickAddType, setQuickAddType] = React.useState<'TAD' | 'Contingencia' | null>(null);
  
  const appContextData = useAppContext();
  const {
    currentMonth,
    setCurrentMonth,
    liquidoAPagar,
    totalExtraPayThisMonth,
    totalExtraHoursThisMonth,
    diasCompensatoriosGanados,
    pureTadDays,
    contingencyDaysThisMonth,
    apoyoTadDays
  } = appContextData;
  const { download: downloadPDF, share: sharePDF } = usePayrollPDF(appContextData, currentMonth);

  const formattedMonth = format(currentMonth, 'MMMM yyyy', { locale: es });

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(Number(e.target.value) - 1);
    setCurrentMonth(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(Number(e.target.value));
    setCurrentMonth(newDate);
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="form-control text-sm font-bold" value={currentMonth.getMonth() + 1} onChange={handleMonthChange} style={{ padding: '0.4rem 0.5rem', width: 'auto', textTransform: 'capitalize' }}>
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('es', { month: 'long' })}</option>
            ))}
          </select>
          <select className="form-control text-sm font-bold" value={currentMonth.getFullYear()} onChange={handleYearChange} style={{ padding: '0.4rem 0.5rem', width: 'auto' }}>
            {(() => {
              const currentYear = new Date().getFullYear();
              const years = [];
              for (let y = currentYear - 1; y <= currentYear + 2; y++) years.push(y);
              return years.map(y => <option key={y} value={y}>{y}</option>);
            })()}
          </select>
        </div>
        <div className="badge badge-green">Recalculado</div>
      </div>

      <div 
        className="glass-card text-center mt-4 relative" 
        style={{ cursor: 'pointer' }}
        onClick={() => navigate('/simulator')}
      >
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={(e) => { e.stopPropagation(); sharePDF(); }} className="btn-icon" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--accent-blue)', padding: '0.4rem' }} title="Compartir Liquidación">
            <Share2 size={16} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} className="btn-icon" style={{ background: 'var(--accent-blue)', border: 'none', color: 'white', padding: '0.4rem' }} title="Descargar PDF">
            <Download size={16} />
          </button>
        </div>

        <p className="text-sm text-secondary uppercase font-bold tracking-wider mb-2">Líquido a Pagar ({formattedMonth})</p>
        <h1 className="text-4xl font-bold text-gradient mb-2">
          {formatCLP(liquidoAPagar)}
        </h1>
        <p className="text-xs text-blue flex-center gap-1 mt-3">
          Toca aquí para ver detalle completo &rarr;
        </p>
      </div>

      <div className="grid-2 mt-4">
        <div className="stat-box">
          <p className="text-xs text-secondary">Horas Extras</p>
          <p className="stat-value text-orange">{totalExtraHoursThisMonth.toFixed(1)} <span className="text-sm">hrs</span></p>
          <p className="text-xs text-muted mt-1">{formatCLP(totalExtraPayThisMonth)} imponibles</p>
        </div>
        
        <div className="stat-box">
          <p className="text-xs text-secondary">Días Compens. Ganados</p>
          <p className="stat-value text-blue">{diasCompensatoriosGanados}</p>
          <p className="text-xs text-muted mt-1">Por feriados/domingos</p>
        </div>
        
        <div className="stat-box mt-2" style={{ cursor: 'pointer', border: '1px solid rgba(16, 185, 129, 0.2)' }} onClick={() => setQuickAddType('TAD')}>
          <p className="text-xs text-secondary">Días TAP Trabajados</p>
          <p className="stat-value text-green">{pureTadDays}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>+ Ingresar Disposición</p>
        </div>

        <div className="stat-box mt-2" style={{ cursor: 'pointer', border: '1px solid rgba(168, 85, 247, 0.2)' }} onClick={() => setQuickAddType('Contingencia')}>
          <p className="text-xs text-secondary">Días Contingencia</p>
          <p className="stat-value text-purple">{contingencyDaysThisMonth}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>+ Ingresar Disposición</p>
        </div>

        <div className="stat-box mt-2" style={{ gridColumn: 'span 2' }}>
          <p className="text-xs text-secondary">Días Apoyo TAP</p>
          <p className="stat-value text-green">{apoyoTadDays}</p>
          <p className="text-xs text-muted mt-1">Total del mes</p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-4">Acciones Rápidas</h3>
        <div className="grid-2">
          <button className="btn btn-primary"             onClick={() => navigate('/record')}>
            Registrar Hora
          </button>
          <button className="btn btn-secondary"             onClick={() => navigate('/expenses')}>
            Añadir Viático
          </button>
        </div>
        <button className="btn btn-secondary btn-block mt-4"             onClick={() => navigate('/records')}>
          Auditar Registros del Mes
        </button>
      </div>

      <QuickAddModal 
        isOpen={quickAddType !== null} 
        onClose={() => setQuickAddType(null)} 
        type={quickAddType || 'TAD'} 
      />
    </div>
  );
};

export default Dashboard;
