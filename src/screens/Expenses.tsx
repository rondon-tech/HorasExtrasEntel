import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { format } from 'date-fns';
import { TAREAS_OPTIONS, TAREA_PLACEHOLDER, NEMONICOS } from '../constants/tasks';
import { formatCLP } from '../utils/format';
import { Spinner } from '../components/Spinner';

const Expenses: React.FC = () => {
  const { id: editingId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { expenses, params, addExpense, editExpense, isLoading } = useAppContext();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nemonico, setNemonico] = useState('SA575');
  const [description, setDescription] = useState<string>(TAREA_PLACEHOLDER);
  const [saving, setSaving] = useState(false);

  const nemónicos = NEMONICOS.map(n => n); // keep local array ref for select

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description === TAREA_PLACEHOLDER) {
      toast.error('Por favor, seleccione una descripción de tarea válida.');
      return;
    }
    
    setSaving(true);

    const expenseData = {
      date,
      nemonico,
      description
    };

    if (editingId) {
      editExpense(editingId, expenseData);
      toast.success('Viático actualizado');
      setSaving(false);
      navigate('/records');
    } else {
      addExpense(expenseData);
      toast.success('Viático guardado');
      setDescription(TAREA_PLACEHOLDER);
      setSaving(false);
    }
  };

  return (
    <div>
      {isLoading && <Spinner />}
      <h2 className="mb-6 text-xl">{editingId ? 'Editar Viático' : 'Módulo de Viáticos (Bono Gestión)'}</h2>
      
      <form onSubmit={handleSubmit} className="glass-card mb-6">
        <div className="grid-2 mb-4">
          <div className="form-group mb-0">
            <label className="form-label">Fecha</label>
            <input 
              type="date" 
              className="form-control" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Nemónico</label>
            <select 
              className="form-control" 
              value={nemonico} 
              onChange={e => setNemonico(e.target.value)}
            >
              {nemónicos.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Descripción Tarea</label>
          <select 
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
