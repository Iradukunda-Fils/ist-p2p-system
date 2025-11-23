import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { TokenRefreshDebug } from '@/components/auth/TokenRefreshDebug';
import { TokenExpiryIndicator } from '@/components/auth/TokenExpiryIndicator';
import { secureCookieManager } from '@/utils/cookies';

/**
 * Simple diagnostic component to test if routing and auth are working
 */
export const AuthDiagnostic: React.FC = () => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        console.log('[AuthDiagnostic] Rendered at:', location.pathname);
        console.log('[AuthDiagnostic] Auth state:', { isAuthenticated, user });
    }, [location.pathname, isAuthenticated, user]);

    const handleNavigate = (path: string) => {
        console.log('[AuthDiagnostic] Navigating to:', path);
        navigate(path);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>🔍 Auth Diagnostic Page</h1>
            
            <div style={{ background: isAuthenticated ? '#d4edda' : '#f8d7da', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
                <h2>Authentication Status</h2>
                <p><strong>Is Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                <p><strong>User:</strong> {user ? user.username : 'Not logged in'}</p>
                <p><strong>Role:</strong> {user ? user.role : 'N/A'}</p>
                <p><strong>Current Path:</strong> {location.pathname}</p>
            </div>

            <div style={{ background: '#f0f0f0', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
                <h2>LocalStorage Check</h2>
                <p><strong>Access Token:</strong> {localStorage.getItem('access_token') ? '✅ Present' : '❌ Missing'}</p>
                <p><strong>Refresh Token:</strong> {localStorage.getItem('refresh_token') ? '✅ Present' : '❌ Missing'}</p>
                <p><strong>User Data:</strong> {localStorage.getItem('user') ? '✅ Present' : '❌ Missing'}</p>
            </div>

            <div style={{ background: '#fff', padding: '15px', margin: '20px 0', borderRadius: '5px', border: '1px solid #ddd' }}>
                <h2>Navigation Test</h2>
                <button onClick={() => handleNavigate('/dashboard')} style={{ margin: '5px', padding: '10px 15px' }}>
                    Go to Dashboard
                </button>
                <button onClick={() => handleNavigate('/login')} style={{ margin: '5px', padding: '10px 15px' }}>
                    Go to Login
                </button>
                <button onClick={() => handleNavigate('/requests')} style={{ margin: '5px', padding: '10px 15px' }}>
                    Go to Requests
                </button>
            </div>

            {/* Enhanced Token Status */}
            {isAuthenticated && (
                <div style={{ background: '#e7f3ff', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
                    <h2>Token Status</h2>
                    <TokenExpiryIndicator showDetails={true} showRefreshStatus={true} />
                </div>
            )}

            {/* Cookie Information */}
            <div style={{ background: '#f0f0f0', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
                <h2>Cookie Storage Check</h2>
                <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '3px', overflow: 'auto', fontSize: '12px' }}>
                    {JSON.stringify(secureCookieManager.getExpirationInfo(), null, 2)}
                </pre>
            </div>

            {/* Enhanced Token Refresh Debug */}
            {isAuthenticated && (
                <div style={{ margin: '20px 0' }}>
                    <TokenRefreshDebug />
                </div>
            )}

            <div style={{ background: '#fff3cd', padding: '15px', margin: '20px 0', borderRadius: '5px' }}>
                <h2>Debug Info</h2>
                <pre style={{ background: '#f4f4f4', padding: '10px', borderRadius: '3px', overflow: 'auto' }}>
                    {JSON.stringify({
                        location: location.pathname,
                        isAuthenticated,
                        user,
                        localStorage: {
                            access_token: !!localStorage.getItem('access_token'),
                            refresh_token: !!localStorage.getItem('refresh_token'),
                            user: !!localStorage.getItem('user')
                        },
                        cookies: {
                            hasValidAuthData: secureCookieManager.hasValidAuthData(),
                            needsRefresh: secureCookieManager.needsTokenRefresh(),
                            sessionActive: secureCookieManager.isSessionActive()
                        }
                    }, null, 2)}
                </pre>
            </div>
        </div>
    );
};

export default AuthDiagnostic;
