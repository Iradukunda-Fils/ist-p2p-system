import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { APP_NAME } from '@/utils/constants';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, checkAuth } = useAuthStore();

    const from = (location.state as any)?.from?.pathname || '/dashboard';

    // Check for existing authentication on component mount
    useEffect(() => {
        const checkExistingAuth = async () => {
            try {
                await checkAuth();
            } catch (error) {
                console.error('[Login] Error checking existing auth:', error);
            } finally {
                setIsCheckingAuth(false);
            }
        };

        checkExistingAuth();
    }, [checkAuth]);

    // Redirect if user is already authenticated
    useEffect(() => {
        if (!isCheckingAuth && isAuthenticated) {
            console.log('[Login] User already authenticated, redirecting to:', from);
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, isCheckingAuth, navigate, from]);

    // Show loading spinner while checking authentication
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return; // prevent double submit
        setIsLoading(true);

        try {
            await login(username, password);
            showSuccessToast('Login successful!');
            navigate(from, { replace: true });
        } catch (error) {
            showErrorToast(error, 'Invalid username or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {APP_NAME}
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Sign in to your account
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <fieldset disabled={isLoading} className="space-y-4">
                        <Input
                            id="username"
                            label="Username"
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                        />
                        <Input
                            id="password"
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                        />
                        <div className="text-sm text-right">
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-blue-500 hover:underline"
                            >
                                {showPassword ? 'Hide' : 'Show'} password
                            </button>
                        </div>
                    </fieldset>

                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        Sign in
                    </Button>
                </form>
            </div>
        </div>
    );
};
