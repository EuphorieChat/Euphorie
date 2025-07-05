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
        
        // Initialize missing properties to fix errors
        this.materialPool = [];
        this.texturePool = [];
        this.performance = {
            frameTime: 0,
            bubbleCount: 0,
            renderCalls: 0,
            lastCleanup: Date.now()
        };
        this.animations = {
            fadeIn: { duration: 300, easing: 'easeOutBack' },
            fadeOut: { duration: 500, easing: 'easeInQuart' },
            bounce: { duration: 400, easing: 'easeOutBounce' }
        };
        this.sounds = {};
        this.isMobile = window.innerWidth <= 768;
        
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
            enableDebug: false,
            textureResolution: 2,
            enableShadows: true,
            soundEnabled: false,
            cullingDistance: 100,
            lodDistance: 30
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
    
    // FIXED: Added the missing drawBubbleBackground method
    drawBubbleBackground(context, width, height) {
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
        
        // Pretty bubble tail with gradient
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
        
        // Add inner glow for extra prettiness
        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 1;
        context.beginPath();
        this.roundRect(context, 3, 3, width - 6, height - 23, this.config.borderRadius - 3);
        context.stroke();
    }
    
    // FIXED: Added the missing roundRect method
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
            
            // Enhanced fonts for prettier text
            const usernameFont = `bold ${this.config.fontSize * 0.8}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif`;
            const messageFont = `${this.config.fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif`;
            
            // Calculate text dimensions with proper wrapping
            const textMetrics = this.calculateTextDimensions(context, message, username, usernameFont, messageFont);
            
            // Set canvas size based on actual text content
            const bubbleWidth = textMetrics.bubbleWidth;
            const bubbleHeight = textMetrics.bubbleHeight;
            
            canvas.width = bubbleWidth * 2; // High DPI
            canvas.height = bubbleHeight * 2;
            context.scale(2, 2); // High DPI scaling
            
            // Draw pretty background
            this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
            
            // Draw username with enhanced styling
            context.font = usernameFont;
            context.fillStyle = this.bubbleStyles.usernameColor;
            context.textAlign = 'left';
            
            // Username background pill
            const usernameWidth = context.measureText(username).width;
            const pillGradient = context.createLinearGradient(0, this.config.padding - 2, usernameWidth + 16, this.config.padding + 18);
            pillGradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)');
            pillGradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
            
            context.fillStyle = pillGradient;
            context.beginPath();
            this.roundRect(context, this.config.padding - 4, this.config.padding - 2, usernameWidth + 8, 20, 10);
            context.fill();
            
            // Username border
            context.strokeStyle = 'rgba(102, 126, 234, 0.3)';
            context.lineWidth = 1;
            context.stroke();
            
            // Username text
            context.fillStyle = this.bubbleStyles.usernameColor;
            context.fillText(username, this.config.padding, this.config.padding + 15);
            
            // Draw message text with enhanced styling
            context.font = messageFont;
            context.fillStyle = this.bubbleStyles.textColor;
            
            // Add text shadow for better readability
            context.shadowColor = 'rgba(255, 255, 255, 0.8)';
            context.shadowBlur = 1;
            context.shadowOffsetY = 1;
            
            textMetrics.lines.forEach((line, index) => {
                context.fillText(
                    line,
                    this.config.padding,
                    this.config.padding + this.config.fontSize * 0.8 + 25 + (index * textMetrics.lineHeight)
                );
            });
            
            // Reset shadow
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            context.shadowOffsetY = 0;
            
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
            
            // Position bubble above avatar with better spacing
            const bubblePosition = position.clone();
            bubblePosition.y += this.config.yOffset;
            
            // Improved overlap prevention
            if (userId && this.bubbles.has(userId)) {
                const userBubbles = this.bubbles.get(userId);
                bubblePosition.x += (userBubbles.length - 1) * 0.8;
                bubblePosition.y += userBubbles.length * 0.5;
                bubblePosition.z += userBubbles.length * 0.1;
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
                originalPosition: bubblePosition.clone(),
                priority: 50,
                isPretty: true
            };
            
            // Enhanced animation
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
                            25 + // spacing between username and message + username pill
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
        const duration = 400; // Slightly longer for smoother effect
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Enhanced easing with bounce
            let easeProgress;
            if (progress < 0.5) {
                easeProgress = 2 * progress * progress;
            } else {
                easeProgress = 1 - 2 * Math.pow(1 - progress, 2);
            }
            
            const scale = startScale + (endScale - startScale) * easeProgress;
            bubble.scale.set(scale, scale, scale);
            
            // Add slight rotation for charm
            bubble.rotation.z = Math.sin(progress * Math.PI * 2) * 0.05;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                bubble.rotation.z = 0; // Reset rotation
                // Schedule fade out
                setTimeout(() => {
                    this.animateBubbleOut(bubble);
                }, this.config.fadeTime);
            }
        };
        
        animate();
    }
    
    animateBubbleOut(bubble) {
        if (!bubble.parent) return;
        
        const duration = 500;
        const startTime = Date.now();
        const startOpacity = bubble.userData.opacity || 1;
        
        const animate = () => {
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
        };
        
        animate();
    }
    
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        const startTime = performance ? performance.now() : Date.now();
        
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
                const floatAmount = 0.03;
                const floatOffset = Math.sin(time + bubble.userData.id * 0.5) * floatAmount;
                bubble.position.y = bubble.userData.originalPosition.y + floatOffset;
                
                // Gentle swaying
                const swayAmount = 0.015;
                bubble.position.x = bubble.userData.originalPosition.x + 
                    Math.sin(time * 0.6 + bubble.userData.id) * swayAmount;
                bubble.position.z = bubble.userData.originalPosition.z + 
                    Math.cos(time * 0.4 + bubble.userData.id) * swayAmount;
                
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
        if (performance) {
            this.performance.frameTime = performance.now() - startTime;
        }
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
        return {
            ...this.performance,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 2048, // Estimated
            materialPoolSize: this.materialPool.length,
            isMobile: this.isMobile
        };
    }
    
    createTestBubble(message = "Test message! 🚀", username = "TestUser") {
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            3,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('💬✨ Enhanced ChatBubbleSystem config updated:', newConfig);
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