import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title = 'Confirmar acción',
  message,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  danger = true,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 2000, padding: '1rem'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '380px', padding: '1.5rem' }}>
        <div className="flex-center mb-3" style={{ gap: '0.75rem' }}>
          <div style={{
            background: danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 102, 255, 0.1)',
            color: danger ? 'var(--accent-red)' : 'var(--accent-blue)',
            padding: '0.75rem',
            borderRadius: '50%'
          }}>
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg m-0">{title}</h3>
        </div>
        <p className="text-sm text-secondary text-center mb-4">{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            className="btn flex-1"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.65rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn flex-1"
            style={{
              background: danger ? 'var(--accent-red)' : 'var(--accent-blue)',
              border: 'none',
              color: 'white',
              padding: '0.65rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
