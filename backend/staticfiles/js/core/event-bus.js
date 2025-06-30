// Event Bus for cross-module communication

window.EventBus = {
    events: new Map(),
    isInitialized: false,
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🔌 Initializing Event Bus');
        this.isInitialized = true;
        
        // Set up global error handling
        this.on('error', (error) => {
            console.error('🚨 Global error:', error);
        });
        
        return Promise.resolve();
    },
    
    // Subscribe to an event
    on: function(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);
        
        // Return unsubscribe function
        return () => this.off(eventName, callback);
    },
    
    // Unsubscribe from an event
    off: function(eventName, callback) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);
        
        if (index > -1) {
            callbacks.splice(index, 1);
        }
        
        if (callbacks.length === 0) {
            this.events.delete(eventName);
        }
    },
    
    // Emit an event
    emit: function(eventName, data = null) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    },
};
