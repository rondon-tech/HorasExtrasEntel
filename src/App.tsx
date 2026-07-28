import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarPlus, History as HistoryIcon, Sun, Moon, PieChart, List, LogOut } from 'lucide-react';
import Login from './screens/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';

const Dashboard = lazy(() => import('./screens/Dashboard'));
const DailyRecord = lazy(() => import('./screens/DailyRecord'));
const Expenses = lazy(() => import('./screens/Expenses'));
const History = lazy(() => import('./screens/History'));
const Simulator = lazy(() => import('./screens/Simulator'));
const RecordsList = lazy(() => import('./screens/RecordsList'));

// Map URL paths to tab keys (used for bottom-nav active state)
const pathToTab: Record<string, string> = {
  '/': 'dashboard',
  '/record': 'record',
  '/expenses': 'expenses',
  '/records': 'records',
  '/simulator': 'simulator',
  '/settings': 'history',
};

function Layout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => localStorage.getItem('entel_theme') || 'dark');

  // Determine active tab from current URL
  const activeTab = pathToTab[location.pathname] || 'dashboard';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('entel_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const pages = [
    { tab: 'dashboard',  path: '/',           icon: Home,          label: 'Inicio',    short: 'dashboard' },
    { tab: 'records',    path: '/records',    icon: List,          label: 'Registros', short: 'records'   },
    { tab: 'record',     path: '/record',     icon: CalendarPlus,  label: 'Ingresar',  short: 'record'    },
    { tab: 'simulator',  path: '/simulator',  icon: PieChart,      label: 'Reporte',   short: 'simulator' },
    { tab: 'history',    path: '/settings',   icon: HistoryIcon,   label: 'Ajustes',   short: 'history'   },
  ];

  const isActive = (tab: string) => activeTab === tab;
  // "Ingresar" tab is active for both /record and /expenses
  const isIngresarActive = activeTab === 'record' || activeTab === 'expenses';

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <header className="flex-between" style={{ padding: '1.5rem 1.5rem 0' }}>
        <div className="font-bold text-xs text-secondary tracking-wider uppercase">Entel Horas Extras</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={logout}
            className="btn-icon"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
          <button
            onClick={toggleTheme}
            className="btn-icon"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
            title="Cambiar Tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="content-area" role="main">
        <Suspense fallback={<div className="flex-center" style={{ minHeight: '30vh' }}><p className="text-secondary">Cargando...</p></div>}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/record/:id?" element={<ErrorBoundary><DailyRecord /></ErrorBoundary>} />
          <Route path="/expenses/:id?" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
          <Route path="/records" element={<ErrorBoundary><RecordsList /></ErrorBoundary>} />
          <Route path="/simulator" element={<ErrorBoundary><Simulator /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><History /></ErrorBoundary>} />
        </Routes>
        </Suspense>
      </div>

      <nav className="bottom-nav" aria-label="Navegación principal">
        {pages.map(({ tab, path, icon: Icon, label }) => (
          <button
            key={tab}
            className={`nav-item ${tab === 'record' ? (isIngresarActive ? 'active' : '') : isActive(tab) ? 'active' : ''}`}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={tab === 'record' ? (isIngresarActive ? 'page' : undefined) : isActive(tab) ? 'page' : undefined}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function App() {
  return <Layout />;
}

export default App;