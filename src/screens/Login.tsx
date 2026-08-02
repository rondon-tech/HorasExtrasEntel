import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Lock, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                className="form-control" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
            {loading ? 'Verificando...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
