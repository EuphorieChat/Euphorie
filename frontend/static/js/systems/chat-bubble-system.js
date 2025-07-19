// =============================================
// EUPHORIE 3D CHAT BUBBLE SYSTEM v5.0
// Refactored from working template with comprehensive fixes
// =============================================

console.log('🔥 LOADING ChatBubbleSystem v5.0 - Refactored with fixes...');

// 1. SAFE MATH UTILITIES - Prevent NaN in all calculations
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
        if (!isFinite(value) || isNaN(value) || value <= 0) {
            console.warn('🛡️ Prevented invalid scale value:', value, 'using 1 instead');
            return 1;
        }
        return Math.max(0.001, Math.min(10, value));
    },
    
    safeEasing: (progress) => {
        if (!isFinite(progress) || isNaN(progress)) return 0;
        progress = Math.max(0, Math.min(1, progress));
        return progress < 0.5 ? 2 * progress * progress : 1 - 2 * (1 - progress) * (1 - progress);
    }
};

// 2. PROTECT THREE.JS FROM NaN - Install safety hooks
function installThreeJSProtection() {
    if (!window.THREE) return;
    
    console.log('🛡️ Installing THREE.js NaN protection...');
    
    // Protect Vector3.setScalar
    const originalSetScalar = THREE.Vector3.prototype.setScalar;
    THREE.Vector3.prototype.setScalar = function(scalar) {
        const safeScalar = SafeMath.safeScale(scalar);
        if (safeScalar !== scalar) {
            console.warn('🛡️ THREE.Vector3.setScalar protected from NaN:', scalar, '→', safeScalar);
        }
        return originalSetScalar.call(this, safeScalar);
    };
    
    // Protect Object3D.scale.set
    const originalScaleSet = THREE.Vector3.prototype.set;
    THREE.Vector3.prototype.set = function(x, y, z) {
        const safeX = SafeMath.safeScale(x);
        const safeY = SafeMath.safeScale(y !== undefined ? y : x);
        const safeZ = SafeMath.safeScale(z !== undefined ? z : x);
        
        if (safeX !== x || safeY !== (y !== undefined ? y : x) || safeZ !== (z !== undefined ? z : x)) {
            console.warn('🛡️ THREE.Vector3.set protected from NaN:', {x, y, z}, '→', {x: safeX, y: safeY, z: safeZ});
        }
        
        return originalScaleSet.call(this, safeX, safeY, safeZ);
    };
}

// 3. MAIN CHAT BUBBLE SYSTEM CLASS
class ChatBubbleSystem {
    constructor() {
        console.log('💬✨ ChatBubbleSystem v5.0 - Refactored version starting...');
        
        // Install THREE.js protection first
        installThreeJSProtection();
        
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
        
        // Enhanced configuration with positioning fixes
        this.config = {
            maxBubbles: 25,
            fadeTime: 8000,
            maxDistance: 60,
            fontSize: 18,
            maxWidth: 380,
            padding: 25,
            borderRadius: 20,
            yOffset: 3.5, // FIXED: Consistent height above avatars
            animationDuration: 600,
            maxBubblesPerUser: 4,
            enableDebug: false,
            enableShadows: true,
            cullingDistance: 100,
            enableSparkles: true,
            enableGlow: true,
            // POSITIONING FIXES
            minHeight: 2.0, // Minimum height above ground
            maxHeight: 15.0, // Maximum height
            overlapOffset: 0.8, // Horizontal offset between bubbles
            heightIncrement: 0.5, // Vertical stacking increment
            groundY: 0 // Ground level reference
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
        
        console.log('✅ ChatBubbleSystem v5.0 - Refactored version created');
    }
    
    bindMethods() {
        // Bind all methods to prevent context issues
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
        console.log('🚀 Initializing ChatBubbleSystem v5.0...');
        
        try {
            this._ensurePerformanceObject();
            
            if (!window.THREE) {
                console.warn('❌ THREE.js not available - retrying in 500ms');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            // Wait for scene systems
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
            
            console.log('✅ ChatBubbleSystem v5.0 initialized successfully');
            
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
        
        if (!window.ROOM_CONFIG?.chatBubblesEnabled) {
            console.log('💬 Chat bubbles disabled in config');
            return null;
        }
        
        try {
            const avatarPosition = this.getAvatarPosition(messageData.userId || messageData.user_id);
            if (!avatarPosition) {
                console.warn(`💬 No avatar found for user ${messageData.userId || messageData.user_id}`);
                
                // FIXED: Use ground-level fallback instead of random air position
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
    
    // FIXED: Create consistent ground-level position
    createGroundLevelFallbackPosition(userId) {
        const hash = userId.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
        const radius = 3 + (Math.abs(hash) % 4);
        
        const groundPosition = new THREE.Vector3(
            Math.cos(angle) * radius,
            this.config.groundY, // Always on ground level
            Math.sin(angle) * radius
        );
        
        console.log(`🔧 Created ground-level fallback position for ${userId}: (${groundPosition.x.toFixed(2)}, ${groundPosition.y.toFixed(2)}, ${groundPosition.z.toFixed(2)})`);
        return groundPosition;
    }
    
    // ENHANCED: Get avatar position with better fallback handling
    getAvatarPosition(userId) {
        console.log(`🔍 Getting avatar position for user: ${userId}`);
        
        try {
            // Strategy 1: Use AvatarSystem if available
            if (window.AvatarSystem?.getAvatarPosition) {
                const pos = window.AvatarSystem.getAvatarPosition(userId);
                if (pos) {
                    console.log(`✅ Found avatar position via AvatarSystem: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
                    return pos;
                }
            }
            
            // Strategy 2: Search scene for avatar with multiple ID patterns
            if (this.scene) {
                let avatar = null;
                
                const searchPatterns = [
                    child => child.userData?.userId === userId,
                    child => child.userData?.id === userId,  
                    child => child.userData?.user_id === userId,
                    child => child.name === userId,
                    child => child.userData?.username === userId
                ];
                
                for (const pattern of searchPatterns) {
                    avatar = this.scene.children.find(pattern);
                    if (avatar) {
                        console.log(`✅ Found avatar in scene, position: (${avatar.position.x.toFixed(2)}, ${avatar.position.y.toFixed(2)}, ${avatar.position.z.toFixed(2)})`);
                        return avatar.position.clone();
                    }
                }
            }
            
            // Strategy 3: Check if this is the current user
            if (userId === window.ROOM_CONFIG?.userId || 
                userId === window.WebSocketManager?.userId) {
                console.log(`✅ Using origin position for current user: ${userId}`);
                return new THREE.Vector3(0, this.config.groundY, 0);
            }
            
            // Strategy 4: Use WebSocket Manager's user tracking
            if (window.WebSocketManager?.connectedUsers?.has(userId)) {
                const userData = window.WebSocketManager.connectedUsers.get(userId);
                if (userData.position) {
                    console.log(`✅ Using WebSocket stored position for user: ${userId}`);
                    return new THREE.Vector3(
                        userData.position.x, 
                        userData.position.y || this.config.groundY, 
                        userData.position.z
                    );
                }
            }
            
            // Strategy 5: Return null - let caller handle fallback
            return null;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return null;
        }
    }
    
    // ENHANCED: Create bubble with improved positioning
    createBubble(message, username, position, userId = null) {
        if (!this.isInitialized || !window.THREE) {
            console.warn('💬 ChatBubbleSystem not ready');
            return null;
        }
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
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
            
            // Scale sprite
            const scale = 0.008;
            sprite.scale.set(bubbleWidth * scale, bubbleHeight * scale, 1);
            
            bubbleGroup.add(sprite);
            
            // FIXED: Calculate safe bubble position with overlap prevention
            const bubblePosition = this.calculateSafeBubblePosition(position, userId);
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
                originalPosition: bubblePosition.clone()
            };
            
            // Safe animation
            bubbleGroup.scale.set(0, 0, 0);
            this.animateBubbleInSafe(bubbleGroup);
            
            // Add to scene
            this.scene.add(bubbleGroup);
            
            // Track bubble
            this.activeBubbles.push(bubbleGroup);
            
            if (userId) {
                if (!this.bubbles.has(userId)) {
                    this.bubbles.set(userId, []);
                }
                this.bubbles.get(userId).push(bubbleGroup);
                
                // Limit bubbles per user
                const userBubbles = this.bubbles.get(userId);
                if (userBubbles.length > this.config.maxBubblesPerUser) {
                    const oldBubble = userBubbles.shift();
                    this.removeBubble(oldBubble);
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
    
    // FIXED: Calculate safe bubble position with proper overlap prevention
    calculateSafeBubblePosition(basePosition, userId) {
        const bubblePosition = basePosition.clone();
        
        // Ensure minimum height above ground
        bubblePosition.y = Math.max(
            this.config.minHeight, 
            basePosition.y + this.config.yOffset
        );
        
        // Ensure maximum height
        bubblePosition.y = Math.min(this.config.maxHeight, bubblePosition.y);
        
        // Handle overlap prevention
        if (userId && this.bubbles.has(userId)) {
            const userBubbles = this.bubbles.get(userId);
            const bubbleIndex = userBubbles.length;
            
            // Horizontal offset for multiple bubbles
            bubblePosition.x += bubbleIndex * this.config.overlapOffset;
            
            // Vertical stacking
            bubblePosition.y += bubbleIndex * this.config.heightIncrement;
            
            // Small Z offset to prevent z-fighting
            bubblePosition.z += bubbleIndex * 0.1;
        }
        
        return bubblePosition;
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
    
    // Enhanced bubble background with sparkle effects
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
    
    // FIXED: Safe animation with comprehensive NaN protection
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
                
                // Safe easing calculation
                const easeProgress = SafeMath.safeEasing(progress);
                
                // Safe bounce calculation
                let bounceScale = easeProgress;
                if (progress > 0.8) {
                    const bouncePhase = (progress - 0.8) / 0.2;
                    const bounce = Math.sin(bouncePhase * Math.PI * 4) * 0.1 * (1 - bouncePhase);
                    bounceScale = easeProgress + bounce;
                }
                
                // Safe scale calculation
                const rawScale = startScale + (endScale - startScale) * bounceScale;
                const safeScale = SafeMath.safeScale(rawScale);
                
                // Apply safe scale
                bubble.scale.setScalar(safeScale);
                
                // Safe rotation
                const rotation = (1 - progress) * 0.2 * Math.sin(progress * Math.PI * 2);
                bubble.rotation.z = isFinite(rotation) ? rotation : 0;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    bubble.userData.animationPhase = 'stable';
                    bubble.rotation.z = 0;
                    bubble.scale.setScalar(1); // Ensure final scale is exactly 1
                    
                    console.log('✅ Bubble animation completed safely:', bubble.userData?.message);
                    
                    // Schedule fade out
                    setTimeout(() => {
                        this.animateBubbleOut(bubble);
                    }, this.config.fadeTime);
                }
            } catch (error) {
                console.error('❌ Error in safe bubble animation:', error);
                // Fallback: set to stable state
                bubble.scale.setScalar(1);
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
                
                bubble.scale.setScalar(scale);
                
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
    
    // FIXED: Safe update method with comprehensive NaN protection
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        this._ensurePerformanceObject();
        const startTime = Date.now();
        
        try {
            this.activeBubbles.forEach(bubble => {
                if (!bubble || !bubble.parent) return;
                
                const distance = bubble.position.distanceTo(this.camera.position);
                
                // Culling
                if (distance > this.config.cullingDistance) {
                    bubble.visible = false;
                    bubble.userData.isVisible = false;
                    return;
                }
                
                bubble.visible = true;
                bubble.userData.isVisible = true;
                
                // Face camera
                bubble.lookAt(this.camera.position);
                
                // SAFE floating animation
                const time = Date.now() * 0.0008;
                const floatAmount = 0.05;
                const floatOffset = Math.sin(time + bubble.userData.id * 0.7) * floatAmount;
                
                // Safe Y position calculation
                const originalY = bubble.userData.originalPosition?.y || this.config.yOffset;
                const newY = Math.max(this.config.minHeight, originalY + floatOffset);
                bubble.position.y = isFinite(newY) ? newY : this.config.yOffset;
                
                // Safe swaying
                const swayAmount = 0.02;
                const swaySpeed = time * 0.4;
                const originalX = bubble.userData.originalPosition?.x || 0;
                const originalZ = bubble.userData.originalPosition?.z || 0;
                
                const swayX = Math.sin(swaySpeed + bubble.userData.id) * swayAmount;
                const swayZ = Math.cos(swaySpeed * 0.7 + bubble.userData.id * 0.5) * swayAmount;
                
                bubble.position.x = originalX + (isFinite(swayX) ? swayX : 0);
                bubble.position.z = originalZ + (isFinite(swayZ) ? swayZ : 0);
                
                // Safe rotation
                if (bubble.userData.animationPhase === 'stable') {
                    const rotationZ = Math.sin(time * 0.3 + bubble.userData.id) * 0.05;
                    bubble.rotation.z = isFinite(rotationZ) ? rotationZ : 0;
                }
                
                // Safe distance-based opacity and scale
                if (bubble.children[0]?.material) {
                    const normalizedDistance = Math.min(distance / this.config.maxDistance, 1);
                    const opacity = Math.max(0.3, 1 - Math.pow(normalizedDistance, 1.5)) * (bubble.userData.opacity || 1);
                    bubble.children[0].material.opacity = isFinite(opacity) ? opacity : 0.8;
                    
                    const rawScaleMultiplier = Math.max(0.7, 1 - normalizedDistance * 0.3);
                    const safeScaleMultiplier = SafeMath.safeScale(rawScaleMultiplier);
                    bubble.scale.setScalar(safeScaleMultiplier);
                }
            });
            
        } catch (error) {
            console.error('Error in safe update:', error);
        }
        
        // Performance tracking
        this._ensurePerformanceObject();
        this.performance.frameTime = Date.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    // Utility methods
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
            const userBubbles = this.bubbles.get(userId);
            userBubbles.forEach((bubble, index) => {
                if (bubble.userData.isVisible) {
                    const bubblePosition = newPosition.clone();
                    bubblePosition.y = Math.max(this.config.minHeight, bubblePosition.y + this.config.yOffset);
                    bubblePosition.x += index * this.config.overlapOffset;
                    bubblePosition.y += index * this.config.heightIncrement;
                    
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
    
    dispose() {
        try {
            this.clearAllBubbles();
            window.removeEventListener('resize', this.handleResize);
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

console.log('✅ ChatBubbleSystem v5.0 - Refactored version loaded successfully');
console.log('🎯 Key improvements:');
console.log('  - Fixed positioning system with ground-level fallbacks');
console.log('  - Comprehensive NaN protection for all scale operations');
console.log('  - Enhanced bubble overlap prevention');
console.log('  - Safe animation system with error recovery');
console.log('  - Improved performance and memory management');
console.log('');
console.log('🧪 Test with: window.ChatBubbleSystem.createTestBubble("Hello World!");');