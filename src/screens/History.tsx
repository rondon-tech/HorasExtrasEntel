import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const History: React.FC = () => {
  const { currentMonth, setCurrentMonth, params, updateParams, extraHourRate } = useAppContext();
  const [showConfig, setShowConfig] = useState(false);
  const [localParams, setLocalParams] = useState(params);

  // Sync local state when params from context change (e.g. initial load)
  React.useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleSaveParams = () => {
    updateParams(localParams);
    alert('Parámetros actualizados correctamente');
  };

  const formattedMonth = format(currentMonth, 'MMMM yyyy', { locale: es });

  return (
    <div>
      <h2 className="mb-6 text-xl">Historial y Configuración</h2>

      <div className="glass-card mb-6 flex-between">
        <button className="btn btn-secondary btn-icon" onClick={handlePrevMonth}>&larr;</button>
        <span className="font-bold text-lg" style={{textTransform: 'capitalize'}}>{formattedMonth}</span>
        <button className="btn btn-secondary btn-icon" onClick={handleNextMonth}>&rarr;</button>
      </div>

      <button 
        className="btn btn-secondary btn-block mb-4" 
        onClick={() => setShowConfig(!showConfig)}
      >
        {showConfig ? 'Ocultar Configuración' : 'Configurar Parámetros'}
      </button>

      {showConfig && (
        <div className="glass-card mb-6" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <h3 className="mb-4 text-lg border-b pb-2" style={{borderColor:'var(--border-color)'}}>Haberes Fijos e Imponibles</h3>
          <div className="form-group">
            <label className="form-label">Sueldo Base (Puro) ($)</label>
            <input type="number" className="form-control" value={localParams.baseSalary} onChange={e => setLocalParams({...localParams, baseSalary: parseInt(e.target.value) || 0})} />
            <p className="text-xs text-muted mt-1">Este monto se usa para calcular tus horas extras.</p>
          </div>
          <div className="form-group">
            <label className="form-label">Gratificación Fija ($)</label>
            <input type="number" className="form-control" value={localParams.gratificacion} onChange={e => setLocalParams({...localParams, gratificacion: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Incentivo de Producción ($)</label>
            <input type="number" className="form-control" value={localParams.incentivoProduccion} onChange={e => setLocalParams({...localParams, incentivoProduccion: parseInt(e.target.value) || 0})} />
          </div>
          
          <h3 className="mb-4 text-lg border-b pb-2 mt-6" style={{borderColor:'var(--border-color)'}}>Parámetros de Trabajo</h3>
          <div className="form-group">
            <label className="form-label">Horas Semanales de Jornada</label>
            <input type="number" className="form-control" value={localParams.weeklyHours} onChange={e => setLocalParams({...localParams, weeklyHours: parseInt(e.target.value) || 0})} />
            <p className="text-xs text-muted mt-1">El valor calculado de tu hora extra actual es: <b>${Math.round(extraHourRate)}</b></p>
          </div>
          <div className="form-group">
            <label className="form-label">Monto Bono TAD por día ($)</label>
            <input type="number" className="form-control" value={localParams.tadRate} onChange={e => setLocalParams({...localParams, tadRate: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Monto Bono Contingencia por día ($)</label>
            <input type="number" className="form-control" value={localParams.contingencyRate} onChange={e => setLocalParams({...localParams, contingencyRate: parseInt(e.target.value) || 0})} />
          </div>

          <h3 className="mb-4 text-lg border-b pb-2 mt-6" style={{borderColor:'var(--border-color)'}}>Descuentos Previsionales (%)</h3>
          <div className="form-group">
            <label className="form-label">Tasa AFP + Comisión (%)</label>
            <input type="number" step="0.01" className="form-control" value={localParams.afpRate} onChange={e => setLocalParams({...localParams, afpRate: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Salud (Fonasa/Isapre) (%)</label>
            <input type="number" step="0.1" className="form-control" value={localParams.saludRate} onChange={e => setLocalParams({...localParams, saludRate: parseFloat(e.target.value) || 0})} />
          </div>

          <h3 className="mb-4 text-lg border-b pb-2 mt-6" style={{borderColor:'var(--border-color)'}}>Haberes Exentos ($)</h3>
          <div className="form-group">
            <label className="form-label">Asignación Alimentación Total</label>
            <input type="number" className="form-control" value={localParams.asignacionAlimentacion} onChange={e => setLocalParams({...localParams, asignacionAlimentacion: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Desgaste de Herramientas</label>
            <input type="number" className="form-control" value={localParams.desgasteHerramientas} onChange={e => setLocalParams({...localParams, desgasteHerramientas: parseInt(e.target.value) || 0})} />
          </div>

          <h3 className="mb-4 text-lg border-b pb-2 mt-6" style={{borderColor:'var(--border-color)'}}>Descuentos Varios ($)</h3>
          <div className="form-group">
            <label className="form-label">Otros Descuentos</label>
            <input type="number" className="form-control" value={localParams.otrosDescuentos} onChange={e => setLocalParams({...localParams, otrosDescuentos: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group">
            <label className="form-label">Cuota Sindicato</label>
            <input type="number" className="form-control" value={localParams.cuotaSindicato} onChange={e => setLocalParams({...localParams, cuotaSindicato: parseInt(e.target.value) || 0})} />
          </div>
          <div className="form-group mb-6">
            <label className="form-label">Préstamo Especial</label>
            <input type="number" className="form-control" value={localParams.prestamo} onChange={e => setLocalParams({...localParams, prestamo: parseInt(e.target.value) || 0})} />
          </div>
          
          <button className="btn btn-primary btn-block mb-4" onClick={handleSaveParams}>
            Guardar Parámetros
          </button>
        </div>
      )}

      <div className="glass-card">
        <h3 className="mb-2 text-lg">Resumen del Mes</h3>
        <p className="text-sm text-secondary mb-4">La información mostrada aquí corresponde a <b>{formattedMonth}</b> y se recalcula dinámicamente si cambias los parámetros.</p>
        <p className="text-muted text-center py-4">Para ver la liquidación detallada, ve a la pestaña <b>Inicio</b> y haz clic sobre el sueldo líquido.</p>
      </div>
    </div>
  );
};

export default History;
