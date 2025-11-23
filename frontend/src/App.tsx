import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppRoutes } from './routes';
import { useAuthStore } from '@/store/authStore';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useActivityTracker } from '@/hooks/useActivityTracker';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

function App() {
    const { isAuthenticated, user, initializeAuthSync } = useAuthStore();

    // Track user activity to extend session
    useActivityTracker({
        throttleMs: 30000, // Update activity every 30 seconds max
        onlyWhenAuthenticated: true,
    });

    // Initialize cross-tab synchronization
    useEffect(() => {
        console.log('[App] Initializing cross-tab auth sync');
        const cleanup = initializeAuthSync();
        
        // Cleanup on unmount
        return () => {
            console.log('[App] Cleaning up cross-tab auth sync');
            cleanup();
        };
    }, [initializeAuthSync]);

    // Debug logging
    useEffect(() => {
        console.log('[App] Auth state changed:', { isAuthenticated, user: user?.username });
    }, [isAuthenticated, user]);

    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <AuthGuard>
                    <AppRoutes />
                </AuthGuard>
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
            </ErrorBoundary>
        </QueryClientProvider>
    );
}

export default App;
