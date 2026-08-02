import React from 'react';
import { WifiOff } from 'lucide-react';
import { useHealthCheck } from '../hooks/useHealthCheck';

export const HealthBanner: React.FC = () => {
  const { isHealthy, retry } = useHealthCheck();

  if (isHealthy) return null;

  return (
    <div style={{
      background: 'var(--accent-red)',
      color: 'white',
      padding: '0.75rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem',
      fontSize: '0.875rem',
      fontWeight: 500,
      position: 'sticky',
      top: 0,
      zIndex: 999,
    }}>
      <WifiOff size={16} />
      <span>Sin conexión con el servidor. Verifique su conexión a internet.</span>
      <button
        onClick={retry}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'white',
          padding: '0.25rem 0.75rem',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.8rem',
        }}
      >
        Reintentar
      </button>
    </div>
  );
};
