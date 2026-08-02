import React from 'react';
import { useAuth } from '../context/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, fallback = null }) => {
  const { role } = useAuth();
  if (role !== 'global_admin') return <>{fallback}</>;
  return <>{children}</>;
};
