import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Share2, Eye, EyeOff } from 'lucide-react';
import { formatCLP } from '../utils/format';
import { usePayrollPDF } from '../hooks/usePayrollPDF';
import { useProfileQuery } from '../hooks/useApi';
import PayrollTrend from '../components/PayrollTrend';
import BentoCard from '../components/BentoCard';
import QuickAddModal from '../components/QuickAddModal';
import ViaticosModal from '../components/ViaticosModal';
import DayListModal, { type DayGroup } from '../components/DayListModal';
import MonthCalendar from '../components/MonthCalendar';
import TimeOffModal from '../components/TimeOffModal';
import OverviewModal from '../components/OverviewModal';
import { TAREA_VACACIONES, TAREA_COMPENSATORIO } from '../constants/tasks';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { monthPrefix, formatShortDate } from '../utils/dates';
import { Spinner } from '../components/Spinner';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [quickAddType, setQuickAddType] = React.useState<'TAD' | 'Contingencia' | null>(null);
  const [viaticosOpen, setViaticosOpen] = React.useState(false);
  const [tapOpen, setTapOpen] = React.useState(false);
  const [compOpen, setCompOpen] = React.useState(false);
  const [apoyoOpen, setApoyoOpen] = React.useState(false);
  const [contOpen, setContOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<{ date: string; kind: 'TAD' | 'Contingencia' } | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [timeOffOpen, setTimeOffOpen] = React.useState(false);
  const [overviewOpen, setOverviewOpen] = React.useState(false);

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
    records,
    params,
    deleteRecord,
  } = appContextData;

  const prefix = monthPrefix(currentMonth);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(prefix));
  const viaticosTotal = monthExpenses.length * (params.viaticoRate || 0);

  // Días libres del mes (fantasmas de 0 hrs con tarea Vacaciones/Compensatorio).
  const monthTimeOff = records.filter(
    (r) => r.date.startsWith(prefix)
      && (r.extraHours || 0) === 0
      && (r.tarea === TAREA_VACACIONES || r.tarea === TAREA_COMPENSATORIO),
  );
  const vacCount = monthTimeOff.filter((r) => r.tarea === TAREA_VACACIONES).length;
  const compTakenCount = monthTimeOff.length - vacCount;

  // Días con actividad (cualquier registro) del mes.
  const activeDaysThisMonth = new Set(
    records.filter((r) => r.date.startsWith(prefix)).map((r) => r.date),
  ).size;

  // Agrupa registros del mes por fecha (igual que el servidor: fechas únicas).
  const groupByDate = (predicate: (r: (typeof records)[number]) => boolean) => {
    const byDate = new Map<string, typeof records>();
    records
      .filter((r) => r.date.startsWith(prefix) && predicate(r))
      .forEach((r) => {
        const list = byDate.get(r.date) ?? [];
        list.push(r);
        byDate.set(r.date, list);
      });
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
  };

  const toDayGroups = (entries: [string, typeof records][], fallback: string): DayGroup[] =>
    entries.map(([date, dayRecords]) => {
      const hours = dayRecords.reduce((sum, r) => sum + (r.extraHours || 0), 0);
      const sitios = [...new Set(dayRecords.map((r) => r.sitio).filter((s) => s && s !== '-'))];
      return {
        date,
        subtitle: sitios.length > 0 ? sitios.join(', ') : fallback,
        badge: hours > 0 ? `${hours.toFixed(1)} hrs` : fallback,
      };
    });

  // Días TAP del mes (day_type === 'TAD').
  const tapEntries = groupByDate((r) => r.dayType === 'TAD');
  const tapDays = toDayGroups(tapEntries, 'Guardia');
  const tapBonusTotal = tapDays.length * (params.tadRate || 0);
  // Días manuales = solo disposiciones fantasma (0 hrs). Los días con horas
  // reales son orgánicos (si un día mezcla ambos, cuenta como orgánico).
  const tapManualDates = new Set(
    tapEntries
      .filter(([, dayRecords]) => dayRecords.every((r) => (r.extraHours || 0) === 0))
      .map(([date]) => date),
  );
  const tapOrganicDates = new Set(
    tapEntries.map(([date]) => date).filter((d) => !tapManualDates.has(d)),
  );

  const confirmRemoveDisposition = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      const ghosts = records.filter(
        (r) => r.date === pendingDelete.date
          && (r.extraHours || 0) === 0
          && (pendingDelete.kind === 'TAD' ? r.dayType === 'TAD' : r.isContingencia === true),
      );
      for (const g of ghosts) {
        await deleteRecord(g.id);
      }
      toast.success('Disposición eliminada');
      setPendingDelete(null);
    } catch {
      toast.error('No se pudo eliminar la disposición');
    } finally {
      setDeleting(false);
    }
  };

  // Días compensatorios ganados (is_feriado).
  const compDays = toDayGroups(groupByDate((r) => r.isFeriado === true), 'Feriado');

  // Días Apoyo TAP (day_type === 'TAD Apoyo').
  const apoyoDays = toDayGroups(groupByDate((r) => r.dayType === 'TAD Apoyo'), 'Apoyo');
  const apoyoBonusTotal = apoyoDays.length * (params.tadRate || 0);

  // Días Contingencia (is_contingencia).
  const contEntries = groupByDate((r) => r.isContingencia === true);
  const contDays = toDayGroups(contEntries, 'Guardia');
  const contBonusTotal = contDays.length * (params.contingencyRate || 0);
  // Manual = todas las marcas de contingencia del día son fantasmas (0 hrs).
  const contManualDates = new Set(
    contEntries
      .filter(([, dayRecords]) => dayRecords
        .filter((r) => r.isContingencia === true)
        .every((r) => (r.extraHours || 0) === 0))
      .map(([date]) => date),
  );
  const contOrganicDates = new Set(
    contEntries.map(([date]) => date).filter((d) => !contManualDates.has(d)),
  );
  const { download: downloadPDF, share: sharePDF } = usePayrollPDF(appContextData, currentMonth);
  const { data: profile } = useProfileQuery();

  // Privacidad de montos (persistente).
  const [amountsHidden, setAmountsHidden] = React.useState(
    () => localStorage.getItem('entel_hide_amounts') === '1',
  );
  const toggleAmountsHidden = () => {
    setAmountsHidden((prev) => {
      localStorage.setItem('entel_hide_amounts', prev ? '0' : '1');
      return !prev;
    });
  };



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
          <div style={{ cursor: 'pointer' }} onClick={() => navigate('/simulator')}>
            <div className="flex-between mb-2" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
              <p className="text-sm text-secondary uppercase font-bold tracking-wider m-0" style={{ flex: 1, minWidth: 0 }}>Líquido a Pagar ({formattedMonth})</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={(e) => { e.stopPropagation(); sharePDF(); }} className="btn-icon" aria-label="Compartir liquidación" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--accent-blue)', padding: '0.4rem' }} title="Compartir Liquidación">
                  <Share2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); downloadPDF(); }} className="btn-icon" aria-label="Descargar liquidación en PDF" style={{ background: 'var(--accent-blue)', border: 'none', color: 'white', padding: '0.4rem' }} title="Descargar PDF">
                  <Download size={16} />
                </button>
              </div>
            </div>
            <div className="flex-center mb-2" style={{ justifyContent: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 className="text-4xl font-bold text-gradient m-0">
                {amountsHidden ? '••••••' : formatCLP(liquidoAPagar)}
              </h1>
              <button
                onClick={(e) => { e.stopPropagation(); toggleAmountsHidden(); }}
                className="btn-icon"
                aria-label={amountsHidden ? 'Mostrar montos' : 'Ocultar montos'}
                aria-pressed={amountsHidden}
                title={amountsHidden ? 'Mostrar montos' : 'Ocultar montos'}
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.4rem' }}
              >
                {amountsHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-blue flex-center gap-1 mt-3">
              Toca aquí para ver detalle completo &rarr;
            </p>
          </div>
          <PayrollTrend currentMonth={currentMonth} currentLiquido={liquidoAPagar} maskAmounts={amountsHidden} />
        </BentoCard>

        <BentoCard title="Horas Extras" className="bento-col-2 bento-row-1">
          <p className="stat-value text-orange">{totalExtraHoursThisMonth.toFixed(1)} <span className="text-sm">hrs</span></p>
          <p className="text-xs text-muted mt-1">{formatCLP(totalExtraPayThisMonth)} imponibles</p>
        </BentoCard>

        <BentoCard title="Días Compens. Ganados" className="bento-col-1 bento-row-1 bento-card-clickable" onClick={() => setCompOpen(true)} ariaLabel="Ver detalle de días compensatorios del mes">
          <p className="stat-value text-blue">{diasCompensatoriosGanados}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>Toca para ver el detalle &rarr;</p>
        </BentoCard>

        <BentoCard title="Días TAP Trabajados" className="bento-col-1 bento-row-1 bento-card-clickable" onClick={() => setTapOpen(true)} ariaLabel="Ver detalle de días TAP del mes">
          <p className="stat-value text-green">{pureTadDays}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>Toca para ver el detalle &rarr;</p>
        </BentoCard>

        <BentoCard title="Días Contingencia" className="bento-col-1 bento-row-1 bento-card-clickable" onClick={() => setContOpen(true)} ariaLabel="Ver detalle de días de contingencia del mes">
          <p className="stat-value text-purple">{contingencyDaysThisMonth}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>Toca para ver el detalle &rarr;</p>
        </BentoCard>

        <BentoCard title="Días Apoyo TAP" className="bento-col-1 bento-row-1 bento-card-clickable" onClick={() => setApoyoOpen(true)} ariaLabel="Ver detalle de días de apoyo TAP del mes">
          <p className="stat-value text-green">{apoyoTadDays}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>Toca para ver el detalle &rarr;</p>
        </BentoCard>

        <BentoCard title="Viáticos del Mes" className="bento-col-2 bento-row-1 bento-card-clickable" onClick={() => setViaticosOpen(true)} ariaLabel="Ver detalle de viáticos del mes">
          <p className="stat-value text-green">{formatCLP(viaticosTotal)}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>
            {monthExpenses.length} viático{monthExpenses.length === 1 ? '' : 's'} &rarr;
          </p>
        </BentoCard>

        <BentoCard title="Días Libres" className="bento-col-2 bento-row-1 bento-card-clickable" onClick={() => setTimeOffOpen(true)} ariaLabel="Ver y marcar días libres del mes">
          <p className="stat-value text-blue">{monthTimeOff.length}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>
            {vacCount} vac · {compTakenCount} comp &rarr;
          </p>
        </BentoCard>

        <BentoCard title="Resumen del Mes" className="bento-col-2 bento-row-1 bento-card-clickable" onClick={() => setOverviewOpen(true)} ariaLabel="Ver calendario combinado del mes">
          <p className="stat-value text-green">{activeDaysThisMonth}</p>
          <p className="text-xs text-blue flex-center gap-1 mt-1" style={{ justifyContent: 'flex-start' }}>
            días con actividad &rarr;
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
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Quitar disposición"
        message={pendingDelete ? `¿Quitar la disposición ${pendingDelete.kind === 'TAD' ? 'manual' : 'de contingencia'} del ${formatShortDate(pendingDelete.date, 'dd/MM')}? Esta acción no se puede deshacer.` : ''}
        confirmLabel={deleting ? 'Quitando...' : 'Sí, quitar'}
        cancelLabel="Cancelar"
        onConfirm={confirmRemoveDisposition}
        onCancel={() => { if (!deleting) setPendingDelete(null); }}
        danger
      />
      <ViaticosModal
        isOpen={viaticosOpen}
        onClose={() => setViaticosOpen(false)}
      />
      <TimeOffModal
        isOpen={timeOffOpen}
        onClose={() => setTimeOffOpen(false)}
      />
      <OverviewModal
        isOpen={overviewOpen}
        onClose={() => setOverviewOpen(false)}
      />
      <DayListModal
        isOpen={tapOpen}
        onClose={() => setTapOpen(false)}
        title="Días TAP"
        monthLabel={formattedMonth}
        calendar={
          <MonthCalendar
            year={currentMonth.getFullYear()}
            month={currentMonth.getMonth()}
            marked={tapOrganicDates}
            softMarked={tapManualDates}
            summary={`${tapOrganicDates.size} día${tapOrganicDates.size === 1 ? '' : 's'} con tareas registradas`}
            summarySoft={`${tapManualDates.size} por disposición manual (clic para quitar)`}
            onDayClick={(iso) => setPendingDelete({ date: iso, kind: 'TAD' })}
          />
        }
        days={tapDays}
        footer={
          <div className="flex-between">
            <span className="text-sm text-secondary">
              {tapDays.length} día{tapDays.length === 1 ? '' : 's'} × {formatCLP(params.tadRate)}
            </span>
            <span className="font-bold text-green">{formatCLP(tapBonusTotal)}</span>
          </div>
        }
        emptyMessage="Sin días TAP registrados este mes."
        addLabel="Ingresar Disposición"
        onAdd={() => { setTapOpen(false); setQuickAddType('TAD'); }}
      />
      <DayListModal
        isOpen={compOpen}
        onClose={() => setCompOpen(false)}
        title="Días Compensatorios"
        monthLabel={formattedMonth}
        calendar={
          <MonthCalendar
            year={currentMonth.getFullYear()}
            month={currentMonth.getMonth()}
            marked={new Set(compDays.map((d) => d.date))}
            accent="#60a5fa"
            accentSoft="rgba(96,165,250,0.18)"
            summary={`${compDays.length} día${compDays.length === 1 ? '' : 's'} ganado${compDays.length === 1 ? '' : 's'}`}
          />
        }
        days={compDays}
        footer={
          <div className="flex-between">
            <span className="text-sm text-secondary">
              {compDays.length} día{compDays.length === 1 ? '' : 's'} ganado{compDays.length === 1 ? '' : 's'}
            </span>
            <span className="font-bold text-blue">Por feriados/domingos</span>
          </div>
        }
        emptyMessage="Sin días compensatorios ganados este mes."
      />
      <DayListModal
        isOpen={apoyoOpen}
        onClose={() => setApoyoOpen(false)}
        title="Días Apoyo TAP"
        monthLabel={formattedMonth}
        calendar={
          <MonthCalendar
            year={currentMonth.getFullYear()}
            month={currentMonth.getMonth()}
            marked={new Set(apoyoDays.map((d) => d.date))}
            summary={`${apoyoDays.length} día${apoyoDays.length === 1 ? '' : 's'} de apoyo`}
          />
        }
        days={apoyoDays}
        footer={
          <div className="flex-between">
            <span className="text-sm text-secondary">
              {apoyoDays.length} día{apoyoDays.length === 1 ? '' : 's'} × {formatCLP(params.tadRate)}
            </span>
            <span className="font-bold text-green">{formatCLP(apoyoBonusTotal)}</span>
          </div>
        }
        emptyMessage="Sin días de apoyo TAP este mes."
      />
      <DayListModal
        isOpen={contOpen}
        onClose={() => setContOpen(false)}
        title="Días Contingencia"
        monthLabel={formattedMonth}
        calendar={
          <MonthCalendar
            year={currentMonth.getFullYear()}
            month={currentMonth.getMonth()}
            marked={contOrganicDates}
            softMarked={contManualDates}
            accent="#c084fc"
            accentSoft="rgba(192,132,252,0.18)"
            summary={`${contOrganicDates.size} día${contOrganicDates.size === 1 ? '' : 's'} con tareas registradas`}
            summarySoft={`${contManualDates.size} por disposición manual (clic para quitar)`}
            onDayClick={(iso) => setPendingDelete({ date: iso, kind: 'Contingencia' })}
          />
        }
        days={contDays}
        footer={
          <div className="flex-between">
            <span className="text-sm text-secondary">
              {contDays.length} día{contDays.length === 1 ? '' : 's'} × {formatCLP(params.contingencyRate)}
            </span>
            <span className="font-bold text-green">{formatCLP(contBonusTotal)}</span>
          </div>
        }
        emptyMessage="Sin días de contingencia este mes."
        addLabel="Ingresar Disposición"
        onAdd={() => { setContOpen(false); setQuickAddType('Contingencia'); }}
      />
    </div>
  );
};

export default Dashboard;
