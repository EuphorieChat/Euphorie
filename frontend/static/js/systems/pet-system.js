// Advanced Pet System - Virtual companions that follow and interact with avatars
// Features: 8 pet types, AI behaviors, interactions, customization, emotions

window.PetSystem = {
    isInitialized: false,
    activePets: new Map(),
    petAnimations: new Map(),
    interactionCooldowns: new Map(),
    
    // Enhanced pet configurations with personalities and behaviors
    petTypes: {
        cat: {
            name: 'Cat',
            emoji: '🐱',
            size: 0.3,
            speed: 2.0,
            followDistance: 1.5,
            animations: ['idle', 'walking', 'playing', 'sleeping', 'excited', 'stretching'],
            sounds: ['meow', 'purr', 'hiss'],
            personality: 'independent',
            traits: ['curious', 'playful', 'moody'],
            colors: ['#FFA500', '#8B4513', '#000000', '#FFFFFF', '#808080', '#CD853F'],
            interactions: ['rub_against', 'purr', 'play_with_yarn', 'nap'],
            favoriteActivities: ['sunbathing', 'hunting', 'grooming'],
            energyDecay: 1.5,
            happinessDecay: 1.0
        },
        dog: {
            name: 'Dog',
            emoji: '🐶',
            size: 0.4,
            speed: 2.5,
            followDistance: 2.0,
            animations: ['idle', 'walking', 'running', 'sitting', 'excited', 'playing', 'barking'],
            sounds: ['bark', 'whine', 'pant'],
            personality: 'loyal',
            traits: ['faithful', 'energetic', 'protective'],
            colors: ['#8B4513', '#D2691E', '#000000', '#FFFFFF', '#DAA520', '#BC8F8F'],
            interactions: ['fetch', 'sit', 'roll_over', 'shake_hands'],
            favoriteActivities: ['playing_fetch', 'running', 'guarding'],
            energyDecay: 2.0,
            happinessDecay: 0.8
        },
        bird: {
            name: 'Bird',
            emoji: '🐦',
            size: 0.15,
            speed: 3.0,
            followDistance: 3.0,
            animations: ['flying', 'perched', 'singing', 'preening', 'flapping'],
            sounds: ['chirp', 'tweet', 'whistle'],
            personality: 'free_spirited',
            traits: ['musical', 'social', 'agile'],
            colors: ['#FF4500', '#00FF00', '#0000FF', '#FFFF00', '#FF69B4', '#9370DB'],
            interactions: ['sing_song', 'fly_around', 'land_on_shoulder', 'mimic_sounds'],
            favoriteActivities: ['singing', 'flying', 'socializing'],
            canFly: true,
            energyDecay: 1.2,
            happinessDecay: 1.3
        },
        rabbit: {
            name: 'Rabbit',
            emoji: '🐰',
            size: 0.25,
            speed: 1.8,
            followDistance: 1.2,
            animations: ['idle', 'hopping', 'eating', 'sleeping', 'thumping'],
            sounds: ['squeak', 'thump'],
            personality: 'timid',
            traits: ['gentle', 'quick', 'alert'],
            colors: ['#FFFFFF', '#8B4513', '#808080', '#000000', '#F5DEB3'],
            interactions: ['hop_around', 'nibble_food', 'thump_warning', 'cuddle'],
            favoriteActivities: ['eating', 'hopping', 'hiding'],
            energyDecay: 1.0,
            happinessDecay: 1.2
        },
        fox: {
            name: 'Fox',
            emoji: '🦊',
            size: 0.35,
            speed: 2.2,
            followDistance: 1.8,
            animations: ['idle', 'walking', 'sneaking', 'playing', 'hunting'],
            sounds: ['yip', 'bark'],
            personality: 'clever',
            traits: ['intelligent', 'mischievous', 'adaptive'],
            colors: ['#FF4500', '#8B4513', '#FFFFFF', '#CD853F'],
            interactions: ['sneak_around', 'pounce_play', 'investigate', 'hide_and_seek'],
            favoriteActivities: ['exploring', 'hunting', 'playing_tricks'],
            energyDecay: 1.3,
            happinessDecay: 1.1
        },
        dragon: {
            name: 'Baby Dragon',
            emoji: '🐲',
            size: 0.5,
            speed: 1.5,
            followDistance: 2.5,
            animations: ['idle', 'flying', 'breathing_fire', 'sleeping', 'roaring'],
            sounds: ['roar', 'purr', 'whoosh'],
            personality: 'magical',
            traits: ['powerful', 'ancient', 'wise'],
            colors: ['#FF0000', '#00FF00', '#0000FF', '#800080', '#FFD700', '#DC143C'],
            interactions: ['breathe_fire', 'fly_majestically', 'guard_treasure', 'magic_sparkles'],
            favoriteActivities: ['flying', 'magic', 'guarding'],
            canFly: true,
            magical: true,
            energyDecay: 0.8,
            happinessDecay: 0.9
        },
        hamster: {
            name: 'Hamster',
            emoji: '🐹',
            size: 0.12,
            speed: 1.5,
            followDistance: 0.8,
            animations: ['idle', 'running', 'eating', 'sleeping', 'wheel_running'],
            sounds: ['squeak', 'chatter'],
            personality: 'busy',
            traits: ['active', 'tiny', 'curious'],
            colors: ['#D2691E', '#FFFFFF', '#808080', '#F5DEB3'],
            interactions: ['run_in_wheel', 'stuff_cheeks', 'burrow', 'exercise'],
            favoriteActivities: ['running', 'eating', 'exploring'],
            energyDecay: 2.5,
            happinessDecay: 1.4
        },
        unicorn: {
            name: 'Unicorn',
            emoji: '🦄',
            size: 0.6,
            speed: 2.8,
            followDistance: 3.0,
            animations: ['idle', 'galloping', 'rearing', 'magic_healing', 'rainbow_aura'],
            sounds: ['neigh', 'magical_chime'],
            personality: 'mystical',
            traits: ['pure', 'healing', 'majestic'],
            colors: ['#FFFFFF', '#FFB6C1', '#E6E6FA', '#F0E68C', '#98FB98'],
            interactions: ['heal_magic', 'rainbow_trail', 'blessing', 'purify_area'],
            favoriteActivities: ['healing', 'blessing', 'creating_rainbows'],
            canFly: false,
            magical: true,
            energyDecay: 0.5,
            happinessDecay: 0.6,
            special: 'healing_powers'
        }
    },

    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🐾 Initializing Advanced Pet System');
        
        try {
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize pet AI update loop
            this.startGlobalPetAI();
            
            // Set up keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            this.isInitialized = true;
            console.log('✅ Advanced Pet System initialized');
            
            // Emit initialization event
            if (window.EventBus) {
                window.EventBus.emit('pet_system:initialized');
            }
            
        } catch (error) {
            console.error('❌ Pet System initialization failed:', error);
        }
    },

    setupEventListeners: function() {
        if (!window.EventBus) return;
        
        // Listen for avatar events
        window.EventBus.on('avatar:created', (data) => {
            // 30% chance to auto-assign a pet to new avatars
            if (Math.random() > 0.7) {
                setTimeout(() => {
                    this.assignRandomPet(data.id);
                }, 2000);
            }
        });
        
        window.EventBus.on('avatar:removed', (data) => {
            this.removePetsForOwner(data.id);
        });
        
        window.EventBus.on('avatar:moved', (data) => {
            this.updatePetsForOwner(data.id);
        });
        
        window.EventBus.on('emotion:triggered', (data) => {
            this.reactToOwnerEmotion(data.userId, data.emotion);
        });
        
        console.log('🔗 Pet system event listeners configured');
    },

    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea')) return;
            
            switch(e.key.toLowerCase()) {
                case 'p':
                    e.preventDefault();
                    this.assignRandomPet('default');
                    break;
                case 'shift':
                    if (e.shiftKey && e.key === 'P') {
                        e.preventDefault();
                        this.showPetManagementPanel();
                    }
                    break;
            }
        });
        
        console.log('⌨️ Pet system keyboard shortcuts active');
    },

    createPet: function(ownerId, petType, options = {}) {
        if (!this.petTypes[petType]) {
            console.error('❌ Unknown pet type:', petType);
            return null;
        }

        const petConfig = this.petTypes[petType];
        const petId = `pet_${ownerId}_${Date.now()}`;
        
        // Enhanced pet options with personality
        const defaultOptions = {
            name: options.name || this.generatePetName(petType),
            color: options.color || petConfig.colors[Math.floor(Math.random() * petConfig.colors.length)],
            personality: options.personality || petConfig.personality,
            level: options.level || 1,
            happiness: options.happiness || 100,
            energy: options.energy || 100,
            hunger: options.hunger || 100,
            health: options.health || 100,
            affection: options.affection || 50,
            experience: options.experience || 0,
            traits: options.traits || [...petConfig.traits],
            mood: 'content'
        };

        // Create enhanced 3D model
        const petGroup = new THREE.Group();
        const petMesh = this.createAdvancedPetMesh(petType, defaultOptions);
        petGroup.add(petMesh);

        // Create animated name label
        const nameLabel = this.createAnimatedNameLabel(defaultOptions.name, petConfig.emoji);
        nameLabel.position.y = petConfig.size + 0.4;
        petGroup.add(nameLabel);

        // Create status indicators
        const statusIndicators = this.createStatusIndicators();
        statusIndicators.position.y = petConfig.size + 0.7;
        petGroup.add(statusIndicators);

        // Position pet near owner
        this.positionPetNearOwner(petGroup, ownerId);

        // Create comprehensive pet data
        const petData = {
            id: petId,
            ownerId: ownerId,
            type: petType,
            config: petConfig,
            options: defaultOptions,
            group: petGroup,
            mesh: petMesh,
            nameLabel: nameLabel,
            statusIndicators: statusIndicators,
            
            // Enhanced AI State
            currentAction: 'idle',
            actionStartTime: Date.now(),
            targetPosition: petGroup.position.clone(),
            lastActionTime: Date.now(),
            nextActionTime: Date.now() + this.getRandomActionDelay(),
            
            // Advanced Movement
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            isMoving: false,
            pathNodes: [],
            currentPathIndex: 0,
            
            // Interaction System
            lastInteractionTime: 0,
            interactionCooldown: 5000,
            availableInteractions: [...petConfig.interactions],
            
            // Status & Needs
            happiness: defaultOptions.happiness,
            energy: defaultOptions.energy,
            hunger: defaultOptions.hunger,
            health: defaultOptions.health,
            affection: defaultOptions.affection,
            mood: defaultOptions.mood,
            
            // Experience & Growth
            level: defaultOptions.level,
            experience: defaultOptions.experience,
            skillPoints: 0,
            
            // Social
            friendships: new Map(),
            socialInteractions: 0,
            
            // Timestamps
            lastUpdate: Date.now(),
            createdAt: Date.now(),
            lastFed: Date.now(),
            lastPlayed: Date.now()
        };

        // Store pet
        this.activePets.set(petId, petData);

        // Add to scene
        if (window.SceneManager && window.SceneManager.scene) {
            window.SceneManager.addObject(petGroup);
        }

        // Initialize pet-specific behaviors
        this.initializePetBehavior(petData);
        
        console.log(`🐾 Created ${petType}: ${defaultOptions.name} for ${ownerId}`);
        
        // Create spawn effect
        this.createPetSpawnEffect(petData);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('pet:created', petData);
        }
        
        // Update UI
        this.updatePetUI();

        return petData;
    },

    createAdvancedPetMesh: function(petType, options) {
        const config = this.petTypes[petType];
        const color = new THREE.Color(options.color);
        
        switch(petType) {
            case 'cat':
                return this.createCatMesh(color, config.size, options);
            case 'dog':
                return this.createDogMesh(color, config.size, options);
            case 'bird':
                return this.createBirdMesh(color, config.size, options);
            case 'rabbit':
                return this.createRabbitMesh(color, config.size, options);
            case 'fox':
                return this.createFoxMesh(color, config.size, options);
            case 'dragon':
                return this.createDragonMesh(color, config.size, options);
            case 'hamster':
                return this.createHamsterMesh(color, config.size, options);
            case 'unicorn':
                return this.createUnicornMesh(color, config.size, options);
            default:
                return this.createGenericPetMesh(color, config.size);
        }
    },

    createCatMesh: function(color, size, options) {
        const group = new THREE.Group();
        
        // Enhanced cat with detailed features
        const bodyGeometry = new THREE.SphereGeometry(size * 0.8, 16, 12);
        bodyGeometry.scale(1.3, 0.9, 1.1);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.95
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Head with expressive features
        const headGeometry = new THREE.SphereGeometry(size * 0.65, 16, 12);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, size * 0.4, size * 0.9);
        head.castShadow = true;
        group.add(head);

        // Detailed ears
        const earGeometry = new THREE.ConeGeometry(size * 0.25, size * 0.4, 6);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-size * 0.35, size * 0.8, size * 0.9);
        leftEar.rotation.z = 0.3;
        group.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(size * 0.35, size * 0.8, size * 0.9);
        rightEar.rotation.z = -0.3;
        group.add(rightEar);

        // Expressive eyes
        const eyeGeometry = new THREE.SphereGeometry(size * 0.08, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-size * 0.2, size * 0.5, size * 1.2);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(size * 0.2, size * 0.5, size * 1.2);
        group.add(rightEye);

        // Animated tail
        const tailGeometry = new THREE.CylinderGeometry(size * 0.08, size * 0.04, size * 1.8, 8);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, size * 0.4, -size * 0.9);
        tail.rotation.x = -0.6;
        tail.castShadow = true;
        group.add(tail);

        // Whiskers
        const whiskerMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        for (let i = 0; i < 6; i++) {
            const whiskerGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3((i % 2 === 0 ? 1 : -1) * size * 0.5, 0, 0)
            ]);
            const whisker = new THREE.Line(whiskerGeometry, whiskerMaterial);
            whisker.position.set(0, size * 0.35 + (i - 3) * size * 0.05, size * 1.1);
            group.add(whisker);
        }

        // Store animation parts
        group.userData.animationParts = {
            body, head, tail, ears: [leftEar, rightEar], 
            eyes: [leftEye, rightEye], whiskers: group.children.slice(-6)
        };
        
        return group;
    },

    createDogMesh: function(color, size, options) {
        const group = new THREE.Group();
        
        // Dog body with breed characteristics
        const bodyGeometry = new THREE.SphereGeometry(size * 0.9, 16, 12);
        bodyGeometry.scale(1.5, 1.0, 1.2);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.95
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Head with snout
        const headGeometry = new THREE.SphereGeometry(size * 0.75, 16, 12);
        headGeometry.scale(1.3, 1.1, 1.4);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, size * 0.3, size * 1.2);
        head.castShadow = true;
        group.add(head);

        // Floppy ears
        const earGeometry = new THREE.SphereGeometry(size * 0.35, 12, 8);
        earGeometry.scale(0.6, 1.3, 0.4);
        const leftEar = new THREE.Mesh(earGeometry, bodyMaterial);
        leftEar.position.set(-size * 0.45, size * 0.7, size * 1.2);
        leftEar.rotation.z = 0.6;
        group.add(leftEar);

        const rightEar = new THREE.Mesh(earGeometry, bodyMaterial);
        rightEar.position.set(size * 0.45, size * 0.7, size * 1.2);
        rightEar.rotation.z = -0.6;
        group.add(rightEar);

        // Nose
        const noseGeometry = new THREE.SphereGeometry(size * 0.06, 8, 8);
        const noseMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, size * 0.25, size * 1.55);
        group.add(nose);

        // Wagging tail
        const tailGeometry = new THREE.CylinderGeometry(size * 0.1, size * 0.15, size * 1.4, 8);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, size * 0.5, -size * 1.1);
        tail.rotation.x = 0.7;
        tail.castShadow = true;
        group.add(tail);

        // Legs
        const legGeometry = new THREE.CylinderGeometry(size * 0.08, size * 0.1, size * 0.6, 8);
        const legPositions = [
            { x: -size * 0.4, z: size * 0.6 },
            { x: size * 0.4, z: size * 0.6 },
            { x: -size * 0.4, z: -size * 0.3 },
            { x: size * 0.4, z: -size * 0.3 }
        ];

        const legs = [];
        legPositions.forEach((pos, i) => {
            const leg = new THREE.Mesh(legGeometry, bodyMaterial);
            leg.position.set(pos.x, -size * 0.3, pos.z);
            leg.castShadow = true;
            legs.push(leg);
            group.add(leg);
        });

        group.userData.animationParts = {
            body, head, tail, ears: [leftEar, rightEar], 
            nose, legs
        };
        
        return group;
    },

    createBirdMesh: function(color, size, options) {
        const group = new THREE.Group();
        
        // Bird body
        const bodyGeometry = new THREE.SphereGeometry(size * 0.7, 12, 8);
        bodyGeometry.scale(1.0, 1.2, 1.4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.95
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(size * 0.45, 12, 8);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, size * 0.4, size * 0.8);
        head.castShadow = true;
        group.add(head);

        // Beak
        const beakGeometry = new THREE.ConeGeometry(size * 0.08, size * 0.25, 6);
        const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xFFA500 });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, size * 0.35, size * 1.05);
        beak.rotation.x = Math.PI / 2;
        group.add(beak);

        // Wings with feather details
        const wingGeometry = new THREE.SphereGeometry(size * 0.5, 8, 6);
        wingGeometry.scale(0.4, 1.2, 2.2);
        
        const leftWing = new THREE.Mesh(wingGeometry, bodyMaterial);
        leftWing.position.set(-size * 0.6, size * 0.1, 0);
        leftWing.rotation.z = 0.3;
        group.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeometry, bodyMaterial);
        rightWing.position.set(size * 0.6, size * 0.1, 0);
        rightWing.rotation.z = -0.3;
        group.add(rightWing);

        // Tail feathers
        const tailGeometry = new THREE.SphereGeometry(size * 0.3, 8, 6);
        tailGeometry.scale(0.3, 1.0, 2.0);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.set(0, size * 0.2, -size * 0.9);
        tail.rotation.x = 0.3;
        group.add(tail);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(size * 0.06, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-size * 0.15, size * 0.5, size * 0.95);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(size * 0.15, size * 0.5, size * 0.95);
        group.add(rightEye);

        group.userData.animationParts = {
            body, head, wings: [leftWing, rightWing], 
            beak, tail, eyes: [leftEye, rightEye]
        };
        
        return group;
    },

    createUnicornMesh: function(color, size, options) {
        const group = new THREE.Group();
        
        // Majestic unicorn body
        const bodyGeometry = new THREE.SphereGeometry(size * 1.0, 16, 12);
        bodyGeometry.scale(1.6, 1.1, 1.3);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.9,
            emissive: new THREE.Color(color).multiplyScalar(0.1)
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        group.add(body);

        // Noble head
        const headGeometry = new THREE.SphereGeometry(size * 0.7, 16, 12);
        headGeometry.scale(1.2, 1.0, 1.5);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, size * 0.4, size * 1.4);
        head.castShadow = true;
        group.add(head);

        // Magical horn
        const hornGeometry = new THREE.ConeGeometry(size * 0.08, size * 0.8, 8);
        const hornMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFD700,
            emissive: 0x444400
        });
        const horn = new THREE.Mesh(hornGeometry, hornMaterial);
        horn.position.set(0, size * 0.9, size * 1.5);
        horn.rotation.x = 0.2;
        group.add(horn);

        // Flowing mane
        const maneGeometry = new THREE.SphereGeometry(size * 0.4, 12, 8);
        maneGeometry.scale(0.8, 1.5, 0.6);
        const maneMaterial = new THREE.MeshLambertMaterial({ 
            color: new THREE.Color().setHSL((color.getHSL({}).h + 0.1) % 1, 0.8, 0.7),
            transparent: true,
            opacity: 0.8
        });
        const mane = new THREE.Mesh(maneGeometry, maneMaterial);
        mane.position.set(0, size * 0.7, size * 1.0);
        group.add(mane);

        // Elegant tail
        const tailGeometry = new THREE.SphereGeometry(size * 0.3, 12, 8);
        tailGeometry.scale(0.6, 2.0, 0.6);
        const tail = new THREE.Mesh(tailGeometry, maneMaterial);
        tail.position.set(0, size * 0.3, -size * 1.2);
        tail.rotation.x = 0.3;
        group.add(tail);

        // Magical aura
        const auraGeometry = new THREE.SphereGeometry(size * 1.5, 16, 12);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        group.add(aura);

        group.userData.animationParts = {
            body, head, horn, mane, tail, aura
        };
        
        return group;
    },

    // Additional mesh creation methods for other pet types...
    createRabbitMesh: function(color, size, options) {
        // Implementation similar to above but with rabbit-specific features
        return this.createGenericPetMesh(color, size);
    },

    createFoxMesh: function(color, size, options) {
        // Implementation similar to above but with fox-specific features
        return this.createGenericPetMesh(color, size);
    },

    createDragonMesh: function(color, size, options) {
        // Implementation similar to above but with dragon-specific features
        return this.createGenericPetMesh(color, size);
    },

    createHamsterMesh: function(color, size, options) {
        // Implementation similar to above but with hamster-specific features
        return this.createGenericPetMesh(color, size);
    },

    createGenericPetMesh: function(color, size) {
        const geometry = new THREE.SphereGeometry(size, 16, 12);
        const material = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    },

    createAnimatedNameLabel: function(name, emoji) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 40;
        
        // Enhanced label design
        const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(40, 40, 60, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Border
        context.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        context.lineWidth = 2;
        context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
        
        // Text
        context.fillStyle = '#FFD700';
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.fillText(`${emoji} ${name}`, canvas.width / 2, canvas.height / 2 + 6);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            alphaTest: 0.1
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 0.4, 1);
        
        return sprite;
    },

    createStatusIndicators: function() {
        const group = new THREE.Group();
        
        // Health bar
        const healthBar = this.createStatusBar(0x00ff00, 'health');
        healthBar.position.x = -0.5;
        group.add(healthBar);
        
        // Energy bar
        const energyBar = this.createStatusBar(0xffff00, 'energy');
        energyBar.position.x = 0;
        group.add(energyBar);
        
        // Happiness bar
        const happinessBar = this.createStatusBar(0xff69b4, 'happiness');
        happinessBar.position.x = 0.5;
        group.add(happinessBar);
        
        group.userData.bars = { healthBar, energyBar, happinessBar };
        return group;
    },

    createStatusBar: function(color, type) {
        const group = new THREE.Group();
        
        // Background
        const bgGeometry = new THREE.PlaneGeometry(0.15, 0.03);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.7
        });
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        group.add(background);
        
        // Fill
        const fillGeometry = new THREE.PlaneGeometry(0.14, 0.02);
        const fillMaterial = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        const fill = new THREE.Mesh(fillGeometry, fillMaterial);
        fill.position.z = 0.001;
        group.add(fill);
        
        group.userData.fill = fill;
        group.userData.type = type;
        group.userData.maxWidth = 0.14;
        
        return group;
    },

    positionPetNearOwner: function(petGroup, ownerId) {
        const owner = window.AvatarSystem?.getAvatar(ownerId);
        if (owner) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 1.5 + Math.random() * 1.0;
            petGroup.position.copy(owner.group.position);
            petGroup.position.x += Math.cos(angle) * distance;
            petGroup.position.z += Math.sin(angle) * distance;
        } else {
            // Default position
            petGroup.position.set(
                (Math.random() - 0.5) * 4,
                0,
                (Math.random() - 0.5) * 4
            );
        }
    },

    initializePetBehavior: function(petData) {
        // Set initial random behavior
        petData.mood = this.calculateMood(petData);
        petData.nextActionTime = Date.now() + this.getRandomActionDelay();
        
        // Initialize friendship system
        this.initializeFriendships(petData);
        
        console.log(`🧠 Initialized behavior for ${petData.options.name}`);
    },

    startGlobalPetAI: function() {
        const updateInterval = 100; // 10 FPS for AI updates
        
        const aiLoop = () => {
            if (!this.isInitialized) return;
            
            const now = Date.now();
            
            // Update all active pets
            for (const [petId, petData] of this.activePets) {
                try {
                    this.updatePetAI(petData, now);
                } catch (error) {
                    console.error(`Error updating pet ${petId}:`, error);
                }
            }
            
            // Schedule next update
            setTimeout(aiLoop, updateInterval);
        };
        
        // Start the AI loop
        aiLoop();
        console.log('🤖 Global Pet AI started');
    },

    updatePetAI: function(petData, now) {
        // Update pet status
        this.updatePetStatus(petData, now);
        
        // Update mood based on current status
        petData.mood = this.calculateMood(petData);
        
        // Decide next action if needed
        if (now >= petData.nextActionTime) {
            this.decidePetAction(petData, now);
        }
        
        // Execute current action
        this.executePetAction(petData, now);
        
        // Update animations
        this.updatePetAnimations(petData, now);
        
        // Update status indicators
        this.updateStatusIndicators(petData);
        
        petData.lastUpdate = now;
    },

    updatePetStatus: function(petData, now) {
        const timeDelta = (now - petData.lastUpdate) / 60000; // Minutes
        const config = petData.config;
        
        // Decay status based on pet type
        petData.energy = Math.max(0, petData.energy - (config.energyDecay * timeDelta));
        petData.happiness = Math.max(0, petData.happiness - (config.happinessDecay * timeDelta));
        petData.hunger = Math.max(0, petData.hunger - (1.5 * timeDelta));
        
        // Special needs based on personality
        if (config.personality === 'social' && petData.socialInteractions === 0) {
            petData.happiness = Math.max(0, petData.happiness - (2.0 * timeDelta));
        }
        
        // Health affected by other stats
        if (petData.hunger < 20 || petData.happiness < 20) {
            petData.health = Math.max(0, petData.health - (0.5 * timeDelta));
        }
        
        // Regeneration during rest
        if (petData.currentAction === 'sleeping' || petData.currentAction === 'resting') {
            petData.energy = Math.min(100, petData.energy + (10 * timeDelta));
            petData.health = Math.min(100, petData.health + (2 * timeDelta));
        }
        
        // Gain experience over time
        petData.experience += Math.floor(timeDelta * 5);
        
        // Level up system
        const expNeeded = petData.level * 100;
        if (petData.experience >= expNeeded) {
            this.levelUpPet(petData);
        }
    },

    calculateMood: function(petData) {
        const avgStatus = (petData.happiness + petData.energy + petData.health + petData.hunger) / 4;
        
        if (avgStatus >= 80) return 'ecstatic';
        if (avgStatus >= 60) return 'happy';
        if (avgStatus >= 40) return 'content';
        if (avgStatus >= 20) return 'sad';
        return 'depressed';
    },

    decidePetAction: function(petData, now) {
        const config = petData.config;
        const owner = window.AvatarSystem?.getAvatar(petData.ownerId);
        
        let possibleActions = ['idle'];
        
        // Distance to owner affects available actions
        const ownerDistance = owner ? 
            petData.group.position.distanceTo(owner.group.position) : Infinity;
        
        // Follow owner if too far
        if (ownerDistance > config.followDistance * 2) {
            possibleActions = ['following'];
        } else if (ownerDistance > config.followDistance) {
            possibleActions.push('following');
        }
        
        // Actions based on energy level
        if (petData.energy > 60) {
            possibleActions.push('exploring', 'playing');
            
            if (config.canFly) {
                possibleActions.push('flying');
            }
            
            if (config.magical) {
                possibleActions.push('casting_magic');
            }
        }
        
        // Rest actions when tired or low health
        if (petData.energy < 30 || petData.health < 50) {
            possibleActions.push('resting');
        }
        
        if (petData.energy < 15) {
            possibleActions.push('sleeping');
        }
        
        // Hunger-related actions
        if (petData.hunger < 40) {
            possibleActions.push('seeking_food');
        }
        
        // Social actions
        if (this.canInteractWithOwner(petData, owner, now)) {
            possibleActions.push('interacting');
        }
        
        // Mood-based actions
        switch(petData.mood) {
            case 'ecstatic':
                possibleActions.push('celebrating', 'showing_off');
                break;
            case 'happy':
                possibleActions.push('playing', 'socializing');
                break;
            case 'sad':
                possibleActions.push('seeking_comfort');
                break;
        }
        
        // Select weighted random action
        const selectedAction = this.selectWeightedAction(possibleActions, petData);
        
        petData.currentAction = selectedAction;
        petData.actionStartTime = now;
        petData.lastActionTime = now;
        petData.nextActionTime = now + this.getActionDuration(selectedAction, petData);
        
        console.log(`🐾 ${petData.options.name} decided: ${selectedAction} (mood: ${petData.mood})`);
    },

    selectWeightedAction: function(actions, petData) {
        // Weight actions based on personality and current needs
        const weights = new Map();
        
        actions.forEach(action => {
            let weight = 1;
            
            // Personality-based weights
            switch(petData.config.personality) {
                case 'playful':
                    if (action === 'playing') weight *= 3;
                    break;
                case 'loyal':
                    if (action === 'following' || action === 'interacting') weight *= 2;
                    break;
                case 'independent':
                    if (action === 'exploring') weight *= 2;
                    if (action === 'following') weight *= 0.5;
                    break;
            }
            
            // Need-based weights
            if (action === 'seeking_food' && petData.hunger < 30) weight *= 4;
            if (action === 'resting' && petData.energy < 40) weight *= 3;
            if (action === 'sleeping' && petData.energy < 20) weight *= 5;
            
            weights.set(action, weight);
        });
        
        // Weighted random selection
        const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        for (const [action, weight] of weights) {
            random -= weight;
            if (random <= 0) {
                return action;
            }
        }
        
        return actions[0]; // Fallback
    },

    executePetAction: function(petData, now) {
        switch(petData.currentAction) {
            case 'following':
                this.executeFollowing(petData);
                break;
            case 'exploring':
                this.executeExploring(petData);
                break;
            case 'playing':
                this.executePlaying(petData);
                break;
            case 'flying':
                this.executeFlying(petData);
                break;
            case 'interacting':
                this.executeInteracting(petData);
                break;
            case 'resting':
            case 'sleeping':
                this.executeResting(petData);
                break;
            case 'seeking_food':
                this.executeSeekingFood(petData);
                break;
            case 'casting_magic':
                this.executeCastingMagic(petData);
                break;
            case 'celebrating':
                this.executeCelebrating(petData);
                break;
            case 'idle':
            default:
                this.executeIdle(petData);
                break;
        }
    },

    executeFollowing: function(petData) {
        const owner = window.AvatarSystem?.getAvatar(petData.ownerId);
        if (!owner) return;
        
        const ownerPos = owner.group.position;
        const petPos = petData.group.position;
        const config = petData.config;
        
        // Smart following with path prediction
        const direction = ownerPos.clone().sub(petPos);
        const distance = direction.length();
        
        if (distance > config.followDistance) {
            direction.normalize();
            
            // Adjust speed based on distance
            const speedMultiplier = Math.min(2, distance / config.followDistance);
            const speed = config.speed * 0.02 * speedMultiplier;
            
            petData.velocity.lerp(direction.multiplyScalar(speed), 0.3);
            petData.group.position.add(petData.velocity);
            
            // Look at owner
            petData.group.lookAt(ownerPos);
            petData.isMoving = true;
        } else {
            petData.velocity.multiplyScalar(0.9);
            petData.group.position.add(petData.velocity);
            petData.isMoving = false;
        }
    },

    executeExploring: function(petData) {
        // Advanced exploration with curiosity points
        if (!petData.targetPosition || 
            petData.group.position.distanceTo(petData.targetPosition) < 0.5) {
            
            // Find new interesting spot
            petData.targetPosition = this.findCuriousSpot(petData);
        }
        
        const direction = petData.targetPosition.clone().sub(petData.group.position);
        direction.normalize();
        
        const speed = petData.config.speed * 0.015;
        petData.velocity.lerp(direction.multiplyScalar(speed), 0.2);
        petData.group.position.add(petData.velocity);
        
        if (petData.velocity.length() > 0.001) {
            petData.group.lookAt(petData.group.position.clone().add(petData.velocity));
        }
        
        petData.isMoving = true;
    },

    findCuriousSpot: function(petData) {
        // Find interesting locations to explore
        const spots = [];
        
        // Near other pets
        for (const otherPet of this.activePets.values()) {
            if (otherPet.id !== petData.id) {
                spots.push(otherPet.group.position.clone());
            }
        }
        
        // Near avatars
        if (window.AvatarSystem) {
            const avatars = window.AvatarSystem.getAllAvatars();
            avatars.forEach(avatar => {
                spots.push(avatar.group.position.clone());
            });
        }
        
        // Random spots
        for (let i = 0; i < 5; i++) {
            spots.push(new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                0,
                (Math.random() - 0.5) * 10
            ));
        }
        
        // Choose closest or most interesting spot
        if (spots.length > 0) {
            return spots[Math.floor(Math.random() * spots.length)];
        }
        
        // Fallback random position
        return new THREE.Vector3(
            petData.group.position.x + (Math.random() - 0.5) * 4,
            0,
            petData.group.position.z + (Math.random() - 0.5) * 4
        );
    },

    executePlaying: function(petData) {
        const time = Date.now() * 0.005;
        
        // Enhanced playful behavior
        switch(petData.type) {
            case 'cat':
                // Cat-like play behavior
                petData.group.position.y = Math.abs(Math.sin(time * 3)) * 0.3;
                petData.group.rotation.y += 0.1;
                break;
                
            case 'dog':
                // Dog-like excited behavior
                petData.group.position.y = Math.abs(Math.sin(time * 4)) * 0.4;
                if (Math.random() < 0.02) {
                    petData.group.position.x += (Math.random() - 0.5) * 0.2;
                    petData.group.position.z += (Math.random() - 0.5) * 0.2;
                }
                break;
                
            case 'bird':
                // Flying play patterns
                const radius = 1.5;
                petData.group.position.x = Math.cos(time) * radius;
                petData.group.position.z = Math.sin(time) * radius;
                petData.group.position.y = 1 + Math.sin(time * 2) * 0.5;
                break;
                
            default:
                // Generic play behavior
                petData.group.position.y = Math.abs(Math.sin(time * 2)) * 0.2;
                petData.group.rotation.y += 0.05;
        }
        
        petData.isMoving = true;
        
        // Occasionally create play effects
        if (Math.random() < 0.05) {
            this.createPlayEffect(petData);
        }
    },

    executeInteracting: function(petData) {
        const owner = window.AvatarSystem?.getAvatar(petData.ownerId);
        if (!owner) return;
        
        const ownerPos = owner.group.position;
        const distance = petData.group.position.distanceTo(ownerPos);
        
        if (distance > 1.0) {
            // Move closer for interaction
            const direction = ownerPos.clone().sub(petData.group.position).normalize();
            const speed = petData.config.speed * 0.03;
            petData.velocity.copy(direction.multiplyScalar(speed));
            petData.group.position.add(petData.velocity);
        } else {
            // Perform specific interaction
            this.performSpecificInteraction(petData, owner);
        }
        
        petData.group.lookAt(ownerPos);
        petData.isMoving = distance > 1.0;
    },

    performSpecificInteraction: function(petData, owner) {
        const interactions = petData.config.interactions;
        const randomInteraction = interactions[Math.floor(Math.random() * interactions.length)];
        
        switch(randomInteraction) {
            case 'rub_against':
                // Cat rubbing against owner
                this.createAffectionEffect(petData);
                petData.affection = Math.min(100, petData.affection + 5);
                break;
                
            case 'fetch':
                // Dog playing fetch
                this.createFetchEffect(petData);
                petData.happiness = Math.min(100, petData.happiness + 10);
                break;
                
            case 'sing_song':
                // Bird singing
                this.createMusicEffect(petData);
                break;
                
            case 'heal_magic':
                // Unicorn healing magic
                this.createHealingEffect(petData, owner);
                break;
                
            default:
                // Generic interaction
                this.createInteractionEffect(petData);
        }
        
        petData.lastInteractionTime = Date.now();
        petData.socialInteractions++;
        
        console.log(`💝 ${petData.options.name} performed ${randomInteraction}`);
    },

    // Additional action execution methods...
    executeFlying: function(petData) {
        if (!petData.config.canFly) return;
        
        const time = Date.now() * 0.003;
        const radius = 3;
        const height = 2 + Math.sin(time * 1.5) * 0.8;
        
        petData.group.position.x = Math.cos(time) * radius;
        petData.group.position.z = Math.sin(time) * radius;
        petData.group.position.y = height;
        
        // Banking motion
        petData.group.rotation.z = Math.sin(time) * 0.3;
        petData.isMoving = true;
    },

    executeResting: function(petData) {
        const time = Date.now() * 0.001;
        const breathingScale = 1 + Math.sin(time) * 0.03;
        
        if (petData.mesh.scale) {
            petData.mesh.scale.setScalar(breathingScale);
        }
        
        petData.velocity.multiplyScalar(0.95);
        petData.group.position.add(petData.velocity);
        petData.isMoving = false;
        
        // Rest recovers energy
        petData.energy = Math.min(100, petData.energy + 0.1);
    },

    executeSeekingFood: function(petData) {
        // Look for food sources or move to feeding area
        const feedingSpot = new THREE.Vector3(0, 0, 0); // Central feeding area
        const direction = feedingSpot.clone().sub(petData.group.position).normalize();
        
        const speed = petData.config.speed * 0.02;
        petData.velocity.lerp(direction.multiplyScalar(speed), 0.3);
        petData.group.position.add(petData.velocity);
        
        petData.group.lookAt(feedingSpot);
        petData.isMoving = true;
        
        // Simulate eating when close to feeding spot
        if (petData.group.position.distanceTo(feedingSpot) < 0.5) {
            petData.hunger = Math.min(100, petData.hunger + 2);
            this.createEatingEffect(petData);
        }
    },

    executeCastingMagic: function(petData) {
        if (!petData.config.magical) return;
        
        const time = Date.now() * 0.004;
        
        // Magical floating motion
        petData.group.position.y = 0.5 + Math.sin(time * 2) * 0.3;
        petData.group.rotation.y += 0.02;
        
        // Create magical effects
        if (Math.random() < 0.1) {
            this.createMagicalEffect(petData);
        }
        
        petData.isMoving = false;
    },

    executeCelebrating: function(petData) {
        const time = Date.now() * 0.008;
        
        // Celebration dance
        petData.group.position.y = Math.abs(Math.sin(time * 4)) * 0.5;
        petData.group.rotation.y += 0.15;
        
        // Sparkle effects
        if (Math.random() < 0.15) {
            this.createCelebrationEffect(petData);
        }
        
        petData.isMoving = true;
    },

    executeIdle: function(petData) {
        const time = Date.now() * 0.002;
        
        // Gentle idle animations
        const breathingScale = 1 + Math.sin(time) * 0.02;
        if (petData.mesh.scale) {
            petData.mesh.scale.setScalar(breathingScale);
        }
        
        // Occasional head turn
        if (Math.random() < 0.005) {
            const lookDirection = (Math.random() - 0.5) * 0.5;
            if (petData.mesh.rotation) {
                petData.mesh.rotation.y = lookDirection;
            }
        }
        
        petData.velocity.multiplyScalar(0.98);
        petData.group.position.add(petData.velocity);
        petData.isMoving = false;
    },

    // Effect creation methods
    createPlayEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0x00ff00, 'sparkle');
    },

    createAffectionEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0xff69b4, 'hearts');
    },

    createFetchEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0xffd700, 'stars');
    },

    createMusicEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0x9370db, 'notes');
    },

    createHealingEffect: function(petData, target) {
        this.createParticleEffect(petData.group.position, 0x00ffff, 'healing');
        if (target && target.userData && target.userData.health) {
            target.userData.health = Math.min(100, target.userData.health + 20);
        }
    },

    createInteractionEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0xffffff, 'interaction');
    },

    createEatingEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0x8b4513, 'crumbs');
    },

    createMagicalEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0x800080, 'magic');
    },

    createCelebrationEffect: function(petData) {
        this.createParticleEffect(petData.group.position, 0xffd700, 'celebration');
    },

    createParticleEffect: function(position, color, type) {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        // Create particle system
        const particleCount = type === 'celebration' ? 20 : 10;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 4, 4),
                new THREE.MeshBasicMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            particle.position.copy(position);
            particle.position.y += petData.config.size;
            particle.position.x += (Math.random() - 0.5) * 0.5;
            particle.position.z += (Math.random() - 0.5) * 0.5;
            
            // Particle-specific motion
            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.15 + 0.05,
                (Math.random() - 0.5) * 0.1
            );
            
            particles.add(particle);
        }
        
        window.SceneManager.addObject(particles);
        
        // Animate particles
        let animationTime = 0;
        const animateParticles = () => {
            animationTime += 0.05;
            
            particles.children.forEach(particle => {
                particle.position.add(particle.userData.velocity);
                particle.userData.velocity.y -= 0.005; // Gravity
                particle.material.opacity = Math.max(0, 0.8 - animationTime);
                
                // Specific type behaviors
                switch(type) {
                    case 'hearts':
                        particle.rotation.z += 0.1;
                        break;
                    case 'stars':
                        particle.rotation.x += 0.1;
                        particle.rotation.y += 0.1;
                        break;
                    case 'magic':
                        particle.position.y += Math.sin(animationTime * 10) * 0.01;
                        break;
                }
            });
            
            if (animationTime >= 1.5) {
                window.SceneManager.removeObject(particles);
            } else {
                requestAnimationFrame(animateParticles);
            }
        };
        
        animateParticles();
    },

    createPetSpawnEffect: function(petData) {
        const position = petData.group.position.clone();
        this.createParticleEffect(position, 0x00ff88, 'spawn');
        
        // Spawn animation
        petData.group.scale.setScalar(0.1);
        const targetScale = 1.0;
        
        const scaleUp = () => {
            const currentScale = petData.group.scale.x;
            if (currentScale < targetScale) {
                const newScale = Math.min(targetScale, currentScale + 0.02);
                petData.group.scale.setScalar(newScale);
                requestAnimationFrame(scaleUp);
            }
        };
        
        scaleUp();
    },

    updatePetAnimations: function(petData, now) {
        const animationParts = petData.mesh.userData?.animationParts;
        if (!animationParts) return;
        
        const time = now * 0.003;
        const action = petData.currentAction;
        
        // Base breathing animation
        const breathingIntensity = petData.currentAction === 'sleeping' ? 0.01 : 0.03;
        const breathingScale = 1 + Math.sin(time * 2) * breathingIntensity;
        
        if (animationParts.body) {
            animationParts.body.scale.setScalar(breathingScale);
        }
        
        // Action-specific animations
        switch(action) {
            case 'walking':
            case 'following':
            case 'exploring':
                this.animateWalking(animationParts, time);
                break;
                
            case 'running':
                this.animateRunning(animationParts, time);
                break;
                
            case 'playing':
                this.animatePlaying(animationParts, time, petData.type);
                break;
                
            case 'flying':
                this.animateFlying(animationParts, time);
                break;
                
            case 'sleeping':
                this.animateSleeping(animationParts, time);
                break;
                
            case 'interacting':
                this.animateInteracting(animationParts, time, petData.type);
                break;
                
            case 'casting_magic':
                this.animateMagic(animationParts, time);
                break;
        }
        
        // Mood-based animation modifiers
        this.applyMoodAnimations(animationParts, petData.mood, time);
    },

    animateWalking: function(parts, time) {
        if (parts.tail) {
            parts.tail.rotation.z = Math.sin(time * 4) * 0.3;
        }
        
        if (parts.ears) {
            parts.ears.forEach((ear, index) => {
                ear.rotation.z += Math.sin(time * 3 + index * Math.PI) * 0.02;
            });
        }
        
        if (parts.legs) {
            parts.legs.forEach((leg, index) => {
                leg.rotation.x = Math.sin(time * 6 + index * Math.PI) * 0.3;
            });
        }
        
        if (parts.head) {
            parts.head.rotation.y = Math.sin(time * 1.5) * 0.1;
        }
    },

    animateRunning: function(parts, time) {
        if (parts.tail) {
            parts.tail.rotation.z = Math.sin(time * 8) * 0.5;
        }
        
        if (parts.legs) {
            parts.legs.forEach((leg, index) => {
                leg.rotation.x = Math.sin(time * 12 + index * Math.PI) * 0.5;
            });
        }
        
        if (parts.ears) {
            parts.ears.forEach(ear => {
                ear.rotation.x = -0.3; // Ears back when running
            });
        }
    },

    animatePlaying: function(parts, time, petType) {
        switch(petType) {
            case 'cat':
                if (parts.tail) {
                    parts.tail.rotation.z = Math.sin(time * 6) * 0.8;
                    parts.tail.rotation.x = Math.sin(time * 4) * 0.3;
                }
                if (parts.ears) {
                    parts.ears.forEach(ear => {
                        ear.rotation.z += Math.sin(time * 5) * 0.1;
                    });
                }
                break;
                
            case 'dog':
                if (parts.tail) {
                    parts.tail.rotation.z = Math.sin(time * 10) * 0.7; // Rapid wagging
                }
                if (parts.ears) {
                    parts.ears.forEach(ear => {
                        ear.rotation.y = Math.sin(time * 4) * 0.2;
                    });
                }
                break;
                
            case 'bird':
                if (parts.wings) {
                    parts.wings.forEach((wing, index) => {
                        wing.rotation.y = Math.sin(time * 15 + index * Math.PI) * 0.8;
                    });
                }
                break;
        }
    },

    animateFlying: function(parts, time) {
        if (parts.wings) {
            parts.wings.forEach((wing, index) => {
                wing.rotation.y = Math.sin(time * 20 + index * Math.PI) * 0.6;
                wing.rotation.z = Math.sin(time * 10 + index * Math.PI) * 0.2;
            });
        }
        
        if (parts.tail) {
            parts.tail.rotation.x = Math.sin(time * 3) * 0.2;
        }
    },

    animateSleeping: function(parts, time) {
        // Slow, deep breathing
        if (parts.body) {
            const sleepBreathing = 1 + Math.sin(time * 0.8) * 0.05;
            parts.body.scale.setScalar(sleepBreathing);
        }
        
        // Ears relaxed
        if (parts.ears) {
            parts.ears.forEach(ear => {
                ear.rotation.x = -0.2;
            });
        }
        
        // Tail still
        if (parts.tail) {
            parts.tail.rotation.z = Math.sin(time * 0.5) * 0.1;
        }
    },

    animateInteracting: function(parts, time, petType) {
        switch(petType) {
            case 'cat':
                // Purring vibration
                if (parts.body) {
                    parts.body.position.y = Math.sin(time * 20) * 0.01;
                }
                break;
                
            case 'dog':
                // Excited tail wagging
                if (parts.tail) {
                    parts.tail.rotation.z = Math.sin(time * 12) * 0.8;
                }
                break;
        }
        
        // General interaction animation
        if (parts.head) {
            parts.head.rotation.y = Math.sin(time * 2) * 0.2;
        }
    },

    animateMagic: function(parts, time) {
        // Magical glow effect
        if (parts.aura) {
            parts.aura.material.opacity = 0.1 + Math.sin(time * 4) * 0.05;
            parts.aura.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
        }
        
        if (parts.horn) {
            parts.horn.material.emissiveIntensity = 0.2 + Math.sin(time * 6) * 0.1;
        }
        
        // Floating motion
        if (parts.body) {
            parts.body.position.y = Math.sin(time * 2) * 0.1;
        }
    },

    applyMoodAnimations: function(parts, mood, time) {
        switch(mood) {
            case 'ecstatic':
                // Bouncy, energetic
                if (parts.body) {
                    parts.body.position.y += Math.sin(time * 5) * 0.02;
                }
                break;
                
            case 'happy':
                // Light, cheerful movements
                if (parts.tail) {
                    parts.tail.rotation.z += Math.sin(time * 3) * 0.1;
                }
                break;
                
            case 'sad':
                // Droopy, slow movements
                if (parts.ears) {
                    parts.ears.forEach(ear => {
                        ear.rotation.x = -0.3;
                    });
                }
                if (parts.tail) {
                    parts.tail.position.y -= 0.1;
                }
                break;
                
            case 'depressed':
                // Very still, minimal movement
                if (parts.head) {
                    parts.head.position.y -= 0.05;
                }
                break;
        }
    },

    updateStatusIndicators: function(petData) {
        const indicators = petData.statusIndicators;
        if (!indicators || !indicators.userData.bars) return;
        
        const bars = indicators.userData.bars;
        
        // Update health bar
        this.updateStatusBar(bars.healthBar, petData.health);
        
        // Update energy bar
        this.updateStatusBar(bars.energyBar, petData.energy);
        
        // Update happiness bar
        this.updateStatusBar(bars.happinessBar, petData.happiness);
        
        // Show/hide indicators based on distance to camera
        const camera = window.SceneManager?.camera;
        if (camera) {
            const distance = petData.group.position.distanceTo(camera.position);
            const visible = distance < 8; // Show when close
            indicators.visible = visible;
        }
    },

    updateStatusBar: function(bar, value) {
        if (!bar || !bar.userData.fill) return;
        
        const percentage = Math.max(0, Math.min(100, value)) / 100;
        const newWidth = bar.userData.maxWidth * percentage;
        
        bar.userData.fill.scale.x = percentage;
        
        // Color coding
        let color;
        if (percentage > 0.6) {
            color = new THREE.Color(0x00ff00); // Green
        } else if (percentage > 0.3) {
            color = new THREE.Color(0xffff00); // Yellow
        } else {
            color = new THREE.Color(0xff0000); // Red
        }
        
        bar.userData.fill.material.color = color;
    },

    // Utility methods
    getRandomActionDelay: function() {
        return 2000 + Math.random() * 4000; // 2-6 seconds
    },

    getActionDuration: function(action, petData) {
        const baseDuration = {
            'idle': 5000,
            'following': 3000,
            'exploring': 8000,
            'playing': 6000,
            'flying': 10000,
            'interacting': 4000,
            'resting': 10000,
            'sleeping': 20000,
            'seeking_food': 5000,
            'casting_magic': 7000,
            'celebrating': 5000
        };
        
        const duration = baseDuration[action] || 5000;
        
        // Personality modifications
        switch(petData.config.personality) {
            case 'energetic':
                return duration * 0.7;
            case 'lazy':
                return duration * 1.5;
            case 'curious':
                if (action === 'exploring') return duration * 1.5;
                break;
        }
        
        return duration + (Math.random() - 0.5) * 2000;
    },

    canInteractWithOwner: function(petData, owner, now) {
        if (!owner) return false;
        
        const timeSinceLastInteraction = now - petData.lastInteractionTime;
        const distance = petData.group.position.distanceTo(owner.group.position);
        
        return timeSinceLastInteraction > petData.interactionCooldown && 
               distance < petData.config.followDistance * 1.5 &&
               petData.happiness > 30;
    },

    levelUpPet: function(petData) {
        petData.level++;
        petData.experience = 0;
        petData.skillPoints += 5;
        
        // Level up benefits
        petData.health = 100;
        petData.happiness = Math.min(100, petData.happiness + 20);
        petData.energy = Math.min(100, petData.energy + 20);
        
        // Visual effect
        this.createLevelUpEffect(petData);
        
        console.log(`🎉 ${petData.options.name} leveled up to level ${petData.level}!`);
        
        if (window.RoomCore) {
            window.RoomCore.showNotification(`🎉 ${petData.options.name} reached level ${petData.level}!`);
        }
    },

    createLevelUpEffect: function(petData) {
        const position = petData.group.position.clone();
        position.y += petData.config.size;
        
        // Golden sparkle effect
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                this.createParticleEffect(position, 0xffd700, 'celebration');
            }, i * 100);
        }
        
        // Temporary size increase
        const originalScale = petData.group.scale.clone();
        petData.group.scale.multiplyScalar(1.3);
        
        setTimeout(() => {
            petData.group.scale.copy(originalScale);
        }, 2000);
    },

    initializeFriendships: function(petData) {
        // Initialize relationships with other pets
        for (const otherPet of this.activePets.values()) {
            if (otherPet.id !== petData.id) {
                const compatibility = this.calculateCompatibility(petData, otherPet);
                petData.friendships.set(otherPet.id, {
                    level: Math.floor(compatibility * 50),
                    interactions: 0,
                    lastInteraction: 0
                });
            }
        }
    },

    calculateCompatibility: function(pet1, pet2) {
        let compatibility = 0.5; // Base compatibility
        
        // Same species bonus
        if (pet1.type === pet2.type) {
            compatibility += 0.3;
        }
        
        // Personality compatibility
        const personalityMatrix = {
            'playful': { 'playful': 0.8, 'energetic': 0.7, 'social': 0.6 },
            'loyal': { 'loyal': 0.8, 'protective': 0.7, 'calm': 0.6 },
            'independent': { 'independent': 0.4, 'calm': 0.6, 'curious': 0.5 },
            'energetic': { 'energetic': 0.9, 'playful': 0.7, 'social': 0.6 }
        };
        
        const p1 = pet1.config.personality;
        const p2 = pet2.config.personality;
        
        if (personalityMatrix[p1] && personalityMatrix[p1][p2]) {
            compatibility = personalityMatrix[p1][p2];
        }
        
        return Math.max(0, Math.min(1, compatibility));
    },

    reactToOwnerEmotion: function(userId, emotion) {
        // Find pets belonging to this user
        const userPets = Array.from(this.activePets.values())
            .filter(pet => pet.ownerId === userId);
        
        userPets.forEach(pet => {
            this.petEmotionalResponse(pet, emotion);
        });
    },

    petEmotionalResponse: function(petData, ownerEmotion) {
        switch(ownerEmotion) {
            case 'happy':
            case 'excited':
                petData.happiness = Math.min(100, petData.happiness + 10);
                petData.mood = 'happy';
                petData.currentAction = 'celebrating';
                break;
                
            case 'sad':
                petData.happiness = Math.max(0, petData.happiness - 5);
                petData.mood = 'concerned';
                petData.currentAction = 'seeking_comfort';
                break;
                
            case 'angry':
                if (petData.config.personality === 'protective') {
                    petData.mood = 'alert';
                    petData.currentAction = 'protecting';
                } else {
                    petData.mood = 'anxious';
                }
                break;
                
            case 'love':
                petData.affection = Math.min(100, petData.affection + 15);
                petData.mood = 'loving';
                petData.currentAction = 'interacting';
                break;
        }
        
        console.log(`💝 ${petData.options.name} reacted to owner's ${ownerEmotion}`);
    },

    // Public API methods
    assignRandomPet: function(avatarId) {
        const petTypes = Object.keys(this.petTypes);
        const randomType = petTypes[Math.floor(Math.random() * petTypes.length)];
        
        // Don't assign if user already has 3+ pets
        const existingPets = this.getPetsForOwner(avatarId);
        if (existingPets.length >= 3) {
            if (window.RoomCore) {
                window.RoomCore.showNotification('🐾 You already have enough pets!');
            }
            return null;
        }
        
        const pet = this.createPet(avatarId, randomType);
        
        if (pet && window.RoomCore) {
            window.RoomCore.showNotification(`🐾 ${pet.options.name} the ${pet.type} joined you!`);
        }
        
        return pet;
    },

    createSpecificPet: function(avatarId, petType, options = {}) {
        if (!this.petTypes[petType]) {
            console.error('Invalid pet type:', petType);
            return null;
        }
        
        return this.createPet(avatarId, petType, options);
    },

    removePet: function(petId) {
        const pet = this.activePets.get(petId);
        if (pet) {
            // Cleanup
            if (window.SceneManager && window.SceneManager.scene) {
                window.SceneManager.removeObject(pet.group);
            }
            
            this.activePets.delete(petId);
            this.updatePetUI();
            
            console.log(`🐾 Removed pet: ${pet.options.name}`);
            
            if (window.EventBus) {
                window.EventBus.emit('pet:removed', { petId, pet });
            }
        }
    },

    removePetsForOwner: function(ownerId) {
        const petsToRemove = [];
        
        for (const [petId, pet] of this.activePets) {
            if (pet.ownerId === ownerId) {
                petsToRemove.push(petId);
            }
        }
        
        petsToRemove.forEach(petId => this.removePet(petId));
    },

    updatePetsForOwner: function(ownerId) {
        const pets = this.getPetsForOwner(ownerId);
        pets.forEach(pet => {
            // Update pet behavior when owner moves
            if (pet.currentAction === 'idle' || pet.currentAction === 'resting') {
                pet.currentAction = 'following';
                pet.nextActionTime = Date.now() + 1000;
            }
        });
    },

    feedPet: function(petId, foodType = 'generic') {
        const pet = this.activePets.get(petId);
        if (!pet) return false;
        
        const hungerRestore = {
            'generic': 30,
            'premium': 50,
            'favorite': 70
        };
        
        const restore = hungerRestore[foodType] || 30;
        pet.hunger = Math.min(100, pet.hunger + restore);
        pet.happiness = Math.min(100, pet.happiness + 10);
        pet.lastFed = Date.now();
        
        this.createEatingEffect(pet);
        
        console.log(`🍖 Fed ${pet.options.name} (${foodType} food)`);
        return true;
    },

    playWithPet: function(petId) {
        const pet = this.activePets.get(petId);
        if (!pet) return false;
        
        pet.happiness = Math.min(100, pet.happiness + 20);
        pet.energy = Math.max(0, pet.energy - 10);
        pet.affection = Math.min(100, pet.affection + 10);
        pet.lastPlayed = Date.now();
        
        pet.currentAction = 'playing';
        pet.nextActionTime = Date.now() + 5000;
        
        this.createPlayEffect(pet);
        
        console.log(`🎾 Played with ${pet.options.name}`);
        return true;
    },

    showPetManagementPanel: function() {
        // Remove existing panel
        const existingPanel = document.getElementById('pet-management-panel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        const panel = document.createElement('div');
        panel.id = 'pet-management-panel';
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
            min-width: 400px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;
        
        const petsList = this.generatePetsListHTML();
        const petTypesGrid = this.generatePetTypesHTML();
        
        panel.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #667eea; text-align: center;">🐾 Pet Management</h3>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #4CAF50; margin-bottom: 10px;">Your Pets:</h4>
                ${petsList}
            </div>
            
            <div style="margin-bottom: 20px;">
                <h4 style="color: #FF6B35; margin-bottom: 10px;">Add New Pet:</h4>
                ${petTypesGrid}
            </div>
            
            <div style="text-align: center;">
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="padding: 10px 20px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add event listeners for pet management
        this.setupPetManagementListeners(panel);
    },

    generatePetsListHTML: function() {
        const allPets = Array.from(this.activePets.values());
        
        if (allPets.length === 0) {
            return '<p style="text-align: center; opacity: 0.7;">No pets currently active</p>';
        }
        
        return allPets.map(pet => `
            <div style="display: flex; align-items: center; gap: 15px; padding: 10px; margin: 5px 0; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid ${this.getPetTypeColor(pet.type)};">
                <div style="font-size: 24px;">${pet.config.emoji}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #FFD700;">${pet.options.name}</div>
                    <div style="font-size: 12px; opacity: 0.8;">Level ${pet.level} ${pet.type} • Owner: ${pet.ownerId}</div>
                    <div style="font-size: 11px; opacity: 0.6;">Mood: ${pet.mood} • Energy: ${Math.round(pet.energy)}%</div>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button onclick="window.PetSystem.feedPet('${pet.id}')" 
                            style="padding: 5px 8px; background: #4CAF50; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;">
                        🍖 Feed
                    </button>
                    <button onclick="window.PetSystem.playWithPet('${pet.id}')" 
                            style="padding: 5px 8px; background: #2196F3; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;">
                        🎾 Play
                    </button>
                    <button onclick="window.PetSystem.removePet('${pet.id}')" 
                            style="padding: 5px 8px; background: #f44336; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;">
                        ❌
                    </button>
                </div>
            </div>
        `).join('');
    },

    generatePetTypesHTML: function() {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;">
                ${Object.entries(this.petTypes).map(([type, config]) => `
                    <button onclick="window.PetSystem.createSpecificPet('default', '${type}')" 
                            style="padding: 15px 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer; text-align: center; transition: all 0.3s;">
                        <div style="font-size: 24px; margin-bottom: 5px;">${config.emoji}</div>
                        <div style="font-size: 12px; font-weight: bold;">${config.name}</div>
                        <div style="font-size: 10px; opacity: 0.7;">${config.personality}</div>
                    </button>
                `).join('')}
            </div>
        `;
    },

    getPetTypeColor: function(petType) {
        const colors = {
            cat: '#FFA500',
            dog: '#8B4513',
            bird: '#00FF00',
            rabbit: '#FFFFFF',
            fox: '#FF4500',
            dragon: '#FF0000',
            hamster: '#D2691E',
            unicorn: '#FFB6C1'
        };
        return colors[petType] || '#FFFFFF';
    },

    setupPetManagementListeners: function(panel) {
        // Additional setup can be added here
        console.log('🎮 Pet management panel listeners set up');
    },

    updatePetUI: function() {
        // Update the pet count in the status panel
        const petCountElement = document.getElementById('pet-count');
        if (petCountElement) {
            petCountElement.textContent = this.activePets.size;
        }
        
        // Update pet panel if visible
        const petPanel = document.getElementById('pet-panel');
        if (petPanel && petPanel.style.display !== 'none') {
            const petList = document.getElementById('pet-list');
            if (petList) {
                petList.innerHTML = this.generatePetPanelHTML();
            }
        }
    },

    generatePetPanelHTML: function() {
        const pets = Array.from(this.activePets.values());
        
        if (pets.length === 0) {
            return `
                <div style="text-align: center; opacity: 0.7; font-size: 11px; padding: 20px;">
                    No pets active. Click "Add Pet" to get a companion!
                </div>
            `;
        }
        
        return pets.map(pet => `
            <div class="pet-item">
                <div style="font-size: 20px;">${pet.config.emoji}</div>
                <div class="pet-status">
                    <div style="font-weight: bold; color: #FFD700;">${pet.options.name}</div>
                    <div class="pet-stats">
                        <span>❤️ ${Math.round(pet.health)}</span>
                        <span>⚡ ${Math.round(pet.energy)}</span>
                        <span>😊 ${Math.round(pet.happiness)}</span>
                    </div>
                    <div style="font-size: 10px; opacity: 0.6;">${pet.mood} • Lv.${pet.level}</div>
                </div>
            </div>
        `).join('');
    },

    generatePetName: function(petType) {
        const namesByType = {
            cat: ['Whiskers', 'Mittens', 'Shadow', 'Luna', 'Tiger', 'Smokey', 'Felix', 'Garfield'],
            dog: ['Buddy', 'Max', 'Bella', 'Charlie', 'Lucy', 'Cooper', 'Rex', 'Spot'],
            bird: ['Tweety', 'Sky', 'Feather', 'Robin', 'Phoenix', 'Sunny', 'Echo', 'Aria'],
            rabbit: ['Bunny', 'Hop', 'Cotton', 'Nibbles', 'Clover', 'Daisy', 'Snowball', 'Pepper'],
            fox: ['Rusty', 'Amber', 'Scout', 'Flame', 'Copper', 'Swift', 'Vixen', 'Blaze'],
            dragon: ['Ember', 'Draco', 'Flame', 'Storm', 'Crystal', 'Mystique', 'Inferno', 'Tempest'],
            hamster: ['Hammy', 'Peanut', 'Gizmo', 'Squeaky', 'Nibbler', 'Tiny', 'Fuzzy', 'Pip'],
            unicorn: ['Starlight', 'Rainbow', 'Celeste', 'Aurora', 'Prism', 'Moonbeam', 'Sparkle', 'Radiance']
        };
        
        const names = namesByType[petType] || ['Pet', 'Buddy', 'Friend', 'Companion'];
        return names[Math.floor(Math.random() * names.length)];
    },

    // Getters
    getAllPets: function() {
        return Array.from(this.activePets.values());
    },

    getPetsForOwner: function(ownerId) {
        return Array.from(this.activePets.values()).filter(pet => pet.ownerId === ownerId);
    },

    getPet: function(petId) {
        return this.activePets.get(petId);
    },

    getPetTypes: function() {
        return Object.keys(this.petTypes);
    },

    getActivePetCount: function() {
        return this.activePets.size;
    },

    // Cleanup
    destroy: function() {
        // Remove all pets
        for (const petId of this.activePets.keys()) {
            this.removePet(petId);
        }
        
        // Clear references
        this.activePets.clear();
        this.petAnimations.clear();
        this.interactionCooldowns.clear();
        
        this.isInitialized = false;
        console.log('🐾 Pet System destroyed');
    }
};

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.PetSystem.init();
    });
} else {
    window.PetSystem.init();
}