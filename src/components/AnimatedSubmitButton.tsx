import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface AnimatedSubmitButtonProps {
  type?: 'submit' | 'button' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  isPending: boolean;
  isSuccess: boolean;
  successLabel?: string;
  /** Icono visible solo en estado reposo (ej: <Save />). */
  icon?: React.ReactNode;
}

/**
 * Botón de guardado con micro-interacciones: escala al presionar,
 * spinner mientras envía y morph a check verde al tener éxito.
 */
const AnimatedSubmitButton: React.FC<AnimatedSubmitButtonProps> = ({
  type = 'submit',
  className,
  style,
  disabled,
  onClick,
  children,
  isPending,
  isSuccess,
  successLabel = 'Guardado',
  icon,
}) => {
  const inactive = disabled || isPending || isSuccess;
  return (
    <motion.button
      type={type}
      className={className}
      onClick={onClick}
      whileTap={inactive ? undefined : { scale: 0.95 }}
      transition={{ duration: 0.15 }}
      disabled={inactive}
      aria-live="polite"
      style={{
        ...(isSuccess
          ? {
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid var(--accent-green)',
              color: 'var(--accent-green)',
            }
          : {}),
        ...style,
      }}
    >
      {isSuccess ? (
        <>
          <Check size={18} aria-hidden="true" /> {successLabel}
        </>
      ) : isPending ? (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 16, height: 16,
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          {children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  );
};

export default AnimatedSubmitButton;
