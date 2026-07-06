import React from 'react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Share2 } from 'lucide-react';
import { generatePayrollPDF } from '../utils/payrollPdfGenerator';
import QuickAddModal from '../components/QuickAddModal';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
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

  const formattedMonth = format(currentMonth, 'MMMM yyyy', { locale: es });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

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

  const handleDownloadPDF = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening simulator
    const doc = generatePayrollPDF(appContextData, currentMonth);
    doc.save(`Liquidacion_Entel_${format(currentMonth, 'MMM_yyyy')}.pdf`);
  };

  const handleSharePDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = generatePayrollPDF(appContextData, currentMonth);
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `Liquidacion_Entel_${format(currentMonth, 'MMM_yyyy')}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Liquidación Entel - ${formattedMonth}`,
          text: `Adjunto simulación de liquidación para ${formattedMonth}.`,
          files: [file]
        });
      } catch (err) { console.log(err); }
    } else {
      alert('Navegador no soporta compartir. Descargando...');
      handleDownloadPDF(e);
    }
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
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="badge badge-green">Recalculado</div>
      </div>

      <div 
        className="glass-card text-center mt-4 relative" 
        style={{ cursor: 'pointer' }}
        onClick={() => onNavigate('simulator')}
      >
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSharePDF} className="btn-icon" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--accent-blue)', padding: '0.4rem' }} title="Compartir Liquidación">
            <Share2 size={16} />
          </button>
          <button onClick={handleDownloadPDF} className="btn-icon" style={{ background: 'var(--accent-blue)', border: 'none', color: 'white', padding: '0.4rem' }} title="Descargar PDF">
            <Download size={16} />
          </button>
        </div>

        <p className="text-sm text-secondary uppercase font-bold tracking-wider mb-2">Líquido a Pagar ({formattedMonth})</p>
        <h1 className="text-4xl font-bold text-gradient mb-2">
          {formatCurrency(liquidoAPagar)}
        </h1>
        <p className="text-xs text-blue flex-center gap-1 mt-3">
          Toca aquí para ver detalle completo &rarr;
        </p>
      </div>

      <div className="grid-2 mt-4">
        <div className="stat-box">
          <p className="text-xs text-secondary">Horas Extras</p>
          <p className="stat-value text-orange">{totalExtraHoursThisMonth.toFixed(1)} <span className="text-sm">hrs</span></p>
          <p className="text-xs text-muted mt-1">{formatCurrency(totalExtraPayThisMonth)} imponibles</p>
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
          <button className="btn btn-primary" onClick={() => onNavigate('record')}>
            Registrar Hora
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('expenses')}>
            Añadir Viático
          </button>
        </div>
        <button className="btn btn-secondary btn-block mt-4" onClick={() => onNavigate('records')}>
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
