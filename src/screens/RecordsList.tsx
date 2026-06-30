import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecordsListProps {
  onEditRecord: (id: string) => void;
  onEditExpense: (id: string) => void;
}

const RecordsList: React.FC<RecordsListProps> = ({ onEditRecord, onEditExpense }) => {
  const { currentMonth, records, expenses, deleteRecord, deleteExpense, params } = useAppContext();
  const [filterType, setFilterType] = useState<'all' | 'records' | 'expenses'>('all');

  // We should list all records, maybe sorted by date descending
  const allItems = [
    ...records.map(r => ({ ...r, type: 'record' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const }))
  ];

  const sortedItems = allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredItems = sortedItems.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  return (
    <div>
      <h2 className="mb-6 text-xl">Gestor de Registros</h2>
      <p className="text-sm text-secondary mb-4">Aquí puedes auditar y editar todo lo que has ingresado. Estás viendo todo el historial.</p>

      <div className="flex-between mb-4">
        <select 
          className="form-control" 
          value={filterType} 
          onChange={e => setFilterType(e.target.value as 'all' | 'records' | 'expenses')}
          style={{ maxWidth: '200px' }}
        >
          <option value="all">Ver Todos</option>
          <option value="records">Solo Horas Extras</option>
          <option value="expenses">Solo Viáticos</option>
        </select>
      </div>

      <div className="expense-list" style={{ paddingBottom: '3rem' }}>
        {filteredItems.length === 0 ? (
          <p className="text-muted text-center py-4">No hay registros para mostrar.</p>
        ) : (
          filteredItems.map(item => {
            const isRecord = item.type === 'record';
            
            return (
              <div key={item.id} className="glass-card mb-2" style={{ padding: '1rem' }}>
                <div className="flex-between mb-2">
                  <span className="text-xs text-secondary font-bold" style={{textTransform:'uppercase'}}>
                    {format(parseISO(item.date), 'dd MMM yyyy', { locale: es })}
                  </span>
                  <span className={`badge ${isRecord ? 'badge-blue' : 'badge-green'}`}>
                    {isRecord ? 'Horas Extras' : 'Viático'}
                  </span>
                </div>
                
                <p className="font-bold mb-1">{isRecord ? item.sitio : item.nemonico}</p>
                <p className="text-sm text-secondary">{isRecord ? item.tarea : item.description}</p>
                
                {isRecord ? (
                  <div className="mt-2 text-xs text-orange">
                    {item.startTime} - {item.endTime} ({item.extraHours.toFixed(2)} hrs)
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-green">
                    Valor: {formatCurrency(params.viaticoRate)}
                  </div>
                )}

                <div className="flex-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <button 
                    onClick={() => isRecord ? onEditRecord(item.id) : onEditExpense(item.id)}
                    className="btn-icon text-sm text-blue bg-transparent border-none"
                    style={{ cursor: 'pointer' }}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('¿Estás seguro de que quieres eliminar esto?')) {
                        isRecord ? deleteRecord(item.id) : deleteExpense(item.id);
                      }
                    }}
                    className="btn-icon text-sm text-danger bg-transparent border-none"
                    style={{ cursor: 'pointer' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecordsList;
