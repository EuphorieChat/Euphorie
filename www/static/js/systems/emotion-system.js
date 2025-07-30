// =============================================
// EUPHORIE 3D EMOTION SYSTEM - ENHANCED VERSION
// Advanced emotion display with particle effects, combos, and trails
// =============================================

console.log('🎭 LOADING Enhanced Emotion System...');

// Safe math utilities
const getSafeMath = () => {
    if (typeof window.SafeMath !== 'undefined') {
        return window.SafeMath;
    }
    
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
        console.log('🎭 Initializing Enhanced Emotion System...');
        
        // Core properties
        this.isInitialized = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Emotion tracking
        this.activeEmotions = new Map();
        this.emotionHistory = new Map();
        this.emotionParticles = new Map();
        this.emotionCombos = new Map();
        this.emotionTrails = new Map();
        
        // Enhanced emotions with more properties
        this.emotions = {
            happy: { 
                emoji: '😊', 
                color: 0xFFD700,
                secondaryColor: 0xFFA500,
                particle: 'sparkle',
                sound: 'happy.mp3',
                animation: 'bounce',
                duration: 3000,
                intensity: 1.0,
                trail: true,
                glow: true,
                particleEmoji: '✨'
            },
            sad: { 
                emoji: '😢', 
                color: 0x4169E1,
                secondaryColor: 0x1E90FF,
                particle: 'rain',
                sound: 'sad.mp3',
                animation: 'droop',
                duration: 4000,
                intensity: 0.8,
                trail: true,
                glow: false,
                particleEmoji: '💧'
            },
            angry: { 
                emoji: '😡', 
                color: 0xFF4500,
                secondaryColor: 0xFF0000,
                particle: 'fire',
                sound: 'angry.mp3',
                animation: 'shake',
                duration: 2500,
                intensity: 1.2,
                trail: true,
                glow: true,
                particleEmoji: '🔥'
            },
            love: { 
                emoji: '😍', 
                color: 0xFF69B4,
                secondaryColor: 0xFF1493,
                particle: 'hearts',
                sound: 'love.mp3',
                animation: 'float',
                duration: 5000,
                intensity: 1.1,
                trail: true,
                glow: true,
                particleEmoji: '❤️'
            },
            surprised: { 
                emoji: '😲', 
                color: 0xFFFF00,
                secondaryColor: 0xFFD700,
                particle: 'burst',
                sound: 'surprise.mp3',
                animation: 'jump',
                duration: 2000,
                intensity: 1.3,
                trail: false,
                glow: true,
                particleEmoji: '⭐'
            },
            laugh: { 
                emoji: '😂', 
                color: 0x32CD32,
                secondaryColor: 0x00FF00,
                particle: 'bubbles',
                sound: 'laugh.mp3',
                animation: 'wobble',
                duration: 3500,
                intensity: 1.4,
                trail: true,
                glow: true,
                particleEmoji: '🎈'
            },
            confused: { 
                emoji: '😕', 
                color: 0x9370DB,
                secondaryColor: 0xDA70D6,
                particle: 'question',
                sound: 'confused.mp3',
                animation: 'tilt',
                duration: 3000,
                intensity: 0.9,
                trail: false,
                glow: false,
                particleEmoji: '❓'
            },
            excited: { 
                emoji: '🤩', 
                color: 0xFF1493,
                secondaryColor: 0xFFB6C1,
                particle: 'stars',
                sound: 'excited.mp3',
                animation: 'vibrate',
                duration: 4000,
                intensity: 1.5,
                trail: true,
                glow: true,
                particleEmoji: '🌟'
            },
            cool: {
                emoji: '😎',
                color: 0x00CED1,
                secondaryColor: 0x4682B4,
                particle: 'ice',
                sound: 'cool.mp3',
                animation: 'slide',
                duration: 3000,
                intensity: 1.0,
                trail: true,
                glow: true,
                particleEmoji: '❄️'
            },
            sleepy: {
                emoji: '😴',
                color: 0x483D8B,
                secondaryColor: 0x6A5ACD,
                particle: 'zzz',
                sound: 'sleepy.mp3',
                animation: 'sway',
                duration: 4000,
                intensity: 0.7,
                trail: false,
                glow: false,
                particleEmoji: '💤'
            }
        };
        
        // Emotion combos (when multiple emotions are triggered quickly)
        this.emotionCombosConfig = {
            'happy+excited': { name: 'euphoric', bonus: 2.0, color: 0xFFD700 },
            'sad+angry': { name: 'frustrated', bonus: 1.5, color: 0x8B0000 },
            'love+happy': { name: 'blissful', bonus: 1.8, color: 0xFF69B4 },
            'surprised+excited': { name: 'amazed', bonus: 1.6, color: 0xFFFF00 }
        };
        
        // Enhanced configuration
        this.config = {
            maxEmotionsPerUser: 3,
            defaultDuration: 3000,
            particleCount: 80,
            emotionScale: 1.5,
            enableSound: true,
            enableParticles: true,
            enableAnimations: true,
            enableTrails: true,
            enableGlow: false, // DISABLED by default for better emoji visibility
            enableCombos: true,
            fadeTime: 800,
            yOffset: 4.0,
            maxDistance: 50,
            enableDebug: false,
            trailLength: 20,
            glowIntensity: 0.5, // Reduced glow intensity
            comboWindow: 2000,
            shaderEffects: false // Disabled for better performance and clarity
        };
        
        // Performance tracking
        this.performance = {
            activeEmotions: 0,
            particleSystems: 0,
            frameTime: 0,
            lastCleanup: Date.now(),
            fps: 60
        };
        
        // Shaders for advanced effects
        this.shaders = {
            glow: {
                vertex: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragment: `
                    uniform sampler2D texture;
                    uniform vec3 glowColor;
                    uniform float intensity;
                    varying vec2 vUv;
                    
                    void main() {
                        vec4 texColor = texture2D(texture, vUv);
                        vec3 glow = glowColor * intensity * texColor.a;
                        gl_FragColor = vec4(texColor.rgb + glow, texColor.a);
                    }
                `
            }
        };
        
        // Bind methods
        this.bindMethods();
        
        console.log('✅ Enhanced Emotion System created with', Object.keys(this.emotions).length, 'emotions');
    }
    
    bindMethods() {
        const methods = [
            'init', 'triggerEmotion', 'showRemoteEmotion', 'createEmotionDisplay',
            'createParticleSystem', 'animateEmotion', 'removeEmotion',
            'update', 'cleanup', 'showEmotionPanel', 'getAvatarPosition',
            'handleResize', 'updateEmotionPositions', 'createTrail',
            'updateTrails', 'checkForCombos', 'createComboEffect'
        ];
        
        methods.forEach(method => {
            if (typeof this[method] === 'function') {
                this[method] = this[method].bind(this);
            }
        });
    }
    
    async init() {
        console.log('🚀 Initializing Enhanced Emotion System...');
        
        try {
            if (!window.THREE) {
                console.warn('❌ THREE.js not available - retrying in 500ms');
                setTimeout(() => this.init(), 500);
                return;
            }
            
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
            
            // Initialize audio context for sounds
            this.initAudio();
            
            // Create emotion container group
            this.emotionContainer = new THREE.Group();
            this.emotionContainer.name = 'EmotionContainer';
            this.scene.add(this.emotionContainer);
            
            this.isInitialized = true;
            
            console.log('✅ Enhanced Emotion System initialized successfully');
            
            this.startUpdateLoop();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Error initializing Emotion System:', error);
            setTimeout(() => this.init(), 1000);
        }
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioBuffers = new Map();
            console.log('🔊 Audio context initialized');
        } catch (error) {
            console.warn('🔇 Audio context initialization failed:', error);
            this.config.enableSound = false;
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
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.showEmotionPanel();
            }
        });
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
        
        const userId = window.WebSocketManager?.userId || window.ROOM_CONFIG?.userId || 'local_user';
        
        console.log(`🎭 Triggering emotion: ${emotion} for user: ${userId}`);
        
        // Check for combos
        if (this.config.enableCombos) {
            this.checkForCombos(userId, emotion);
        }
        
        // Send via WebSocket if available
        if (window.sendEmotion) {
            window.sendEmotion(emotion);
        }
        
        // Show locally
        this.showLocalEmotion(userId, emotion);
        
        // Update emotion history
        if (!this.emotionHistory.has(userId)) {
            this.emotionHistory.set(userId, []);
        }
        this.emotionHistory.get(userId).push({
            emotion: emotion,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    checkForCombos(userId, newEmotion) {
        const history = this.emotionHistory.get(userId) || [];
        const now = Date.now();
        
        // Get recent emotions within combo window
        const recentEmotions = history
            .filter(e => now - e.timestamp < this.config.comboWindow)
            .map(e => e.emotion);
        
        if (recentEmotions.length > 0) {
            const lastEmotion = recentEmotions[recentEmotions.length - 1];
            const comboKey = `${lastEmotion}+${newEmotion}`;
            const reverseComboKey = `${newEmotion}+${lastEmotion}`;
            
            const combo = this.emotionCombosConfig[comboKey] || this.emotionCombosConfig[reverseComboKey];
            
            if (combo) {
                console.log(`🎯 Combo detected: ${combo.name}!`);
                this.createComboEffect(userId, combo);
            }
        }
    }
    
    createComboEffect(userId, combo) {
        const position = this.getAvatarPosition(userId);
        if (!position) return;
        
        // Create combo text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Gradient text
        const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FFA500');
        gradient.addColorStop(1, '#FF69B4');
        
        context.font = 'bold 48px Arial';
        context.fillStyle = gradient;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(combo.name.toUpperCase() + '!', canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 1
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4, 2, 1);
        sprite.position.copy(position);
        sprite.position.y += this.config.yOffset + 2;
        
        this.scene.add(sprite);
        
        // Animate combo text
        const startTime = Date.now();
        const animateCombo = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / 1500;
            
            if (progress >= 1) {
                this.scene.remove(sprite);
                material.dispose();
                texture.dispose();
                return;
            }
            
            sprite.position.y += 0.02;
            sprite.scale.multiplyScalar(1.01);
            material.opacity = 1 - progress;
            
            requestAnimationFrame(animateCombo);
        };
        animateCombo();
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
                    if (avatar?.position) return avatar.position.clone();
                }
            }
            
            // Strategy 3: Check if this is the current user
            if (userId === window.ROOM_CONFIG?.userId || 
                userId === window.WebSocketManager?.userId ||
                userId === 'local_user') {
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
                duration: emotionData.duration,
                isEmotion: true,
                emotionData: emotionData
            };
            
            // Store original position for animations
            const emotionPosition = position.clone();
            emotionPosition.y += this.config.yOffset;
            emotionGroup.position.copy(emotionPosition);
            emotionGroup.userData.originalX = emotionPosition.x;
            emotionGroup.userData.originalY = emotionPosition.y;
            emotionGroup.userData.originalZ = emotionPosition.z;
            
            // Create emoji sprite with glow effect
            const emojiSprite = this.createEmojiSprite(emotionData);
            if (emojiSprite) {
                emotionGroup.add(emojiSprite);
            }
            
            // Create particle system
            if (this.config.enableParticles) {
                const particles = this.createEnhancedParticleSystem(emotionData);
                if (particles) {
                    emotionGroup.add(particles);
                }
            }
            
            // Create trail effect
            if (this.config.enableTrails && emotionData.trail) {
                const trail = this.createTrail(emotionData);
                if (trail) {
                    emotionGroup.add(trail);
                    this.emotionTrails.set(emotionGroup, trail);
                }
            }
            
            // Add to scene
            this.emotionContainer.add(emotionGroup);
            
            // Track emotion
            if (!this.activeEmotions.has(userId)) {
                this.activeEmotions.set(userId, []);
            }
            this.activeEmotions.get(userId).push(emotionGroup);
            
            // Play sound if enabled
            if (this.config.enableSound && emotionData.sound) {
                this.playEmotionSound(emotionData.sound);
            }
            
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
            // Create canvas for emoji - MINIMAL effects for clarity
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const size = 256;
            
            canvas.width = size;
            canvas.height = size;
            
            // Clear canvas with transparent background
            context.clearRect(0, 0, size, size);
            
            // OPTIONAL: Very subtle colored circle behind emoji
            if (this.config.enableGlow && emotionData.glow) {
                const color = new THREE.Color(emotionData.color);
                
                // Just a simple, very faint circle
                context.fillStyle = `rgba(${color.r*255}, ${color.g*255}, ${color.b*255}, 0.15)`;
                context.beginPath();
                context.arc(size/2, size/2, size/2.5, 0, Math.PI * 2);
                context.fill();
            }
            
            // Draw emoji CLEARLY without any effects
            context.save();
            
            // Use a slightly larger font for better visibility
            context.font = `bold ${size * 0.6}px Arial`;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // Add a very subtle white outline for dark backgrounds
            context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            context.lineWidth = 3;
            context.strokeText(emotionData.emoji, size/2, size/2);
            
            // Draw the emoji itself
            context.fillStyle = '#000000'; // Black for emoji
            context.fillText(emotionData.emoji, size/2, size/2);
            
            context.restore();
            
            // Create texture and sprite
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            const material = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                opacity: 1.0, // Full opacity for clarity
                blending: THREE.NormalBlending,
                depthTest: false,
                depthWrite: false
            });
            
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(this.config.emotionScale, this.config.emotionScale, 1);
            sprite.userData = { isEmojiSprite: true };
            
            return sprite;
            
        } catch (error) {
            console.error('Error creating emoji sprite:', error);
            return null;
        }
    }
    
    createEnhancedParticleSystem(emotionData) {
        try {
            const geometry = new THREE.BufferGeometry();
            const particles = this.config.particleCount;
            
            const positions = new Float32Array(particles * 3);
            const colors = new Float32Array(particles * 3);
            const sizes = new Float32Array(particles);
            const velocities = new Float32Array(particles * 3);
            
            const color = new THREE.Color(emotionData.color);
            const secondaryColor = new THREE.Color(emotionData.secondaryColor || emotionData.color);
            
            for (let i = 0; i < particles; i++) {
                const i3 = i * 3;
                
                // Initial positions in a sphere
                const radius = Math.random() * 2;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                
                positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
                positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                positions[i3 + 2] = radius * Math.cos(phi);
                
                // Mix primary and secondary colors
                const colorMix = Math.random();
                colors[i3] = color.r * colorMix + secondaryColor.r * (1 - colorMix);
                colors[i3 + 1] = color.g * colorMix + secondaryColor.g * (1 - colorMix);
                colors[i3 + 2] = color.b * colorMix + secondaryColor.b * (1 - colorMix);
                
                // Random sizes
                sizes[i] = Math.random() * 0.8 + 0.2;
                
                // Random velocities for particle movement
                velocities[i3] = (Math.random() - 0.5) * 0.02;
                velocities[i3 + 1] = Math.random() * 0.03 + 0.01;
                velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
            }
            
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            geometry.userData = { velocities: velocities };
            
            // Create custom particle material with reduced opacity
            const material = new THREE.PointsMaterial({
                size: 0.15,
                transparent: true,
                opacity: 0.6, // Reduced opacity so particles don't obscure emoji
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                sizeAttenuation: true,
                depthWrite: false
            });
            
            const particleSystem = new THREE.Points(geometry, material);
            particleSystem.userData = { 
                isParticleSystem: true,
                particleType: emotionData.particle,
                originalPositions: positions.slice()
            };
            
            return particleSystem;
            
        } catch (error) {
            console.error('Error creating particle system:', error);
            return null;
        }
    }
    
    createTrail(emotionData) {
        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(this.config.trailLength * 3);
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        
        const trailMaterial = new THREE.LineBasicMaterial({
            color: emotionData.color,
            transparent: true,
            opacity: 0.5,
            linewidth: 2,
            blending: THREE.AdditiveBlending
        });
        
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        trail.userData = { 
            isTrail: true,
            currentIndex: 0,
            positions: []
        };
        
        return trail;
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
                    case 'vibrate':
                        this.animateVibrate(emotionGroup, progress, intensity);
                        break;
                    case 'jump':
                        this.animateJump(emotionGroup, progress, intensity);
                        break;
                    case 'tilt':
                        this.animateTilt(emotionGroup, progress, intensity);
                        break;
                    case 'droop':
                        this.animateDroop(emotionGroup, progress, intensity);
                        break;
                    case 'slide':
                        this.animateSlide(emotionGroup, progress, intensity);
                        break;
                    case 'sway':
                        this.animateSway(emotionGroup, progress, intensity);
                        break;
                    default:
                        this.animateDefault(emotionGroup, progress, intensity);
                        break;
                }
                
                // Animate particles
                this.animateParticles(emotionGroup, progress, emotionData);
                
                // Update trail
                if (this.emotionTrails.has(emotionGroup)) {
                    this.updateTrail(emotionGroup);
                }
                
                // Fade out effect
                if (progress > 0.7) {
                    const fadeProgress = (progress - 0.7) / 0.3;
                    this.fadeEmotionGroup(emotionGroup, 1 - fadeProgress);
                }
                
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
        group.scale.set(scale, scale, scale);
    }
    
    animateFloat(group, progress, intensity) {
        const floatHeight = 1.0 * intensity;
        const floatSpeed = 2;
        const yOffset = Math.sin(progress * Math.PI * floatSpeed) * floatHeight;
        
        group.position.y = group.userData.originalY + yOffset;
        
        const rotation = Math.sin(progress * Math.PI * 4) * 0.2 * intensity;
        group.rotation.z = rotation;
    }
    
    animateShake(group, progress, intensity) {
        const shakeAmount = 0.1 * intensity;
        const shakeSpeed = 30;
        
        const shakeX = Math.sin(progress * Math.PI * shakeSpeed) * shakeAmount;
        const shakeZ = Math.cos(progress * Math.PI * shakeSpeed * 1.1) * shakeAmount;
        
        group.position.x = group.userData.originalX + shakeX;
        group.position.z = group.userData.originalZ + shakeZ;
    }
    
    animateWobble(group, progress, intensity) {
        const wobbleAmount = 0.3 * intensity;
        const wobbleSpeed = 6;
        
        const wobble = Math.sin(progress * Math.PI * wobbleSpeed) * wobbleAmount;
        group.rotation.z = wobble;
        group.rotation.x = Math.sin(progress * Math.PI * wobbleSpeed * 0.7) * wobbleAmount * 0.5;
        
        const scale = 1 + Math.sin(progress * Math.PI * wobbleSpeed * 1.5) * 0.05 * intensity;
        group.scale.set(scale, scale, scale);
    }
    
    animatePulse(group, progress, intensity) {
        const pulseSpeed = 4;
        const pulseAmount = 0.2 * intensity;
        
        const pulse = 1 + Math.sin(progress * Math.PI * pulseSpeed) * pulseAmount;
        group.scale.set(pulse, pulse, pulse);
    }
    
    animateVibrate(group, progress, intensity) {
        const vibrateSpeed = 50;
        const vibrateAmount = 0.05 * intensity;
        
        group.position.x = group.userData.originalX + Math.sin(progress * Math.PI * vibrateSpeed) * vibrateAmount;
        group.position.y = group.userData.originalY + Math.cos(progress * Math.PI * vibrateSpeed * 1.1) * vibrateAmount;
        group.position.z = group.userData.originalZ + Math.sin(progress * Math.PI * vibrateSpeed * 0.9) * vibrateAmount;
    }
    
    animateJump(group, progress, intensity) {
        const jumpHeight = 2.0 * intensity;
        const jumpCount = 3;
        const jumpProgress = (progress * jumpCount) % 1;
        
        const yOffset = Math.sin(jumpProgress * Math.PI) * jumpHeight * (1 - progress * 0.5);
        group.position.y = group.userData.originalY + yOffset;
        
        const squash = 1 - Math.abs(Math.sin(jumpProgress * Math.PI)) * 0.2;
        group.scale.set(1 / squash, squash, 1 / squash);
    }
    
    animateTilt(group, progress, intensity) {
        const tiltAmount = 0.5 * intensity;
        const tiltSpeed = 3;
        
        group.rotation.z = Math.sin(progress * Math.PI * tiltSpeed) * tiltAmount;
        group.rotation.x = Math.cos(progress * Math.PI * tiltSpeed * 0.7) * tiltAmount * 0.5;
    }
    
    animateDroop(group, progress, intensity) {
        const droopAmount = 0.5 * intensity;
        const droopSpeed = 1;
        
        group.position.y = group.userData.originalY - progress * droopAmount;
        group.rotation.z = progress * droopAmount * 0.5;
        
        const scale = 1 - progress * 0.1 * intensity;
        group.scale.set(scale, scale * 0.8, scale);
    }
    
    animateSlide(group, progress, intensity) {
        const slideDistance = 2.0 * intensity;
        const slideSpeed = 2;
        
        const slideOffset = Math.sin(progress * Math.PI * slideSpeed) * slideDistance;
        group.position.x = group.userData.originalX + slideOffset;
        
        group.rotation.y = progress * Math.PI * 2;
    }
    
    animateSway(group, progress, intensity) {
        const swayAmount = 0.3 * intensity;
        const swaySpeed = 2;
        
        group.rotation.z = Math.sin(progress * Math.PI * swaySpeed) * swayAmount;
        group.position.x = group.userData.originalX + Math.sin(progress * Math.PI * swaySpeed * 0.5) * swayAmount;
    }
    
    animateDefault(group, progress, intensity) {
        const upwardMovement = progress * 0.5 * intensity;
        group.position.y = group.userData.originalY + upwardMovement;
        
        const rotation = progress * Math.PI * 2 * intensity;
        group.rotation.y = rotation;
    }
    
    animateParticles(group, progress, emotionData) {
        const particles = group.children.find(child => child.userData?.isParticleSystem);
        if (!particles) return;
        
        try {
            const positions = particles.geometry.attributes.position.array;
            const originalPositions = particles.userData.originalPositions;
            const velocities = particles.geometry.userData.velocities;
            
            if (!originalPositions) return;
            
            // Apply particle-specific animations based on type
            switch (emotionData.particle) {
                case 'sparkle':
                    this.animateSparkleParticles(positions, originalPositions, velocities, progress);
                    break;
                case 'rain':
                    this.animateRainParticles(positions, originalPositions, velocities, progress);
                    break;
                case 'fire':
                    this.animateFireParticles(positions, originalPositions, velocities, progress);
                    break;
                case 'hearts':
                    this.animateHeartParticles(positions, originalPositions, velocities, progress);
                    break;
                case 'burst':
                    this.animateBurstParticles(positions, originalPositions, velocities, progress);
                    break;
                case 'stars':
                    this.animateStarParticles(positions, originalPositions, velocities, progress);
                    break;
                case 'bubbles':
                    this.animateBubbleParticles(positions, originalPositions, velocities, progress);
                    break;
                case 'question':
                    this.animateQuestionParticles(positions, originalPositions, velocities, progress);
                    break;
                default:
                    this.animateDefaultParticles(positions, originalPositions, velocities, progress);
                    break;
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            
            // Update particle sizes for twinkle effect
            const sizes = particles.geometry.attributes.size.array;
            for (let i = 0; i < sizes.length; i++) {
                sizes[i] = (Math.sin(progress * Math.PI * 10 + i) * 0.5 + 0.5) * 0.8 + 0.2;
            }
            particles.geometry.attributes.size.needsUpdate = true;
            
            // Fade particles
            if (progress > 0.5) {
                const fadeProgress = (progress - 0.5) / 0.5;
                particles.material.opacity = 0.9 * (1 - fadeProgress);
            }
            
        } catch (error) {
            console.error('Error animating particles:', error);
        }
    }
    
    animateSparkleParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const spread = progress * 3;
            const sparkle = Math.sin(progress * Math.PI * 20 + i) * 0.1;
            
            positions[i] = originalPositions[i] * (1 + spread) + sparkle;
            positions[i + 1] = originalPositions[i + 1] + progress * 2 + Math.abs(Math.sin(progress * Math.PI * 10 + i)) * 0.5;
            positions[i + 2] = originalPositions[i + 2] * (1 + spread) + sparkle;
        }
    }
    
    animateRainParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = originalPositions[i] + Math.sin(progress * Math.PI * 2 + i) * 0.1;
            positions[i + 1] = originalPositions[i + 1] - progress * 3;
            positions[i + 2] = originalPositions[i + 2] + Math.cos(progress * Math.PI * 2 + i) * 0.1;
        }
    }
    
    animateFireParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const turbulence = Math.sin(progress * Math.PI * 10 + i) * 0.2;
            
            positions[i] = originalPositions[i] + turbulence + velocities[i] * progress * 10;
            positions[i + 1] = originalPositions[i + 1] + progress * 4 + Math.abs(turbulence);
            positions[i + 2] = originalPositions[i + 2] + turbulence + velocities[i + 2] * progress * 10;
        }
    }
    
    animateHeartParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const float = Math.sin(progress * Math.PI * 2 + i) * 0.3;
            
            positions[i] = originalPositions[i] + float;
            positions[i + 1] = originalPositions[i + 1] + progress * 2 + Math.sin(progress * Math.PI * 4 + i) * 0.2;
            positions[i + 2] = originalPositions[i + 2] + Math.cos(progress * Math.PI * 2 + i) * 0.3;
        }
    }
    
    animateBurstParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const burst = progress * 5;
            
            positions[i] = originalPositions[i] * (1 + burst);
            positions[i + 1] = originalPositions[i + 1] * (1 + burst) + progress * 2;
            positions[i + 2] = originalPositions[i + 2] * (1 + burst);
        }
    }
    
    animateStarParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const twinkle = Math.sin(progress * Math.PI * 15 + i) * 0.1;
            const spread = progress * 2;
            
            positions[i] = originalPositions[i] * (1 + spread) + twinkle;
            positions[i + 1] = originalPositions[i + 1] + progress * 3 + Math.abs(twinkle) * 2;
            positions[i + 2] = originalPositions[i + 2] * (1 + spread) + twinkle;
        }
    }
    
    animateBubbleParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const wobble = Math.sin(progress * Math.PI * 5 + i) * 0.2;
            
            positions[i] = originalPositions[i] + wobble;
            positions[i + 1] = originalPositions[i + 1] + progress * 3;
            positions[i + 2] = originalPositions[i + 2] + Math.cos(progress * Math.PI * 5 + i) * 0.2;
        }
    }
    
    animateQuestionParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const spiral = progress * Math.PI * 4;
            const radius = 1 + progress * 2;
            
            positions[i] = originalPositions[i] + Math.cos(spiral + i) * radius * 0.5;
            positions[i + 1] = originalPositions[i + 1] + progress * 2;
            positions[i + 2] = originalPositions[i + 2] + Math.sin(spiral + i) * radius * 0.5;
        }
    }
    
    animateDefaultParticles(positions, originalPositions, velocities, progress) {
        for (let i = 0; i < positions.length; i += 3) {
            const spread = progress * 2;
            
            positions[i] = originalPositions[i] + velocities[i] * progress * 20;
            positions[i + 1] = originalPositions[i + 1] + velocities[i + 1] * progress * 20;
            positions[i + 2] = originalPositions[i + 2] + velocities[i + 2] * progress * 20;
        }
    }
    
    updateTrail(emotionGroup) {
        const trail = this.emotionTrails.get(emotionGroup);
        if (!trail) return;
        
        const trailData = trail.userData;
        const positions = trail.geometry.attributes.position.array;
        
        // Add current position to trail
        trailData.positions.push(emotionGroup.position.clone());
        
        // Limit trail length
        if (trailData.positions.length > this.config.trailLength) {
            trailData.positions.shift();
        }
        
        // Update trail geometry
        for (let i = 0; i < trailData.positions.length; i++) {
            const pos = trailData.positions[i];
            const i3 = i * 3;
            
            positions[i3] = pos.x;
            positions[i3 + 1] = pos.y;
            positions[i3 + 2] = pos.z;
        }
        
        trail.geometry.attributes.position.needsUpdate = true;
        
        // Fade trail
        const opacity = Math.max(0, 1 - (trailData.positions.length / this.config.trailLength) * 0.5);
        trail.material.opacity = opacity * 0.5;
    }
    
    fadeEmotionGroup(group, opacity) {
        group.children.forEach(child => {
            if (child.material) {
                child.material.opacity = opacity;
            }
        });
    }
    
    playEmotionSound(soundFile) {
        if (!this.config.enableSound || !this.audioContext) return;
        
        try {
            // Simple beep sound as placeholder
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = 440; // A4 note
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
            
        } catch (error) {
            console.warn('Error playing emotion sound:', error);
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
            // Remove trail if exists
            if (this.emotionTrails.has(emotionGroup)) {
                const trail = this.emotionTrails.get(emotionGroup);
                if (trail.geometry) trail.geometry.dispose();
                if (trail.material) trail.material.dispose();
                this.emotionTrails.delete(emotionGroup);
            }
            
            // Remove from scene
            this.emotionContainer.remove(emotionGroup);
            
            // Dispose of resources
            emotionGroup.traverse(child => {
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
                        // Billboard effect - face camera
                        emotion.lookAt(this.camera.position);
                        
                        // Distance-based scaling
                        const distance = emotion.position.distanceTo(this.camera.position);
                        if (distance > this.config.maxDistance) {
                            emotion.visible = false;
                        } else {
                            emotion.visible = true;
                            const scale = Math.max(0.5, Math.min(2, 10 / distance)) * this.config.emotionScale;
                            
                            // Apply scale to sprite only, not entire group
                            const sprite = emotion.children.find(child => child.userData?.isEmojiSprite);
                            if (sprite) {
                                sprite.scale.set(scale, scale, 1);
                            }
                        }
                    }
                });
            });
            
            // Update performance stats
            this.performance.activeEmotions = this.getActiveEmotionCount();
            
        } catch (error) {
            console.error('Error in emotion update:', error);
        }
    }
    
    cleanup() {
        const now = Date.now();
        
        try {
            // Remove old emotions
            this.activeEmotions.forEach((userEmotions, userId) => {
                const emotionsToRemove = userEmotions.filter(emotion => {
                    return now - emotion.userData.createdAt > emotion.userData.duration + 1000;
                });
                
                emotionsToRemove.forEach(emotion => {
                    this.removeEmotion(emotion);
                });
            });
            
            // Clean emotion history
            this.emotionHistory.forEach((history, userId) => {
                const recentHistory = history.filter(entry => {
                    return now - entry.timestamp < 60000; // Keep last minute
                });
                
                if (recentHistory.length === 0) {
                    this.emotionHistory.delete(userId);
                } else {
                    this.emotionHistory.set(userId, recentHistory);
                }
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
            background: rgba(0,0,0,0.9);
            display: flex;
            justify-content: center;
            align-items: flex-start;
            z-index: 10000;
            backdrop-filter: blur(15px);
            animation: fadeIn 0.3s ease;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
            padding: 30px 20px;
            border-radius: 20px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            color: white;
            text-align: center;
            box-shadow: 0 25px 50px rgba(0,0,0,0.7);
            border: 1px solid rgba(255,255,255,0.1);
            animation: slideIn 0.3s ease;
            margin: 20px auto;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        // Detect if mobile
        const isMobile = window.innerWidth <= 768;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #4CAF50; font-size: ${isMobile ? '2em' : '2.5em'}; margin-bottom: 10px;">
                🎭 Express Your Emotion
            </h2>
            <p style="margin-bottom: 20px; color: #aaa; font-size: ${isMobile ? '1em' : '1.1em'};">
                Choose an emotion to share with everyone
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(${isMobile ? '100px' : '140px'}, 1fr)); 
                        gap: ${isMobile ? '10px' : '20px'}; margin-bottom: 30px;">
                ${Object.entries(this.emotions).map(([key, emotion]) => `
                    <div class="emotion-option" data-emotion="${key}" 
                         style="padding: ${isMobile ? '15px 10px' : '25px 15px'}; 
                                background: linear-gradient(145deg, #2a2a2a, #333); 
                                border-radius: 15px; cursor: pointer; 
                                transition: all 0.3s; border: 2px solid transparent;
                                box-shadow: 5px 5px 15px rgba(0,0,0,0.3), -5px -5px 15px rgba(255,255,255,0.05);
                                user-select: none; -webkit-tap-highlight-color: transparent;">
                        <div style="font-size: ${isMobile ? '2.5em' : '3.5em'}; margin-bottom: 5px; 
                                    filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));">
                            ${emotion.emoji}
                        </div>
                        <div style="font-weight: bold; text-transform: capitalize; font-size: ${isMobile ? '0.9em' : '1.1em'};">
                            ${key}
                        </div>
                        ${!isMobile ? `<div style="font-size: 0.9em; color: #666; margin-top: 5px;">
                            ${emotion.particleEmoji}
                        </div>` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                <button id="cancel-emotion" 
                        style="padding: ${isMobile ? '12px 25px' : '15px 30px'}; 
                               background: #555; border: none; border-radius: 10px; 
                               color: white; cursor: pointer; font-size: ${isMobile ? '1em' : '1.1em'}; 
                               transition: all 0.3s; -webkit-tap-highlight-color: transparent;">
                    Cancel
                </button>
                <button id="random-emotion" 
                        style="padding: ${isMobile ? '12px 25px' : '15px 30px'}; 
                               background: linear-gradient(45deg, #4CAF50, #45a049); 
                               border: none; border-radius: 10px; 
                               color: white; cursor: pointer; font-size: ${isMobile ? '1em' : '1.1em'}; 
                               transition: all 0.3s; -webkit-tap-highlight-color: transparent;">
                    🎲 Random
                </button>
            </div>
            
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .emotion-option:hover {
                    transform: translateY(-3px) scale(1.02) !important;
                    box-shadow: 8px 8px 20px rgba(0,0,0,0.4), -8px -8px 20px rgba(255,255,255,0.1) !important;
                }
                .emotion-option:active {
                    transform: translateY(-1px) scale(0.98) !important;
                }
                button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                button:active {
                    transform: translateY(0);
                }
                /* Mobile touch feedback */
                @media (max-width: 768px) {
                    .emotion-option:active {
                        background: linear-gradient(145deg, #444, #555) !important;
                    }
                }
            </style>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Add event listeners
        const emotionOptions = content.querySelectorAll('.emotion-option');
        emotionOptions.forEach(option => {
            const emotionKey = option.dataset.emotion;
            const emotionData = this.emotions[emotionKey];
            
            // Desktop hover effects
            if (!isMobile) {
                option.addEventListener('mouseenter', () => {
                    option.style.background = `linear-gradient(145deg, #333, #444)`;
                    option.style.borderColor = `#${emotionData.color.toString(16).padStart(6, '0')}`;
                    option.style.boxShadow = `0 0 20px rgba(${(emotionData.color >> 16) & 255}, ${(emotionData.color >> 8) & 255}, ${emotionData.color & 255}, 0.5)`;
                });
                
                option.addEventListener('mouseleave', () => {
                    option.style.background = 'linear-gradient(145deg, #2a2a2a, #333)';
                    option.style.borderColor = 'transparent';
                    option.style.boxShadow = '5px 5px 15px rgba(0,0,0,0.3), -5px -5px 15px rgba(255,255,255,0.05)';
                });
            }
            
            option.addEventListener('click', () => {
                this.triggerEmotion(emotionKey);
                document.body.removeChild(modal);
            });
        });
        
        // Cancel button
        const cancelButton = content.querySelector('#cancel-emotion');
        cancelButton.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Random button
        const randomButton = content.querySelector('#random-emotion');
        randomButton.addEventListener('click', () => {
            const emotionKeys = Object.keys(this.emotions);
            const randomEmotion = emotionKeys[Math.floor(Math.random() * emotionKeys.length)];
            this.triggerEmotion(randomEmotion);
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
        
        // Prevent body scroll on mobile when modal is open
        if (isMobile) {
            document.body.style.overflow = 'hidden';
            modal.addEventListener('touchmove', (e) => {
                if (e.target === modal) {
                    e.preventDefault();
                }
            });
            
            // Re-enable body scroll when modal closes
            const originalRemoveChild = document.body.removeChild;
            document.body.removeChild = function(child) {
                if (child === modal) {
                    document.body.style.overflow = '';
                }
                return originalRemoveChild.call(this, child);
            };
        }
    }
    
    updateEmotionPositions(userId, newPosition) {
        if (!this.activeEmotions.has(userId)) return;
        
        try {
            const userEmotions = this.activeEmotions.get(userId);
            userEmotions.forEach(emotion => {
                const emotionPosition = newPosition.clone();
                emotionPosition.y += this.config.yOffset;
                
                // Update stored original position
                emotion.userData.originalX = emotionPosition.x;
                emotion.userData.originalY = emotionPosition.y;
                emotion.userData.originalZ = emotionPosition.z;
                
                // Let animation handle actual position
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
            trackedUsers: this.activeEmotions.size,
            emotionHistory: this.emotionHistory.size,
            trails: this.emotionTrails.size
        };
    }
    
    // Get emotion history for analytics
    getEmotionHistory(userId = null) {
        if (userId) {
            return this.emotionHistory.get(userId) || [];
        }
        
        // Return all history
        const allHistory = [];
        this.emotionHistory.forEach((history, uid) => {
            history.forEach(entry => {
                allHistory.push({
                    userId: uid,
                    ...entry
                });
            });
        });
        
        return allHistory.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    // Get most popular emotions
    getMostPopularEmotions(limit = 5) {
        const emotionCounts = {};
        
        this.emotionHistory.forEach(history => {
            history.forEach(entry => {
                emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
            });
        });
        
        return Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([emotion, count]) => ({ emotion, count }));
    }
    
    // Test specific emotion
    testEmotion(emotion = 'happy') {
        console.log(`🧪 Testing emotion: ${emotion}`);
        return this.triggerEmotion(emotion);
    }
    
    // Debug method to inspect current state
    debug() {
        console.group('🎭 Emotion System Debug Info');
        console.log('Initialized:', this.isInitialized);
        console.log('Active Emotions:', this.getActiveEmotionCount());
        console.log('Tracked Users:', this.activeEmotions.size);
        console.log('Performance:', this.getPerformanceStats());
        console.log('Config:', this.config);
        console.log('Available Emotions:', Object.keys(this.emotions));
        console.log('Most Popular:', this.getMostPopularEmotions());
        console.groupEnd();
    }
    
    dispose() {
        try {
            // Clear all emotions
            this.clearAllEmotions();
            
            // Remove event listeners
            window.removeEventListener('resize', this.handleResize);
            
            // Remove emotion container
            if (this.emotionContainer && this.scene) {
                this.scene.remove(this.emotionContainer);
            }
            
            // Clear all maps
            this.activeEmotions.clear();
            this.emotionHistory.clear();
            this.emotionParticles.clear();
            this.emotionCombos.clear();
            this.emotionTrails.clear();
            
            // Close audio context
            if (this.audioContext) {
                this.audioContext.close();
            }
            
            console.log('🎭 Emotion System disposed');
        } catch (error) {
            console.error('Error disposing Emotion System:', error);
        }
    }
}

// Create and export the system
window.EmotionSystem = new EuphorieEmotionSystem();

// Auto-initialize when scene is ready
if (window.SceneManager?.scene) {
    window.EmotionSystem.init();
} else {
    // Wait for scene to be ready
    const checkScene = setInterval(() => {
        if (window.SceneManager?.scene) {
            clearInterval(checkScene);
            window.EmotionSystem.init();
        }
    }, 100);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EuphorieEmotionSystem;
}

// Add global shortcut function
window.showEmotion = (emotion) => window.EmotionSystem.triggerEmotion(emotion);
window.showEmotionPanel = () => window.EmotionSystem.showEmotionPanel();

console.log('✅ Enhanced Emotion System loaded successfully');
console.log('🎭 Available emotions:', Object.keys(window.EmotionSystem.emotions).join(', '));
console.log('🧪 Test with: window.EmotionSystem.testEmotion("happy")');
console.log('📊 Debug with: window.EmotionSystem.debug()');
console.log('🎨 Show panel: Ctrl+E or window.showEmotionPanel()');