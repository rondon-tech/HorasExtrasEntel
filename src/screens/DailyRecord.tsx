import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext, type DayType } from '../context/AppContext';
import { format } from 'date-fns';
import { TAREAS_OPTIONS, TAREA_PLACEHOLDER } from '../constants/tasks';
import { Mic, Square } from 'lucide-react';
import { Spinner } from '../components/Spinner';

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
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const mediaRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

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
  

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = handleVoiceNote;
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error('No se pudo acceder al microfono.');
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const handleVoiceNote = async () => {
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    if (blob.size < 1000) { toast.error('Grabacion demasiado corta.'); return; }
    setVoiceProcessing(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(',')[1]);
        r.onerror = () => reject(new Error('No se pudo leer el audio'));
        r.readAsDataURL(blob);
      });
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/agent/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ audioBase64: b64, mediaType: 'audio/webm' }),
      });
      if (!res.ok) throw new Error('El dictado por voz no esta disponible ahora.');
      const json = await res.json();
      const d = json.data;
      if (d) {
        if (d.sitio) setSitio(d.sitio);
        if (d.numeroTarea) setNumeroTarea(d.numeroTarea);
        if (d.startTime) setStartTime(d.startTime);
        if (d.endTime) setEndTime(d.endTime);
        if (d.dayType) setDayType(d.dayType);
        if (d.isFeriado !== null && d.isFeriado !== undefined) setIsFeriado(d.isFeriado);
        if (d.isContingencia !== null && d.isContingencia !== undefined) setIsContingencia(d.isContingencia);
        if (d.tarea) {
          const match = TAREAS_OPTIONS.find((t) => t.toLowerCase().includes(d.tarea!.toLowerCase()) || d.tarea!.toLowerCase().includes(t.toLowerCase()));
          setTarea(match || d.tarea);
        }
        toast.success('Dictado procesado. Revisa los campos antes de guardar.', { duration: 5000 });
      } else {
        toast.success('Transcripcion: ' + (json.transcription || '').slice(0, 120), { duration: 6000 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar el dictado');
    } finally {
      setVoiceProcessing(false);
    }
  };

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

    setSaving(true);

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
        toast.success('Registro actualizado');
        navigate('/records');
      } else {
        await addRecord(recordData);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {isLoading && <Spinner />}
      <h2 className="mb-6 text-xl">{editingId ? 'Editar Registro' : 'Registro Diario de Actividad'}</h2>
      

      <div className="glass-card mb-6" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {voiceProcessing ? 'Procesando dictado con IA...' : recording ? 'Grabando... habla con claridad' : 'Dictado por voz (IA): "hoy estuve en Nagarove de 8 a 18, tarea fibonacci"'}
        </p>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={voiceProcessing}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.45rem 0.85rem', borderRadius: '0.5rem', cursor: 'pointer',
            border: '1px solid var(--border-color)',
            background: recording ? '#ef4444' : 'var(--bg-secondary)',
            color: recording ? 'white' : 'var(--text-primary)',
            fontSize: '0.78rem',
          }}
          aria-label={recording ? 'Detener grabacion' : 'Iniciar dictado'}
        >
          {recording ? <Square size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}
          {recording ? 'Detener' : 'Dictar'}
        </button>
      </div>

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

        <div className="grid-2 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
          <div className="form-group mb-0">
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
          <div className="form-group mb-0">
            <label className="form-label">Número de tarea</label>
            <input 
              type="text" 
              className="form-control" 
              value={numeroTarea} 
              onChange={e => setNumeroTarea(e.target.value)}
              placeholder="ID / N° de tarea"
              required
            />
          </div>
        </div>

        <div className="form-group mt-4">
          <label className="form-label">Descripción Tarea</label>
          <select 
            className="form-control" 
            value={tarea} 
            onChange={e => setTarea(e.target.value)}
            required
          >
            {TAREAS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
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
                style={timeError ? { borderColor: 'var(--accent-red)' } : undefined}
              />
            </div>
            <div>
              <label className="text-xs text-secondary mb-1 block">Hora Final</label>
              <input 
                type="time" 
                className="form-control" 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)}
                style={timeError ? { borderColor: 'var(--accent-red)' } : undefined}
              />
            </div>
          </div>
          {timeError && (
            <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '0.35rem' }}>{timeError}</p>
          )}
          
          <div className="mt-4 flex-between border-t pt-3" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-sm text-secondary">Total Horas Extras Calculadas:</span>
            <span className="font-bold text-lg text-green">{computedHours.toFixed(2)} hrs</span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block mt-6" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {saving && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
          {editingId ? (saving ? 'Guardando...' : 'Guardar Cambios') : (saving ? 'Guardando...' : 'Guardar Tarea del Día')}
        </button>
      </form>
    </div>
  );
};

export default DailyRecord;
