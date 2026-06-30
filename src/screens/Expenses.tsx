import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
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

interface Props {
  editingId?: string | null;
  onSave?: () => void;
}

const Expenses: React.FC<Props> = ({ editingId, onSave }) => {
  const { expenses, params, addExpense, editExpense } = useAppContext();
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [nemonico, setNemonico] = useState('SA575');
  const [description, setDescription] = useState(tareasOptions[0]);

  const nemónicos = ['SA575', 'FN699', 'SA881', 'Otro'];

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
    if (description === tareasOptions[0]) {
      alert('Por favor, seleccione una descripción de tarea válida.');
      return;
    }
    
    const expenseData = {
      date,
      nemonico,
      description
    };

    if (editingId) {
      editExpense(editingId, expenseData);
      alert('Viático actualizado');
      if (onSave) onSave();
    } else {
      addExpense(expenseData);
      alert('Viático guardado');
      setDescription(tareasOptions[0]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  return (
    <div>
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
            {tareasOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="mt-4 mb-4 p-3 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)' }}>
          <div className="flex-between">
            <span className="text-sm text-secondary">Valor automático por este viático:</span>
            <span className="font-bold text-green">{formatCurrency(params.viaticoRate)}</span>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block">
          {editingId ? 'Guardar Cambios' : 'Guardar Viático'}
        </button>
      </form>
    </div>
  );
};

export default Expenses;
