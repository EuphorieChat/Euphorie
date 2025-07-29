// Avatar Emotion System - Enhanced with inline template integration
// 12 emotions with facial expressions, effects, and simplified UI

window.EmotionSystem = {
    isInitialized: false,
    activeEmotions: new Map(), // userId -> emotionState
    emotionQueue: new Map(),   // userId -> emotion queue
    particleSystem: null,
    
    // 12 core emotions with their properties
    emotions: {
        happy: {
            name: 'Happy',
            icon: '😊',
            color: '#FFD700',
            intensity: 1.0,
            duration: 5000,
            facialExpression: {
                eyeScale: 1.1,
                mouthCurve: 0.8,
                eyebrowPosition: 0.1
            },
            bodyLanguage: {
                shoulderPosition: 0.1,
                headTilt: 0.05,
                bounceAnimation: true
            },
            particles: {
                type: 'sparkles',
                color: '#FFD700',
                count: 20,
                lifetime: 2000
            },
            sound: 'happy_chime'
        },
        
        sad: {
            name: 'Sad',
            icon: '😢',
            color: '#4169E1',
            intensity: 1.0,
            duration: 6000,
            facialExpression: {
                eyeScale: 0.8,
                mouthCurve: -0.6,
                eyebrowPosition: -0.2
            },
            bodyLanguage: {
                shoulderPosition: -0.2,
                headTilt: -0.1,
                slumpAnimation: true
            },
            particles: {
                type: 'teardrops',
                color: '#87CEEB',
                count: 8,
                lifetime: 3000
            },
            sound: 'sad_note'
        },
        
        excited: {
            name: 'Excited',
            icon: '🤩',
            color: '#FF6347',
            intensity: 1.2,
            duration: 4000,
            facialExpression: {
                eyeScale: 1.3,
                mouthCurve: 1.0,
                eyebrowPosition: 0.3
            },
            bodyLanguage: {
                shoulderPosition: 0.2,
                headTilt: 0.1,
                jumpAnimation: true
            },
            particles: {
                type: 'fireworks',
                color: '#FF6347',
                count: 30,
                lifetime: 1500
            },
            sound: 'excited_burst'
        },
        
        angry: {
            name: 'Angry',
            icon: '😠',
            color: '#DC143C',
            intensity: 1.1,
            duration: 5000,
            facialExpression: {
                eyeScale: 0.9,
                mouthCurve: -0.8,
                eyebrowPosition: -0.3
            },
            bodyLanguage: {
                shoulderPosition: 0.3,
                headTilt: 0,
                tensionAnimation: true
            },
            particles: {
                type: 'steam',
                color: '#DC143C',
                count: 15,
                lifetime: 2500
            },
            sound: 'angry_growl'
        },
        
        love: {
            name: 'Love',
            icon: '😍',
            color: '#FF69B4',
            intensity: 1.0,
            duration: 7000,
            facialExpression: {
                eyeScale: 1.2,
                mouthCurve: 0.9,
                eyebrowPosition: 0.1
            },
            bodyLanguage: {
                shoulderPosition: 0.1,
                headTilt: 0.1,
                swayAnimation: true
            },
            particles: {
                type: 'hearts',
                color: '#FF69B4',
                count: 25,
                lifetime: 4000
            },
            sound: 'love_melody'
        },
        
        surprised: {
            name: 'Surprised',
            icon: '😲',
            color: '#FFA500',
            intensity: 1.0,
            duration: 3000,
            facialExpression: {
                eyeScale: 1.4,
                mouthCurve: 0.3,
                eyebrowPosition: 0.4
            },
            bodyLanguage: {
                shoulderPosition: 0.1,
                headTilt: 0.05,
                startleAnimation: true
            },
            particles: {
                type: 'exclamation',
                color: '#FFA500',
                count: 10,
                lifetime: 2000
            },
            sound: 'surprise_gasp'
        },
        
        confused: {
            name: 'Confused',
            icon: '😕',
            color: '#9370DB',
            intensity: 0.8,
            duration: 4000,
            facialExpression: {
                eyeScale: 1.0,
                mouthCurve: -0.2,
                eyebrowPosition: 0.2
            },
            bodyLanguage: {
                shoulderPosition: 0.05,
                headTilt: 0.15,
                scratchAnimation: true
            },
            particles: {
                type: 'question_marks',
                color: '#9370DB',
                count: 8,
                lifetime: 3000
            },
            sound: 'confused_hmm'
        },
        
        tired: {
            name: 'Tired',
            icon: '😴',
            color: '#708090',
            intensity: 0.6,
            duration: 8000,
            facialExpression: {
                eyeScale: 0.7,
                mouthCurve: -0.1,
                eyebrowPosition: -0.1
            },
            bodyLanguage: {
                shoulderPosition: -0.2,
                headTilt: -0.1,
                yawnAnimation: true
            },
            particles: {
                type: 'zzz',
                color: '#708090',
                count: 6,
                lifetime: 5000
            },
            sound: 'tired_yawn'
        },
        
        laughing: {
            name: 'Laughing',
            icon: '😂',
            color: '#32CD32',
            intensity: 1.3,
            duration: 4000,
            facialExpression: {
                eyeScale: 0.9,
                mouthCurve: 1.2,
                eyebrowPosition: 0.2
            },
            bodyLanguage: {
                shoulderPosition: 0.2,
                headTilt: 0.1,
                laughAnimation: true
            },
            particles: {
                type: 'laughter_bubbles',
                color: '#32CD32',
                count: 20,
                lifetime: 2000
            },
            sound: 'laugh_burst'
        },
        
        nervous: {
            name: 'Nervous',
            icon: '😰',
            color: '#20B2AA',
            intensity: 0.9,
            duration: 5000,
            facialExpression: {
                eyeScale: 1.1,
                mouthCurve: -0.3,
                eyebrowPosition: 0.1
            },
            bodyLanguage: {
                shoulderPosition: 0.1,
                headTilt: 0.05,
                fidgetAnimation: true
            },
            particles: {
                type: 'sweat_drops',
                color: '#20B2AA',
                count: 12,
                lifetime: 3000
            },
            sound: 'nervous_gulp'
        },
        
        cool: {
            name: 'Cool',
            icon: '😎',
            color: '#4682B4',
            intensity: 1.0,
            duration: 6000,
            facialExpression: {
                eyeScale: 0.9,
                mouthCurve: 0.4,
                eyebrowPosition: -0.1
            },
            bodyLanguage: {
                shoulderPosition: 0.0,
                headTilt: -0.05,
                coolAnimation: true
            },
            particles: {
                type: 'cool_sparkles',
                color: '#4682B4',
                count: 15,
                lifetime: 4000
            },
            sound: 'cool_snap'
        },
        
        playful: {
            name: 'Playful',
            icon: '😜',
            color: '#FF1493',
            intensity: 1.1,
            duration: 4500,
            facialExpression: {
                eyeScale: 1.2,
                mouthCurve: 0.8,
                eyebrowPosition: 0.2
            },
            bodyLanguage: {
                shoulderPosition: 0.15,
                headTilt: 0.1,
                playAnimation: true
            },
            particles: {
                type: 'rainbow_sparkles',
                color: '#FF1493',
                count: 25,
                lifetime: 2500
            },
            sound: 'playful_chime'
        }
    },
    
    init: function() {
        if (this.isInitialized) return;
        
        console.log('🎭 Initializing Enhanced Emotion System...');
        
        // Initialize particle system
        this.initParticleSystem();
        
        // Set up emotion UI (with inline template enhancements)
        this.createEmotionUI();
        
        // Set up automatic emotion detection
        this.setupEmotionDetection();
        
        // Register with other systems
        this.registerSystemIntegration();
        
        this.isInitialized = true;
        console.log('✅ Enhanced Emotion System initialized with', Object.keys(this.emotions).length, 'emotions');
    },
    
    initParticleSystem: function() {
        // Create particle system for emotion effects
        this.particleSystem = {
            particles: [],
            maxParticles: 1000,
            
            addParticle: function(type, position, config) {
                if (this.particles.length >= this.maxParticles) {
                    this.particles.shift(); // Remove oldest particle
                }
                
                const particle = {
                    id: Math.random().toString(36).substr(2, 9),
                    type: type,
                    position: position.clone(),
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        Math.random() * 2 + 1,
                        (Math.random() - 0.5) * 2
                    ),
                    color: config.color,
                    life: config.lifetime,
                    maxLife: config.lifetime,
                    size: 0.1 + Math.random() * 0.1,
                    rotation: Math.random() * Math.PI * 2
                };
                
                this.particles.push(particle);
                return particle;
            },
            
            update: function(deltaTime) {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const particle = this.particles[i];
                    
                    // Update particle life
                    particle.life -= deltaTime;
                    if (particle.life <= 0) {
                        this.particles.splice(i, 1);
                        continue;
                    }
                    
                    // Update position
                    particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime / 1000));
                    
                    // Apply gravity for certain particle types
                    if (['teardrops', 'sweat_drops'].includes(particle.type)) {
                        particle.velocity.y -= 9.8 * deltaTime / 1000;
                    }
                    
                    // Fade out
                    particle.alpha = particle.life / particle.maxLife;
                }
            }
        };
        
        console.log('✨ Particle system initialized');
    },
    
    createEmotionUI: function() {
        // Enhanced emotion panel with inline template styling
        const emotionPanel = document.createElement('div');
        emotionPanel.id = 'emotion-panel';
        emotionPanel.className = 'emotion-panel';
        emotionPanel.innerHTML = `
            <div class="emotion-header">
                <h3>🎭 Choose Your Emotion</h3>
                <button id="emotion-panel-close" class="close-btn">×</button>
            </div>
            <div class="emotion-grid">
                ${Object.entries(this.emotions).map(([key, emotion]) => `
                    <button class="emotion-btn" data-emotion="${key}" title="${emotion.name}">
                        <span class="emotion-icon">${emotion.icon}</span>
                        <span class="emotion-name">${emotion.name}</span>
                    </button>
                `).join('')}
            </div>
            <div class="emotion-intensity">
                <label for="emotion-intensity-slider">Intensity:</label>
                <input type="range" id="emotion-intensity-slider" min="0.5" max="2.0" step="0.1" value="1.0">
                <span id="emotion-intensity-value">1.0</span>
            </div>
        `;
        
        document.body.appendChild(emotionPanel);
        
        // Add enhanced emotion styles (combining both systems)
        this.addEnhancedEmotionStyles();
        
        // Set up event listeners
        this.setupEmotionUIListeners();
        
        console.log('🎨 Enhanced Emotion UI created');
    },
    
    addEnhancedEmotionStyles: function() {
        // Check if styles already exist
        if (document.getElementById('emotion-system-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'emotion-system-styles';
        style.textContent = `
            /* Enhanced Emotion Panel Styles */
            .emotion-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(30, 30, 45, 0.95) 100%);
                backdrop-filter: blur(25px);
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                padding: 25px;
                z-index: 1500;
                display: none;
                min-width: 350px;
                max-width: 450px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 
                            0 0 0 1px rgba(255, 255, 255, 0.05);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .emotion-panel.active {
                display: block;
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }

            /* Enhanced Header */
            .emotion-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .emotion-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                background: linear-gradient(45deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            /* Enhanced Close Button */
            .close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .close-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transform: translateX(-100%);
                transition: transform 0.6s ease;
            }

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.4);
                transform: scale(1.1);
                box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
            }

            .close-btn:hover::before {
                transform: translateX(100%);
            }

            /* Enhanced Emotion Grid */
            .emotion-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin-bottom: 25px;
            }

            /* Enhanced Emotion Buttons */
            .emotion-btn {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-radius: 12px;
                padding: 16px 12px;
                cursor: pointer;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                color: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                min-height: 90px;
                position: relative;
                overflow: hidden;
                transform-style: preserve-3d;
            }

            .emotion-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                transform: translateX(-100%) rotateZ(25deg);
                transition: transform 0.6s ease;
                pointer-events: none;
            }

            .emotion-btn:hover {
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
                border-color: rgba(255, 255, 255, 0.3);
                transform: translateY(-4px) rotateX(5deg);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 
                            0 0 20px rgba(255, 255, 255, 0.1);
            }

            .emotion-btn:hover::before {
                transform: translateX(100%) rotateZ(25deg);
            }

            .emotion-btn.active {
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%);
                border-color: rgba(102, 126, 234, 0.6);
                transform: translateY(-2px) scale(1.05);
                box-shadow: 0 15px 30px rgba(102, 126, 234, 0.3), 
                            0 0 25px rgba(102, 126, 234, 0.2);
            }

            .emotion-btn:active {
                transform: translateY(-1px) scale(0.98);
            }

            /* Enhanced Emotion Icons */
            .emotion-icon {
                font-size: 28px;
                display: block;
                transition: transform 0.3s ease;
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            }

            .emotion-btn:hover .emotion-icon {
                transform: scale(1.2) rotateZ(5deg);
            }

            .emotion-btn.active .emotion-icon {
                transform: scale(1.15);
                animation: emotionPulse 2s infinite;
            }

            @keyframes emotionPulse {
                0%, 100% { transform: scale(1.15); }
                50% { transform: scale(1.25); }
            }

            /* Enhanced Emotion Names */
            .emotion-name {
                font-size: 13px;
                font-weight: 600;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                opacity: 0.9;
                transition: opacity 0.3s ease;
            }

            .emotion-btn:hover .emotion-name {
                opacity: 1;
            }

            /* Enhanced Intensity Control */
            .emotion-intensity {
                display: flex;
                align-items: center;
                gap: 12px;
                color: white;
                font-size: 14px;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .emotion-intensity label {
                min-width: 70px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.9);
            }

            #emotion-intensity-slider {
                flex: 1;
                height: 8px;
                border-radius: 4px;
                background: linear-gradient(to right, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.3));
                outline: none;
                cursor: pointer;
                -webkit-appearance: none;
                appearance: none;
                transition: all 0.3s ease;
            }

            #emotion-intensity-slider::-webkit-slider-thumb {
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: linear-gradient(45deg, #667eea, #764ba2);
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            }

            #emotion-intensity-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }

            #emotion-intensity-value {
                min-width: 35px;
                text-align: right;
                font-weight: 700;
                font-size: 16px;
                color: #667eea;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .emotion-panel {
                    min-width: 300px;
                    max-width: 90vw;
                    padding: 20px;
                    margin: 10px;
                }
                
                .emotion-grid {
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }
                
                .emotion-btn {
                    padding: 14px 10px;
                    min-height: 80px;
                }
                
                .emotion-icon {
                    font-size: 24px;
                }
                
                .emotion-name {
                    font-size: 12px;
                }
            }

            @media (max-width: 480px) {
                .emotion-panel {
                    min-width: 280px;
                    padding: 15px;
                }
                
                .emotion-header h3 {
                    font-size: 18px;
                }
                
                .emotion-btn {
                    padding: 12px 8px;
                    min-height: 70px;
                }
                
                .emotion-icon {
                    font-size: 20px;
                }
                
                .emotion-intensity {
                    font-size: 13px;
                    padding: 12px;
                }
            }

            /* Accessibility */
            .emotion-btn:focus,
            .close-btn:focus,
            #emotion-intensity-slider:focus {
                outline: 2px solid #667eea;
                outline-offset: 2px;
            }

            /* Notification Styles */
            .emotion-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
                color: white;
                padding: 15px 20px;
                border-radius: 12px;
                z-index: 2000;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
                font-weight: 600;
                animation: slideInRight 0.3s ease;
            }

            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
        `;
        
        document.head.appendChild(style);
        console.log('💄 Enhanced emotion styles added');
    },
    
    setupEmotionUIListeners: function() {
        // Close button
        document.getElementById('emotion-panel-close').addEventListener('click', () => {
            this.hideEmotionPanel();
        });
        
        // Emotion buttons with enhanced feedback
        document.querySelectorAll('.emotion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emotionKey = btn.dataset.emotion;
                const intensity = parseFloat(document.getElementById('emotion-intensity-slider').value);
                
                // Enhanced visual feedback
                document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show immediate feedback
                this.showNotification(`You're feeling ${this.emotions[emotionKey].name}! ${this.emotions[emotionKey].icon}`);
                
                // Trigger emotion
                this.triggerEmotion(this.getCurrentUserId(), emotionKey, intensity);
                
                // Close panel after selection
                setTimeout(() => {
                    this.hideEmotionPanel();
                }, 500);
            });
        });
        
        // Intensity slider with real-time preview
        const intensitySlider = document.getElementById('emotion-intensity-slider');
        const intensityValue = document.getElementById('emotion-intensity-value');
        
        intensitySlider.addEventListener('input', (e) => {
            intensityValue.textContent = e.target.value;
            
            // Optional: Preview intensity with visual feedback
            const value = parseFloat(e.target.value);
            const scale = 0.9 + (value - 0.5) * 0.2; // Scale between 0.9 and 1.3
            document.querySelectorAll('.emotion-icon').forEach(icon => {
                icon.style.transform = `scale(${scale})`;
            });
        });
        
        // Reset icon scales when slider interaction ends
        intensitySlider.addEventListener('mouseup', () => {
            document.querySelectorAll('.emotion-icon').forEach(icon => {
                icon.style.transform = '';
            });
        });
        
        // Click outside to close (enhanced)
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('emotion-panel');
            if (panel && panel.classList.contains('active') && !panel.contains(e.target)) {
                // Check if click was on the emotion trigger button
                const emotionTrigger = e.target.closest('[data-action="emotions"]') || 
                                     e.target.closest('#emotions-control') ||
                                     e.target.closest('.emotion-control-btn');
                if (!emotionTrigger) {
                    this.hideEmotionPanel();
                }
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const panel = document.getElementById('emotion-panel');
            if (panel && panel.classList.contains('active')) {
                if (e.key === 'Escape') {
                    this.hideEmotionPanel();
                }
                
                // Number keys for quick emotion selection
                const emotionKeys = Object.keys(this.emotions);
                const keyNum = parseInt(e.key);
                if (keyNum >= 1 && keyNum <= emotionKeys.length) {
                    const emotionKey = emotionKeys[keyNum - 1];
                    const intensity = parseFloat(document.getElementById('emotion-intensity-slider').value);
                    this.triggerEmotion(this.getCurrentUserId(), emotionKey, intensity);
                    this.hideEmotionPanel();
                }
            }
        });
    },
    
    showEmotionPanel: function() {
        // Remove any existing panel first
        const existing = document.getElementById('simple-emotion-panel');
        if (existing) existing.remove();
        
        const panel = document.getElementById('emotion-panel');
        if (panel) {
            panel.classList.add('active');
            
            // Reset any active selections
            document.querySelectorAll('.emotion-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Reset intensity slider
            const slider = document.getElementById('emotion-intensity-slider');
            const value = document.getElementById('emotion-intensity-value');
            if (slider && value) {
                slider.value = '1.0';
                value.textContent = '1.0';
            }
            
            console.log('🎭 Enhanced emotion panel opened');
        } else {
            console.warn('Emotion panel not found, falling back to simple version');
            this.showSimpleEmotionPanel();
        }
    },
    
    showSimpleEmotionPanel: function() {
        // Fallback to simple inline-style panel
        console.log('🎭 Opening simple emotion panel...');
        
        // Remove existing panel if any
        const existing = document.getElementById('simple-emotion-panel');
        if (existing) existing.remove();
        
        // Create simple emotion panel (inline template style)
        const panel = document.createElement('div');
        panel.id = 'simple-emotion-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(20, 20, 30, 0.95);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 15px;
            padding: 25px;
            z-index: 1500;
            color: white;
            min-width: 300px;
            text-align: center;
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;
        
        // Get top 6 emotions for simple display
        const topEmotions = ['happy', 'love', 'excited', 'sad', 'angry', 'laughing'];
        
        panel.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #667eea;">🎭 Choose Your Emotion</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                ${topEmotions.map(key => {
                    const emotion = this.emotions[key];
                    return `<button onclick="window.EmotionSystem.triggerEmotion('${this.getCurrentUserId()}', '${key}', 1.0)" style="padding: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; color: white; cursor: pointer; font-size: 14px; transition: all 0.3s ease;">${emotion.icon}<br>${emotion.name}</button>`;
                }).join('')}
            </div>
            <button onclick="window.EmotionSystem.hideEmotionPanel()" style="padding: 10px 20px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(panel);
        
        // Add hover effects
        panel.querySelectorAll('button').forEach(btn => {
            if (btn.onclick && btn.onclick.toString().includes('triggerEmotion')) {
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'rgba(255,255,255,0.2)';
                    btn.style.transform = 'translateY(-2px)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'rgba(255,255,255,0.1)';
                    btn.style.transform = 'translateY(0)';
                });
            }
        });
        
        // Add click outside to close
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!panel.contains(e.target)) {
                    this.hideEmotionPanel();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    },
    
    hideEmotionPanel: function() {
        // Hide main panel
        const panel = document.getElementById('emotion-panel');
        if (panel) {
            panel.classList.remove('active');
        }
        
        // Hide simple panel
        const simplePanel = document.getElementById('simple-emotion-panel');
        if (simplePanel) {
            simplePanel.remove();
        }
        
        console.log('🎭 Emotion panel closed');
    },
    
    triggerEmotion: function(userId, emotionKey, intensity = 1.0) {
        if (!this.emotions[emotionKey]) {
            console.warn('Unknown emotion:', emotionKey);
            return;
        }
        
        const emotion = this.emotions[emotionKey];
        const emotionState = {
            emotion: emotionKey,
            intensity: intensity,
            startTime: Date.now(),
            duration: emotion.duration * intensity, // Scale duration with intensity
            isActive: true
        };
        
        // Store active emotion
        this.activeEmotions.set(userId, emotionState);
        
        console.log(`🎭 Triggering emotion: ${emotion.name} (${intensity}x) for user ${userId}`);
        
        // Apply visual effects
        this.applyEmotionEffects(userId, emotion, intensity);
        
        // Create particle effects
        this.createEmotionParticles(userId, emotion, intensity);
        
        // Play sound effect
        this.playEmotionSound(emotion);
        
        // Broadcast to other users
        this.broadcastEmotion(userId, emotionKey, intensity);
        
        // Set up automatic cleanup
        setTimeout(() => {
            this.clearEmotion(userId);
        }, emotionState.duration);
        
        // Trigger event for other systems
        if (window.EventBus) {
            window.EventBus.emit('emotionTriggered', {
                userId,
                emotion: emotionKey,
                intensity,
                duration: emotionState.duration
            });
        }
    },
    
    showNotification: function(message) {
        // Enhanced notification system
        const notification = document.createElement('div');
        notification.className = 'emotion-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds with animation
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    // Include all other methods from the original system...
    applyEmotionEffects: function(userId, emotion, intensity) {
        const avatar = this.getAvatarByUserId(userId);
        if (!avatar) return;
        
        this.applyFacialExpression(avatar, emotion.facialExpression, intensity);
        this.applyBodyLanguage(avatar, emotion.bodyLanguage, intensity);
        this.applyColorEffects(avatar, emotion.color, intensity);
        
        console.log(`✨ Applied emotion effects for ${emotion.name}`);
    },
    
    applyFacialExpression: function(avatar, expression, intensity) {
        if (avatar.head) {
            if (avatar.head.eyes) {
                const eyeScale = 1 + (expression.eyeScale - 1) * intensity;
                avatar.head.eyes.scale.setScalar(eyeScale);
            }
            
            if (avatar.head.mouth) {
                const mouthCurve = expression.mouthCurve * intensity;
                avatar.head.mouth.userData.curve = mouthCurve;
            }
            
            if (avatar.head.eyebrows) {
                const eyebrowOffset = expression.eyebrowPosition * intensity;
                avatar.head.eyebrows.position.y += eyebrowOffset;
            }
        }
    },
    
    applyBodyLanguage: function(avatar, bodyLang, intensity) {
        if (avatar.torso && avatar.torso.shoulders) {
            const shoulderOffset = bodyLang.shoulderPosition * intensity;
            avatar.torso.shoulders.rotation.z = shoulderOffset;
        }
        
        if (avatar.head) {
            const headTilt = bodyLang.headTilt * intensity;
            avatar.head.rotation.z = headTilt;
        }
        
        this.triggerEmotionAnimation(avatar, bodyLang, intensity);
    },
    
    triggerEmotionAnimation: function(avatar, bodyLang, intensity) {
        // Simplified animation triggers
        Object.keys(bodyLang).forEach(key => {
            if (bodyLang[key] === true) {
                console.log(`🎬 Triggering ${key} animation (${intensity}x)`);
                // Animation implementations would go here
            }
        });
    },
    
    applyColorEffects: function(avatar, color, intensity) {
        if (!avatar.material) return;
        
        const originalColor = avatar.material.color.clone();
        const emotionColor = new THREE.Color(color);
        
        const blendFactor = Math.min(intensity * 0.3, 0.5);
        avatar.material.color.lerpColors(originalColor, emotionColor, blendFactor);
        
        if (avatar.material.emissive) {
            avatar.material.emissive.copy(emotionColor);
            avatar.material.emissiveIntensity = intensity * 0.1;
        }
        
        avatar.userData.originalColor = originalColor;
    },
    
    createEmotionParticles: function(userId, emotion, intensity) {
        const avatar = this.getAvatarByUserId(userId);
        if (!avatar || !this.particleSystem) return;
        
        const particleConfig = emotion.particles;
        const particleCount = Math.floor(particleConfig.count * intensity);
        
        const headPosition = avatar.position.clone();
        headPosition.y += 1.8;
        
        for (let i = 0; i < particleCount; i++) {
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.5
            );
            
            const particlePos = headPosition.clone().add(offset);
            
            this.particleSystem.addParticle(
                particleConfig.type,
                particlePos,
                {
                    color: particleConfig.color,
                    lifetime: particleConfig.lifetime * intensity
                }
            );
        }
        
        console.log(`✨ Created ${particleCount} ${particleConfig.type} particles`);
    },
    
    playEmotionSound: function(emotion) {
        if (!window.AudioSystem || !emotion.sound) return;
        
        try {
            window.AudioSystem.playSound(emotion.sound, {
                volume: 0.3,
                category: 'emotion'
            });
        } catch (error) {
            console.log('🔇 Audio system not available for emotion sounds');
        }
    },
    
    broadcastEmotion: function(userId, emotionKey, intensity) {
        if (!window.WebSocketManager) return;
        
        const emotionData = {
            type: 'emotion',
            userId: userId,
            emotion: emotionKey,
            intensity: intensity,
            timestamp: Date.now()
        };
        
        window.WebSocketManager.send(emotionData);
        console.log(`📡 Broadcasted emotion ${emotionKey} for user ${userId}`);
    },
    
    clearEmotion: function(userId) {
        const emotionState = this.activeEmotions.get(userId);
        if (!emotionState) return;
        
        const avatar = this.getAvatarByUserId(userId);
        if (avatar) {
            this.restoreAvatarAppearance(avatar);
        }
        
        this.activeEmotions.delete(userId);
        console.log(`🎭 Cleared emotion for user ${userId}`);
    },
    
    restoreAvatarAppearance: function(avatar) {
        if (avatar.userData.originalColor) {
            avatar.material.color.copy(avatar.userData.originalColor);
            if (avatar.material.emissive) {
                avatar.material.emissive.setHex(0x000000);
                avatar.material.emissiveIntensity = 0;
            }
        }
        
        if (avatar.head) {
            if (avatar.head.eyes) {
                avatar.head.eyes.scale.setScalar(1);
            }
            if (avatar.head.eyebrows) {
                avatar.head.eyebrows.position.y = 0;
            }
            avatar.head.rotation.z = 0;
        }
        
        if (avatar.torso && avatar.torso.shoulders) {
            avatar.torso.shoulders.rotation.z = 0;
        }
    },
    
    setupEmotionDetection: function() {
        if (window.EventBus) {
            window.EventBus.on('messageReceived', (data) => {
                const detectedEmotion = this.detectEmotionFromText(data.message);
                if (detectedEmotion) {
                    this.triggerEmotion(data.userId, detectedEmotion, 0.6);
                }
            });
        }
    },
    
    detectEmotionFromText: function(text) {
        const emotionKeywords = {
            happy: ['happy', 'joy', 'glad', 'wonderful', 'amazing', '😊', '😄', '🙂'],
            sad: ['sad', 'disappointed', 'upset', 'crying', '😢', '😭', '☹️'],
            excited: ['excited', 'thrilled', 'awesome', 'fantastic', '🤩', '🎉'],
            angry: ['angry', 'mad', 'furious', 'annoyed', '😠', '😡'],
            love: ['love', 'adore', 'wonderful', 'beautiful', '❤️', '😍', '🥰'],
            surprised: ['wow', 'surprising', 'unexpected', 'amazing', '😲', '😮'],
            laughing: ['haha', 'lol', 'funny', 'hilarious', '😂', '🤣'],
            confused: ['confused', 'what', 'huh', 'unclear', '😕', '🤔'],
            tired: ['tired', 'sleepy', 'exhausted', 'yawn', '😴', '😪'],
            cool: ['cool', 'awesome', 'nice', 'sweet', '😎'],
            playful: ['fun', 'playful', 'silly', 'game', '😜', '🤪']
        };
        
        const lowerText = text.toLowerCase();
        
        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            if (keywords.some(keyword => lowerText.includes(keyword))) {
                return emotion;
            }
        }
        
        return null;
    },
    
    registerSystemIntegration: function() {
        if (window.RoomCore) {
            window.RoomCore.registerSystem('emotions', this);
        }
        
        this.addEmotionButton();
    },
    
    addEmotionButton: function() {
        // Enhanced emotion button integration
        const emotionBtn = document.getElementById('emotions-control');
        if (emotionBtn) {
            emotionBtn.addEventListener('click', () => {
                this.showEmotionPanel();
            });
            console.log('✅ Enhanced emotion button handler added');
        } else {
            // Try to add to controls panel
            const controlsPanel = document.getElementById('controls-panel');
            if (controlsPanel) {
                const newBtn = document.createElement('button');
                newBtn.id = 'emotions-control';
                newBtn.className = 'control-btn emotion-control-btn';
                newBtn.innerHTML = '🎭 Emotions';
                newBtn.title = 'Show emotion panel (E)';
                
                newBtn.addEventListener('click', () => {
                    this.showEmotionPanel();
                });
                
                controlsPanel.appendChild(newBtn);
                console.log('🎭 Emotion button added to controls panel');
            }
        }
    },
    
    getAvatarByUserId: function(userId) {
        if (window.AvatarSystem && window.AvatarSystem.avatars) {
            return window.AvatarSystem.avatars.get(userId);
        }
        return null;
    },
    
    getCurrentUserId: function() {
        return window.ROOM_CONFIG?.userId || window.currentUserId || 'current_user';
    },
    
    update: function(deltaTime) {
        if (!this.isInitialized) return;
        
        if (this.particleSystem) {
            this.particleSystem.update(deltaTime);
        }
        
        const currentTime = Date.now();
        for (const [userId, emotionState] of this.activeEmotions.entries()) {
            if (currentTime - emotionState.startTime >= emotionState.duration) {
                this.clearEmotion(userId);
            }
        }
    },
    
    // Public API methods
    getActiveEmotion: function(userId) {
        return this.activeEmotions.get(userId);
    },
    
    getAllActiveEmotions: function() {
        return Array.from(this.activeEmotions.entries());
    },
    
    clearAllEmotions: function() {
        for (const userId of this.activeEmotions.keys()) {
            this.clearEmotion(userId);
        }
    },
    
    destroy: function() {
        this.clearAllEmotions();
        
        const panel = document.getElementById('emotion-panel');
        if (panel) panel.remove();
        
        const simplePanel = document.getElementById('simple-emotion-panel');
        if (simplePanel) simplePanel.remove();
        
        const styles = document.getElementById('emotion-system-styles');
        if (styles) styles.remove();
        
        this.isInitialized = false;
        console.log('🎭 Enhanced Emotion System destroyed');
    }
};

// Auto-initialize when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.EmotionSystem.init();
    });
} else {
    window.EmotionSystem.init();
}

console.log('🎭 Enhanced Emotion System with inline integration loaded');