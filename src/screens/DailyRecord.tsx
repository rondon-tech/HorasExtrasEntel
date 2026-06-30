import React, { useState, useEffect } from 'react';
import { useAppContext, type DayType } from '../context/AppContext';
import { format } from 'date-fns';

const tareasOptions = [
  "Seleccione Descripcion ...",
  "Calidad / Mediciones / Survey",
  "Capacitación / Acreditación",
  "Fiscalización",
  "Incidencia en Sitio",
  "Instalación Menor / Apoyo en Antenas",
  "Logística: Cambio de Camioneta / Trámites Administrativos",
  "Logística: Gestión de BIN / VIN / Bidones",
  "Logística: Gestión de Llaves",
  "Logística: Retiro / Devolución de Repuestos y Equipos",
  "Mantenimiento Correctivo Clima",
  "Mantenimiento Correctivo DX",
  "Mantenimiento Correctivo Energía",
  "Mantenimiento Correctivo RAN",
  "Mantenimiento Correctivo TX",
  "Mantenimiento Preventivo GGEE",
  "Mantenimiento Proactivo / Preventivo",
  "Recarga de Combustible",
  "Respaldo con GGEE",
  "Traslado a Domicilio"
];

const dayTypes: DayType[] = ['Normal', 'TAD', 'TAD Apoyo'];

interface Props {
  editingId?: string | null;
  onSave?: () => void;
}

const DailyRecord: React.FC<Props> = ({ editingId, onSave }) => {
  const { records, addRecord, editRecord } = useAppContext();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dayType, setDayType] = useState<DayType>('Normal');
  const [isFeriado, setIsFeriado] = useState(false);
  const [isContingencia, setIsContingencia] = useState(false);
  const [sitio, setSitio] = useState('');
  const [tarea, setTarea] = useState(tareasOptions[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [computedHours, setComputedHours] = useState(0);

  useEffect(() => {
    if (editingId) {
      const record = records.find(r => r.id === editingId);
      if (record) {
        setDate(record.date);
        setDayType(record.dayType);
        setIsFeriado(record.isFeriado || false);
        setIsContingencia(record.isContingencia || false);
        setSitio(record.sitio);
        setTarea(record.tarea);
        setStartTime(record.startTime);
        setEndTime(record.endTime);
        setComputedHours(record.extraHours);
      }
    }
  }, [editingId, records]);

  // Auto-calculate hours
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`1970-01-01T${startTime}:00`);
      let end = new Date(`1970-01-01T${endTime}:00`);
      
      if (end < start) {
        end = new Date(`1970-01-02T${endTime}:00`);
      }
      
      const diffMs = end.getTime() - start.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      setComputedHours(Math.max(0, diffHrs));
    } else {
      setComputedHours(0);
    }
  }, [startTime, endTime]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tarea === tareasOptions[0]) {
      alert('Por favor, seleccione una descripción de tarea válida.');
      return;
    }

    const recordData = {
      date,
      dayType,
      isFeriado,
      isContingencia,
      startTime,
      endTime,
      sitio,
      tarea,
      extraHours: computedHours
    };

    if (editingId) {
      editRecord(editingId, recordData);
      alert('Registro actualizado');
      if (onSave) onSave();
    } else {
      addRecord(recordData);
      alert('Registro guardado correctamente');
      setSitio('');
      setTarea(tareasOptions[0]);
      setStartTime('');
      setEndTime('');
    }
  };

  return (
    <div>
      <h2 className="mb-6 text-xl">{editingId ? 'Editar Registro' : 'Registro Diario de Actividad'}</h2>
      
      <form onSubmit={handleSubmit} className="glass-card">
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Condición del Día</label>
            <select className="form-control" value={dayType} onChange={e => setDayType(e.target.value as DayType)}>
              {dayTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group mt-2 mb-4">
          <label className="form-label">Atributos Especiales (Opcional)</label>
          <div className="grid-2" style={{ gap: '0.5rem' }}>
            <label className="flex items-center" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={isFeriado} onChange={e => setIsFeriado(e.target.checked)} />
              <span className="text-sm">Día Feriado / Domingo</span>
            </label>
            <label className="flex items-center" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={isContingencia} onChange={e => setIsContingencia(e.target.checked)} />
              <span className="text-sm">En Contingencia</span>
            </label>
          </div>
        </div>

        <div className="form-group border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          <label className="form-label">Sitio</label>
          <input 
            type="text" 
            className="form-control" 
            value={sitio} 
            onChange={e => setSitio(e.target.value)}
            placeholder="Nombre del sitio (ej: Florida 1)"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Descripción Tarea</label>
          <select 
            className="form-control" 
            value={tarea} 
            onChange={e => setTarea(e.target.value)}
            required
          >
            {tareasOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="form-group mt-6 p-4 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-md mb-4 text-orange">Registro de Horas Extras</h3>
          <div className="grid-2">
            <div>
              <label className="text-xs text-secondary mb-1 block">Hora de Inicio</label>
              <input 
                type="time" 
                className="form-control" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Hora Final</label>
              <input 
                type="time" 
                className="form-control" 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="mt-4 flex-between border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-sm text-secondary">Total Horas Extras Calculadas:</span>
            <span className="font-bold text-lg text-green">{computedHours.toFixed(2)} hrs</span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block mt-6">
          {editingId ? 'Guardar Cambios' : 'Guardar Tarea del Día'}
        </button>
      </form>
    </div>
  );
};

export default DailyRecord;
