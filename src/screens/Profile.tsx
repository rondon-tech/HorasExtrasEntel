import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Mail, Phone, Calendar, KeyRound, LogOut } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/Spinner';

interface ProfileData {
  id: string;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/profile')
      .then(r => { setProfile(r.data); setLoading(false); })
      .catch(() => { toast.error('Error al cargar el perfil'); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  if (!profile) return <p className="text-center text-secondary">No se pudo cargar el perfil.</p>;

  return (
    <div>
      <h2 className="text-xl mb-6">Perfil de Usuario</h2>

      <div className="glass-card" style={{ padding: '2rem', maxWidth: '480px' }}>
        <div className="flex-center mb-4" style={{ flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: profile.role === 'global_admin' ? 'rgba(16,185,129,0.15)' : 'rgba(0,102,255,0.15)',
            color: profile.role === 'global_admin' ? 'var(--accent-green)' : 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 700,
          }}>
            {profile.firstName.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-lg font-bold m-0">{profile.firstName} {profile.lastName}</h3>
          <span className="text-sm text-secondary">@{profile.username}</span>
          <span style={{
            padding: '0.15rem 0.75rem', borderRadius: '1rem', fontSize: '0.7rem',
            fontWeight: 600, textTransform: 'uppercase',
            background: profile.role === 'global_admin' ? 'rgba(16,185,129,0.15)' : 'rgba(0,102,255,0.1)',
            color: profile.role === 'global_admin' ? 'var(--accent-green)' : 'var(--accent-blue)',
          }}>
            {profile.role === 'global_admin' ? 'Administrador' : 'Usuario'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex-center" style={{ gap: '0.75rem', justifyContent: 'flex-start' }}>
            <Mail size={16} className="text-secondary" />
            <span className="text-sm">{profile.email}</span>
          </div>
          <div className="flex-center" style={{ gap: '0.75rem', justifyContent: 'flex-start' }}>
            <Phone size={16} className="text-secondary" />
            <span className="text-sm">{profile.phone}</span>
          </div>
          <div className="flex-center" style={{ gap: '0.75rem', justifyContent: 'flex-start' }}>
            <Calendar size={16} className="text-secondary" />
            <span className="text-sm">Creado el {format(parseISO(profile.createdAt), 'dd MMM yyyy', { locale: es })}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => navigate('/change-password')}
            className="btn btn-secondary btn-block"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <KeyRound size={16} />
            Cambiar Contraseña
          </button>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', background: 'transparent', border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)', padding: '0.55rem', borderRadius: '0.5rem',
              cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
