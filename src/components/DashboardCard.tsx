import React from 'react';

interface DashboardCardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, className = '', onClick }) => {
  return (
    <div className={`glass-card ${className}`} onClick={onClick}>
      {title && <h3 className="text-sm text-secondary uppercase font-bold tracking-wider mb-3">{title}</h3>}
      {children}
    </div>
  );
};

export default DashboardCard;
