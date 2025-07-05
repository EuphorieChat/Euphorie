// /static/js/systems/chat-bubble-system.js
// 3D Chat Bubble System for Euphorie - COMPLETELY FIXED VERSION
// Addresses all binding, performance, positioning, and design issues

class ChatBubbleSystem {
    constructor() {
        // Core properties
        this.bubbles = new Map(); // userId -> bubbles array
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInitialized = false;
        
        // Initialize pools and performance object with protection
        this._initializeObjectPools();
        this._ensurePerformanceObject();
        this._messageQueue = []; // Queue for messages received before initialization
        
        // Configuration
        this._initializeConfig();
        this._initializeStyles();
        this._initializeAnimations();
        
        // CRITICAL FIX: Bind ALL methods in constructor to prevent this context loss
        this._bindAllMethods();
        
        // Setup resize handler
        window.addEventListener('resize', this.handleResize);
        
        console.log('💬✨ Enhanced ChatBubbleSystem v3.1 created with proper binding and positioning');
    }
    
    // CRITICAL FIX: Bind all methods to prevent context loss
    _bindAllMethods() {
        const methodsToBind = [
            'init', 'createBubble', 'createBubbleFromMessage', 'update',
            'drawBubbleBackground', 'roundRect', 'calculateTextDimensions',
            'wrapText', 'animateBubbleIn', 'animateBubbleOut', 'removeBubble',
            'getAvatarPosition', 'positionBubble', 'performanceCleanup', 'startUpdateLoop',
            'handleResize', 'updateBubblePositions', 'removeUserBubbles',
            'clearAllBubbles', '_ensurePerformanceObject', 'addTexturePattern'
        ];
        
        methodsToBind.forEach(methodName => {
            if (typeof this[methodName] === 'function') {
                this[methodName] = this[methodName].bind(this);
            }
        });
        
        // Create safe wrapper methods for external access
        this.createBubbleFromMessageSafe = this._createSafeWrapper('createBubbleFromMessage');
        this.updateSafe = this._createSafeWrapper('update');
        this.initSafe = this._createSafeWrapper('init');
    }
    
    // Create safe wrapper that preserves context and handles errors
    _createSafeWrapper(methodName) {
        return (...args) => {
            try {
                if (!this[methodName] || typeof this[methodName] !== 'function') {
                    console.error(`Method ${methodName} not available`);
                    return null;
                }
                
                // Ensure critical objects exist
                this._ensurePerformanceObject();
                
                return this[methodName].apply(this, args);
            } catch (error) {
                console.error(`Error in safe wrapper for ${methodName}:`, error);
                return null;
            }
        };
    }
    
    // CRITICAL FIX: Performance object protection with validation
    _ensurePerformanceObject() {
        if (!this.performance || typeof this.performance !== 'object') {
            this.performance = {
                frameTime: 0,
                bubbleCount: 0,
                renderCalls: 0,
                lastCleanup: Date.now()
            };
            console.warn('🔧 Performance object was corrupted, recreated');
        }
        
        // Validate all required properties
        const requiredProps = ['frameTime', 'bubbleCount', 'renderCalls', 'lastCleanup'];
        let needsRepair = false;
        
        requiredProps.forEach(prop => {
            if (typeof this.performance[prop] !== 'number') {
                this.performance[prop] = prop === 'lastCleanup' ? Date.now() : 0;
                needsRepair = true;
            }
        });
        
        if (needsRepair) {
            console.warn('🔧 Performance object properties repaired');
        }
    }
    
    _initializeObjectPools() {
        this.materialPool = [];
        this.texturePool = [];
        
        // Pre-create reusable objects for better performance
        for (let i = 0; i < 10; i++) {
            try {
                if (window.THREE) {
                    this.materialPool.push(this._createBaseMaterial());
                }
            } catch (error) {
                console.warn('Could not create base material:', error);
                break;
            }
        }
    }
    
    _createBaseMaterial() {
        if (!window.THREE) return null;
        
        return new THREE.SpriteMaterial({ 
            transparent: true,
            alphaTest: 0.001,
            depthTest: false,
            depthWrite: false
        });
    }
    
    _initializeConfig() {
        this.config = {
            maxBubbles: window.ROOM_CONFIG?.bubbleConfig?.maxBubbles || 20,
            fadeTime: window.ROOM_CONFIG?.bubbleConfig?.fadeTime || 8000, // Longer display time
            maxDistance: window.ROOM_CONFIG?.bubbleConfig?.maxDistance || 50,
            fontSize: window.ROOM_CONFIG?.bubbleConfig?.fontSize || 14, // Slightly smaller
            maxWidth: window.ROOM_CONFIG?.bubbleConfig?.maxWidth || 280, // Slightly narrower
            padding: 16, // Reduced padding
            borderRadius: 12, // Slightly smaller radius
            yOffset: 1.8, // MUCH SMALLER - bubbles closer to avatars
            animationDuration: 600,
            maxBubblesPerUser: 3,
            enableDebug: false,
            textureResolution: 3, // Higher resolution
            enableShadows: true,
            soundEnabled: false,
            cullingDistance: 100,
            lodDistance: 30
        };
    }
    
    _initializeStyles() {
        this.bubbleStyles = {
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            usernameFontSize: this.config.fontSize * 0.75,
            usernameColor: '#667eea',
            textColor: '#2d3748',
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
        };
    }
    
    _initializeAnimations() {
        this.animations = {
            fadeIn: { duration: 600, easing: 'easeOutBack' },
            fadeOut: { duration: 500, easing: 'easeInQuart' },
            bounce: { duration: 400, easing: 'easeOutBounce' }
        };
        this.sounds = {};
        this.isMobile = window.innerWidth <= 768;
    }
    
    init() {
        try {
            if (!window.SceneManager?.scene) {
                console.log('💬 Waiting for SceneManager...');
                setTimeout(() => this.init(), 300);
                return;
            }
            
            this.scene = window.SceneManager.scene;
            this.camera = window.SceneManager.camera;
            this.renderer = window.SceneManager.renderer;
            
            if (!this.scene || !this.camera) {
                console.error('❌ Enhanced ChatBubbleSystem: Scene or camera not available');
                return;
            }
            
            // Ensure performance object is intact after init
            this._ensurePerformanceObject();
            
            this.isInitialized = true;
            console.log('✅ Enhanced ChatBubbleSystem v3.1 initialized successfully');
            
            this.startUpdateLoop();
            this.setupEventListeners();
            
            // Process any queued messages
            this._processQueuedMessages();
            
        } catch (error) {
            console.error('❌ Error initializing Enhanced ChatBubbleSystem:', error);
        }
    }
    
    _processQueuedMessages() {
        if (this._messageQueue && this._messageQueue.length > 0) {
            console.log(`Processing ${this._messageQueue.length} queued messages`);
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
            // Use safe wrappers for event listeners
            window.EventBus.on('chat_message', this.createBubbleFromMessageSafe);
            window.EventBus.on('user_left', (data) => this.removeUserBubbles(data.userId));
            window.EventBus.on('scene_changed', () => this.handleSceneChange());
        }
        
        // Enhanced avatar position tracking with safety checks
        if (window.AvatarSystem && window.AvatarSystem.updateAvatar) {
            const originalUpdateAvatar = window.AvatarSystem.updateAvatar;
            if (typeof originalUpdateAvatar === 'function') {
                window.AvatarSystem.updateAvatar = (userId, position, rotation, animation) => {
                    try {
                        originalUpdateAvatar.call(window.AvatarSystem, userId, position, rotation, animation);
                        this.updateBubblePositions(userId, position);
                    } catch (error) {
                        console.warn('Error in avatar update integration:', error);
                    }
                };
            }
        }
        
        // Performance monitoring with safety
        setInterval(() => {
            try {
                this.performanceCleanup();
            } catch (error) {
                console.warn('Error in performance cleanup:', error);
            }
        }, 10000);
    }
    
    createBubbleFromMessage(messageData) {
        // Queue message if not initialized
        if (!this.isInitialized) {
            console.log('💬 Queueing message (system not ready)');
            this._messageQueue.push(messageData);
            return null;
        }
        
        if (!window.ROOM_CONFIG?.chatBubblesEnabled) {
            return null;
        }
        
        try {
            const avatarPosition = this.getAvatarPosition(messageData.userId || messageData.user_id);
            if (!avatarPosition) {
                console.warn(`💬 No avatar found for user ${messageData.userId || messageData.user_id}`);
                // Use fallback position
                const fallbackPosition = new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    0,
                    (Math.random() - 0.5) * 10
                );
                return this.createBubble(
                    messageData.message,
                    messageData.username,
                    fallbackPosition,
                    messageData.userId || messageData.user_id
                );
            }
            
            const bubble = this.createBubble(
                messageData.message,
                messageData.username,
                avatarPosition,
                messageData.userId || messageData.user_id
            );
            
            // Play sound effect
            if (this.config.soundEnabled && (messageData.userId || messageData.user_id) !== window.ROOM_CONFIG?.userId) {
                this.playSound('pop');
            }
            
            if (this.config.enableDebug) {
                console.log(`💬✨ Enhanced bubble created for ${messageData.username}: ${messageData.message}`);
            }
            
            return bubble;
            
        } catch (error) {
            console.error('❌ Error creating enhanced bubble from message:', error);
            return null;
        }
    }
    
    // FIXED: Better avatar position detection and positioning
    getAvatarPosition(userId) {
        try {
            // Try multiple methods to get avatar position
            let avatarPosition = null;
            
            // Method 1: Use AvatarSystem if available
            if (window.AvatarSystem?.getAvatarPosition) {
                avatarPosition = window.AvatarSystem.getAvatarPosition(userId);
                if (avatarPosition) {
                    console.log(`Found avatar via AvatarSystem for ${userId}:`, avatarPosition);
                    return avatarPosition;
                }
            }
            
            // Method 2: Search scene for avatar objects
            if (this.scene) {
                // Look for various avatar patterns
                const avatarSearchPatterns = [
                    child => child.userData?.userId === userId,
                    child => child.userData?.id === userId,
                    child => child.name === userId,
                    child => child.name === `avatar_${userId}`,
                    child => child.userData?.type === 'avatar' && child.userData?.userId === userId
                ];
                
                for (const pattern of avatarSearchPatterns) {
                    const avatar = this.scene.children.find(pattern);
                    if (avatar) {
                        console.log(`Found avatar in scene for ${userId}:`, avatar.position);
                        return avatar.position.clone();
                    }
                }
                
                // Look in nested objects
                for (const child of this.scene.children) {
                    if (child.children && child.children.length > 0) {
                        for (const pattern of avatarSearchPatterns) {
                            const avatar = child.children.find(pattern);
                            if (avatar) {
                                // Get world position
                                const worldPos = new THREE.Vector3();
                                avatar.getWorldPosition(worldPos);
                                console.log(`Found nested avatar for ${userId}:`, worldPos);
                                return worldPos;
                            }
                        }
                    }
                }
            }
            
            // Method 3: Check if this is the current user
            if (userId === window.ROOM_CONFIG?.userId) {
                // For current user, use camera position but lower
                if (this.camera) {
                    const userPos = this.camera.position.clone();
                    userPos.y = Math.max(0, userPos.y - 2); // Place at ground level
                    console.log(`Using camera position for current user ${userId}:`, userPos);
                    return userPos;
                }
                return new THREE.Vector3(0, 0, 0);
            }
            
            // Method 4: Create consistent position based on user ID hash
            const hash = userId.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            
            const angle = (hash % 360) * (Math.PI / 180);
            const radius = 3 + (Math.abs(hash) % 4); // Closer radius
            
            const fallbackPos = new THREE.Vector3(
                Math.cos(angle) * radius,
                0, // Ground level
                Math.sin(angle) * radius
            );
            
            console.log(`Using fallback position for ${userId}:`, fallbackPos);
            return fallbackPos;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return new THREE.Vector3(0, 0, 0);
        }
    }
    
    // FIXED: Better bubble positioning with proper offset
    positionBubble(bubbleGroup, avatarPosition, userId, bubbleIndex = 0) {
        const bubblePosition = avatarPosition.clone();
        
        // MUCH SMALLER Y OFFSET - bubbles should be just above avatars
        bubblePosition.y += this.config.yOffset; // Using config value (1.8)
        
        // Better stacking for multiple bubbles from same user
        if (bubbleIndex > 0) {
            bubblePosition.y += bubbleIndex * 0.4; // Stack vertically
            bubblePosition.x += (bubbleIndex % 2) * 0.6; // Slight horizontal offset
            bubblePosition.z += Math.floor(bubbleIndex / 2) * 0.3; // Depth offset
        }
        
        bubbleGroup.position.copy(bubblePosition);
        bubbleGroup.userData.originalPosition = bubblePosition.clone();
        
        console.log(`Positioned bubble at:`, bubblePosition, `for user: ${userId}`);
    }
    
    // MUCH PRETTIER: Enhanced bubble background with modern design
    drawBubbleBackground(context, width, height) {
        if (!context || typeof width !== 'number' || typeof height !== 'number') {
            console.error('Invalid parameters for drawBubbleBackground');
            return;
        }
        
        try {
            // Clear the canvas first
            context.clearRect(0, 0, width, height);
            
            // Create gorgeous gradient background
            const mainGradient = context.createLinearGradient(0, 0, 0, height - 20);
            mainGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
            mainGradient.addColorStop(0.3, 'rgba(248, 250, 252, 0.96)');
            mainGradient.addColorStop(0.7, 'rgba(241, 245, 249, 0.94)');
            mainGradient.addColorStop(1, 'rgba(236, 240, 246, 0.92)');
            
            // Enhanced shadow with multiple layers for depth
            if (this.config.enableShadows) {
                context.save();
                
                // Outer shadow
                context.shadowColor = 'rgba(0, 0, 0, 0.15)';
                context.shadowBlur = 25;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 12;
                
                // Draw shadow shape
                context.fillStyle = 'rgba(0, 0, 0, 0.1)';
                context.beginPath();
                this.roundRect(context, 2, 2, width - 4, height - 22, this.config.borderRadius);
                context.fill();
                
                context.restore();
            }
            
            // Main bubble with beautiful gradient
            context.fillStyle = mainGradient;
            context.beginPath();
            this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
            context.fill();
            
            // Glassmorphism border effect
            const borderGradient = context.createLinearGradient(0, 0, width, height - 20);
            borderGradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
            borderGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.3)');
            borderGradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
            
            context.strokeStyle = borderGradient;
            context.lineWidth = 2;
            context.beginPath();
            this.roundRect(context, 1, 1, width - 2, height - 21, this.config.borderRadius - 1);
            context.stroke();
            
            // Inner glow for premium feel
            const innerGlow = context.createLinearGradient(0, 0, 0, height - 20);
            innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            innerGlow.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
            innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
            
            context.strokeStyle = innerGlow;
            context.lineWidth = 1;
            context.beginPath();
            this.roundRect(context, 3, 3, width - 6, height - 23, this.config.borderRadius - 3);
            context.stroke();
            
            // Modern bubble tail with gradient
            const tailGradient = context.createLinearGradient(width / 2 - 15, height - 20, width / 2 + 15, height);
            tailGradient.addColorStop(0, 'rgba(248, 250, 252, 0.96)');
            tailGradient.addColorStop(1, 'rgba(241, 245, 249, 0.92)');
            
            context.fillStyle = tailGradient;
            context.beginPath();
            context.moveTo(width / 2 - 12, height - 20);
            context.quadraticCurveTo(width / 2, height - 4, width / 2 + 12, height - 20);
            context.closePath();
            context.fill();
            
            // Tail border
            context.strokeStyle = borderGradient;
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(width / 2 - 12, height - 20);
            context.quadraticCurveTo(width / 2, height - 4, width / 2 + 12, height - 20);
            context.stroke();
            
            // Subtle pattern overlay for texture
            this.addTexturePattern(context, width, height - 20);
            
        } catch (error) {
            console.error('Error in drawBubbleBackground:', error);
        }
    }
    
    // NEW: Add subtle texture pattern for premium look
    addTexturePattern(context, width, height) {
        try {
            // Create subtle dot pattern
            context.fillStyle = 'rgba(102, 126, 234, 0.03)';
            const dotSize = 1;
            const spacing = 8;
            
            for (let x = spacing; x < width - spacing; x += spacing) {
                for (let y = spacing; y < height - spacing; y += spacing) {
                    context.beginPath();
                    context.arc(x, y, dotSize, 0, Math.PI * 2);
                    context.fill();
                }
            }
        } catch (error) {
            console.warn('Error adding texture pattern:', error);
        }
    }
    
    // FIXED: Properly bound roundRect method
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
    
    // ENHANCED: Much prettier bubble creation with better positioning
    createBubble(message, username, position, userId = null) {
        if (!this.isInitialized) {
            console.warn('💬 ChatBubbleSystem not initialized');
            return null;
        }
        
        if (!window.THREE) {
            console.warn('💬 THREE.js not available');
            return null;
        }
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
            // Create canvas for bubble with proper text wrapping
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
                console.error('Could not get canvas context');
                return null;
            }
            
            // Enhanced fonts for prettier text
            const usernameFont = `bold ${this.config.fontSize * 0.75}px "SF Pro Display", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif`;
            const messageFont = `${this.config.fontSize}px "SF Pro Text", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif`;
            
            // Calculate text dimensions with proper wrapping
            const textMetrics = this.calculateTextDimensions(context, message, username, usernameFont, messageFont);
            
            // Set canvas size based on actual text content (higher DPI for crisp text)
            const bubbleWidth = textMetrics.bubbleWidth;
            const bubbleHeight = textMetrics.bubbleHeight;
            
            canvas.width = bubbleWidth * 3; // Ultra high DPI
            canvas.height = bubbleHeight * 3;
            context.scale(3, 3); // Ultra high DPI scaling
            
            // Enable font smoothing
            context.textRenderingOptimization = 'optimizeQuality';
            context.imageSmoothingEnabled = true;
            
            // Draw beautiful background
            this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
            
            // Draw username with enhanced styling
            context.font = usernameFont;
            context.textAlign = 'left';
            
            // Username background with modern pill design
            const usernameWidth = context.measureText(username).width;
            const pillGradient = context.createLinearGradient(0, this.config.padding - 4, usernameWidth + 20, this.config.padding + 20);
            pillGradient.addColorStop(0, 'rgba(102, 126, 234, 0.15)');
            pillGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.12)');
            pillGradient.addColorStop(1, 'rgba(59, 130, 246, 0.15)');
            
            context.fillStyle = pillGradient;
            context.beginPath();
            this.roundRect(context, this.config.padding - 6, this.config.padding - 4, usernameWidth + 12, 22, 11);
            context.fill();
            
            // Username border with glow
            const usernameBorder = context.createLinearGradient(0, this.config.padding - 4, usernameWidth + 20, this.config.padding + 20);
            usernameBorder.addColorStop(0, 'rgba(102, 126, 234, 0.5)');
            usernameBorder.addColorStop(1, 'rgba(168, 85, 247, 0.4)');
            
            context.strokeStyle = usernameBorder;
            context.lineWidth = 1.5;
            context.beginPath();
            this.roundRect(context, this.config.padding - 6, this.config.padding - 4, usernameWidth + 12, 22, 11);
            context.stroke();
            
            // Username text with gradient
            const usernameGradient = context.createLinearGradient(0, this.config.padding, 0, this.config.padding + 15);
            usernameGradient.addColorStop(0, '#667eea');
            usernameGradient.addColorStop(1, '#764ba2');
            
            context.fillStyle = usernameGradient;
            context.fillText(username, this.config.padding, this.config.padding + 12);
            
            // Draw message text with enhanced styling
            context.font = messageFont;
            context.fillStyle = this.bubbleStyles.textColor;
            
            // Add subtle text shadow for depth
            context.shadowColor = 'rgba(255, 255, 255, 0.8)';
            context.shadowBlur = 1;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 1;
            
            textMetrics.lines.forEach((line, index) => {
                context.fillText(
                    line,
                    this.config.padding,
                    this.config.padding + this.config.fontSize * 0.75 + 30 + (index * textMetrics.lineHeight)
                );
            });
            
            // Reset shadow
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            context.shadowOffsetY = 0;
            
            // Create sprite with enhanced material
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.flipY = false; // Prevent texture flipping
            
            const material = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                alphaTest: 0.001,
                depthTest: false,
                depthWrite: false
            });
            
            const sprite = new THREE.Sprite(material);
            
            // FIXED: Better scaling for proper size
            const scale = 0.006; // Reduced scale for more reasonable size
            sprite.scale.set(bubbleWidth * scale, bubbleHeight * scale, 1);
            
            bubbleGroup.add(sprite);
            
            // FIXED: Better positioning logic
            const bubbleIndex = userId && this.bubbles.has(userId) ? this.bubbles.get(userId).length : 0;
            this.positionBubble(bubbleGroup, position, userId, bubbleIndex);
            
            // Add bubble properties
            bubbleGroup.userData = {
                id: bubbleId,
                message: message,
                username: username,
                userId: userId,
                createdAt: Date.now(),
                opacity: 1,
                isVisible: true,
                originalPosition: bubbleGroup.position.clone(),
                priority: 50,
                isPretty: true,
                bubbleIndex: bubbleIndex
            };
            
            // Enhanced animation with bounce
            bubbleGroup.scale.set(0, 0, 0);
            this.animateBubbleIn(bubbleGroup);
            
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
            
            // Clean up old bubbles globally
            if (this.activeBubbles.length > this.config.maxBubbles) {
                const oldBubble = this.activeBubbles.shift();
                this.removeBubble(oldBubble);
            }
            
            console.log(`✨ Created beautiful bubble for ${username} at position:`, bubbleGroup.position);
            return bubbleGroup;
            
        } catch (error) {
            console.error('❌ Error creating bubble:', error);
            return null;
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
            
            // Calculate the actual width needed
            let maxTextWidth = usernameWidth;
            lines.forEach(line => {
                const lineWidth = context.measureText(line).width;
                if (lineWidth > maxTextWidth) {
                    maxTextWidth = lineWidth;
                }
            });
            
            // Calculate dimensions
            const lineHeight = this.config.fontSize * 1.2;
            const bubbleWidth = Math.max(maxTextWidth + this.config.padding * 2, 120);
            const bubbleHeight = this.config.padding * 2 + // top and bottom padding
                                this.config.fontSize * 0.75 + // username height
                                30 + // spacing between username and message + username pill
                                (lines.length * lineHeight) + // message text height
                                25; // tail height
            
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
            
            // Handle case where a single word is longer than maxWidth
            const finalLines = [];
            for (const line of lines) {
                if (context.measureText(line).width <= maxWidth) {
                    finalLines.push(line);
                } else {
                    // Break long words
                    let remainingText = line;
                    while (remainingText.length > 0) {
                        let cutoff = remainingText.length;
                        while (cutoff > 0 && context.measureText(remainingText.substring(0, cutoff)).width > maxWidth) {
                            cutoff--;
                        }
                        if (cutoff === 0) cutoff = 1; // Ensure progress
                        finalLines.push(remainingText.substring(0, cutoff));
                        remainingText = remainingText.substring(cutoff);
                    }
                }
            }
            
            return finalLines;
        } catch (error) {
            console.error('Error wrapping text:', error);
            return [text];
        }
    }
    
    // ENHANCED: Smoother animation with better easing
    animateBubbleIn(bubble) {
        if (!bubble) return;
        
        const startScale = 0;
        const endScale = 1;
        const duration = this.animations.fadeIn.duration;
        const startTime = Date.now();
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Enhanced easing with more realistic bounce
                let easeProgress;
                if (progress < 0.6) {
                    // Ease out back
                    const c1 = 1.70158;
                    const c3 = c1 + 1;
                    easeProgress = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
                } else {
                    // Gentle settle
                    easeProgress = 1 - 0.1 * Math.pow(1 - progress, 3);
                }
                
                const scale = startScale + (endScale - startScale) * easeProgress;
                bubble.scale.set(scale, scale, scale);
                
                // Very subtle rotation for natural feel
                bubble.rotation.z = Math.sin(progress * Math.PI * 1.5) * 0.02;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    bubble.rotation.z = 0; // Reset rotation
                    // Schedule fade out
                    setTimeout(() => {
                        this.animateBubbleOut(bubble);
                    }, this.config.fadeTime);
                }
            } catch (error) {
                console.error('Error in animateBubbleIn:', error);
            }
        };
        
        animate();
    }
    
    animateBubbleOut(bubble) {
        if (!bubble || !bubble.parent) return;
        
        const duration = this.animations.fadeOut.duration;
        const startTime = Date.now();
        const startOpacity = bubble.userData.opacity || 1;
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = progress * progress; // Ease in
                
                const opacity = startOpacity * (1 - easeProgress);
                const scale = 1 - (easeProgress * 0.3);
                
                if (bubble.children[0]?.material) {
                    bubble.children[0].material.opacity = opacity;
                    bubble.userData.opacity = opacity;
                }
                
                bubble.scale.multiplyScalar(scale);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.removeBubble(bubble);
                }
            } catch (error) {
                console.error('Error in animateBubbleOut:', error);
            }
        };
        
        animate();
    }
    
    // ENHANCED: More realistic floating animation
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        // FIXED: Ensure performance object exists with protection
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
                
                // MORE SUBTLE floating animation
                const time = Date.now() * 0.001;
                const floatAmount = 0.02; // Reduced from 0.03
                const floatSpeed = 0.8; // Slower floating
                const floatOffset = Math.sin(time * floatSpeed + bubble.userData.id * 0.3) * floatAmount;
                bubble.position.y = bubble.userData.originalPosition.y + floatOffset;
                
                // VERY GENTLE swaying
                const swayAmount = 0.008; // Much reduced
                const swaySpeed = 0.4; // Slower swaying
                bubble.position.x = bubble.userData.originalPosition.x + 
                    Math.sin(time * swaySpeed + bubble.userData.id) * swayAmount;
                bubble.position.z = bubble.userData.originalPosition.z + 
                    Math.cos(time * swaySpeed * 0.7 + bubble.userData.id) * swayAmount;
                
                // Distance-based opacity with smoother transition
                if (bubble.children[0]?.material) {
                    const opacity = Math.max(0.6, 1 - (distance / this.config.maxDistance));
                    bubble.children[0].material.opacity = opacity * bubble.userData.opacity;
                }
            });
            
        } catch (error) {
            console.error('❌ Error in Enhanced ChatBubbleSystem update:', error);
        }
        
        // Performance tracking - FIXED with protection
        this._ensurePerformanceObject();
        this.performance.frameTime = Date.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    performanceCleanup() {
        const now = Date.now();
        
        // Ensure performance object exists
        this._ensurePerformanceObject();
        
        if (now - this.performance.lastCleanup > 10000) {
            try {
                // Clean up expired textures
                this.activeBubbles.forEach(bubble => {
                    if (now - bubble.userData.createdAt > this.config.fadeTime * 3) {
                        this.removeBubble(bubble);
                    }
                });
                
                // Return unused materials to pool
                while (this.materialPool && this.materialPool.length > 15) {
                    const material = this.materialPool.pop();
                    if (material && material.dispose) {
                        material.dispose();
                    }
                }
                
                this.performance.lastCleanup = now;
                
                if (this.config.enableDebug) {
                    console.log('🧹 Performance cleanup completed', {
                        bubbles: this.performance.bubbleCount,
                        avgFrameTime: this.performance.frameTime.toFixed(2) + 'ms',
                        materialPool: this.materialPool ? this.materialPool.length : 0
                    });
                }
            } catch (error) {
                console.warn('Error in performance cleanup:', error);
            }
        }
    }
    
    removeBubble(bubble) {
        if (!bubble) return;
        
        try {
            // Remove from scene
            if (bubble.parent) {
                bubble.parent.remove(bubble);
            }
            
            // Clean up resources
            bubble.children.forEach(child => {
                if (child.material) {
                    if (child.material.map) {
                        child.material.map.dispose();
                    }
                    // Return material to pool instead of disposing
                    child.material.map = null;
                    if (this.materialPool) {
                        this.materialPool.push(child.material);
                    }
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            });
            
            // Remove from tracking
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
            console.error('❌ Error removing enhanced bubble:', error);
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
                    bubblePosition.y += this.config.yOffset;
                    bubblePosition.x += index * 0.6;
                    bubblePosition.y += index * 0.4;
                    
                    // Smooth interpolation
                    bubble.userData.originalPosition.lerp(bubblePosition, 0.15);
                }
            });
        } catch (error) {
            console.error('Error updating bubble positions:', error);
        }
    }
    
    handleResize() {
        try {
            // Adjust mobile settings on orientation change
            if (this.isMobile) {
                const isLandscape = window.innerWidth > window.innerHeight;
                this.config.maxBubbles = isLandscape ? 18 : 12;
            }
        } catch (error) {
            console.error('Error handling resize:', error);
        }
    }
    
    handleSceneChange() {
        try {
            // Optionally clear bubbles on scene change
            if (window.ROOM_CONFIG?.clearBubblesOnSceneChange) {
                this.clearAllBubbles();
            }
        } catch (error) {
            console.error('Error handling scene change:', error);
        }
    }
    
    startUpdateLoop() {
        const update = () => {
            try {
                if (this.isInitialized) {
                    this.update();
                }
            } catch (error) {
                console.error('Error in update loop:', error);
            }
            requestAnimationFrame(update);
        };
        update();
    }
    
    clearAllBubbles() {
        try {
            const bubblesToRemove = this.activeBubbles.slice();
            bubblesToRemove.forEach(bubble => {
                this.removeBubble(bubble);
            });
            
            this.activeBubbles = [];
            this.bubbles.clear();
            
            console.log('💬✨ All enhanced chat bubbles cleared');
        } catch (error) {
            console.error('Error clearing bubbles:', error);
        }
    }
    
    playSound(type) {
        // Simple sound placeholder
        if (!this.config.soundEnabled) return;
        console.log(`🔊 Playing sound: ${type}`);
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
        console.log(`💬✨ Enhanced ChatBubbleSystem debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    getPerformanceStats() {
        this._ensurePerformanceObject();
        return {
            ...this.performance,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 2048, // Estimated
            materialPoolSize: this.materialPool ? this.materialPool.length : 0,
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
            1,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('💬✨ Enhanced ChatBubbleSystem config updated:', newConfig);
    }
    
    dispose() {
        try {
            // Clean up all resources
            this.clearAllBubbles();
            
            if (this.materialPool) {
                this.materialPool.forEach(material => {
                    if (material && material.dispose) {
                        material.dispose();
                    }
                });
            }
            
            if (this.texturePool) {
                this.texturePool.forEach(texture => {
                    if (texture && texture.dispose) {
                        texture.dispose();
                    }
                });
            }
            
            window.removeEventListener('resize', this.handleResize);
            
            console.log('💬✨ Enhanced ChatBubbleSystem disposed');
        } catch (error) {
            console.error('Error disposing ChatBubbleSystem:', error);
        }
    }
    
    // CRITICAL FIX: Static method to get singleton instance
    static getInstance() {
        if (!ChatBubbleSystem._instance) {
            ChatBubbleSystem._instance = new ChatBubbleSystem();
        }
        return ChatBubbleSystem._instance;
    }
}

// CRITICAL FIX: Export both class and instance for compatibility
window.ChatBubbleSystemClass = ChatBubbleSystem;
window.ChatBubbleSystem = ChatBubbleSystem.getInstance();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatBubbleSystem;
}