// Enhanced Event Bus for Euphorie 3D Platform
// UPDATED: Complete ChatBubble Integration v4.0
// Cross-module communication with advanced features

window.EventBus = {
    events: new Map(),
    oneTimeListeners: new Map(),
    isInitialized: false,
    debugMode: false,
    eventHistory: [],
    maxHistorySize: 100,
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('📡 Initializing Enhanced Event Bus with ChatBubble Support');
        this.isInitialized = true;
        
        // Set up global error handling
        this.on('error', (error) => {
            console.error('🚨 Global EventBus error:', error);
        });
        
        // Set up ChatBubble system events
        this.setupChatBubbleEvents();
        
        // Set up system integration events
        this.setupSystemIntegrationEvents();
        
        // Start event monitoring if debug mode
        if (this.debugMode) {
            this.startEventMonitoring();
        }
        
        console.log('✅ Enhanced Event Bus initialized');
        return Promise.resolve();
    },
    
    // CRITICAL: Set up specific events for ChatBubble system
    setupChatBubbleEvents: function() {
        // Avatar system events
        this.on('avatar:created', (data) => {
            if (this.debugMode) {
                console.log('📡 Avatar created event:', data);
            }
            this.addToHistory('avatar:created', data);
        });
        
        this.on('avatar:position-changed', (data) => {
            if (this.debugMode) {
                console.log('📡 Avatar position changed:', data);
            }
            this.addToHistory('avatar:position-changed', data);
        });
        
        this.on('avatar:removed', (data) => {
            if (this.debugMode) {
                console.log('📡 Avatar removed:', data);
            }
            this.addToHistory('avatar:removed', data);
        });
        
        // Scene system events
        this.on('scene:initialized', (data) => {
            console.log('📡 Scene initialized:', data);
            this.addToHistory('scene:initialized', data);
        });
        
        this.on('scene:preset-changed', (data) => {
            if (this.debugMode) {
                console.log('📡 Scene preset changed:', data);
            }
            this.addToHistory('scene:preset-changed', data);
        });
        
        // Chat message events
        this.on('chat_message', (data) => {
            if (this.debugMode) {
                console.log('📡 Chat message event:', data);
            }
            this.addToHistory('chat_message', data);
        });
        
        // System lifecycle events
        this.on('chat-bubble-system:initialized', (data) => {
            console.log('📡 ChatBubbleSystem initialized:', data);
            this.addToHistory('chat-bubble-system:initialized', data);
        });
        
        this.on('avatar-system:initialized', (data) => {
            console.log('📡 AvatarSystem initialized:', data);
            this.addToHistory('avatar-system:initialized', data);
        });
    },
    
    // Set up system integration events
    setupSystemIntegrationEvents: function() {
        // WebSocket integration
        this.on('websocket:connected', (data) => {
            console.log('📡 WebSocket connected:', data);
        });
        
        this.on('websocket:message', (data) => {
            if (this.debugMode) {
                console.log('📡 WebSocket message:', data);
            }
        });
        
        // Performance monitoring
        this.on('performance:warning', (data) => {
            console.warn('📡 Performance warning:', data);
        });
        
        this.on('performance:critical', (data) => {
            console.error('📡 Performance critical:', data);
        });
    },
    
    // Subscribe to an event
    on: function(eventName, callback) {
        if (typeof callback !== 'function') {
            console.warn(`📡 EventBus: Invalid callback for event "${eventName}"`);
            return () => {}; // Return empty unsubscribe function
        }
        
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        
        this.events.get(eventName).add(callback);
        
        if (this.debugMode) {
            console.log(`📡 Listener added for "${eventName}" (total: ${this.events.get(eventName).size})`);
        }
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    },
    
    // Subscribe to an event (one-time only)
    once: function(eventName, callback) {
        if (typeof callback !== 'function') {
            console.warn(`📡 EventBus: Invalid callback for event "${eventName}"`);
            return () => {};
        }
        
        if (!this.oneTimeListeners.has(eventName)) {
            this.oneTimeListeners.set(eventName, new Set());
        }
        
        this.oneTimeListeners.get(eventName).add(callback);
        
        if (this.debugMode) {
            console.log(`📡 One-time listener added for "${eventName}"`);
        }
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    },
    
    // Unsubscribe from an event
    off: function(eventName, callback) {
        // Remove from regular listeners
        if (this.events.has(eventName)) {
            this.events.get(eventName).delete(callback);
            
            // Clean up empty event sets
            if (this.events.get(eventName).size === 0) {
                this.events.delete(eventName);
            }
        }
        
        // Remove from one-time listeners
        if (this.oneTimeListeners.has(eventName)) {
            this.oneTimeListeners.get(eventName).delete(callback);
            
            // Clean up empty event sets
            if (this.oneTimeListeners.get(eventName).size === 0) {
                this.oneTimeListeners.delete(eventName);
            }
        }
        
        if (this.debugMode) {
            console.log(`📡 Listener removed for "${eventName}"`);
        }
    },
    
    // Emit an event to all listeners
    emit: function(eventName, data = null) {
        try {
            let listenersTriggered = 0;
            
            // Add to history
            this.addToHistory(eventName, data);
            
            // Trigger regular listeners
            if (this.events.has(eventName)) {
                const listeners = Array.from(this.events.get(eventName));
                listeners.forEach(callback => {
                    try {
                        callback(data);
                        listenersTriggered++;
                    } catch (error) {
                        console.error(`📡 EventBus: Error in listener for "${eventName}":`, error);
                        // Emit error event
                        this.emitError('listener_error', {
                            eventName,
                            error,
                            data
                        });
                    }
                });
            }
            
            // Trigger one-time listeners and remove them
            if (this.oneTimeListeners.has(eventName)) {
                const oneTimeListeners = Array.from(this.oneTimeListeners.get(eventName));
                oneTimeListeners.forEach(callback => {
                    try {
                        callback(data);
                        listenersTriggered++;
                    } catch (error) {
                        console.error(`📡 EventBus: Error in one-time listener for "${eventName}":`, error);
                        this.emitError('one_time_listener_error', {
                            eventName,
                            error,
                            data
                        });
                    }
                });
                
                // Remove all one-time listeners after execution
                this.oneTimeListeners.delete(eventName);
            }
            
            if (this.debugMode && listenersTriggered > 0) {
                console.log(`📡 Event "${eventName}" emitted to ${listenersTriggered} listeners`, data);
            }
            
            return listenersTriggered;
            
        } catch (error) {
            console.error(`📡 EventBus: Error emitting event "${eventName}":`, error);
            this.emitError('emit_error', {
                eventName,
                error,
                data
            });
            return 0;
        }
    },
    
    // Emit an error event (protected from recursion)
    emitError: function(type, details) {
        try {
            // Avoid infinite recursion by directly calling error listeners
            if (this.events.has('error')) {
                const errorListeners = Array.from(this.events.get('error'));
                errorListeners.forEach(callback => {
                    try {
                        callback({
                            type,
                            details,
                            timestamp: Date.now()
                        });
                    } catch (nestedError) {
                        console.error('📡 EventBus: Error in error handler:', nestedError);
                    }
                });
            }
        } catch (error) {
            console.error('📡 EventBus: Critical error in emitError:', error);
        }
    },
    
    // Add event to history for debugging
    addToHistory: function(eventName, data) {
        if (!this.debugMode) return;
        
        try {
            this.eventHistory.push({
                eventName,
                data,
                timestamp: Date.now(),
                listeners: this.getListenerCount(eventName)
            });
            
            // Limit history size
            if (this.eventHistory.length > this.maxHistorySize) {
                this.eventHistory.shift();
            }
        } catch (error) {
            console.warn('Error adding to event history:', error);
        }
    },
    
    // Wait for an event (returns Promise)
    waitFor: function(eventName, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(eventName, listener);
                reject(new Error(`📡 EventBus: Timeout waiting for event "${eventName}" (${timeout}ms)`));
            }, timeout);
            
            const listener = (data) => {
                clearTimeout(timeoutId);
                resolve(data);
            };
            
            this.once(eventName, listener);
        });
    },
    
    // Emit event with delay
    emitDelayed: function(eventName, data, delay) {
        setTimeout(() => {
            this.emit(eventName, data);
        }, delay);
    },
    
    // Emit event and wait for response
    async emitAndWait: function(requestEvent, data, responseEvent, timeout = 5000) {
        try {
            const responsePromise = this.waitFor(responseEvent, timeout);
            this.emit(requestEvent, data);
            return await responsePromise;
        } catch (error) {
            console.error(`📡 EventBus: EmitAndWait failed for ${requestEvent} -> ${responseEvent}:`, error);
            throw error;
        }
    },
    
    // Remove all listeners for an event
    removeAllListeners: function(eventName) {
        if (eventName) {
            this.events.delete(eventName);
            this.oneTimeListeners.delete(eventName);
            console.log(`📡 All listeners removed for "${eventName}"`);
        } else {
            // Remove all listeners for all events
            this.events.clear();
            this.oneTimeListeners.clear();
            console.log('📡 All event listeners removed');
        }
    },
    
    // Get list of events with listeners
    getEvents: function() {
        const regularEvents = Array.from(this.events.keys());
        const oneTimeEvents = Array.from(this.oneTimeListeners.keys());
        return [...new Set([...regularEvents, ...oneTimeEvents])];
    },
    
    // Get listener count for an event
    getListenerCount: function(eventName) {
        const regularCount = this.events.has(eventName) ? this.events.get(eventName).size : 0;
        const oneTimeCount = this.oneTimeListeners.has(eventName) ? this.oneTimeListeners.get(eventName).size : 0;
        return regularCount + oneTimeCount;
    },
    
    // Check if event has listeners
    hasListeners: function(eventName) {
        return this.getListenerCount(eventName) > 0;
    },
    
    // Enable/disable debug mode
    setDebugMode: function(enabled) {
        this.debugMode = enabled;
        console.log(`📡 EventBus debug mode: ${enabled ? 'ON' : 'OFF'}`);
        
        if (enabled) {
            this.startEventMonitoring();
        } else {
            this.stopEventMonitoring();
        }
    },
    
    // Start monitoring events for debugging
    startEventMonitoring: function() {
        if (this._monitoringInterval) return;
        
        this._monitoringInterval = setInterval(() => {
            if (this.eventHistory.length > 0) {
                const recentEvents = this.eventHistory.slice(-5);
                console.log('📡 Recent events:', recentEvents.map(e => ({
                    event: e.eventName,
                    time: new Date(e.timestamp).toLocaleTimeString(),
                    listeners: e.listeners
                })));
            }
        }, 30000); // Every 30 seconds
    },
    
    // Stop event monitoring
    stopEventMonitoring: function() {
        if (this._monitoringInterval) {
            clearInterval(this._monitoringInterval);
            this._monitoringInterval = null;
        }
    },
    
    // Get debug info
    getDebugInfo: function() {
        const info = {
            isInitialized: this.isInitialized,
            debugMode: this.debugMode,
            totalEvents: this.getEvents().length,
            regularEvents: this.events.size,
            oneTimeEvents: this.oneTimeListeners.size,
            historySize: this.eventHistory.length,
            events: {},
            recentHistory: this.eventHistory.slice(-10)
        };
        
        // Count listeners per event
        this.getEvents().forEach(eventName => {
            info.events[eventName] = this.getListenerCount(eventName);
        });
        
        return info;
    },
    
    // Bulk event operations
    emitBatch: function(events) {
        try {
            const results = [];
            events.forEach(({ eventName, data }) => {
                const listenerCount = this.emit(eventName, data);
                results.push({ eventName, listenerCount });
            });
            return results;
        } catch (error) {
            console.error('📡 EventBus: Error in batch emit:', error);
            return [];
        }
    },
    
    // Event pipeline - chain events together
    pipeline: function(events, delay = 0) {
        const executeNext = (index) => {
            if (index >= events.length) return;
            
            const { eventName, data, waitFor: waitEvent } = events[index];
            
            if (waitEvent) {
                // Wait for a specific event before continuing
                this.once(waitEvent, () => {
                    setTimeout(() => {
                        this.emit(eventName, data);
                        executeNext(index + 1);
                    }, delay);
                });
            } else {
                setTimeout(() => {
                    this.emit(eventName, data);
                    executeNext(index + 1);
                }, delay);
            }
        };
        
        executeNext(0);
    },
    
    // Event aggregation - collect events over time
    aggregate: function(eventName, duration, callback) {
        const events = [];
        const startTime = Date.now();
        
        const listener = (data) => {
            events.push({
                data,
                timestamp: Date.now()
            });
        };
        
        this.on(eventName, listener);
        
        setTimeout(() => {
            this.off(eventName, listener);
            callback(events);
        }, duration);
    },
    
    // Performance monitoring
    measureEventPerformance: function(eventName, samples = 10) {
        const measurements = [];
        let sampleCount = 0;
        
        const measureListener = (data) => {
            const startTime = performance.now();
            
            // Allow other listeners to execute
            setTimeout(() => {
                const endTime = performance.now();
                measurements.push(endTime - startTime);
                sampleCount++;
                
                if (sampleCount >= samples) {
                    this.off(eventName, measureListener);
                    
                    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                    const max = Math.max(...measurements);
                    const min = Math.min(...measurements);
                    
                    console.log(`📡 Performance for "${eventName}":`, {
                        average: avg.toFixed(2) + 'ms',
                        max: max.toFixed(2) + 'ms',
                        min: min.toFixed(2) + 'ms',
                        samples: measurements.length
                    });
                }
            }, 0);
        };
        
        this.on(eventName, measureListener);
    },
    
    // ChatBubble specific helper methods
    chatBubble: {
        // Helper to emit chat message events
        sendMessage: function(userId, username, message) {
            window.EventBus.emit('chat_message', {
                userId,
                username,
                message,
                timestamp: Date.now()
            });
        },
        
        // Helper to emit avatar position updates
        updateAvatarPosition: function(userId, position) {
            window.EventBus.emit('avatar:position-changed', {
                userId,
                position,
                timestamp: Date.now()
            });
        },
        
        // Helper to wait for ChatBubbleSystem to be ready
        waitForSystem: function(timeout = 10000) {
            return window.EventBus.waitFor('chat-bubble-system:initialized', timeout);
        },
        
        // Helper to check if avatar exists
        checkAvatar: function(userId) {
            return new Promise((resolve) => {
                window.EventBus.emit('avatar:check', { userId });
                window.EventBus.once('avatar:check-response', (data) => {
                    resolve(data.exists);
                });
            });
        }
    },
    
    // Cleanup and disposal
    dispose: function() {
        try {
            console.log('🧹 Disposing EventBus...');
            
            this.stopEventMonitoring();
            this.events.clear();
            this.oneTimeListeners.clear();
            this.eventHistory = [];
            this.isInitialized = false;
            
            console.log('✅ EventBus disposed successfully');
        } catch (error) {
            console.error('Error disposing EventBus:', error);
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.EventBus.isInitialized) {
        window.EventBus.init();
    }
});

console.log('📡✨ Enhanced EventBus with complete ChatBubble integration loaded');