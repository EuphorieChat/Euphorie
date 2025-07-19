// =============================================
// EUPHORIE 3D CHAT BUBBLE SYSTEM v7.0 - COMPLETELY FIXED
// NO STACKING - GUARANTEED FIX
// =============================================

console.log('🔥 LOADING ChatBubbleSystem v7.0 - COMPLETELY FIXED VERSION...');

// 1. SIMPLE SAFE MATH - No more spam
const SafeMath = {
    safeScale: (value) => {
        if (value === undefined || value === null || !isFinite(value) || isNaN(value)) return 1;
        if (value <= 0) return 0.001; // Prevent invisible
        if (value > 100) return 10; // Cap extreme
        return Math.abs(value);
    }
};

// 2. SIMPLE SCALE HELPER - No global overrides
function createSimpleScaleHelper() {
    return {
        setSafeBubbleScale: function(object, x, y, z) {
            if (!object || !object.scale) return;
            
            const safeX = SafeMath.safeScale(x);
            const safeY = SafeMath.safeScale(y !== undefined ? y : x);
            const safeZ = SafeMath.safeScale(z !== undefined ? z : x);
            
            object.scale.set(safeX, safeY, safeZ);
        },
        
        setSafeBubbleScalar: function(object, scalar) {
            if (!object || !object.scale) return;
            const safeScalar = SafeMath.safeScale(scalar);
            object.scale.setScalar(safeScalar);
        }
    };
}

// 3. MAIN CHAT BUBBLE SYSTEM - ZERO STACKING
class ChatBubbleSystem {
    constructor() {
        console.log('💬✨ ChatBubbleSystem v7.0 - ZERO STACKING version starting...');
        
        this.safeScale = createSimpleScaleHelper();
        
        // Core properties
        this.bubbles = new Map(); // userId -> [bubbles]
        this.activeBubbles = [];
        this.bubbleIdCounter = 0;
        this.scene = null;
        this.camera = null;
        this.isInitialized = false;
        this._messageQueue = [];
        
        // FIXED: Absolutely NO stacking configuration
        this.config = {
            maxBubbles: 15,
            fadeTime: 2500, // Fast fade
            yOffset: 2.5, // FIXED: Always exact same height
            maxBubblesPerUser: 1, // ONLY ONE BUBBLE EVER
            fontSize: 18,
            maxWidth: 350,
            padding: 20,
            borderRadius: 15,
            animationDuration: 400,
            enableDebug: false,
            groundY: 0,
            minHeight: 2.0,
            maxHeight: 15.0,
            // CRITICAL: These prevent ANY offset calculations
            noHorizontalOffset: true,
            noVerticalOffset: true,
            forceExactPosition: true
        };
        
        this.bindMethods();
        console.log('✅ ChatBubbleSystem v7.0 - ZERO STACKING created');
    }
    
    bindMethods() {
        // Bind essential methods
        ['init', 'createBubbleFromMessage', 'createBubble', 'update', 'removeBubble'].forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            }
        });
    }
    
    async init() {
        console.log('🚀 Initializing ChatBubbleSystem v7.0...');
        
        if (!window.THREE) {
            console.warn('❌ THREE.js not available - retrying...');
            setTimeout(() => this.init(), 500);
            return;
        }
        
        if (!window.SceneManager?.scene) {
            console.log('💬 Waiting for SceneManager...');
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
        console.log('✅ ChatBubbleSystem v7.0 initialized successfully');
        
        this.startUpdateLoop();
        this.setupEventListeners();
        this.processQueuedMessages();
    }
    
    setupEventListeners() {
        if (window.EventBus) {
            window.EventBus.on('chat_message', this.createBubbleFromMessage);
        }
    }
    
    processQueuedMessages() {
        if (this._messageQueue.length > 0) {
            console.log(`📨 Processing ${this._messageQueue.length} queued messages`);
            const queue = [...this._messageQueue];
            this._messageQueue = [];
            queue.forEach(msg => this.createBubbleFromMessage(msg));
        }
    }
    
    createBubbleFromMessage(messageData) {
        if (!this.isInitialized) {
            this._messageQueue.push(messageData);
            return null;
        }
        
        if (window.ROOM_CONFIG && !window.ROOM_CONFIG.chatBubblesEnabled) {
            return null;
        }
        
        const userId = messageData.userId || messageData.user_id;
        const position = this.getAvatarPosition(userId) || this.createFallbackPosition(userId);
        
        return this.createBubble(messageData.message, messageData.username, position, userId);
    }
    
    // SUPER SIMPLE avatar position detection
    getAvatarPosition(userId) {
        if (!this.scene) return null;
        
        let foundAvatar = null;
        
        // Simple search patterns
        this.scene.traverse(child => {
            if (foundAvatar) return;
            
            if (child.userData && (
                child.userData.userId === userId ||
                child.userData.id === userId ||
                child.userData.user_id === userId ||
                child.name === userId
            )) {
                foundAvatar = child;
            }
        });
        
        if (foundAvatar && foundAvatar.position) {
            console.log(`✅ Found avatar for ${userId} at (${foundAvatar.position.x.toFixed(1)}, ${foundAvatar.position.y.toFixed(1)}, ${foundAvatar.position.z.toFixed(1)})`);
            return foundAvatar.position.clone();
        }
        
        // Check if current user
        if (this.isCurrentUser(userId) && this.camera) {
            const cameraPos = this.camera.position.clone();
            cameraPos.z -= 3; // In front of camera
            cameraPos.y = Math.max(1, cameraPos.y);
            console.log(`✅ Using camera position for current user ${userId}`);
            return cameraPos;
        }
        
        console.log(`❌ No avatar found for user ${userId}`);
        return null;
    }
    
    isCurrentUser(userId) {
        return userId === window.ROOM_CONFIG?.userId || 
               userId === window.WebSocketManager?.userId;
    }
    
    createFallbackPosition(userId) {
        // Simple hash-based position (consistent, not random)
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
        const radius = 4;
        
        const position = new THREE.Vector3(
            Math.cos(angle) * radius,
            this.config.groundY + this.config.yOffset, // EXACT height
            Math.sin(angle) * radius
        );
        
        console.log(`🎯 Fallback position for ${userId}: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        return position;
    }
    
    // ZERO STACKING bubble creation
    createBubble(message, username, position, userId = null) {
        if (!this.isInitialized || !window.THREE) {
            console.warn('💬 ChatBubbleSystem not ready');
            return null;
        }
        
        console.log(`💬 Creating bubble for ${username}: "${message}"`);
        
        // CRITICAL: Remove ANY existing bubbles for this user IMMEDIATELY
        if (userId && this.bubbles.has(userId)) {
            const existingBubbles = this.bubbles.get(userId);
            existingBubbles.forEach(bubble => {
                this.removeBubbleImmediately(bubble);
            });
            this.bubbles.delete(userId);
        }
        
        // Create new bubble
        const bubbleGroup = new THREE.Group();
        const bubbleId = ++this.bubbleIdCounter;
        
        // Simple canvas bubble
        const canvas = this.createBubbleCanvas(message, username);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true
        });
        
        const sprite = new THREE.Sprite(material);
        
        // Simple scaling
        const scale = 0.006;
        this.safeScale.setSafeBubbleScale(sprite, canvas.width * scale, canvas.height * scale, 1);
        
        bubbleGroup.add(sprite);
        
        // CRITICAL: Calculate EXACT position - NO OFFSETS
        const bubblePosition = this.calculateExactPosition(position);
        bubbleGroup.position.copy(bubblePosition);
        
        // Set bubble data
        bubbleGroup.userData = {
            id: bubbleId,
            message: message,
            username: username,
            userId: userId,
            createdAt: Date.now(),
            originalPosition: bubblePosition.clone()
        };
        
        // Add to scene and tracking
        this.scene.add(bubbleGroup);
        this.activeBubbles.push(bubbleGroup);
        
        // Track by user - ONLY ONE BUBBLE
        if (userId) {
            this.bubbles.set(userId, [bubbleGroup]);
        }
        
        // Animate in
        this.animateBubbleIn(bubbleGroup);
        
        console.log(`✅ Bubble created at (${bubblePosition.x.toFixed(1)}, ${bubblePosition.y.toFixed(1)}, ${bubblePosition.z.toFixed(1)})`);
        
        return bubbleGroup;
    }
    
    // CRITICAL: Calculate exact position with NO stacking
    calculateExactPosition(basePosition) {
        const exactPosition = basePosition.clone();
        
        // ALWAYS the same height - NO calculations based on existing bubbles
        exactPosition.y = Math.max(
            this.config.minHeight,
            basePosition.y + this.config.yOffset
        );
        
        // Clamp to max height
        exactPosition.y = Math.min(this.config.maxHeight, exactPosition.y);
        
        // NO horizontal offsets, NO Z offsets, NO calculations
        // Return the EXACT same position every time for the same avatar
        
        return exactPosition;
    }
    
    createBubbleCanvas(message, username) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Simple sizing
        const maxWidth = this.config.maxWidth;
        const padding = this.config.padding;
        const fontSize = this.config.fontSize;
        
        // Measure text
        ctx.font = `${fontSize}px Arial`;
        const lines = this.wrapText(ctx, message, maxWidth - padding * 2);
        
        const textHeight = lines.length * fontSize * 1.2;
        const usernameHeight = fontSize * 0.8;
        
        canvas.width = maxWidth;
        canvas.height = padding * 2 + usernameHeight + textHeight + 40;
        
        // Clear and redraw with proper scaling
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Simple background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        this.roundRect(ctx, 0, 0, canvas.width, canvas.height - 20, this.config.borderRadius);
        ctx.fill();
        
        // Simple border
        ctx.strokeStyle = 'rgba(100, 120, 200, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Username
        ctx.font = `bold ${fontSize * 0.8}px Arial`;
        ctx.fillStyle = '#4a5cf0';
        ctx.fillText(username, padding, padding + fontSize * 0.8);
        
        // Message
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = '#1a1a2e';
        lines.forEach((line, index) => {
            ctx.fillText(line, padding, padding + usernameHeight + 20 + (index * fontSize * 1.2));
        });
        
        // Simple tail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 10, canvas.height - 20);
        ctx.lineTo(canvas.width / 2, canvas.height - 5);
        ctx.lineTo(canvas.width / 2 + 10, canvas.height - 20);
        ctx.fill();
        
        return canvas;
    }
    
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (ctx.measureText(testLine).width <= maxWidth || !currentLine) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
    }
    
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    
    animateBubbleIn(bubble) {
        const startTime = Date.now();
        const duration = this.config.animationDuration;
        
        this.safeScale.setSafeBubbleScalar(bubble, 0);
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const scale = progress;
            this.safeScale.setSafeBubbleScalar(bubble, scale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Schedule removal
                setTimeout(() => {
                    this.removeBubble(bubble);
                }, this.config.fadeTime);
            }
        };
        
        animate();
    }
    
    removeBubbleImmediately(bubble) {
        if (!bubble || !bubble.parent) return;
        
        try {
            // Remove from scene
            if (bubble.parent) {
                bubble.parent.remove(bubble);
            }
            
            // Dispose materials
            bubble.children.forEach(child => {
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
                if (child.geometry) child.geometry.dispose();
            });
            
            // Remove from tracking
            const activeIndex = this.activeBubbles.indexOf(bubble);
            if (activeIndex > -1) {
                this.activeBubbles.splice(activeIndex, 1);
            }
            
        } catch (error) {
            console.error('Error removing bubble immediately:', error);
        }
    }
    
    removeBubble(bubble) {
        this.removeBubbleImmediately(bubble);
    }
    
    update() {
        if (!this.camera || !this.isInitialized) return;
        
        this.activeBubbles.forEach(bubble => {
            if (!bubble || !bubble.parent) return;
            
            // Face camera
            bubble.lookAt(this.camera.position);
            
            // Very gentle floating
            const time = Date.now() * 0.0005;
            const floatOffset = Math.sin(time + bubble.userData.id) * 0.02;
            const originalY = bubble.userData.originalPosition.y;
            bubble.position.y = originalY + floatOffset;
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
    
    // Debug methods
    enableDebugMode() {
        this.config.enableDebug = true;
        console.log('🔍 Debug mode ENABLED');
        this.debugInfo();
    }
    
    disableDebugMode() {
        this.config.enableDebug = false;
        console.log('🔍 Debug mode DISABLED');
    }
    
    debugInfo() {
        console.log('🎭 Active bubbles:', this.activeBubbles.length);
        console.log('👥 Users with bubbles:', this.bubbles.size);
        console.log('⚙️ Config:', this.config);
    }
    
    clearAllBubbles() {
        console.log('🧹 Clearing all bubbles...');
        
        const bubblesToRemove = [...this.activeBubbles];
        bubblesToRemove.forEach(bubble => this.removeBubbleImmediately(bubble));
        
        this.activeBubbles = [];
        this.bubbles.clear();
        
        console.log('✅ All bubbles cleared');
    }
    
    createTestBubble(message = "Test message! 🚀", username = "TestUser") {
        const position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            this.config.yOffset,
            (Math.random() - 0.5) * 10
        );
        
        return this.createBubble(message, username, position, 'test_' + Date.now());
    }
    
    getActiveBubbleCount() {
        return this.activeBubbles.length;
    }
    
    // Static singleton
    static getInstance() {
        if (!ChatBubbleSystem._instance) {
            ChatBubbleSystem._instance = new ChatBubbleSystem();
        }
        return ChatBubbleSystem._instance;
    }
}

// Create global instance
window.ChatBubbleSystemClass = ChatBubbleSystem;
window.ChatBubbleSystem = ChatBubbleSystem.getInstance();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatBubbleSystem;
}

console.log('✅ ChatBubbleSystem v7.0 - COMPLETELY FIXED loaded successfully');
console.log('🎯 ZERO STACKING GUARANTEED - Every bubble appears at EXACT same position');
console.log('🧪 Test: window.ChatBubbleSystem.createTestBubble("No stacking!")');
console.log('🔧 Debug: window.ChatBubbleSystem.enableDebugMode()');
console.log('');