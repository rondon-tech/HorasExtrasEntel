import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Lock } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/login', { username, password });
      if (response.data.token) {
        login(response.data.token);
      }
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      const errorMessage = typeof apiError === 'object' && apiError !== null 
        ? (apiError.message || JSON.stringify(apiError))
        : (apiError || 'Error al iniciar sesión');
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>
        <div className="flex-center" style={{ flexDirection: 'column', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(0, 102, 255, 0.1)', color: 'var(--accent-blue)', padding: '1rem', borderRadius: '50%', marginBottom: '1.25rem' }}>
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-bold mb-1">Entel Horas Extras</h2>
          <p className="text-sm text-secondary">Acceso a la plataforma de gestión</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Usuario</label>
            <input 
              type="text" 
              className="form-control" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: admin"
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña</label>
            <input 
              type="password" 
              className="form-control" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Verificando...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
