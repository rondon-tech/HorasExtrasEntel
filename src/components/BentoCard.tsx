import React from 'react';

interface BentoCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const BentoCard: React.FC<BentoCardProps> = ({ title, children, className = '', onClick }) => {
  return (
    <div className={`glass-card bento-card ${className}`} onClick={onClick}>
      {title && <h3 className="text-sm text-secondary uppercase font-bold tracking-wider mb-3">{title}</h3>}
      {children}
    </div>
  );
};

export default BentoCard;
