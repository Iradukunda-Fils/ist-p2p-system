/**
 * Hook to track user activity and extend authentication session
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

interface UseActivityTrackerOptions {
    /**
     * Events to track for activity
     * @default ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
     */
    events?: string[];
    
    /**
     * Throttle activity updates (in milliseconds)
     * @default 30000 (30 seconds)
     */
    throttleMs?: number;
    
    /**
     * Only track activity when user is authenticated
     * @default true
     */
    onlyWhenAuthenticated?: boolean;
}

export const useActivityTracker = (options: UseActivityTrackerOptions = {}) => {
    const {
        events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
        throttleMs = 30000, // 30 seconds
        onlyWhenAuthenticated = true,
    } = options;

    const { updateActivity, isAuthenticated } = useAuthStore();

    // Throttled activity update function
    const throttledUpdateActivity = useCallback(() => {
        let lastUpdate = 0;
        
        return () => {
            const now = Date.now();
            if (now - lastUpdate >= throttleMs) {
                lastUpdate = now;
                
                // Only update if user is authenticated (if option is enabled)
                if (!onlyWhenAuthenticated || isAuthenticated) {
                    updateActivity();
                }
            }
        };
    }, [updateActivity, isAuthenticated, throttleMs, onlyWhenAuthenticated]);

    const handleActivity = throttledUpdateActivity();

    useEffect(() => {
        // Add event listeners for activity tracking
        events.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });

        // Cleanup event listeners
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
        };
    }, [events, handleActivity]);

    // Return activity tracking status
    return {
        isTracking: onlyWhenAuthenticated ? isAuthenticated : true,
    };
};