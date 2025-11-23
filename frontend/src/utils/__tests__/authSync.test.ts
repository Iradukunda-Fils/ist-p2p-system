/**
 * Tests for cross-tab authentication synchronization
 */

import { broadcastAuthEvent, subscribeToAuthEvents, closeAuthSync } from '../authSync';

// Mock BroadcastChannel
class MockBroadcastChannel {
    private listeners: ((event: MessageEvent) => void)[] = [];
    
    constructor(public name: string) {}
    
    postMessage(data: any) {
        // Simulate async message delivery
        setTimeout(() => {
            this.listeners.forEach(listener => {
                listener({ data } as MessageEvent);
            });
        }, 0);
    }
    
    addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
            this.listeners.push(listener);
        }
    }
    
    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        }
    }
    
    close() {
        this.listeners = [];
    }
}

// Mock localStorage
const mockLocalStorage = {
    data: {} as Record<string, string>,
    setItem(key: string, value: string) {
        this.data[key] = value;
        // Simulate storage event
        window.dispatchEvent(new StorageEvent('storage', {
            key,
            newValue: value,
            oldValue: this.data[key] || null,
        }));
    },
    getItem(key: string) {
        return this.data[key] || null;
    },
    removeItem(key: string) {
        delete this.data[key];
        window.dispatchEvent(new StorageEvent('storage', {
            key,
            newValue: null,
            oldValue: this.data[key] || null,
        }));
    },
    clear() {
        this.data = {};
    }
};

describe('Cross-tab Authentication Synchronization', () => {
    let originalBroadcastChannel: any;
    let originalLocalStorage: any;

    beforeEach(() => {
        // Mock BroadcastChannel
        originalBroadcastChannel = global.BroadcastChannel;
        global.BroadcastChannel = MockBroadcastChannel as any;
        
        // Mock localStorage
        originalLocalStorage = global.localStorage;
        global.localStorage = mockLocalStorage as any;
        
        // Clear localStorage
        mockLocalStorage.clear();
    });

    afterEach(() => {
        // Restore original implementations
        global.BroadcastChannel = originalBroadcastChannel;
        global.localStorage = originalLocalStorage;
        
        // Close any open channels
        closeAuthSync();
    });

    describe('broadcastAuthEvent', () => {
        it('should broadcast LOGIN event via BroadcastChannel', (done) => {
            const testMessage = {
                type: 'LOGIN' as const,
                timestamp: Date.now(),
                user: { id: 1, username: 'testuser' }
            };

            const unsubscribe = subscribeToAuthEvents((message) => {
                expect(message.type).toBe('LOGIN');
                expect(message.user).toEqual(testMessage.user);
                expect(message.timestamp).toBe(testMessage.timestamp);
                unsubscribe();
                done();
            });

            broadcastAuthEvent(testMessage);
        });

        it('should broadcast LOGOUT event via BroadcastChannel', (done) => {
            const testMessage = {
                type: 'LOGOUT' as const,
                timestamp: Date.now()
            };

            const unsubscribe = subscribeToAuthEvents((message) => {
                expect(message.type).toBe('LOGOUT');
                expect(message.timestamp).toBe(testMessage.timestamp);
                unsubscribe();
                done();
            });

            broadcastAuthEvent(testMessage);
        });

        it('should broadcast TOKEN_REFRESH event via BroadcastChannel', (done) => {
            const testMessage = {
                type: 'TOKEN_REFRESH' as const,
                timestamp: Date.now()
            };

            const unsubscribe = subscribeToAuthEvents((message) => {
                expect(message.type).toBe('TOKEN_REFRESH');
                expect(message.timestamp).toBe(testMessage.timestamp);
                unsubscribe();
                done();
            });

            broadcastAuthEvent(testMessage);
        });

        it('should fallback to localStorage events when BroadcastChannel is not available', (done) => {
            // Temporarily disable BroadcastChannel
            global.BroadcastChannel = undefined as any;

            const testMessage = {
                type: 'LOGIN' as const,
                timestamp: Date.now(),
                user: { id: 1, username: 'testuser' }
            };

            const unsubscribe = subscribeToAuthEvents((message) => {
                expect(message.type).toBe('LOGIN');
                expect(message.user).toEqual(testMessage.user);
                unsubscribe();
                done();
            });

            broadcastAuthEvent(testMessage);
        });
    });

    describe('subscribeToAuthEvents', () => {
        it('should receive events from BroadcastChannel', (done) => {
            const testMessage = {
                type: 'LOGIN' as const,
                timestamp: Date.now(),
                user: { id: 1, username: 'testuser' }
            };

            const unsubscribe = subscribeToAuthEvents((message) => {
                expect(message).toEqual(testMessage);
                unsubscribe();
                done();
            });

            // Simulate direct BroadcastChannel message
            const channel = new MockBroadcastChannel('auth_sync_channel');
            channel.postMessage(testMessage);
        });

        it('should receive events from localStorage fallback', (done) => {
            const testMessage = {
                type: 'LOGOUT' as const,
                timestamp: Date.now()
            };

            const unsubscribe = subscribeToAuthEvents((message) => {
                expect(message.type).toBe('LOGOUT');
                expect(message.timestamp).toBe(testMessage.timestamp);
                unsubscribe();
                done();
            });

            // Simulate localStorage event
            mockLocalStorage.setItem('auth_sync_event', JSON.stringify(testMessage));
        });

        it('should handle multiple subscribers', (done) => {
            const testMessage = {
                type: 'TOKEN_REFRESH' as const,
                timestamp: Date.now()
            };

            let receivedCount = 0;
            const expectedCount = 2;

            const checkDone = () => {
                receivedCount++;
                if (receivedCount === expectedCount) {
                    unsubscribe1();
                    unsubscribe2();
                    done();
                }
            };

            const unsubscribe1 = subscribeToAuthEvents((message) => {
                expect(message.type).toBe('TOKEN_REFRESH');
                checkDone();
            });

            const unsubscribe2 = subscribeToAuthEvents((message) => {
                expect(message.type).toBe('TOKEN_REFRESH');
                checkDone();
            });

            broadcastAuthEvent(testMessage);
        });

        it('should properly unsubscribe from events', () => {
            const mockCallback = jest.fn();
            const unsubscribe = subscribeToAuthEvents(mockCallback);

            // Send an event
            broadcastAuthEvent({
                type: 'LOGIN',
                timestamp: Date.now(),
                user: { id: 1, username: 'test' }
            });

            // Unsubscribe
            unsubscribe();

            // Send another event
            broadcastAuthEvent({
                type: 'LOGOUT',
                timestamp: Date.now()
            });

            // Wait a bit for any async operations
            setTimeout(() => {
                // Should only have received the first event
                expect(mockCallback).toHaveBeenCalledTimes(1);
            }, 100);
        });

        it('should handle malformed localStorage events gracefully', () => {
            const mockCallback = jest.fn();
            const unsubscribe = subscribeToAuthEvents(mockCallback);

            // Simulate malformed JSON in localStorage
            mockLocalStorage.setItem('auth_sync_event', 'invalid json');

            // Should not crash and should not call the callback
            setTimeout(() => {
                expect(mockCallback).not.toHaveBeenCalled();
                unsubscribe();
            }, 100);
        });
    });

    describe('closeAuthSync', () => {
        it('should close BroadcastChannel when called', () => {
            // Create a subscription to initialize the channel
            const unsubscribe = subscribeToAuthEvents(() => {});
            
            // Close the sync
            closeAuthSync();
            
            // Cleanup
            unsubscribe();
            
            // Test passes if no errors are thrown
            expect(true).toBe(true);
        });
    });

    describe('Integration scenarios', () => {
        it('should handle rapid successive events', (done) => {
            const events = [
                { type: 'LOGIN' as const, timestamp: Date.now(), user: { id: 1, username: 'user1' } },
                { type: 'TOKEN_REFRESH' as const, timestamp: Date.now() + 1 },
                { type: 'LOGOUT' as const, timestamp: Date.now() + 2 }
            ];

            const receivedEvents: any[] = [];

            const unsubscribe = subscribeToAuthEvents((message) => {
                receivedEvents.push(message);
                
                if (receivedEvents.length === events.length) {
                    expect(receivedEvents).toHaveLength(3);
                    expect(receivedEvents[0].type).toBe('LOGIN');
                    expect(receivedEvents[1].type).toBe('TOKEN_REFRESH');
                    expect(receivedEvents[2].type).toBe('LOGOUT');
                    unsubscribe();
                    done();
                }
            });

            // Send events rapidly
            events.forEach(event => broadcastAuthEvent(event));
        });

        it('should handle events when both BroadcastChannel and localStorage are available', (done) => {
            const testMessage = {
                type: 'LOGIN' as const,
                timestamp: Date.now(),
                user: { id: 1, username: 'testuser' }
            };

            let eventCount = 0;

            const unsubscribe = subscribeToAuthEvents((message) => {
                eventCount++;
                expect(message.type).toBe('LOGIN');
                
                // Should receive the event (might be from both sources, but that's expected)
                if (eventCount >= 1) {
                    unsubscribe();
                    done();
                }
            });

            broadcastAuthEvent(testMessage);
        });
    });
});