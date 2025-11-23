import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();
    const { username, role } = user ?? {};

    console.log('[ProtectedRoute]', { 
        path: location.pathname,
        isAuthenticated,
        username,
        role,
        requiredRoles: roles
    });

    if (!isAuthenticated) {
        console.log('[ProtectedRoute] Not authenticated, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const isAuthorized = !roles || (role && roles.includes(role));
    if (!isAuthorized) {
        console.log('[ProtectedRoute] User role not authorized, redirecting to dashboard');
        return <Navigate to="/dashboard" replace />;
    }

    console.log('[ProtectedRoute] Access granted');
    return <>{children}</>;
};
