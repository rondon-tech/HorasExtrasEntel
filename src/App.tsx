import { useState, useEffect } from 'react';
import { Home, CalendarPlus, Receipt, History as HistoryIcon, Sun, Moon, PieChart, List } from 'lucide-react';
import Dashboard from './screens/Dashboard';
import DailyRecord from './screens/DailyRecord';
import Expenses from './screens/Expenses';
import History from './screens/History';
import Simulator from './screens/Simulator';
import RecordsList from './screens/RecordsList';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('entel_theme') || 'dark');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('entel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleEditRecord = (id: string) => {
    setEditingRecordId(id);
    setActiveTab('record');
  };

  const handleEditExpense = (id: string) => {
    setEditingExpenseId(id);
    setActiveTab('expenses');
  };

  // Clear editing state if navigating away manually
  useEffect(() => {
    if (activeTab !== 'record') setEditingRecordId(null);
    if (activeTab !== 'expenses') setEditingExpenseId(null);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'record':
        return <DailyRecord editingId={editingRecordId} onSave={() => setActiveTab('records')} />;
      case 'expenses':
        return <Expenses editingId={editingExpenseId} onSave={() => setActiveTab('records')} />;
      case 'records':
        return <RecordsList onEditRecord={handleEditRecord} onEditExpense={handleEditExpense} />;
      case 'simulator':
        return <Simulator />;
      case 'history':
        return <History />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      <header className="flex-between" style={{ padding: '1.5rem 1.5rem 0' }}>
        <div className="font-bold text-xs text-secondary tracking-wider uppercase">Entel Horas Extras</div>
        <button 
          onClick={toggleTheme}
          className="btn-icon"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
          title="Cambiar Tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <div className="content-area">
        {renderContent()}
      </div>

      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Home size={20} />
          <span>Inicio</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <List size={20} />
          <span>Registros</span>
        </button>
        <button 
          className={`nav-item ${(activeTab === 'record' || activeTab === 'expenses') ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          <CalendarPlus size={20} />
          <span>Ingresar</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <PieChart size={20} />
          <span>Reporte</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <HistoryIcon size={20} />
          <span>Ajustes</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
