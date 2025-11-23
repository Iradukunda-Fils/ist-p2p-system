/**
 * Cross-tab session synchronization utilities
 * Ensures auth state is synchronized across all browser tabs
 */

// BroadcastChannel for modern browsers
const CHANNEL_NAME = 'auth_sync_channel';
let broadcastChannel: BroadcastChannel | null = null;

// Initialize BroadcastChannel if supported
if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
}

export type AuthSyncMessage = {
    type: 'LOGIN' | 'LOGOUT' | 'TOKEN_REFRESH';
    timestamp: number;
    user?: any;
};

/**
 * Broadcast auth event to all tabs
 */
export const broadcastAuthEvent = (message: AuthSyncMessage): void => {
    if (broadcastChannel) {
        broadcastChannel.postMessage(message);
    }
    
    // Fallback: Use localStorage event for older browsers
    // localStorage events fire across tabs when storage is modified
    localStorage.setItem('auth_sync_event', JSON.stringify({
        ...message,
        timestamp: Date.now(),
    }));
    
    // Clean up the sync event immediately (we only need the event trigger)
    setTimeout(() => {
        localStorage.removeItem('auth_sync_event');
    }, 100);
};

/**
 * Subscribe to auth events from other tabs
 */
export const subscribeToAuthEvents = (callback: (message: AuthSyncMessage) => void): (() => void) => {
    // BroadcastChannel listener
    const handleBroadcast = (event: MessageEvent<AuthSyncMessage>) => {
        callback(event.data);
    };

    if (broadcastChannel) {
        broadcastChannel.addEventListener('message', handleBroadcast);
    }

    // Storage event listener (fallback for older browsers)
    const handleStorage = (event: StorageEvent) => {
        if (event.key === 'auth_sync_event' && event.newValue) {
            try {
                const message: AuthSyncMessage = JSON.parse(event.newValue);
                callback(message);
            } catch (error) {
                console.error('[Auth Sync] Failed to parse storage event:', error);
            }
        }
    };

    window.addEventListener('storage', handleStorage);

    // Return cleanup function
    return () => {
        if (broadcastChannel) {
            broadcastChannel.removeEventListener('message', handleBroadcast);
        }
        window.removeEventListener('storage', handleStorage);
    };
};

/**
 * Close the broadcast channel (call on app unmount)
 */
export const closeAuthSync = (): void => {
    if (broadcastChannel) {
        broadcastChannel.close();
        broadcastChannel = null;
    }
};
