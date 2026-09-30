import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
}

/**
 * Marcador de carga (shimmer). Usar mapeado a la forma del contenido real
 * mientras las queries están en isPending/isLoading.
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius,
  className = '',
  style,
  label = 'Cargando contenido',
}) => {
  return (
    <span
      role="status"
      aria-label={label}
      className={`skeleton ${className}`}
      style={{ width, height, ...(borderRadius !== undefined ? { borderRadius } : {}), ...style }}
    />
  );
};

export default Skeleton;
