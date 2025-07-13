// /static/js/systems/chat-bubble-system.js
// COMPLETELY FIXED VERSION - Addresses all binding and performance issues from logs

class ChatBubbleSystem {
    constructor() {
        console.log('💬✨ Enhanced ChatBubbleSystem v3.1 - FIXED VERSION initializing...');
        
        // Core properties
        this.bubbles = new Map();
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInitialized = false;
        
        // CRITICAL FIX: Initialize performance object FIRST
        this.performance = {
            frameTime: 0,
            bubbleCount: 0,
            renderCalls: 0,
            lastCleanup: Date.now()
        };
        
        this._messageQueue = [];
        this.materialPool = [];
        this.texturePool = [];
        
        // Configuration
        this.config = {
            maxBubbles: window.ROOM_CONFIG?.bubbleConfig?.maxBubbles || 20,
            fadeTime: window.ROOM_CONFIG?.bubbleConfig?.fadeTime || 5000,
            maxDistance: window.ROOM_CONFIG?.bubbleConfig?.maxDistance || 50,
            fontSize: window.ROOM_CONFIG?.bubbleConfig?.fontSize || 16,
            maxWidth: window.ROOM_CONFIG?.bubbleConfig?.maxWidth || 300,
            padding: 20,
            borderRadius: 15,
            yOffset: 3.5,
            maxBubblesPerUser: 3,
            enableDebug: false,
            enableShadows: true,
            soundEnabled: false
        };
        
        // Bubble styles
        this.bubbleStyles = {
            background: 'rgba(255, 255, 255, 0.95)',
            borderColor: 'rgba(0, 0, 0, 0.1)',
            usernameFontSize: this.config.fontSize * 0.8,
            usernameColor: '#667eea',
            textColor: '#333333',
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
        };
        
        // CRITICAL FIX: Bind ALL methods immediately in constructor
        this._bindAllMethods();
        
        // Setup resize handler
        window.addEventListener('resize', this.handleResize);
        
        console.log('💬✨ Enhanced ChatBubbleSystem v3.1 created with COMPLETE binding fix');
    }
    
    // CRITICAL FIX: Comprehensive method binding
    _bindAllMethods() {
        const methodsToBind = [
            'init', 'createBubble', 'createBubbleFromMessage', 'update',
            'drawBubbleBackground', 'roundRect', 'calculateTextDimensions',
            'wrapText', 'animateBubbleIn', 'animateBubbleOut', 'removeBubble',
            'getAvatarPosition', 'performanceCleanup', 'startUpdateLoop',
            'handleResize', 'updateBubblePositions', 'removeUserBubbles',
            'clearAllBubbles', '_processQueuedMessages', 'setupEventListeners',
            'getActiveBubbleCount', 'createTestBubble'
        ];
        
        methodsToBind.forEach(methodName => {
            if (typeof this[methodName] === 'function') {
                this[methodName] = this[methodName].bind(this);
                console.log(`✅ Bound method: ${methodName}`);
            }
        });
        
        // Create safe wrapper
        this.createBubbleFromMessageSafe = this.createBubbleFromMessageSafe.bind(this);
    }
    
    // Safe wrapper for external calls
    createBubbleFromMessageSafe(messageData) {
        try {
            if (!this.isInitialized) {
                console.log('💬 Queueing message (system not ready)');
                this._messageQueue.push(messageData);
                return null;
            }
            return this.createBubbleFromMessage(messageData);
        } catch (error) {
            console.error('❌ Error in createBubbleFromMessageSafe:', error);
            return null;
        }
    }
    
    init() {
        try {
            console.log('💬 Initializing ChatBubbleSystem...');
            
            // Check for SceneManager
            if (!window.SceneManager?.scene) {
                console.log('💬 Waiting for SceneManager...');
                setTimeout(() => {
                    console.log('💬 Retrying ChatBubbleSystem init...');
                    this.init();
                }, 500);
                return;
            }
            
            this.scene = window.SceneManager.scene;
            this.camera = window.SceneManager.camera;
            this.renderer = window.SceneManager.renderer;
            
            if (!this.scene || !this.camera) {
                console.error('❌ Enhanced ChatBubbleSystem: Scene or camera not available');
                return;
            }
            
            // CRITICAL FIX: Ensure performance object is intact
            if (!this.performance || typeof this.performance !== 'object') {
                this.performance = {
                    frameTime: 0,
                    bubbleCount: 0,
                    renderCalls: 0,
                    lastCleanup: Date.now()
                };
                console.log('🔧 Performance object recreated');
            }
            
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
        // Performance monitoring
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
                    2,
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
            
            if (this.config.enableDebug) {
                console.log(`💬✨ Enhanced bubble created for ${messageData.username}: ${messageData.message}`);
            }
            
            return bubble;
            
        } catch (error) {
            console.error('❌ Error creating enhanced bubble from message:', error);
            return null;
        }
    }
    
    getAvatarPosition(userId) {
        try {
            if (window.AvatarSystem?.getAvatarPosition) {
                return window.AvatarSystem.getAvatarPosition(userId);
            }
            
            if (this.scene) {
                const avatar = this.scene.children.find(child => 
                    child.userData?.userId === userId
                );
                if (avatar) {
                    return avatar.position.clone();
                }
            }
            
            if (userId === window.ROOM_CONFIG?.userId) {
                return new THREE.Vector3(0, 0, 0);
            }
            
            // Create consistent positions for users based on their ID
            const hash = userId.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            
            const angle = (hash % 360) * (Math.PI / 180);
            const radius = 5 + (Math.abs(hash) % 5);
            
            return new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return new THREE.Vector3(0, 0, 0);
        }
    }
    
    // FIXED: drawBubbleBackground method with proper binding
    drawBubbleBackground(context, width, height) {
        if (!context || typeof width !== 'number' || typeof height !== 'number') {
            console.error('Invalid parameters for drawBubbleBackground');
            return;
        }
        
        try {
            // Create beautiful gradient background
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
            gradient.addColorStop(0.5, 'rgba(248, 250, 252, 0.95)');
            gradient.addColorStop(1, 'rgba(241, 245, 249, 0.92)');
            
            // Enhanced shadow for depth
            if (this.config.enableShadows) {
                context.save();
                context.shadowColor = 'rgba(0, 0, 0, 0.15)';
                context.shadowBlur = 20;
                context.shadowOffsetX = 0;
                context.shadowOffsetY = 8;
            }
            
            // Main bubble with gradient
            context.fillStyle = gradient;
            context.beginPath();
            this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
            context.fill();
            
            if (this.config.enableShadows) {
                context.restore();
            }
            
            // Subtle border with gradient
            const borderGradient = context.createLinearGradient(0, 0, 0, height);
            borderGradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
            borderGradient.addColorStop(1, 'rgba(168, 85, 247, 0.2)');
            
            context.strokeStyle = borderGradient;
            context.lineWidth = 2;
            context.beginPath();
            this.roundRect(context, 1, 1, width - 2, height - 21, this.config.borderRadius - 1);
            context.stroke();
            
            // Pretty bubble tail
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
            
        } catch (error) {
            console.error('Error in drawBubbleBackground:', error);
        }
    }
    
    // FIXED: roundRect method
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
            
            // Create canvas for bubble
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
                console.error('Could not get canvas context');
                return null;
            }
            
            // Enhanced fonts
            const usernameFont = `bold ${this.config.fontSize * 0.8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            const messageFont = `${this.config.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            
            // Calculate text dimensions
            const textMetrics = this.calculateTextDimensions(context, message, username, usernameFont, messageFont);
            
            // Set canvas size
            const bubbleWidth = textMetrics.bubbleWidth;
            const bubbleHeight = textMetrics.bubbleHeight;
            
            canvas.width = bubbleWidth * 2; // High DPI
            canvas.height = bubbleHeight * 2;
            context.scale(2, 2);
            
            // FIXED: Call drawBubbleBackground with proper context
            this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
            
            // Draw username
            context.font = usernameFont;
            context.fillStyle = this.bubbleStyles.usernameColor;
            context.textAlign = 'left';
            
            // Username background
            const usernameWidth = context.measureText(username).width;
            const pillGradient = context.createLinearGradient(0, this.config.padding - 2, usernameWidth + 16, this.config.padding + 18);
            pillGradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)');
            pillGradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
            
            context.fillStyle = pillGradient;
            context.beginPath();
            this.roundRect(context, this.config.padding - 4, this.config.padding - 2, usernameWidth + 8, 20, 10);
            context.fill();
            
            // Username text
            context.fillStyle = this.bubbleStyles.usernameColor;
            context.fillText(username, this.config.padding, this.config.padding + 15);
            
            // Draw message text
            context.font = messageFont;
            context.fillStyle = this.bubbleStyles.textColor;
            
            textMetrics.lines.forEach((line, index) => {
                context.fillText(
                    line,
                    this.config.padding,
                    this.config.padding + this.config.fontSize * 0.8 + 25 + (index * textMetrics.lineHeight)
                );
            });
            
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
            
            // Position bubble
            const bubblePosition = position.clone();
            bubblePosition.y += this.config.yOffset;
            
            // Overlap prevention
            if (userId && this.bubbles.has(userId)) {
                const userBubbles = this.bubbles.get(userId);
                bubblePosition.x += (userBubbles.length - 1) * 0.8;
                bubblePosition.y += userBubbles.length * 0.5;
            }
            
            bubbleGroup.position.copy(bubblePosition);
            
            // Add bubble properties
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
            
            // Animation
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
    
    calculateTextDimensions(context, message, username, usernameFont, messageFont) {
        try {
            // Measure username
            context.font = usernameFont;
            const usernameWidth = context.measureText(username).width;
            
            // Measure and wrap message text
            context.font = messageFont;
            const lines = this.wrapText(context, message, this.config.maxWidth - this.config.padding * 2);
            
            // Calculate width
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
            const bubbleHeight = this.config.padding * 2 + 
                                this.config.fontSize * 0.8 + 
                                25 + 
                                (lines.length * lineHeight) + 
                                25;
            
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
        
        const duration = 400;
        const startTime = Date.now();
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing
                let easeProgress;
                if (progress < 0.5) {
                    easeProgress = 2 * progress * progress;
                } else {
                    easeProgress = 1 - 2 * Math.pow(1 - progress, 2);
                }
                
                const scale = easeProgress;
                bubble.scale.set(scale, scale, scale);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
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
        
        const duration = 500;
        const startTime = Date.now();
        const startOpacity = bubble.userData.opacity || 1;
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeProgress = progress * progress;
                
                const opacity = startOpacity * (1 - easeProgress);
                
                if (bubble.children[0]?.material) {
                    bubble.children[0].material.opacity = opacity;
                    bubble.userData.opacity = opacity;
                }
                
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
        
        // FIXED: Ensure performance object exists with validation
        if (!this.performance || typeof this.performance !== 'object') {
            this.performance = {
                frameTime: 0,
                bubbleCount: 0,
                renderCalls: 0,
                lastCleanup: Date.now()
            };
        }
        
        const startTime = Date.now();
        
        try {
            this.activeBubbles.forEach(bubble => {
                if (!bubble || !bubble.parent) return;
                
                const distance = bubble.position.distanceTo(this.camera.position);
                
                // Culling
                if (distance > this.config.maxDistance) {
                    bubble.visible = false;
                    return;
                }
                
                bubble.visible = true;
                
                // Face camera
                bubble.lookAt(this.camera.position);
                
                // Floating animation
                const time = Date.now() * 0.001;
                const floatAmount = 0.03;
                const floatOffset = Math.sin(time + bubble.userData.id * 0.5) * floatAmount;
                bubble.position.y = bubble.userData.originalPosition.y + floatOffset;
                
                // Distance-based opacity
                if (bubble.children[0]?.material) {
                    const opacity = Math.max(0.4, 1 - (distance / this.config.maxDistance));
                    bubble.children[0].material.opacity = opacity * bubble.userData.opacity;
                }
            });
            
        } catch (error) {
            console.error('❌ Error in Enhanced ChatBubbleSystem update:', error);
        }
        
        // Performance tracking
        this.performance.frameTime = Date.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    performanceCleanup() {
        const now = Date.now();
        
        if (!this.performance) {
            this.performance = {
                frameTime: 0,
                bubbleCount: 0,
                renderCalls: 0,
                lastCleanup: Date.now()
            };
        }
        
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
            console.error('❌ Error removing bubble:', error);
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
                const bubblePosition = newPosition.clone();
                bubblePosition.y += this.config.yOffset;
                bubblePosition.x += index * 0.6;
                bubblePosition.y += index * 0.4;
                
                bubble.userData.originalPosition.lerp(bubblePosition, 0.15);
            });
        } catch (error) {
            console.error('Error updating bubble positions:', error);
        }
    }
    
    handleResize() {
        // Handle resize events
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
    
    createTestBubble(message = "Test message! 🚀", username = "TestUser") {
        if (!window.THREE) {
            console.warn('THREE.js not available for test bubble');
            return null;
        }
        
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            3,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
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

console.log('💬✨ Enhanced ChatBubbleSystem v3.1 - COMPLETE FIX loaded');