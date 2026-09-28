import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Shield, RotateCcw, Trash2, UserPlus, Pencil, X, Users, Bot, FileText, Activity, AlertTriangle, Check, XCircle } from 'lucide-react';
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


interface AnomalyRow {
  id: string;
  record_id: string;
  user_id: string;
  username: string;
  type: string;
  score: string | number;
  reasons: unknown;
  status: 'open' | 'reviewed' | 'dismissed';
  record_date: string;
  start_time: string | null;
  end_time: string | null;
  extra_hours: string | number | null;
  sitio: string | null;
  tarea: string | null;
  created_at: string;
}

const ANOMALY_LABELS: Record<string, string> = {
  daily_cap_exceeded: 'Tope diario excedido',
  extra_hours_exceed_shift: 'Extras > duracion del turno',
  inconsistent_time_window: 'Ventana horaria inconsistente',
  monthly_cap_exceeded: 'Tope mensual excedido',
};

const AnomalySection: React.FC = () => {
  const [rows, setRows] = useState<AnomalyRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'reviewed' | 'dismissed' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async (status: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/agent/anomalies/all', { params: status ? { status } : {} });
      setRows(res.data.data);
    } catch {
      setError('No se pudo cargar las anomalias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnomalies(statusFilter); }, [statusFilter, fetchAnomalies]);

  const updateStatus = async (id: string, status: 'reviewed' | 'dismissed') => {
    setActing(id);
    try {
      await apiClient.patch('/agent/anomalies/' + id, { status });
      setRows((prev) => prev ? prev.filter((r) => r.id !== id) : prev);
    } catch {
      setError('No se pudo actualizar la anomalia.');
    } finally {
      setActing(null);
    }
  };

  const parseReasons = (reasons: unknown): string[] => {
    if (Array.isArray(reasons)) return reasons.map(String);
    try { const p = JSON.parse(String(reasons)); return Array.isArray(p) ? p.map(String) : []; } catch { return []; }
  };

  const openCount = rows?.filter((r) => r.status === 'open').length ?? 0;

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="flex-between" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={18} style={{ color: openCount > 0 ? '#f59e0b' : 'var(--accent-green)' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
            Anomalias detectadas (A1) {openCount > 0 && <span style={{ color: '#f59e0b' }}>({openCount} abiertas)</span>}
          </h3>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
          aria-label="Filtrar por estado"
        >
          <option value="">Todas</option>
          <option value="open">Abiertas</option>
          <option value="reviewed">Revisadas</option>
          <option value="dismissed">Descartadas</option>
        </select>
      </div>
      {loading && <Spinner />}
      {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</p>}
      {rows && rows.length === 0 && !loading && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Sin anomalias para este filtro.</p>
      )}
      {rows && rows.map((r) => (
        <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.65rem 0.75rem', marginBottom: '0.5rem', background: 'var(--bg-secondary)' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ fontSize: '0.82rem' }}>
              <strong>{r.username}</strong> · {ANOMALY_LABELS[r.type] || r.type}
              <span style={{ marginLeft: '0.5rem', color: Number(r.score) >= 80 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>score {Number(r.score)}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {r.status === 'open' && (
                <>
                  <button onClick={() => updateStatus(r.id, 'reviewed')} disabled={acting === r.id} title="Marcar como revisada"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.55rem', fontSize: '0.72rem', borderRadius: '0.4rem', border: '1px solid var(--accent-green)', background: 'transparent', color: 'var(--accent-green)', cursor: 'pointer' }}>
                    <Check size={12} aria-hidden="true" /> Revisada
                  </button>
                  <button onClick={() => updateStatus(r.id, 'dismissed')} disabled={acting === r.id} title="Descartar (falso positivo)"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.55rem', fontSize: '0.72rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <XCircle size={12} aria-hidden="true" /> Descartar
                  </button>
                </>
              )}
              {r.status !== 'open' && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.status === 'reviewed' ? '✓ Revisada' : 'Descartada'}</span>}
            </div>
          </div>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {r.record_date} · turno {r.start_time?.slice(0, 5)}-{r.end_time?.slice(0, 5)} · {r.extra_hours}h extras · {r.sitio} · {r.tarea}
          </p>
          {parseReasons(r.reasons).map((reason, i) => (
            <p key={i} style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>• {reason}</p>
          ))}
        </div>
      ))}
    </div>
  );
};

// ── Agent usage (IA) ──
interface UsageRow {
  gateway: string;
  model: string;
  ok_count: string;
  fail_count: string;
  avg_latency_ms: number | null;
  tokens_in: number;
  tokens_out: number;
}

const AgentUsageSection: React.FC = () => {
  const [rows, setRows] = useState<UsageRow[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/agent/usage', { params: { days: 7 } });
      setRows(res.data.data);
    } catch (err) {
      setError('No se pudo cargar el uso de IA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={18} style={{ color: 'var(--accent-green)' }} />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Uso de agentes IA (7 días)</h3>
        </div>
        <button onClick={fetchUsage} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
          Actualizar
        </button>
      </div>
      {loading && <Spinner />}
      {error && <p role="alert" style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.8rem' }}>{error}</p>}
      {rows && (
        rows.length === 0
          ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin invocaciones registradas todavía.</p>
          : <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Gateway</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Modelo</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>OK</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Fallos</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Latencia</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Tokens (in/out)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.gateway}:${r.model}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>{r.gateway}</td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>{r.model}</td>
                      <td style={{ padding: '0.4rem 0.5rem', color: 'var(--accent-green)' }}>{r.ok_count}</td>
                      <td style={{ padding: '0.4rem 0.5rem', color: Number(r.fail_count) > 0 ? '#f59e0b' : 'inherit' }}>{r.fail_count}</td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>{r.avg_latency_ms !== null ? `${(r.avg_latency_ms / 1000).toFixed(1)}s` : '—'}</td>
                      <td style={{ padding: '0.4rem 0.5rem', color: 'var(--text-muted)' }}>{r.tokens_in}/{r.tokens_out}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </div>
  );
};
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

  const [report, setReport] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState('');

  const runDiagnosis = useCallback(async () => {
    setDiagLoading(true);
    setDiagError('');
    try {
      const res = await apiClient.post('/agent/ops/diagnosis', {});
      setDiagnosis(res.data.data.diagnosis);
    } catch (err) {
      setDiagError(err instanceof Error ? err.message : 'No se pudo ejecutar el diagnostico.');
    } finally {
      setDiagLoading(false);
    }
  }, []);

  const [reportError, setReportError] = useState('');

  const generateReport = useCallback(async () => {
    setReportLoading(true);
    setReportError('');
    try {
      const now = new Date();
      const res = await apiClient.post('/agent/reports/monthly', {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
      setReport(res.data.data.report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'No se pudo generar el reporte.');
    } finally {
      setReportLoading(false);
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
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
  }, [page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleReset = async () => {
    if (!confirmReset) return;
    try {
      await apiClient.post(`/admin/users/${confirmReset}/reset-password`);
      toast.success('Contraseña reseteada exitosamente.');
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
          <div className="glass-card admin-users-card">
            <div className="admin-users-header admin-users-grid">
              <span>Usuario</span>
              <span>Email</span>
              <span>Rol</span>
              <span>Creado</span>
              <span>Estado</span>
              <span className="admin-actions-heading">Acciones</span>
            </div>

            {users.map(user => (
              <div key={user.id} className="admin-user-row admin-users-grid">
                <div className="admin-user-cell admin-user-identity">
                  <div
                    className="admin-avatar"
                    style={{ background: avatarBg(user.id), color: avatarColor(user.id) }}
                  >
                    {user.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-user-name">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <span>@{user.username}</span>
                  </div>
                </div>
                <div className="admin-user-cell admin-email">{user.email}</div>
                <div className="admin-user-cell admin-role">
                  <span className={`admin-badge ${user.role === 'global_admin' ? 'admin-badge-admin' : 'admin-badge-user'}`}>
                    {user.role === 'global_admin' ? 'Admin' : 'Usuario'}
                  </span>
                </div>
                <div className="admin-user-cell admin-date">
                  {format(parseISO(user.createdAt), 'dd MMM yyyy', { locale: es })}
                </div>
                <div className="admin-user-cell admin-status">
                  <span className={`admin-badge ${user.password_change_required ? 'admin-badge-pending' : 'admin-badge-active'}`}>
                    {user.password_change_required ? 'Pendiente' : 'Activo'}
                  </span>
                </div>
                <div className="admin-user-cell admin-actions">
                  <button onClick={() => setEditingUser(user)} className="admin-action admin-action-edit" title="Editar usuario" aria-label={`Editar ${user.username}`}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setConfirmReset(user.id)} className="admin-action admin-action-reset" title="Resetear contraseña" aria-label={`Resetear contraseña de ${user.username}`}>
                    <RotateCcw size={16} />
                  </button>
                  <button onClick={() => setConfirmDelete(user.id)} className="admin-action admin-action-delete" title="Eliminar usuario" aria-label={`Eliminar ${user.username}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="admin-empty-state">
                <Users size={24} />
                <p>No hay usuarios registrados</p>
              </div>
            )}
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

      <AgentUsageSection />

      <AnomalySection />

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: 'var(--accent-green)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Diagnostico del sistema (A5)</h3>
          </div>
          <button onClick={runDiagnosis} className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }} disabled={diagLoading}>
            {diagLoading ? 'Diagnosticando...' : 'Ejecutar diagnostico'}
          </button>
        </div>
        {diagLoading && <Spinner />}
        {diagError && <p role="alert" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{diagError}</p>}
        {diagnosis && (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.82rem', lineHeight: 1.55, background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', margin: 0 }}>
            {diagnosis}
          </pre>
        )}
        {!diagnosis && !diagLoading && !diagError && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Revisa salud de BD, failover, gateways activos y errores de IA de las ultimas 24 horas.
          </p>
        )}
      </div>


      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--accent-green)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Reporte mensual de liquidaciones (IA)</h3>
          </div>
          <button onClick={generateReport} className="btn btn-primary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }} disabled={reportLoading}>
            {reportLoading ? 'Generando...' : 'Generar reporte'}
          </button>
        </div>
        {reportLoading && <Spinner />}
        {reportError && <p role="alert" style={{ color: '#ef4444', fontSize: '0.8rem' }}>{reportError}</p>}
        {report && (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.82rem', lineHeight: 1.55, background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', margin: 0 }}>
            {report}
          </pre>
        )}
        {!report && !reportLoading && !reportError && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Genera un informe ejecutivo con resumen por técnico, anomalias abiertas y observaciones para el cierre del mes.
          </p>
        )}
      </div>


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

export default AdminPanel;
