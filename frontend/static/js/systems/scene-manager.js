// Enhanced 3D Scene Manager - Advanced Graphics with Post-Processing
// FIXED: Doesn't interfere with chat bubble scales
// Integrated with Advanced Scene System and Avatar System

window.SceneManager = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    isInitialized: false,
    currentPreset: 'modern_office',
    composer: null,
    
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
        
        // Set camera position
        this.camera.position.set(
            preset.cameraPosition.x,
            preset.cameraPosition.y,
            preset.cameraPosition.z
        );
        this.camera.lookAt(0, 1, 0);
        
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
        
        // Create enhanced environment transition
        this.createEnhancedTransitionEffect(preset);
        
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
    
    createEnhancedTransitionEffect: function(preset) {
        // Enhanced transition with more particles and better animation
        const transitionCount = 30;
        const colors = [preset.backgroundColor, preset.groundColor];
        
        for (let i = 0; i < transitionCount; i++) {
            const wave = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: colors[i % colors.length],
                    transparent: true,
                    opacity: 0.7
                })
            );
            
            wave.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 10,
                (Math.random() - 0.5) * 30
            );
            
            this.scene.add(wave);
            
            // Enhanced wave animation
            let wavePhase = 0;
            const waveInterval = setInterval(() => {
                wavePhase += 0.06;
                wave.position.y += 0.04;
                
                // FIXED: Check if scale is valid before setting
                const newScale = 1 + wavePhase * 1.5;
                if (!isNaN(newScale) && isFinite(newScale)) {
                    wave.scale.setScalar(newScale);
                }
                
                wave.material.opacity = 0.7 - (wavePhase / 1.5);
                wave.rotation.x += 0.08;
                wave.rotation.y += 0.12;
                
                if (wavePhase >= 1.5) {
                    clearInterval(waveInterval);
                    this.scene.remove(wave);
                }
            }, 50);
            
            // Stagger the waves
            setTimeout(() => {}, i * 80);
        }
    },
    
    setupCameraControls: function() {
        const container = this.container;
        if (!container) return;
        
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let cameraAngle = 0;
        let cameraHeight = 5;
        let cameraDistance = 10;
        
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
            
            cameraAngle += deltaX * 0.008;
            cameraHeight += deltaY * 0.015;
            cameraHeight = Math.max(1, Math.min(20, cameraHeight));
            
            this.updateCameraPosition(cameraAngle, cameraHeight, cameraDistance);
            
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
            
            cameraDistance += (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
            cameraDistance = Math.max(minDistance, Math.min(maxDistance, cameraDistance));
            
            this.updateCameraPosition(cameraAngle, cameraHeight, cameraDistance);
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
                
                cameraAngle += deltaX * 0.008;
                cameraHeight += deltaY * 0.015;
                cameraHeight = Math.max(1, Math.min(20, cameraHeight));
                
                this.updateCameraPosition(cameraAngle, cameraHeight, cameraDistance);
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const deltaDistance = (touchStartDistance - currentDistance) * 0.02;
                cameraDistance += deltaDistance;
                cameraDistance = Math.max(3, Math.min(30, cameraDistance));
                
                this.updateCameraPosition(cameraAngle, cameraHeight, cameraDistance);
                
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
        
        // Update animations
        this.updateAnimations();
        
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
    
    // FIXED: updateAnimations function that doesn't break chat bubbles
    updateAnimations: function() {
        const time = Date.now() * 0.001;
        
        // FIXED: Only animate specific named objects, never affect chat bubbles or unknown objects
        this.scene.traverse((child) => {
            // Only animate floating orbs (specific name pattern)
            if (child.name && child.name.startsWith('floatingOrb')) {
                child.position.y += Math.sin(time + child.position.x) * 0.005;
                child.rotation.y = time * 0.5;
                if (child.material && child.material.opacity !== undefined) {
                    child.material.opacity = 0.4 + Math.sin(time * 2 + child.position.z) * 0.2;
                }
            }
            
            // Only animate energy particles (specific name)
            else if (child.name === 'energyParticles') {
                child.rotation.y = time * 0.1;
            }
            
            // Only animate rim lights (specific name pattern)
            else if (child.name && child.name.startsWith('rimLight')) {
                if (!child.userData.originalIntensity) {
                    child.userData.originalIntensity = child.intensity;
                }
                const intensity = child.userData.originalIntensity;
                child.intensity = intensity * (0.8 + Math.sin(time * 2) * 0.2);
            }
            
            // IMPORTANT: Don't affect any other objects (including chat bubbles)
            // Chat bubbles don't have specific names that match our patterns above
        });
        
        // Update directional light angle for day/night cycle
        if (this.lightingSystem.directionalLight) {
            const lightRotation = time * 0.1;
            this.lightingSystem.directionalLight.position.x = Math.cos(lightRotation) * 50;
            this.lightingSystem.directionalLight.position.z = Math.sin(lightRotation) * 50;
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
            lights: this.lightingSystem.pointLights.length + this.lightingSystem.rimLights.length + 2
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
    }
};