// /static/js/systems/chat-bubble-system.js
// 3D Chat Bubble System for Euphorie
// Integrates with existing AvatarSystem and WebSocketManager

class ChatBubbleSystem {
    constructor() {
        this.bubbles = new Map(); // userId -> bubbles array
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInitialized = false;
        
        // Configuration from global config
        this.config = {
            maxBubbles: window.ROOM_CONFIG?.bubbleConfig?.maxBubbles || 20,
            fadeTime: window.ROOM_CONFIG?.bubbleConfig?.fadeTime || 5000,
            maxDistance: window.ROOM_CONFIG?.bubbleConfig?.maxDistance || 50,
            fontSize: window.ROOM_CONFIG?.bubbleConfig?.fontSize || 16,
            maxWidth: window.ROOM_CONFIG?.bubbleConfig?.maxWidth || 300,
            padding: 20,
            borderRadius: 15,
            yOffset: 3.5,
            animationDuration: 300,
            maxBubblesPerUser: 3,
            enableDebug: false
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
        
        // Bind methods
        this.init = this.init.bind(this);
        this.createBubble = this.createBubble.bind(this);
        this.update = this.update.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Setup resize handler
        window.addEventListener('resize', this.handleResize);
        
        console.log('💬✨ Enhanced ChatBubbleSystem v2.0 created');
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
            
            this.isInitialized = true;
            console.log('✅ Enhanced ChatBubbleSystem v2.0 initialized successfully');
            
            this.startUpdateLoop();
            this.setupEventListeners();
            this.initializeObjectPools();
            
        } catch (error) {
            console.error('❌ Error initializing Enhanced ChatBubbleSystem:', error);
        }
    }
    
    initializeObjectPools() {
        // Pre-create reusable objects for better performance
        for (let i = 0; i < 10; i++) {
            this.materialPool.push(this.createBaseMaterial());
        }
        console.log('🏊 Object pools initialized');
    }
    
    createBaseMaterial() {
        return new THREE.SpriteMaterial({ 
            transparent: true,
            alphaTest: 0.001,
            depthTest: false,
            depthWrite: false
        });
    }
    
    setupEventListeners() {
        if (window.EventBus) {
            window.EventBus.on('chat_message', this.createBubbleFromMessage.bind(this));
            window.EventBus.on('user_left', (data) => this.removeUserBubbles(data.userId));
            window.EventBus.on('scene_changed', () => this.handleSceneChange());
        }
        
        // Enhanced avatar position tracking
        if (window.AvatarSystem) {
            const originalUpdateAvatar = window.AvatarSystem.updateAvatar;
            if (originalUpdateAvatar) {
                window.AvatarSystem.updateAvatar = (userId, position, rotation, animation) => {
                    originalUpdateAvatar.call(window.AvatarSystem, userId, position, rotation, animation);
                    this.updateBubblePositions(userId, position);
                };
            }
        }
        
        // Performance monitoring
        setInterval(() => {
            this.performanceCleanup();
        }, 10000);
    }
    
    createBubbleFromMessage(messageData) {
        if (!this.isInitialized || !window.ROOM_CONFIG?.chatBubblesEnabled) {
            return;
        }
        
        try {
            const avatarPosition = this.getAvatarPosition(messageData.userId);
            if (!avatarPosition) {
                console.warn(`💬 No avatar found for user ${messageData.userId}`);
                return;
            }
            
            // Determine bubble style
            const style = this.getBubbleStyle(messageData);
            
            const bubble = this.createBubble(
                messageData.message,
                messageData.username,
                avatarPosition,
                messageData.userId,
                style
            );
            
            // Play sound effect
            if (this.config.soundEnabled && messageData.userId !== window.ROOM_CONFIG?.userId) {
                this.playSound('pop');
            }
            
            if (this.config.enableDebug) {
                console.log(`💬✨ Enhanced bubble created for ${messageData.username}: ${messageData.message}`);
            }
            
            return bubble;
            
        } catch (error) {
            console.error('❌ Error creating enhanced bubble from message:', error);
        }
    }
    
    getBubbleStyle(messageData) {
        if (messageData.userId === window.ROOM_CONFIG?.userId) {
            return 'own';
        } else if (messageData.type === 'system') {
            return 'system';
        } else if (messageData.isVip) {
            return 'vip';
        }
        return 'default';
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
            
            return null;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return new THREE.Vector3(0, 0, 0);
        }
    }
    
    createBubble(message, username, position, userId = null) {
        if (!this.isInitialized) {
            console.warn('💬 ChatBubbleSystem not initialized');
            return null;
        }
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
            // Create canvas for bubble with proper text wrapping
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set up fonts for accurate measurement
            const usernameFont = `bold ${this.config.fontSize * 0.8}px Inter, Arial, sans-serif`;
            const messageFont = `${this.config.fontSize}px Inter, Arial, sans-serif`;
            
            // Calculate text dimensions with proper wrapping
            const textMetrics = this.calculateTextDimensions(context, message, username, usernameFont, messageFont);
            
            // Set canvas size based on actual text content
            const bubbleWidth = textMetrics.bubbleWidth;
            const bubbleHeight = textMetrics.bubbleHeight;
            
            canvas.width = bubbleWidth * 2; // High DPI
            canvas.height = bubbleHeight * 2;
            context.scale(2, 2); // High DPI scaling
            
            // Draw bubble background that fits the text
            this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
            
            // Draw username
            context.font = usernameFont;
            context.fillStyle = this.bubbleStyles.usernameColor;
            context.textAlign = 'left';
            context.fillText(username, this.config.padding, this.config.padding + this.config.fontSize * 0.8);
            
            // Draw message text with proper wrapping
            context.font = messageFont;
            context.fillStyle = this.bubbleStyles.textColor;
            
            textMetrics.lines.forEach((line, index) => {
                context.fillText(
                    line,
                    this.config.padding,
                    this.config.padding + this.config.fontSize * 0.8 + 15 + (index * textMetrics.lineHeight)
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
            
            // Scale sprite properly based on actual canvas size
            const scale = 0.008;
            sprite.scale.set(bubbleWidth * scale, bubbleHeight * scale, 1);
            
            bubbleGroup.add(sprite);
            
            // Position bubble above avatar
            const bubblePosition = position.clone();
            bubblePosition.y += this.config.yOffset;
            
            // Add some randomization to prevent overlap
            if (userId && this.bubbles.has(userId)) {
                const userBubbles = this.bubbles.get(userId);
                bubblePosition.x += (userBubbles.length - 1) * 0.5;
                bubblePosition.y += userBubbles.length * 0.3;
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
            
            // Animate in
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
            
            return bubbleGroup;
            
        } catch (error) {
            console.error('❌ Error creating bubble:', error);
            return null;
        }
    }
    
    calculateTextDimensions(context, message, username, usernameFont, messageFont) {
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
                            this.config.fontSize * 0.8 + // username height
                            15 + // spacing between username and message
                            (lines.length * lineHeight) + // message text height
                            25; // tail height
        
        return {
            bubbleWidth,
            bubbleHeight,
            lines,
            lineHeight,
            maxTextWidth
        };
    }
    
    wrapText(context, text, maxWidth) {
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
    }
    
    animateBubbleIn(bubble) {
        const startScale = 0;
        const endScale = 1;
        const duration = this.config.animationDuration;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            const scale = startScale + (endScale - startScale) * easeProgress;
            bubble.scale.set(scale, scale, scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Schedule fade out
                setTimeout(() => {
                    this.animateBubbleOut(bubble);
                }, this.config.fadeTime);
            }
        };
        
        animate();
    }
    
    createBubbleCanvas(processedMessage, username, style) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Enhanced canvas setup with high DPI
        const dpr = this.config.textureResolution;
        
        // Calculate dimensions
        const metrics = this.calculateTextMetrics(context, processedMessage, username);
        const bubbleWidth = Math.max(metrics.maxWidth + this.config.padding * 2, 120);
        const bubbleHeight = metrics.totalHeight + this.config.padding * 2 + 25;
        
        // Set canvas size with DPI scaling
        canvas.width = bubbleWidth * dpr;
        canvas.height = bubbleHeight * dpr;
        context.scale(dpr, dpr);
        
        // Enhanced background drawing
        this.drawEnhancedBackground(context, bubbleWidth, bubbleHeight, style);
        
        // Draw text with enhanced typography
        this.drawEnhancedText(context, processedMessage, username, style, metrics);
        
        return canvas;
    }
    
    calculateTextMetrics(context, processedMessage, username) {
        const lines = Array.isArray(processedMessage) ? processedMessage : [processedMessage];
        
        // Setup fonts
        context.font = `bold ${this.config.fontSize * 0.85}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        const usernameWidth = context.measureText(username).width;
        
        context.font = `${this.config.fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        let maxTextWidth = 0;
        
        lines.forEach(line => {
            const width = context.measureText(line).width;
            if (width > maxTextWidth) maxTextWidth = width;
        });
        
        const maxWidth = Math.max(usernameWidth, maxTextWidth);
        const lineHeight = this.config.fontSize * 1.3;
        const totalHeight = 25 + (lines.length * lineHeight);
        
        return { maxWidth, totalHeight, lineHeight, lines };
    }
    
    drawEnhancedBackground(context, width, height, style) {
        // Enhanced shadow with blur
        if (this.config.enableShadows) {
            context.save();
            context.shadowColor = style.shadowColor;
            context.shadowBlur = 15;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 3;
        }
        
        // Main bubble with gradient support
        if (style.background.startsWith('linear-gradient')) {
            const gradient = this.createGradientFromCSS(context, style.background, width, height);
            context.fillStyle = gradient;
        } else {
            context.fillStyle = style.background;
        }
        
        // Enhanced rounded rectangle
        context.beginPath();
        this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
        context.fill();
        
        if (this.config.enableShadows) {
            context.restore();
        }
        
        // Bubble tail with smooth curves
        context.fillStyle = style.background.startsWith('linear-gradient') ? 
            style.borderColor : style.background;
        context.beginPath();
        context.moveTo(width / 2 - 12, height - 20);
        context.quadraticCurveTo(width / 2, height - 5, width / 2 + 12, height - 20);
        context.fill();
        
        // Enhanced border
        context.strokeStyle = style.borderColor;
        context.lineWidth = 2.5;
        context.beginPath();
        this.roundRect(context, 1, 1, width - 2, height - 21, this.config.borderRadius - 1);
        context.stroke();
        
        // Inner glow effect
        if (style.glowColor) {
            context.strokeStyle = style.glowColor;
            context.lineWidth = 1;
            context.beginPath();
            this.roundRect(context, 2, 2, width - 4, height - 22, this.config.borderRadius - 2);
            context.stroke();
        }
    }
    
    createGradientFromCSS(context, cssGradient, width, height) {
        // Simple linear gradient parser for enhanced styles
        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, 'rgba(138, 43, 226, 0.95)');
        gradient.addColorStop(1, 'rgba(75, 0, 130, 0.95)');
        return gradient;
    }
    
    drawEnhancedText(context, processedMessage, username, style, metrics) {
        const { lines, lineHeight } = metrics;
        
        // Enhanced username with background
        context.font = `bold ${this.config.fontSize * 0.85}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        context.fillStyle = style.usernameColor;
        context.textAlign = 'left';
        
        // Username background
        const usernameWidth = context.measureText(username).width;
        context.fillStyle = 'rgba(0, 0, 0, 0.1)';
        context.fillRect(this.config.padding - 4, this.config.padding - 2, usernameWidth + 8, 20);
        
        context.fillStyle = style.usernameColor;
        context.fillText(username, this.config.padding, this.config.padding + 15);
        
        // Enhanced message text with better spacing
        context.font = `${this.config.fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        context.fillStyle = style.textColor;
        
        // Add text stroke for better readability
        context.lineWidth = 3;
        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        
        lines.forEach((line, index) => {
            const y = this.config.padding + 35 + (index * lineHeight);
            context.strokeText(line, this.config.padding, y);
            context.fillText(line, this.config.padding, y);
        });
    }
    
    roundRect(context, x, y, width, height, radius) {
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
    }
    
    getMaterial() {
        return this.materialPool.length > 0 ? 
            this.materialPool.pop() : 
            this.createBaseMaterial();
    }
    
    setupTexture(texture) {
        texture.needsUpdate = true;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
    }
    
    calculateOptimalScale(width, height) {
        const baseScale = 0.009;
        const aspectRatio = width / height;
        
        return {
            x: width * baseScale,
            y: height * baseScale,
            z: 1
        };
    }
    
    addGlowEffect(bubbleGroup, glowColor) {
        // Add subtle glow effect for premium bubbles
        const glowGeometry = new THREE.PlaneGeometry(1.2, 1.2);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.z = -0.1;
        bubbleGroup.add(glowMesh);
    }
    
    calculateBubblePosition(basePosition, userId) {
        const position = basePosition.clone();
        position.y += this.config.yOffset;
        
        // Smart collision avoidance
        if (userId && this.bubbles.has(userId)) {
            const userBubbles = this.bubbles.get(userId);
            const spacing = 0.6;
            const verticalSpacing = 0.4;
            
            userBubbles.forEach((existingBubble, index) => {
                if (existingBubble.userData.isVisible) {
                    position.x += spacing * Math.cos(index * 1.2);
                    position.y += verticalSpacing * (index + 1);
                    position.z += 0.1 * Math.sin(index * 0.8);
                }
            });
        }
        
        return position;
    }
    
    calculatePriority(styleType, userId) {
        let priority = 0;
        
        if (styleType === 'vip') priority += 100;
        if (styleType === 'own') priority += 50;
        if (styleType === 'system') priority += 25;
        if (userId === window.ROOM_CONFIG?.userId) priority += 30;
        
        return priority;
    }
    
    animateBubbleIn(bubble, styleType) {
        const animationType = styleType === 'vip' ? 'bounce' : 'fadeIn';
        const config = this.animations[animationType];
        
        bubble.scale.set(0, 0, 0);
        bubble.userData.opacity = 0;
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easeProgress = this.applyEasing(progress, config.easing);
            
            const scale = easeProgress;
            bubble.scale.set(scale, scale, scale);
            
            if (bubble.children[0]?.material) {
                bubble.children[0].material.opacity = easeProgress;
                bubble.userData.opacity = easeProgress;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scheduleFadeOut(bubble);
            }
        };
        
        animate();
    }
    
    animateBubbleOut(bubble) {
        if (!bubble.parent) return;
        
        const config = this.animations.fadeOut;
        const startTime = Date.now();
        const startOpacity = bubble.userData.opacity;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easeProgress = this.applyEasing(progress, config.easing);
            
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
        };
        
        animate();
    }
    
    applyEasing(t, type) {
        switch (type) {
            case 'easeOutBack':
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            
            case 'easeOutBounce':
                const n1 = 7.5625;
                const d1 = 2.75;
                if (t < 1 / d1) {
                    return n1 * t * t;
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
            
            case 'easeOutCubic':
                return 1 - Math.pow(1 - t, 3);
            
            case 'easeInQuart':
                return t * t * t * t;
            
            default:
                return t;
        }
    }
    
    scheduleFadeOut(bubble) {
        const delay = this.config.fadeTime + (Math.random() * 1000 - 500); // Add variance
        setTimeout(() => {
            this.animateBubbleOut(bubble);
        }, delay);
    }
    
    trackUserBubble(userId, bubble) {
        if (!userId) return;
        
        if (!this.bubbles.has(userId)) {
            this.bubbles.set(userId, []);
        }
        this.bubbles.get(userId).push(bubble);
    }
    
    enforceUserLimit(userId) {
        if (!userId || !this.bubbles.has(userId)) return;
        
        const userBubbles = this.bubbles.get(userId);
        while (userBubbles.length > this.config.maxBubblesPerUser) {
            const oldBubble = userBubbles.shift();
            this.animateBubbleOut(oldBubble);
        }
    }
    
    enforceGlobalLimit() {
        while (this.activeBubbles.length > this.config.maxBubbles) {
            // Remove lowest priority bubble
            const bubbleToRemove = this.activeBubbles.reduce((lowest, current) => 
                (current.userData.priority < lowest.userData.priority) ? current : lowest
            );
            this.animateBubbleOut(bubbleToRemove);
        }
    }
    
    addInteractionHandlers(bubble) {
        // Add click/tap interaction for bubble details
        bubble.userData.onClick = () => {
            console.log(`💬 Bubble clicked: ${bubble.userData.message}`);
            // Could show expanded view, emoji reactions, etc.
        };
    }
    
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        const startTime = performance.now();
        
        try {
            this.activeBubbles.forEach(bubble => {
                if (!bubble.parent) return;
                
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
                const time = Date.now() * 0.001;
                const floatAmount = 0.03 * bubble.userData.priority / 100;
                const floatOffset = Math.sin(time + bubble.userData.id * 0.5) * floatAmount;
                bubble.position.y = bubble.userData.originalPosition.y + floatOffset;
                
                // Gentle swaying based on priority
                const swayAmount = 0.015 * (1 + bubble.userData.priority / 200);
                bubble.position.x = bubble.userData.originalPosition.x + 
                    Math.sin(time * 0.6 + bubble.userData.id) * swayAmount;
                bubble.position.z = bubble.userData.originalPosition.z + 
                    Math.cos(time * 0.4 + bubble.userData.id) * swayAmount;
                
                // LOD (Level of Detail) optimization
                if (distance > this.config.lodDistance && bubble.children[0]?.material) {
                    // Reduce quality at distance
                    bubble.children[0].material.opacity = bubble.userData.opacity * 0.7;
                } else if (bubble.children[0]?.material) {
                    // Distance-based opacity
                    const opacity = Math.max(0.4, 1 - (distance / this.config.maxDistance));
                    bubble.children[0].material.opacity = opacity * bubble.userData.opacity;
                }
            });
            
        } catch (error) {
            console.error('❌ Error in Enhanced ChatBubbleSystem update:', error);
        }
        
        // Performance tracking
        this.performance.frameTime = performance.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    performanceCleanup() {
        const now = Date.now();
        
        if (now - this.performance.lastCleanup > 10000) {
            // Clean up expired textures
            this.activeBubbles.forEach(bubble => {
                if (now - bubble.userData.createdAt > this.config.fadeTime * 3) {
                    this.removeBubble(bubble);
                }
            });
            
            // Return unused materials to pool
            while (this.materialPool.length > 15) {
                const material = this.materialPool.pop();
                material.dispose();
            }
            
            this.performance.lastCleanup = now;
            
            if (this.config.enableDebug) {
                console.log('🧹 Performance cleanup completed', {
                    bubbles: this.performance.bubbleCount,
                    avgFrameTime: this.performance.frameTime.toFixed(2) + 'ms',
                    materialPool: this.materialPool.length
                });
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
                    this.materialPool.push(child.material);
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
        
        const userBubbles = this.bubbles.get(userId).slice();
        userBubbles.forEach(bubble => {
            this.animateBubbleOut(bubble);
        });
        
        this.bubbles.delete(userId);
    }
    
    updateBubblePositions(userId, newPosition) {
        if (!this.bubbles.has(userId)) return;
        
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
    }
    
    handleResize() {
        // Adjust mobile settings on orientation change
        if (this.isMobile) {
            const isLandscape = window.innerWidth > window.innerHeight;
            this.config.maxBubbles = isLandscape ? 18 : 12;
        }
    }
    
    handleSceneChange() {
        // Optionally clear bubbles on scene change
        if (window.ROOM_CONFIG?.clearBubblesOnSceneChange) {
            this.clearAllBubbles();
        }
    }
    
    startUpdateLoop() {
        const update = () => {
            if (this.isInitialized) {
                this.update();
            }
            requestAnimationFrame(update);
        };
        update();
    }
    
    clearAllBubbles() {
        const bubblesToRemove = this.activeBubbles.slice();
        bubblesToRemove.forEach(bubble => {
            this.removeBubble(bubble);
        });
        
        this.activeBubbles = [];
        this.bubbles.clear();
        
        console.log('💬✨ All enhanced chat bubbles cleared');
    }
    
    // Audio system for bubble sounds
    createAudioBuffer(type) {
        if (!this.config.soundEnabled) return null;
        
        // Create simple audio context for UI sounds
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            return { audioContext, oscillator, gainNode };
        } catch (error) {
            console.warn('Audio not available:', error);
            return null;
        }
    }
    
    playSound(type) {
        if (!this.sounds[type] || !this.config.soundEnabled) return;
        
        try {
            const { audioContext, oscillator, gainNode } = this.sounds[type];
            
            switch (type) {
                case 'pop':
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
                    break;
                case 'whoosh':
                    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
                    break;
                case 'chime':
                    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
                    break;
            }
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
        } catch (error) {
            console.warn('Error playing bubble sound:', error);
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
    
    getPerformanceStats() {
        return {
            ...this.performance,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 2048, // Estimated
            materialPoolSize: this.materialPool.length,
            isMobile: this.isMobile
        };
    }
    
    // Enhanced testing and utility methods
    createTestBubble(message = "Enhanced test message! 🚀", username = "TestUser", style = 'vip') {
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            3,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now(), style);
    }
    
    getBubblesNearPosition(position, radius = 8) {
        return this.activeBubbles.filter(bubble => {
            return bubble.position.distanceTo(position) <= radius && bubble.userData.isVisible;
        });
    }
    
    // Configuration updates
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('💬✨ Enhanced ChatBubbleSystem config updated:', newConfig);
    }
    
    // Style management
    addCustomStyle(name, style) {
        this.bubbleStyles[name] = style;
        console.log(`💬✨ Custom bubble style '${name}' added`);
    }
    
    // Batch operations for performance
    createMultipleBubbles(messages) {
        messages.forEach(msg => {
            this.createBubbleFromMessage(msg);
        });
    }
    
    dispose() {
        // Clean up all resources
        this.clearAllBubbles();
        
        this.materialPool.forEach(material => material.dispose());
        this.texturePool.forEach(texture => texture.dispose());
        
        window.removeEventListener('resize', this.handleResize);
        
        console.log('💬✨ Enhanced ChatBubbleSystem disposed');
    }
}

// Create and expose global instance
window.ChatBubbleSystem = new ChatBubbleSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatBubbleSystem;
}