/**
 * Demonstration utility for enhanced cookie management
 * This file shows how to use the secure cookie utilities
 */

import { secureCookieManager } from './cookies';
import { User } from '../types';

/**
 * Demo function to showcase cookie utilities functionality
 */
export function demonstrateCookieUtilities(): void {
    console.log('=== Cookie Utilities Demonstration ===');

    // 1. Create mock tokens (in real app, these come from login API)
    const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.demo';
    const mockRefreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.refresh';
    
    const mockUser: User = {
        id: '123',
        username: 'demo_user',
        email: 'demo@example.com',
        role: 'staff'
    };

    // 2. Store authentication data
    console.log('1. Storing authentication data...');
    secureCookieManager.setAuthTokens(mockAccessToken, mockRefreshToken);
    secureCookieManager.setUserData(mockUser);
    
    // 3. Validate tokens
    console.log('2. Validating tokens...');
    const accessValidation = secureCookieManager.validateToken(mockAccessToken);
    console.log('Access token validation:', accessValidation);
    
    // 4. Check session status
    console.log('3. Checking session status...');
    console.log('Has valid auth data:', secureCookieManager.hasValidAuthData());
    console.log('Session active:', secureCookieManager.isSessionActive());
    console.log('Needs token refresh:', secureCookieManager.needsTokenRefresh());
    
    // 5. Get time until expiry
    console.log('4. Token expiry information...');
    const timeUntilExpiry = secureCookieManager.getTimeUntilExpiry();
    console.log('Time until expiry (ms):', timeUntilExpiry);
    console.log('Will expire soon (5 min):', secureCookieManager.willExpireSoon(5));
    
    // 6. Perform security check
    console.log('5. Security check...');
    const securityCheck = secureCookieManager.performSecurityCheck();
    console.log('Security check result:', securityCheck);
    
    // 7. Get debugging info
    console.log('6. Debugging information...');
    const debugInfo = secureCookieManager.getExpirationInfo();
    console.log('Cookie expiration info:', debugInfo);
    
    // 8. Retrieve stored data
    console.log('7. Retrieving stored data...');
    console.log('Access token:', secureCookieManager.getAccessToken()?.substring(0, 50) + '...');
    console.log('Refresh token:', secureCookieManager.getRefreshToken()?.substring(0, 50) + '...');
    console.log('User data:', secureCookieManager.getUserData());
    
    // 9. Session info
    console.log('8. Complete session info...');
    const sessionInfo = secureCookieManager.getSessionInfo();
    console.log('Session info:', {
        hasAccessToken: !!sessionInfo?.accessToken,
        hasRefreshToken: !!sessionInfo?.refreshToken,
        user: sessionInfo?.user,
        expiresAt: sessionInfo?.expiresAt ? new Date(sessionInfo.expiresAt).toISOString() : null,
        lastActivity: sessionInfo?.lastActivity ? new Date(sessionInfo.lastActivity).toISOString() : null
    });
    
    console.log('=== Demo Complete ===');
}

/**
 * Demo function to test cookie cleanup
 */
export function demonstrateCookieCleanup(): void {
    console.log('=== Cookie Cleanup Demonstration ===');
    
    // Show current state
    console.log('Before cleanup:');
    console.log('Has valid auth data:', secureCookieManager.hasValidAuthData());
    
    // Clear expired cookies
    console.log('Clearing expired cookies...');
    secureCookieManager.clearExpiredCookies();
    
    // Clear all auth data
    console.log('Clearing all auth data...');
    secureCookieManager.clearAuthData();
    
    // Show final state
    console.log('After cleanup:');
    console.log('Has valid auth data:', secureCookieManager.hasValidAuthData());
    console.log('Access token:', secureCookieManager.getAccessToken());
    console.log('User data:', secureCookieManager.getUserData());
    
    console.log('=== Cleanup Demo Complete ===');
}

/**
 * Export for use in browser console or components
 */
if (typeof window !== 'undefined') {
    (window as any).cookieDemo = {
        demonstrate: demonstrateCookieUtilities,
        cleanup: demonstrateCookieCleanup,
        manager: secureCookieManager
    };
    
    console.log('Cookie demo utilities available at window.cookieDemo');
    console.log('Try: window.cookieDemo.demonstrate()');
}