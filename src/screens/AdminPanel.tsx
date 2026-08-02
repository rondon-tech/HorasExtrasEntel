import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Shield, RotateCcw, Trash2, UserPlus, Pencil, X, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Spinner } from '../components/Spinner';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  role: string;
  password_change_required: boolean;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
}

const AVATAR_COLORS = [
  '#0066ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function avatarBg(id: string) {
  return avatarColor(id) + '20';
}

// ── Edit Modal ──
interface EditUserFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const EditUserModal: React.FC<{
  user: User | null;
  onClose: () => void;
  onSave: (id: string, data: EditUserFields) => Promise<void>;
}> = ({ user, onClose, onSave }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setError('');
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) { setError('El nombre es requerido.'); return; }
    if (!lastName.trim()) { setError('El apellido es requerido.'); return; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setError('Email válido requerido.'); return; }
    setSaving(true);
    try {
      await onSave(user.id, { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, padding: '1rem',
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '1.75rem' }}>
        <div className="flex-between mb-3">
          <h3 className="text-lg font-bold m-0">Editar Usuario</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-secondary mb-4">{user.firstName} {user.lastName} — @{user.username}</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre *</label>
            <input className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} maxLength={100} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Apellido *</label>
            <input className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} maxLength={100} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email *</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} maxLength={255} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Teléfono</label>
            <input className="form-control" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn flex-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.6rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
              {saving && <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Panel ──
const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/admin/users?page=${page}&limit=${limit}`);
      setUsers(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleReset = async () => {
    if (!confirmReset) return;
    try {
      const { data } = await apiClient.post(`/admin/users/${confirmReset}/reset-password`);
      toast.success(`Contraseña reseteada. Temporal: ${data.tempPassword}`);
      setConfirmReset(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al resetear');
      setConfirmReset(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiClient.delete(`/admin/users/${confirmDelete}`);
      toast.success('Usuario eliminado');
      setConfirmDelete(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
      setConfirmDelete(null);
    }
  };

  const handleEditSave = async (id: string, data: { firstName: string; lastName: string; email: string; phone: string }) => {
    await apiClient.put(`/admin/users/${id}`, data);
    toast.success('Usuario actualizado');
    fetchUsers();
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div className="flex-center" style={{ gap: '0.5rem' }}>
          <Shield size={20} className="text-green" />
          <h2 className="text-xl m-0">Administración de Usuarios</h2>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} usuario{total !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Gestiona usuarios, edita perfiles y administra cuentas.
      </p>

      <div className="flex-between mb-4">
        <span />
        <button
          onClick={() => navigate('/register')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
        >
          <UserPlus size={14} />
          Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.15)' }}>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Creado</th>
                  <th style={thStyle}>Estado</th>
                  <th style={{ ...thStyle, textAlign: 'center', paddingRight: '0.75rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tdStyle}>
                      <div className="flex-center" style={{ gap: '0.6rem', justifyContent: 'flex-start' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: avatarBg(user.id),
                          color: avatarColor(user.id),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {user.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm m-0" style={{ lineHeight: 1.3 }}>{user.firstName} {user.lastName}</p>
                          <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.email}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.68rem',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em',
                        background: user.role === 'global_admin' ? 'rgba(16,185,129,0.15)' : 'rgba(0,102,255,0.1)',
                        color: user.role === 'global_admin' ? 'var(--accent-green)' : 'var(--accent-blue)',
                      }}>
                        {user.role === 'global_admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {format(parseISO(user.createdAt), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.68rem',
                        fontWeight: 600, letterSpacing: '0.03em',
                        background: user.password_change_required ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.1)',
                        color: user.password_change_required ? 'var(--accent-orange)' : 'var(--accent-green)',
                      }}>
                        {user.password_change_required ? 'Pendiente' : 'Activo'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', paddingRight: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center' }}>
                        <button onClick={() => setEditingUser(user)} title="Editar"
                          style={actionBtnStyle('var(--accent-blue)')}>
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmReset(user.id)} title="Resetear contraseña"
                          style={actionBtnStyle('var(--accent-orange)')}>
                          <RotateCcw size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(user.id)} title="Eliminar"
                          style={actionBtnStyle('var(--accent-red)')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      <Users size={24} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                      <p className="m-0">No hay usuarios registrados</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex-center mt-4" style={{ gap: '0.75rem' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', opacity: page === 1 ? 0.35 : 1 }}>
                Anterior
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pág {page} de {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', opacity: page === totalPages ? 0.35 : 1 }}>
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleEditSave} />

      <ConfirmDialog isOpen={!!confirmReset} title="Resetear contraseña"
        message="Se generará una nueva contraseña temporal. El usuario deberá cambiarla en su próximo inicio de sesión."
        confirmLabel="Resetear" cancelLabel="Cancelar"
        onConfirm={handleReset} onCancel={() => setConfirmReset(null)} danger={false} />

      <ConfirmDialog isOpen={!!confirmDelete} title="Eliminar usuario"
        message="¿Estás seguro de eliminar este usuario? Todos sus registros, viáticos y parámetros serán eliminados permanentemente."
        confirmLabel="Eliminar" cancelLabel="Cancelar"
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} danger />
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.8rem 0.75rem',
  fontWeight: 500,
  fontSize: '0.68rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.85rem 0.75rem',
  verticalAlign: 'middle',
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    width: 30, height: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: color + '15', border: 'none', color,
    cursor: 'pointer', borderRadius: '0.4rem',
  };
}

export default AdminPanel;
