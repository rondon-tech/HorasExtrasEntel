import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Share2 } from 'lucide-react';
import { formatCLP } from '../utils/format';
import { usePayrollPDF } from '../hooks/usePayrollPDF';
import { useProfileQuery } from '../hooks/useApi';
import BentoCard from '../components/BentoCard';
import QuickAddModal from '../components/QuickAddModal';
import ViaticosModal from '../components/ViaticosModal';
import { Spinner } from '../components/Spinner';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [quickAddType, setQuickAddType] = React.useState<'TAD' | 'Contingencia' | null>(null);
  const [viaticosOpen, setViaticosOpen] = React.useState(false);

  const appContextData = useAppContext();
  const {
    currentMonth,
    setCurrentMonth,
    liquidoAPagar,
    totalExtraPayThisMonth,
    isLoading,
    totalExtraHoursThisMonth,
    diasCompensatoriosGanados,
    pureTadDays,
    contingencyDaysThisMonth,
    apoyoTadDays,
    expenses,
    params,
  } = appContextData;

  const monthPrefix = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthPrefix));
  const viaticosTotal = monthExpenses.length * (params.viaticoRate || 0);
  const { download: downloadPDF, share: sharePDF } = usePayrollPDF(appContextData, currentMonth);
  const { data: profile } = useProfileQuery();

  const formattedMonth = format(currentMonth, 'MMMM yyyy', { locale: es });

  const greeting = profile?.firstName && profile.firstName !== 'Usuario Temporal'
    ? `Hola, ${profile.firstName}`
    : 'Hola';

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
      {isLoading && <Spinner />}
      
      <p className="dashboard-greeting mb-4">{greeting}</p>

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

      <div className="bento-grid">
        <BentoCard className="bento-col-2 bento-row-2 bento-card-hero">
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={(e) => { e.stopPropagation(); sharePDF(); }} className="btn-icon" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--accent-blue)', padding: '0.4rem' }} title="Compartir Liquidación">
              <Share2 size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} className="btn-icon" style={{ background: 'var(--accent-blue)', border: 'none', color: 'white', padding: '0.4rem' }} title="Descargar PDF">
              <Download size={16} />
            </button>
          </div>
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/simulator')}>
            <p className="text-sm text-secondary uppercase font-bold tracking-wider mb-2">Líquido a Pagar ({formattedMonth})</p>
            <h1 className="text-4xl font-bold text-gradient mb-2">
              {formatCLP(liquidoAPagar)}
            </h1>
            <p className="text-xs text-blue flex-center gap-1 mt-3">
              Toca aquí para ver detalle completo &rarr;
            </p>
          </div>
        </BentoCard>

        <BentoCard title="Horas Extras" className="bento-col-2 bento-row-1">
          <p className="stat-value text-orange">{totalExtraHoursThisMonth.toFixed(1)} <span className="text-sm">hrs</span></p>
          <p className="text-xs text-muted mt-1">{formatCLP(totalExtraPayThisMonth)} imponibles</p>
        </BentoCard>

        <BentoCard title="Días Compens. Ganados" className="bento-col-1 bento-row-1">
          <p className="stat-value text-blue">{diasCompensatoriosGanados}</p>
          <p className="text-xs text-muted mt-1">Por feriados/domingos</p>
        </BentoCard>

        <BentoCard title="Días TAP Trabajados" className="bento-col-1 bento-row-1 bento-card-clickable" onClick={() => setQuickAddType('TAD')}>
          <p className="stat-value text-green">{pureTadDays}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>+ Ingresar Disposición</p>
        </BentoCard>

        <BentoCard title="Días Contingencia" className="bento-col-1 bento-row-1 bento-card-clickable" onClick={() => setQuickAddType('Contingencia')}>
          <p className="stat-value text-purple">{contingencyDaysThisMonth}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>+ Ingresar Disposición</p>
        </BentoCard>

        <BentoCard title="Días Apoyo TAP" className="bento-col-1 bento-row-1">
          <p className="stat-value text-green">{apoyoTadDays}</p>
          <p className="text-xs text-muted mt-1">Total del mes</p>
        </BentoCard>

        <BentoCard title="Viáticos del Mes" className="bento-col-2 bento-row-1 bento-card-clickable" onClick={() => setViaticosOpen(true)} ariaLabel="Ver detalle de viáticos del mes">
          <p className="stat-value text-green">{formatCLP(viaticosTotal)}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>
            {monthExpenses.length} viático{monthExpenses.length === 1 ? '' : 's'} &rarr;
          </p>
        </BentoCard>

        <BentoCard title="Acciones Rápidas" className="bento-col-4 bento-row-1">
          <div className="grid-2">
            <button className="btn btn-primary" onClick={() => navigate('/record')}>
              Registrar Hora
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/expenses')}>
              Añadir Viático
            </button>
          </div>
          <button className="btn btn-secondary btn-block mt-4" onClick={() => navigate('/records')}>
            Auditar Registros del Mes
          </button>
        </BentoCard>
      </div>

      <QuickAddModal
        isOpen={quickAddType !== null}
        onClose={() => setQuickAddType(null)}
        type={quickAddType || 'TAD'}
      />
      <ViaticosModal
        isOpen={viaticosOpen}
        onClose={() => setViaticosOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
