import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext, type DayType } from '../context/AppContext';
import { format } from 'date-fns';
import { TAREAS_OPTIONS, TAREA_PLACEHOLDER } from '../constants/tasks';
import { Save } from 'lucide-react';
import { Spinner } from '../components/Spinner';
import AnimatedSubmitButton from '../components/AnimatedSubmitButton';

const dayTypes: DayType[] = ['Normal', 'TAD', 'TAD Apoyo'];

const DailyRecord: React.FC = () => {
  const { id: editingId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { records, addRecord, editRecord, isLoading } = useAppContext();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dayType, setDayType] = useState<DayType>('Normal');
  const [isFeriado, setIsFeriado] = useState(false);
  const [isContingencia, setIsContingencia] = useState(false);
  const [sitio, setSitio] = useState('');
  const [numeroTarea, setNumeroTarea] = useState('');
  const [tarea, setTarea] = useState<string>(TAREA_PLACEHOLDER);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [computedHours, setComputedHours] = useState(0);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'success'>('idle');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) =>
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));

  // Validación visual en tiempo real (espejo de las reglas del servidor;
  // la validación real sigue ocurriendo en handleSubmit y en el backend).
  const numeroTareaDuplicate =
    numeroTarea.trim() !== '' &&
    records.some((r) => r.numeroTarea?.trim() === numeroTarea.trim() && r.id !== editingId);
  const fieldErrors: Record<string, string | null> = {
    date: date ? null : 'La fecha es obligatoria.',
    sitio: sitio.trim() ? null : 'El sitio es obligatorio.',
    numeroTarea: !numeroTarea.trim()
      ? 'El número de tarea es obligatorio.'
      : numeroTareaDuplicate
        ? 'Este número de tarea ya fue registrado.'
        : null,
    tarea: tarea === TAREA_PLACEHOLDER ? 'Seleccione una descripción válida.' : null,
    time: !startTime || !endTime
      ? 'Ingrese hora de inicio y fin.'
      : startTime === endTime
        ? 'La hora de inicio y fin no pueden ser iguales.'
        : null,
  };
  const showError = (field: string) => (touched[field] ? fieldErrors[field] : null);
  const formValid = Object.values(fieldErrors).every((e) => !e);

  useEffect(() => {
    if (editingId) {
      const record = records.find(r => r.id === editingId);
      if (record) {
        setDate(record.date);
        setDayType(record.dayType);
        setIsFeriado(record.isFeriado || false);
        setIsContingencia(record.isContingencia || false);
        setSitio(record.sitio);
        setNumeroTarea(record.numeroTarea || '');
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
        setTimeError('La hora final es anterior a la inicial. Si es turno nocturno, las horas se calculan correctamente.');
      } else {
        setTimeError(null);
      }
      
      const diffMs = end.getTime() - start.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      setComputedHours(Math.max(0, diffHrs));
    } else {
      setComputedHours(0);
      setTimeError(null);
    }
  }, [startTime, endTime]);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tarea === TAREA_PLACEHOLDER) {
      toast.error('Por favor, seleccione una descripción de tarea válida.');
      return;
    }
    if (numeroTarea.trim() !== '') {
      const isDuplicate = records.some(r => r.numeroTarea?.trim() === numeroTarea.trim() && r.id !== editingId);
      if (isDuplicate) {
        toast.error('Este número de tarea ya ha sido registrado anteriormente.');
        return;
      }
    }

    setSaveState('pending');

    const recordData = {
      date,
      dayType,
      isFeriado,
      isContingencia,
      startTime,
      endTime,
      sitio,
      numeroTarea,
      tarea,
      extraHours: computedHours
    };

    try {
      console.log('Enviando a POST /records:', recordData);
      if (editingId) {
        await editRecord(editingId, recordData);
      } else {
        await addRecord(recordData);
      }
      // Morph de éxito antes del comportamiento habitual.
      setSaveState('success');
      await new Promise((resolve) => setTimeout(resolve, 900));
      if (editingId) {
        toast.success('Registro actualizado');
        navigate('/records');
      } else {
        toast.success('Registro guardado correctamente');
        setSitio('');
        setNumeroTarea('');
        setTarea(TAREA_PLACEHOLDER);
        setStartTime('');
        setEndTime('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
        setDayType('Normal');
        setIsFeriado(false);
        setIsContingencia(false);
        setSaveState('idle');
      }
    } catch (error: any) {
      const serverData = error.serverData;
      const status = error.status;
      let message = error.message || 'Error al guardar el registro';
      
      if (serverData?.details) {
        message = serverData.details.map((d: any) => d.message).join(', ');
      } else if (serverData?.detail) {
        message = serverData.detail;
      } else if (serverData?.message) {
        message = serverData.message;
      }
      
      if (status) {
        message = `[${status}] ${message}`;
      }
      
      toast.error(message, { duration: 8000 });
      console.group('Error al guardar registro');
      console.error('Status:', status);
      console.error('Message:', error.message);
      console.error('ServerData:', serverData);
      console.error('Full Error:', error);
      console.groupEnd();
      setSaveState('idle');
    }
  };

  return (
    <div>
      {isLoading && <Spinner />}
      <h2 className="mb-6 text-xl">{editingId ? 'Editar Registro' : 'Registro Diario de Actividad'}</h2>

      <form onSubmit={handleSubmit} className="glass-card" noValidate>
        <div className="form-stack">
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="record-date">Fecha</label>
            <input
              id="record-date"
              type="date"
              className={`form-control${showError('date') ? ' form-control-invalid' : ''}`}
              value={date}
              onChange={e => setDate(e.target.value)}
              onBlur={() => markTouched('date')}
              aria-invalid={!!showError('date')}
              required
            />
            {showError('date') && <p className="form-error">{showError('date')}</p>}
          </div>
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="record-daytype">Condición del Día</label>
            <select
              id="record-daytype"
              className="form-control"
              value={dayType}
              onChange={e => setDayType(e.target.value as DayType)}
            >
              {dayTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Atributos Especiales (Opcional)</label>
            <div className="grid-2" style={{ gap: '0.5rem' }}>
              <label className="flex items-center" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minHeight: '48px' }}>
                <input type="checkbox" checked={isFeriado} onChange={e => setIsFeriado(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
                <span className="text-sm">Día Feriado / Domingo</span>
              </label>
              <label className="flex items-center" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minHeight: '48px' }}>
                <input type="checkbox" checked={isContingencia} onChange={e => setIsContingencia(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem' }} />
                <span className="text-sm">En Contingencia</span>
              </label>
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="record-sitio">Sitio</label>
            <input
              id="record-sitio"
              type="text"
              className={`form-control${showError('sitio') ? ' form-control-invalid' : ''}`}
              value={sitio}
              onChange={e => setSitio(e.target.value)}
              onBlur={() => markTouched('sitio')}
              aria-invalid={!!showError('sitio')}
              placeholder="Nombre del sitio (ej: Florida 1)"
              required
            />
            {showError('sitio') && <p className="form-error">{showError('sitio')}</p>}
          </div>
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="record-numero">Número de tarea</label>
            <input
              id="record-numero"
              type="text"
              className={`form-control${showError('numeroTarea') ? ' form-control-invalid' : ''}`}
              value={numeroTarea}
              onChange={e => setNumeroTarea(e.target.value)}
              onBlur={() => markTouched('numeroTarea')}
              aria-invalid={!!showError('numeroTarea')}
              placeholder="ID / N° de tarea"
              required
            />
            {showError('numeroTarea') && <p className="form-error">{showError('numeroTarea')}</p>}
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="record-tarea">Descripción Tarea</label>
            <select
              id="record-tarea"
              className={`form-control${showError('tarea') ? ' form-control-invalid' : ''}`}
              value={tarea}
              onChange={e => setTarea(e.target.value)}
              onBlur={() => markTouched('tarea')}
              aria-invalid={!!showError('tarea')}
              required
            >
              {TAREAS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {showError('tarea') && <p className="form-error">{showError('tarea')}</p>}
          </div>

          <div className="form-group mb-0 p-4 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
            <h3 className="text-md mb-4 text-orange">Registro de Horas Extras</h3>
            <div className="grid-2">
              <div>
                <label className="text-xs text-secondary mb-1 block" htmlFor="record-start">Hora de Inicio</label>
                <input
                  id="record-start"
                  type="time"
                  className={`form-control${showError('time') ? ' form-control-invalid' : ''}`}
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  onBlur={() => markTouched('time')}
                  aria-invalid={!!showError('time')}
                />
              </div>
              <div>
                <label className="text-xs text-secondary mb-1 block" htmlFor="record-end">Hora Final</label>
                <input
                  id="record-end"
                  type="time"
                  className={`form-control${showError('time') ? ' form-control-invalid' : ''}`}
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  onBlur={() => markTouched('time')}
                  aria-invalid={!!showError('time')}
                />
              </div>
            </div>
            {timeError && (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.35rem' }}>{timeError}</p>
            )}
            {showError('time') && (
              <p className="form-error">{showError('time')}</p>
            )}

            <div className="mt-4 flex-between border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-sm text-secondary">Total Horas Extras Calculadas:</span>
              <span className="font-bold text-lg text-green">{computedHours.toFixed(2)} hrs</span>
            </div>
          </div>
        </div>

        <AnimatedSubmitButton
          type="submit"
          className="btn btn-primary btn-block btn-sticky-bottom mt-6"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          icon={<Save size={18} aria-hidden="true" />}
          isPending={saveState === 'pending'}
          isSuccess={saveState === 'success'}
          successLabel={editingId ? 'Actualizado' : 'Guardado'}
          disabled={!formValid}
        >
          {editingId ? 'Guardar Cambios' : 'Guardar Registro'}
        </AnimatedSubmitButton>
      </form>
    </div>
  );
};

export default DailyRecord;
