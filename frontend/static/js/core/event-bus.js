// Event Bus for cross-module communication - Fixed for Chat Bubbles

window.EventBus = {
    events: new Map(),
    eventHistory: new Map(), // Store recent events for debugging
    isInitialized: false,
    maxHistorySize: 50,
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🔌 Initializing Enhanced Event Bus with All Systems');
        this.isInitialized = true;
        
        // ===== CORE SYSTEM EVENTS =====
        
        // Global error handling
        this.on('error', (error) => {
            console.error('🚨 Global error:', error);
            this.addToHistory('error', error);
        });
        
        // Performance monitoring
        this.on('performance:warning', (data) => {
            console.warn('⚠️ Performance warning:', data);
        });
        
        // ===== SCENE EVENTS =====
        
        // Scene lifecycle
        this.on('scene:initialized', (data) => {
            console.log('🎬 Scene initialized:', data);
            
            // IMPORTANT: Initialize ChatBubbleSystem after scene is ready
            setTimeout(() => {
                if (window.ChatBubbleSystem && !window.ChatBubbleSystem.isInitialized) {
                    console.log('🔧 Initializing ChatBubbleSystem after scene ready');
                    window.ChatBubbleSystem.init();
                }
            }, 1000);
        });
        
        this.on('scene:frame', (data) => {
            // Silent - too frequent for logging
        });
        
        this.on('scene:preset-changed', (data) => {
            console.log('🎨 Scene preset changed to:', data.preset);
        });
        
        this.on('scene:object-added', (data) => {
            console.log('➕ Object added to scene:', data.name || 'unnamed');
        });
        
        this.on('scene:object-removed', (data) => {
            console.log('➖ Object removed from scene');
        });
        
        // ===== AVATAR SYSTEM EVENTS =====
        
        // Avatar lifecycle
        this.on('avatar:created', (data) => {
            console.log('👤 Avatar created:', data.id, data.customization?.name);
        });
        
        this.on('avatar:removed', (data) => {
            console.log('👤 Avatar removed:', data.avatarId);
        });
        
        this.on('avatar:customize', (options) => {
            console.log('🎨 Avatar customization requested:', options);
        });
        
        this.on('avatar:position-updated', (data) => {
            // Silent - too frequent for logging
        });
        
        // ===== CHAT BUBBLE EVENTS - FIXED =====
        
        // Chat messages - with better handling
        this.on('chat_message', (data) => {
            console.log('💬 Chat message event received:', data.username, ':', data.message);
            
            // Ensure ChatBubbleSystem is initialized and ready
            if (!window.ChatBubbleSystem) {
                console.warn('⚠️ ChatBubbleSystem not found');
                return;
            }
            
            if (!window.ChatBubbleSystem.isInitialized) {
                console.warn('⚠️ ChatBubbleSystem not ready, queueing message');
                
                // Queue the message for later
                if (!window.ChatBubbleSystem._messageQueue) {
                    window.ChatBubbleSystem._messageQueue = [];
                }
                window.ChatBubbleSystem._messageQueue.push(data);
                
                // Try to initialize ChatBubbleSystem
                window.ChatBubbleSystem.init();
                
                return;
            }
            
            // ChatBubbleSystem should handle this internally via its own event listener
            // We're just logging here for debugging
        });
        
        // Also support alternative event name for compatibility
        this.on('chat:message', (data) => {
            this.emit('chat_message', data);
        });
        
        this.on('chat:bubble-created', (data) => {
            console.log('💭 Chat bubble created for:', data.username);
        });
        
        this.on('chat:bubble-removed', (data) => {
            // Silent - happens frequently
        });
        
        // ===== INTERACTION SYSTEM EVENTS =====
        
        // Individual interactions
        this.on('interaction:started', (data) => {
            console.log('🤝 Interaction started:', data.type, 'by', data.initiator);
        });
        
        this.on('interaction:complete', (data) => {
            console.log('✅ Interaction completed:', data.type);
        });
        
        this.on('animation:complete', (data) => {
            console.log('🎭 Animation completed:', data);
        });
        
        // ===== GROUP INTERACTION EVENTS =====
        
        // Group activities
        this.on('group:created', (data) => {
            console.log('👥 Group created:', data.activity.name, 'with', data.participants.length, 'participants');
        });
        
        this.on('group:ended', (data) => {
            console.log('🏁 Group activity ended:', data.activity);
        });
        
        this.on('group:participant-joined', (data) => {
            console.log('➕ Participant joined group:', data.userId);
        });
        
        this.on('group:participant-left', (data) => {
            console.log('➖ Participant left group:', data.userId);
        });
        
        // ===== WEBSOCKET EVENTS =====
        
        // Connection events
        this.on('websocket:connected', (data) => {
            console.log('🔗 WebSocket connected');
        });
        
        this.on('websocket:disconnected', (data) => {
            console.log('🔌 WebSocket disconnected');
        });
        
        this.on('user:joined', (data) => {
            console.log('👋 User joined:', data.username);
        });
        
        this.on('user:left', (data) => {
            console.log('👋 User left:', data.userId);
        });
        
        this.on('user_left', (data) => {
            // Alias for compatibility
            this.emit('user:left', data);
        });
        
        // ===== ROOM EVENTS =====
        
        this.on('room:loaded', (data) => {
            console.log('🏠 Room loaded:', data.roomName);
        });
        
        this.on('room:user-count-changed', (data) => {
            console.log('👥 Room user count:', data.count);
        });
        
        // ===== PLATFORM EVENTS =====
        
        this.on('euphorie:initialized', (data) => {
            console.log('🚀 Euphorie platform initialized:', data);
        });
        
        this.on('euphorie:disposed', () => {
            console.log('🧹 Euphorie platform disposed');
        });
        
        this.on('feature:enabled', (data) => {
            console.log('✅ Feature enabled:', data.feature);
        });
        
        this.on('feature:disabled', (data) => {
            console.log('❌ Feature disabled:', data.feature);
        });
        
        this.on('quality:changed', (data) => {
            console.log('🎨 Quality changed to:', data.level);
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
        // Add to history for debugging (skip high-frequency events)
        this.addToHistory(eventName, data);
        
        if (!this.events.has(eventName)) {
            // No handlers for this event
            return;
        }
        
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
                // Don't emit error event for error handlers to avoid infinite loop
                if (eventName !== 'error') {
                    this.emit('error', { eventName, error, data });
                }
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
        // Skip high-frequency events
        const skipEvents = ['scene:frame', 'avatar:position-updated', 'chat:bubble-removed'];
        if (skipEvents.includes(eventName)) return;
        
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
    },
    
    // Debug utility - log all active listeners
    debugListeners: function() {
        console.log('📊 EventBus Active Listeners:');
        this.events.forEach((handlers, eventName) => {
            console.log(`  ${eventName}: ${handlers.length} listener(s)`);
        });
    },
    
    // Wait for an event to occur (returns promise)
    waitFor: function(eventName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(eventName, handler);
                reject(new Error(`Timeout waiting for event: ${eventName}`));
            }, timeout);
            
            const handler = (data) => {
                clearTimeout(timeoutId);
                resolve(data);
            };
            
            this.once(eventName, handler);
        });
    },
    
    // Test utilities for chat bubbles
    testChatBubble: function(message = "Test message from EventBus! 🎉") {
        console.log('🧪 Testing chat bubble via EventBus...');
        
        this.emit('chat_message', {
            userId: 'test_' + Date.now(),
            username: 'EventBus Test',
            message: message
        });
        
        return 'Chat message event emitted';
    }
};

// Auto-initialize EventBus when script loads
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.EventBus.init();
        });
    } else {
        // Small delay to ensure other scripts might be loaded
        setTimeout(() => {
            window.EventBus.init();
        }, 100);
    }
})();

// Add debug helper
window.testChatBubble = function(message) {
    return window.EventBus.testChatBubble(message);
};