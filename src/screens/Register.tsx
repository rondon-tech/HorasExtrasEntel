import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(username, password || undefined);
      toast.success('Usuario creado correctamente');
      navigate('/');
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      const errorMessage = typeof apiError === 'object' && apiError !== null
        ? (apiError.message || JSON.stringify(apiError))
        : (apiError || 'Error al crear el usuario');

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '80vh', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>
        <div className="flex-center" style={{ flexDirection: 'column', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-green)', padding: '1rem', borderRadius: '50%', marginBottom: '1.25rem' }}>
            <UserPlus size={28} />
          </div>
          <h2 className="text-2xl font-bold mb-1">Crear Nuevo Usuario</h2>
          <p className="text-sm text-secondary">Registro de cuenta para técnico</p>
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
              placeholder="Ej: tecnico1"
              required
              minLength={3}
              maxLength={100}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña (opcional — se genera automáticamente)</label>
            <input
              type="text"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Dejar vacío para contraseña automática"
              minLength={6}
              maxLength={128}
            />
          </div>
          <p className="text-xs text-secondary" style={{ marginTop: '-0.5rem' }}>
            Si no se especifica, se generará una contraseña temporal aleatoria.
          </p>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading && <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
            {loading ? 'Creando usuario...' : 'Crear Usuario'}
          </button>
        </form>
        <p className="text-xs text-secondary text-center mt-3" style={{ marginBottom: 0 }}>
          Al crear el usuario, iniciarás sesión automáticamente como él.
        </p>
      </div>
    </div>
  );
};

export default Register;
