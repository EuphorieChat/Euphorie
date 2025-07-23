// Event Bus for cross-module communication - Enhanced Version

window.EventBus = {
    events: new Map(),
    eventHistory: new Map(), // Store recent events for debugging
    isInitialized: false,
    maxHistorySize: 50,
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🔌 Initializing Enhanced Event Bus');
        this.isInitialized = true;
        
        // Set up global error handling
        this.on('error', (error) => {
            console.error('🚨 Global error:', error);
            this.addToHistory('error', error);
        });
        
        // Set up performance monitoring
        this.on('performance:warning', (data) => {
            console.warn('⚠️ Performance warning:', data);
        });
        
        return Promise.resolve();
    },
    
    // Subscribe to an event
    on: function(eventName, callback, options = {}) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        
        const handler = {
            callback,
            once: options.once || false,
            priority: options.priority || 0
        };
        
        const handlers = this.events.get(eventName);
        handlers.push(handler);
        
        // Sort by priority (higher priority first)
        handlers.sort((a, b) => b.priority - a.priority);
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    },
    
    // Subscribe to an event that fires only once
    once: function(eventName, callback, priority = 0) {
        return this.on(eventName, callback, { once: true, priority });
    },
    
    // Unsubscribe from an event
    off: function(eventName, callback) {
        if (!this.events.has(eventName)) return;
        
        const handlers = this.events.get(eventName);
        const index = handlers.findIndex(h => h.callback === callback);
        
        if (index > -1) {
            handlers.splice(index, 1);
        }
        
        if (handlers.length === 0) {
            this.events.delete(eventName);
        }
    },
    
    // Emit an event
    emit: function(eventName, data = null) {
        // Add to history for debugging
        this.addToHistory(eventName, data);
        
        if (!this.events.has(eventName)) return;
        
        const handlers = [...this.events.get(eventName)]; // Copy array to avoid modification during iteration
        const handlersToRemove = [];
        
        handlers.forEach(handler => {
            try {
                handler.callback(data);
                
                // Remove one-time handlers
                if (handler.once) {
                    handlersToRemove.push(handler.callback);
                }
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
                this.emit('error', { eventName, error, data });
            }
        });
        
        // Remove one-time handlers
        handlersToRemove.forEach(callback => this.off(eventName, callback));
    },
    
    // Emit an event asynchronously
    emitAsync: async function(eventName, data = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.emit(eventName, data);
                resolve();
            }, 0);
        });
    },
    
    // Add event to history for debugging
    addToHistory: function(eventName, data) {
        if (!this.eventHistory.has(eventName)) {
            this.eventHistory.set(eventName, []);
        }
        
        const history = this.eventHistory.get(eventName);
        history.push({
            timestamp: Date.now(),
            data: data
        });
        
        // Keep history size limited
        if (history.length > this.maxHistorySize) {
            history.shift();
        }
    },
    
    // Get event history for debugging
    getEventHistory: function(eventName = null) {
        if (eventName) {
            return this.eventHistory.get(eventName) || [];
        }
        return Object.fromEntries(this.eventHistory);
    },
    
    // Clear event history
    clearHistory: function(eventName = null) {
        if (eventName) {
            this.eventHistory.delete(eventName);
        } else {
            this.eventHistory.clear();
        }
    },
    
    // Remove all listeners for an event
    removeAllListeners: function(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
    },
    
    // Get listener count for an event
    listenerCount: function(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    },
    
    // List all registered events
    getRegisteredEvents: function() {
        return Array.from(this.events.keys());
    }
};