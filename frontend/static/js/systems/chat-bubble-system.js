// =============================================
// COMPLETE FIX - Remove Global Three.js Interception
// This script removes the problematic global Vector3 protections and 
// implements a clean chat bubble system
// =============================================

console.log('🛠️ Applying complete fix to remove Three.js interception...');

// STEP 1: RESTORE ORIGINAL THREE.JS FUNCTIONS
function restoreOriginalThreeJS() {
    if (!window.THREE) {
        console.warn('THREE.js not loaded yet, will retry...');
        return false;
    }
    
    console.log('🔄 Restoring original THREE.js Vector3 functions...');
    
    // Delete any modified prototype methods to restore originals
    if (THREE.Vector3.prototype._originalSet) {
        // Restore from backup if available
        THREE.Vector3.prototype.set = THREE.Vector3.prototype._originalSet;
        THREE.Vector3.prototype.setScalar = THREE.Vector3.prototype._originalSetScalar;
        delete THREE.Vector3.prototype._originalSet;
        delete THREE.Vector3.prototype._originalSetScalar;
        console.log('✅ Restored THREE.js functions from backup');
    } else {
        // Force recreation of Vector3 prototype methods
        delete THREE.Vector3.prototype.set;
        delete THREE.Vector3.prototype.setScalar;
        
        // Create fresh Vector3 to get clean methods
        const cleanVector = new THREE.Vector3();
        THREE.Vector3.prototype.set = function(x, y, z) {
            this.x = x;
            this.y = y !== undefined ? y : x;
            this.z = z !== undefined ? z : x;
            return this;
        };
        
        THREE.Vector3.prototype.setScalar = function(scalar) {
            this.x = scalar;
            this.y = scalar;
            this.z = scalar;
            return this;
        };
        
        console.log('✅ Recreated clean THREE.js Vector3 methods');
    }
    
    return true;
}

// STEP 2: SAFE MATH UTILITIES (Chat bubble specific)
const SafeBubbleMath = {
    safeScale: (value) => {
        if (value === undefined || value === null || !isFinite(value) || isNaN(value)) return 1;
        if (value === 0) return 0.001; // Prevent invisible bubbles
        if (value < 0) return Math.abs(value); // Convert negative to positive
        if (value > 100) return 10; // Cap extreme values
        return value;
    },
    
    safeProgress: (elapsed, duration) => {
        if (duration <= 0 || !isFinite(duration)) return 1;
        const progress = elapsed / duration;
        return Math.max(0, Math.min(1, isFinite(progress) ? progress : 0));
    },
    
    safeEasing: (progress) => {
        if (!isFinite(progress) || isNaN(progress)) return 0;
        progress = Math.max(0, Math.min(1, progress));
        return progress < 0.5 ? 2 * progress * progress : 1 - 2 * (1 - progress) * (1 - progress);
    }
};

// STEP 3: CLEAN CHAT BUBBLE SYSTEM (No global interception)
class CleanChatBubbleSystem {
    constructor() {
        console.log('💬 Creating Clean Chat Bubble System...');
        
        this.bubbles = new Map();
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isInitialized = false;
        this._messageQueue = [];
        
        this.config = {
            maxBubbles: 25,
            fadeTime: 8000,
            maxDistance: 60,
            fontSize: 18,
            maxWidth: 380,
            padding: 25,
            borderRadius: 20,
            yOffset: 3.5,
            animationDuration: 600,
            maxBubblesPerUser: 4,
            enableDebug: false,
            enableShadows: true,
            cullingDistance: 100,
            enableSparkles: true,
            enableGlow: true,
            minHeight: 2.0,
            maxHeight: 15.0,
            overlapOffset: 0.8,
            heightIncrement: 0.5,
            groundY: 0
        };
        
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
        
        this.performance = {
            frameTime: 0,
            bubbleCount: 0,
            renderCalls: 0,
            lastCleanup: Date.now()
        };
        
        this.isMobile = window.innerWidth <= 768;
        this.bindMethods();
        window.addEventListener('resize', this.handleResize);
        
        console.log('✅ Clean Chat Bubble System created');
    }
    
    // Safe scale method - only for chat bubbles
    setSafeBubbleScale(object, x, y, z) {
        if (!object || !object.scale) return;
        
        const safeX = SafeBubbleMath.safeScale(x);
        const safeY = SafeBubbleMath.safeScale(y !== undefined ? y : x);
        const safeZ = SafeBubbleMath.safeScale(z !== undefined ? z : x);
        
        // Use normal Three.js methods (no interception)
        object.scale.set(safeX, safeY, safeZ);
    }
    
    setSafeBubbleScalar(object, scalar) {
        if (!object || !object.scale) return;
        const safeScalar = SafeBubbleMath.safeScale(scalar);
        object.scale.setScalar(safeScalar);
    }
    
    bindMethods() {
        const methods = [
            'init', 'createBubble', 'createBubbleFromMessage', 'update',
            'animateBubbleIn', 'animateBubbleOut', 'removeBubble',
            'getAvatarPosition', 'performanceCleanup', 'startUpdateLoop',
            'handleResize', 'updateBubblePositions', 'removeUserBubbles',
            'clearAllBubbles', 'processQueuedMessages', 'setupEventListeners'
        ];
        
        methods.forEach(methodName => {
            if (typeof this[methodName] === 'function') {
                this[methodName] = this[methodName].bind(this);
            }
        });
        
        // Safe wrapper methods
        this.createBubbleFromMessageSafe = (...args) => {
            try {
                return this.createBubbleFromMessage.apply(this, args);
            } catch (error) {
                console.error('Error in createBubbleFromMessageSafe:', error);
                return null;
            }
        };
        
        this.updateSafe = (...args) => {
            try {
                return this.update.apply(this, args);
            } catch (error) {
                console.error('Error in updateSafe:', error);
            }
        };
    }
    
    async init() {
        console.log('🚀 Initializing Clean Chat Bubble System...');
        
        try {
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
            
            this.isInitialized = true;
            console.log('✅ Clean Chat Bubble System initialized');
            
            this.startUpdateLoop();
            this.setupEventListeners();
            this.processQueuedMessages();
            
        } catch (error) {
            console.error('❌ Error initializing Clean Chat Bubble System:', error);
            setTimeout(() => this.init(), 1000);
        }
    }
    
    processQueuedMessages() {
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
            
            console.log(`✅ Clean bubble created for ${messageData.username}: "${messageData.message}"`);
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
        const radius = 3 + (Math.abs(hash) % 4);
        
        return new THREE.Vector3(
            Math.cos(angle) * radius,
            this.config.groundY,
            Math.sin(angle) * radius
        );
    }
    
    getAvatarPosition(userId) {
        try {
            // Strategy 1: Use AvatarSystem
            if (window.AvatarSystem?.getAvatarPosition) {
                const pos = window.AvatarSystem.getAvatarPosition(userId);
                if (pos) return pos;
            }
            
            // Strategy 2: Search scene
            if (this.scene) {
                const searchPatterns = [
                    child => child.userData?.userId === userId,
                    child => child.userData?.id === userId,  
                    child => child.userData?.user_id === userId,
                    child => child.name === userId,
                    child => child.userData?.username === userId
                ];
                
                for (const pattern of searchPatterns) {
                    const avatar = this.scene.children.find(pattern);
                    if (avatar) return avatar.position.clone();
                }
            }
            
            // Strategy 3: Current user
            if (userId === window.ROOM_CONFIG?.userId || 
                userId === window.WebSocketManager?.userId) {
                return new THREE.Vector3(0, this.config.groundY, 0);
            }
            
            // Strategy 4: WebSocket stored position
            if (window.WebSocketManager?.connectedUsers?.has(userId)) {
                const userData = window.WebSocketManager.connectedUsers.get(userId);
                if (userData.position) {
                    return new THREE.Vector3(
                        userData.position.x, 
                        userData.position.y || this.config.groundY, 
                        userData.position.z
                    );
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return null;
        }
    }
    
    createBubble(message, username, position, userId = null) {
        if (!this.isInitialized || !window.THREE) {
            console.warn('💬 Clean Chat Bubble System not ready');
            return null;
        }
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
            // Create canvas
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
            
            // Draw bubble
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
            
            // CLEAN: Use safe scale helper (no global interception)
            const scale = 0.008;
            this.setSafeBubbleScale(sprite, bubbleWidth * scale, bubbleHeight * scale, 1);
            
            bubbleGroup.add(sprite);
            
            // Position bubble
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
                originalPosition: bubblePosition.clone(),
                isChatBubble: true
            };
            
            // CLEAN: Safe animation start
            this.setSafeBubbleScalar(bubbleGroup, 0);
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
            console.error('❌ Error creating clean bubble:', error);
            return null;
        }
    }
    
    calculateSafeBubblePosition(basePosition, userId) {
        const bubblePosition = basePosition.clone();
        
        bubblePosition.y = Math.max(
            this.config.minHeight, 
            basePosition.y + this.config.yOffset
        );
        
        bubblePosition.y = Math.min(this.config.maxHeight, bubblePosition.y);
        
        if (userId && this.bubbles.has(userId)) {
            const userBubbles = this.bubbles.get(userId);
            const bubbleIndex = userBubbles.length;
            
            bubblePosition.x += bubbleIndex * this.config.overlapOffset;
            bubblePosition.y += bubbleIndex * this.config.heightIncrement;
            bubblePosition.z += bubbleIndex * 0.1;
        }
        
        return bubblePosition;
    }
    
    animateBubbleIn(bubble) {
        if (!bubble) return;
        
        const startScale = 0;
        const endScale = 1;
        const duration = this.config.animationDuration || 600;
        const startTime = Date.now();
        
        bubble.userData.animationPhase = 'entering';
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = SafeBubbleMath.safeProgress(elapsed, duration);
                const easeProgress = SafeBubbleMath.safeEasing(progress);
                
                let bounceScale = easeProgress;
                if (progress > 0.8) {
                    const bouncePhase = (progress - 0.8) / 0.2;
                    const bounce = Math.sin(bouncePhase * Math.PI * 4) * 0.1 * (1 - bouncePhase);
                    bounceScale = easeProgress + bounce;
                }
                
                const rawScale = startScale + (endScale - startScale) * bounceScale;
                const safeScale = SafeBubbleMath.safeScale(rawScale);
                
                // CLEAN: Direct safe scaling
                this.setSafeBubbleScalar(bubble, safeScale);
                
                const rotation = (1 - progress) * 0.2 * Math.sin(progress * Math.PI * 2);
                bubble.rotation.z = isFinite(rotation) ? rotation : 0;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    bubble.userData.animationPhase = 'stable';
                    bubble.rotation.z = 0;
                    this.setSafeBubbleScalar(bubble, 1);
                    
                    setTimeout(() => {
                        this.animateBubbleOut(bubble);
                    }, this.config.fadeTime);
                }
            } catch (error) {
                console.error('❌ Error in clean bubble animation:', error);
                this.setSafeBubbleScalar(bubble, 1);
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
                const scale = SafeBubbleMath.safeScale(1 - (easeProgress * 0.2));
                
                bubble.rotation.z = easeProgress * 0.3;
                
                const upwardMovement = easeProgress * 0.5;
                bubble.position.y = bubble.userData.originalPosition.y + upwardMovement;
                
                if (bubble.children[0]?.material) {
                    bubble.children[0].material.opacity = opacity;
                    bubble.userData.opacity = opacity;
                }
                
                this.setSafeBubbleScalar(bubble, scale);
                
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
                
                // Floating animation
                const time = Date.now() * 0.0008;
                const floatAmount = 0.05;
                const floatOffset = Math.sin(time + bubble.userData.id * 0.7) * floatAmount;
                
                const originalY = bubble.userData.originalPosition?.y || this.config.yOffset;
                const newY = Math.max(this.config.minHeight, originalY + floatOffset);
                bubble.position.y = isFinite(newY) ? newY : this.config.yOffset;
                
                // Swaying
                const swayAmount = 0.02;
                const swaySpeed = time * 0.4;
                const originalX = bubble.userData.originalPosition?.x || 0;
                const originalZ = bubble.userData.originalPosition?.z || 0;
                
                const swayX = Math.sin(swaySpeed + bubble.userData.id) * swayAmount;
                const swayZ = Math.cos(swaySpeed * 0.7 + bubble.userData.id * 0.5) * swayAmount;
                
                bubble.position.x = originalX + (isFinite(swayX) ? swayX : 0);
                bubble.position.z = originalZ + (isFinite(swayZ) ? swayZ : 0);
                
                // Rotation
                if (bubble.userData.animationPhase === 'stable') {
                    const rotationZ = Math.sin(time * 0.3 + bubble.userData.id) * 0.05;
                    bubble.rotation.z = isFinite(rotationZ) ? rotationZ : 0;
                }
                
                // Distance-based scaling
                if (bubble.children[0]?.material) {
                    const normalizedDistance = Math.min(distance / this.config.maxDistance, 1);
                    const opacity = Math.max(0.3, 1 - Math.pow(normalizedDistance, 1.5)) * (bubble.userData.opacity || 1);
                    bubble.children[0].material.opacity = isFinite(opacity) ? opacity : 0.8;
                    
                    const rawScaleMultiplier = Math.max(0.7, 1 - normalizedDistance * 0.3);
                    const safeScaleMultiplier = SafeBubbleMath.safeScale(rawScaleMultiplier);
                    this.setSafeBubbleScalar(bubble, safeScaleMultiplier);
                }
            });
            
        } catch (error) {
            console.error('Error in clean update:', error);
        }
        
        this.performance.frameTime = Date.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    }
    
    // Drawing methods
    drawBubbleBackground(context, width, height) {
        try {
            const gradient = context.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            gradient.addColorStop(0.3, 'rgba(240, 248, 255, 0.9)');
            gradient.addColorStop(0.7, 'rgba(230, 245, 255, 0.88)');
            gradient.addColorStop(1, 'rgba(220, 240, 255, 0.85)');
            
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
            
            context.fillStyle = gradient;
            context.beginPath();
            this.roundRect(context, 0, 0, width, height - 20, this.config.borderRadius);
            context.fill();
            
            // Simple border (no complex animations to prevent issues)
            context.strokeStyle = 'rgba(102, 126, 234, 0.8)';
            context.lineWidth = 3;
            context.beginPath();
            this.roundRect(context, 1.5, 1.5, width - 3, height - 21.5, this.config.borderRadius - 1);
            context.stroke();
            
            // Bubble tail
            context.fillStyle = gradient;
            context.beginPath();
            context.moveTo(width / 2 - 15, height - 20);
            context.quadraticCurveTo(width / 2, height - 2, width / 2 + 15, height - 20);
            context.fill();
            
        } catch (error) {
            console.error('Error in drawBubbleBackground:', error);
        }
    }
    
    drawBubbleText(context, username, textMetrics, usernameFont, messageFont) {
        // Username
        context.font = usernameFont;
        context.fillStyle = this.bubbleStyles.usernameColor;
        context.textAlign = 'left';
        
        const usernameWidth = context.measureText(username).width;
        context.fillStyle = 'rgba(74, 92, 240, 0.15)';
        context.beginPath();
        this.roundRect(context, this.config.padding - 6, this.config.padding - 3, usernameWidth + 12, 24, 12);
        context.fill();
        
        context.fillStyle = this.bubbleStyles.usernameColor;
        context.fillText(username, this.config.padding, this.config.padding + 18);
        
        // Message text
        context.font = messageFont;
        context.fillStyle = this.bubbleStyles.textColor;
        
        textMetrics.lines.forEach((line, index) => {
            context.fillText(
                line,
                this.config.padding,
                this.config.padding + this.config.fontSize * 0.85 + 30 + (index * textMetrics.lineHeight)
            );
        });
    }
    
    roundRect(context, x, y, width, height, radius) {
        context.beginPath();
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
    
    calculateTextDimensions(context, message, username, usernameFont, messageFont) {
        try {
            context.font = usernameFont;
            const usernameWidth = context.measureText(username).width;
            
            context.font = messageFont;
            const lines = this.wrapText(context, message, this.config.maxWidth - this.config.padding * 2);
            
            let maxTextWidth = usernameWidth;
            lines.forEach(line => {
                const lineWidth = context.measureText(line).width;
                if (lineWidth > maxTextWidth) {
                    maxTextWidth = lineWidth;
                }
            });
            
            const lineHeight = this.config.fontSize * 1.3;
            const bubbleWidth = Math.max(maxTextWidth + this.config.padding * 2, 140);
            const bubbleHeight = this.config.padding * 2 + 
                                this.config.fontSize * 0.85 + 
                                30 + 
                                (lines.length * lineHeight) + 
                                30;
            
            return { bubbleWidth, bubbleHeight, lines, lineHeight, maxTextWidth };
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
    
    // Utility methods
    removeBubble(bubble) {
        if (!bubble) return;
        
        try {
            if (bubble.parent) bubble.parent.remove(bubble);
            
            bubble.children.forEach(child => {
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
                if (child.geometry) child.geometry.dispose();
            });
            
            const activeIndex = this.activeBubbles.indexOf(bubble);
            if (activeIndex > -1) this.activeBubbles.splice(activeIndex, 1);
            
            if (bubble.userData.userId && this.bubbles.has(bubble.userData.userId)) {
                const userBubbles = this.bubbles.get(bubble.userData.userId);
                const userIndex = userBubbles.indexOf(bubble);
                if (userIndex > -1) userBubbles.splice(userIndex, 1);
                
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
            userBubbles.forEach(bubble => this.animateBubbleOut(bubble));
            this.bubbles.delete(userId);
        } catch (error) {
            console.error('Error removing user bubbles:', error);
        }
    }
    
    clearAllBubbles() {
        try {
            const bubblesToRemove = this.activeBubbles.slice();
            bubblesToRemove.forEach(bubble => this.removeBubble(bubble));
            this.activeBubbles = [];
            this.bubbles.clear();
            console.log('💬 All bubbles cleared');
        } catch (error) {
            console.error('Error clearing bubbles:', error);
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
                if (this.isInitialized) this.updateSafe();
            } catch (error) {
                console.error('Error in update loop:', error);
            }
            requestAnimationFrame(update);
        };
        update();
    }
    
    // Public API
    getActiveBubbleCount() { return this.activeBubbles.length; }
    getUserBubbleCount(userId) { return this.bubbles.has(userId) ? this.bubbles.get(userId).length : 0; }
    setDebugMode(enabled) { this.config.enableDebug = enabled; }
    
    getPerformanceStats() {
        return {
            ...this.performance,
            visibleBubbles: this.activeBubbles.filter(b => b.userData.isVisible).length,
            userCount: this.bubbles.size,
            memoryUsage: this.activeBubbles.length * 2048,
            isMobile: this.isMobile
        };
    }
    
    createTestBubble(message = "Clean test! 🚀", username = "TestUser") {
        if (!window.THREE) return null;
        
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            this.config.yOffset,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    dispose() {
        try {
            this.clearAllBubbles();
            window.removeEventListener('resize', this.handleResize);
            console.log('💬 Clean Chat Bubble System disposed');
        } catch (error) {
            console.error('Error disposing system:', error);
        }
    }
    
    static getInstance() {
        if (!CleanChatBubbleSystem._instance) {
            CleanChatBubbleSystem._instance = new CleanChatBubbleSystem();
        }
        return CleanChatBubbleSystem._instance;
    }
}

// STEP 4: APPLY THE COMPLETE FIX
function applyCompleteFix() {
    console.log('🔧 Applying complete fix...');
    
    // 1. Restore Three.js
    if (!restoreOriginalThreeJS()) {
        setTimeout(applyCompleteFix, 500);
        return;
    }
    
    // 2. Replace ChatBubbleSystem
    window.ChatBubbleSystemClass = CleanChatBubbleSystem;
    window.ChatBubbleSystem = CleanChatBubbleSystem.getInstance();
    
    // 3. Export for modules
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CleanChatBubbleSystem;
    }
    
    console.log('✅ Complete fix applied successfully!');
    console.log('🎯 Three.js interception removed');
    console.log('💬 Clean chat bubble system active');
    console.log('📈 Console spam should be eliminated');
    console.log('');
    console.log('🧪 Test with: window.ChatBubbleSystem.createTestBubble("Fixed!");');
}

// Apply fix when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCompleteFix);
} else {
    applyCompleteFix();
}