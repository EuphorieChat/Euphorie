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
        this.createBubbleFromMessage = this.createBubbleFromMessage.bind(this);
        this.animateBubbleIn = this.animateBubbleIn.bind(this);
        this.animateBubbleOut = this.animateBubbleOut.bind(this);
        this.update = this.update.bind(this);
        this.clearAllBubbles = this.clearAllBubbles.bind(this);
        
        console.log('💬 ChatBubbleSystem created');
    }
    
    init() {
        try {
            // Wait for SceneManager to be available
            if (!window.SceneManager || !window.SceneManager.scene) {
                console.log('💬 Waiting for SceneManager...');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            this.scene = window.SceneManager.scene;
            this.camera = window.SceneManager.camera;
            
            if (!this.scene || !this.camera) {
                console.error('❌ ChatBubbleSystem: Scene or camera not available');
                return;
            }
            
            this.isInitialized = true;
            console.log('✅ ChatBubbleSystem initialized successfully');
            
            // Start update loop
            this.startUpdateLoop();
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing ChatBubbleSystem:', error);
        }
    }
    
    setupEventListeners() {
        // Listen for WebSocket messages if EventBus is available
        if (window.EventBus) {
            window.EventBus.on('chat_message', (data) => {
                this.createBubbleFromMessage(data);
            });
            
            window.EventBus.on('user_left', (data) => {
                this.removeUserBubbles(data.userId);
            });
        }
        
        // Listen for avatar updates to reposition bubbles
        if (window.AvatarSystem) {
            // Hook into avatar position updates
            const originalUpdateAvatar = window.AvatarSystem.updateAvatar;
            if (originalUpdateAvatar) {
                window.AvatarSystem.updateAvatar = (userId, position, rotation, animation) => {
                    originalUpdateAvatar.call(window.AvatarSystem, userId, position, rotation, animation);
                    this.updateBubblePositions(userId, position);
                };
            }
        }
    }
    
    createBubbleFromMessage(messageData) {
        if (!this.isInitialized || !window.ROOM_CONFIG?.chatBubblesEnabled) {
            return;
        }
        
        try {
            // Get avatar position
            const avatarPosition = this.getAvatarPosition(messageData.userId);
            if (!avatarPosition) {
                console.warn(`💬 No avatar found for user ${messageData.userId}`);
                return;
            }
            
            // Create the bubble
            const bubble = this.createBubble(
                messageData.message,
                messageData.username,
                avatarPosition,
                messageData.userId
            );
            
            if (this.config.enableDebug) {
                console.log(`💬 Created bubble for ${messageData.username}: ${messageData.message}`);
            }
            
            return bubble;
            
        } catch (error) {
            console.error('❌ Error creating bubble from message:', error);
        }
    }
    
    getAvatarPosition(userId) {
        try {
            // Try to get position from AvatarSystem
            if (window.AvatarSystem && window.AvatarSystem.getAvatarPosition) {
                return window.AvatarSystem.getAvatarPosition(userId);
            }
            
            // Fallback: search for avatar in scene
            if (this.scene) {
                const avatar = this.scene.children.find(child => 
                    child.userData && child.userData.userId === userId
                );
                if (avatar) {
                    return avatar.position.clone();
                }
            }
            
            // Default position if user is current user
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
            
            // Create canvas for bubble
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Calculate text dimensions
            context.font = `${this.config.fontSize}px Inter, Arial, sans-serif`;
            const textMetrics = context.measureText(message);
            const textWidth = Math.min(textMetrics.width, this.config.maxWidth - this.config.padding * 2);
            
            // Calculate wrapped text
            const lines = this.wrapText(context, message, textWidth);
            
            // Set canvas size
            const lineHeight = this.config.fontSize * 1.2;
            const bubbleWidth = Math.max(textWidth + this.config.padding * 2, 100);
            const bubbleHeight = lines.length * lineHeight + this.config.padding * 2 + 20;
            
            canvas.width = bubbleWidth * 2; // High DPI
            canvas.height = bubbleHeight * 2;
            context.scale(2, 2); // High DPI scaling
            
            // Draw bubble background with enhanced styling
            this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
            
            // Draw username
            context.font = `bold ${this.bubbleStyles.usernameFontSize}px Inter, Arial, sans-serif`;
            context.fillStyle = this.bubbleStyles.usernameColor;
            context.textAlign = 'left';
            context.fillText(username, this.config.padding, this.config.padding + this.bubbleStyles.usernameFontSize);
            
            // Draw message text
            context.font = `${this.config.fontSize}px Inter, Arial, sans-serif`;
            context.fillStyle = this.bubbleStyles.textColor;
            
            lines.forEach((line, index) => {
                context.fillText(
                    line,
                    this.config.padding,
                    this.config.padding + this.bubbleStyles.usernameFontSize + 10 + (index + 1) * lineHeight
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
    
    drawBubbleBackground(context, width, height) {
        // Add shadow
        context.shadowColor = this.bubbleStyles.shadowColor;
        context.shadowBlur = this.bubbleStyles.shadowBlur;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 2;
        
        // Draw main bubble
        context.fillStyle = this.bubbleStyles.background;
        context.beginPath();
        this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
        context.fill();
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        
        // Draw bubble tail
        context.beginPath();
        context.moveTo(width / 2 - 10, height - 20);
        context.lineTo(width / 2, height);
        context.lineTo(width / 2 + 10, height - 20);
        context.closePath();
        context.fill();
        
        // Draw border
        context.strokeStyle = this.bubbleStyles.borderColor;
        context.lineWidth = 2;
        context.beginPath();
        this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
        context.stroke();
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
        return lines;
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
    
    animateBubbleOut(bubble) {
        if (!bubble.parent) return; // Already removed
        
        const duration = 500;
        const startTime = Date.now();
        const startOpacity = bubble.userData.opacity;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const opacity = startOpacity * (1 - progress);
            
            if (bubble.children[0] && bubble.children[0].material) {
                bubble.children[0].material.opacity = opacity;
                bubble.userData.opacity = opacity;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.removeBubble(bubble);
            }
        };
        
        animate();
    }
    
    removeBubble(bubble) {
        if (!bubble) return;
        
        try {
            // Remove from scene
            if (bubble.parent) {
                bubble.parent.remove(bubble);
            }
            
            // Clean up materials and textures
            if (bubble.children[0] && bubble.children[0].material) {
                const material = bubble.children[0].material;
                if (material.map) {
                    material.map.dispose();
                }
                material.dispose();
            }
            
            // Remove from tracking arrays
            const activeIndex = this.activeBubbles.indexOf(bubble);
            if (activeIndex > -1) {
                this.activeBubbles.splice(activeIndex, 1);
            }
            
            // Remove from user bubbles
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
        
        const userBubbles = this.bubbles.get(userId).slice(); // Copy array
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
                bubblePosition.x += index * 0.5;
                bubblePosition.y += index * 0.3;
                
                // Smooth position interpolation
                bubble.position.lerp(bubblePosition, 0.1);
                bubble.userData.originalPosition = bubblePosition;
            }
        });
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
    
    update() {
        if (!this.camera) return;
        
        try {
            // Update bubble orientations to face camera
            this.activeBubbles.forEach(bubble => {
                if (bubble.userData.isVisible && bubble.parent) {
                    // Face camera
                    bubble.lookAt(this.camera.position);
                    
                    // Gentle floating animation
                    const time = Date.now() * 0.001;
                    const floatOffset = Math.sin(time + bubble.userData.id) * 0.02;
                    bubble.position.y = bubble.userData.originalPosition.y + floatOffset;
                    
                    // Gentle swaying
                    bubble.position.x = bubble.userData.originalPosition.x + Math.sin(time * 0.5 + bubble.userData.id) * 0.01;
                    bubble.position.z = bubble.userData.originalPosition.z + Math.cos(time * 0.5 + bubble.userData.id) * 0.01;
                    
                    // Distance-based opacity
                    const distance = bubble.position.distanceTo(this.camera.position);
                    if (distance > this.config.maxDistance) {
                        bubble.userData.isVisible = false;
                        bubble.visible = false;
                    } else {
                        bubble.userData.isVisible = true;
                        bubble.visible = true;
                        
                        // Fade based on distance
                        const opacity = Math.max(0.3, 1 - (distance / this.config.maxDistance));
                        if (bubble.children[0] && bubble.children[0].material) {
                            bubble.children[0].material.opacity = opacity * bubble.userData.opacity;
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Error in ChatBubbleSystem update:', error);
        }
    }
    
    clearAllBubbles() {
        const bubblesToRemove = this.activeBubbles.slice(); // Copy array
        bubblesToRemove.forEach(bubble => {
            this.removeBubble(bubble);
        });
        
        this.activeBubbles = [];
        this.bubbles.clear();
        
        console.log('💬 All chat bubbles cleared');
    }
    
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
    
    // Utility method for manual bubble creation (for testing)
    createTestBubble(message = "Test message!", username = "TestUser") {
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            2,
            (Math.random() - 0.5) * 10
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    // Get bubbles near a position (for interaction systems)
    getBubblesNearPosition(position, radius = 5) {
        return this.activeBubbles.filter(bubble => {
            return bubble.position.distanceTo(position) <= radius;
        });
    }
    
    // Performance monitoring
    getPerformanceStats() {
        const stats = {
            totalBubbles: this.activeBubbles.length,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 1024, // Rough estimate
            oldestBubble: null,
            newestBubble: null
        };
        
        if (this.activeBubbles.length > 0) {
            const sorted = this.activeBubbles.slice().sort((a, b) => 
                a.userData.createdAt - b.userData.createdAt
            );
            stats.oldestBubble = Date.now() - sorted[0].userData.createdAt;
            stats.newestBubble = Date.now() - sorted[sorted.length - 1].userData.createdAt;
        }
        
        return stats;
    }
}

// Create and expose global instance
window.ChatBubbleSystem = new ChatBubbleSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatBubbleSystem;
}