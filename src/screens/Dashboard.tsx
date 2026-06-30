import React from 'react';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    currentMonth,
    liquidoAPagar,
    totalExtraPayThisMonth,
    totalExtraHoursThisMonth,
    diasCompensatoriosGanados
  } = useAppContext();

  const formattedMonth = format(currentMonth, 'MMMM yyyy', { locale: es });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <h2 className="text-xl font-bold" style={{textTransform: 'capitalize'}}>{formattedMonth}</h2>
        <div className="badge badge-green">Activo</div>
      </div>

      <div 
        className="glass-card text-center mt-4" 
        style={{ cursor: 'pointer' }}
        onClick={() => onNavigate('simulator')}
      >
        <p className="text-sm text-secondary uppercase font-bold tracking-wider mb-2">Líquido a Pagar Estimado</p>
        <h1 className="text-4xl font-bold text-gradient mb-2">
          {formatCurrency(liquidoAPagar)}
        </h1>
        <p className="text-xs text-blue flex-center gap-1 mt-3">
          Toca aquí para ver gráficos y detalle completo &rarr;
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
    </div>
  );
};

export default Dashboard;
