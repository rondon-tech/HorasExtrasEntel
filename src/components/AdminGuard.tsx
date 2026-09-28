import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirect?: boolean;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, fallback = null, redirect = false }) => {
  const { role } = useAuth();
  if (role !== 'global_admin') {
    if (redirect) return <Navigate to="/" replace />;
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
