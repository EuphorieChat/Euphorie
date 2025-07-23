// Global state and configuration for Euphorie 3D Platform - Complete Integration Version

window.Euphorie = {
    // Core configuration
    config: {
        version: '3.0.0',
        apiBaseUrl: '/api/v1/',
        websocketUrl: 'ws://localhost:8080',
        updateRate: 60, // FPS
        memoryBudget: 50 * 1024 * 1024, // 50MB
        
        // Feature flags
        features: {
            doubleTapZoom: true,
            avatarCollision: true,
            chatBubbles: true,
            advancedGraphics: true,
            postProcessing: true,
            interactions: true,
            groupActivities: true,
            scenePresets: true
        },
        
        // Performance thresholds
        performance: {
            lowFPSThreshold: 20,
            highMemoryThreshold: 0.8, // 80% of budget
            collisionCheckInterval: 100, // ms
            zoomAnimationDuration: 500, // ms
            interactionCooldown: 1000 // ms
        },
        
        // Mobile specific settings
        mobile: {
            updateRate: 30,
            memoryBudget: 25 * 1024 * 1024,
            doubleTapDelay: 300,
            touchSensitivity: 0.008,
            pinchZoomSpeed: 0.02,
            maxBubbles: 10,
            reducedEffects: true
        },
        
        // Interaction settings
        interactions: {
            defaultCooldown: 2000,
            maxDistance: 5,
            consentTimeout: 10000,
            animationDuration: 3000
        },
        
        // Group activity settings
        groupActivities: {
            maxGroupSize: 12,
            minGroupSize: 2,
            autoFormThreshold: 4,
            defaultDuration: 15000,
            formationTimeout: 5000
        }
    },
    
    // Global state
    state: {
        isInitialized: false,
        isConnected: false,
        currentUser: null,
        currentRoom: null,
        avatars: new Map(),
        scene: null,
        camera: null,
        renderer: null,
        
        // System states
        activeFeatures: new Set(),
        activeSystems: new Set(),
        
        // Camera state
        cameraState: {
            angle: 0,
            height: 5,
            distance: 10,
            target: { x: 0, y: 0, z: 0 }
        },
        
        // Input state
        inputState: {
            isMouseDown: false,
            isTouching: false,
            touchCount: 0,
            lastTapTime: 0,
            keys: new Set(),
            mousePosition: { x: 0, y: 0 }
        },
        
        // Scene state
        sceneState: {
            currentPreset: 'modern_office',
            quality: 'medium',
            lightingIntensity: 1.0,
            fogEnabled: true
        },
        
        // Avatar system state
        avatarSystem: {
            type: 'among-us',
            isInitialized: false,
            activeAvatars: new Map(),
            localAvatarId: 'default',
            customization: {
                color: '#C51111',
                hat: 'none',
                clothes: 'none',
                accessory: 'none',
                pet: 'none',
                expression: 'neutral'
            }
        },
        
        // Chat bubble system state
        chatBubbleSystem: {
            isInitialized: false,
            bubblesEnabled: true,
            maxBubbles: 20,
            fadeTime: 3000,
            activeBubbles: [],
            messageQueue: []
        },
        
        // Interaction system state
        interactionSystem: {
            isInitialized: false,
            activeInteractions: new Map(),
            cooldowns: new Map(),
            pendingConsents: new Map()
        },
        
        // Group interaction state
        groupInteractionSystem: {
            isInitialized: false,
            activeGroups: new Map(),
            pendingInvites: new Map(),
            userGroups: new Map()
        }
    },
    
    // Performance monitoring - Enhanced
    performance: {
        frameCount: 0,
        lastTime: 0,
        fps: 0,
        avgFps: 0,
        fpsHistory: [],
        memoryUsage: 0,
        drawCalls: 0,
        triangles: 0,
        activeEffects: 0,
        
        // Performance tracking methods
        startFrame: function() {
            this.frameStartTime = performance.now();
        },
        
        endFrame: function() {
            const frameTime = performance.now() - this.frameStartTime;
            this.frameCount++;
            
            // Calculate FPS
            const now = performance.now();
            if (now - this.lastTime >= 1000) {
                this.fps = this.frameCount;
                this.frameCount = 0;
                this.lastTime = now;
                
                // Track FPS history
                this.fpsHistory.push(this.fps);
                if (this.fpsHistory.length > 60) {
                    this.fpsHistory.shift();
                }
                
                // Calculate average FPS
                this.avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
                
                // Check for performance issues
                if (this.fps < window.Euphorie.config.performance.lowFPSThreshold) {
                    window.EventBus?.emit('performance:warning', {
                        type: 'low_fps',
                        fps: this.fps,
                        avgFps: this.avgFps
                    });
                }
            }
        },
        
        updateMemoryUsage: function() {
            if (performance.memory) {
                this.memoryUsage = performance.memory.usedJSHeapSize;
                const memoryRatio = this.memoryUsage / window.Euphorie.config.memoryBudget;
                
                if (memoryRatio > window.Euphorie.config.performance.highMemoryThreshold) {
                    window.EventBus?.emit('performance:warning', {
                        type: 'high_memory',
                        usage: this.memoryUsage,
                        ratio: memoryRatio
                    });
                }
            }
        },
        
        getStats: function() {
            return {
                fps: this.fps,
                avgFps: this.avgFps.toFixed(1),
                memory: window.Euphorie.utils.formatMemory(this.memoryUsage),
                drawCalls: this.drawCalls,
                triangles: this.triangles,
                activeEffects: this.activeEffects,
                avatarCount: window.Euphorie.state.avatars.size,
                bubbleCount: window.Euphorie.state.chatBubbleSystem.activeBubbles.length,
                groupCount: window.Euphorie.state.groupInteractionSystem.activeGroups.size
            };
        }
    },
    
    // Utils - Enhanced with all systems
    utils: {
        generateId: () => Math.random().toString(36).substr(2, 9),
        
        clamp: (num, min, max) => Math.min(Math.max(num, min), max),
        
        lerp: (start, end, factor) => start + (end - start) * factor,
        
        smoothStep: (edge0, edge1, x) => {
            const t = window.Euphorie.utils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            return t * t * (3.0 - 2.0 * t);
        },
        
        easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
        
        easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        
        formatMemory: (bytes) => {
            const units = ['B', 'KB', 'MB', 'GB'];
            let size = bytes;
            let unitIndex = 0;
            
            while (size >= 1024 && unitIndex < units.length - 1) {
                size /= 1024;
                unitIndex++;
            }
            
            return `${size.toFixed(1)} ${units[unitIndex]}`;
        },
        
        formatTime: (ms) => {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) {
                return `${hours}h ${minutes % 60}m`;
            } else if (minutes > 0) {
                return `${minutes}m ${seconds % 60}s`;
            } else {
                return `${seconds}s`;
            }
        },
        
        // Device detection - Enhanced
        isMobile: () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768;
        },
        
        isTablet: () => {
            return /iPad|Android/i.test(navigator.userAgent) && 
                   window.innerWidth >= 768 && 
                   window.innerWidth <= 1024;
        },
        
        isTouchDevice: () => {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },
        
        getDeviceType: () => {
            if (window.Euphorie.utils.isMobile()) return 'mobile';
            if (window.Euphorie.utils.isTablet()) return 'tablet';
            return 'desktop';
        },
        
        // Browser capabilities
        getBrowserCapabilities: () => {
            return {
                webgl: !!window.WebGLRenderingContext,
                webgl2: !!window.WebGL2RenderingContext,
                webrtc: !!window.RTCPeerConnection,
                websocket: !!window.WebSocket,
                worker: !!window.Worker,
                sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
                offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
                vibration: 'vibrate' in navigator
            };
        },
        
        // Vector math utilities
        distanceBetween: (obj1, obj2) => {
            const dx = obj2.x - obj1.x;
            const dy = obj2.y - obj1.y;
            const dz = obj2.z - obj1.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        },
        
        normalizeVector: (vector) => {
            const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
            if (length === 0) return { x: 0, y: 0, z: 0 };
            return {
                x: vector.x / length,
                y: vector.y / length,
                z: vector.z / length
            };
        },
        
        // Avatar utilities
        getLocalAvatar: function() {
            const avatarId = window.Euphorie.state.avatarSystem.localAvatarId;
            if (avatarId && window.AmongUsAvatarSystem) {
                return window.AmongUsAvatarSystem.getAvatar(avatarId);
            } else if (avatarId && window.AvatarSystem) {
                return window.AvatarSystem.getAvatar(avatarId);
            }
            return null;
        },
        
        customizeLocalAvatar: function(options) {
            const localAvatar = this.getLocalAvatar();
            if (localAvatar && window.AmongUsAvatarSystem) {
                window.AmongUsAvatarSystem.customizeAvatar(localAvatar.id, options);
                Object.assign(window.Euphorie.state.avatarSystem.customization, options);
            } else if (localAvatar && window.AvatarSystem) {
                window.AvatarSystem.customizeAvatar(localAvatar.id, options);
                Object.assign(window.Euphorie.state.avatarSystem.customization, options);
            }
        },
        
        // Chat bubble utilities
        sendChatBubble: function(message) {
            if (window.ChatBubbleSystem && window.ChatBubbleSystem.isInitialized) {
                const userId = window.Euphorie.state.currentUser?.id || 'default';
                const username = window.Euphorie.state.currentUser?.username || 'User';
                
                window.EventBus?.emit('chat_message', {
                    userId: userId,
                    username: username,
                    message: message
                });
            }
        },
        
        toggleChatBubbles: function() {
            const enabled = !window.Euphorie.state.chatBubbleSystem.bubblesEnabled;
            window.Euphorie.state.chatBubbleSystem.bubblesEnabled = enabled;
            
            if (!enabled && window.ChatBubbleSystem) {
                window.ChatBubbleSystem.clearAllBubbles();
            }
            
            if (window.ROOM_CONFIG) {
                window.ROOM_CONFIG.chatBubblesEnabled = enabled;
            }
            
            return enabled;
        },
        
        // Interaction utilities
        triggerInteraction: function(type, targetId = null) {
            if (window.InteractionSystem && window.InteractionSystem.isInitialized) {
                window.InteractionSystem.triggerInteraction(type, targetId);
            }
        },
        
        getAvailableInteractions: function() {
            if (window.InteractionSystem) {
                return window.InteractionSystem.getInteractionTypes();
            }
            return [];
        },
        
        // Group activity utilities
        startGroupActivity: function(activityType) {
            if (window.GroupInteractionSystem && window.GroupInteractionSystem.isInitialized) {
                window.GroupInteractionSystem.initiateGroupActivity(activityType);
            }
        },
        
        getActiveGroups: function() {
            if (window.GroupInteractionSystem) {
                return window.GroupInteractionSystem.getActiveGroups();
            }
            return [];
        },
        
        isInGroup: function(avatarId = null) {
            const id = avatarId || window.Euphorie.state.avatarSystem.localAvatarId;
            if (window.GroupInteractionSystem) {
                return window.GroupInteractionSystem.isAvatarInGroup(id);
            }
            return false;
        },
        
        // Scene utilities
        changeScenePreset: function(presetName) {
            if (window.SceneManager && window.SceneManager.isInitialized) {
                window.SceneManager.applyPreset(presetName);
                window.Euphorie.state.sceneState.currentPreset = presetName;
            }
        },
        
        getScenePresets: function() {
            if (window.SceneManager) {
                return window.SceneManager.getAvailablePresets();
            }
            return [];
        }
    },
    
    // Feature management
    features: {
        enable: function(featureName) {
            if (window.Euphorie.config.features[featureName]) {
                window.Euphorie.state.activeFeatures.add(featureName);
                window.EventBus?.emit('feature:enabled', { feature: featureName });
                console.log(`✅ Feature enabled: ${featureName}`);
                
                // Handle specific feature enablement
                switch(featureName) {
                    case 'doubleTapZoom':
                        if (window.SceneManager?.doubleTapZoom) {
                            window.SceneManager.doubleTapZoom.enable();
                        }
                        break;
                    case 'avatarCollision':
                        if (window.SceneManager?.avatarCollisionSystem) {
                            window.SceneManager.avatarCollisionSystem.setEnabled(true);
                        }
                        break;
                    case 'chatBubbles':
                        window.Euphorie.utils.toggleChatBubbles();
                        break;
                }
            }
        },
        
        disable: function(featureName) {
            window.Euphorie.state.activeFeatures.delete(featureName);
            window.EventBus?.emit('feature:disabled', { feature: featureName });
            console.log(`❌ Feature disabled: ${featureName}`);
            
            // Handle specific feature disablement
            switch(featureName) {
                case 'doubleTapZoom':
                    if (window.SceneManager?.doubleTapZoom) {
                        window.SceneManager.doubleTapZoom.disable();
                    }
                    break;
                case 'avatarCollision':
                    if (window.SceneManager?.avatarCollisionSystem) {
                        window.SceneManager.avatarCollisionSystem.setEnabled(false);
                    }
                    break;
                case 'chatBubbles':
                    window.Euphorie.utils.toggleChatBubbles();
                    break;
            }
        },
        
        isEnabled: function(featureName) {
            return window.Euphorie.state.activeFeatures.has(featureName);
        },
        
        toggle: function(featureName) {
            if (this.isEnabled(featureName)) {
                this.disable(featureName);
            } else {
                this.enable(featureName);
            }
        }
    },
    
    // Quality management
    quality: {
        setQuality: function(level) {
            const validLevels = ['low', 'medium', 'high'];
            if (!validLevels.includes(level)) {
                console.warn(`Invalid quality level: ${level}`);
                return;
            }
            
            window.Euphorie.state.sceneState.quality = level;
            window.EventBus?.emit('quality:changed', { level });
            
            // Adjust settings based on quality
            switch (level) {
                case 'low':
                    window.Euphorie.config.features.postProcessing = false;
                    window.Euphorie.config.features.advancedGraphics = false;
                    window.Euphorie.state.chatBubbleSystem.maxBubbles = 10;
                    break;
                case 'medium':
                    window.Euphorie.config.features.postProcessing = true;
                    window.Euphorie.config.features.advancedGraphics = false;
                    window.Euphorie.state.chatBubbleSystem.maxBubbles = 20;
                    break;
                case 'high':
                    window.Euphorie.config.features.postProcessing = true;
                    window.Euphorie.config.features.advancedGraphics = true;
                    window.Euphorie.state.chatBubbleSystem.maxBubbles = 30;
                    break;
            }
            
            // Apply to scene manager
            if (window.SceneManager && window.SceneManager.setQuality) {
                window.SceneManager.setQuality(level);
            }
        },
        
        autoDetect: function() {
            const capabilities = window.Euphorie.utils.getBrowserCapabilities();
            const deviceType = window.Euphorie.utils.getDeviceType();
            
            if (deviceType === 'mobile') {
                this.setQuality('low');
            } else if (deviceType === 'tablet') {
                this.setQuality('medium');
            } else if (capabilities.webgl2) {
                this.setQuality('high');
            } else {
                this.setQuality('medium');
            }
        }
    },
    
    // System registration
    systems: {
        register: function(systemName) {
            window.Euphorie.state.activeSystems.add(systemName);
            console.log(`📦 System registered: ${systemName}`);
        },
        
        unregister: function(systemName) {
            window.Euphorie.state.activeSystems.delete(systemName);
            console.log(`📦 System unregistered: ${systemName}`);
        },
        
        isActive: function(systemName) {
            return window.Euphorie.state.activeSystems.has(systemName);
        },
        
        getActive: function() {
            return Array.from(window.Euphorie.state.activeSystems);
        }
    },
    
    // Initialize the platform - Enhanced
    init: async function() {
        if (this.state.isInitialized) return;
        
        console.log('🚀 Initializing Euphorie 3D Platform v' + this.config.version);
        console.log('📱 Device type:', this.utils.getDeviceType());
        console.log('🖥️ Browser capabilities:', this.utils.getBrowserCapabilities());
        
        try {
            // Set room configuration from Django
            if (window.ROOM_CONFIG) {
                this.state.currentRoom = window.ROOM_CONFIG;
                console.log('📍 Room loaded:', this.state.currentRoom.roomName);
                
                // Set current user from room config
                if (window.ROOM_CONFIG.userId && window.ROOM_CONFIG.username) {
                    this.state.currentUser = {
                        id: window.ROOM_CONFIG.userId,
                        username: window.ROOM_CONFIG.username,
                        nationality: window.ROOM_CONFIG.userNationality || 'UN'
                    };
                }
            }
            
            // Adjust configuration based on device
            const deviceType = this.utils.getDeviceType();
            if (deviceType === 'mobile') {
                // Apply mobile configurations
                Object.assign(this.config, {
                    updateRate: this.config.mobile.updateRate,
                    memoryBudget: this.config.mobile.memoryBudget
                });
                
                // Reduce chat bubbles on mobile
                this.state.chatBubbleSystem.maxBubbles = this.config.mobile.maxBubbles;
                
                console.log('📱 Mobile optimizations applied');
            }
            
            // Auto-detect quality settings
            this.quality.autoDetect();
            console.log(`🎨 Quality set to: ${this.state.sceneState.quality}`);
            
            // Enable default features
            const defaultFeatures = ['doubleTapZoom', 'avatarCollision', 'chatBubbles', 'interactions', 'groupActivities'];
            defaultFeatures.forEach(feature => {
                if (this.config.features[feature]) {
                    this.features.enable(feature);
                }
            });
            
            // Start performance monitoring
            if (performance.memory) {
                setInterval(() => this.performance.updateMemoryUsage(), 5000);
            }
            
            // Set up keyboard event tracking
            document.addEventListener('keydown', (e) => {
                this.state.inputState.keys.add(e.key.toLowerCase());
            });
            
            document.addEventListener('keyup', (e) => {
                this.state.inputState.keys.delete(e.key.toLowerCase());
            });
            
            // Set up mouse position tracking
            document.addEventListener('mousemove', (e) => {
                this.state.inputState.mousePosition.x = e.clientX;
                this.state.inputState.mousePosition.y = e.clientY;
            });
            
            this.state.isInitialized = true;
            console.log('✅ Euphorie initialized successfully');
            
            // Emit initialization event
            window.EventBus?.emit('euphorie:initialized', {
                version: this.config.version,
                deviceType: deviceType,
                quality: this.state.sceneState.quality,
                features: Array.from(this.state.activeFeatures)
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize Euphorie:', error);
            window.EventBus?.emit('error', {
                type: 'initialization_failed',
                error: error
            });
            throw error;
        }
    },
    
    // Debug utilities
    debug: {
        showStats: function() {
            console.log('📊 Euphorie Platform Stats:');
            console.log('Performance:', window.Euphorie.performance.getStats());
            console.log('Active Systems:', window.Euphorie.systems.getActive());
            console.log('Active Features:', Array.from(window.Euphorie.state.activeFeatures));
            console.log('Active Groups:', window.Euphorie.state.groupInteractionSystem.activeGroups.size);
            console.log('Active Interactions:', window.Euphorie.state.interactionSystem.activeInteractions.size);
        },
        
        toggleDebugMode: function() {
            if (window.ChatBubbleSystem) {
                window.ChatBubbleSystem.toggleDebugMode();
            }
            console.log('🔍 Debug mode toggled');
        }
    },
    
    // Cleanup method
    dispose: function() {
        console.log('🧹 Disposing Euphorie platform...');
        
        // Clear all features
        this.state.activeFeatures.clear();
        this.state.activeSystems.clear();
        
        // Clear performance tracking
        this.performance.fpsHistory = [];
        
        // Reset state
        this.state.isInitialized = false;
        this.state.isConnected = false;
        this.state.avatars.clear();
        
        window.EventBus?.emit('euphorie:disposed');
        console.log('✅ Euphorie disposed');
    }
};

// Make utilities available globally for backward compatibility
window.isMobile = window.Euphorie.utils.isMobile;
window.generateId = window.Euphorie.utils.generateId;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Euphorie.init();
    });
} else {
    window.Euphorie.init();
}