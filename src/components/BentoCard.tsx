import React from 'react';

interface BentoCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

const BentoCard: React.FC<BentoCardProps> = ({ title, children, className = '', onClick, ariaLabel }) => {
  const interactive = typeof onClick === 'function';
  return (
    <div
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
    >
      {title && <h3 className="text-sm text-secondary uppercase font-bold tracking-wider mb-3">{title}</h3>}
      {children}
    </div>
  );
};

export default BentoCard;
