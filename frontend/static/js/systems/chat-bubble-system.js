// /static/js/systems/chat-bubble-system.js
// COMPLETELY FIXED ChatBubbleSystem v4.1 - All Assignment Errors Fixed
// Fixes: positioning, binding, integration, performance, WebSocket compatibility

class ChatBubbleSystem {
    constructor() {
        // CRITICAL: Prevent multiple instances
        if (ChatBubbleSystem._instance) {
            console.warn('ChatBubbleSystem instance already exists, returning existing instance');
            return ChatBubbleSystem._instance;
        }
        
        // Core properties with protection
        this.bubbles = new Map(); // userId -> bubbles array
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // NEW: Stack positioning tracking
        this.stackPositions = new Map(); // Track vertical stacking per user
        
        // Message queue and state management
        this._messageQueue = [];
        this._isProcessingQueue = false;
        this._avatarPositions = new Map(); // Cache for avatar positions
        this._lastAvatarUpdate = new Map(); // Track last update times
        
        // Performance and resource management
        this._initializeObjectPools();
        this._ensurePerformanceObject();
        
        // Configuration with enhanced defaults
        this._initializeConfig();
        this._initializeStyles();
        this._initializeAnimations();
        
        // CRITICAL FIX: Bind ALL methods immediately in constructor
        this._bindAllMethods();
        
        // Event listeners and resize handler
        this._setupEventListeners();
        
        // Set as singleton instance
        ChatBubbleSystem._instance = this;
        
        console.log('💬✨ ChatBubbleSystem v4.1 created with assignment fixes');
    }
    
    // CRITICAL FIX: Comprehensive method binding
    _bindAllMethods() {
        const methodsToBind = [
            // Core methods
            'init', 'createBubble', 'createBubbleFromMessage', 'update',
            'getAvatarPosition', 'removeBubble', 'updateBubblePositions',
            
            // NEW: Position calculation methods
            '_calculateOptimalPosition', 'avoidOverlapAtPosition', 'positionBubbleAboveAvatar',
            
            // Drawing and animation methods
            'drawBubbleBackground', 'roundRect', 'calculateTextDimensions',
            'wrapText', 'animateBubbleIn', 'animateBubbleOut',
            
            // Event handlers
            'handleResize', 'handleSceneChange', 'handleAvatarPositionUpdate',
            
            // Utility methods
            'performanceCleanup', 'startUpdateLoop', 'clearAllBubbles',
            'removeUserBubbles', '_ensurePerformanceObject', '_processQueuedMessages',
            '_updateAvatarPositionCache', '_isValidAvatarPosition'
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
        
        console.log('🔧 All ChatBubbleSystem methods bound successfully');
    }
    
    // Safe wrapper that preserves context and handles errors gracefully
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
    
    // CRITICAL FIX: Enhanced performance object with validation
    _ensurePerformanceObject() {
        if (!this.performance || typeof this.performance !== 'object') {
            this.performance = {
                frameTime: 0,
                bubbleCount: 0,
                renderCalls: 0,
                lastCleanup: Date.now(),
                averageFrameTime: 0,
                frameCounter: 0
            };
        }
        
        // Validate all required properties
        const requiredProps = ['frameTime', 'bubbleCount', 'renderCalls', 'lastCleanup', 'averageFrameTime', 'frameCounter'];
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
        this.canvasPool = [];
        
        // Pre-create reusable objects for performance
        for (let i = 0; i < 5; i++) {
            try {
                if (window.THREE) {
                    this.materialPool.push(this._createBaseMaterial());
                    this.canvasPool.push(this._createBaseCanvas());
                }
            } catch (error) {
                console.warn('Could not create pooled objects:', error);
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
    
    _createBaseCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        return canvas;
    }
    
    _initializeConfig() {
        this.config = {
            maxBubbles: window.ROOM_CONFIG?.bubbleConfig?.maxBubbles || 20,
            fadeTime: window.ROOM_CONFIG?.bubbleConfig?.fadeTime || 6000,
            maxDistance: window.ROOM_CONFIG?.bubbleConfig?.maxDistance || 50,
            fontSize: window.ROOM_CONFIG?.bubbleConfig?.fontSize || 18,
            maxWidth: window.ROOM_CONFIG?.bubbleConfig?.maxWidth || 350,
            padding: 20,
            borderRadius: 15,
            yOffset: 2.8, // FIXED: Better positioning above avatars
            animationDuration: 400,
            maxBubblesPerUser: 3,
            enableDebug: false,
            textureResolution: 2,
            enableShadows: true,
            soundEnabled: false,
            cullingDistance: 100,
            lodDistance: 30,
            // NEW: Enhanced positioning options
            stackSpacing: 0.6,
            horizontalSpread: 0.8,
            depthVariation: 0.1,
            avoidOverlap: true,
            smoothMovement: true
        };
    }
    
    _initializeStyles() {
        this.bubbleStyles = {
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            usernameFontSize: this.config.fontSize * 0.8,
            usernameColor: '#667eea',
            textColor: '#333333',
            shadowBlur: 15,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            // NEW: Enhanced visual effects
            glowColor: 'rgba(102, 126, 234, 0.3)',
            borderGradient: ['rgba(102, 126, 234, 0.4)', 'rgba(168, 85, 247, 0.3)']
        };
    }
    
    _initializeAnimations() {
        this.animations = {
            fadeIn: { duration: 400, easing: 'easeOutBack' },
            fadeOut: { duration: 600, easing: 'easeInQuart' },
            bounce: { duration: 500, easing: 'easeOutBounce' },
            float: { speed: 0.3, amount: 0.08 },
            sway: { speed: 0.4, amount: 0.02 }
        };
        this.isMobile = window.innerWidth <= 768;
    }
    
    _setupEventListeners() {
        // Window resize handler
        window.addEventListener('resize', this.handleResize);
        
        // Performance cleanup interval
        this._cleanupInterval = setInterval(this.performanceCleanup, 10000);
        
        // Avatar position tracking
        this._positionUpdateInterval = setInterval(() => {
            this._updateAvatarPositionCache();
        }, 1000);
    }
    
    // FIXED: Robust initialization with proper dependency handling
    init() {
        // Return existing promise if initialization is in progress
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        
        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }
    
    async _performInitialization() {
        try {
            console.log('🚀 Initializing ChatBubbleSystem v4.1...');
            
            // Wait for required systems with timeout
            await this._waitForRequiredSystems();
            
            // Get scene references
            this.scene = window.SceneManager?.scene;
            this.camera = window.SceneManager?.camera;
            this.renderer = window.SceneManager?.renderer;
            
            if (!this.scene || !this.camera) {
                throw new Error('Required 3D systems not available');
            }
            
            // Ensure performance object is intact
            this._ensurePerformanceObject();
            
            // Setup system integrations
            this._setupSystemIntegrations();
            
            // Start main update loop
            this.startUpdateLoop();
            
            // Process any queued messages
            this._processQueuedMessages();
            
            this.isInitialized = true;
            console.log('✅ ChatBubbleSystem v4.1 initialized successfully');
            
            // Emit initialization event
            if (window.EventBus) {
                window.EventBus.emit('chat-bubble-system:initialized', this);
            }
            
        } catch (error) {
            console.error('❌ ChatBubbleSystem initialization failed:', error);
            this.isInitialized = false;
            throw error;
        }
    }
    
    async _waitForRequiredSystems(timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (window.SceneManager?.scene && window.SceneManager?.camera) {
                console.log('✅ Required 3D systems found');
                return;
            }
            
            console.log('⏳ Waiting for 3D systems...');
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        throw new Error('Timeout waiting for required 3D systems');
    }
    
    _setupSystemIntegrations() {
        // EventBus integration
        if (window.EventBus) {
            // Listen for avatar events
            window.EventBus.on('avatar:created', (data) => {
                console.log(`👤 Avatar created: ${data.id}`);
                this._updateAvatarPositionCache();
                this._processQueuedMessages();
            });
            
            window.EventBus.on('avatar:position-changed', (data) => {
                this.handleAvatarPositionUpdate(data.userId, data.position);
            });
            
            window.EventBus.on('chat_message', this.createBubbleFromMessageSafe);
            window.EventBus.on('user_left', (data) => this.removeUserBubbles(data.userId));
            window.EventBus.on('scene_changed', this.handleSceneChange);
        }
        
        // AvatarSystem integration
        this._integrateWithAvatarSystem();
    }
    
    _integrateWithAvatarSystem() {
        if (window.AvatarSystem) {
            // Enhance AvatarSystem with position notifications
            const originalUpdatePosition = window.AvatarSystem.updateAvatarPosition;
            if (typeof originalUpdatePosition === 'function') {
                window.AvatarSystem.updateAvatarPosition = (avatarId, position) => {
                    try {
                        originalUpdatePosition.call(window.AvatarSystem, avatarId, position);
                        this.handleAvatarPositionUpdate(avatarId, position);
                    } catch (error) {
                        console.warn('Error in avatar update integration:', error);
                    }
                };
            }
        }
    }
    
    // FIXED: Enhanced message creation with proper avatar integration
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
            const userId = messageData.userId || messageData.user_id;
            const username = messageData.username || 'Unknown';
            const message = messageData.message || '';
            
            // FIXED: Enhanced avatar position detection
            const avatarPosition = this.getAvatarPosition(userId);
            
            if (!avatarPosition) {
                console.warn(`💬 No avatar found for user ${userId}, using fallback`);
                // Use intelligent fallback position
                const fallbackPosition = this._generateFallbackPosition(userId);
                return this.createBubble(message, username, fallbackPosition, userId);
            }
            
            // Create bubble with proper positioning
            const bubble = this.createBubble(message, username, avatarPosition, userId);
            
            if (bubble && this.config.enableDebug) {
                console.log(`💬✨ Bubble created for ${username}: ${message}`);
            }
            
            return bubble;
            
        } catch (error) {
            console.error('❌ Error creating bubble from message:', error);
            return null;
        }
    }
    
    // FIXED: Enhanced avatar position detection with multiple fallbacks
    getAvatarPosition(userId) {
        try {
            // Method 1: Use AvatarSystem.getAvatarPosition if available
            if (window.AvatarSystem?.getAvatarPosition) {
                const position = window.AvatarSystem.getAvatarPosition(userId);
                if (this._isValidAvatarPosition(position)) {
                    this._avatarPositions.set(userId, position.clone());
                    this._lastAvatarUpdate.set(userId, Date.now());
                    return position;
                }
            }
            
            // Method 2: Direct AvatarSystem.avatars access
            if (window.AvatarSystem?.avatars?.has(userId)) {
                const avatar = window.AvatarSystem.avatars.get(userId);
                if (avatar?.group?.position) {
                    const position = avatar.group.position.clone();
                    if (this._isValidAvatarPosition(position)) {
                        this._avatarPositions.set(userId, position);
                        this._lastAvatarUpdate.set(userId, Date.now());
                        return position;
                    }
                }
            }
            
            // Method 3: Scene traversal
            if (this.scene) {
                const avatar = this.scene.children.find(child => 
                    child.userData?.userId === userId || child.name === `avatar_${userId}`
                );
                if (avatar?.position) {
                    const position = avatar.position.clone();
                    if (this._isValidAvatarPosition(position)) {
                        this._avatarPositions.set(userId, position);
                        this._lastAvatarUpdate.set(userId, Date.now());
                        return position;
                    }
                }
            }
            
            // Method 4: Search in scene groups
            if (this.scene) {
                for (const child of this.scene.children) {
                    if (child.isGroup || child.children.length > 0) {
                        const avatar = child.children.find(subChild =>
                            subChild.userData?.userId === userId
                        );
                        if (avatar?.position) {
                            const worldPosition = new THREE.Vector3();
                            avatar.getWorldPosition(worldPosition);
                            if (this._isValidAvatarPosition(worldPosition)) {
                                this._avatarPositions.set(userId, worldPosition);
                                this._lastAvatarUpdate.set(userId, Date.now());
                                return worldPosition;
                            }
                        }
                    }
                }
            }
            
            // Method 5: Use cached position if recent
            if (this._avatarPositions.has(userId)) {
                const lastUpdate = this._lastAvatarUpdate.get(userId) || 0;
                if (Date.now() - lastUpdate < 30000) { // 30 second cache
                    return this._avatarPositions.get(userId).clone();
                }
            }
            
            // Method 6: Default position for current user
            if (userId === window.ROOM_CONFIG?.userId) {
                return new THREE.Vector3(0, 0, 0);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return null;
        }
    }
    
    _isValidAvatarPosition(position) {
        return position && 
               typeof position.x === 'number' && 
               typeof position.y === 'number' && 
               typeof position.z === 'number' &&
               !isNaN(position.x) && 
               !isNaN(position.y) && 
               !isNaN(position.z);
    }
    
    _generateFallbackPosition(userId) {
        // Create consistent but varied positions based on user ID
        const hash = this._hashUserId(userId);
        const angle = (hash % 360) * (Math.PI / 180);
        const radius = 3 + (Math.abs(hash) % 5);
        
        return new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
    }
    
    _hashUserId(userId) {
        let hash = 0;
        const str = userId.toString();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    _updateAvatarPositionCache() {
        if (!window.AvatarSystem?.getAllAvatars) return;
        
        try {
            const avatars = window.AvatarSystem.getAllAvatars();
            avatars.forEach(avatar => {
                if (avatar.id && avatar.group?.position) {
                    this._avatarPositions.set(avatar.id, avatar.group.position.clone());
                    this._lastAvatarUpdate.set(avatar.id, Date.now());
                }
            });
        } catch (error) {
            console.warn('Error updating avatar position cache:', error);
        }
    }
    
    handleAvatarPositionUpdate(userId, position) {
        if (!this._isValidAvatarPosition(position)) return;
        
        this._avatarPositions.set(userId, position.clone());
        this._lastAvatarUpdate.set(userId, Date.now());
        this.updateBubblePositions(userId, position);
    }
    
    // CRITICAL FIX: Add the missing _calculateOptimalPosition method
    _calculateOptimalPosition(basePosition, userId, bubbleIndex = 0) {
        try {
            // CRITICAL FIX: Use let instead of const for reassignable variables
            let optimalPosition = basePosition ? basePosition.clone() : this._generateFallbackPosition(userId);
            
            // Calculate stacking offset
            const stackSpacing = this.config.stackSpacing || 0.6;
            const yOffset = this.config.yOffset + (bubbleIndex * stackSpacing);
            
            // Apply vertical offset
            optimalPosition.y += yOffset;
            
            // Overlap avoidance
            if (this.config.avoidOverlap) {
                optimalPosition = this.avoidOverlapAtPosition(optimalPosition, userId);
            }
            
            return optimalPosition;
            
        } catch (error) {
            console.warn('Error calculating optimal position:', error);
            return new THREE.Vector3(0, this.config.yOffset || 3.0, 0);
        }
    }
    
    // CRITICAL FIX: Add the missing avoidOverlapAtPosition method
    avoidOverlapAtPosition(position, userId) {
        try {
            // CRITICAL FIX: Use let for reassignable variable
            let adjustedPosition = position.clone();
            const minDistance = 1.5;
            let attempts = 0;
            const maxAttempts = 5;
            
            while (attempts < maxAttempts) {
                let hasCollision = false;
                
                for (const [id, existingBubble] of this.bubbles) {
                    if (existingBubble.userData?.userId === userId) continue;
                    
                    if (existingBubble.position) {
                        const distance = adjustedPosition.distanceTo(existingBubble.position);
                        
                        if (distance < minDistance) {
                            // Move bubble to avoid overlap
                            const direction = adjustedPosition.clone().sub(existingBubble.position).normalize();
                            adjustedPosition = existingBubble.position.clone().add(direction.multiplyScalar(minDistance));
                            hasCollision = true;
                            break;
                        }
                    }
                }
                
                // Also check against active bubbles
                for (const bubble of this.activeBubbles) {
                    if (bubble.userData?.userId === userId) continue;
                    
                    if (bubble.position) {
                        const distance = adjustedPosition.distanceTo(bubble.position);
                        
                        if (distance < minDistance) {
                            const direction = adjustedPosition.clone().sub(bubble.position).normalize();
                            adjustedPosition = bubble.position.clone().add(direction.multiplyScalar(minDistance));
                            hasCollision = true;
                            break;
                        }
                    }
                }
                
                if (!hasCollision) break;
                attempts++;
            }
            
            return adjustedPosition;
            
        } catch (error) {
            console.warn('Error in overlap avoidance:', error);
            return position;
        }
    }
    
    // CRITICAL FIX: Enhanced positionBubbleAboveAvatar method
    positionBubbleAboveAvatar(bubble, userId, avatarPosition) {
        try {
            // CRITICAL FIX: Use let instead of const for reassignable variables
            let basePosition = avatarPosition || this._generateFallbackPosition(userId);
            
            // Calculate stacking offset
            const userStack = this.stackPositions.get(userId) || 0;
            const yOffset = this.config.yOffset + (userStack * this.config.stackSpacing);
            
            // Set position
            bubble.position.copy(basePosition);
            bubble.position.y += yOffset;
            
            // Update stack tracking
            this.stackPositions.set(userId, userStack + 1);
            
            // Overlap avoidance
            if (this.config.avoidOverlap) {
                const adjustedPosition = this.avoidOverlapAtPosition(bubble.position, userId);
                bubble.position.copy(adjustedPosition);
            }
            
            // Make bubble face camera
            if (this.camera) {
                bubble.lookAt(this.camera.position);
            }
            
            if (this.config.enableDebug) {
                console.log(`📍 Bubble positioned for ${userId} at:`, bubble.position);
            }
            
        } catch (error) {
            console.warn('Error positioning bubble:', error);
            // Fallback to basic positioning
            bubble.position.set(0, this.config.yOffset, 0);
        }
    }
    
    // FIXED: Enhanced bubble creation with proper positioning and stacking
    createBubble(message, username, position, userId = null) {
        if (!this.isInitialized || !window.THREE) {
            console.warn('💬 ChatBubbleSystem not ready for bubble creation');
            return null;
        }
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
            // Create or reuse canvas
            const canvas = this.canvasPool.pop() || this._createBaseCanvas();
            const context = canvas.getContext('2d');
            
            if (!context) {
                console.error('Could not get canvas context');
                return null;
            }
            
            // Calculate optimal bubble size and position
            const bubbleData = this._calculateBubbleLayout(message, username, userId);
            const bubblePosition = this._calculateOptimalPosition(position, userId, bubbleData.index);
            
            // Set canvas size
            canvas.width = bubbleData.width * 2; // High DPI
            canvas.height = bubbleData.height * 2;
            context.scale(2, 2);
            
            // Draw beautiful bubble background
            this.drawBubbleBackground(context, bubbleData.width, bubbleData.height);
            
            // Draw content
            this._drawBubbleContent(context, message, username, bubbleData);
            
            // Create sprite
            const sprite = this._createBubbleSprite(canvas, bubbleData);
            bubbleGroup.add(sprite);
            
            // Position bubble using new positioning system
            this.positionBubbleAboveAvatar(bubbleGroup, userId, position);
            
            // Set bubble metadata
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
                bubbleIndex: bubbleData.index
            };
            
            // Add to scene with animation
            this.scene.add(bubbleGroup);
            this._addToTracking(bubbleGroup, userId);
            
            // Animate in
            this.animateBubbleIn(bubbleGroup);
            
            // Schedule cleanup
            setTimeout(() => {
                this.animateBubbleOut(bubbleGroup);
            }, this.config.fadeTime);
            
            return bubbleGroup;
            
        } catch (error) {
            console.error('❌ Error creating bubble:', error);
            return null;
        }
    }
    
    _calculateBubbleLayout(message, username, userId) {
        // Calculate text dimensions and layout
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        
        const usernameFont = `bold ${this.config.fontSize * 0.8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        const messageFont = `${this.config.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        
        tempContext.font = usernameFont;
        const usernameWidth = tempContext.measureText(username).width;
        
        tempContext.font = messageFont;
        const lines = this.wrapText(tempContext, message, this.config.maxWidth - this.config.padding * 2);
        
        let maxTextWidth = usernameWidth;
        lines.forEach(line => {
            const lineWidth = tempContext.measureText(line).width;
            if (lineWidth > maxTextWidth) {
                maxTextWidth = lineWidth;
            }
        });
        
        const lineHeight = this.config.fontSize * 1.3;
        const width = Math.max(maxTextWidth + this.config.padding * 2, 140);
        const height = this.config.padding * 2 + 
                      this.config.fontSize * 0.8 + 20 + // username with background
                      (lines.length * lineHeight) + 25; // message + tail
        
        // Calculate bubble index for this user
        let index = 0;
        if (userId && this.bubbles.has(userId)) {
            index = this.bubbles.get(userId).length;
        }
        
        return { width, height, lines, lineHeight, usernameWidth, index };
    }
    
    _drawBubbleContent(context, message, username, bubbleData) {
        // Draw username background
        const usernameGradient = context.createLinearGradient(
            this.config.padding - 4, 
            this.config.padding - 2, 
            bubbleData.usernameWidth + 16, 
            this.config.padding + 18
        );
        usernameGradient.addColorStop(0, 'rgba(102, 126, 234, 0.15)');
        usernameGradient.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
        
        context.fillStyle = usernameGradient;
        context.beginPath();
        this.roundRect(context, this.config.padding - 4, this.config.padding - 2, 
                      bubbleData.usernameWidth + 8, 20, 10);
        context.fill();
        
        // Username text
        context.font = `bold ${this.config.fontSize * 0.8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        context.fillStyle = this.bubbleStyles.usernameColor;
        context.textAlign = 'left';
        context.fillText(username, this.config.padding, this.config.padding + 15);
        
        // Message text with shadow
        context.font = `${this.config.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        context.fillStyle = this.bubbleStyles.textColor;
        context.shadowColor = 'rgba(255, 255, 255, 0.8)';
        context.shadowBlur = 1;
        context.shadowOffsetY = 1;
        
        bubbleData.lines.forEach((line, index) => {
            context.fillText(
                line,
                this.config.padding,
                this.config.padding + this.config.fontSize * 0.8 + 25 + 
                (index * bubbleData.lineHeight)
            );
        });
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;
    }
    
    // ENHANCED: Beautiful glassmorphism bubble background
    drawBubbleBackground(context, width, height) {
        if (!context || typeof width !== 'number' || typeof height !== 'number') {
            console.error('Invalid parameters for drawBubbleBackground');
            return;
        }
        
        try {
            // Main gradient background
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
            gradient.addColorStop(0.3, 'rgba(248, 250, 252, 0.96)');
            gradient.addColorStop(0.7, 'rgba(241, 245, 249, 0.94)');
            gradient.addColorStop(1, 'rgba(236, 240, 245, 0.92)');
            
            // Enhanced shadow for depth
            if (this.config.enableShadows) {
                context.save();
                context.shadowColor = 'rgba(0, 0, 0, 0.2)';
                context.shadowBlur = 25;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 10;
            }
            
            // Main bubble body
            context.fillStyle = gradient;
            context.beginPath();
            this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
            context.fill();
            
            if (this.config.enableShadows) {
                context.restore();
            }
            
            // Animated border gradient
            const borderGradient = context.createLinearGradient(0, 0, 0, height);
            borderGradient.addColorStop(0, this.bubbleStyles.borderGradient[0]);
            borderGradient.addColorStop(1, this.bubbleStyles.borderGradient[1]);
            
            context.strokeStyle = borderGradient;
            context.lineWidth = 2;
            context.beginPath();
            this.roundRect(context, 1, 1, width - 2, height - 21, this.config.borderRadius - 1);
            context.stroke();
            
            // Bubble tail with matching gradient
            context.fillStyle = gradient;
            context.beginPath();
            context.moveTo(width / 2 - 15, height - 20);
            context.quadraticCurveTo(width / 2, height - 2, width / 2 + 15, height - 20);
            context.fill();
            
            // Tail border
            context.strokeStyle = borderGradient;
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(width / 2 - 15, height - 20);
            context.quadraticCurveTo(width / 2, height - 2, width / 2 + 15, height - 20);
            context.stroke();
            
            // Inner highlight for glass effect
            context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            context.lineWidth = 1;
            context.beginPath();
            this.roundRect(context, 3, 3, width - 6, height - 23, this.config.borderRadius - 3);
            context.stroke();
            
        } catch (error) {
            console.error('Error in drawBubbleBackground:', error);
        }
    }
    
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
    
    _createBubbleSprite(canvas, bubbleData) {
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        // Reuse material from pool if available
        const material = this.materialPool.pop() || this._createBaseMaterial();
        material.map = texture;
        material.transparent = true;
        material.alphaTest = 0.001;
        
        const sprite = new THREE.Sprite(material);
        
        // Scale sprite based on content
        const scale = 0.008;
        sprite.scale.set(bubbleData.width * scale, bubbleData.height * scale, 1);
        
        return sprite;
    }
    
    _addToTracking(bubble, userId) {
        // Add to active bubbles
        this.activeBubbles.push(bubble);
        
        // Add to user tracking
        if (userId) {
            if (!this.bubbles.has(userId)) {
                this.bubbles.set(userId, []);
            }
            this.bubbles.get(userId).push(bubble);
            
            // Limit bubbles per user
            const userBubbles = this.bubbles.get(userId);
            if (userBubbles.length > this.config.maxBubblesPerUser) {
                const oldBubble = userBubbles.shift();
                this.removeBubble(oldBubble);
            }
        }
        
        // Global limit
        if (this.activeBubbles.length > this.config.maxBubbles) {
            const oldBubble = this.activeBubbles.shift();
            this.removeBubble(oldBubble);
        }
    }
    
    // ENHANCED: Smooth animation with better easing
    animateBubbleIn(bubble) {
        if (!bubble) return;
        
        const duration = this.animations.fadeIn.duration;
        const startTime = Date.now();
        
        // Start with small scale
        bubble.scale.set(0, 0, 0);
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth ease-out-back animation
                let easeProgress;
                const c1 = 1.70158;
                const c3 = c1 + 1;
                
                if (progress === 0) {
                    easeProgress = 0;
                } else if (progress === 1) {
                    easeProgress = 1;
                } else {
                    easeProgress = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
                }
                
                bubble.scale.setScalar(easeProgress);
                
                // Add subtle rotation
                bubble.rotation.z = Math.sin(progress * Math.PI) * 0.03;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    bubble.rotation.z = 0;
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
        const startScale = bubble.scale.x;
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                
                const opacity = startOpacity * (1 - easeProgress);
                const scale = startScale * (1 - easeProgress * 0.2);
                
                if (bubble.children[0]?.material) {
                    bubble.children[0].material.opacity = opacity;
                    bubble.userData.opacity = opacity;
                }
                
                bubble.scale.setScalar(scale);
                bubble.position.y += 0.01; // Float up slightly
                
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
    
    // ENHANCED: Main update loop with better performance
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        this._ensurePerformanceObject();
        const startTime = Date.now();
        
        try {
            const cameraPosition = this.camera.position;
            const time = Date.now() * 0.001;
            
            this.activeBubbles.forEach((bubble, index) => {
                if (!bubble || !bubble.parent) return;
                
                const distance = bubble.position.distanceTo(cameraPosition);
                
                // Distance-based culling
                if (distance > this.config.cullingDistance) {
                    bubble.visible = false;
                    bubble.userData.isVisible = false;
                    return;
                }
                
                bubble.visible = true;
                bubble.userData.isVisible = true;
                
                // Billboard behavior - face camera
                bubble.lookAt(cameraPosition);
                
                // Enhanced floating animation
                const floatOffset = Math.sin(time * this.animations.float.speed + index * 0.5) * 
                                   this.animations.float.amount;
                bubble.position.y = bubble.userData.originalPosition.y + floatOffset;
                
                // Gentle swaying
                const swayX = Math.sin(time * this.animations.sway.speed + index * 0.7) * 
                             this.animations.sway.amount;
                const swayZ = Math.cos(time * this.animations.sway.speed * 0.8 + index * 0.3) * 
                             this.animations.sway.amount;
                
                bubble.position.x = bubble.userData.originalPosition.x + swayX;
                bubble.position.z = bubble.userData.originalPosition.z + swayZ;
                
                // Distance-based opacity and scale
                if (distance > this.config.lodDistance) {
                    const fadeFactor = 1 - ((distance - this.config.lodDistance) / 
                                          (this.config.cullingDistance - this.config.lodDistance));
                    
                    if (bubble.children[0]?.material) {
                        bubble.children[0].material.opacity = 
                            (bubble.userData.opacity || 1) * Math.max(0.3, fadeFactor);
                    }
                    
                    const scaleFactor = 0.7 + (fadeFactor * 0.3);
                    bubble.scale.setScalar(scaleFactor);
                }
            });
            
        } catch (error) {
            console.error('❌ Error in ChatBubbleSystem update:', error);
        }
        
        // Performance tracking
        this._ensurePerformanceObject();
        const frameTime = Date.now() - startTime;
        this.performance.frameTime = frameTime;
        this.performance.frameCounter++;
        this.performance.averageFrameTime = 
            (this.performance.averageFrameTime * 0.9) + (frameTime * 0.1);
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    // ENHANCED: Resource cleanup with proper disposal
    removeBubble(bubble) {
        if (!bubble) return;
        
        try {
            const userId = bubble.userData?.userId;
            
            // Remove from scene
            if (bubble.parent) {
                bubble.parent.remove(bubble);
            }
            
            // Clean up resources
            bubble.children.forEach(child => {
                if (child.material) {
                    if (child.material.map) {
                        child.material.map.dispose();
                        child.material.map = null;
                    }
                    // Return material to pool
                    if (this.materialPool.length < 10) {
                        this.materialPool.push(child.material);
                    } else {
                        child.material.dispose();
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
            
            if (userId && this.bubbles.has(userId)) {
                const userBubbles = this.bubbles.get(userId);
                const userIndex = userBubbles.indexOf(bubble);
                if (userIndex > -1) {
                    userBubbles.splice(userIndex, 1);
                }
                
                if (userBubbles.length === 0) {
                    this.bubbles.delete(userId);
                }
                
                // Update stack tracking
                const userStack = this.stackPositions.get(userId) || 0;
                this.stackPositions.set(userId, Math.max(0, userStack - 1));
            }
            
        } catch (error) {
            console.error('❌ Error removing bubble:', error);
        }
    }
    
    updateBubblePositions(userId, newPosition) {
        if (!this.bubbles.has(userId) || !this._isValidAvatarPosition(newPosition)) return;
        
        try {
            const userBubbles = this.bubbles.get(userId);
            userBubbles.forEach((bubble, index) => {
                if (bubble.userData.isVisible) {
                    const targetPosition = this._calculateOptimalPosition(newPosition, userId, index);
                    
                    if (this.config.smoothMovement) {
                        // Smooth interpolation
                        bubble.userData.originalPosition.lerp(targetPosition, 0.1);
                    } else {
                        bubble.userData.originalPosition.copy(targetPosition);
                    }
                }
            });
        } catch (error) {
            console.error('Error updating bubble positions:', error);
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
            this._avatarPositions.delete(userId);
            this._lastAvatarUpdate.delete(userId);
            this.stackPositions.delete(userId);
        } catch (error) {
            console.error('Error removing user bubbles:', error);
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
            this._avatarPositions.clear();
            this._lastAvatarUpdate.clear();
            this.stackPositions.clear();
            
            console.log('💬✨ All bubbles cleared');
        } catch (error) {
            console.error('Error clearing bubbles:', error);
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
    
    _processQueuedMessages() {
        if (this._isProcessingQueue || this._messageQueue.length === 0) return;
        
        this._isProcessingQueue = true;
        
        try {
            const queue = [...this._messageQueue];
            this._messageQueue = [];
            
            console.log(`Processing ${queue.length} queued messages`);
            
            queue.forEach((messageData, index) => {
                // Process with small delays to prevent overwhelm
                setTimeout(() => {
                    try {
                        this.createBubbleFromMessage(messageData);
                    } catch (error) {
                        console.warn('Error processing queued message:', error);
                    }
                }, index * 100);
            });
            
        } finally {
            this._isProcessingQueue = false;
        }
    }
    
    performanceCleanup() {
        const now = Date.now();
        
        this._ensurePerformanceObject();
        
        if (now - this.performance.lastCleanup > 10000) {
            try {
                // Clean up expired bubbles
                this.activeBubbles.forEach(bubble => {
                    if (now - bubble.userData.createdAt > this.config.fadeTime * 2) {
                        this.removeBubble(bubble);
                    }
                });
                
                // Clean up old avatar position cache
                for (const [userId, lastUpdate] of this._lastAvatarUpdate.entries()) {
                    if (now - lastUpdate > 60000) { // 1 minute
                        this._avatarPositions.delete(userId);
                        this._lastAvatarUpdate.delete(userId);
                    }
                }
                
                // Manage material pool size
                while (this.materialPool.length > 15) {
                    const material = this.materialPool.pop();
                    if (material?.dispose) {
                        material.dispose();
                    }
                }
                
                // Return excess canvases to browser
                while (this.canvasPool.length > 10) {
                    this.canvasPool.pop();
                }
                
                this.performance.lastCleanup = now;
                
                if (this.config.enableDebug) {
                    console.log('🧹 Performance cleanup completed', {
                        bubbles: this.performance.bubbleCount,
                        avgFrameTime: this.performance.averageFrameTime.toFixed(2) + 'ms',
                        materialPool: this.materialPool.length,
                        canvasPool: this.canvasPool.length,
                        cachedPositions: this._avatarPositions.size
                    });
                }
            } catch (error) {
                console.warn('Error in performance cleanup:', error);
            }
        }
    }
    
    handleResize() {
        try {
            const isMobile = window.innerWidth <= 768;
            if (this.isMobile !== isMobile) {
                this.isMobile = isMobile;
                this.config.maxBubbles = isMobile ? 15 : 20;
                console.log(`📱 Layout changed to ${isMobile ? 'mobile' : 'desktop'}`);
            }
        } catch (error) {
            console.error('Error handling resize:', error);
        }
    }
    
    handleSceneChange() {
        try {
            if (window.ROOM_CONFIG?.clearBubblesOnSceneChange) {
                this.clearAllBubbles();
            }
        } catch (error) {
            console.error('Error handling scene change:', error);
        }
    }
    
    // PUBLIC API METHODS
    
    getActiveBubbleCount() {
        return this.activeBubbles.length;
    }
    
    getUserBubbleCount(userId) {
        return this.bubbles.has(userId) ? this.bubbles.get(userId).length : 0;
    }
    
    setDebugMode(enabled) {
        this.config.enableDebug = enabled;
        console.log(`💬✨ ChatBubbleSystem debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    getPerformanceStats() {
        this._ensurePerformanceObject();
        return {
            ...this.performance,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 2048,
            materialPoolSize: this.materialPool.length,
            canvasPoolSize: this.canvasPool.length,
            cachedPositions: this._avatarPositions.size,
            isMobile: this.isMobile,
            isInitialized: this.isInitialized
        };
    }
    
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('💬✨ ChatBubbleSystem config updated:', newConfig);
    }
    
    createTestBubble(message = "Test bubble! 🚀", username = "TestUser") {
        if (!window.THREE) {
            console.warn('THREE.js not available for test bubble');
            return null;
        }
        
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            3,
            (Math.random() - 0.5) * 10
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    // CLEANUP AND DISPOSAL
    
    dispose() {
        try {
            console.log('🧹 Disposing ChatBubbleSystem...');
            
            // Clear intervals
            if (this._cleanupInterval) {
                clearInterval(this._cleanupInterval);
            }
            if (this._positionUpdateInterval) {
                clearInterval(this._positionUpdateInterval);
            }
            
            // Remove event listeners
            window.removeEventListener('resize', this.handleResize);
            
            // Clear all bubbles
            this.clearAllBubbles();
            
            // Dispose pooled resources
            this.materialPool.forEach(material => {
                if (material?.dispose) {
                    material.dispose();
                }
            });
            
            // Clear all collections
            this.materialPool = [];
            this.canvasPool = [];
            this.texturePool = [];
            this._avatarPositions.clear();
            this._lastAvatarUpdate.clear();
            this._messageQueue = [];
            this.stackPositions.clear();
            
            this.isInitialized = false;
            
            console.log('✅ ChatBubbleSystem disposed successfully');
            
        } catch (error) {
            console.error('Error disposing ChatBubbleSystem:', error);
        }
    }
    
    // STATIC SINGLETON METHODS
    
    static getInstance() {
        if (!ChatBubbleSystem._instance) {
            ChatBubbleSystem._instance = new ChatBubbleSystem();
        }
        return ChatBubbleSystem._instance;
    }
    
    static resetInstance() {
        if (ChatBubbleSystem._instance) {
            ChatBubbleSystem._instance.dispose();
            ChatBubbleSystem._instance = null;
        }
    }
}

// GLOBAL EXPORTS AND SETUP

// Store class reference
window.ChatBubbleSystemClass = ChatBubbleSystem;

// Create and export singleton instance
window.ChatBubbleSystem = ChatBubbleSystem.getInstance();

// Module export for compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatBubbleSystem;
}

// Automatic initialization setup
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure other systems are ready
    setTimeout(() => {
        if (window.ChatBubbleSystem && !window.ChatBubbleSystem.isInitialized) {
            console.log('🚀 Auto-initializing ChatBubbleSystem...');
            window.ChatBubbleSystem.init().catch(error => {
                console.warn('Auto-initialization failed:', error);
            });
        }
    }, 3000);
});

console.log('💬✨ ChatBubbleSystem v4.1 - Complete Fixed Version Loaded! Assignment errors resolved.');