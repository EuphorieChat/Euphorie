// Enhanced 3D Scene Manager - Advanced Graphics with Post-Processing
// FIXED: Completely resolved all scale issues that were causing chat bubble warnings
// Integrated with Advanced Scene System and Avatar System
// NEW: Added double-tap to reset zoom for mobile devices
// NEW: Added avatar collision prevention system

window.SceneManager = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    isInitialized: false,
    currentPreset: 'modern_office',
    composer: null,
    
    // Camera control state
    cameraControls: {
        angle: 0,
        height: 5,
        distance: 10
    },
    
    // Enhanced post-processing effects
    postProcessing: {
        enabled: true,
        bloom: null,
        fxaa: null,
        ssao: null,
        filmPass: null
    },
    
    // Advanced lighting system
    lightingSystem: {
        ambientLight: null,
        directionalLight: null,
        pointLights: [],
        spotLights: [],
        rimLights: []
    },
    
    // Avatar collision prevention system
    avatarCollisionSystem: {
        enabled: true,
        avatarRadius: 1.0, // Collision radius for each avatar
        separationForce: 0.15, // How strongly avatars push apart
        gridSize: 50, // Size of spatial partitioning grid
        spatialGrid: new Map(),
        
        init: function() {
            console.log('🚶 Initializing avatar collision system...');
            this.enabled = true;
            
            // Start collision checking loop
            this.startCollisionChecking();
        },
        
        startCollisionChecking: function() {
            const checkCollisions = () => {
                if (!this.enabled || !window.SceneManager.isInitialized) return;
                
                // Get all avatars in the scene
                const avatars = this.getAllAvatars();
                
                if (avatars.length > 1) {
                    // Update spatial grid
                    this.updateSpatialGrid(avatars);
                    
                    // Check and resolve collisions
                    this.checkAndResolveCollisions(avatars);
                }
                
                // Continue checking
                setTimeout(checkCollisions, 100); // Check 10 times per second
            };
            
            checkCollisions();
        },
        
        getAllAvatars: function() {
            const avatars = [];
            
            if (!window.SceneManager.scene) return avatars;
            
            window.SceneManager.scene.traverse((child) => {
                // Look for avatar objects by various indicators
                if (child.userData && (
                    child.userData.isAvatar || 
                    child.userData.userId || 
                    child.userData.type === 'avatar' ||
                    (child.name && child.name.includes('avatar'))
                )) {
                    // Make sure it has a position
                    if (child.position) {
                        avatars.push(child);
                    }
                }
            });
            
            return avatars;
        },
        
        updateSpatialGrid: function(avatars) {
            // Clear grid
            this.spatialGrid.clear();
            
            // Add avatars to grid cells
            avatars.forEach(avatar => {
                const gridKey = this.getGridKey(avatar.position);
                
                if (!this.spatialGrid.has(gridKey)) {
                    this.spatialGrid.set(gridKey, []);
                }
                
                this.spatialGrid.get(gridKey).push(avatar);
            });
        },
        
        getGridKey: function(position) {
            const x = Math.floor(position.x / this.gridSize);
            const z = Math.floor(position.z / this.gridSize);
            return `${x},${z}`;
        },
        
        checkAndResolveCollisions: function(avatars) {
            // Check each avatar against others in nearby grid cells
            avatars.forEach(avatar1 => {
                const nearbyAvatars = this.getNearbyAvatars(avatar1);
                
                nearbyAvatars.forEach(avatar2 => {
                    if (avatar1 !== avatar2) {
                        this.resolveCollision(avatar1, avatar2);
                    }
                });
            });
        },
        
        getNearbyAvatars: function(avatar) {
            const nearbyAvatars = [];
            const pos = avatar.position;
            
            // Check avatar's grid cell and adjacent cells
            for (let dx = -1; dx <= 1; dx++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const x = Math.floor(pos.x / this.gridSize) + dx;
                    const z = Math.floor(pos.z / this.gridSize) + dz;
                    const gridKey = `${x},${z}`;
                    
                    const avatarsInCell = this.spatialGrid.get(gridKey);
                    if (avatarsInCell) {
                        nearbyAvatars.push(...avatarsInCell);
                    }
                }
            }
            
            return nearbyAvatars;
        },
        
        resolveCollision: function(avatar1, avatar2) {
            // Calculate distance between avatars
            const dx = avatar2.position.x - avatar1.position.x;
            const dz = avatar2.position.z - avatar1.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Check if collision is happening
            const minDistance = this.avatarRadius * 2;
            
            if (distance < minDistance && distance > 0.01) {
                // Calculate separation vector
                const separationX = (dx / distance) * (minDistance - distance) * this.separationForce;
                const separationZ = (dz / distance) * (minDistance - distance) * this.separationForce;
                
                // Apply separation - move each avatar away from the other
                avatar1.position.x -= separationX;
                avatar1.position.z -= separationZ;
                avatar2.position.x += separationX;
                avatar2.position.z += separationZ;
                
                // Optional: Add smooth interpolation for less jerky movement
                this.smoothPosition(avatar1);
                this.smoothPosition(avatar2);
            }
        },
        
        smoothPosition: function(avatar) {
            // Store target position if not exists
            if (!avatar.userData.targetPosition) {
                avatar.userData.targetPosition = avatar.position.clone();
            }
            
            // Smoothly interpolate to target position
            avatar.userData.targetPosition.copy(avatar.position);
            
            // Apply smooth movement (optional, can be removed if movement is too slow)
            const smoothFactor = 0.3;
            avatar.position.lerp(avatar.userData.targetPosition, smoothFactor);
        },
        
        setEnabled: function(enabled) {
            this.enabled = enabled;
            console.log(`🚶 Avatar collision system ${enabled ? 'enabled' : 'disabled'}`);
        },
        
        setAvatarRadius: function(radius) {
            this.avatarRadius = Math.max(0.5, Math.min(3, radius));
            console.log(`🚶 Avatar collision radius set to ${this.avatarRadius}`);
        },
        
        setSeparationForce: function(force) {
            this.separationForce = Math.max(0.05, Math.min(0.5, force));
            console.log(`🚶 Avatar separation force set to ${this.separationForce}`);
        }
    },
    
    // Double-tap zoom reset feature for mobile - FIXED VERSION
    doubleTapZoom: {
        isEnabled: true,
        lastTapTime: 0,
        tapTimeout: null,
        tapDelay: 300,
        feedbackElement: null,
        zoomIndicator: null,
        
        init: function() {
            // Only initialize on mobile devices
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                            window.innerWidth <= 768;
            
            if (!isMobile || !window.SceneManager.container) return;
            
            console.log('📱 Initializing double-tap zoom reset for mobile...');
            
            // Create feedback elements
            this.createFeedbackElements();
            
            // Add touch event listener
            window.SceneManager.container.addEventListener('touchend', this.handleTouch.bind(this), { passive: false });
            
            // Load settings
            this.loadSettings();
            
            console.log('✅ Double-tap zoom reset initialized');
        },
        
        handleTouch: function(event) {
            if (!this.isEnabled) return;
            
            // Only handle single finger touches
            if (event.changedTouches.length !== 1) return;
            
            const currentTime = Date.now();
            const tapInterval = currentTime - this.lastTapTime;
            
            // Clear any existing timeout
            if (this.tapTimeout) {
                clearTimeout(this.tapTimeout);
                this.tapTimeout = null;
            }
            
            if (tapInterval < this.tapDelay && tapInterval > 50) {
                // Double tap detected!
                this.handleDoubleTap(event);
                this.lastTapTime = 0; // Reset to prevent triple tap
            } else {
                // First tap
                this.lastTapTime = currentTime;
                
                // Set timeout to reset tap tracking
                this.tapTimeout = setTimeout(() => {
                    this.lastTapTime = 0;
                }, this.tapDelay);
            }
        },
        
        handleDoubleTap: function(event) {
            event.preventDefault();
            
            console.log('👆👆 Double tap detected - resetting zoom');
            
            // Show visual feedback
            this.showFeedback(event.changedTouches[0]);
            
            // Reset zoom and camera position - FIXED
            this.resetZoom();
            
            // Haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        },
        
        resetZoom: function() {
            const camera = window.SceneManager.camera;
            if (!camera) {
                console.warn('Camera not found for zoom reset');
                return;
            }
            
            // Get current preset for default position
            const currentPreset = window.SceneManager.presets[window.SceneManager.currentPreset];
            if (!currentPreset) return;
            
            // FIXED: Use the global camera control values
            const targetAngle = 0; // Reset to front view
            const targetHeight = currentPreset.cameraPosition.y;
            const targetDistance = Math.sqrt(
                currentPreset.cameraPosition.x * currentPreset.cameraPosition.x + 
                currentPreset.cameraPosition.z * currentPreset.cameraPosition.z
            );
            
            // Animate the zoom reset using camera controls
            this.animateZoomReset(targetAngle, targetHeight, targetDistance);
        },
        
        animateZoomReset: function(targetAngle, targetHeight, targetDistance) {
            const startTime = Date.now();
            const duration = 500; // milliseconds
            
            // Get current camera control values
            const startAngle = window.SceneManager.cameraControls.angle;
            const startHeight = window.SceneManager.cameraControls.height;
            const startDistance = window.SceneManager.cameraControls.distance;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function (ease-out cubic)
                const eased = 1 - Math.pow(1 - progress, 3);
                
                // Update camera controls
                window.SceneManager.cameraControls.angle = startAngle + (targetAngle - startAngle) * eased;
                window.SceneManager.cameraControls.height = startHeight + (targetHeight - startHeight) * eased;
                window.SceneManager.cameraControls.distance = startDistance + (targetDistance - startDistance) * eased;
                
                // Apply the camera position using the existing updateCameraPosition method
                window.SceneManager.updateCameraPosition(
                    window.SceneManager.cameraControls.angle,
                    window.SceneManager.cameraControls.height,
                    window.SceneManager.cameraControls.distance
                );
                
                // Continue animation
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    console.log('✅ Zoom reset complete');
                    console.log('Final camera controls:', window.SceneManager.cameraControls);
                }
            };
            
            animate();
        },
        
        createFeedbackElements: function() {
            // Create visual feedback element
            const feedback = document.createElement('div');
            feedback.id = 'double-tap-feedback';
            feedback.style.cssText = `
                position: fixed;
                width: 80px;
                height: 80px;
                border: 3px solid rgba(102, 126, 234, 0.8);
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
                display: none;
                transform: translate(-50%, -50%) scale(0);
                transition: none;
                background: radial-gradient(circle, rgba(102, 126, 234, 0.3), transparent);
            `;
            
            document.body.appendChild(feedback);
            this.feedbackElement = feedback;
            
            // Create zoom indicator
            const zoomIndicator = document.createElement('div');
            zoomIndicator.id = 'zoom-reset-indicator';
            zoomIndicator.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10001;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            zoomIndicator.innerHTML = '🔍 Zoom Reset';
            
            document.body.appendChild(zoomIndicator);
            this.zoomIndicator = zoomIndicator;
        },
        
        showFeedback: function(touch) {
            // Show ripple effect at touch location
            if (this.feedbackElement) {
                this.feedbackElement.style.left = touch.clientX + 'px';
                this.feedbackElement.style.top = touch.clientY + 'px';
                this.feedbackElement.style.display = 'block';
                this.feedbackElement.style.transform = 'translate(-50%, -50%) scale(0)';
                
                // Trigger animation
                requestAnimationFrame(() => {
                    this.feedbackElement.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
                    this.feedbackElement.style.transform = 'translate(-50%, -50%) scale(2)';
                    this.feedbackElement.style.opacity = '0';
                    
                    setTimeout(() => {
                        this.feedbackElement.style.display = 'none';
                        this.feedbackElement.style.transition = 'none';
                        this.feedbackElement.style.opacity = '1';
                    }, 400);
                });
            }
            
            // Show zoom indicator
            if (this.zoomIndicator) {
                this.zoomIndicator.style.display = 'block';
                requestAnimationFrame(() => {
                    this.zoomIndicator.style.opacity = '1';
                    
                    setTimeout(() => {
                        this.zoomIndicator.style.opacity = '0';
                        setTimeout(() => {
                            this.zoomIndicator.style.display = 'none';
                        }, 300);
                    }, 1000);
                });
            }
        },
        
        enable: function() {
            this.isEnabled = true;
            localStorage.setItem('doubleTapZoomEnabled', 'true');
        },
        
        disable: function() {
            this.isEnabled = false;
            localStorage.setItem('doubleTapZoomEnabled', 'false');
        },
        
        loadSettings: function() {
            const saved = localStorage.getItem('doubleTapZoomEnabled');
            if (saved === 'false') {
                this.isEnabled = false;
            }
        }
    },
    
    // Enhanced scene presets with advanced graphics
    presets: {
        modern_office: {
            name: 'Modern Office',
            emoji: '🏢',
            backgroundColor: 0x2c3e50,
            groundColor: 0x34495e,
            lighting: { 
                ambient: { color: 0x404040, intensity: 0.6 },
                directional: { color: 0xffffff, intensity: 1.2, position: [50, 50, 50] },
                point: { color: 0xffa500, intensity: 0.4, position: [0, 10, 0] },
                rim: { color: 0x4169e1, intensity: 0.3 }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x2c3e50, near: 20, far: 80 },
            atmosphere: 'professional',
            postEffects: {
                bloom: { strength: 0.3, radius: 0.4, threshold: 0.85 },
                contrast: 1.1,
                saturation: 1.05
            }
        },
        cozy_lounge: {
            name: 'Cozy Lounge',
            emoji: '🛋️',
            backgroundColor: 0x8b4513,
            groundColor: 0xa0522d,
            lighting: { 
                ambient: { color: 0x603020, intensity: 0.8 },
                directional: { color: 0xffaa80, intensity: 0.9, position: [30, 40, 30] },
                point: { color: 0xff6b35, intensity: 0.6, position: [-5, 8, 5] },
                rim: { color: 0xff7f50, intensity: 0.4 }
            },
            cameraPosition: { x: 0, y: 4, z: 8 },
            fog: { color: 0x8b4513, near: 15, far: 60 },
            atmosphere: 'warm',
            postEffects: {
                bloom: { strength: 0.5, radius: 0.6, threshold: 0.7 },
                contrast: 1.15,
                saturation: 1.2
            }
        },
        outdoor_garden: {
            name: 'Outdoor Garden',
            emoji: '🌳',
            backgroundColor: 0x87ceeb,
            groundColor: 0x228b22,
            lighting: { 
                ambient: { color: 0x606060, intensity: 1.0 },
                directional: { color: 0xffffcc, intensity: 1.4, position: [100, 100, 50] },
                point: { color: 0x98fb98, intensity: 0.3, position: [0, 5, 0] },
                rim: { color: 0x90ee90, intensity: 0.5 }
            },
            cameraPosition: { x: 0, y: 6, z: 12 },
            fog: { color: 0x87ceeb, near: 30, far: 120 },
            atmosphere: 'fresh',
            postEffects: {
                bloom: { strength: 0.4, radius: 0.5, threshold: 0.8 },
                contrast: 1.05,
                saturation: 1.3
            }
        },
        party_venue: {
            name: 'Party Venue',
            emoji: '🎉',
            backgroundColor: 0x191970,
            groundColor: 0x4b0082,
            lighting: { 
                ambient: { color: 0x301040, intensity: 0.5 },
                directional: { color: 0xff69b4, intensity: 0.8, position: [0, 30, 0] },
                point: { color: 0x00ffff, intensity: 0.8, position: [0, 15, 0] },
                rim: { color: 0xff00ff, intensity: 0.7 }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x191970, near: 10, far: 40 },
            atmosphere: 'energetic',
            postEffects: {
                bloom: { strength: 0.8, radius: 0.7, threshold: 0.5 },
                contrast: 1.3,
                saturation: 1.4
            }
        },
        zen_temple: {
            name: 'Zen Temple',
            emoji: '⛩️',
            backgroundColor: 0x2f4f4f,
            groundColor: 0x696969,
            lighting: { 
                ambient: { color: 0x404050, intensity: 0.7 },
                directional: { color: 0xf0f8ff, intensity: 0.8, position: [0, 80, 80] },
                point: { color: 0xffd700, intensity: 0.4, position: [0, 12, 0] },
                rim: { color: 0xb0c4de, intensity: 0.3 }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x2f4f4f, near: 25, far: 100 },
            atmosphere: 'peaceful',
            postEffects: {
                bloom: { strength: 0.2, radius: 0.3, threshold: 0.9 },
                contrast: 0.95,
                saturation: 0.9
            }
        },
        cyberpunk_city: {
            name: 'Cyberpunk City',
            emoji: '🌆',
            backgroundColor: 0x0a0a0a,
            groundColor: 0x1a1a1a,
            lighting: { 
                ambient: { color: 0x001122, intensity: 0.4 },
                directional: { color: 0x00ffff, intensity: 0.6, position: [-50, 30, 50] },
                point: { color: 0xff00ff, intensity: 1.0, position: [0, 20, 0] },
                rim: { color: 0x00ff00, intensity: 0.8 }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x001122, near: 15, far: 60 },
            atmosphere: 'futuristic',
            postEffects: {
                bloom: { strength: 1.0, radius: 0.8, threshold: 0.3 },
                contrast: 1.4,
                saturation: 1.5
            }
        }
    },
    
    // FIXED: Safe scale utility to prevent NaN issues
    safeScale: {
        set: function(object, x, y, z) {
            if (!object || !object.scale) return;
            
            // Validate all scale values
            const safeX = this.validateScale(x);
            const safeY = this.validateScale(y !== undefined ? y : x);
            const safeZ = this.validateScale(z !== undefined ? z : x);
            
            object.scale.set(safeX, safeY, safeZ);
        },
        
        setScalar: function(object, scalar) {
            if (!object || !object.scale) return;
            const safeScalar = this.validateScale(scalar);
            object.scale.setScalar(safeScalar);
        },
        
        validateScale: function(value) {
            if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
                console.warn('🛡️ SceneManager: Invalid scale value, using 1:', value);
                return 1;
            }
            if (value <= 0) {
                console.warn('🛡️ SceneManager: Scale <= 0, using 0.1:', value);
                return 0.1;
            }
            if (value > 100) {
                console.warn('🛡️ SceneManager: Scale too large, clamping to 100:', value);
                return 100;
            }
            return value;
        }
    },
    
    init: async function(containerId, scenePreset = 'modern_office') {
        if (this.isInitialized) return;
        
        console.log('🎬 Initializing Enhanced Scene Manager with Advanced Graphics');
        
        try {
            // Get container
            this.container = document.getElementById(containerId);
            if (!this.container) {
                throw new Error(`Container ${containerId} not found`);
            }
            
            // Create scene
            this.scene = new THREE.Scene();
            
            // Set up camera with better settings
            this.camera = new THREE.PerspectiveCamera(
                75, // Field of view
                this.container.clientWidth / this.container.clientHeight,
                0.1, // Near plane
                2000 // Far plane (increased for better distance rendering)
            );
            
            // Create renderer with advanced settings
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                precision: "highp",
                logarithmicDepthBuffer: true,
                preserveDrawingBuffer: false
            });
            
            // Enhanced renderer configuration
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Advanced shadow settings
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.shadowMap.autoUpdate = true;
            
            // Enhanced color and tone mapping
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.2;
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            
            // Enable additional rendering features
            this.renderer.physicallyCorrectLights = true;
            this.renderer.gammaFactor = 2.2;
            
            // Add renderer to container
            this.container.appendChild(this.renderer.domElement);
            
            // Setup post-processing
            await this.setupPostProcessing();
            
            // Apply scene preset
            this.applyPreset(scenePreset);
            
            // Add enhanced ground
            this.addEnhancedGround();
            
            // Set up resize handler
            window.addEventListener('resize', () => this.onWindowResize());
            
            // Set up camera controls
            this.setupCameraControls();
            
            // Initialize double-tap zoom for mobile
            this.doubleTapZoom.init();
            
            // Initialize avatar collision system
            this.avatarCollisionSystem.init();
            
            // Start render loop
            this.animate();
            
            // Update global state
            if (window.Euphorie) {
                window.Euphorie.state.scene = this.scene;
                window.Euphorie.state.camera = this.camera;
                window.Euphorie.state.renderer = this.renderer;
            }
            
            this.isInitialized = true;
            console.log('✅ Enhanced Scene Manager initialized with advanced graphics');
            
            // Emit event
            if (window.EventBus) {
                window.EventBus.emit('scene:initialized', {
                    scene: this.scene,
                    camera: this.camera,
                    renderer: this.renderer,
                    composer: this.composer
                });
            }
            
        } catch (error) {
            console.error('❌ Enhanced Scene Manager initialization failed:', error);
            throw error;
        }
    },
    
    async setupPostProcessing() {
        if (!this.postProcessing.enabled) return;
        
        console.log('🎨 Setting up post-processing effects...');
        
        try {
            // Check if EffectComposer is available
            if (typeof THREE.EffectComposer === 'undefined') {
                console.warn('⚠️ EffectComposer not available, skipping post-processing');
                return;
            }
            
            // Create composer
            this.composer = new THREE.EffectComposer(this.renderer);
            
            // Render pass
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
            
            // Bloom pass for glowing effects
            if (typeof THREE.UnrealBloomPass !== 'undefined') {
                const bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
                    0.3, // strength
                    0.4, // radius
                    0.85 // threshold
                );
                this.postProcessing.bloom = bloomPass;
                this.composer.addPass(bloomPass);
            }
            
            // SSAO for ambient occlusion
            if (typeof THREE.SSAOPass !== 'undefined') {
                const ssaoPass = new THREE.SSAOPass(this.scene, this.camera);
                ssaoPass.kernelRadius = 8;
                ssaoPass.minDistance = 0.005;
                ssaoPass.maxDistance = 0.1;
                this.postProcessing.ssao = ssaoPass;
                this.composer.addPass(ssaoPass);
            }
            
            // FXAA anti-aliasing
            if (typeof THREE.ShaderPass !== 'undefined' && THREE.FXAAShader) {
                const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
                fxaaPass.material.uniforms['resolution'].value.x = 1 / this.container.clientWidth;
                fxaaPass.material.uniforms['resolution'].value.y = 1 / this.container.clientHeight;
                this.postProcessing.fxaa = fxaaPass;
                this.composer.addPass(fxaaPass);
            }
            
            // Film grain pass for cinematic feel
            if (typeof THREE.FilmPass !== 'undefined') {
                const filmPass = new THREE.FilmPass(0.5, 0.125, 2048, false);
                this.postProcessing.filmPass = filmPass;
                this.composer.addPass(filmPass);
            }
            
            console.log('✅ Post-processing effects setup complete');
            
        } catch (error) {
            console.warn('⚠️ Post-processing setup failed:', error);
            this.postProcessing.enabled = false;
        }
    },
    
    applyPreset: function(presetName) {
        const preset = this.presets[presetName] || this.presets.modern_office;
        this.currentPreset = presetName;
        
        console.log(`🎨 Applying enhanced scene preset: ${preset.name}`);
        
        // Set background
        this.scene.background = new THREE.Color(preset.backgroundColor);
        
        // Clear existing lights
        this.clearLights();
        
        // Set up enhanced lighting
        this.setupEnhancedLighting(preset.lighting);
        
        // Set camera position and controls state
        this.camera.position.set(
            preset.cameraPosition.x,
            preset.cameraPosition.y,
            preset.cameraPosition.z
        );
        this.camera.lookAt(0, 1, 0);
        
        // Update camera control state
        this.cameraControls.angle = 0;
        this.cameraControls.height = preset.cameraPosition.y;
        this.cameraControls.distance = Math.sqrt(
            preset.cameraPosition.x * preset.cameraPosition.x + 
            preset.cameraPosition.z * preset.cameraPosition.z
        );
        
        // Update ground color
        this.updateGroundColor(preset.groundColor);
        
        // Enhanced fog with exponential falloff
        if (preset.fog) {
            this.scene.fog = new THREE.FogExp2(preset.fog.color, 0.001);
        } else {
            this.scene.fog = null;
        }
        
        // Apply post-processing settings
        this.applyPostProcessingSettings(preset.postEffects);
        
        // Create enhanced environment transition - FIXED VERSION
        this.createSafeTransitionEffect(preset);
        
        // Add atmosphere effects
        this.addAtmosphereEffects(preset.atmosphere);
        
        // Emit preset change event
        if (window.EventBus) {
            window.EventBus.emit('scene:preset-changed', {
                preset: presetName,
                config: preset
            });
        }
        
        console.log(`✅ Enhanced scene preset ${preset.name} applied successfully`);
    },
    
    setupEnhancedLighting: function(lightingConfig) {
        // Enhanced hemisphere lighting for more realistic ambient
        const hemisphereLight = new THREE.HemisphereLight(
            0x87CEEB, // sky color
            0x362203, // ground color
            lightingConfig.ambient.intensity * 0.8
        );
        hemisphereLight.name = 'hemisphere';
        this.scene.add(hemisphereLight);
        this.lightingSystem.ambientLight = hemisphereLight;
        
        // Enhanced directional light (sun) with better shadows
        const directionalLight = new THREE.DirectionalLight(
            lightingConfig.directional.color,
            lightingConfig.directional.intensity
        );
        
        if (lightingConfig.directional.position) {
            directionalLight.position.set(...lightingConfig.directional.position);
        } else {
            directionalLight.position.set(50, 100, 50);
        }
        
        directionalLight.target.position.set(0, 0, 0);
        
        // Enhanced shadow settings
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.bias = -0.0005;
        directionalLight.shadow.normalBias = 0.02;
        directionalLight.shadow.radius = 4;
        directionalLight.name = 'directional';
        
        this.scene.add(directionalLight);
        this.scene.add(directionalLight.target);
        this.lightingSystem.directionalLight = directionalLight;
        
        // Enhanced point light with distance falloff
        if (lightingConfig.point) {
            const pointLight = new THREE.PointLight(
                lightingConfig.point.color,
                lightingConfig.point.intensity,
                100,
                2 // realistic falloff
            );
            
            if (lightingConfig.point.position) {
                pointLight.position.set(...lightingConfig.point.position);
            } else {
                pointLight.position.set(0, 10, 0);
            }
            
            pointLight.name = 'point';
            this.scene.add(pointLight);
            this.lightingSystem.pointLights = [pointLight];
        }
        
        // Add rim lighting for dramatic effect
        if (lightingConfig.rim) {
            this.addRimLighting(lightingConfig.rim);
        }
        
        // Add fill lights for better illumination
        this.addFillLights();
    },
    
    addRimLighting: function(rimConfig) {
        // Create rim lights for dramatic silhouetting
        const positions = [
            [-20, 10, -10],
            [20, 10, -10],
            [0, 5, -25]
        ];
        
        positions.forEach((pos, index) => {
            const rimLight = new THREE.SpotLight(
                rimConfig.color,
                rimConfig.intensity * 0.7,
                50,
                Math.PI * 0.3,
                0.5,
                2
            );
            
            rimLight.position.set(...pos);
            rimLight.target.position.set(0, 0, 0);
            rimLight.name = `rimLight${index}`;
            
            this.scene.add(rimLight);
            this.scene.add(rimLight.target);
            this.lightingSystem.rimLights.push(rimLight);
        });
    },
    
    addFillLights: function() {
        // Soft fill lights to eliminate harsh shadows
        const fillLight1 = new THREE.PointLight(0xffffff, 0.2, 30);
        fillLight1.position.set(-10, 5, 10);
        fillLight1.name = 'fillLight1';
        this.scene.add(fillLight1);
        
        const fillLight2 = new THREE.PointLight(0xffffff, 0.2, 30);
        fillLight2.position.set(10, 5, -10);
        fillLight2.name = 'fillLight2';
        this.scene.add(fillLight2);
        
        this.lightingSystem.pointLights.push(fillLight1, fillLight2);
    },
    
    clearLights: function() {
        // Clear all existing lights
        const lightsToRemove = [];
        this.scene.traverse(child => {
            if (child.type === 'AmbientLight' || 
                child.type === 'DirectionalLight' || 
                child.type === 'PointLight' ||
                child.type === 'SpotLight' ||
                child.type === 'HemisphereLight') {
                lightsToRemove.push(child);
            }
        });
        
        lightsToRemove.forEach(light => {
            this.scene.remove(light);
        });
        
        // Reset lighting system
        this.lightingSystem = {
            ambientLight: null,
            directionalLight: null,
            pointLights: [],
            spotLights: [],
            rimLights: []
        };
    },
    
    addEnhancedGround: function() {
        // Create more detailed ground with height variation
        const groundGeometry = new THREE.PlaneGeometry(100, 100, 64, 64);
        
        // Add subtle height variation
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const noise = (Math.random() - 0.5) * 0.1;
            positions.setY(i, y + noise);
        }
        positions.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        // Enhanced ground material with PBR
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x999999,
            roughness: 0.8,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'ground';
        
        this.scene.add(ground);
    },
    
    updateGroundColor: function(color) {
        const ground = this.scene.getObjectByName('ground');
        if (ground && ground.material) {
            ground.material.color.setHex(color);
        }
    },
    
    applyPostProcessingSettings: function(postEffects) {
        if (!this.postProcessing.enabled || !postEffects) return;
        
        // Update bloom settings
        if (this.postProcessing.bloom && postEffects.bloom) {
            this.postProcessing.bloom.strength = postEffects.bloom.strength;
            this.postProcessing.bloom.radius = postEffects.bloom.radius;
            this.postProcessing.bloom.threshold = postEffects.bloom.threshold;
        }
        
        // Update tone mapping
        if (postEffects.contrast) {
            this.renderer.toneMappingExposure = postEffects.contrast;
        }
    },
    
    addAtmosphereEffects: function(atmosphere) {
        // Add atmospheric particles and effects based on atmosphere type
        switch (atmosphere) {
            case 'energetic':
                this.addEnergyParticles();
                break;
            case 'peaceful':
                this.addFloatingOrbs();
                break;
            case 'warm':
                this.addWarmGlow();
                break;
            case 'fresh':
                this.addNatureEffects();
                break;
            case 'futuristic':
                this.addCyberEffects();
                break;
        }
    },
    
    addEnergyParticles: function() {
        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            // Position
            positions[i * 3] = (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
            
            // Color (electric blue/purple)
            colors[i * 3] = 0.2 + Math.random() * 0.3;
            colors[i * 3 + 1] = 0.4 + Math.random() * 0.4;
            colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            
            // Velocity
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = Math.random() * 0.05;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.name = 'energyParticles';
        this.scene.add(particles);
        
        this.animateEnergyParticles(particles);
    },
    
    animateEnergyParticles: function(particles) {
        const animate = () => {
            if (!particles.parent) return; // Stop if removed from scene
            
            const positions = particles.geometry.attributes.position.array;
            const velocities = particles.geometry.attributes.velocity.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i];
                positions[i + 1] += velocities[i + 1];
                positions[i + 2] += velocities[i + 2];
                
                // Reset if too high
                if (positions[i + 1] > 20) {
                    positions[i + 1] = 0;
                    positions[i] = (Math.random() - 0.5) * 50;
                    positions[i + 2] = (Math.random() - 0.5) * 50;
                }
            }
            
            particles.geometry.attributes.position.needsUpdate = true;
            particles.rotation.y += 0.001;
            
            requestAnimationFrame(animate);
        };
        animate();
    },
    
    addFloatingOrbs: function() {
        // Peaceful floating orbs for zen atmosphere
        for (let i = 0; i < 15; i++) {
            const orbGeometry = new THREE.SphereGeometry(0.05, 16, 16);
            const orbMaterial = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                transparent: true,
                opacity: 0.6,
                emissive: 0xffd700,
                emissiveIntensity: 0.3
            });
            
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);
            orb.position.set(
                (Math.random() - 0.5) * 30,
                2 + Math.random() * 8,
                (Math.random() - 0.5) * 30
            );
            
            orb.name = `floatingOrb${i}`;
            this.scene.add(orb);
        }
    },
    
    addWarmGlow: function() {
        // Add warm glow effect (simplified, no problematic scaling)
        const glowLight = new THREE.PointLight(0xff6b35, 0.5, 50);
        glowLight.position.set(0, 8, 0);
        glowLight.name = 'warmGlow';
        this.scene.add(glowLight);
    },
    
    addNatureEffects: function() {
        // Add nature effects (simplified, no problematic scaling)
        const leafLight = new THREE.PointLight(0x90ee90, 0.3, 30);
        leafLight.position.set(5, 5, 5);
        leafLight.name = 'natureGlow';
        this.scene.add(leafLight);
    },
    
    addCyberEffects: function() {
        // Add cyber effects (simplified, no problematic scaling)
        const cyberLight = new THREE.PointLight(0x00ffff, 0.8, 40);
        cyberLight.position.set(-5, 12, -5);
        cyberLight.name = 'cyberGlow';
        this.scene.add(cyberLight);
    },
    
    // COMPLETELY FIXED: Safe transition effect that never causes scale issues
    createSafeTransitionEffect: function(preset) {
        console.log('🎆 Creating SAFE transition effect...');
        
        const transitionCount = 20; // Reduced count for better performance
        const colors = [preset.backgroundColor, preset.groundColor];
        
        for (let i = 0; i < transitionCount; i++) {
            const wave = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8), // Smaller initial size
                new THREE.MeshBasicMaterial({
                    color: colors[i % colors.length],
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            wave.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 8,
                (Math.random() - 0.5) * 20
            );
            
            // CRITICAL: Give each wave a unique name to prevent conflicts
            wave.name = `transitionWave_${Date.now()}_${i}`;
            this.scene.add(wave);
            
            // COMPLETELY FIXED: Animation that never goes to 0 or negative scales
            let wavePhase = 0;
            const maxPhase = 1.0;
            const phaseIncrement = 0.04; // Slower, more controlled
            
            const waveInterval = setInterval(() => {
                wavePhase += phaseIncrement;
                
                // Safe position update
                wave.position.y += 0.03;
                
                // FIXED: Safe scale calculation that never goes to 0 or negative
                const baseScale = 0.2; // Start with visible base scale
                const scaleMultiplier = 1 + (wavePhase * 2); // Scale up from base
                const finalScale = Math.max(0.1, baseScale * scaleMultiplier); // Never below 0.1
                
                // Use our safe scale utility
                this.safeScale.setScalar(wave, finalScale);
                
                // Safe opacity update
                const opacity = Math.max(0, 0.6 - (wavePhase * 0.6));
                wave.material.opacity = opacity;
                
                // Safe rotation
                wave.rotation.x += 0.06;
                wave.rotation.y += 0.08;
                
                // Clean up when animation is complete
                if (wavePhase >= maxPhase) {
                    clearInterval(waveInterval);
                    this.scene.remove(wave);
                    
                    // Clean up resources
                    wave.geometry.dispose();
                    wave.material.dispose();
                }
            }, 50);
            
            // Stagger the waves with safer timing
            setTimeout(() => {
                // Wave is already created and animating
            }, i * 60);
        }
        
        console.log('✅ Safe transition effect created successfully');
    },
    
    setupCameraControls: function() {
        const container = this.container;
        if (!container) return;
        
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        
        // Enhanced mouse controls with smooth damping
        container.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
            container.style.cursor = 'grabbing';
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            
            this.cameraControls.angle += deltaX * 0.008;
            this.cameraControls.height += deltaY * 0.015;
            this.cameraControls.height = Math.max(1, Math.min(20, this.cameraControls.height));
            
            this.updateCameraPosition(
                this.cameraControls.angle, 
                this.cameraControls.height, 
                this.cameraControls.distance
            );
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        container.addEventListener('mouseup', () => {
            isMouseDown = false;
            container.style.cursor = 'grab';
        });
        
        container.addEventListener('mouseleave', () => {
            isMouseDown = false;
            container.style.cursor = 'grab';
        });
        
        // Enhanced zoom with smooth interpolation
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.8;
            const minDistance = 3;
            const maxDistance = 30;
            
            this.cameraControls.distance += (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
            this.cameraControls.distance = Math.max(minDistance, Math.min(maxDistance, this.cameraControls.distance));
            
            this.updateCameraPosition(
                this.cameraControls.angle, 
                this.cameraControls.height, 
                this.cameraControls.distance
            );
        });
        
        // Enhanced touch controls
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartDistance = 0;
        
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                touchStartDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        });
        
        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            
            if (e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - touchStartX;
                const deltaY = e.touches[0].clientY - touchStartY;
                
                this.cameraControls.angle += deltaX * 0.008;
                this.cameraControls.height += deltaY * 0.015;
                this.cameraControls.height = Math.max(1, Math.min(20, this.cameraControls.height));
                
                this.updateCameraPosition(
                    this.cameraControls.angle, 
                    this.cameraControls.height, 
                    this.cameraControls.distance
                );
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const deltaDistance = (touchStartDistance - currentDistance) * 0.02;
                this.cameraControls.distance += deltaDistance;
                this.cameraControls.distance = Math.max(3, Math.min(30, this.cameraControls.distance));
                
                this.updateCameraPosition(
                    this.cameraControls.angle, 
                    this.cameraControls.height, 
                    this.cameraControls.distance
                );
                
                touchStartDistance = currentDistance;
            }
        });
        
        container.style.cursor = 'grab';
    },
    
    updateCameraPosition: function(angle, height, distance) {
        this.camera.position.x = Math.sin(angle) * distance;
        this.camera.position.y = height;
        this.camera.position.z = Math.cos(angle) * distance;
        this.camera.lookAt(0, 1, 0);
    },
    
    animate: function() {
        requestAnimationFrame(() => this.animate());
        
        // Update animations - FIXED VERSION
        this.updateAnimationsSafely();
        
        // Update performance counter
        if (window.Euphorie && window.Euphorie.performance) {
            window.Euphorie.performance.frameCount++;
        }
        
        // Render with post-processing if available
        if (this.composer && this.postProcessing.enabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Emit frame event
        if (window.EventBus) {
            window.EventBus.emit('scene:frame', {
                scene: this.scene,
                camera: this.camera,
                frameCount: window.Euphorie?.performance?.frameCount || 0
            });
        }
    },
    
    // COMPLETELY FIXED: Animation update that never affects chat bubbles or unknown objects
    updateAnimationsSafely: function() {
        const time = Date.now() * 0.001;
        
        // FIXED: Only animate objects we specifically created and know about
        this.scene.traverse((child) => {
            // ONLY animate floating orbs with specific name pattern
            if (child.name && child.name.startsWith('floatingOrb')) {
                try {
                    child.position.y += Math.sin(time + child.position.x) * 0.005;
                    child.rotation.y = time * 0.5;
                    if (child.material && child.material.opacity !== undefined) {
                        child.material.opacity = 0.4 + Math.sin(time * 2 + child.position.z) * 0.2;
                    }
                } catch (error) {
                    console.warn('Error animating floating orb:', error);
                }
            }
            
            // ONLY animate energy particles with specific name
            else if (child.name === 'energyParticles') {
                try {
                    child.rotation.y = time * 0.1;
                } catch (error) {
                    console.warn('Error animating energy particles:', error);
                }
            }
            
            // ONLY animate rim lights with specific name pattern
            else if (child.name && child.name.startsWith('rimLight')) {
                try {
                    if (!child.userData.originalIntensity) {
                        child.userData.originalIntensity = child.intensity;
                    }
                    const intensity = child.userData.originalIntensity;
                    child.intensity = intensity * (0.8 + Math.sin(time * 2) * 0.2);
                } catch (error) {
                    console.warn('Error animating rim light:', error);
                }
            }
            
            // CRITICAL: We completely ignore all other objects
            // This means chat bubbles, avatars, and any user-added objects are NEVER touched
            // Only objects we specifically created with known names are animated
        });
        
        // Safe directional light animation
        if (this.lightingSystem.directionalLight) {
            try {
                const lightRotation = time * 0.1;
                this.lightingSystem.directionalLight.position.x = Math.cos(lightRotation) * 50;
                this.lightingSystem.directionalLight.position.z = Math.sin(lightRotation) * 50;
            } catch (error) {
                console.warn('Error animating directional light:', error);
            }
        }
    },
    
    onWindowResize: function() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Update post-processing
        if (this.composer) {
            this.composer.setSize(width, height);
            
            // Update FXAA resolution
            if (this.postProcessing.fxaa) {
                this.postProcessing.fxaa.material.uniforms['resolution'].value.x = 1 / width;
                this.postProcessing.fxaa.material.uniforms['resolution'].value.y = 1 / height;
            }
        }
        
        console.log(`📱 Enhanced scene resized to ${width}x${height}`);
    },
    
    // Enhanced object management
    addObject: function(object, name = null) {
        if (name) object.name = name;
        this.scene.add(object);
        
        // Enable shadows for new objects
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        if (window.EventBus) {
            window.EventBus.emit('scene:object-added', { object, name });
        }
    },
    
    removeObject: function(object) {
        this.scene.remove(object);
        
        // Clean up resources
        object.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        if (window.EventBus) {
            window.EventBus.emit('scene:object-removed', { object });
        }
    },
    
    getObjectByName: function(name) {
        return this.scene.getObjectByName(name);
    },
    
    // Camera utilities
    getCameraPosition: function() {
        return this.camera.position.clone();
    },
    
    setCameraPosition: function(x, y, z) {
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 1, 0);
        
        // Update camera control state
        this.cameraControls.angle = Math.atan2(x, z);
        this.cameraControls.height = y;
        this.cameraControls.distance = Math.sqrt(x * x + z * z);
    },
    
    focusOnObject: function(object, distance = 8) {
        const objectPosition = object.position.clone();
        const direction = this.camera.position.clone().sub(objectPosition).normalize();
        this.camera.position.copy(objectPosition.add(direction.multiplyScalar(distance)));
        this.camera.lookAt(objectPosition);
    },
    
    // Performance utilities
    getStats: function() {
        return {
            objects: this.scene.children.length,
            triangles: this.renderer.info.render.triangles,
            calls: this.renderer.info.render.calls,
            memory: this.renderer.info.memory,
            postProcessing: this.postProcessing.enabled,
            lights: this.lightingSystem.pointLights.length + this.lightingSystem.rimLights.length + 2,
            avatarCollision: this.avatarCollisionSystem.enabled
        };
    },
    
    // Preset utilities
    getCurrentPreset: function() {
        return this.currentPreset;
    },
    
    getAvailablePresets: function() {
        return Object.keys(this.presets);
    },
    
    getPresetInfo: function(presetName) {
        return this.presets[presetName];
    },
    
    // Quality settings
    setQuality: function(level) {
        switch (level) {
            case 'low':
                this.renderer.setPixelRatio(1);
                this.postProcessing.enabled = false;
                this.renderer.shadowMap.enabled = false;
                break;
            case 'medium':
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                this.postProcessing.enabled = true;
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.BasicShadowMap;
                break;
            case 'high':
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.postProcessing.enabled = true;
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                break;
        }
        console.log(`🎨 Graphics quality set to: ${level}`);
    },
    
    // Double-tap zoom utilities
    toggleDoubleTapZoom: function() {
        if (this.doubleTapZoom.isEnabled) {
            this.doubleTapZoom.disable();
            console.log('❌ Double tap zoom disabled');
        } else {
            this.doubleTapZoom.enable();
            console.log('✅ Double tap zoom enabled');
        }
    },
    
    // Avatar collision utilities
    toggleAvatarCollision: function() {
        this.avatarCollisionSystem.setEnabled(!this.avatarCollisionSystem.enabled);
    },
    
    setAvatarCollisionRadius: function(radius) {
        this.avatarCollisionSystem.setAvatarRadius(radius);
    },
    
    setAvatarSeparationForce: function(force) {
        this.avatarCollisionSystem.setSeparationForce(force);
    },
    
    // Cleanup method
    dispose: function() {
        console.log('🧹 Disposing Scene Manager...');
        
        // Stop animation loop
        this.isInitialized = false;
        
        // Clean up scene objects
        this.scene.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        // Clean up renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clean up post-processing
        if (this.composer) {
            this.composer.dispose();
        }
        
        // Clean up double-tap zoom elements
        if (this.doubleTapZoom.feedbackElement) {
            this.doubleTapZoom.feedbackElement.remove();
        }
        if (this.doubleTapZoom.zoomIndicator) {
            this.doubleTapZoom.zoomIndicator.remove();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        
        console.log('✅ Scene Manager disposed');
    }
};