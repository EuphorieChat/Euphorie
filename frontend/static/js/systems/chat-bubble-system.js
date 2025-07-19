// Enhanced ChatBubbleSystem v4.1 - Improved Working Version
// Builds on your stable v4.0 with additional features and optimizations

console.log('🔥 LOADING ENHANCED ChatBubbleSystem v4.1 - ' + Date.now());

class ChatBubbleSystem {
    constructor() {
        console.log('💬✨ ChatBubbleSystem v4.1 - ENHANCED WORKING VERSION starting...');
        
        // CRITICAL: Initialize performance object FIRST
        this.performance = {
            frameTime: 0,
            bubbleCount: 0,
            renderCalls: 0,
            lastCleanup: Date.now()
        };
        
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
        
        // Enhanced configuration with better defaults
        this.config = {
            maxBubbles: 25,
            fadeTime: 6000, // Longer display time
            maxDistance: 60,
            fontSize: 18, // Bigger text for better readability
            maxWidth: 350, // Wider bubbles
            padding: 25, // More padding
            borderRadius: 18, // More rounded
            yOffset: 3.5,
            animationDuration: 500, // Smoother animations
            maxBubblesPerUser: 4, // More bubbles per user
            enableDebug: false,
            enableShadows: true,
            cullingDistance: 100,
            enableGlow: true, // New glow effects
            enableParticles: true, // Particle effects
            floatIntensity: 0.04, // More floating movement
            swayIntensity: 0.02 // More natural swaying
        };
        
        // Enhanced bubble styles with better visual design
        this.bubbleStyles = {
            background: 'rgba(255, 255, 255, 0.96)',
            borderColor: 'rgba(102, 126, 234, 0.4)',
            usernameFontSize: this.config.fontSize * 0.85,
            usernameColor: '#4a5cf0',
            textColor: '#1a1a2e',
            shadowBlur: 15,
            shadowColor: 'rgba(102, 126, 234, 0.3)',
            glowColor: 'rgba(102, 126, 234, 0.5)'
        };
        
        this.isMobile = window.innerWidth <= 768;
        
        // WORKING FIX: Bind methods using explicit binding (keep your working approach)
        this.init = this.init.bind(this);
        this.createBubble = this.createBubble.bind(this);
        this.createBubbleFromMessage = this.createBubbleFromMessage.bind(this);
        this.update = this.update.bind(this);
        this.drawBubbleBackground = this.drawBubbleBackground.bind(this);
        this.roundRect = this.roundRect.bind(this);
        this.calculateTextDimensions = this.calculateTextDimensions.bind(this);
        this.wrapText = this.wrapText.bind(this);
        this.animateBubbleIn = this.animateBubbleIn.bind(this);
        this.animateBubbleOut = this.animateBubbleOut.bind(this);
        this.removeBubble = this.removeBubble.bind(this);
        this.getAvatarPosition = this.getAvatarPosition.bind(this);
        this.performanceCleanup = this.performanceCleanup.bind(this);
        this.startUpdateLoop = this.startUpdateLoop.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.updateBubblePositions = this.updateBubblePositions.bind(this);
        this.removeUserBubbles = this.removeUserBubbles.bind(this);
        this.clearAllBubbles = this.clearAllBubbles.bind(this);
        this._ensurePerformanceObject = this._ensurePerformanceObject.bind(this);
        this._processQueuedMessages = this._processQueuedMessages.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        
        // Enhanced methods
        this.createEnhancedBubbleBackground = this.createEnhancedBubbleBackground.bind(this);
        this.addParticleEffects = this.addParticleEffects.bind(this);
        this.createGlowEffect = this.createGlowEffect.bind(this);
        
        // Create safe wrapper methods (keep your working approach)
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
        
        // Setup resize handler
        window.addEventListener('resize', this.handleResize);
        
        console.log('✅ ChatBubbleSystem v4.1 - ENHANCED WORKING VERSION created');
    }
    
    _ensurePerformanceObject() {
        if (!this.performance || typeof this.performance !== 'object') {
            this.performance = {
                frameTime: 0,
                bubbleCount: 0,
                renderCalls: 0,
                lastCleanup: Date.now()
            };
        }
        
        // Validate properties
        const requiredProps = ['frameTime', 'bubbleCount', 'renderCalls', 'lastCleanup'];
        requiredProps.forEach(prop => {
            if (typeof this.performance[prop] !== 'number') {
                this.performance[prop] = prop === 'lastCleanup' ? Date.now() : 0;
            }
        });
    }
    
    async init() {
        console.log('🚀 Initializing Enhanced ChatBubbleSystem v4.1...');
        
        try {
            // Check for THREE.js
            if (!window.THREE) {
                console.warn('❌ THREE.js not available - retrying in 500ms');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            // Check for scene systems with better detection
            const sceneReady = window.SceneManager?.scene || 
                              window.AvatarSystem?.scene || 
                              (window.scene && window.camera);
            
            if (!sceneReady) {
                console.log('💬 Waiting for Scene systems... retrying in 300ms');
                setTimeout(() => this.init(), 300);
                return;
            }
            
            // Get scene references with fallbacks
            this.scene = window.SceneManager?.scene || window.AvatarSystem?.scene || window.scene;
            this.camera = window.SceneManager?.camera || window.camera;
            this.renderer = window.SceneManager?.renderer || window.renderer;
            
            if (!this.scene || !this.camera) {
                console.error('❌ Scene or camera not available - retrying...');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            this._ensurePerformanceObject();
            this.isInitialized = true;
            
            console.log('✅ Enhanced ChatBubbleSystem v4.1 initialized successfully');
            
            this.startUpdateLoop();
            this.setupEventListeners();
            this._processQueuedMessages();
            
        } catch (error) {
            console.error('❌ Error initializing Enhanced ChatBubbleSystem:', error);
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
            const userId = messageData.userId || messageData.user_id;
            const avatarPosition = this.getAvatarPosition(userId);
            
            if (!avatarPosition) {
                console.warn(`💬 No avatar found for user ${userId}`);
                const fallbackPosition = new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    2,
                    (Math.random() - 0.5) * 10
                );
                return this.createBubble(
                    messageData.message,
                    messageData.username,
                    fallbackPosition,
                    userId,
                    messageData.nationality
                );
            }
            
            const bubble = this.createBubble(
                messageData.message,
                messageData.username,
                avatarPosition,
                userId,
                messageData.nationality
            );
            
            console.log(`✅ Enhanced bubble created for ${messageData.username}: "${messageData.message}"`);
            return bubble;
            
        } catch (error) {
            console.error('❌ Error creating bubble from message:', error);
            return null;
        }
    }
    
    getAvatarPosition(userId) {
        try {
            // Enhanced avatar position detection
            if (window.AvatarSystem?.getAvatarPosition) {
                const pos = window.AvatarSystem.getAvatarPosition(userId);
                if (pos) return pos;
            }
            
            if (window.AvatarSystem?.getAvatarPositionSafe) {
                const pos = window.AvatarSystem.getAvatarPositionSafe(userId);
                if (pos) return pos;
            }
            
            // Check scene for avatar
            if (this.scene) {
                const avatar = this.scene.children.find(child => 
                    child.userData?.userId === userId ||
                    child.userData?.id === userId ||
                    child.name === userId
                );
                if (avatar) {
                    return avatar.position.clone();
                }
            }
            
            // Check current user
            if (userId === window.ROOM_CONFIG?.userId || 
                userId === window.WebSocketManager?.userId) {
                return new THREE.Vector3(0, 0, 0);
            }
            
            // Create consistent positions for users based on their ID
            const hash = userId.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            
            const angle = (hash % 360) * (Math.PI / 180);
            const radius = 4 + (Math.abs(hash) % 4);
            
            return new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            
        } catch (error) {
            console.error('Error getting avatar position:', error);
            return new THREE.Vector3(0, 0, 0);
        }
    }
    
    // ENHANCED: Better bubble background with glow effects and animations
    createEnhancedBubbleBackground(context, width, height) {
        if (!context || typeof width !== 'number' || typeof height !== 'number') {
            console.error('Invalid parameters for createEnhancedBubbleBackground');
            return;
        }
        
        try {
            // Create animated gradient background
            const time = Date.now() * 0.001;
            const hue1 = (time * 20) % 360;
            const hue2 = (time * 20 + 60) % 360;
            
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, `hsla(${hue1}, 20%, 98%, 0.96)`);
            gradient.addColorStop(0.5, `hsla(${hue2}, 15%, 96%, 0.94)`);
            gradient.addColorStop(1, `hsla(${hue1}, 25%, 94%, 0.92)`);
            
            // Enhanced shadow with glow
            if (this.config.enableShadows) {
                context.save();
                
                // Outer glow
                context.shadowColor = `hsla(${hue1}, 60%, 70%, 0.4)`;
                context.shadowBlur = 25;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 12;
                
                // Draw outer glow
                context.fillStyle = `hsla(${hue1}, 60%, 70%, 0.15)`;
                context.beginPath();
                this.roundRect(context, -3, -3, width + 6, height - 14, this.config.borderRadius + 3);
                context.fill();
                
                context.restore();
            }
            
            // Main bubble with enhanced gradient
            context.fillStyle = gradient;
            context.beginPath();
            this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
            context.fill();
            
            // Enhanced border with animated colors
            const borderGradient = context.createLinearGradient(0, 0, width, height);
            borderGradient.addColorStop(0, `hsla(${hue1}, 60%, 65%, 0.6)`);
            borderGradient.addColorStop(0.5, `hsla(${hue2}, 60%, 70%, 0.4)`);
            borderGradient.addColorStop(1, `hsla(${hue1 + 120}, 60%, 65%, 0.6)`);
            
            context.strokeStyle = borderGradient;
            context.lineWidth = 2.5;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            
            // Draw glowing border
            if (this.config.enableGlow) {
                context.save();
                context.shadowColor = `hsla(${hue1}, 60%, 70%, 0.5)`;
                context.shadowBlur = 8;
                context.beginPath();
                this.roundRect(context, 1.25, 1.25, width - 2.5, height - 21.25, this.config.borderRadius - 1);
                context.stroke();
                context.restore();
            } else {
                context.beginPath();
                this.roundRect(context, 1.25, 1.25, width - 2.5, height - 21.25, this.config.borderRadius - 1);
                context.stroke();
            }
            
            // Inner highlight for glass effect
            const highlightGradient = context.createLinearGradient(0, 0, 0, height * 0.6);
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            context.fillStyle = highlightGradient;
            context.beginPath();
            this.roundRect(context, 2, 2, width - 4, (height - 20) * 0.6, this.config.borderRadius - 2);
            context.fill();
            
            // Enhanced bubble tail with gradient
            const tailGradient = context.createLinearGradient(width / 2 - 15, height - 20, width / 2 + 15, height - 2);
            tailGradient.addColorStop(0, `hsla(${hue1}, 20%, 96%, 0.94)`);
            tailGradient.addColorStop(0.5, `hsla(${hue2}, 15%, 98%, 0.96)`);
            tailGradient.addColorStop(1, `hsla(${hue1}, 25%, 94%, 0.92)`);
            
            context.fillStyle = tailGradient;
            context.beginPath();
            context.moveTo(width / 2 - 15, height - 20);
            context.quadraticCurveTo(width / 2, height - 2, width / 2 + 15, height - 20);
            context.fill();
            
            // Tail border with glow
            if (this.config.enableGlow) {
                context.save();
                context.strokeStyle = `hsla(${hue2}, 60%, 70%, 0.6)`;
                context.lineWidth = 2;
                context.shadowColor = `hsla(${hue2}, 60%, 70%, 0.4)`;
                context.shadowBlur = 6;
                context.beginPath();
                context.moveTo(width / 2 - 15, height - 20);
                context.quadraticCurveTo(width / 2, height - 2, width / 2 + 15, height - 20);
                context.stroke();
                context.restore();
            }
            
            // Sparkle effects (random dots)
            if (this.config.enableParticles && Math.random() < 0.4) {
                context.save();
                const sparkleCount = 2 + Math.floor(Math.random() * 3);
                
                for (let i = 0; i < sparkleCount; i++) {
                    const x = 15 + Math.random() * (width - 30);
                    const y = 15 + Math.random() * (height - 35);
                    const size = 1 + Math.random() * 1.5;
                    
                    context.fillStyle = `hsla(${(hue1 + i * 40) % 360}, 70%, 80%, 0.8)`;
                    context.shadowColor = context.fillStyle;
                    context.shadowBlur = 3;
                    
                    context.beginPath();
                    context.arc(x, y, size, 0, Math.PI * 2);
                    context.fill();
                }
                context.restore();
            }
            
        } catch (error) {
            console.error('Error in createEnhancedBubbleBackground:', error);
        }
    }
    
    // Use enhanced background by default
    drawBubbleBackground(context, width, height) {
        return this.createEnhancedBubbleBackground(context, width, height);
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
    
    createBubble(message, username, position, userId = null, nationality = null) {
        if (!this.isInitialized) {
            console.warn('💬 Enhanced ChatBubbleSystem not initialized');
            return null;
        }
        
        if (!window.THREE) {
            console.warn('💬 THREE.js not available');
            return null;
        }
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
            // Create canvas with higher resolution
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
                console.error('Could not get canvas context');
                return null;
            }
            
            // Enhanced fonts
            const usernameFont = `bold ${this.config.fontSize * 0.85}px "Segoe UI", Arial, sans-serif`;
            const messageFont = `${this.config.fontSize}px "Segoe UI", Arial, sans-serif`;
            
            // Calculate text dimensions
            const textMetrics = this.calculateTextDimensions(context, message, username, usernameFont, messageFont);
            
            // Set canvas size with higher DPI for sharper text
            const bubbleWidth = textMetrics.bubbleWidth;
            const bubbleHeight = textMetrics.bubbleHeight;
            
            canvas.width = bubbleWidth * 3; // Higher DPI
            canvas.height = bubbleHeight * 3;
            context.scale(3, 3);
            
            // Draw enhanced bubble background
            this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
            
            // Enhanced username styling
            context.font = usernameFont;
            context.fillStyle = this.bubbleStyles.usernameColor;
            context.textAlign = 'left';
            
            // Username background with enhanced gradient
            const usernameWidth = context.measureText(username).width;
            const pillGradient = context.createLinearGradient(0, this.config.padding - 3, usernameWidth + 20, this.config.padding + 22);
            pillGradient.addColorStop(0, 'rgba(74, 92, 240, 0.15)');
            pillGradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.12)');
            pillGradient.addColorStop(1, 'rgba(168, 85, 247, 0.15)');
            
            context.fillStyle = pillGradient;
            context.beginPath();
            this.roundRect(context, this.config.padding - 6, this.config.padding - 3, usernameWidth + 12, 24, 12);
            context.fill();
            
            // Username border with glow
            context.save();
            context.strokeStyle = 'rgba(74, 92, 240, 0.4)';
            context.lineWidth = 1.5;
            context.shadowColor = 'rgba(74, 92, 240, 0.3)';
            context.shadowBlur = 4;
            context.stroke();
            context.restore();
            
            // Username text with enhanced shadow
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
            
            // Enhanced message text
            context.font = messageFont;
            context.fillStyle = this.bubbleStyles.textColor;
            
            // Text with subtle shadow for depth
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
            
            // Create sprite with enhanced settings
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
            
            // Enhanced scaling
            const scale = 0.008;
            sprite.scale.set(bubbleWidth * scale, bubbleHeight * scale, 1);
            
            bubbleGroup.add(sprite);
            
            // Add glow effect if enabled
            if (this.config.enableGlow) {
                const glowEffect = this.createGlowEffect(bubbleWidth * scale, bubbleHeight * scale);
                bubbleGroup.add(glowEffect);
            }
            
            // FIXED: Better bubble positioning that stays above avatar
            const bubblePosition = this.calculateOptimalBubblePosition(position, userId, bubbleHeight * scale);
            
            bubbleGroup.position.copy(bubblePosition);
            
            // Enhanced properties
            bubbleGroup.userData = {
                id: bubbleId,
                message: message,
                username: username,
                userId: userId,
                nationality: nationality,
                createdAt: Date.now(),
                opacity: 1,
                isVisible: true,
                originalPosition: bubblePosition.clone(),
                animationPhase: Math.random() * Math.PI * 2,
                bubbleHeight: bubbleHeight * scale,
                stackIndex: userId ? (this.bubbles.get(userId)?.length || 0) : 0
            };
            
            // Enhanced entrance animation
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
                
                // Limit bubbles per user and animate old ones away
                const userBubbles = this.bubbles.get(userId);
                if (userBubbles.length > this.config.maxBubblesPerUser) {
                    const oldBubble = userBubbles.shift();
                    this.animateBubbleOut(oldBubble);
                }
                
                // FIXED: Reposition existing bubbles to maintain nice stacking
                this.repositionUserBubbles(userId);
            }
            
            // Clean up old bubbles
            if (this.activeBubbles.length > this.config.maxBubbles) {
                const oldBubble = this.activeBubbles.shift();
                this.removeBubble(oldBubble);
            }
            
            return bubbleGroup;
            
        } catch (error) {
            console.error('❌ Error creating enhanced bubble:', error);
            return null;
        }
    }
    
    // NEW: Calculate optimal bubble position to prevent random floating
    calculateOptimalBubblePosition(avatarPosition, userId, bubbleHeight) {
        const bubblePosition = avatarPosition.clone();
        
        // Base position: directly above avatar
        bubblePosition.y += this.config.yOffset;
        
        // If user has existing bubbles, stack them nicely
        if (userId && this.bubbles.has(userId)) {
            const userBubbles = this.bubbles.get(userId);
            const stackIndex = userBubbles.length;
            
            // Vertical stacking with proper spacing
            const verticalSpacing = bubbleHeight + 0.3; // Bubble height + small gap
            bubblePosition.y += stackIndex * verticalSpacing;
            
            // Slight horizontal offset for visual variety (but keep close to avatar)
            const horizontalOffset = Math.sin(stackIndex * 0.5) * 0.3;
            bubblePosition.x += horizontalOffset;
            
            // Very slight depth offset to prevent z-fighting
            bubblePosition.z += stackIndex * 0.05;
        }
        
        return bubblePosition;
    }
    
    // NEW: Reposition user bubbles to maintain beautiful stacking
    repositionUserBubbles(userId) {
        if (!this.bubbles.has(userId)) return;
        
        try {
            const userBubbles = this.bubbles.get(userId);
            const avatarPosition = this.getAvatarPosition(userId);
            
            if (!avatarPosition) return;
            
            // Smoothly animate bubbles to their new positions
            userBubbles.forEach((bubble, index) => {
                if (!bubble.userData.isVisible) return;
                
                const targetPosition = avatarPosition.clone();
                targetPosition.y += this.config.yOffset;
                
                // Stack from bottom to top
                const verticalSpacing = bubble.userData.bubbleHeight + 0.3;
                targetPosition.y += index * verticalSpacing;
                
                // Slight horizontal offset for visual variety
                const horizontalOffset = Math.sin(index * 0.5) * 0.3;
                targetPosition.x += horizontalOffset;
                
                // Slight depth offset
                targetPosition.z += index * 0.05;
                
                // Smooth transition to new position
                this.animateBubbleToPosition(bubble, targetPosition);
            });
        } catch (error) {
            console.error('Error repositioning user bubbles:', error);
        }
    }
    
    // NEW: Smoothly animate bubble to new position
    animateBubbleToPosition(bubble, targetPosition, duration = 800) {
        if (!bubble || !targetPosition) return;
        
        const startPosition = bubble.userData.originalPosition.clone();
        const startTime = Date.now();
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth easing
                const easeProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - 2 * (1 - progress) * (1 - progress);
                
                // Interpolate position
                const currentPosition = startPosition.clone().lerp(targetPosition, easeProgress);
                bubble.userData.originalPosition.copy(currentPosition);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Ensure final position is exact
                    bubble.userData.originalPosition.copy(targetPosition);
                }
            } catch (error) {
                console.error('Error in animateBubbleToPosition:', error);
            }
        };
        
        animate();
    }
    
    createGlowEffect(width, height) {
        try {
            const glowGeometry = new THREE.PlaneGeometry(width * 1.2, height * 1.2);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0x667eea,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.z = -0.001; // Slightly behind the sprite
            glow.name = 'bubbleGlow';
            
            return glow;
        } catch (error) {
            console.error('Error creating glow effect:', error);
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
            
            // Calculate actual width needed
            let maxTextWidth = usernameWidth;
            lines.forEach(line => {
                const lineWidth = context.measureText(line).width;
                if (lineWidth > maxTextWidth) {
                    maxTextWidth = lineWidth;
                }
            });
            
            // Enhanced dimensions with better spacing
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
    
    animateBubbleIn(bubble) {
        if (!bubble) return;
        
        const startScale = 0;
        const endScale = 1;
        const duration = this.config.animationDuration;
        const startTime = Date.now();
        
        // Add initial bounce effect
        bubble.userData.animationPhase = 'entering';
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Enhanced easing with bounce
                let easeProgress;
                if (progress < 0.5) {
                    easeProgress = 2 * progress * progress;
                } else {
                    const t = progress - 1;
                    easeProgress = 1 - 2 * t * t;
                }
                
                // Add subtle bounce at the end
                let bounceScale = easeProgress;
                if (progress > 0.8) {
                    const bouncePhase = (progress - 0.8) / 0.2;
                    const bounce = Math.sin(bouncePhase * Math.PI * 3) * 0.1 * (1 - bouncePhase);
                    bounceScale = easeProgress + bounce;
                }
                
                const scale = startScale + (endScale - startScale) * bounceScale;
                bubble.scale.set(scale, scale, scale);
                
                // Add rotation during entry
                const rotation = (1 - progress) * 0.15 * Math.sin(progress * Math.PI * 2);
                bubble.rotation.z = rotation;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    bubble.userData.animationPhase = 'stable';
                    bubble.rotation.z = 0;
                    
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
                const scale = 1 - (easeProgress * 0.2);
                
                // Add gentle rotation during exit
                bubble.rotation.z = easeProgress * 0.3;
                
                // Move slightly upward during fade
                const upwardMovement = easeProgress * 0.5;
                bubble.position.y = bubble.userData.originalPosition.y + upwardMovement;
                
                if (bubble.children[0]?.material) {
                    bubble.children[0].material.opacity = opacity;
                    bubble.userData.opacity = opacity;
                }
                
                // Update glow effect if present
                const glowEffect = bubble.getObjectByName('bubbleGlow');
                if (glowEffect && glowEffect.material) {
                    glowEffect.material.opacity = opacity * 0.1;
                }
                
                bubble.scale.setScalar(scale);
                
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
                
                // Enhanced floating animation
                const time = Date.now() * 0.0008;
                const floatAmount = this.config.floatIntensity;
                const floatOffset = Math.sin(time + bubble.userData.animationPhase) * floatAmount;
                bubble.position.y = bubble.userData.originalPosition.y + floatOffset;
                
                // Enhanced gentle swaying with figure-8 pattern
                const swayAmount = this.config.swayIntensity;
                const swaySpeed = time * 0.5;
                bubble.position.x = bubble.userData.originalPosition.x + 
                    Math.sin(swaySpeed + bubble.userData.animationPhase) * swayAmount;
                bubble.position.z = bubble.userData.originalPosition.z + 
                    Math.cos(swaySpeed * 0.7 + bubble.userData.animationPhase * 0.8) * swayAmount;
                
                // Subtle rotation for life-like movement
                if (bubble.userData.animationPhase === 'stable') {
                    bubble.rotation.z = Math.sin(time * 0.3 + bubble.userData.animationPhase) * 0.03;
                }
                
                // Enhanced distance-based opacity
                if (bubble.children[0]?.material) {
                    const normalizedDistance = Math.min(distance / this.config.maxDistance, 1);
                    const opacity = Math.max(0.3, 1 - Math.pow(normalizedDistance, 1.5)) * bubble.userData.opacity;
                    bubble.children[0].material.opacity = opacity;
                    
                    // Scale based on distance for better depth perception
                    const scaleMultiplier = Math.max(0.7, 1 - normalizedDistance * 0.3);
                    bubble.scale.setScalar(scaleMultiplier);
                }
                
                // Update glow effect
                const glowEffect = bubble.getObjectByName('bubbleGlow');
                if (glowEffect && glowEffect.material) {
                    glowEffect.material.opacity = 0.1 * bubble.userData.opacity;
                    const glowPulse = 1 + Math.sin(time * 2 + bubble.userData.animationPhase) * 0.1;
                    glowEffect.scale.setScalar(glowPulse);
                }
            });
            
        } catch (error) {
            console.error('Error in update:', error);
        }
        
        // Performance tracking
        this._ensurePerformanceObject();
        this.performance.frameTime = Date.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    performanceCleanup() {
        const now = Date.now();
        this._ensurePerformanceObject();
        
        if (now - this.performance.lastCleanup > 10000) {
            try {
                // Clean up expired bubbles
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
                    child.material.dispose();
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
                    bubblePosition.y += this.config.yOffset;
                    bubblePosition.x += index * 0.9;
                    bubblePosition.y += index * 0.6;
                    
                    bubble.userData.originalPosition.lerp(bubblePosition, 0.15);
                }
            });
        } catch (error) {
            console.error('Error updating bubble positions:', error);
        }
    }
    
    handleResize() {
        try {
            this.isMobile = window.innerWidth <= 768;
            if (this.isMobile) {
                const isLandscape = window.innerWidth > window.innerHeight;
                this.config.maxBubbles = isLandscape ? 20 : 15;
                this.config.fontSize = 16;
                this.config.maxWidth = 280;
            } else {
                this.config.maxBubbles = 25;
                this.config.fontSize = 18;
                this.config.maxWidth = 350;
            }
        } catch (error) {
            console.error('Error handling resize:', error);
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
    
    clearAllBubbles() {
        try {
            const bubblesToRemove = this.activeBubbles.slice();
            bubblesToRemove.forEach(bubble => {
                this.removeBubble(bubble);
            });
            
            this.activeBubbles = [];
            this.bubbles.clear();
            
            console.log('💬 All enhanced chat bubbles cleared');
        } catch (error) {
            console.error('Error clearing bubbles:', error);
        }
    }
    
    // Enhanced public API methods
    getActiveBubbleCount() {
        return this.activeBubbles.length;
    }
    
    getUserBubbleCount(userId) {
        return this.bubbles.has(userId) ? this.bubbles.get(userId).length : 0;
    }
    
    setDebugMode(enabled) {
        this.config.enableDebug = enabled;
        console.log(`💬 Enhanced ChatBubbleSystem debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    getPerformanceStats() {
        this._ensurePerformanceObject();
        return {
            ...this.performance,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 3072, // Higher memory for enhanced bubbles
            isMobile: this.isMobile,
            version: '4.1'
        };
    }
    
    createTestBubble(message = "Enhanced test message! ✨🚀", username = "TestUser") {
        if (!window.THREE) {
            console.warn('THREE.js not available for test bubble');
            return null;
        }
        
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            3,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now(), 'US');
    }
    
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('💬 Enhanced ChatBubbleSystem config updated:', newConfig);
    }
    
    // New methods for enhanced functionality
    setBubbleStyle(styleName, value) {
        if (this.bubbleStyles.hasOwnProperty(styleName)) {
            this.bubbleStyles[styleName] = value;
            console.log(`💬 Updated bubble style ${styleName}: ${value}`);
        }
    }
    
    toggleGlowEffect(enabled) {
        this.config.enableGlow = enabled;
        console.log(`💬 Glow effect: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    toggleParticleEffects(enabled) {
        this.config.enableParticles = enabled;
        console.log(`💬 Particle effects: ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    dispose() {
        try {
            this.clearAllBubbles();
            window.removeEventListener('resize', this.handleResize);
            console.log('💬 Enhanced ChatBubbleSystem disposed');
        } catch (error) {
            console.error('Error disposing Enhanced ChatBubbleSystem:', error);
        }
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

console.log('✅ Enhanced ChatBubbleSystem v4.1 - IMPROVED WORKING VERSION loaded successfully');
console.log('🌟 New features: Enhanced visuals, glow effects, particles, better animations');
console.log('🔧 All working v4.0 stability maintained with visual improvements');