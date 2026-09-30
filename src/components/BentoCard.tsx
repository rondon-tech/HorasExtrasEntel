import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface BentoCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  /** Icono Lucide junto al título. */
  icon?: LucideIcon;
  /** Clase de color para el icono (ej: "text-green"). */
  iconClassName?: string;
  /** Índice para escalonar la animación de entrada. */
  index?: number;
}

const BentoCard: React.FC<BentoCardProps> = ({
  title,
  children,
  className = '',
  onClick,
  ariaLabel,
  icon: Icon,
  iconClassName = 'text-blue',
  index = 0,
}) => {
  const interactive = typeof onClick === 'function';
  return (
    <motion.div
      className={`glass-card bento-card ${className}`}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={interactive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      {(title || Icon) && (
        <div className="flex-center mb-3" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
          {Icon && (
            <span
              aria-hidden="true"
              className={iconClassName}
              style={{
                display: 'inline-flex',
                background: 'rgba(148,163,184,0.12)',
                padding: '0.4rem',
                borderRadius: '0.5rem',
              }}
            >
              <Icon size={18} />
            </span>
          )}
          {title && <h3 className="text-sm text-secondary uppercase font-bold tracking-wider m-0">{title}</h3>}
        </div>
      )}
      {children}
    </motion.div>
  );
};

export default BentoCard;
