import React from 'react';

interface SpinnerProps {
  size?: number;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 28 }) => (
  <div className="flex-center" style={{ minHeight: '40vh', flexDirection: 'column', gap: '1rem' }}>
    <div style={{
      width: size,
      height: size,
      border: '3px solid var(--border-color)',
      borderTopColor: 'var(--accent-blue)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <p className="text-sm text-secondary">Cargando...</p>
  </div>
);
