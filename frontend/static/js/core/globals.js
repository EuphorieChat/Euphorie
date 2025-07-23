// Global state and configuration for Euphorie 3D Platform - Enhanced Version

window.Euphorie = {
    // Core configuration
    config: {
        version: '2.0.0',
        apiBaseUrl: '/api/v1/',
        websocketUrl: 'ws://localhost:8080',
        updateRate: 60, // FPS
        memoryBudget: 50 * 1024 * 1024, // 50MB
        
        // New feature configurations
        features: {
            doubleTapZoom: true,
            avatarCollision: true,
            chatBubbles: true,
            advancedGraphics: true,
            postProcessing: true
        },
        
        // Performance thresholds
        performance: {
            lowFPSThreshold: 20,
            highMemoryThreshold: 0.8, // 80% of budget
            collisionCheckInterval: 100, // ms
            zoomAnimationDuration: 500 // ms
        },
        
        // Mobile specific settings
        mobile: {
            updateRate: 30,
            memoryBudget: 25 * 1024 * 1024,
            doubleTapDelay: 300,
            touchSensitivity: 0.008,
            pinchZoomSpeed: 0.02
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
        
        // New state properties
        activeFeatures: new Set(),
        cameraState: {
            angle: 0,
            height: 5,
            distance: 10
        },
        inputState: {
            isMouseDown: false,
            isTouching: false,
            touchCount: 0,
            lastTapTime: 0
        },
        sceneQuality: 'medium' // low, medium, high
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
                triangles: this.triangles
            };
        }
    },
    
    // Utils - Enhanced
    utils: {
        generateId: () => Math.random().toString(36).substr(2, 9),
        
        clamp: (num, min, max) => Math.min(Math.max(num, min), max),
        
        lerp: (start, end, factor) => start + (end - start) * factor,
        
        smoothStep: (edge0, edge1, x) => {
            const t = window.Euphorie.utils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
            return t * t * (3.0 - 2.0 * t);
        },
        
        easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
        
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
                offscreenCanvas: typeof OffscreenCanvas !== 'undefined'
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
        }
    },
    
    // Feature management
    features: {
        enable: function(featureName) {
            if (window.Euphorie.config.features[featureName]) {
                window.Euphorie.state.activeFeatures.add(featureName);
                window.EventBus?.emit('feature:enabled', { feature: featureName });
                console.log(`✅ Feature enabled: ${featureName}`);
            }
        },
        
        disable: function(featureName) {
            window.Euphorie.state.activeFeatures.delete(featureName);
            window.EventBus?.emit('feature:disabled', { feature: featureName });
            console.log(`❌ Feature disabled: ${featureName}`);
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
            
            window.Euphorie.state.sceneQuality = level;
            window.EventBus?.emit('quality:changed', { level });
            
            // Adjust settings based on quality
            switch (level) {
                case 'low':
                    window.Euphorie.config.features.postProcessing = false;
                    window.Euphorie.config.features.advancedGraphics = false;
                    break;
                case 'medium':
                    window.Euphorie.config.features.postProcessing = true;
                    window.Euphorie.config.features.advancedGraphics = false;
                    break;
                case 'high':
                    window.Euphorie.config.features.postProcessing = true;
                    window.Euphorie.config.features.advancedGraphics = true;
                    break;
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
            }
            
            // Adjust configuration based on device
            const deviceType = this.utils.getDeviceType();
            if (deviceType === 'mobile') {
                // Apply mobile configurations
                Object.assign(this.config, {
                    updateRate: this.config.mobile.updateRate,
                    memoryBudget: this.config.mobile.memoryBudget
                });
                console.log('📱 Mobile optimizations applied');
            }
            
            // Auto-detect quality settings
            this.quality.autoDetect();
            console.log(`🎨 Quality set to: ${this.state.sceneQuality}`);
            
            // Enable default features
            const defaultFeatures = ['doubleTapZoom', 'avatarCollision', 'chatBubbles'];
            defaultFeatures.forEach(feature => {
                if (this.config.features[feature]) {
                    this.features.enable(feature);
                }
            });
            
            // Start performance monitoring
            if (performance.memory) {
                setInterval(() => this.performance.updateMemoryUsage(), 5000);
            }
            
            this.state.isInitialized = true;
            console.log('✅ Euphorie initialized successfully');
            
            // Emit initialization event
            window.EventBus?.emit('euphorie:initialized', {
                version: this.config.version,
                deviceType: deviceType,
                quality: this.state.sceneQuality
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
    
    // Cleanup method
    dispose: function() {
        console.log('🧹 Disposing Euphorie platform...');
        
        // Clear all features
        this.state.activeFeatures.clear();
        
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