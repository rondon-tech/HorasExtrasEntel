import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Share2 } from 'lucide-react';
import { generateRecordsPDF } from '../utils/pdfGenerator';

interface RecordsListProps {
  onEditRecord: (id: string) => void;
  onEditExpense: (id: string) => void;
}

const RecordsList: React.FC<RecordsListProps> = ({ onEditRecord, onEditExpense }) => {
  const { records, expenses, deleteRecord, deleteExpense, params } = useAppContext();
  
  const currentDate = new Date();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'record' | 'expense' | 'feriado' | 'tap' | 'contingencia'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'hours'>('newest');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const allItems = [
    ...records.map(r => ({ ...r, type: 'record' as const })),
    ...expenses.map(e => ({ ...e, type: 'expense' as const }))
  ];

  // 1. Filter by Month/Year
  const timeFiltered = allItems.filter(item => {
    const [year, month] = item.date.split('-');
    return Number(year) === selectedYear && Number(month) === selectedMonth;
  });

  // 2. Filter by Category
  const categoryFiltered = timeFiltered.filter(item => {
    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'record') return item.type === 'record';
    if (categoryFilter === 'expense') return item.type === 'expense';
    
    if (item.type === 'expense') return false; 
    if (categoryFilter === 'feriado') return item.isFeriado;
    if (categoryFilter === 'tap') return item.dayType.includes('TAD');
    if (categoryFilter === 'contingencia') return item.isContingencia;
    return true;
  });

  // 3. Search Query
  const searchFiltered = categoryFiltered.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (item.type === 'record') {
      return (
        item.sitio.toLowerCase().includes(q) ||
        item.tarea.toLowerCase().includes(q) ||
        (item.numeroTarea && item.numeroTarea.toLowerCase().includes(q))
      );
    } else {
      return (
        item.nemonico.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
  });

  // 4. Sort
  const sortedItems = [...searchFiltered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'hours') {
      const hoursA = a.type === 'record' ? a.extraHours : 0;
      const hoursB = b.type === 'record' ? b.extraHours : 0;
      return hoursB - hoursA;
    }
    return 0;
  });

  const totalItems = sortedItems.length;
  const totalExtraHours = sortedItems.reduce((acc, item) => item.type === 'record' ? acc + item.extraHours : acc, 0);
  const totalExpenses = sortedItems.reduce((acc, item) => item.type === 'expense' ? acc + 1 : acc, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const handleDownloadPDF = () => {
    const monthName = new Date(2000, selectedMonth - 1).toLocaleString('es', { month: 'long' });
    const doc = generateRecordsPDF(sortedItems, monthName, selectedYear, totalItems, totalExtraHours, totalExpenses);
    doc.save(`Reporte_Horas_Extras_${monthName}_${selectedYear}.pdf`);
  };

  const handleSharePDF = async () => {
    const monthName = new Date(2000, selectedMonth - 1).toLocaleString('es', { month: 'long' });
    const doc = generateRecordsPDF(sortedItems, monthName, selectedYear, totalItems, totalExtraHours, totalExpenses);
    
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `Reporte_Horas_Extras_${monthName}_${selectedYear}.pdf`, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `Reporte Entel - ${monthName} ${selectedYear}`,
          text: `Adjunto el reporte de horas extras y viáticos filtrado (${totalItems} registros).`,
          files: [file]
        });
      } catch (err) {
        console.log('Error al compartir:', err);
      }
    } else {
      alert('Tu navegador no soporta compartir archivos nativamente. Se descargará el PDF en su lugar.');
      handleDownloadPDF();
    }
  };

  return (
    <div>
      <div className="flex-between mb-2">
        <h2 className="text-xl m-0">Auditoría Avanzada</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleSharePDF} className="btn-icon" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--accent-blue)' }} title="Compartir">
            <Share2 size={18} />
          </button>
          <button onClick={handleDownloadPDF} className="btn-icon" style={{ background: 'var(--accent-blue)', border: 'none', color: 'white' }} title="Descargar PDF">
            <Download size={18} />
          </button>
        </div>
      </div>
      <p className="text-sm text-secondary mb-6">Busca, filtra y analiza tus registros históricos detalladamente.</p>

      <div className="filter-section">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Buscar sitio, tarea o viático..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="flex-between">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="form-control text-sm" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ padding: '0.4rem 0.75rem' }}>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('es', { month: 'long' })}</option>
              ))}
            </select>
            <select className="form-control text-sm" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: '0.4rem 0.75rem' }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          
          <select className="form-control text-sm" value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ padding: '0.4rem 0.75rem' }}>
            <option value="newest">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="hours">Más horas extras</option>
          </select>
        </div>

        <div className="filter-pills">
          <button className={`pill-btn ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>Todos</button>
          <button className={`pill-btn ${categoryFilter === 'record' ? 'active' : ''}`} onClick={() => setCategoryFilter('record')}>Horas Extras</button>
          <button className={`pill-btn ${categoryFilter === 'expense' ? 'active' : ''}`} onClick={() => setCategoryFilter('expense')}>Viáticos</button>
          <button className={`pill-btn ${categoryFilter === 'tap' ? 'active' : ''}`} onClick={() => setCategoryFilter('tap')}>Días TAP</button>
          <button className={`pill-btn ${categoryFilter === 'contingencia' ? 'active' : ''}`} onClick={() => setCategoryFilter('contingencia')}>Contingencias</button>
          <button className={`pill-btn ${categoryFilter === 'feriado' ? 'active' : ''}`} onClick={() => setCategoryFilter('feriado')}>Feriados</button>
        </div>
      </div>

      <div className="mb-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Mostrando <strong style={{color:'var(--text-primary)'}}>{totalItems}</strong> registros • <strong style={{color:'var(--text-primary)'}}>{totalExtraHours.toFixed(1)} hrs</strong> totales • <strong style={{color:'var(--text-primary)'}}>{totalExpenses}</strong> viáticos
      </div>

      <div className="expense-list" style={{ paddingBottom: '3rem' }}>
        {sortedItems.length === 0 ? (
          <p className="text-muted text-center py-4">No se encontraron registros para estos filtros.</p>
        ) : (
          sortedItems.map(item => {
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
                {isRecord && item.numeroTarea && (
                  <p className="text-sm font-bold text-blue mb-1">N° Tarea: {item.numeroTarea}</p>
                )}
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
