import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { TAREAS_OPTIONS, TAREA_PLACEHOLDER, SITIOS_SUGERIDOS, NEMONICO_MAX_LENGTH } from '../constants/tasks';
import { formatCLP } from '../utils/format';
import { Spinner } from '../components/Spinner';
import { Camera } from 'lucide-react';

const Expenses: React.FC = () => {
  const { id: editingId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { expenses, params, addExpense, editExpense, isLoading } = useAppContext();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nemonico, setNemonico] = useState('');
  const [description, setDescription] = useState<string>(TAREA_PLACEHOLDER);
  const [saving, setSaving] = useState(false);
  const [ocrState, setOcrState] = useState<'idle' | 'processing' | 'review'>('idle');
  const fileRef = React.useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1280;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas no disponible'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.readAsDataURL(file);
  });

  const handleOcr = async (file: File) => {
    setOcrState('processing');
    try {
      const base64 = await compressImage(file);
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/agent/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ imageBase64: base64, mediaType: 'image/jpeg' }),
      });
      if (!res.ok) throw new Error('El OCR no está disponible ahora.');
      const json = await res.json();
      if (json.data?.fecha) setDate(json.data.fecha);
      if (json.data?.total) setDescription(json.data.total >= 20000 ? 'Trabajo en Altura' : TAREAS_OPTIONS[0]);
      setOcrState('review');
      toast.success('Ticket leído por IA. Revisa fecha y descripción antes de guardar.', { duration: 5000 });
    } catch (err) {
      setOcrState('idle');
      toast.error(err instanceof Error ? err.message : 'Error al procesar el ticket');
    }
  };

  useEffect(() => {
    if (editingId) {
      const expense = expenses.find(e => e.id === editingId);
      if (expense) {
        setDate(expense.date);
        setNemonico(expense.nemonico);
        setDescription(expense.description);
      }
    }
  }, [editingId, expenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNemonico = nemonico.trim().toUpperCase().slice(0, NEMONICO_MAX_LENGTH);
    if (!cleanNemonico) {
      toast.error('Por favor, escriba el nemónico del sitio visitado.');
      return;
    }
    if (description === TAREA_PLACEHOLDER) {
      toast.error('Por favor, seleccione una descripción de tarea válida.');
      return;
    }

    setSaving(true);

    const expenseData = {
      date,
      nemonico: cleanNemonico,
      description
    };

    try {
      if (editingId) {
        await editExpense(editingId, expenseData);
        toast.success('Viático actualizado');
        navigate('/records');
      } else {
        await addExpense(expenseData);
        toast.success('Viático guardado');
        setDescription(TAREA_PLACEHOLDER);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el viático';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {isLoading && <Spinner />}
      <h2 className="mb-6 text-xl">{editingId ? 'Editar Viático' : 'Módulo de Viáticos (Bono Gestión)'}</h2>

      {!editingId && (
        <div className="glass-card mb-6" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'space-between' }}>
          <div>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>Foto del ticket (IA opcional)</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {ocrState === 'review' ? '✓ Datos extraídos — revisa el formulario' : 'La IA extrae la fecha y sugiere la descripción'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ocrState === 'review' && (
              <button type="button" className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }} onClick={() => setOcrState('idle')}>Limpiar</button>
            )}
            <button type="button" className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} disabled={ocrState === 'processing'} onClick={() => fileRef.current?.click()}>
              <Camera size={16} aria-hidden="true" />
              {ocrState === 'processing' ? 'Leyendo...' : 'Tomar/Elegir foto'}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOcr(f); e.target.value = ''; }}
          />
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="glass-card mb-6">
        <div className="grid-2 mb-4">
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="expense-date">Fecha</label>
            <input
              id="expense-date"
              type="date"
              className="form-control"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="expense-nemonico">Nemónico</label>
            <input
              id="expense-nemonico"
              type="text"
              className="form-control"
              value={nemonico}
              onChange={e => setNemonico(e.target.value.toUpperCase())}
              list="nemonico-sugerencias"
              placeholder="Ej: SA575"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={NEMONICO_MAX_LENGTH}
              required
            />
            <datalist id="nemonico-sugerencias">
              {SITIOS_SUGERIDOS.map(n => <option key={n} value={n} />)}
            </datalist>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Escriba el nemónico del sitio o elija uno sugerido.
            </p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="expense-description">Descripción Tarea</label>
          <select
            id="expense-description"
            className="form-control"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          >
            {TAREAS_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="mt-4 mb-4 p-3 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
          <div className="flex-between">
            <span className="text-sm text-secondary">Valor automático por este viático:</span>
            <span className="font-bold text-green">{formatCLP(params.viaticoRate)}</span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          {saving && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
          {editingId ? (saving ? 'Guardando...' : 'Guardar Cambios') : (saving ? 'Guardando...' : 'Guardar Viático')}
        </button>
      </form>
    </div>
  );
};

export default Expenses;
