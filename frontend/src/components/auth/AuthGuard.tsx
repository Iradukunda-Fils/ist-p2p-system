import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoadingPage } from '@/components/common/Spinner';

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard component that handles initial authentication check
 * and provides loading state while authentication is being verified
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { checkAuth, isAuthenticated } = useAuthStore();
    const [isInitializing, setIsInitializing] = useState(true);
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

    useEffect(() => {
        const initializeAuth = async () => {
            if (hasCheckedAuth) return;

            try {
                console.log('[AuthGuard] Performing initial authentication check...');
                await checkAuth();
                console.log('[AuthGuard] Initial authentication check completed');
            } catch (error) {
                console.error('[AuthGuard] Error during initial auth check:', error);
            } finally {
                setHasCheckedAuth(true);
                setIsInitializing(false);
            }
        };

        initializeAuth();
    }, [checkAuth, hasCheckedAuth]);

    // Show loading screen while initializing authentication
    if (isInitializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <LoadingPage />
                    <p className="mt-4 text-gray-600">Initializing authentication...</p>
                </div>
            </div>
        );
    }

    // Authentication check completed, render children
    return <>{children}</>;
};