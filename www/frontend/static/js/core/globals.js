// Global state and configuration for Euphorie 3D Platform

window.Euphorie = {
    // Core configuration
    config: {
        version: '1.0.0',
        apiBaseUrl: '/api/v1/',
        websocketUrl: 'ws://localhost:8080',
        updateRate: 60, // FPS
        memoryBudget: 50 * 1024 * 1024, // 50MB
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
    },
    
    // Performance monitoring
    performance: {
        frameCount: 0,
        lastTime: 0,
        fps: 0,
        memoryUsage: 0,
    },
    
    // Utils
    utils: {
        generateId: () => Math.random().toString(36).substr(2, 9),
        
        clamp: (num, min, max) => Math.min(Math.max(num, min), max),
        
        lerp: (start, end, factor) => start + (end - start) * factor,
        
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
        
        // Device detection
        isMobile: () => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        },
        
        // Additional device detection utilities
        isTablet: () => {
            return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
        },
        
        isTouchDevice: () => {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },
        
        getDeviceType: () => {
            if (window.Euphorie.utils.isMobile()) return 'mobile';
            if (window.Euphorie.utils.isTablet()) return 'tablet';
            return 'desktop';
        },
    },
    
    // Initialize the platform
    init: async function() {
        if (this.state.isInitialized) return;
        
        console.log('🚀 Initializing Euphorie 3D Platform v' + this.config.version);
        console.log('📱 Device type:', this.utils.getDeviceType());
        
        try {
            // Set room configuration from Django
            if (window.ROOM_CONFIG) {
                this.state.currentRoom = window.ROOM_CONFIG;
                console.log('📍 Room loaded:', this.state.currentRoom.roomName);
            }
            
            // Adjust configuration based on device
            if (this.utils.isMobile()) {
                this.config.updateRate = 30; // Lower FPS for mobile
                this.config.memoryBudget = 25 * 1024 * 1024; // 25MB for mobile
                console.log('📱 Mobile optimizations applied');
            }
            
            this.state.isInitialized = true;
            console.log('✅ Euphorie initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Euphorie:', error);
            throw error;
        }
    },
};

// Make isMobile available globally for backward compatibility
window.isMobile = window.Euphorie.utils.isMobile;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.Euphorie.init();
    });
} else {
    window.Euphorie.init();
}