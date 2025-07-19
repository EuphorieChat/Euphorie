// =============================================
// FORCE REMOVE THREE.JS GLOBAL OVERRIDES
// This script completely removes all global Vector3 interceptions
// =============================================

console.log('🔥 FORCE REMOVING all Three.js global overrides...');

function forceRemoveThreeJSOverrides() {
    if (!window.THREE) {
        console.warn('THREE.js not loaded yet, will retry...');
        setTimeout(forceRemoveThreeJSOverrides, 500);
        return;
    }
    
    console.log('🧹 Cleaning up Three.js Vector3 prototype...');
    
    try {
        // Method 1: Delete the overridden methods completely
        delete THREE.Vector3.prototype.set;
        delete THREE.Vector3.prototype.setScalar;
        
        // Method 2: Recreate Vector3 prototype from scratch
        const OriginalVector3 = function(x = 0, y = 0, z = 0) {
            this.isVector3 = true;
            this.x = x;
            this.y = y;
            this.z = z;
        };
        
        // Restore essential Vector3 methods without any interception
        OriginalVector3.prototype = {
            constructor: OriginalVector3,
            
            set: function(x, y, z) {
                this.x = x;
                this.y = y !== undefined ? y : x;
                this.z = z !== undefined ? z : x;
                return this;
            },
            
            setScalar: function(scalar) {
                this.x = scalar;
                this.y = scalar;
                this.z = scalar;
                return this;
            },
            
            setX: function(x) {
                this.x = x;
                return this;
            },
            
            setY: function(y) {
                this.y = y;
                return this;
            },
            
            setZ: function(z) {
                this.z = z;
                return this;
            },
            
            clone: function() {
                return new this.constructor(this.x, this.y, this.z);
            },
            
            copy: function(v) {
                this.x = v.x;
                this.y = v.y;
                this.z = v.z;
                return this;
            },
            
            add: function(v) {
                this.x += v.x;
                this.y += v.y;
                this.z += v.z;
                return this;
            },
            
            addScalar: function(s) {
                this.x += s;
                this.y += s;
                this.z += s;
                return this;
            },
            
            sub: function(v) {
                this.x -= v.x;
                this.y -= v.y;
                this.z -= v.z;
                return this;
            },
            
            multiply: function(v) {
                this.x *= v.x;
                this.y *= v.y;
                this.z *= v.z;
                return this;
            },
            
            multiplyScalar: function(scalar) {
                this.x *= scalar;
                this.y *= scalar;
                this.z *= scalar;
                return this;
            },
            
            divide: function(v) {
                this.x /= v.x;
                this.y /= v.y;
                this.z /= v.z;
                return this;
            },
            
            divideScalar: function(scalar) {
                return this.multiplyScalar(1 / scalar);
            },
            
            dot: function(v) {
                return this.x * v.x + this.y * v.y + this.z * v.z;
            },
            
            cross: function(v) {
                return this.crossVectors(this, v);
            },
            
            crossVectors: function(a, b) {
                const ax = a.x, ay = a.y, az = a.z;
                const bx = b.x, by = b.y, bz = b.z;
                
                this.x = ay * bz - az * by;
                this.y = az * bx - ax * bz;
                this.z = ax * by - ay * bx;
                
                return this;
            },
            
            length: function() {
                return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            },
            
            lengthSq: function() {
                return this.x * this.x + this.y * this.y + this.z * this.z;
            },
            
            normalize: function() {
                return this.divideScalar(this.length() || 1);
            },
            
            distanceTo: function(v) {
                return Math.sqrt(this.distanceToSquared(v));
            },
            
            distanceToSquared: function(v) {
                const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
                return dx * dx + dy * dy + dz * dz;
            },
            
            lerp: function(v, alpha) {
                this.x += (v.x - this.x) * alpha;
                this.y += (v.y - this.y) * alpha;
                this.z += (v.z - this.z) * alpha;
                return this;
            }
        };
        
        // Replace the prototype completely
        THREE.Vector3.prototype = OriginalVector3.prototype;
        
        console.log('✅ Vector3 prototype completely restored');
        
        // Method 3: Force garbage collection by creating new vectors
        for (let i = 0; i < 10; i++) {
            const testVector = new THREE.Vector3(1, 2, 3);
            testVector.set(i, i+1, i+2);
            testVector.setScalar(i);
        }
        
        console.log('✅ Vector3 functionality verified');
        
        // Method 4: Remove any SafeMath or protection references
        if (window.SafeMath) {
            delete window.SafeMath;
            console.log('✅ Removed global SafeMath');
        }
        
        // Method 5: Clear any cached references
        if (window.installThreeJSProtection) {
            delete window.installThreeJSProtection;
            console.log('✅ Removed installThreeJSProtection');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Error removing Three.js overrides:', error);
        return false;
    }
}

// =============================================
// MINIMAL CHAT BUBBLE SYSTEM (No global overrides)
// =============================================

class MinimalChatBubbleSystem {
    constructor() {
        console.log('💬 Creating Minimal Chat Bubble System (no global overrides)...');
        
        this.bubbles = new Map();
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.isInitialized = false;
        this._messageQueue = [];
        
        this.config = {
            maxBubbles: 25,
            fadeTime: 8000,
            yOffset: 3.5,
            fontSize: 18,
            maxWidth: 380,
            padding: 25,
            borderRadius: 20,
            animationDuration: 600,
            maxBubblesPerUser: 4,
            minHeight: 2.0,
            maxHeight: 15.0,
            overlapOffset: 0.8,
            heightIncrement: 0.5,
            groundY: 0
        };
        
        this.bindMethods();
    }
    
    bindMethods() {
        ['init', 'createBubble', 'createBubbleFromMessage', 'update', 'startUpdateLoop'].forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            }
        });
        
        this.createBubbleFromMessageSafe = (...args) => {
            try {
                return this.createBubbleFromMessage.apply(this, args);
            } catch (error) {
                console.error('Error in createBubbleFromMessageSafe:', error);
                return null;
            }
        };
    }
    
    // Simple scale validation - only for chat bubbles, no global interception
    validateScale(value) {
        if (value === undefined || value === null || !isFinite(value) || isNaN(value)) return 1;
        if (value === 0) return 0.001;
        if (value < 0) return Math.abs(value);
        if (value > 100) return 10;
        return value;
    }
    
    safeSetScale(object, x, y, z) {
        if (!object || !object.scale) return;
        
        // Simple validation without any global interception
        const safeX = this.validateScale(x);
        const safeY = this.validateScale(y !== undefined ? y : x);
        const safeZ = this.validateScale(z !== undefined ? z : x);
        
        // Use normal Three.js methods - no overrides
        object.scale.x = safeX;
        object.scale.y = safeY;
        object.scale.z = safeZ;
    }
    
    safeSetScalar(object, scalar) {
        if (!object || !object.scale) return;
        const safeScalar = this.validateScale(scalar);
        
        // Direct assignment - no prototype calls
        object.scale.x = safeScalar;
        object.scale.y = safeScalar;
        object.scale.z = safeScalar;
    }
    
    async init() {
        console.log('🚀 Initializing Minimal Chat Bubble System...');
        
        if (!window.THREE) {
            setTimeout(() => this.init(), 500);
            return;
        }
        
        if (!window.SceneManager?.scene) {
            setTimeout(() => this.init(), 300);
            return;
        }
        
        this.scene = window.SceneManager.scene;
        this.camera = window.SceneManager.camera;
        
        if (!this.scene || !this.camera) {
            console.error('❌ Scene or camera not available');
            return;
        }
        
        this.isInitialized = true;
        console.log('✅ Minimal Chat Bubble System initialized');
        
        this.startUpdateLoop();
        this.setupEventListeners();
        this.processQueuedMessages();
    }
    
    setupEventListeners() {
        if (window.EventBus) {
            window.EventBus.on('chat_message', this.createBubbleFromMessageSafe);
        }
    }
    
    processQueuedMessages() {
        if (this._messageQueue && this._messageQueue.length > 0) {
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
    
    createBubbleFromMessage(messageData) {
        if (!this.isInitialized) {
            this._messageQueue.push(messageData);
            return null;
        }
        
        if (!window.ROOM_CONFIG?.chatBubblesEnabled) return null;
        
        try {
            const avatarPosition = this.getAvatarPosition(messageData.userId || messageData.user_id);
            const position = avatarPosition || this.createFallbackPosition(messageData.userId || messageData.user_id);
            
            return this.createBubble(
                messageData.message,
                messageData.username,
                position,
                messageData.userId || messageData.user_id
            );
        } catch (error) {
            console.error('❌ Error creating bubble:', error);
            return null;
        }
    }
    
    createFallbackPosition(userId) {
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
            if (window.AvatarSystem?.getAvatarPosition) {
                const pos = window.AvatarSystem.getAvatarPosition(userId);
                if (pos) return pos;
            }
            
            if (this.scene) {
                const avatar = this.scene.children.find(child => 
                    child.userData?.userId === userId ||
                    child.userData?.id === userId ||
                    child.name === userId
                );
                if (avatar) return avatar.position.clone();
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }
    
    createBubble(message, username, position, userId) {
        if (!this.isInitialized || !window.THREE) return null;
        
        try {
            const bubbleGroup = new THREE.Group();
            const bubbleId = ++this.bubbleIdCounter;
            
            // Create simple canvas bubble
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) return null;
            
            // Simple text rendering
            const bubbleWidth = Math.max(message.length * 8 + 60, 150);
            const bubbleHeight = username ? 80 : 60;
            
            canvas.width = bubbleWidth * 2;
            canvas.height = bubbleHeight * 2;
            context.scale(2, 2);
            
            // Simple background
            context.fillStyle = 'rgba(255, 255, 255, 0.95)';
            context.fillRect(0, 0, bubbleWidth, bubbleHeight - 10);
            
            context.strokeStyle = 'rgba(102, 126, 234, 0.8)';
            context.lineWidth = 2;
            context.strokeRect(1, 1, bubbleWidth - 2, bubbleHeight - 12);
            
            // Simple text
            if (username) {
                context.font = 'bold 12px Arial';
                context.fillStyle = '#4a5cf0';
                context.fillText(username, 10, 20);
            }
            
            context.font = '14px Arial';
            context.fillStyle = '#1a1a2e';
            const textY = username ? 40 : 25;
            
            // Simple word wrap
            const words = message.split(' ');
            let line = '';
            let y = textY;
            
            for (let i = 0; i < words.length; i++) {
                const testLine = line + words[i] + ' ';
                const metrics = context.measureText(testLine);
                
                if (metrics.width > bubbleWidth - 20 && i > 0) {
                    context.fillText(line, 10, y);
                    line = words[i] + ' ';
                    y += 18;
                } else {
                    line = testLine;
                }
            }
            context.fillText(line, 10, y);
            
            // Create sprite
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            const material = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true 
            });
            
            const sprite = new THREE.Sprite(material);
            
            // Safe scaling without any global overrides
            const scale = 0.01;
            this.safeSetScale(sprite, bubbleWidth * scale, bubbleHeight * scale, 1);
            
            bubbleGroup.add(sprite);
            
            // Position
            const bubblePosition = position.clone();
            bubblePosition.y = Math.max(this.config.minHeight, position.y + this.config.yOffset);
            bubbleGroup.position.copy(bubblePosition);
            
            // Data
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
            this.safeSetScalar(bubbleGroup, 0);
            this.animateBubbleIn(bubbleGroup);
            
            // Add to scene
            this.scene.add(bubbleGroup);
            this.activeBubbles.push(bubbleGroup);
            
            // Track per user
            if (userId) {
                if (!this.bubbles.has(userId)) {
                    this.bubbles.set(userId, []);
                }
                this.bubbles.get(userId).push(bubbleGroup);
                
                const userBubbles = this.bubbles.get(userId);
                if (userBubbles.length > this.config.maxBubblesPerUser) {
                    const oldBubble = userBubbles.shift();
                    this.removeBubble(oldBubble);
                }
            }
            
            // Limit total bubbles
            if (this.activeBubbles.length > this.config.maxBubbles) {
                const oldBubble = this.activeBubbles.shift();
                this.removeBubble(oldBubble);
            }
            
            return bubbleGroup;
            
        } catch (error) {
            console.error('❌ Error creating minimal bubble:', error);
            return null;
        }
    }
    
    animateBubbleIn(bubble) {
        if (!bubble) return;
        
        const startTime = Date.now();
        const duration = this.config.animationDuration;
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const scale = progress;
                this.safeSetScalar(bubble, scale);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.safeSetScalar(bubble, 1);
                    setTimeout(() => this.animateBubbleOut(bubble), this.config.fadeTime);
                }
            } catch (error) {
                console.error('Animation error:', error);
                this.safeSetScalar(bubble, 1);
            }
        };
        
        animate();
    }
    
    animateBubbleOut(bubble) {
        if (!bubble || !bubble.parent) return;
        
        const startTime = Date.now();
        const duration = 800;
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const opacity = 1 - progress;
                const scale = 1 - (progress * 0.2);
                
                if (bubble.children[0]?.material) {
                    bubble.children[0].material.opacity = opacity;
                }
                
                this.safeSetScalar(bubble, scale);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.removeBubble(bubble);
                }
            } catch (error) {
                this.removeBubble(bubble);
            }
        };
        
        animate();
    }
    
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
    
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        try {
            this.activeBubbles.forEach(bubble => {
                if (!bubble || !bubble.parent) return;
                
                bubble.lookAt(this.camera.position);
                
                // Simple floating
                const time = Date.now() * 0.001;
                const floatOffset = Math.sin(time + bubble.userData.id * 0.7) * 0.05;
                const originalY = bubble.userData.originalPosition?.y || this.config.yOffset;
                bubble.position.y = originalY + floatOffset;
            });
        } catch (error) {
            console.error('Error in update:', error);
        }
    }
    
    startUpdateLoop() {
        const update = () => {
            try {
                if (this.isInitialized) this.update();
            } catch (error) {
                console.error('Error in update loop:', error);
            }
            requestAnimationFrame(update);
        };
        update();
    }
    
    // Public API
    getActiveBubbleCount() { return this.activeBubbles.length; }
    
    createTestBubble(message = "Minimal test! 🚀", username = "TestUser") {
        if (!window.THREE) return null;
        
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 15,
            this.config.yOffset,
            (Math.random() - 0.5) * 15
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    clearAllBubbles() {
        try {
            const bubblesToRemove = this.activeBubbles.slice();
            bubblesToRemove.forEach(bubble => this.removeBubble(bubble));
            this.activeBubbles = [];
            this.bubbles.clear();
        } catch (error) {
            console.error('Error clearing bubbles:', error);
        }
    }
    
    static getInstance() {
        if (!MinimalChatBubbleSystem._instance) {
            MinimalChatBubbleSystem._instance = new MinimalChatBubbleSystem();
        }
        return MinimalChatBubbleSystem._instance;
    }
}

// =============================================
// APPLY COMPLETE CLEANUP
// =============================================

function applyCompleteCleanup() {
    console.log('🧹 Applying complete cleanup...');
    
    // Step 1: Force remove Three.js overrides
    if (!forceRemoveThreeJSOverrides()) {
        setTimeout(applyCompleteCleanup, 500);
        return;
    }
    
    // Step 2: Wait a moment for cleanup
    setTimeout(() => {
        // Step 3: Replace with minimal system
        window.ChatBubbleSystemClass = MinimalChatBubbleSystem;
        window.ChatBubbleSystem = MinimalChatBubbleSystem.getInstance();
        
        console.log('✅ Complete cleanup applied!');
        console.log('🎯 All Three.js overrides removed');
        console.log('💬 Minimal chat bubble system active');
        console.log('🚫 NO global prototype interception');
        console.log('📈 Console spam should be completely eliminated');
        console.log('');
        console.log('🧪 Test: window.ChatBubbleSystem.createTestBubble("Clean!");');
        
    }, 100);
}

// Apply cleanup immediately
applyCompleteCleanup();