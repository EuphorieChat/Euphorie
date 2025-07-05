// Enhanced 3D Scene Manager - Integrated with Advanced Scene System
// UPDATED: Complete ChatBubble Integration v4.0

window.SceneManager = {
    scene: null,
    camera: null,
    renderer: null,
    container: null,
    isInitialized: false,
    currentPreset: 'modern_office',
    
    // Enhanced scene presets - integrated with AdvancedSceneSystem
    presets: {
        modern_office: {
            name: 'Modern Office',
            emoji: '🏢',
            backgroundColor: 0x2c3e50,
            groundColor: 0x34495e,
            lighting: { 
                ambient: { color: 0x404040, intensity: 0.6 },
                directional: { color: 0xffffff, intensity: 0.8, position: [50, 50, 50] },
                point: { color: 0xffa500, intensity: 0.3, position: [0, 10, 0] }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x2c3e50, near: 20, far: 50 },
            atmosphere: 'professional'
        },
        cozy_lounge: {
            name: 'Cozy Lounge',
            emoji: '🛋️',
            backgroundColor: 0x8b4513,
            groundColor: 0xa0522d,
            lighting: { 
                ambient: { color: 0x603020, intensity: 0.7 },
                directional: { color: 0xffaa80, intensity: 0.6, position: [30, 40, 30] },
                point: { color: 0xff6b35, intensity: 0.4, position: [-5, 8, 5] }
            },
            cameraPosition: { x: 0, y: 4, z: 8 },
            fog: { color: 0x8b4513, near: 15, far: 40 },
            atmosphere: 'warm'
        },
        outdoor_garden: {
            name: 'Outdoor Garden',
            emoji: '🌳',
            backgroundColor: 0x87ceeb,
            groundColor: 0x228b22,
            lighting: { 
                ambient: { color: 0x606060, intensity: 0.8 },
                directional: { color: 0xffffcc, intensity: 1.0, position: [100, 100, 50] },
                point: { color: 0x98fb98, intensity: 0.2, position: [0, 5, 0] }
            },
            cameraPosition: { x: 0, y: 6, z: 12 },
            fog: { color: 0x87ceeb, near: 30, far: 80 },
            atmosphere: 'fresh'
        },
        party_venue: {
            name: 'Party Venue',
            emoji: '🎉',
            backgroundColor: 0x191970,
            groundColor: 0x4b0082,
            lighting: { 
                ambient: { color: 0x301040, intensity: 0.4 },
                directional: { color: 0xff69b4, intensity: 0.7, position: [0, 30, 0] },
                point: { color: 0x00ffff, intensity: 0.6, position: [0, 15, 0] }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x191970, near: 10, far: 30 },
            atmosphere: 'energetic'
        },
        zen_temple: {
            name: 'Zen Temple',
            emoji: '⛩️',
            backgroundColor: 0x2f4f4f,
            groundColor: 0x696969,
            lighting: { 
                ambient: { color: 0x404050, intensity: 0.5 },
                directional: { color: 0xf0f8ff, intensity: 0.6, position: [0, 80, 80] },
                point: { color: 0xffd700, intensity: 0.3, position: [0, 12, 0] }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x2f4f4f, near: 25, far: 60 },
            atmosphere: 'peaceful'
        },
        cyberpunk_city: {
            name: 'Cyberpunk City',
            emoji: '🌆',
            backgroundColor: 0x0a0a0a,
            groundColor: 0x1a1a1a,
            lighting: { 
                ambient: { color: 0x001122, intensity: 0.3 },
                directional: { color: 0x00ffff, intensity: 0.5, position: [-50, 30, 50] },
                point: { color: 0xff00ff, intensity: 0.8, position: [0, 20, 0] }
            },
            cameraPosition: { x: 0, y: 5, z: 10 },
            fog: { color: 0x001122, near: 15, far: 45 },
            atmosphere: 'futuristic'
        }
    },
    
    init: async function(containerId, scenePreset = 'modern_office') {
        if (this.isInitialized) return;
        
        console.log('🎬 Initializing Enhanced Scene Manager with ChatBubble Support');
        
        try {
            // Get container
            this.container = document.getElementById(containerId);
            if (!this.container) {
                throw new Error(`Container ${containerId} not found`);
            }
            
            // Create scene
            this.scene = new THREE.Scene();
            
            // Set up camera
            this.camera = new THREE.PerspectiveCamera(
                75, // Field of view
                this.container.clientWidth / this.container.clientHeight, // Aspect ratio
                0.1, // Near plane
                1000 // Far plane
            );
            
            // Create renderer with enhanced settings
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1;
            
            // Add renderer to container
            this.container.appendChild(this.renderer.domElement);
            
            // Apply scene preset
            this.applyPreset(scenePreset);
            
            // Add basic ground
            this.addGround();
            
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
            console.log('✅ Enhanced Scene Manager initialized with ChatBubble support');
            
            // CRITICAL: Emit event for ChatBubble system
            if (window.EventBus) {
                window.EventBus.emit('scene:initialized', {
                    scene: this.scene,
                    camera: this.camera,
                    renderer: this.renderer
                });
            }
            
        } catch (error) {
            console.error('❌ Scene Manager initialization failed:', error);
            throw error;
        }
    },
    
    applyPreset: function(presetName) {
        const preset = this.presets[presetName] || this.presets.modern_office;
        this.currentPreset = presetName;
        
        console.log(`🎨 Applying scene preset: ${preset.name}`);
        
        // Set background
        this.scene.background = new THREE.Color(preset.backgroundColor);
        
        // Clear existing lights
        this.clearLights();
        
        // Set up lighting based on preset
        this.setupLighting(preset.lighting);
        
        // Set camera position
        this.camera.position.set(
            preset.cameraPosition.x,
            preset.cameraPosition.y,
            preset.cameraPosition.z
        );
        this.camera.lookAt(0, 1, 0); // Look at avatar level
        
        // Update ground color
        this.updateGroundColor(preset.groundColor);
        
        // Add fog if specified
        if (preset.fog) {
            this.scene.fog = new THREE.Fog(
                preset.fog.color,
                preset.fog.near,
                preset.fog.far
            );
        } else {
            this.scene.fog = null;
        }
        
        // Create environment transition effect
        this.createTransitionEffect(preset);
        
        // Emit preset change event
        if (window.EventBus) {
            window.EventBus.emit('scene:preset-changed', {
                preset: presetName,
                config: preset
            });
        }
        
        console.log(`✅ Scene preset ${preset.name} applied successfully`);
    },
    
    setupLighting: function(lightingConfig) {
        // Ambient light
        if (lightingConfig.ambient) {
            const ambientLight = new THREE.AmbientLight(
                lightingConfig.ambient.color,
                lightingConfig.ambient.intensity
            );
            ambientLight.name = 'ambient';
            this.scene.add(ambientLight);
        }
        
        // Directional light
        if (lightingConfig.directional) {
            const directionalLight = new THREE.DirectionalLight(
                lightingConfig.directional.color,
                lightingConfig.directional.intensity
            );
            
            if (lightingConfig.directional.position) {
                directionalLight.position.set(...lightingConfig.directional.position);
            } else {
                directionalLight.position.set(50, 50, 50);
            }
            
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 500;
            directionalLight.shadow.camera.left = -50;
            directionalLight.shadow.camera.right = 50;
            directionalLight.shadow.camera.top = 50;
            directionalLight.shadow.camera.bottom = -50;
            directionalLight.name = 'directional';
            
            this.scene.add(directionalLight);
        }
        
        // Point light
        if (lightingConfig.point) {
            const pointLight = new THREE.PointLight(
                lightingConfig.point.color,
                lightingConfig.point.intensity,
                100
            );
            
            if (lightingConfig.point.position) {
                pointLight.position.set(...lightingConfig.point.position);
            } else {
                pointLight.position.set(0, 10, 0);
            }
            
            pointLight.name = 'point';
            this.scene.add(pointLight);
        }
    },
    
    clearLights: function() {
        const lightsToRemove = [];
        this.scene.traverse(child => {
            if (child.type === 'AmbientLight' || 
                child.type === 'DirectionalLight' || 
                child.type === 'PointLight' ||
                child.type === 'SpotLight') {
                lightsToRemove.push(child);
            }
        });
        
        lightsToRemove.forEach(light => {
            this.scene.remove(light);
        });
    },
    
    addGround: function() {
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x999999,
            transparent: true,
            opacity: 0.8
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
    
    setupCameraControls: function() {
        const container = this.container;
        if (!container) return;
        
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let cameraAngle = 0;
        let cameraHeight = 5;
        
        // Mouse controls
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
            
            cameraAngle += deltaX * 0.01;
            cameraHeight += deltaY * 0.02;
            cameraHeight = Math.max(2, Math.min(15, cameraHeight));
            
            const radius = 10;
            this.camera.position.x = Math.sin(cameraAngle) * radius;
            this.camera.position.z = Math.cos(cameraAngle) * radius;
            this.camera.position.y = cameraHeight;
            this.camera.lookAt(0, 1, 0);
            
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
        
        // Zoom with mouse wheel
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.5;
            const minDistance = 5;
            const maxDistance = 25;
            
            const direction = this.camera.position.clone().normalize();
            const distance = this.camera.position.length();
            
            let newDistance = distance + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
            newDistance = Math.max(minDistance, Math.min(maxDistance, newDistance));
            
            this.camera.position.copy(direction.multiplyScalar(newDistance));
            this.camera.lookAt(0, 1, 0);
        });
        
        // Touch controls for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        });
        
        container.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - touchStartX;
                const deltaY = e.touches[0].clientY - touchStartY;
                
                cameraAngle += deltaX * 0.01;
                cameraHeight += deltaY * 0.02;
                cameraHeight = Math.max(2, Math.min(15, cameraHeight));
                
                const radius = 10;
                this.camera.position.x = Math.sin(cameraAngle) * radius;
                this.camera.position.z = Math.cos(cameraAngle) * radius;
                this.camera.position.y = cameraHeight;
                this.camera.lookAt(0, 1, 0);
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }
        });
        
        // Set initial cursor
        container.style.cursor = 'grab';
    },
    
    createTransitionEffect: function(preset) {
        // Create smooth transition particles
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: preset.backgroundColor,
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            particle.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 10,
                (Math.random() - 0.5) * 20
            );
            
            this.scene.add(particle);
            
            // Animate particle
            let phase = 0;
            const animateParticle = () => {
                phase += 0.05;
                particle.position.y += 0.02;
                particle.material.opacity = 0.6 - (phase / 4);
                particle.scale.setScalar(1 + phase);
                
                if (phase < 4) {
                    requestAnimationFrame(animateParticle);
                } else {
                    this.scene.remove(particle);
                }
            };
            
            // Stagger animations
            setTimeout(() => {
                requestAnimationFrame(animateParticle);
            }, i * 100);
        }
    },
    
    animate: function() {
        requestAnimationFrame(() => this.animate());
        
        // Update performance counter
        if (window.Euphorie && window.Euphorie.performance) {
            window.Euphorie.performance.frameCount++;
        }
        
        // Render the scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        
        // Emit frame event for other systems
        if (window.EventBus) {
            window.EventBus.emit('scene:frame', {
                scene: this.scene,
                camera: this.camera,
                frameCount: window.Euphorie?.performance?.frameCount || 0
            });
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
        
        console.log(`📱 Scene resized to ${width}x${height}`);
    },
    
    // Enhanced object management
    addObject: function(object, name = null) {
        if (name) object.name = name;
        this.scene.add(object);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('scene:object-added', { object, name });
        }
    },
    
    removeObject: function(object) {
        this.scene.remove(object);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('scene:object-removed', { object });
        }
    },
    
    getObjectByName: function(name) {
        return this.scene.getObjectByName(name);
    },
    
    // CRITICAL: ChatBubble system utilities
    getCameraFrustum: function() {
        if (!this.camera) return null;
        
        try {
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(
                this.camera.projectionMatrix,
                this.camera.matrixWorldInverse
            );
            frustum.setFromProjectionMatrix(matrix);
            return frustum;
        } catch (error) {
            console.warn('Error creating camera frustum:', error);
            return null;
        }
    },
    
    // CRITICAL: Check if position is visible for ChatBubble culling
    isPositionVisible: function(position, margin = 5) {
        try {
            const frustum = this.getCameraFrustum();
            if (!frustum) return true; // If we can't determine, assume visible
            
            const sphere = new THREE.Sphere(position, margin);
            return frustum.intersectsSphere(sphere);
        } catch (error) {
            console.warn('Error checking position visibility:', error);
            return true; // If error, assume visible for safety
        }
    },
    
    // CRITICAL: Get distance from camera for ChatBubble LOD
    getDistanceFromCamera: function(position) {
        try {
            if (!this.camera || !position) return 0;
            return this.camera.position.distanceTo(position);
        } catch (error) {
            console.warn('Error calculating distance from camera:', error);
            return 0;
        }
    },
    
    // Enhanced raycasting for object selection
    raycastFromCamera: function(mousePosition, objects = null) {
        try {
            if (!this.camera) return [];
            
            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();
            
            // Convert mouse position to normalized device coordinates
            const rect = this.container.getBoundingClientRect();
            mouse.x = ((mousePosition.x - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((mousePosition.y - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, this.camera);
            
            const targetObjects = objects || this.scene.children;
            return raycaster.intersectObjects(targetObjects, true);
        } catch (error) {
            console.warn('Error in raycasting:', error);
            return [];
        }
    },
    
    // Camera utilities
    getCameraPosition: function() {
        return this.camera ? this.camera.position.clone() : new THREE.Vector3();
    },
    
    setCameraPosition: function(x, y, z) {
        if (this.camera) {
            this.camera.position.set(x, y, z);
        }
    },
    
    focusOnObject: function(object, distance = 5) {
        if (!this.camera || !object) return;
        
        try {
            const objectPosition = object.position.clone();
            const direction = this.camera.position.clone().sub(objectPosition).normalize();
            this.camera.position.copy(objectPosition.add(direction.multiplyScalar(distance)));
            this.camera.lookAt(objectPosition);
        } catch (error) {
            console.warn('Error focusing on object:', error);
        }
    },
    
    // Enhanced scene querying for ChatBubbles
    findObjectsByType: function(type) {
        const objects = [];
        try {
            this.scene.traverse(child => {
                if (child.userData?.type === type) {
                    objects.push(child);
                }
            });
        } catch (error) {
            console.warn('Error finding objects by type:', error);
        }
        return objects;
    },
    
    findAvatars: function() {
        return this.findObjectsByType('avatar');
    },
    
    findChatBubbles: function() {
        return this.findObjectsByType('chatBubble');
    },
    
    // Performance utilities
    getStats: function() {
        try {
            return {
                objects: this.scene ? this.scene.children.length : 0,
                triangles: this.renderer ? this.renderer.info.render.triangles : 0,
                calls: this.renderer ? this.renderer.info.render.calls : 0,
                memory: this.renderer ? this.renderer.info.memory : {},
                isInitialized: this.isInitialized,
                currentPreset: this.currentPreset
            };
        } catch (error) {
            console.warn('Error getting scene stats:', error);
            return {
                objects: 0,
                triangles: 0,
                calls: 0,
                memory: {},
                isInitialized: this.isInitialized,
                currentPreset: this.currentPreset
            };
        }
    },
    
    // Enhanced lighting utilities
    updateLighting: function(lightingConfig) {
        try {
            this.clearLights();
            this.setupLighting(lightingConfig);
            console.log('🔆 Lighting updated');
        } catch (error) {
            console.error('Error updating lighting:', error);
        }
    },
    
    // Scene optimization
    optimizeScene: function() {
        try {
            let optimizations = 0;
            
            // Remove invisible objects
            const objectsToRemove = [];
            this.scene.traverse(child => {
                if (child.visible === false && child.parent) {
                    objectsToRemove.push(child);
                }
            });
            
            objectsToRemove.forEach(obj => {
                this.scene.remove(obj);
                optimizations++;
            });
            
            // Force garbage collection of unused resources
            if (this.renderer) {
                this.renderer.renderLists.dispose();
            }
            
            console.log(`🎯 Scene optimized: ${optimizations} objects removed`);
            return optimizations;
        } catch (error) {
            console.warn('Error optimizing scene:', error);
            return 0;
        }
    },
    
    // Preset utilities
    getCurrentPreset: function() {
        return this.currentPreset;
    },
    
    getAvailablePresets: function() {
        return Object.keys(this.presets);
    },
    
    getPresetInfo: function(presetName) {
        return this.presets[presetName] || null;
    },
    
    // Enhanced preset changing with smooth transitions
    changePreset: function(presetName, animated = true) {
        try {
            if (!this.presets[presetName]) {
                console.warn(`Unknown preset: ${presetName}`);
                return false;
            }
            
            if (animated) {
                // Create transition effect first
                this.createTransitionEffect(this.presets[presetName]);
                
                // Apply preset after short delay
                setTimeout(() => {
                    this.applyPreset(presetName);
                }, 500);
            } else {
                this.applyPreset(presetName);
            }
            
            return true;
        } catch (error) {
            console.error('Error changing preset:', error);
            return false;
        }
    },
    
    // Debugging utilities
    debugScene: function() {
        console.log('🎬 SceneManager Debug Info:');
        console.log('- Initialized:', this.isInitialized);
        console.log('- Current preset:', this.currentPreset);
        console.log('- Objects in scene:', this.scene ? this.scene.children.length : 0);
        console.log('- Camera position:', this.getCameraPosition());
        console.log('- Renderer info:', this.getStats());
        
        if (this.scene) {
            console.log('- Scene children:');
            this.scene.children.forEach((child, index) => {
                console.log(`  ${index}: ${child.name || child.type} (${child.constructor.name})`);
            });
        }
        
        return this.getStats();
    },
    
    // Cleanup and disposal
    dispose: function() {
        try {
            console.log('🧹 Disposing SceneManager...');
            
            // Remove event listeners
            window.removeEventListener('resize', this.onWindowResize);
            
            // Dispose of all scene objects
            if (this.scene) {
                this.scene.traverse(child => {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
                this.scene.clear();
            }
            
            // Dispose renderer
            if (this.renderer) {
                this.renderer.dispose();
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
            }
            
            // Clear references
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.container = null;
            this.isInitialized = false;
            
            console.log('✅ SceneManager disposed successfully');
        } catch (error) {
            console.error('Error disposing SceneManager:', error);
        }
    }
};

console.log('🎬✨ Enhanced SceneManager with complete ChatBubble integration loaded');