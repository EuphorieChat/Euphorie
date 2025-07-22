// =============================================
// EUPHORIE 3D EMOTION SYSTEM - FIXED VERSION
// Removed duplicate SafeMath declaration to fix conflict
// =============================================

console.log('🎭 LOADING Emotion System - Fixed Version...');

// Use SafeMath from global scope (declared in chat-bubble-system.js)
// Create a safe wrapper that uses global SafeMath or provides fallbacks
const getSafeMath = () => {
    if (typeof window.SafeMath !== 'undefined') {
        return window.SafeMath;
    }
    
    // Fallback implementation if SafeMath is not available
    return {
        safeScale: (value) => {
            if (value === undefined || value === null) return 1;
            if (!isFinite(value) || isNaN(value)) return 1;
            if (value === 0) return 0.001;
            if (value < -100) return 0.001;
            if (value > 100) return 10;
            return Math.abs(value);
        },
        safeDivide: (a, b) => {
            if (b === 0 || !isFinite(b)) return 0;
            const result = a / b;
            return isFinite(result) ? result : 0;
        },
        safeProgress: (elapsed, duration) => {
            if (duration <= 0 || !isFinite(duration)) return 1;
            const progress = elapsed / duration;
            return Math.max(0, Math.min(1, isFinite(progress) ? progress : 0));
        }
    };
};

// MAIN EMOTION SYSTEM CLASS
class EuphorieEmotionSystem {
    constructor() {
        console.log('🎭 Initializing Emotion System...');
        
        // Core properties
        this.isInitialized = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Emotion tracking
        this.activeEmotions = new Map(); // userId -> emotion data
        this.emotionHistory = new Map(); // userId -> emotion history
        this.emotionParticles = new Map(); // userId -> particle systems
        
        // Available emotions with enhanced data
        this.emotions = {
            happy: { 
                emoji: '😊', 
                color: 0xFFD700, 
                particle: 'sparkle',
                sound: 'happy.mp3',
                animation: 'bounce',
                duration: 3000,
                intensity: 1.0
            },
            sad: { 
                emoji: '😢', 
                color: 0x4169E1, 
                particle: 'rain',
                sound: 'sad.mp3',
                animation: 'droop',
                duration: 4000,
                intensity: 0.8
            },
            angry: { 
                emoji: '😡', 
                color: 0xFF4500, 
                particle: 'fire',
                sound: 'angry.mp3',
                animation: 'shake',
                duration: 2500,
                intensity: 1.2
            },
            love: { 
                emoji: '😍', 
                color: 0xFF69B4, 
                particle: 'hearts',
                sound: 'love.mp3',
                animation: 'float',
                duration: 5000,
                intensity: 1.1
            },
            surprised: { 
                emoji: '😲', 
                color: 0xFFFF00, 
                particle: 'burst',
                sound: 'surprise.mp3',
                animation: 'jump',
                duration: 2000,
                intensity: 1.3
            },
            laugh: { 
                emoji: '😂', 
                color: 0x32CD32, 
                particle: 'bubbles',
                sound: 'laugh.mp3',
                animation: 'wobble',
                duration: 3500,
                intensity: 1.4
            },
            confused: { 
                emoji: '😕', 
                color: 0x9370DB, 
                particle: 'question',
                sound: 'confused.mp3',
                animation: 'tilt',
                duration: 3000,
                intensity: 0.9
            },
            excited: { 
                emoji: '🤩', 
                color: 0xFF1493, 
                particle: 'stars',
                sound: 'excited.mp3',
                animation: 'vibrate',
                duration: 4000,
                intensity: 1.5
            }
        };
        
        // Configuration
        this.config = {
            maxEmotionsPerUser: 3,
            defaultDuration: 3000,
            particleCount: 50,
            emotionScale: 1.5,
            enableSound: true,
            enableParticles: true,
            enableAnimations: true,
            fadeTime: 800,
            yOffset: 4.0,
            maxDistance: 50,
            enableDebug: false
        };
        
        // Performance tracking
        this.performance = {
            activeEmotions: 0,
            particleSystems: 0,
            frameTime: 0,
            lastCleanup: Date.now()
        };
        
        // Bind methods
        this.bindMethods();
        
        console.log('✅ Emotion System created with', Object.keys(this.emotions).length, 'emotions');
    }
    
    bindMethods() {
        const methods = [
            'init', 'triggerEmotion', 'showRemoteEmotion', 'createEmotionDisplay',
            'createParticleSystem', 'animateEmotion', 'removeEmotion',
            'update', 'cleanup', 'showEmotionPanel', 'getAvatarPosition',
            'handleResize', 'updateEmotionPositions'
        ];
        
        methods.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            }
        });
    }
    
    async init() {
        console.log('🚀 Initializing Emotion System...');
        
        try {
            if (!window.THREE) {
                console.warn('❌ THREE.js not available - retrying in 500ms');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            // Wait for scene systems
            if (!window.SceneManager?.scene) {
                console.log('🎭 Waiting for SceneManager... retrying in 300ms');
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
            
            console.log('✅ Emotion System initialized successfully');
            
            this.startUpdateLoop();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing Emotion System:', error);
            setTimeout(() => this.init(), 1000);
        }
    }
    
    setupEventListeners() {
        // Listen for emotion events from WebSocket
        if (window.EventBus) {
            window.EventBus.on('emotion', (data) => {
                this.showRemoteEmotion(data.user_id, data.emotion);
            });
        }
        
        // Cleanup interval
        setInterval(() => {
            this.cleanup();
        }, 5000);
        
        // Window resize
        window.addEventListener('resize', this.handleResize);
    }
    
    triggerEmotion(emotion) {
        if (!this.isInitialized) {
            console.warn('🎭 Emotion System not ready');
            return;
        }
        
        if (!this.emotions[emotion]) {
            console.warn(`🎭 Unknown emotion: ${emotion}`);
            return;
        }
        
        // Get current user ID
        const userId = window.WebSocketManager?.userId || window.ROOM_CONFIG?.userId || 'local_user';
        
        console.log(`🎭 Triggering emotion: ${emotion} for user: ${userId}`);
        
        // Send via WebSocket if available
        if (window.sendEmotion) {
            window.sendEmotion(emotion);
        }
        
        // Show locally
        this.showLocalEmotion(userId, emotion);
        
        return true;
    }
    
    showLocalEmotion(userId, emotion) {
        const avatarPosition = this.getAvatarPosition(userId);
        if (!avatarPosition) {
            console.warn(`🎭 No avatar found for user: ${userId}`);
            return;
        }
        
        this.createEmotionDisplay(userId, emotion, avatarPosition);
    }
    
    showRemoteEmotion(userId, emotion) {
        if (!this.isInitialized || !this.emotions[emotion]) {
            console.warn(`🎭 Cannot show remote emotion: ${emotion}`);
            return;
        }
        
        console.log(`🎭 Showing remote emotion: ${emotion} from user: ${userId}`);
        
        const avatarPosition = this.getAvatarPosition(userId);
        if (!avatarPosition) {
            console.warn(`🎭 No avatar found for remote user: ${userId}`);
            return;
        }
        
        this.createEmotionDisplay(userId, emotion, avatarPosition);
    }
    
    getAvatarPosition(userId) {
        try {
            // Strategy 1: Use AvatarSystem if available
            if (window.AvatarSystem?.getAvatarPosition) {
                const pos = window.AvatarSystem.getAvatarPosition(userId);
                if (pos) return pos;
            }
            
            // Strategy 2: Search scene for avatar
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
            
            // Strategy 3: Check if this is the current user
            if (userId === window.ROOM_CONFIG?.userId || 
                userId === window.WebSocketManager?.userId) {
                return new THREE.Vector3(0, 0, 0);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return null;
        }
    }
    
    createEmotionDisplay(userId, emotionName, position) {
        try {
            const emotionData = this.emotions[emotionName];
            if (!emotionData) return;
            
            // Remove existing emotions for this user if limit reached
            this.limitUserEmotions(userId);
            
            // Create emotion group
            const emotionGroup = new THREE.Group();
            emotionGroup.userData = {
                userId: userId,
                emotion: emotionName,
                createdAt: Date.now(),
                isEmotion: true
            };
            
            // Create emoji sprite
            const emojiSprite = this.createEmojiSprite(emotionData);
            if (emojiSprite) {
                emotionGroup.add(emojiSprite);
            }
            
            // Create particle system
            if (this.config.enableParticles) {
                const particles = this.createParticleSystem(emotionData);
                if (particles) {
                    emotionGroup.add(particles);
                }
            }
            
            // Position emotion above avatar
            const emotionPosition = position.clone();
            emotionPosition.y += this.config.yOffset;
            emotionGroup.position.copy(emotionPosition);
            
            // Add to scene
            this.scene.add(emotionGroup);
            
            // Track emotion
            if (!this.activeEmotions.has(userId)) {
                this.activeEmotions.set(userId, []);
            }
            this.activeEmotions.get(userId).push(emotionGroup);
            
            // Start animation
            this.animateEmotion(emotionGroup, emotionData);
            
            // Schedule removal
            setTimeout(() => {
                this.removeEmotion(emotionGroup);
            }, emotionData.duration);
            
            console.log(`✅ Created emotion display: ${emotionName} for ${userId}`);
            
        } catch (error) {
            console.error('❌ Error creating emotion display:', error);
        }
    }
    
    createEmojiSprite(emotionData) {
        try {
            // Create canvas for emoji
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const size = 128;
            
            canvas.width = size;
            canvas.height = size;
            
            // Clear canvas
            context.clearRect(0, 0, size, size);
            
            // Draw background circle with glow
            const gradient = context.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
            gradient.addColorStop(0, `rgba(${(emotionData.color >> 16) & 255}, ${(emotionData.color >> 8) & 255}, ${emotionData.color & 255}, 0.8)`);
            gradient.addColorStop(0.7, `rgba(${(emotionData.color >> 16) & 255}, ${(emotionData.color >> 8) & 255}, ${emotionData.color & 255}, 0.4)`);
            gradient.addColorStop(1, `rgba(${(emotionData.color >> 16) & 255}, ${(emotionData.color >> 8) & 255}, ${emotionData.color & 255}, 0.1)`);
            
            context.fillStyle = gradient;
            context.beginPath();
            context.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
            context.fill();
            
            // Draw emoji
            context.font = `${size * 0.6}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = '#000';
            context.fillText(emotionData.emoji, size/2, size/2);
            
            // Create texture and sprite
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                alphaTest: 0.001
            });
            
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(this.config.emotionScale, this.config.emotionScale, 1);
            
            return sprite;
            
        } catch (error) {
            console.error('Error creating emoji sprite:', error);
            return null;
        }
    }
    
    createParticleSystem(emotionData) {
        try {
            const geometry = new THREE.BufferGeometry();
            const particles = this.config.particleCount;
            
            const positions = new Float32Array(particles * 3);
            const colors = new Float32Array(particles * 3);
            const sizes = new Float32Array(particles);
            
            const color = new THREE.Color(emotionData.color);
            
            for (let i = 0; i < particles; i++) {
                // Random positions in a sphere
                const i3 = i * 3;
                positions[i3] = (Math.random() - 0.5) * 4;
                positions[i3 + 1] = Math.random() * 2;
                positions[i3 + 2] = (Math.random() - 0.5) * 4;
                
                // Colors with some variation
                colors[i3] = color.r + (Math.random() - 0.5) * 0.2;
                colors[i3 + 1] = color.g + (Math.random() - 0.5) * 0.2;
                colors[i3 + 2] = color.b + (Math.random() - 0.5) * 0.2;
                
                // Random sizes
                sizes[i] = Math.random() * 0.5 + 0.2;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            const material = new THREE.PointsMaterial({
                size: 0.1,
                transparent: true,
                opacity: 0.8,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true
            });
            
            const particles_mesh = new THREE.Points(geometry, material);
            particles_mesh.userData = { isParticleSystem: true };
            
            return particles_mesh;
            
        } catch (error) {
            console.error('Error creating particle system:', error);
            return null;
        }
    }
    
    animateEmotion(emotionGroup, emotionData) {
        if (!emotionGroup || !emotionData) return;
        
        const startTime = Date.now();
        const duration = emotionData.duration;
        const intensity = emotionData.intensity || 1.0;
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = getSafeMath().safeProgress(elapsed, duration);
                
                if (progress >= 1 || !emotionGroup.parent) {
                    return; // Animation complete or object removed
                }
                
                // Apply animation based on type
                switch (emotionData.animation) {
                    case 'bounce':
                        this.animateBounce(emotionGroup, progress, intensity);
                        break;
                    case 'float':
                        this.animateFloat(emotionGroup, progress, intensity);
                        break;
                    case 'shake':
                        this.animateShake(emotionGroup, progress, intensity);
                        break;
                    case 'wobble':
                        this.animateWobble(emotionGroup, progress, intensity);
                        break;
                    case 'pulse':
                        this.animatePulse(emotionGroup, progress, intensity);
                        break;
                    default:
                        this.animateDefault(emotionGroup, progress, intensity);
                        break;
                }
                
                // Animate particles
                this.animateParticles(emotionGroup, progress);
                
                requestAnimationFrame(animate);
                
            } catch (error) {
                console.error('Error in emotion animation:', error);
            }
        };
        
        animate();
    }
    
    animateBounce(group, progress, intensity) {
        const bounceHeight = 0.5 * intensity;
        const bounceSpeed = 8;
        const yOffset = Math.abs(Math.sin(progress * Math.PI * bounceSpeed)) * bounceHeight;
        
        group.position.y = group.userData.originalY + yOffset;
        
        const scale = 1 + Math.sin(progress * Math.PI * bounceSpeed * 2) * 0.1 * intensity;
        group.scale.set(getSafeMath().safeScale(scale), getSafeMath().safeScale(scale), getSafeMath().safeScale(scale));
    }
    
    animateFloat(group, progress, intensity) {
        const floatHeight = 1.0 * intensity;
        const floatSpeed = 2;
        const yOffset = Math.sin(progress * Math.PI * floatSpeed) * floatHeight;
        
        group.position.y = (group.userData.originalY || group.position.y) + yOffset;
        
        const rotation = Math.sin(progress * Math.PI * 4) * 0.2 * intensity;
        group.rotation.z = rotation;
    }
    
    animateShake(group, progress, intensity) {
        const shakeAmount = 0.1 * intensity;
        const shakeSpeed = 20;
        
        const shakeX = (Math.random() - 0.5) * shakeAmount * Math.sin(progress * Math.PI * shakeSpeed);
        const shakeY = (Math.random() - 0.5) * shakeAmount * Math.sin(progress * Math.PI * shakeSpeed);
        
        group.position.x = (group.userData.originalX || 0) + shakeX;
        group.position.y = (group.userData.originalY || group.position.y) + shakeY;
    }
    
    animateWobble(group, progress, intensity) {
        const wobbleAmount = 0.3 * intensity;
        const wobbleSpeed = 6;
        
        const wobble = Math.sin(progress * Math.PI * wobbleSpeed) * wobbleAmount;
        group.rotation.z = wobble;
        
        const scale = 1 + Math.sin(progress * Math.PI * wobbleSpeed * 1.5) * 0.05 * intensity;
        group.scale.set(getSafeMath().safeScale(scale), getSafeMath().safeScale(scale), getSafeMath().safeScale(scale));
    }
    
    animatePulse(group, progress, intensity) {
        const pulseSpeed = 4;
        const pulseAmount = 0.2 * intensity;
        
        const pulse = 1 + Math.sin(progress * Math.PI * pulseSpeed) * pulseAmount;
        group.scale.set(getSafeMath().safeScale(pulse), getSafeMath().safeScale(pulse), getSafeMath().safeScale(pulse));
        
        // Fade out towards the end
        if (progress > 0.7) {
            const fadeProgress = (progress - 0.7) / 0.3;
            const opacity = 1 - fadeProgress;
            
            group.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = opacity;
                }
            });
        }
    }
    
    animateDefault(group, progress, intensity) {
        // Simple fade out animation
        if (progress > 0.6) {
            const fadeProgress = (progress - 0.6) / 0.4;
            const opacity = 1 - fadeProgress;
            
            group.children.forEach(child => {
                if (child.material) {
                    child.material.opacity = opacity;
                }
            });
        }
        
        // Slight upward movement
        const upwardMovement = progress * 0.5 * intensity;
        group.position.y = (group.userData.originalY || group.position.y) + upwardMovement;
    }
    
    animateParticles(group, progress) {
        const particles = group.children.find(child => child.userData?.isParticleSystem);
        if (!particles) return;
        
        try {
            const positions = particles.geometry.attributes.position.array;
            const originalPositions = particles.userData.originalPositions;
            
            if (!originalPositions) {
                particles.userData.originalPositions = positions.slice();
                return;
            }
            
            for (let i = 0; i < positions.length; i += 3) {
                const originalX = originalPositions[i];
                const originalY = originalPositions[i + 1];
                const originalZ = originalPositions[i + 2];
                
                // Spread particles outward over time
                const spread = progress * 2;
                positions[i] = originalX + (originalX * spread);
                positions[i + 1] = originalY + (progress * 3) + Math.sin(progress * Math.PI * 4) * 0.5;
                positions[i + 2] = originalZ + (originalZ * spread);
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Fade particles
            if (progress > 0.5) {
                const fadeProgress = (progress - 0.5) / 0.5;
                particles.material.opacity = 0.8 * (1 - fadeProgress);
            }
            
        } catch (error) {
            console.error('Error animating particles:', error);
        }
    }
    
    limitUserEmotions(userId) {
        if (!this.activeEmotions.has(userId)) return;
        
        const userEmotions = this.activeEmotions.get(userId);
        while (userEmotions.length >= this.config.maxEmotionsPerUser) {
            const oldEmotion = userEmotions.shift();
            this.removeEmotion(oldEmotion);
        }
    }
    
    removeEmotion(emotionGroup) {
        if (!emotionGroup || !emotionGroup.parent) return;
        
        try {
            // Remove from scene
            this.scene.remove(emotionGroup);
            
            // Dispose of resources
            emotionGroup.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            
            // Remove from tracking
            const userId = emotionGroup.userData.userId;
            if (userId && this.activeEmotions.has(userId)) {
                const userEmotions = this.activeEmotions.get(userId);
                const index = userEmotions.indexOf(emotionGroup);
                if (index > -1) {
                    userEmotions.splice(index, 1);
                }
                
                if (userEmotions.length === 0) {
                    this.activeEmotions.delete(userId);
                }
            }
            
        } catch (error) {
            console.error('Error removing emotion:', error);
        }
    }
    
    update() {
        if (!this.isInitialized || !this.camera) return;
        
        try {
            // Update emotion positions to face camera
            this.activeEmotions.forEach(userEmotions => {
                userEmotions.forEach(emotion => {
                    if (emotion.parent) {
                        emotion.lookAt(this.camera.position);
                        
                        // Distance-based scaling
                        const distance = emotion.position.distanceTo(this.camera.position);
                        if (distance > this.config.maxDistance) {
                            emotion.visible = false;
                        } else {
                            emotion.visible = true;
                            const scale = Math.max(0.5, Math.min(2, this.config.maxDistance / distance));
                            emotion.scale.set(getSafeMath().safeScale(scale), getSafeMath().safeScale(scale), getSafeMath().safeScale(scale));
                        }
                    }
                });
            });
            
        } catch (error) {
            console.error('Error in emotion update:', error);
        }
    }
    
    cleanup() {
        const now = Date.now();
        
        try {
            this.activeEmotions.forEach((userEmotions, userId) => {
                const emotionsToRemove = userEmotions.filter(emotion => {
                    return now - emotion.userData.createdAt > (emotion.userData.duration || this.config.defaultDuration) + 1000;
                });
                
                emotionsToRemove.forEach(emotion => {
                    this.removeEmotion(emotion);
                });
            });
            
            this.performance.lastCleanup = now;
            
        } catch (error) {
            console.error('Error in emotion cleanup:', error);
        }
    }
    
    showEmotionPanel() {
        // Create emotion selection UI
        const modal = document.createElement('div');
        modal.id = 'emotion-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
            padding: 30px;
            border-radius: 15px;
            max-width: 600px;
            width: 90%;
            color: white;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        `;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #4CAF50;">🎭 Choose Your Emotion</h2>
            <p style="margin-bottom: 30px; color: #ccc;">
                Express yourself! Your emotion will appear above your avatar.
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 30px;">
                ${Object.entries(this.emotions).map(([key, emotion]) => `
                    <div class="emotion-option" data-emotion="${key}" 
                         style="padding: 20px; background: #333; border-radius: 10px; cursor: pointer; 
                                transition: all 0.3s; border: 2px solid transparent;">
                        <div style="font-size: 3em; margin-bottom: 10px;">${emotion.emoji}</div>
                        <div style="font-weight: bold; text-transform: capitalize;">${key}</div>
                    </div>
                `).join('')}
            </div>
            
            <button id="cancel-emotion" 
                    style="padding: 12px 24px; background: #666; border: none; border-radius: 8px; 
                           color: white; cursor: pointer;">
                Cancel
            </button>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Add event listeners
        const emotionOptions = content.querySelectorAll('.emotion-option');
        emotionOptions.forEach(option => {
            option.addEventListener('mouseenter', () => {
                option.style.background = '#444';
                option.style.transform = 'scale(1.05)';
                option.style.borderColor = '#4CAF50';
            });
            
            option.addEventListener('mouseleave', () => {
                option.style.background = '#333';
                option.style.transform = 'scale(1)';
                option.style.borderColor = 'transparent';
            });
            
            option.addEventListener('click', () => {
                const emotion = option.dataset.emotion;
                this.triggerEmotion(emotion);
                document.body.removeChild(modal);
            });
        });
        
        // Cancel button
        const cancelButton = content.querySelector('#cancel-emotion');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    updateEmotionPositions(userId, newPosition) {
        if (!this.activeEmotions.has(userId)) return;
        
        try {
            const userEmotions = this.activeEmotions.get(userId);
            userEmotions.forEach(emotion => {
                const emotionPosition = newPosition.clone();
                emotionPosition.y += this.config.yOffset;
                emotion.position.copy(emotionPosition);
            });
            
        } catch (error) {
            console.error('Error updating emotion positions:', error);
        }
    }
    
    handleResize() {
        // Update emotion scaling for different screen sizes
        const scale = window.innerWidth <= 768 ? 0.8 : 1.0;
        this.config.emotionScale = scale * 1.5;
    }
    
    startUpdateLoop() {
        const update = () => {
            try {
                if (this.isInitialized) {
                    this.update();
                }
            } catch (error) {
                console.error('Error in emotion update loop:', error);
            }
            requestAnimationFrame(update);
        };
        update();
    }
    
    // Public API methods
    getActiveEmotionCount() {
        let count = 0;
        this.activeEmotions.forEach(userEmotions => {
            count += userEmotions.length;
        });
        return count;
    }
    
    getUserEmotionCount(userId) {
        return this.activeEmotions.has(userId) ? this.activeEmotions.get(userId).length : 0;
    }
    
    clearUserEmotions(userId) {
        if (!this.activeEmotions.has(userId)) return;
        
        const userEmotions = this.activeEmotions.get(userId).slice();
        userEmotions.forEach(emotion => {
            this.removeEmotion(emotion);
        });
    }
    
    clearAllEmotions() {
        this.activeEmotions.forEach((userEmotions, userId) => {
            this.clearUserEmotions(userId);
        });
    }
    
    setConfig(newConfig) {
        Object.assign(this.config, newConfig);
        console.log('🎭 Emotion System config updated:', newConfig);
    }
    
    getPerformanceStats() {
        return {
            ...this.performance,
            activeEmotions: this.getActiveEmotionCount(),
            trackedUsers: this.activeEmotions.size
        };
    }
    
    dispose() {
        try {
            this.clearAllEmotions();
            window.removeEventListener('resize', this.handleResize);
            console.log('🎭 Emotion System disposed');
        } catch (error) {
            console.error('Error disposing Emotion System:', error);
        }
    }
}

// Create and export the system
window.EmotionSystem = new EuphorieEmotionSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EuphorieEmotionSystem;
}

console.log('✅ Emotion System loaded successfully - No SafeMath conflicts');
console.log('🎭 Ready to express emotions!');
console.log('🧪 Test with: window.EmotionSystem.triggerEmotion("happy")');