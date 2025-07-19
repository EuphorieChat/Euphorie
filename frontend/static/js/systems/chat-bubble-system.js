// =============================================
// EUPHORIE 3D CHAT BUBBLE SYSTEM v6.1 - FIXED STACKING
// Fixed: Consistent height positioning, no vertical stacking
// =============================================

console.log('🔥 LOADING ChatBubbleSystem v6.1 - Fixed Stacking Version...');

// 1. SAFE MATH UTILITIES - Prevent NaN in calculations
const SafeMath = {
    safeDivide: (a, b) => {
        if (b === 0 || !isFinite(b)) return 0;
        const result = a / b;
        return isFinite(result) ? result : 0;
    },
    
    safeProgress: (elapsed, duration) => {
        if (duration <= 0 || !isFinite(duration)) return 1;
        const progress = elapsed / duration;
        return Math.max(0, Math.min(1, isFinite(progress) ? progress : 0));
    },
    
    safeScale: (value) => {
        if (value === undefined || value === null) return 1;
        if (!isFinite(value) || isNaN(value)) return 1;
        if (value === 0) return 0.001; // Prevent invisible objects
        if (value < -100) return 0.001; // Handle extreme negatives
        if (value > 100) return 10; // Cap extreme positives
        return Math.abs(value); // Always return positive scale
    },
    
    safeEasing: (progress) => {
        if (!isFinite(progress) || isNaN(progress)) return 0;
        progress = Math.max(0, Math.min(1, progress));
        return progress < 0.5 ? 2 * progress * progress : 1 - 2 * (1 - progress) * (1 - progress);
    }
};

// 2. TARGETED SCALE PROTECTION - Only for chat bubble objects
function createSafeScaleHelper() {
    return {
        setSafeBubbleScale: function(object, x, y, z) {
            if (!object || !object.scale) return;
            
            if (!this.isChatBubbleObject(object)) {
                if (typeof x === 'number' && y === undefined && z === undefined) {
                    object.scale.setScalar(x);
                } else {
                    object.scale.set(x, y !== undefined ? y : x, z !== undefined ? z : x);
                }
                return;
            }
            
            const safeX = SafeMath.safeScale(x);
            const safeY = SafeMath.safeScale(y !== undefined ? y : x);
            const safeZ = SafeMath.safeScale(z !== undefined ? z : x);
            
            object.scale.set(safeX, safeY, safeZ);
        },
        
        setSafeBubbleScalar: function(object, scalar) {
            if (!object || !object.scale) return;
            
            if (!this.isChatBubbleObject(object)) {
                object.scale.setScalar(scalar);
                return;
            }
            
            const safeScalar = SafeMath.safeScale(scalar);
            object.scale.setScalar(safeScalar);
        },
        
        isChatBubbleObject: function(object) {
            if (!object) return false;
            
            return (
                object.name?.includes('bubble') ||
                object.userData?.isChatBubble ||
                object.parent?.userData?.isChatBubble ||
                object.material?.map?.image?.tagName === 'CANVAS'
            );
        }
    };
}

// 3. MAIN CHAT BUBBLE SYSTEM CLASS - FIXED STACKING VERSION
class ChatBubbleSystem {
    constructor() {
        console.log('💬✨ ChatBubbleSystem v6.1 - Fixed Stacking version starting...');
        
        this.safeScale = createSafeScaleHelper();
        
        // Core properties
        this.bubbles = new Map();
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInitialized = false;
        
        // Initialize pools and queues
        this.materialPool = [];
        this.texturePool = [];
        this._messageQueue = [];
        
        // Avatar position tracking
        this.avatarPositionCache = new Map();
        this.lastKnownPositions = new Map();
        
        // FIXED: Configuration for consistent positioning
        this.config = {
            maxBubbles: 20,
            fadeTime: 4000, // Faster fade out
            maxDistance: 60,
            fontSize: 18,
            maxWidth: 380,
            padding: 25,
            borderRadius: 20,
            yOffset: 2.8, // FIXED: Consistent height above avatar
            animationDuration: 600,
            maxBubblesPerUser: 1, // FIXED: Only one bubble per user at a time
            enableDebug: false,
            enableShadows: true,
            cullingDistance: 100,
            enableSparkles: true,
            enableGlow: true,
            minHeight: 2.0,
            maxHeight: 15.0,
            horizontalSpread: 1.5, // FIXED: Only horizontal spreading
            replacePreviousBubble: true, // FIXED: Replace instead of stack
            groundY: 0,
            noVerticalStacking: true // FIXED: Disable vertical stacking completely
        };
        
        // Enhanced visual styles
        this.bubbleStyles = {
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'rgba(102, 126, 234, 0.8)',
            usernameFontSize: this.config.fontSize * 0.85,
            usernameColor: '#4a5cf0',
            textColor: '#1a1a2e',
            shadowBlur: 15,
            shadowColor: 'rgba(102, 126, 234, 0.3)',
            glowColor: 'rgba(102, 126, 234, 0.6)'
        };
        
        // Performance tracking
        this.performance = {
            frameTime: 0,
            bubbleCount: 0,
            renderCalls: 0,
            lastCleanup: Date.now()
        };
        
        this.isMobile = window.innerWidth <= 768;
        
        // Bind all methods
        this.bindMethods();
        
        // Setup resize handler
        window.addEventListener('resize', this.handleResize);
        
        console.log('✅ ChatBubbleSystem v6.1 - Fixed Stacking version created');
    }
    
    bindMethods() {
        const methodNames = [
            'init', 'createBubble', 'createBubbleFromMessage', 'update',
            'drawBubbleBackground', 'roundRect', 'calculateTextDimensions',
            'wrapText', 'animateBubbleIn', 'animateBubbleOut', 'removeBubble',
            'getAvatarPosition', 'performanceCleanup', 'startUpdateLoop',
            'handleResize', 'updateBubblePositions', 'removeUserBubbles',
            'clearAllBubbles', '_ensurePerformanceObject', '_processQueuedMessages',
            'setupEventListeners'
        ];
        
        methodNames.forEach(methodName => {
            if (typeof this[methodName] === 'function') {
                this[methodName] = this[methodName].bind(this);
            }
        });
        
        // Create safe wrapper methods
        this.createBubbleFromMessageSafe = (...args) => {
            try {
                this._ensurePerformanceObject();
                return this.createBubbleFromMessage.apply(this, args);
            } catch (error) {
                console.error('Error in createBubbleFromMessageSafe:', error);
                return null;
            }
        };
        
        this.updateSafe = (...args) => {
            try {
                this._ensurePerformanceObject();
                return this.update.apply(this, args);
            } catch (error) {
                console.error('Error in updateSafe:', error);
                return null;
            }
        };
    }
    
    _ensurePerformanceObject() {
        if (!this.performance || typeof this.performance !== 'object') {
            console.warn('🔧 Recreating performance object');
            this.performance = {
                frameTime: 0,
                bubbleCount: 0,
                renderCalls: 0,
                lastCleanup: Date.now()
            };
            return;
        }
        
        const requiredProps = ['frameTime', 'bubbleCount', 'renderCalls', 'lastCleanup'];
        requiredProps.forEach(prop => {
            if (typeof this.performance[prop] !== 'number') {
                console.warn(`🔧 Fixing performance.${prop}`);
                this.performance[prop] = prop === 'lastCleanup' ? Date.now() : 0;
            }
        });
    }
    
    async init() {
        console.log('🚀 Initializing ChatBubbleSystem v6.1...');
        
        try {
            this._ensurePerformanceObject();
            
            if (!window.THREE) {
                console.warn('❌ THREE.js not available - retrying in 500ms');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            if (!window.SceneManager?.scene) {
                console.log('💬 Waiting for SceneManager... retrying in 300ms');
                setTimeout(() => this.init(), 300);
                return;
            }
            
            this.scene = window.SceneManager.scene;
            this.camera = window.SceneManager.camera;
            this.renderer = window.SceneManager.renderer;
            
            if (!this.scene || !this.camera) {
                console.error('❌ Scene or camera not available');
                return;
            }
            
            this._ensurePerformanceObject();
            this.isInitialized = true;
            
            console.log('✅ ChatBubbleSystem v6.1 initialized successfully');
            
            this.startUpdateLoop();
            this.setupEventListeners();
            this._processQueuedMessages();
            
        } catch (error) {
            console.error('❌ Error initializing ChatBubbleSystem:', error);
            setTimeout(() => this.init(), 1000);
        }
    }
    
    _processQueuedMessages() {
        if (this._messageQueue && this._messageQueue.length > 0) {
            console.log(`📨 Processing ${this._messageQueue.length} queued messages`);
            const queue = [...this._messageQueue];
            this._messageQueue = [];
            
            queue.forEach(messageData => {
                try {
                    this.createBubbleFromMessage(messageData);
                } catch (error) {
                    console.warn('Error processing queued message:', error);
                }
            });
        }
    }
    
    setupEventListeners() {
        if (window.EventBus) {
            window.EventBus.on('chat_message', this.createBubbleFromMessageSafe);
            window.EventBus.on('user_left', (data) => this.removeUserBubbles(data.userId));
        }
        
        setInterval(() => {
            try {
                this.performanceCleanup();
            } catch (error) {
                console.warn('Error in performance cleanup:', error);
            }
        }, 10000);
    }
    
    createBubbleFromMessage(messageData) {
        if (!this.isInitialized) {
            console.log('💬 Queueing message (system not ready)');
            this._messageQueue.push(messageData);
            return null;
        }
        
        if (window.ROOM_CONFIG && !window.ROOM_CONFIG.chatBubblesEnabled) {
            console.log('💬 Chat bubbles disabled in ROOM_CONFIG');
            return null;
        }
        
        try {
            const avatarPosition = this.getAvatarPosition(messageData.userId || messageData.user_id);
            if (!avatarPosition) {
                console.warn(`💬 No avatar found for user ${messageData.userId || messageData.user_id}`);
                
                const userId = messageData.userId || messageData.user_id;
                const fallbackPosition = this.createGroundLevelFallbackPosition(userId);
                
                return this.createBubble(
                    messageData.message,
                    messageData.username,
                    fallbackPosition,
                    userId
                );
            }
            
            const bubble = this.createBubble(
                messageData.message,
                messageData.username,
                avatarPosition,
                messageData.userId || messageData.user_id
            );
            
            console.log(`✅ Bubble created for ${messageData.username}: "${messageData.message}"`);
            return bubble;
            
        } catch (error) {
            console.error('❌ Error creating bubble from message:', error);
            return null;
        }
    }
    
    createGroundLevelFallbackPosition(userId) {
        const hash = userId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
        const radius = 4 + (Math.abs(hash) % 3);
        
        const groundPosition = new THREE.Vector3(
            Math.cos(angle) * radius,
            this.config.groundY + this.config.yOffset, // FIXED: Use consistent yOffset
            Math.sin(angle) * radius
        );
        
        this.lastKnownPositions.set(userId, groundPosition.clone());
        
        if (this.config.enableDebug) {
            console.log(`🔧 Created consistent fallback position for ${userId}: (${groundPosition.x.toFixed(2)}, ${groundPosition.y.toFixed(2)}, ${groundPosition.z.toFixed(2)})`);
        }
        
        return groundPosition;
    }
    
    getAvatarPosition(userId) {
        if (this.config.enableDebug) {
            console.log(`🔍 [DEBUG] Getting avatar position for user: ${userId}`);
        }
        
        try {
            // Strategy 1: Check cache first
            if (this.avatarPositionCache.has(userId)) {
                const cached = this.avatarPositionCache.get(userId);
                if (Date.now() - cached.timestamp < 1000) {
                    if (this.config.enableDebug) {
                        console.log(`✅ [DEBUG] Using cached position for ${userId}`);
                    }
                    return cached.position.clone();
                }
            }
            
            // Strategy 2: Use AvatarSystem if available
            if (window.AvatarSystem?.getAvatarPosition) {
                const pos = window.AvatarSystem.getAvatarPosition(userId);
                if (pos && this.isValidPosition(pos)) {
                    this.cacheAvatarPosition(userId, pos);
                    if (this.config.enableDebug) {
                        console.log(`✅ [DEBUG] Found via AvatarSystem: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
                    }
                    return pos;
                }
            }
            
            // Strategy 3: Comprehensive scene search
            const avatarPosition = this.searchSceneForAvatar(userId);
            if (avatarPosition) {
                this.cacheAvatarPosition(userId, avatarPosition);
                return avatarPosition;
            }
            
            // Strategy 4: Check if this is the current user
            if (this.isCurrentUser(userId)) {
                const cameraPosition = this.getCurrentUserPosition();
                if (cameraPosition) {
                    this.cacheAvatarPosition(userId, cameraPosition);
                    if (this.config.enableDebug) {
                        console.log(`✅ [DEBUG] Using camera position for current user: ${userId}`);
                    }
                    return cameraPosition;
                }
            }
            
            // Strategy 5: Use WebSocket Manager's user tracking
            if (window.WebSocketManager?.connectedUsers?.has(userId)) {
                const userData = window.WebSocketManager.connectedUsers.get(userId);
                if (userData.position && this.isValidPosition(userData.position)) {
                    const wsPosition = new THREE.Vector3(
                        userData.position.x, 
                        userData.position.y || this.config.groundY, 
                        userData.position.z
                    );
                    this.cacheAvatarPosition(userId, wsPosition);
                    if (this.config.enableDebug) {
                        console.log(`✅ [DEBUG] Using WebSocket stored position for user: ${userId}`);
                    }
                    return wsPosition;
                }
            }
            
            // Strategy 6: Use last known position if available
            if (this.lastKnownPositions.has(userId)) {
                const lastPos = this.lastKnownPositions.get(userId);
                if (this.config.enableDebug) {
                    console.log(`✅ [DEBUG] Using last known position for ${userId}`);
                }
                return lastPos.clone();
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return null;
        }
    }
    
    searchSceneForAvatar(userId) {
        if (!this.scene) return null;
        
        const searchPatterns = [
            child => child.userData?.userId === userId,
            child => child.userData?.id === userId,  
            child => child.userData?.user_id === userId,
            child => child.userData?.playerId === userId,
            child => child.userData?.characterId === userId,
            child => child.name === userId,
            child => child.userData?.username === userId,
            child => child.userData?.displayName === userId,
            child => (child.userData?.type === 'avatar' || child.userData?.isAvatar) && 
                     (child.userData?.userId === userId || child.userData?.id === userId),
            child => child.parent?.userData?.userId === userId,
            child => child.parent?.userData?.id === userId,
            child => child.userData?.owner === userId,
            child => child.userData?.belongsTo === userId
        ];
        
        for (const pattern of searchPatterns) {
            try {
                let foundAvatar = null;
                this.scene.traverse(child => {
                    if (!foundAvatar && pattern(child)) {
                        foundAvatar = child;
                    }
                });
                
                if (foundAvatar && this.isValidPosition(foundAvatar.position)) {
                    if (this.config.enableDebug) {
                        console.log(`✅ [DEBUG] Found avatar in scene via pattern search: (${foundAvatar.position.x.toFixed(2)}, ${foundAvatar.position.y.toFixed(2)}, ${foundAvatar.position.z.toFixed(2)})`);
                    }
                    return foundAvatar.position.clone();
                }
            } catch (error) {
                continue;
            }
        }
        
        if (this.config.enableDebug) {
            console.log(`❌ [DEBUG] No avatar found in scene for user: ${userId}`);
        }
        return null;
    }
    
    isValidPosition(position) {
        if (!position) return false;
        if (typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') return false;
        if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) return false;
        if (!isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) return false;
        return true;
    }
    
    isCurrentUser(userId) {
        return userId === window.ROOM_CONFIG?.userId || 
               userId === window.WebSocketManager?.userId ||
               userId === this.getCurrentUserId();
    }
    
    getCurrentUserId() {
        return window.ROOM_CONFIG?.userId || 
               window.WebSocketManager?.userId || 
               window.Euphorie?.state?.userId;
    }
    
    getCurrentUserPosition() {
        if (this.camera) {
            const cameraPos = this.camera.position.clone();
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.camera.quaternion);
            
            const bubblePos = cameraPos.clone();
            bubblePos.add(direction.multiplyScalar(5));
            bubblePos.y = Math.max(this.config.groundY, 1);
            
            return bubblePos;
        }
        
        return new THREE.Vector3(0, this.config.groundY + this.config.yOffset, 0);
    }
    
    cacheAvatarPosition(userId, position) {
        if (!this.avatarPositionCache) {
            this.avatarPositionCache = new Map();
        }
        
        this.avatarPositionCache.set(userId, {
            position: position.clone(),
            timestamp: Date.now()
        });
        
        if (!this.lastKnownPositions) {
            this.lastKnownPositions = new Map();
        }
        this.lastKnownPositions.set(userId, position.clone());
        
        if (this.avatarPositionCache.size > 50) {
            const entries = Array.from(this.avatarPositionCache.entries());
            entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
            
            this.avatarPositionCache.clear();
            entries.slice(0, 50).forEach(([id, data]) => {
                this.avatarPositionCache.set(id, data);
            });
        }
    }
    
    // FIXED: Create bubble with consistent positioning - NO STACKING
    createBubble(message, username, position, userId = null) {
        if (!this.isInitialized || !window.THREE) {
            console.warn('💬 ChatBubbleSystem not ready');
            return null;
        }
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
            bubbleGroup.userData = { isChatBubble: true };
            
            // Create canvas with high DPI
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
                console.error('Could not get canvas context');
                return null;
            }
            
            // Calculate text dimensions
            const usernameFont = `bold ${this.config.fontSize * 0.85}px "Segoe UI", Arial, sans-serif`;
            const messageFont = `${this.config.fontSize}px "Segoe UI", Arial, sans-serif`;
            const textMetrics = this.calculateTextDimensions(context, message, username, usernameFont, messageFont);
            
            const bubbleWidth = textMetrics.bubbleWidth;
            const bubbleHeight = textMetrics.bubbleHeight;
            
            // High DPI canvas
            canvas.width = bubbleWidth * 3;
            canvas.height = bubbleHeight * 3;
            context.scale(3, 3);
            
            // Draw enhanced bubble
            this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
            this.drawBubbleText(context, username, textMetrics, usernameFont, messageFont);
            
            // Create sprite
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            
            const material = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                alphaTest: 0.001,
                depthTest: false
            });
            
            const sprite = new THREE.Sprite(material);
            sprite.userData = { isChatBubble: true };
            
            const scale = 0.008;
            this.safeScale.setSafeBubbleScale(sprite, bubbleWidth * scale, bubbleHeight * scale, 1);
            
            bubbleGroup.add(sprite);
            
            // FIXED: Calculate consistent bubble position - NO STACKING
            const bubblePosition = this.calculateConsistentBubblePosition(position, userId);
            bubbleGroup.position.copy(bubblePosition);
            
            // Set bubble data
            bubbleGroup.userData = {
                id: bubbleId,
                message: message,
                username: username,
                userId: userId,
                createdAt: Date.now(),
                opacity: 1,
                isVisible: true,
                originalPosition: bubblePosition.clone(),
                isChatBubble: true
            };
            
            this.safeScale.setSafeBubbleScalar(bubbleGroup, 0);
            this.animateBubbleInSafe(bubbleGroup);
            
            // Add to scene
            this.scene.add(bubbleGroup);
            
            // Track bubble
            this.activeBubbles.push(bubbleGroup);
            
            // FIXED: Better bubble management - replace previous bubble
            if (userId) {
                if (!this.bubbles.has(userId)) {
                    this.bubbles.set(userId, []);
                }
                
                const userBubbles = this.bubbles.get(userId);
                
                // REPLACE previous bubble instead of stacking
                if (this.config.replacePreviousBubble && userBubbles.length > 0) {
                    const oldBubble = userBubbles[userBubbles.length - 1];
                    this.animateBubbleOut(oldBubble);
                    userBubbles[userBubbles.length - 1] = bubbleGroup;
                } else {
                    userBubbles.push(bubbleGroup);
                    
                    // Limit bubbles per user
                    if (userBubbles.length > this.config.maxBubblesPerUser) {
                        const oldBubble = userBubbles.shift();
                        this.removeBubble(oldBubble);
                    }
                }
            }
            
            // Clean up old bubbles
            if (this.activeBubbles.length > this.config.maxBubbles) {
                const oldBubble = this.activeBubbles.shift();
                this.removeBubble(oldBubble);
            }
            
            return bubbleGroup;
            
        } catch (error) {
            console.error('❌ Error creating bubble:', error);
            return null;
        }
    }
    
    // FIXED: Consistent positioning without vertical stacking
    calculateConsistentBubblePosition(basePosition, userId) {
        const bubblePosition = basePosition.clone();
        
        // FIXED: Always use the same height - NO STACKING
        bubblePosition.y = Math.max(
            this.config.minHeight, 
            basePosition.y + this.config.yOffset
        );
        
        // Ensure maximum height
        bubblePosition.y = Math.min(this.config.maxHeight, bubblePosition.y);
        
        // FIXED: Only small horizontal offset to prevent overlap, NO vertical offset
        if (userId && this.bubbles.has(userId)) {
            const userBubbles = this.bubbles.get(userId);
            const activeBubbleCount = userBubbles.filter(bubble => 
                bubble.userData.animationPhase !== 'exiting'
            ).length;
            
            // Only tiny horizontal offset to prevent exact overlap
            bubblePosition.x += activeBubbleCount * 0.1; // Very small offset
            bubblePosition.z += activeBubbleCount * 0.05; // Tiny Z offset to prevent z-fighting
            
            // NO HEIGHT CHANGE - bubblePosition.y stays the same!
        }
        
        return bubblePosition;
    }
    
    // Rest of the methods remain the same...
    animateBubbleInSafe(bubble) {
        if (!bubble) return;
        
        console.log('✅ Starting SAFE bubble animation for:', bubble.userData?.message);
        
        const startScale = 0;
        const endScale = 1;
        const duration = this.config.animationDuration || 600;
        const startTime = Date.now();
        
        bubble.userData.animationPhase = 'entering';
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = SafeMath.safeProgress(elapsed, duration);
                
                const easeProgress = SafeMath.safeEasing(progress);
                
                let bounceScale = easeProgress;
                if (progress > 0.8) {
                    const bouncePhase = (progress - 0.8) / 0.2;
                    const bounce = Math.sin(bouncePhase * Math.PI * 4) * 0.1 * (1 - bouncePhase);
                    bounceScale = easeProgress + bounce;
                }
                
                const rawScale = startScale + (endScale - startScale) * bounceScale;
                const safeScale = SafeMath.safeScale(rawScale);
                
                this.safeScale.setSafeBubbleScalar(bubble, safeScale);
                
                const rotation = (1 - progress) * 0.2 * Math.sin(progress * Math.PI * 2);
                bubble.rotation.z = isFinite(rotation) ? rotation : 0;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    bubble.userData.animationPhase = 'stable';
                    bubble.rotation.z = 0;
                    this.safeScale.setSafeBubbleScalar(bubble, 1);
                    
                    console.log('✅ Bubble animation completed safely:', bubble.userData?.message);
                    
                    // Schedule fade out
                    setTimeout(() => {
                        this.animateBubbleOut(bubble);
                    }, this.config.fadeTime);
                }
            } catch (error) {
                console.error('❌ Error in safe bubble animation:', error);
                this.safeScale.setSafeBubbleScalar(bubble, 1);
                bubble.userData.animationPhase = 'stable';
            }
        };
        
        animate();
    }
    
    animateBubbleOut(bubble) {
        if (!bubble || !bubble.parent) return;
        
        const duration = 800;
        const startTime = Date.now();
        const startOpacity = bubble.userData.opacity || 1;
        
        bubble.userData.animationPhase = 'exiting';
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = progress * progress;
                
                const opacity = startOpacity * (1 - easeProgress);
                const scale = SafeMath.safeScale(1 - (easeProgress * 0.2));
                
                bubble.rotation.z = easeProgress * 0.3;
                
                const upwardMovement = easeProgress * 0.5;
                bubble.position.y = bubble.userData.originalPosition.y + upwardMovement;
                
                if (bubble.children[0]?.material) {
                    bubble.children[0].material.opacity = opacity;
                    bubble.userData.opacity = opacity;
                }
                
                this.safeScale.setSafeBubbleScalar(bubble, scale);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.removeBubble(bubble);
                }
            } catch (error) {
                console.error('Error in animateBubbleOut:', error);
                this.removeBubble(bubble);
            }
        };
        
        animate();
    }
    
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        this._ensurePerformanceObject();
        const startTime = Date.now();
        
        try {
            this.activeBubbles.forEach(bubble => {
                if (!bubble || !bubble.parent) return;
                
                const distance = bubble.position.distanceTo(this.camera.position);
                
                if (distance > this.config.cullingDistance) {
                    bubble.visible = false;
                    bubble.userData.isVisible = false;
                    return;
                }
                
                bubble.visible = true;
                bubble.userData.isVisible = true;
                
                bubble.lookAt(this.camera.position);
                
                // FIXED: Gentle floating animation without affecting base height
                const time = Date.now() * 0.0008;
                const floatAmount = 0.03; // Reduced float amount
                const floatOffset = Math.sin(time + bubble.userData.id * 0.7) * floatAmount;
                
                const originalY = bubble.userData.originalPosition?.y || this.config.yOffset;
                const newY = Math.max(this.config.minHeight, originalY + floatOffset);
                bubble.position.y = isFinite(newY) ? newY : this.config.yOffset;
                
                // Very gentle swaying
                const swayAmount = 0.01;
                const swaySpeed = time * 0.4;
                const originalX = bubble.userData.originalPosition?.x || 0;
                const originalZ = bubble.userData.originalPosition?.z || 0;
                
                const swayX = Math.sin(swaySpeed + bubble.userData.id) * swayAmount;
                const swayZ = Math.cos(swaySpeed * 0.7 + bubble.userData.id * 0.5) * swayAmount;
                
                bubble.position.x = originalX + (isFinite(swayX) ? swayX : 0);
                bubble.position.z = originalZ + (isFinite(swayZ) ? swayZ : 0);
                
                if (bubble.userData.animationPhase === 'stable') {
                    const rotationZ = Math.sin(time * 0.3 + bubble.userData.id) * 0.03;
                    bubble.rotation.z = isFinite(rotationZ) ? rotationZ : 0;
                }
                
                if (bubble.children[0]?.material) {
                    const normalizedDistance = Math.min(distance / this.config.maxDistance, 1);
                    const opacity = Math.max(0.3, 1 - Math.pow(normalizedDistance, 1.5)) * (bubble.userData.opacity || 1);
                    bubble.children[0].material.opacity = isFinite(opacity) ? opacity : 0.8;
                    
                    const rawScaleMultiplier = Math.max(0.7, 1 - normalizedDistance * 0.3);
                    const safeScaleMultiplier = SafeMath.safeScale(rawScaleMultiplier);
                    this.safeScale.setSafeBubbleScalar(bubble, safeScaleMultiplier);
                }
            });
            
        } catch (error) {
            console.error('Error in safe update:', error);
        }
        
        this._ensurePerformanceObject();
        this.performance.frameTime = Date.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    // Enhanced text drawing
    drawBubbleText(context, username, textMetrics, usernameFont, messageFont) {
        // Username with enhanced styling
        context.font = usernameFont;
        context.fillStyle = this.bubbleStyles.usernameColor;
        context.textAlign = 'left';
        
        // Username background
        const usernameWidth = context.measureText(username).width;
        const pillGradient = context.createLinearGradient(0, this.config.padding - 3, usernameWidth + 20, this.config.padding + 22);
        pillGradient.addColorStop(0, 'rgba(74, 92, 240, 0.15)');
        pillGradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.12)');
        pillGradient.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
        
        context.fillStyle = pillGradient;
        context.beginPath();
        this.roundRect(context, this.config.padding - 6, this.config.padding - 3, usernameWidth + 12, 24, 12);
        context.fill();
        
        // Username text with shadow
        context.fillStyle = this.bubbleStyles.usernameColor;
        context.shadowColor = 'rgba(255, 255, 255, 0.8)';
        context.shadowBlur = 2;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 1;
        context.fillText(username, this.config.padding, this.config.padding + 18);
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Message text
        context.font = messageFont;
        context.fillStyle = this.bubbleStyles.textColor;
        context.shadowColor = 'rgba(255, 255, 255, 0.9)';
        context.shadowBlur = 1;
        context.shadowOffsetY = 1;
        
        textMetrics.lines.forEach((line, index) => {
            context.fillText(
                line,
                this.config.padding,
                this.config.padding + this.config.fontSize * 0.85 + 30 + (index * textMetrics.lineHeight)
            );
        });
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;
    }
    
    // Enhanced bubble background
    drawBubbleBackground(context, width, height) {
        if (!context || typeof width !== 'number' || typeof height !== 'number') {
            console.error('Invalid parameters for drawBubbleBackground');
            return;
        }
        
        try {
            // Glassmorphism gradient background
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            gradient.addColorStop(0.3, 'rgba(240, 248, 255, 0.9)');
            gradient.addColorStop(0.7, 'rgba(230, 245, 255, 0.88)');
            gradient.addColorStop(1, 'rgba(220, 240, 255, 0.85)');
            
            // Shadows for depth
            if (this.config.enableShadows) {
                context.save();
                context.shadowColor = 'rgba(102, 126, 234, 0.4)';
                context.shadowBlur = 25;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 12;
                
                context.fillStyle = 'rgba(102, 126, 234, 0.1)';
                context.beginPath();
                this.roundRect(context, -2, -2, width + 4, height - 16, this.config.borderRadius + 2);
                context.fill();
                context.restore();
            }
            
            // Main bubble
            context.fillStyle = gradient;
            context.beginPath();
            this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
            context.fill();
            
            // Animated border
            const time = Date.now() * 0.001;
            const hue1 = (time * 50) % 360;
            const hue2 = (time * 50 + 60) % 360;
            const hue3 = (time * 50 + 120) % 360;
            
            const borderGradient = context.createLinearGradient(0, 0, width, height);
            borderGradient.addColorStop(0, `hsla(${hue1}, 70%, 65%, 0.8)`);
            borderGradient.addColorStop(0.5, `hsla(${hue2}, 70%, 65%, 0.6)`);
            borderGradient.addColorStop(1, `hsla(${hue3}, 70%, 65%, 0.8)`);
            
            context.strokeStyle = borderGradient;
            context.lineWidth = 3;
            context.save();
            context.shadowColor = `hsla(${hue1}, 70%, 65%, 0.6)`;
            context.shadowBlur = 10;
            context.beginPath();
            this.roundRect(context, 1.5, 1.5, width - 3, height - 21.5, this.config.borderRadius - 1);
            context.stroke();
            context.restore();
            
            // Glass highlight
            const highlightGradient = context.createLinearGradient(0, 0, 0, height * 0.6);
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            context.fillStyle = highlightGradient;
            context.beginPath();
            this.roundRect(context, 2, 2, width - 4, (height - 20) * 0.6, this.config.borderRadius - 2);
            context.fill();
            
            // Enhanced bubble tail
            const tailGradient = context.createLinearGradient(width / 2 - 15, height - 20, width / 2 + 15, height - 2);
            tailGradient.addColorStop(0, 'rgba(240, 248, 255, 0.9)');
            tailGradient.addColorStop(0.5, 'rgba(230, 245, 255, 0.95)');
            tailGradient.addColorStop(1, 'rgba(220, 240, 255, 0.85)');
            
            context.fillStyle = tailGradient;
            context.beginPath();
            context.moveTo(width / 2 - 15, height - 20);
            context.quadraticCurveTo(width / 2, height - 2, width / 2 + 15, height - 20);
            context.fill();
            
            // Tail border
            context.save();
            context.strokeStyle = `hsla(${hue2}, 70%, 65%, 0.7)`;
            context.lineWidth = 2;
            context.shadowColor = `hsla(${hue2}, 70%, 65%, 0.5)`;
            context.shadowBlur = 8;
            context.beginPath();
            context.moveTo(width / 2 - 15, height - 20);
            context.quadraticCurveTo(width / 2, height - 2, width / 2 + 15, height - 20);
            context.stroke();
            context.restore();
            
            // Sparkle effects
            if (this.config.enableSparkles && Math.random() < 0.3) {
                context.save();
                const sparkleCount = 3 + Math.floor(Math.random() * 4);
                
                for (let i = 0; i < sparkleCount; i++) {
                    const x = 10 + Math.random() * (width - 20);
                    const y = 10 + Math.random() * (height - 30);
                    const size = 1 + Math.random() * 2;
                    
                    context.fillStyle = `hsla(${(hue1 + i * 30) % 360}, 80%, 80%, 0.8)`;
                    context.shadowColor = context.fillStyle;
                    context.shadowBlur = 4;
                    
                    context.beginPath();
                    context.arc(x, y, size, 0, Math.PI * 2);
                    context.fill();
                }
                context.restore();
            }
            
        } catch (error) {
            console.error('Error in drawBubbleBackground:', error);
        }
    }
    
    // Helper methods
    roundRect(context, x, y, width, height, radius) {
        if (!context) return;
        
        try {
            context.moveTo(x + radius, y);
            context.lineTo(x + width - radius, y);
            context.quadraticCurveTo(x + width, y, x + width, y + radius);
            context.lineTo(x + width, y + height - radius);
            context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            context.lineTo(x + radius, y + height);
            context.quadraticCurveTo(x, y + height, x, y + height - radius);
            context.lineTo(x, y + radius);
            context.quadraticCurveTo(x, y, x + radius, y);
        } catch (error) {
            console.error('Error in roundRect:', error);
        }
    }
    
    calculateTextDimensions(context, message, username, usernameFont, messageFont) {
        try {
            // Measure username
            context.font = usernameFont;
            const usernameWidth = context.measureText(username).width;
            
            // Measure and wrap message text
            context.font = messageFont;
            const lines = this.wrapText(context, message, this.config.maxWidth - this.config.padding * 2);
            
            // Calculate actual width needed
            let maxTextWidth = usernameWidth;
            lines.forEach(line => {
                const lineWidth = context.measureText(line).width;
                if (lineWidth > maxTextWidth) {
                    maxTextWidth = lineWidth;
                }
            });
            
            // Calculate dimensions
            const lineHeight = this.config.fontSize * 1.3;
            const bubbleWidth = Math.max(maxTextWidth + this.config.padding * 2, 140);
            const bubbleHeight = this.config.padding * 2 + 
                                this.config.fontSize * 0.85 + 
                                30 + 
                                (lines.length * lineHeight) + 
                                30;
            
            return {
                bubbleWidth,
                bubbleHeight,
                lines,
                lineHeight,
                maxTextWidth
            };
        } catch (error) {
            console.error('Error calculating text dimensions:', error);
            return {
                bubbleWidth: 200,
                bubbleHeight: 100,
                lines: [message],
                lineHeight: 20,
                maxTextWidth: 150
            };
        }
    }
    
    wrapText(context, text, maxWidth) {
        try {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                const metrics = context.measureText(testLine);
                
                if (metrics.width <= maxWidth || !currentLine) {
                    currentLine = testLine;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
            
            if (currentLine) lines.push(currentLine);
            return lines;
        } catch (error) {
            console.error('Error wrapping text:', error);
            return [text];
        }
    }
    
    // Rest of the utility methods remain the same
    removeBubble(bubble) {
        if (!bubble) return;
        
        try {
            if (bubble.parent) {
                bubble.parent.remove(bubble);
            }
            
            bubble.children.forEach(child => {
                if (child.material) {
                    if (child.material.map) {
                        child.material.map.dispose();
                    }
                    child.material.dispose();
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            });
            
            const activeIndex = this.activeBubbles.indexOf(bubble);
            if (activeIndex > -1) {
                this.activeBubbles.splice(activeIndex, 1);
            }
            
            if (bubble.userData.userId && this.bubbles.has(bubble.userData.userId)) {
                const userBubbles = this.bubbles.get(bubble.userData.userId);
                const userIndex = userBubbles.indexOf(bubble);
                if (userIndex > -1) {
                    userBubbles.splice(userIndex, 1);
                }
                
                if (userBubbles.length === 0) {
                    this.bubbles.delete(bubble.userData.userId);
                }
            }
            
        } catch (error) {
            console.error('Error removing bubble:', error);
        }
    }
    
    removeUserBubbles(userId) {
        if (!this.bubbles.has(userId)) return;
        
        try {
            const userBubbles = this.bubbles.get(userId).slice();
            userBubbles.forEach(bubble => {
                this.animateBubbleOut(bubble);
            });
            
            this.bubbles.delete(userId);
        } catch (error) {
            console.error('Error removing user bubbles:', error);
        }
    }
    
    updateBubblePositions(userId, newPosition) {
        if (!this.bubbles.has(userId) || !newPosition) return;
        
        try {
            this.cacheAvatarPosition(userId, newPosition);
            
            const userBubbles = this.bubbles.get(userId);
            userBubbles.forEach((bubble, index) => {
                if (bubble.userData.isVisible && bubble.userData.animationPhase !== 'exiting') {
                    const bubblePosition = newPosition.clone();
                    
                    // FIXED: Consistent height only
                    bubblePosition.y = Math.max(this.config.minHeight, bubblePosition.y + this.config.yOffset);
                    
                    // Only horizontal spreading
                    bubblePosition.x += index * this.config.horizontalSpread;
                    bubblePosition.z += index * 0.05;
                    
                    bubble.userData.originalPosition.lerp(bubblePosition, 0.15);
                }
            });
        } catch (error) {
            console.error('Error updating bubble positions:', error);
        }
    }
    
    clearAllBubbles() {
        try {
            const bubblesToRemove = this.activeBubbles.slice();
            bubblesToRemove.forEach(bubble => {
                this.removeBubble(bubble);
            });
            
            this.activeBubbles = [];
            this.bubbles.clear();
            
            console.log('💬 All chat bubbles cleared');
        } catch (error) {
            console.error('Error clearing bubbles:', error);
        }
    }
    
    handleResize() {
        try {
            if (this.isMobile) {
                const isLandscape = window.innerWidth > window.innerHeight;
                this.config.maxBubbles = isLandscape ? 18 : 12;
            }
        } catch (error) {
            console.error('Error handling resize:', error);
        }
    }
    
    performanceCleanup() {
        const now = Date.now();
        this._ensurePerformanceObject();
        
        if (now - this.performance.lastCleanup > 10000) {
            try {
                this.activeBubbles.forEach(bubble => {
                    if (now - bubble.userData.createdAt > this.config.fadeTime * 3) {
                        this.removeBubble(bubble);
                    }
                });
                
                this.performance.lastCleanup = now;
            } catch (error) {
                console.warn('Error in performance cleanup:', error);
            }
        }
    }
    
    startUpdateLoop() {
        const update = () => {
            try {
                if (this.isInitialized) {
                    this.updateSafe();
                }
            } catch (error) {
                console.error('Error in update loop:', error);
            }
            requestAnimationFrame(update);
        };
        update();
    }
    
    // Public API methods
    getActiveBubbleCount() {
        return this.activeBubbles.length;
    }
    
    getUserBubbleCount(userId) {
        return this.bubbles.has(userId) ? this.bubbles.get(userId).length : 0;
    }
    
    setDebugMode(enabled) {
        this.config.enableDebug = enabled;
        console.log(`💬 ChatBubbleSystem debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    getPerformanceStats() {
        this._ensurePerformanceObject();
        return {
            ...this.performance,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 2048,
            isMobile: this.isMobile
        };
    }
    
    createTestBubble(message = "Test message! 🚀", username = "TestUser") {
        if (!window.THREE) {
            console.warn('THREE.js not available for test bubble');
            return null;
        }
        
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            this.config.yOffset,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('💬 ChatBubbleSystem config updated:', newConfig);
    }
    
    // Debug and testing methods
    enableDebugMode() {
        this.config.enableDebug = true;
        console.log('🔍 Chat Bubble positioning debug mode ENABLED');
        this.debugCurrentAvatars();
    }
    
    disableDebugMode() {
        this.config.enableDebug = false;
        console.log('🔍 Chat Bubble positioning debug mode DISABLED');
    }
    
    debugCurrentAvatars() {
        console.log('🎭 Current avatars in scene:');
        
        if (!this.scene) {
            console.log('❌ No scene available');
            return;
        }
        
        let avatarCount = 0;
        this.scene.traverse(child => {
            if (child.userData && (
                child.userData.userId || 
                child.userData.id || 
                child.userData.user_id ||
                child.userData.isAvatar ||
                child.userData.type === 'avatar'
            )) {
                avatarCount++;
                console.log(`  👤 Avatar ${avatarCount}:`, {
                    name: child.name,
                    userId: child.userData.userId || child.userData.id || child.userData.user_id,
                    position: `(${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`,
                    userData: child.userData
                });
            }
        });
        
        if (avatarCount === 0) {
            console.log('  ❌ No avatars found in scene');
        } else {
            console.log(`  ✅ Found ${avatarCount} avatars total`);
        }
        
        console.log('💾 Cached avatar positions:');
        this.avatarPositionCache.forEach((data, userId) => {
            const pos = data.position;
            console.log(`  👤 ${userId}: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) [${Date.now() - data.timestamp}ms ago]`);
        });
    }
    
    forceUserPosition(userId, x, y, z) {
        const position = new THREE.Vector3(x, y, z);
        this.cacheAvatarPosition(userId, position);
        this.updateBubblePositions(userId, position);
        console.log(`🎯 Forced position for ${userId}: (${x}, ${y}, ${z})`);
    }
    
    dispose() {
        try {
            this.clearAllBubbles();
            window.removeEventListener('resize', this.handleResize);
            
            if (this.avatarPositionCache) this.avatarPositionCache.clear();
            if (this.lastKnownPositions) this.lastKnownPositions.clear();
            
            console.log('💬 ChatBubbleSystem disposed');
        } catch (error) {
            console.error('Error disposing ChatBubbleSystem:', error);
        }
    }
    
    // Compatibility methods for the old API
    animateBubbleIn(bubble) {
        return this.animateBubbleInSafe(bubble);
    }
    
    // Static method to get singleton instance
    static getInstance() {
        if (!ChatBubbleSystem._instance) {
            ChatBubbleSystem._instance = new ChatBubbleSystem();
        }
        return ChatBubbleSystem._instance;
    }
}

// Export both class and instance for compatibility
window.ChatBubbleSystemClass = ChatBubbleSystem;
window.ChatBubbleSystem = ChatBubbleSystem.getInstance();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatBubbleSystem;
}

console.log('✅ ChatBubbleSystem v6.1 - Fixed Stacking version loaded successfully');
console.log('🎯 Key fix: NO vertical stacking - consistent height positioning');
console.log('📈 Bubbles now appear at consistent height above avatars');
console.log('🔧 Ready for integration with room_3d.html');
console.log('');
console.log('🧪 Test with: window.ChatBubbleSystem.createTestBubble("No more stacking!");');