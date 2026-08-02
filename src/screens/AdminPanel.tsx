import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Shield, RotateCcw, Trash2, Users } from 'lucide-react';
import { apiClient } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Spinner } from '../components/Spinner';

interface User {
  id: string;
  username: string;
  role: string;
  password_change_required: boolean;
  created_at: string;
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);

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

  const totalPages = Math.ceil(total / limit);

  const handleReset = async () => {
    if (!confirmReset) return;
    try {
      const { data } = await apiClient.post(`/admin/users/${confirmReset}/reset-password`);
      toast.success(`Contraseña reseteada. Temporal: ${data.tempPassword}`);
      setConfirmReset(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al resetear contraseña');
      setConfirmReset(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiClient.delete(`/admin/users/${confirmDelete}`);
      toast.success('Usuario eliminado correctamente');
      setConfirmDelete(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar usuario');
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div className="flex-center" style={{ gap: '0.5rem' }}>
          <Shield size={20} className="text-green" />
          <h2 className="text-xl m-0">Administración de Usuarios</h2>
        </div>
        <span className="text-xs text-secondary">{total} usuario{total !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-secondary mb-6">Gestiona usuarios, resetea contraseñas y administra cuentas.</p>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={thStyle}>Usuario</th>
                  <th style={thStyle}>Rol</th>
                  <th style={thStyle}>Creado</th>
                  <th style={thStyle}>Estado</th>
                  <th style={{ ...thStyle, textAlign: 'right', paddingRight: '1rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tdStyle}>
                      <div className="flex-center" style={{ gap: '0.5rem', justifyContent: 'flex-start' }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: user.role === 'global_admin' ? 'rgba(16,185,129,0.15)' : 'rgba(0,102,255,0.15)',
                          color: user.role === 'global_admin' ? 'var(--accent-green)' : 'var(--accent-blue)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700,
                        }}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold">{user.username}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem',
                        fontWeight: 600, textTransform: 'uppercase',
                        background: user.role === 'global_admin' ? 'rgba(16,185,129,0.15)' : 'rgba(0,102,255,0.1)',
                        color: user.role === 'global_admin' ? 'var(--accent-green)' : 'var(--accent-blue)',
                      }}>
                        {user.role === 'global_admin' ? 'Admin' : 'Usuario'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span className="text-xs text-secondary">
                        {format(parseISO(user.created_at), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.15rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem',
                        fontWeight: 600,
                        background: user.password_change_required ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.1)',
                        color: user.password_change_required ? 'var(--accent-orange)' : 'var(--accent-green)',
                      }}>
                        {user.password_change_required ? 'Pendiente cambio' : 'Activo'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setConfirmReset(user.id)}
                          style={{ background: 'rgba(245,158,11,0.1)', border: 'none', color: 'var(--accent-orange)', cursor: 'pointer', padding: '0.3rem', borderRadius: '0.35rem', display: 'flex' }}
                          title="Resetear contraseña"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(user.id)}
                          style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '0.3rem', borderRadius: '0.35rem', display: 'flex' }}
                          title="Eliminar usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Users size={20} style={{ marginBottom: '0.5rem' }} />
                      <p>No hay usuarios registrados</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex-center mt-4" style={{ gap: '0.75rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', opacity: page === 1 ? 0.4 : 1 }}
              >
                Anterior
              </button>
              <span className="text-xs text-secondary">Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', opacity: page === totalPages ? 0.4 : 1 }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!confirmReset}
        title="Resetear contraseña"
        message="Se generará una nueva contraseña temporal. El usuario deberá cambiarla en su próximo inicio de sesión."
        confirmLabel="Resetear"
        cancelLabel="Cancelar"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(null)}
        danger={false}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Eliminar usuario"
        message="¿Estás seguro de eliminar este usuario? Todos sus registros, viáticos y parámetros serán eliminados permanentemente."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        danger
      />
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 0.5rem',
  fontWeight: 600,
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
};

const tdStyle: React.CSSProperties = {
  padding: '0.65rem 0.5rem',
  verticalAlign: 'middle',
};

export default AdminPanel;
