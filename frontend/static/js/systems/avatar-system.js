// Among Us Avatar System - Fixed for Three.js r128
// Replaces CapsuleGeometry with compatible alternatives

window.AmongUsAvatarSystem = {
    avatars: new Map(),
    isInitialized: false,
    animationMixers: new Map(),
    clock: new THREE.Clock(),
    
    // Among Us color palette
    colors: {
        red: '#C51111',
        blue: '#132ED1',
        green: '#117F2D',
        pink: '#ED54BA',
        orange: '#EF7D0D',
        yellow: '#F6F657',
        black: '#3F474E',
        white: '#D7E1F1',
        purple: '#6B2FBB',
        brown: '#71491E',
        cyan: '#38FEDC',
        lime: '#50EF39',
        maroon: '#5E2615',
        rose: '#F5B6CD',
        banana: '#FFFF99',
        gray: '#8395A7',
        tan: '#928776',
        coral: '#EC7C7C'
    },
    
    // Customization options
    customization: {
        hats: ['none', 'astronaut', 'captain', 'police', 'chef', 'party', 'flower', 'paper', 'crown', 'horns', 'ninja', 'dum'],
        clothes: ['none', 'suit', 'doctor', 'police', 'mechanic', 'astronaut', 'captain', 'military', 'tuxedo', 'hoodie', 'lab_coat', 'chef_outfit'],
        accessories: ['none', 'glasses', 'sunglasses', 'monocle', 'mask', 'bandana', 'goggles', 'eyepatch'],
        bodyTypes: ['slim', 'average', 'athletic', 'curvy'],
        heights: ['short', 'average', 'tall']
    },
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🚀 Initializing Among Us Avatar System (r128 compatible)');
        
        this.isInitialized = true;
        this.clock = new THREE.Clock();
        
        // Create default avatar if scene is ready
        if (window.SceneManager && window.SceneManager.isInitialized) {
            this.createDefaultAvatar();
        } else {
            if (window.EventBus) {
                window.EventBus.on('scene:initialized', () => {
                    console.log('🎬 Scene ready, creating Among Us avatar...');
                    this.createDefaultAvatar();
                });
            }
        }
        
        // Listen for events
        if (window.EventBus) {
            window.EventBus.on('avatar:customize', (options) => {
                this.customizeAvatar('default', options);
            });
            
            window.EventBus.on('scene:frame', () => {
                this.updateAnimations();
            });
        }
        
        // Start animation loops
        this.startIdleAnimations();
        this.startWalkAnimation();
        
        // Integrate with WebSocket
        this.integrateWithWebSocket();
        
        console.log('✅ Among Us Avatar System initialized (r128 compatible)');
    },
    
    // Helper to create capsule-like shape using available geometries
    createCapsuleShape: function(radiusTop, radiusBottom, height, radialSegments = 16) {
        const group = new THREE.Group();
        
        // Middle cylinder
        const cylinderHeight = height * 0.6;
        const cylinderGeometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, cylinderHeight, radialSegments);
        const cylinder = new THREE.Mesh(cylinderGeometry);
        group.add(cylinder);
        
        // Top hemisphere
        const topSphereGeometry = new THREE.SphereGeometry(radiusTop, radialSegments, radialSegments / 2, 0, Math.PI * 2, 0, Math.PI / 2);
        const topSphere = new THREE.Mesh(topSphereGeometry);
        topSphere.position.y = cylinderHeight / 2;
        group.add(topSphere);
        
        // Bottom hemisphere
        const bottomSphereGeometry = new THREE.SphereGeometry(radiusBottom, radialSegments, radialSegments / 2, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const bottomSphere = new THREE.Mesh(bottomSphereGeometry);
        bottomSphere.position.y = -cylinderHeight / 2;
        group.add(bottomSphere);
        
        // Merge geometries for single mesh
        const mergedGeometry = new THREE.Geometry();
        
        cylinder.updateMatrix();
        mergedGeometry.merge(new THREE.Geometry().fromBufferGeometry(cylinderGeometry), cylinder.matrix);
        
        topSphere.updateMatrix();
        mergedGeometry.merge(new THREE.Geometry().fromBufferGeometry(topSphereGeometry), topSphere.matrix);
        
        bottomSphere.updateMatrix();
        mergedGeometry.merge(new THREE.Geometry().fromBufferGeometry(bottomSphereGeometry), bottomSphere.matrix);
        
        // Convert back to BufferGeometry
        const bufferGeometry = new THREE.BufferGeometry().fromGeometry(mergedGeometry);
        
        // Clean up
        mergedGeometry.dispose();
        cylinderGeometry.dispose();
        topSphereGeometry.dispose();
        bottomSphereGeometry.dispose();
        
        return bufferGeometry;
    },
    
    createAvatar: function(userId, options = {}) {
        const avatarId = userId || this.generateId();
        
        // Default options with Among Us style
        const defaultOptions = {
            name: options.name || `Crewmate ${avatarId.slice(0, 4)}`,
            nationality: options.nationality || 'UN',
            position: options.position || { x: 0, y: 0, z: 0 },
            color: options.color || this.getRandomColor(),
            hat: options.hat || this.getRandomChoice('hats'),
            clothes: options.clothes || 'none',
            accessory: options.accessory || 'none',
            scale: options.scale || 1.0,
            isImpostor: options.isImpostor || false,
            isDead: options.isDead || false
        };
        
        // Create avatar group
        const avatarGroup = new THREE.Group();
        
        // Create Among Us character
        const character = this.createAmongUsCharacter(defaultOptions);
        avatarGroup.add(character);
        
        // Add name label
        const nameLabel = this.createNameLabel(defaultOptions.name, defaultOptions.nationality);
        nameLabel.position.y = 1.8;
        avatarGroup.add(nameLabel);
        
        // Add shadow
        const shadow = this.createShadow();
        avatarGroup.add(shadow);
        
        // Set position
        avatarGroup.position.set(
            defaultOptions.position.x,
            defaultOptions.position.y,
            defaultOptions.position.z
        );
        avatarGroup.scale.setScalar(defaultOptions.scale);
        
        // Store avatar data
        const avatarData = {
            id: avatarId,
            group: avatarGroup,
            mesh: character,
            nameLabel: nameLabel,
            shadow: shadow,
            position: avatarGroup.position.clone(),
            rotation: avatarGroup.rotation.clone(),
            customization: { ...defaultOptions },
            lastUpdate: Date.now(),
            walkPhase: Math.random() * Math.PI * 2,
            floatPhase: Math.random() * Math.PI * 2,
            isWalking: false,
            isDead: defaultOptions.isDead,
            isImpostor: defaultOptions.isImpostor,
            hatMesh: null,
            visor: null
        };
        
        // Add pet if specified
        if (defaultOptions.pet !== 'none') {
            const pet = this.createPet(defaultOptions.pet, defaultOptions.color);
            if (pet) {
                pet.position.set(-0.8, 0, 0.3);
                avatarGroup.add(pet);
                avatarData.pet = pet;
            }
        }
        
        this.avatars.set(avatarId, avatarData);
        
        // Add to scene
        if (window.SceneManager && window.SceneManager.scene) {
            window.SceneManager.addObject(avatarGroup);
            console.log(`🚀 Added Among Us avatar ${avatarId} to scene`);
        }
        
        // Play spawn animation
        this.playSpawnAnimation(avatarData);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('avatar:created', avatarData);
        }
        
        return avatarData;
    },
    
    createAmongUsCharacter: function(options = {}) {
        const group = new THREE.Group();
        const color = parseInt(options.color.replace('#', '0x'));
        
        // Body material
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: color,
            shininess: 100,
            specular: 0x222222
        });
        
        // Main body (bean shape) - Using cylinder + spheres instead of CapsuleGeometry
        const bodyGroup = new THREE.Group();
        
        // Body cylinder
        const bodyCylinder = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16);
        const bodyMiddle = new THREE.Mesh(bodyCylinder, bodyMaterial);
        bodyMiddle.position.y = 0.45;
        bodyGroup.add(bodyMiddle);
        
        // Body top (half sphere)
        const bodyTopGeometry = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const bodyTop = new THREE.Mesh(bodyTopGeometry, bodyMaterial);
        bodyTop.position.y = 0.7;
        bodyGroup.add(bodyTop);
        
        // Body bottom (half sphere)
        const bodyBottomGeometry = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const bodyBottom = new THREE.Mesh(bodyBottomGeometry, bodyMaterial);
        bodyBottom.position.y = 0.2;
        bodyGroup.add(bodyBottom);
        
        bodyGroup.castShadow = true;
        bodyGroup.receiveShadow = true;
        bodyGroup.name = 'body';
        group.add(bodyGroup);
        
        // Legs - Using cylinders with spheres at ends
        const createLeg = (xPos) => {
            const legGroup = new THREE.Group();
            
            // Leg cylinder
            const legCylinder = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8);
            const legMiddle = new THREE.Mesh(legCylinder, bodyMaterial);
            legGroup.add(legMiddle);
            
            // Leg bottom (hemisphere)
            const legBottom = new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
            const legEnd = new THREE.Mesh(legBottom, bodyMaterial);
            legEnd.position.y = -0.1;
            legGroup.add(legEnd);
            
            legGroup.position.set(xPos, 0, 0);
            legGroup.castShadow = true;
            legGroup.name = xPos < 0 ? 'leftLeg' : 'rightLeg';
            return legGroup;
        };
        
        group.add(createLeg(-0.15));
        group.add(createLeg(0.15));
        
        // Visor
        const visor = this.createVisor(options.isDead);
        visor.position.set(0, 0.55, 0.38);
        group.add(visor);
        
        // Backpack
        const backpack = this.createBackpack(bodyMaterial);
        backpack.position.set(0, 0.4, -0.35);
        group.add(backpack);
        
        // Add hat if specified
        if (options.hat !== 'none') {
            const hat = this.createHat(options.hat);
            if (hat) {
                hat.position.set(0, 0.9, 0);
                group.add(hat);
            }
        }
        
        // Add clothes/outfit if specified
        if (options.clothes !== 'none') {
            this.addClothes(group, options.clothes, bodyMaterial);
        }
        
        // Add accessory if specified
        if (options.accessory !== 'none') {
            const accessory = this.createAccessory(options.accessory);
            if (accessory) {
                group.add(accessory);
            }
        }
        
        // If dead, add ghost effect
        if (options.isDead) {
            this.makeGhost(group);
        }
        
        return group;
    },
    
    createVisor: function(isDead = false) {
        const visorGroup = new THREE.Group();
        
        // Visor glass
        const visorGeometry = new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI, 0, Math.PI * 0.4);
        const visorMaterial = new THREE.MeshPhongMaterial({ 
            color: isDead ? 0x666666 : 0x7FBFFF,
            transparent: true,
            opacity: 0.8,
            shininess: 200,
            specular: 0xFFFFFF,
            side: THREE.DoubleSide
        });
        
        const visor = new THREE.Mesh(visorGeometry, visorMaterial);
        visor.rotation.x = -0.3;
        visor.scale.set(1, 0.6, 0.8);
        visor.name = 'visorGlass';
        visorGroup.add(visor);
        
        // Visor highlight
        const highlightGeometry = new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI * 0.5);
        const highlightMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7
        });
        
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(-0.05, 0.05, 0.05);
        highlight.rotation.z = -0.3;
        visorGroup.add(highlight);
        
        // Dead X eyes
        if (isDead) {
            const xMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
            
            // Left X
            const leftX1 = new THREE.BoxGeometry(0.15, 0.02, 0.02);
            const leftX1Mesh = new THREE.Mesh(leftX1, xMaterial);
            leftX1Mesh.position.set(-0.08, 0, 0.1);
            leftX1Mesh.rotation.z = Math.PI / 4;
            visorGroup.add(leftX1Mesh);
            
            const leftX2 = new THREE.BoxGeometry(0.15, 0.02, 0.02);
            const leftX2Mesh = new THREE.Mesh(leftX2, xMaterial);
            leftX2Mesh.position.set(-0.08, 0, 0.1);
            leftX2Mesh.rotation.z = -Math.PI / 4;
            visorGroup.add(leftX2Mesh);
            
            // Right X
            const rightX1 = new THREE.BoxGeometry(0.15, 0.02, 0.02);
            const rightX1Mesh = new THREE.Mesh(rightX1, xMaterial);
            rightX1Mesh.position.set(0.08, 0, 0.1);
            rightX1Mesh.rotation.z = Math.PI / 4;
            visorGroup.add(rightX1Mesh);
            
            const rightX2 = new THREE.BoxGeometry(0.15, 0.02, 0.02);
            const rightX2Mesh = new THREE.Mesh(rightX2, xMaterial);
            rightX2Mesh.position.set(0.08, 0, 0.1);
            rightX2Mesh.rotation.z = -Math.PI / 4;
            visorGroup.add(rightX2Mesh);
        }
        
        visorGroup.name = 'visor';
        return visorGroup;
    },
    
    createBackpack: function(bodyMaterial) {
        const backpackGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.15);
        const backpack = new THREE.Mesh(backpackGeometry, bodyMaterial);
        backpack.castShadow = true;
        backpack.name = 'backpack';
        return backpack;
    },
    
    createHat: function(hatType) {
        const hatGroup = new THREE.Group();
        
        switch(hatType) {
            case 'astronaut':
                const helmetGeometry = new THREE.SphereGeometry(0.35, 16, 16);
                const helmetMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFFFFF,
                    transparent: true,
                    opacity: 0.3,
                    shininess: 100
                });
                const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
                helmet.scale.set(1, 1.1, 1);
                hatGroup.add(helmet);
                break;
                
            case 'captain':
                const capGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.15, 16);
                const capMaterial = new THREE.MeshPhongMaterial({ color: 0x1E3A8A });
                const cap = new THREE.Mesh(capGeometry, capMaterial);
                cap.position.y = -0.1;
                hatGroup.add(cap);
                
                const visorGeometry = new THREE.BoxGeometry(0.35, 0.02, 0.2);
                const visorMat = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const capVisor = new THREE.Mesh(visorGeometry, visorMat);
                capVisor.position.set(0, -0.1, 0.15);
                hatGroup.add(capVisor);
                break;
                
            case 'party':
                const coneGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
                const partyMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFF69B4,
                    shininess: 100
                });
                const cone = new THREE.Mesh(coneGeometry, partyMaterial);
                cone.position.y = 0.2;
                hatGroup.add(cone);
                
                // Party stripes
                for (let i = 0; i < 3; i++) {
                    const stripeGeometry = new THREE.TorusGeometry(0.12 - i * 0.03, 0.02, 8, 16);
                    const stripeMaterial = new THREE.MeshPhongMaterial({ 
                        color: i % 2 === 0 ? 0xFFFF00 : 0x00FFFF 
                    });
                    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                    stripe.position.y = 0.1 + i * 0.1;
                    hatGroup.add(stripe);
                }
                break;
                
            case 'chef':
                const chefHatGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.35, 16);
                const chefMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                const chefHat = new THREE.Mesh(chefHatGeometry, chefMaterial);
                hatGroup.add(chefHat);
                
                const puffGeometry = new THREE.SphereGeometry(0.28, 16, 8);
                const puff = new THREE.Mesh(puffGeometry, chefMaterial);
                puff.position.y = 0.15;
                puff.scale.y = 0.6;
                hatGroup.add(puff);
                break;
                
            case 'crown':
                const crownGroup = new THREE.Group();
                const crownBase = new THREE.CylinderGeometry(0.2, 0.25, 0.1, 8);
                const crownMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFD700,
                    shininess: 200
                });
                const base = new THREE.Mesh(crownBase, crownMaterial);
                crownGroup.add(base);
                
                // Crown points
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const pointGeometry = new THREE.ConeGeometry(0.05, 0.15, 4);
                    const point = new THREE.Mesh(pointGeometry, crownMaterial);
                    point.position.set(
                        Math.cos(angle) * 0.2,
                        0.1,
                        Math.sin(angle) * 0.2
                    );
                    crownGroup.add(point);
                }
                hatGroup.add(crownGroup);
                break;
                
            case 'flower':
                // Flower petals
                const petalMaterial = new THREE.MeshPhongMaterial({ color: 0xFF69B4 });
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    const petalGeometry = new THREE.SphereGeometry(0.08, 8, 8);
                    const petal = new THREE.Mesh(petalGeometry, petalMaterial);
                    petal.position.set(
                        Math.cos(angle) * 0.15,
                        0,
                        Math.sin(angle) * 0.15
                    );
                    petal.scale.set(1.5, 0.8, 1);
                    hatGroup.add(petal);
                }
                
                // Flower center
                const centerGeometry = new THREE.SphereGeometry(0.1, 8, 8);
                const centerMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFF00 });
                const center = new THREE.Mesh(centerGeometry, centerMaterial);
                hatGroup.add(center);
                break;
                
            case 'paper':
                const paperGeometry = new THREE.ConeGeometry(0.25, 0.02, 4);
                const paperMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFFFFF,
                    side: THREE.DoubleSide
                });
                const paper = new THREE.Mesh(paperGeometry, paperMaterial);
                paper.rotation.y = Math.PI / 4;
                hatGroup.add(paper);
                break;
                
            case 'horns':
                const hornMaterial = new THREE.MeshPhongMaterial({ color: 0x8B0000 });
                
                const leftHorn = new THREE.ConeGeometry(0.05, 0.2, 8);
                const leftHornMesh = new THREE.Mesh(leftHorn, hornMaterial);
                leftHornMesh.position.set(-0.15, 0.1, 0);
                leftHornMesh.rotation.z = -0.3;
                hatGroup.add(leftHornMesh);
                
                const rightHorn = new THREE.ConeGeometry(0.05, 0.2, 8);
                const rightHornMesh = new THREE.Mesh(rightHorn, hornMaterial);
                rightHornMesh.position.set(0.15, 0.1, 0);
                rightHornMesh.rotation.z = 0.3;
                hatGroup.add(rightHornMesh);
                break;
                
            case 'ninja':
                const ninjaMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const headband = new THREE.TorusGeometry(0.28, 0.03, 8, 16);
                const headbandMesh = new THREE.Mesh(headband, ninjaMaterial);
                headbandMesh.position.y = -0.05;
                hatGroup.add(headbandMesh);
                
                // Bandana tails
                const tailGeometry = new THREE.BoxGeometry(0.02, 0.02, 0.3);
                const leftTail = new THREE.Mesh(tailGeometry, ninjaMaterial);
                leftTail.position.set(-0.25, -0.05, -0.15);
                leftTail.rotation.y = 0.3;
                hatGroup.add(leftTail);
                
                const rightTail = new THREE.Mesh(tailGeometry, ninjaMaterial);
                rightTail.position.set(0.25, -0.05, -0.15);
                rightTail.rotation.y = -0.3;
                hatGroup.add(rightTail);
                break;
                
            case 'dum':
                // Sticky note with "dum" text
                const stickyGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.01);
                const stickyMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFF99 });
                const sticky = new THREE.Mesh(stickyGeometry, stickyMaterial);
                sticky.position.set(0, 0.15, 0.1);
                sticky.rotation.x = -0.3;
                hatGroup.add(sticky);
                
                // Add "DUM" text (simplified representation)
                const textGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.005);
                const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
                for (let i = 0; i < 3; i++) {
                    const letter = new THREE.Mesh(textGeometry, textMaterial);
                    letter.position.set(-0.05 + i * 0.05, 0.15, 0.11);
                    letter.scale.x = 0.3;
                    hatGroup.add(letter);
                }
                break;
        }
        
        hatGroup.name = 'hat';
        return hatGroup;
    },
    
    createPet: function(petType, ownerColor) {
        const petGroup = new THREE.Group();
        const scale = 0.5;
        
        switch(petType) {
            case 'mini_crewmate':
                // Mini version of the crewmate
                const miniColor = parseInt(ownerColor.replace('#', '0x'));
                const miniMaterial = new THREE.MeshPhongMaterial({ 
                    color: miniColor,
                    shininess: 100
                });
                
                // Mini body using cylinders and spheres
                const miniBodyGroup = new THREE.Group();
                
                const miniBodyCyl = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8);
                const miniBodyMiddle = new THREE.Mesh(miniBodyCyl, miniMaterial);
                miniBodyMiddle.position.y = 0.25;
                miniBodyGroup.add(miniBodyMiddle);
                
                const miniBodyTop = new THREE.SphereGeometry(0.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const miniTop = new THREE.Mesh(miniBodyTop, miniMaterial);
                miniTop.position.y = 0.375;
                miniBodyGroup.add(miniTop);
                
                const miniBodyBot = new THREE.SphereGeometry(0.2, 8, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
                const miniBot = new THREE.Mesh(miniBodyBot, miniMaterial);
                miniBot.position.y = 0.125;
                miniBodyGroup.add(miniBot);
                
                petGroup.add(miniBodyGroup);
                
                const miniVisor = this.createVisor().clone();
                miniVisor.scale.setScalar(0.5);
                miniVisor.position.set(0, 0.3, 0.19);
                petGroup.add(miniVisor);
                
                // Mini legs
                const miniLegCyl = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 4);
                const miniLeftLeg = new THREE.Mesh(miniLegCyl, miniMaterial);
                miniLeftLeg.position.set(-0.075, 0, 0);
                petGroup.add(miniLeftLeg);
                
                const miniRightLeg = new THREE.Mesh(miniLegCyl, miniMaterial);
                miniRightLeg.position.set(0.075, 0, 0);
                petGroup.add(miniRightLeg);
                break;
                
            case 'dog':
                const dogMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
                
                // Dog body
                const dogBody = new THREE.BoxGeometry(0.3, 0.15, 0.2);
                const dogBodyMesh = new THREE.Mesh(dogBody, dogMaterial);
                dogBodyMesh.position.y = 0.1;
                petGroup.add(dogBodyMesh);
                
                // Dog head
                const dogHead = new THREE.BoxGeometry(0.15, 0.15, 0.15);
                const dogHeadMesh = new THREE.Mesh(dogHead, dogMaterial);
                dogHeadMesh.position.set(0.15, 0.15, 0);
                petGroup.add(dogHeadMesh);
                
                // Dog ears
                const earGeometry = new THREE.ConeGeometry(0.05, 0.1, 4);
                const leftEar = new THREE.Mesh(earGeometry, dogMaterial);
                leftEar.position.set(0.1, 0.25, -0.05);
                leftEar.rotation.z = -0.5;
                petGroup.add(leftEar);
                
                const rightEar = new THREE.Mesh(earGeometry, dogMaterial);
                rightEar.position.set(0.1, 0.25, 0.05);
                rightEar.rotation.z = -0.5;
                petGroup.add(rightEar);
                
                // Tail
                const tailGeometry = new THREE.CylinderGeometry(0.03, 0.02, 0.15, 6);
                const tail = new THREE.Mesh(tailGeometry, dogMaterial);
                tail.position.set(-0.2, 0.15, 0);
                tail.rotation.z = -0.7;
                petGroup.add(tail);
                break;
                
            case 'robot':
                const robotMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x888888,
                    metalness: 0.8
                });
                
                // Robot body
                const robotBody = new THREE.BoxGeometry(0.2, 0.25, 0.15);
                const robotBodyMesh = new THREE.Mesh(robotBody, robotMaterial);
                robotBodyMesh.position.y = 0.15;
                petGroup.add(robotBodyMesh);
                
                // Robot head
                const robotHead = new THREE.BoxGeometry(0.15, 0.1, 0.1);
                const robotHeadMesh = new THREE.Mesh(robotHead, robotMaterial);
                robotHeadMesh.position.y = 0.3;
                petGroup.add(robotHeadMesh);
                
                // Robot eyes
                const eyeMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xFF0000,
                    emissive: 0xFF0000
                });
                const eyeGeometry = new THREE.BoxGeometry(0.03, 0.03, 0.01);
                
                const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                leftEye.position.set(-0.04, 0.3, 0.06);
                petGroup.add(leftEye);
                
                const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
                rightEye.position.set(0.04, 0.3, 0.06);
                petGroup.add(rightEye);
                
                // Antenna
                const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4);
                const antenna = new THREE.Mesh(antennaGeometry, robotMaterial);
                antenna.position.y = 0.4;
                petGroup.add(antenna);
                
                const antennaball = new THREE.SphereGeometry(0.02, 6, 6);
                const antennaBallMesh = new THREE.Mesh(antennaball, eyeMaterial);
                antennaBallMesh.position.y = 0.45;
                petGroup.add(antennaBallMesh);
                break;
                
            case 'ufo':
                const ufoMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x00FF00,
                    emissive: 0x00FF00,
                    emissiveIntensity: 0.2
                });
                
                // UFO disc
                const ufoGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.08, 16);
                const ufo = new THREE.Mesh(ufoGeometry, ufoMaterial);
                ufo.position.y = 0.15;
                petGroup.add(ufo);
                
                // UFO dome
                const domeGeometry = new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
                const domeMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x7FBFFF,
                    transparent: true,
                    opacity: 0.6
                });
                const dome = new THREE.Mesh(domeGeometry, domeMaterial);
                dome.position.y = 0.18;
                petGroup.add(dome);
                
                // Lights
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const lightGeometry = new THREE.SphereGeometry(0.02, 4, 4);
                    const lightMaterial = new THREE.MeshBasicMaterial({ 
                        color: 0xFFFF00,
                        emissive: 0xFFFF00
                    });
                    const light = new THREE.Mesh(lightGeometry, lightMaterial);
                    light.position.set(
                        Math.cos(angle) * 0.15,
                        0.15,
                        Math.sin(angle) * 0.15
                    );
                    petGroup.add(light);
                }
                break;
                
            case 'hamster':
                const hamsterMaterial = new THREE.MeshPhongMaterial({ color: 0xD2691E });
                
                // Hamster ball
                const ballGeometry = new THREE.SphereGeometry(0.15, 16, 16);
                const ballMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFFFFF,
                    transparent: true,
                    opacity: 0.3
                });
                const ball = new THREE.Mesh(ballGeometry, ballMaterial);
                ball.position.y = 0.15;
                petGroup.add(ball);
                
                // Hamster inside
                const hamsterGeometry = new THREE.SphereGeometry(0.08, 8, 8);
                const hamster = new THREE.Mesh(hamsterGeometry, hamsterMaterial);
                hamster.position.y = 0.1;
                hamster.scale.set(1, 0.8, 0.9);
                petGroup.add(hamster);
                break;
        }
        
        petGroup.scale.setScalar(scale);
        petGroup.name = 'pet';
        return petGroup;
    },
    
    createAccessory: function(accessoryType) {
        const accessoryGroup = new THREE.Group();
        
        switch(accessoryType) {
            case 'glasses':
                const framesMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const glassMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x7FBFFF,
                    transparent: true,
                    opacity: 0.3
                });
                
                // Glasses frames
                const leftFrame = new THREE.TorusGeometry(0.08, 0.01, 8, 16);
                const leftFrameMesh = new THREE.Mesh(leftFrame, framesMaterial);
                leftFrameMesh.position.set(-0.1, 0.55, 0.38);
                accessoryGroup.add(leftFrameMesh);
                
                const rightFrame = new THREE.TorusGeometry(0.08, 0.01, 8, 16);
                const rightFrameMesh = new THREE.Mesh(rightFrame, framesMaterial);
                rightFrameMesh.position.set(0.1, 0.55, 0.38);
                accessoryGroup.add(rightFrameMesh);
                
                // Bridge
                const bridgeGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.1, 4);
                const bridge = new THREE.Mesh(bridgeGeometry, framesMaterial);
                bridge.position.set(0, 0.55, 0.38);
                bridge.rotation.z = Math.PI / 2;
                accessoryGroup.add(bridge);
                
                // Glass lenses
                const leftLens = new THREE.CircleGeometry(0.07, 16);
                const leftLensMesh = new THREE.Mesh(leftLens, glassMaterial);
                leftLensMesh.position.set(-0.1, 0.55, 0.375);
                accessoryGroup.add(leftLensMesh);
                
                const rightLens = new THREE.CircleGeometry(0.07, 16);
                const rightLensMesh = new THREE.Mesh(rightLens, glassMaterial);
                rightLensMesh.position.set(0.1, 0.55, 0.375);
                accessoryGroup.add(rightLensMesh);
                break;
                
            case 'sunglasses':
                const sunFramesMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const sunGlassMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x111111,
                    transparent: true,
                    opacity: 0.8,
                    shininess: 100
                });
                
                // Sunglasses frames (cooler shape)
                const sunLeftFrame = new THREE.TorusGeometry(0.09, 0.015, 8, 16);
                const sunLeftFrameMesh = new THREE.Mesh(sunLeftFrame, sunFramesMaterial);
                sunLeftFrameMesh.position.set(-0.1, 0.55, 0.38);
                accessoryGroup.add(sunLeftFrameMesh);
                
                const sunRightFrame = new THREE.TorusGeometry(0.09, 0.015, 8, 16);
                const sunRightFrameMesh = new THREE.Mesh(sunRightFrame, sunFramesMaterial);
                sunRightFrameMesh.position.set(0.1, 0.55, 0.38);
                accessoryGroup.add(sunRightFrameMesh);
                
                // Bridge
                const sunBridgeGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4);
                const sunBridge = new THREE.Mesh(sunBridgeGeometry, sunFramesMaterial);
                sunBridge.position.set(0, 0.55, 0.38);
                sunBridge.rotation.z = Math.PI / 2;
                accessoryGroup.add(sunBridge);
                
                // Dark lenses
                const sunLeftLens = new THREE.CircleGeometry(0.08, 16);
                const sunLeftLensMesh = new THREE.Mesh(sunLeftLens, sunGlassMaterial);
                sunLeftLensMesh.position.set(-0.1, 0.55, 0.375);
                accessoryGroup.add(sunLeftLensMesh);
                
                const sunRightLens = new THREE.CircleGeometry(0.08, 16);
                const sunRightLensMesh = new THREE.Mesh(sunRightLens, sunGlassMaterial);
                sunRightLensMesh.position.set(0.1, 0.55, 0.375);
                accessoryGroup.add(sunRightLensMesh);
                break;
                
            case 'monocle':
                const monocleFrame = new THREE.TorusGeometry(0.1, 0.015, 8, 16);
                const monocleMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFD700,
                    shininess: 100
                });
                const monocle = new THREE.Mesh(monocleFrame, monocleMaterial);
                monocle.position.set(0.12, 0.55, 0.38);
                accessoryGroup.add(monocle);
                
                // Monocle lens
                const monocleLens = new THREE.CircleGeometry(0.09, 16);
                const monocleLensMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x7FBFFF,
                    transparent: true,
                    opacity: 0.3
                });
                const monocleLensMesh = new THREE.Mesh(monocleLens, monocleLensMaterial);
                monocleLensMesh.position.set(0.12, 0.55, 0.375);
                accessoryGroup.add(monocleLensMesh);
                
                // Chain
                const chainGeometry = new THREE.CylinderGeometry(0.002, 0.002, 0.3, 4);
                const chain = new THREE.Mesh(chainGeometry, monocleMaterial);
                chain.position.set(0.15, 0.4, 0.35);
                chain.rotation.z = 0.2;
                accessoryGroup.add(chain);
                break;
                
            case 'mask':
                const maskGeometry = new THREE.BoxGeometry(0.3, 0.15, 0.05);
                const maskMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 });
                const mask = new THREE.Mesh(maskGeometry, maskMaterial);
                mask.position.set(0, 0.45, 0.38);
                mask.scale.set(1, 0.8, 1);
                accessoryGroup.add(mask);
                
                // Mask straps
                const strapMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const leftStrap = new THREE.BoxGeometry(0.02, 0.02, 0.2);
                const leftStrapMesh = new THREE.Mesh(leftStrap, strapMaterial);
                leftStrapMesh.position.set(-0.15, 0.45, 0.28);
                accessoryGroup.add(leftStrapMesh);
                
                const rightStrap = new THREE.BoxGeometry(0.02, 0.02, 0.2);
                const rightStrapMesh = new THREE.Mesh(rightStrap, strapMaterial);
                rightStrapMesh.position.set(0.15, 0.45, 0.28);
                accessoryGroup.add(rightStrapMesh);
                break;
                
            case 'bandana':
                const bandanaGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.02);
                const bandanaMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
                const bandana = new THREE.Mesh(bandanaGeometry, bandanaMaterial);
                bandana.position.set(0, 0.35, 0.38);
                accessoryGroup.add(bandana);
                
                // Bandana pattern dots
                const dotMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                for (let i = -2; i <= 2; i++) {
                    const dot = new THREE.CircleGeometry(0.015, 8);
                    const dotMesh = new THREE.Mesh(dot, dotMaterial);
                    dotMesh.position.set(i * 0.06, 0.35, 0.385);
                    accessoryGroup.add(dotMesh);
                }
                break;
                
            case 'goggles':
                const gogglesMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const goggleLensMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFAA00,
                    transparent: true,
                    opacity: 0.6,
                    shininess: 80
                });
                
                // Goggle frames
                const leftGoggle = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
                const leftGoggleMesh = new THREE.Mesh(leftGoggle, gogglesMaterial);
                leftGoggleMesh.position.set(-0.1, 0.6, 0.35);
                accessoryGroup.add(leftGoggleMesh);
                
                const rightGoggle = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
                const rightGoggleMesh = new THREE.Mesh(rightGoggle, gogglesMaterial);
                rightGoggleMesh.position.set(0.1, 0.6, 0.35);
                accessoryGroup.add(rightGoggleMesh);
                
                // Goggle lenses
                const leftGoggleLens = new THREE.CircleGeometry(0.06, 16);
                const leftGoggleLensMesh = new THREE.Mesh(leftGoggleLens, goggleLensMaterial);
                leftGoggleLensMesh.position.set(-0.1, 0.6, 0.36);
                accessoryGroup.add(leftGoggleLensMesh);
                
                const rightGoggleLens = new THREE.CircleGeometry(0.06, 16);
                const rightGoggleLensMesh = new THREE.Mesh(rightGoggleLens, goggleLensMaterial);
                rightGoggleLensMesh.position.set(0.1, 0.6, 0.36);
                accessoryGroup.add(rightGoggleLensMesh);
                
                // Strap
                const strapGeometry = new THREE.TorusGeometry(0.28, 0.015, 8, 16, Math.PI);
                const strap = new THREE.Mesh(strapGeometry, gogglesMaterial);
                strap.position.set(0, 0.6, 0);
                strap.rotation.x = Math.PI / 2;
                strap.rotation.z = Math.PI;
                accessoryGroup.add(strap);
                break;
                
            case 'eyepatch':
                const eyepatchMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const eyepatchGeometry = new THREE.CircleGeometry(0.06, 16);
                const eyepatch = new THREE.Mesh(eyepatchGeometry, eyepatchMaterial);
                eyepatch.position.set(-0.1, 0.55, 0.39);
                eyepatch.scale.set(1.2, 1, 1);
                accessoryGroup.add(eyepatch);
                
                // Eyepatch strap
                const eyepatchStrap = new THREE.BoxGeometry(0.4, 0.02, 0.02);
                const eyepatchStrapMesh = new THREE.Mesh(eyepatchStrap, eyepatchMaterial);
                eyepatchStrapMesh.position.set(0, 0.55, 0.2);
                eyepatchStrapMesh.rotation.y = 0.3;
                accessoryGroup.add(eyepatchStrapMesh);
                break;
        }
        
        accessoryGroup.name = 'accessory';
        return accessoryGroup;
    },
    
    addClothes: function(group, clothesType, bodyMaterial) {
        const body = group.getObjectByName('body');
        if (!body) return;
        
        switch(clothesType) {
            case 'suit':
                // Add tie
                const tieGeometry = new THREE.BoxGeometry(0.05, 0.4, 0.02);
                const tieMaterial = new THREE.MeshPhongMaterial({ color: 0xFF0000 });
                const tie = new THREE.Mesh(tieGeometry, tieMaterial);
                tie.position.set(0, 0.3, 0.41);
                group.add(tie);
                
                // Add collar
                const collarGeometry = new THREE.BoxGeometry(0.35, 0.05, 0.02);
                const collarMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                const collar = new THREE.Mesh(collarGeometry, collarMaterial);
                collar.position.set(0, 0.65, 0.38);
                group.add(collar);
                
                // Add suit jacket lines
                const lapelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
                const leftLapel = new THREE.BoxGeometry(0.02, 0.3, 0.02);
                const leftLapelMesh = new THREE.Mesh(leftLapel, lapelMaterial);
                leftLapelMesh.position.set(-0.15, 0.4, 0.41);
                leftLapelMesh.rotation.z = 0.1;
                group.add(leftLapelMesh);
                
                const rightLapel = new THREE.BoxGeometry(0.02, 0.3, 0.02);
                const rightLapelMesh = new THREE.Mesh(rightLapel, lapelMaterial);
                rightLapelMesh.position.set(0.15, 0.4, 0.41);
                rightLapelMesh.rotation.z = -0.1;
                group.add(rightLapelMesh);
                break;
                
            case 'doctor':
                // Add stethoscope
                const stethoscopeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const neckband = new THREE.TorusGeometry(0.25, 0.01, 8, 16, Math.PI);
                const neckbandMesh = new THREE.Mesh(neckband, stethoscopeMaterial);
                neckbandMesh.position.set(0, 0.5, 0);
                neckbandMesh.rotation.x = Math.PI / 2;
                neckbandMesh.rotation.z = Math.PI;
                group.add(neckbandMesh);
                
                // Stethoscope chest piece
                const chestPiece = new THREE.CylinderGeometry(0.03, 0.03, 0.01, 16);
                const chestPieceMesh = new THREE.Mesh(chestPiece, stethoscopeMaterial);
                chestPieceMesh.position.set(0, 0.3, 0.38);
                chestPieceMesh.rotation.x = Math.PI / 2;
                group.add(chestPieceMesh);
                
                // White coat effect (lighter body parts)
                const coatAccent = new THREE.BoxGeometry(0.02, 0.4, 0.02);
                const coatMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                const leftCoat = new THREE.Mesh(coatAccent, coatMaterial);
                leftCoat.position.set(-0.35, 0.4, 0);
                group.add(leftCoat);
                
                const rightCoat = new THREE.Mesh(coatAccent, coatMaterial);
                rightCoat.position.set(0.35, 0.4, 0);
                group.add(rightCoat);
                break;
                
            case 'police':
                // Add badge
                const badgeGeometry = new THREE.CircleGeometry(0.05, 8);
                const badgeMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFD700,
                    shininess: 200
                });
                const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
                badge.position.set(-0.15, 0.6, 0.41);
                group.add(badge);
                
                // Add belt
                const beltGeometry = new THREE.TorusGeometry(0.35, 0.02, 8, 16);
                const beltMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const belt = new THREE.Mesh(beltGeometry, beltMaterial);
                belt.position.set(0, 0.2, 0);
                belt.rotation.x = Math.PI / 2;
                group.add(belt);
                
                // Radio
                const radioGeometry = new THREE.BoxGeometry(0.04, 0.08, 0.03);
                const radioMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const radio = new THREE.Mesh(radioGeometry, radioMaterial);
                radio.position.set(0.3, 0.5, 0.1);
                group.add(radio);
                break;
                
            case 'mechanic':
                // Tool belt
                const toolBeltGeometry = new THREE.TorusGeometry(0.36, 0.025, 8, 16);
                const toolBeltMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
                const toolBelt = new THREE.Mesh(toolBeltGeometry, toolBeltMaterial);
                toolBelt.position.set(0, 0.15, 0);
                toolBelt.rotation.x = Math.PI / 2;
                group.add(toolBelt);
                
                // Wrench
                const wrenchHandle = new THREE.BoxGeometry(0.02, 0.1, 0.02);
                const wrenchMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
                const wrench = new THREE.Mesh(wrenchHandle, wrenchMaterial);
                wrench.position.set(-0.25, 0.15, 0.15);
                wrench.rotation.z = 0.3;
                group.add(wrench);
                
                // Oil stains (dark patches)
                const stainMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const stain1 = new THREE.CircleGeometry(0.04, 8);
                const stain1Mesh = new THREE.Mesh(stain1, stainMaterial);
                stain1Mesh.position.set(0.1, 0.4, 0.41);
                group.add(stain1Mesh);
                
                const stain2 = new THREE.CircleGeometry(0.03, 6);
                const stain2Mesh = new THREE.Mesh(stain2, stainMaterial);
                stain2Mesh.position.set(-0.15, 0.25, 0.41);
                group.add(stain2Mesh);
                break;
                
            case 'astronaut':
                // NASA patch
                const patchGeometry = new THREE.BoxGeometry(0.08, 0.05, 0.01);
                const patchMaterial = new THREE.MeshPhongMaterial({ color: 0x0033A0 });
                const patch = new THREE.Mesh(patchGeometry, patchMaterial);
                patch.position.set(0.15, 0.6, 0.41);
                group.add(patch);
                
                // American flag
                const flagGeometry = new THREE.BoxGeometry(0.06, 0.04, 0.01);
                const flagMaterial = new THREE.MeshPhongMaterial({ color: 0xB22234 });
                const flag = new THREE.Mesh(flagGeometry, flagMaterial);
                flag.position.set(-0.15, 0.6, 0.41);
                group.add(flag);
                
                // Space suit lines
                const suitLineMaterial = new THREE.MeshPhongMaterial({ color: 0xCCCCCC });
                const centerLine = new THREE.BoxGeometry(0.02, 0.5, 0.02);
                const centerLineMesh = new THREE.Mesh(centerLine, suitLineMaterial);
                centerLineMesh.position.set(0, 0.35, 0.41);
                group.add(centerLineMesh);
                break;
                
            case 'captain':
                // Epaulettes
                const epauletteMaterial = new THREE.MeshPhongMaterial({ color: 0xFFD700 });
                const leftEpaulette = new THREE.BoxGeometry(0.12, 0.03, 0.05);
                const leftEpauletteMesh = new THREE.Mesh(leftEpaulette, epauletteMaterial);
                leftEpauletteMesh.position.set(-0.25, 0.65, 0);
                group.add(leftEpauletteMesh);
                
                const rightEpaulette = new THREE.BoxGeometry(0.12, 0.03, 0.05);
                const rightEpauletteMesh = new THREE.Mesh(rightEpaulette, epauletteMaterial);
                rightEpauletteMesh.position.set(0.25, 0.65, 0);
                group.add(rightEpauletteMesh);
                
                // Captain stripes
                for (let i = 0; i < 4; i++) {
                    const stripe = new THREE.BoxGeometry(0.08, 0.01, 0.01);
                    const stripeMesh = new THREE.Mesh(stripe, epauletteMaterial);
                    stripeMesh.position.set(-0.25, 0.62 - i * 0.02, 0.05);
                    group.add(stripeMesh);
                    
                    const stripe2 = new THREE.BoxGeometry(0.08, 0.01, 0.01);
                    const stripeMesh2 = new THREE.Mesh(stripe2, epauletteMaterial);
                    stripeMesh2.position.set(0.25, 0.62 - i * 0.02, 0.05);
                    group.add(stripeMesh2);
                }
                break;
                
            case 'military':
                // Camo pattern (simplified)
                const camoColors = [0x4B5320, 0x8B7355, 0x228B22];
                for (let i = 0; i < 6; i++) {
                    const camoGeometry = new THREE.CircleGeometry(0.05, 6);
                    const camoMaterial = new THREE.MeshPhongMaterial({ 
                        color: camoColors[i % camoColors.length] 
                    });
                    const camoPatch = new THREE.Mesh(camoGeometry, camoMaterial);
                    camoPatch.position.set(
                        (Math.random() - 0.5) * 0.6,
                        0.2 + Math.random() * 0.5,
                        0.41
                    );
                    group.add(camoPatch);
                }
                
                // Dog tags
                const tagChain = new THREE.BoxGeometry(0.01, 0.2, 0.01);
                const tagMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
                const chain = new THREE.Mesh(tagChain, tagMaterial);
                chain.position.set(0, 0.5, 0.38);
                group.add(chain);
                
                const tag = new THREE.BoxGeometry(0.03, 0.04, 0.005);
                const tagMesh = new THREE.Mesh(tag, tagMaterial);
                tagMesh.position.set(0, 0.35, 0.39);
                group.add(tagMesh);
                break;
                
            case 'tuxedo':
                // Bow tie
                const bowTieMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
                const bowCenter = new THREE.BoxGeometry(0.03, 0.02, 0.02);
                const bowCenterMesh = new THREE.Mesh(bowCenter, bowTieMaterial);
                bowCenterMesh.position.set(0, 0.62, 0.4);
                group.add(bowCenterMesh);
                
                const bowLeft = new THREE.ConeGeometry(0.03, 0.06, 4);
                const bowLeftMesh = new THREE.Mesh(bowLeft, bowTieMaterial);
                bowLeftMesh.position.set(-0.04, 0.62, 0.4);
                bowLeftMesh.rotation.z = -Math.PI / 2;
                group.add(bowLeftMesh);
                
                const bowRight = new THREE.ConeGeometry(0.03, 0.06, 4);
                const bowRightMesh = new THREE.Mesh(bowRight, bowTieMaterial);
                bowRightMesh.position.set(0.04, 0.62, 0.4);
                bowRightMesh.rotation.z = Math.PI / 2;
                group.add(bowRightMesh);
                
                // Tuxedo buttons
                for (let i = 0; i < 3; i++) {
                    const button = new THREE.CircleGeometry(0.015, 8);
                    const buttonMesh = new THREE.Mesh(button, bowTieMaterial);
                    buttonMesh.position.set(0, 0.5 - i * 0.1, 0.41);
                    group.add(buttonMesh);
                }
                break;
                
            case 'hoodie':
                // Hood (if not wearing a hat)
                const hoodMaterial = new THREE.MeshPhongMaterial({ 
                    color: bodyMaterial.color,
                    opacity: 0.8,
                    transparent: true
                });
                const hoodGeometry = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
                const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
                hood.position.set(0, 0.85, -0.2);
                hood.scale.set(1, 0.8, 0.8);
                group.add(hood);
                
                // Hoodie strings
                const stringMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                const leftString = new THREE.CylinderGeometry(0.005, 0.005, 0.15, 4);
                const leftStringMesh = new THREE.Mesh(leftString, stringMaterial);
                leftStringMesh.position.set(-0.08, 0.55, 0.38);
                group.add(leftStringMesh);
                
                const rightString = new THREE.CylinderGeometry(0.005, 0.005, 0.15, 4);
                const rightStringMesh = new THREE.Mesh(rightString, stringMaterial);
                rightStringMesh.position.set(0.08, 0.55, 0.38);
                group.add(rightStringMesh);
                
                // Pocket
                const pocketGeometry = new THREE.BoxGeometry(0.2, 0.15, 0.02);
                const pocketMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x000000,
                    opacity: 0.3,
                    transparent: true
                });
                const pocket = new THREE.Mesh(pocketGeometry, pocketMaterial);
                pocket.position.set(0, 0.25, 0.4);
                group.add(pocket);
                break;
                
            case 'lab_coat':
                // White coat overlay
                const labCoatMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0xFFFFFF,
                    opacity: 0.9,
                    transparent: true
                });
                
                // Lab coat body overlay
                const coatOverlay = new THREE.BoxGeometry(0.45, 0.6, 0.05);
                const coatMesh = new THREE.Mesh(coatOverlay, labCoatMaterial);
                coatMesh.position.set(0, 0.35, 0.37);
                group.add(coatMesh);
                
                // Pockets
                const pocketGeom = new THREE.BoxGeometry(0.08, 0.08, 0.01);
                const leftPocket = new THREE.Mesh(pocketGeom, labCoatMaterial);
                leftPocket.position.set(-0.15, 0.2, 0.42);
                group.add(leftPocket);
                
                const rightPocket = new THREE.Mesh(pocketGeom, labCoatMaterial);
                rightPocket.position.set(0.15, 0.2, 0.42);
                group.add(rightPocket);
                
                // Pen in pocket
                const penGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.06, 6);
                const penMaterial = new THREE.MeshPhongMaterial({ color: 0x0000FF });
                const pen = new THREE.Mesh(penGeometry, penMaterial);
                pen.position.set(-0.15, 0.25, 0.43);
                group.add(pen);
                break;
                
            case 'chef_outfit':
                // Chef apron
                const apronMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                const apron = new THREE.BoxGeometry(0.35, 0.4, 0.02);
                const apronMesh = new THREE.Mesh(apron, apronMaterial);
                apronMesh.position.set(0, 0.2, 0.4);
                group.add(apronMesh);
                
                // Apron strings
                const stringGeom = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 4);
                const apronString1 = new THREE.Mesh(stringGeom, apronMaterial);
                apronString1.position.set(-0.15, 0.5, 0.35);
                apronString1.rotation.z = 0.3;
                group.add(apronString1);
                
                const apronString2 = new THREE.Mesh(stringGeom, apronMaterial);
                apronString2.position.set(0.15, 0.5, 0.35);
                apronString2.rotation.z = -0.3;
                group.add(apronString2);
                
                // Name tag
                const nameTagGeometry = new THREE.BoxGeometry(0.06, 0.03, 0.01);
                const nameTagMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const nameTag = new THREE.Mesh(nameTagGeometry, nameTagMaterial);
                nameTag.position.set(0.1, 0.55, 0.41);
                group.add(nameTag);
                break;
        }
    },
    
    makeGhost: function(group) {
        // Make all materials semi-transparent
        group.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = 0.7;
            }
        });
        
        // Add floating effect
        group.position.y = 0.3;
    },
    
    createShadow: function() {
        const shadowGeometry = new THREE.PlaneGeometry(0.8, 0.8);
        const shadowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.01;
        shadow.receiveShadow = true;
        shadow.name = 'shadow';
        
        return shadow;
    },
    
    createNameLabel: function(name, nationality) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.roundRect(context, 10, 10, canvas.width - 20, canvas.height - 20, 15);
        context.fill();
        
        // Border
        context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        context.lineWidth = 2;
        this.roundRect(context, 10, 10, canvas.width - 20, canvas.height - 20, 15);
        context.stroke();
        
        // Flag emoji
        const flagEmojis = {
            'KR': '🇰🇷', 'US': '🇺🇸', 'GB': '🇬🇧', 'JP': '🇯🇵', 'CN': '🇨🇳',
            'DE': '🇩🇪', 'FR': '🇫🇷', 'CA': '🇨🇦', 'AU': '🇦🇺', 'BR': '🇧🇷',
            'IN': '🇮🇳', 'RU': '🇷🇺', 'MX': '🇲🇽', 'IT': '🇮🇹', 'ES': '🇪🇸'
        };
        
        const flagEmoji = flagEmojis[nationality] || '🌍';
        
        // Draw flag
        context.font = 'bold 20px Arial';
        context.textAlign = 'left';
        context.fillStyle = 'white';
        context.fillText(flagEmoji, 20, 38);
        
        // Draw name
        context.font = 'bold 18px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'white';
        context.fillText(name, canvas.width / 2 + 10, 38);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.5, 0.375, 1);
        
        return sprite;
    },
    
    // Animation methods
    startIdleAnimations: function() {
        setInterval(() => {
            const time = Date.now() * 0.001;
            
            this.avatars.forEach(avatar => {
                if (!avatar.isWalking && avatar.mesh) {
                    // Floating animation
                    avatar.floatPhase += 0.02;
                    avatar.group.position.y = Math.sin(avatar.floatPhase) * 0.05;
                    
                    // Slight rotation
                    avatar.group.rotation.y = Math.sin(avatar.floatPhase * 0.5) * 0.05;
                    
                    // Visor shine animation
                    const visor = avatar.mesh.getObjectByName('visor');
                    if (visor) {
                        const highlight = visor.children.find(child => child.geometry instanceof THREE.TorusGeometry);
                        if (highlight) {
                            highlight.material.opacity = 0.7 + Math.sin(time * 3) * 0.3;
                        }
                    }
                    
                    // Pet animation
                    if (avatar.pet) {
                        avatar.pet.position.y = Math.sin(avatar.floatPhase * 1.5) * 0.02;
                        avatar.pet.rotation.y = Math.sin(avatar.floatPhase * 0.7) * 0.1;
                    }
                }
            });
        }, 50);
    },
    
    startWalkAnimation: function() {
        setInterval(() => {
            this.avatars.forEach(avatar => {
                if (avatar.isWalking && avatar.mesh) {
                    avatar.walkPhase += 0.15;
                    
                    // Leg animation
                    const leftLeg = avatar.mesh.getObjectByName('leftLeg');
                    const rightLeg = avatar.mesh.getObjectByName('rightLeg');
                    
                    if (leftLeg && rightLeg) {
                        leftLeg.rotation.x = Math.sin(avatar.walkPhase) * 0.5;
                        rightLeg.rotation.x = Math.sin(avatar.walkPhase + Math.PI) * 0.5;
                    }
                    
                    // Body wobble
                    avatar.mesh.rotation.z = Math.sin(avatar.walkPhase * 0.5) * 0.05;
                    
                    // Pet following
                    if (avatar.pet) {
                        avatar.pet.position.x = -0.8 + Math.sin(avatar.walkPhase * 0.3) * 0.1;
                        avatar.pet.position.z = 0.3 + Math.sin(avatar.walkPhase * 0.5) * 0.05;
                    }
                }
            });
        }, 50);
    },
    
    playSpawnAnimation: function(avatarData) {
        const group = avatarData.group;
        
        // Start invisible and small
        group.scale.setScalar(0);
        group.rotation.y = 0;
        
        // Teleport effect particles
        const particleCount = 20;
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(avatarData.customization.color),
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(group.position);
            particle.position.x += (Math.random() - 0.5) * 2;
            particle.position.y += Math.random() * 2;
            particle.position.z += (Math.random() - 0.5) * 2;
            
            particles.push(particle);
            
            if (window.SceneManager) {
                window.SceneManager.addObject(particle);
            }
        }
        
        // Animate spawn
        let animationPhase = 0;
        const animateSpawn = () => {
            animationPhase += 0.05;
            
            // Scale up with bounce
            const scale = this.easeOutBounce(Math.min(animationPhase, 1)) * avatarData.customization.scale;
            group.scale.setScalar(scale);
            
            // Particle animation
            particles.forEach((particle, index) => {
                particle.position.y -= 0.05;
                particle.scale.setScalar(1 - animationPhase);
                particle.material.opacity = 0.8 - animationPhase * 0.8;
                
                if (animationPhase >= 1 && window.SceneManager) {
                    window.SceneManager.removeObject(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                }
            });
            
            if (animationPhase < 1) {
                requestAnimationFrame(animateSpawn);
            }
        };
        
        requestAnimationFrame(animateSpawn);
    },
    
    // All other methods remain the same...
    playKillAnimation: function(avatarId, killerId) {
        const avatar = this.avatars.get(avatarId);
        const killer = this.avatars.get(killerId);
        
        if (!avatar || !killer) return;
        
        // Killer animation
        if (killer.mesh) {
            // Quick stab motion
            const originalPos = killer.group.position.clone();
            const direction = new THREE.Vector3()
                .subVectors(avatar.group.position, killer.group.position)
                .normalize();
            
            // Move forward quickly
            killer.group.position.add(direction.multiplyScalar(0.5));
            
            // Return to position
            setTimeout(() => {
                killer.group.position.copy(originalPos);
            }, 200);
        }
        
        // Victim animation
        if (avatar.mesh) {
            // Change to dead state
            avatar.isDead = true;
            avatar.customization.isDead = true;
            
            // Replace visor with dead version
            const visor = avatar.mesh.getObjectByName('visor');
            if (visor && visor.parent) {
                visor.parent.remove(visor);
                const deadVisor = this.createVisor(true);
                deadVisor.position.set(0, 0.55, 0.38);
                avatar.mesh.add(deadVisor);
            }
            
            // Death animation
            let deathPhase = 0;
            const animateDeath = () => {
                deathPhase += 0.1;
                
                // Fall over
                avatar.group.rotation.z = Math.min(deathPhase * Math.PI / 2, Math.PI / 2);
                avatar.group.position.y = Math.max(0, 0.5 - deathPhase * 0.5);
                
                if (deathPhase < 1) {
                    requestAnimationFrame(animateDeath);
                } else {
                    // Convert to ghost after delay
                    setTimeout(() => {
                        this.makeGhost(avatar.mesh);
                        avatar.group.rotation.z = 0;
                        avatar.group.position.y = 0.3; // Float
                    }, 1000);
                }
            };
            
            requestAnimationFrame(animateDeath);
        }
    },
    
    playTaskAnimation: function(avatarId, taskType) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar || !avatar.mesh) return;
        
        // Simple task animation - avatar looks busy
        const originalRotation = avatar.group.rotation.y;
        let taskPhase = 0;
        
        const animateTask = () => {
            taskPhase += 0.05;
            
            // Wiggle while doing task
            avatar.group.rotation.y = originalRotation + Math.sin(taskPhase * 10) * 0.1;
            
            if (taskPhase < 1) {
                requestAnimationFrame(animateTask);
            } else {
                avatar.group.rotation.y = originalRotation;
            }
        };
        
        requestAnimationFrame(animateTask);
    },
    
    // Movement methods
    setWalking: function(avatarId, isWalking) {
        const avatar = this.avatars.get(avatarId);
        if (avatar) {
            avatar.isWalking = isWalking;
        }
    },
    
    moveAvatar: function(avatarId, targetPosition, duration = 1000) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        const startPosition = avatar.group.position.clone();
        const startTime = Date.now();
        
        // Face direction of movement
        const direction = new THREE.Vector3()
            .subVectors(targetPosition, startPosition)
            .normalize();
        const targetRotation = Math.atan2(direction.x, direction.z);
        
        this.setWalking(avatarId, true);
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Interpolate position
            avatar.group.position.lerpVectors(startPosition, targetPosition, progress);
            
            // Interpolate rotation
            avatar.group.rotation.y = this.lerpAngle(
                avatar.group.rotation.y,
                targetRotation,
                progress
            );
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.setWalking(avatarId, false);
                avatar.position = avatar.group.position.clone();
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    // Customization methods
    customizeAvatar: function(avatarId, options) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        // Update customization
        Object.assign(avatar.customization, options);
        
        // Rebuild character
        avatar.group.remove(avatar.mesh);
        const newMesh = this.createAmongUsCharacter(avatar.customization);
        avatar.group.add(newMesh);
        avatar.mesh = newMesh;
        
        // Update name label if needed
        if (options.name || options.nationality) {
            avatar.group.remove(avatar.nameLabel);
            const newLabel = this.createNameLabel(
                avatar.customization.name,
                avatar.customization.nationality
            );
            newLabel.position.y = 1.8;
            avatar.group.add(newLabel);
            avatar.nameLabel = newLabel;
        }
        
        // Play customization effect
        this.playCustomizationEffect(avatar);
    },
    
    playCustomizationEffect: function(avatar) {
        // Sparkle effect
        const sparkleCount = 15;
        const sparkles = [];
        
        for (let i = 0; i < sparkleCount; i++) {
            const sparkleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
            const sparkleColor = new THREE.Color().setHSL(Math.random(), 1, 0.5);
            const sparkleMaterial = new THREE.MeshBasicMaterial({
                color: sparkleColor,
                transparent: true,
                opacity: 0.8
            });
            
            const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
            sparkle.position.copy(avatar.group.position);
            sparkle.position.x += (Math.random() - 0.5) * 1;
            sparkle.position.y += Math.random() * 1.5;
            sparkle.position.z += (Math.random() - 0.5) * 1;
            
            sparkles.push(sparkle);
            
            if (window.SceneManager) {
                window.SceneManager.addObject(sparkle);
            }
        }
        
        // Animate sparkles
        let sparklePhase = 0;
        const animateSparkles = () => {
            sparklePhase += 0.05;
            
            sparkles.forEach((sparkle) => {
                sparkle.position.y += 0.02;
                sparkle.scale.setScalar(1 - sparklePhase);
                sparkle.material.opacity = 0.8 - sparklePhase * 0.8;
                sparkle.rotation.y += 0.1;
                
                if (sparklePhase >= 1 && window.SceneManager) {
                    window.SceneManager.removeObject(sparkle);
                    sparkle.geometry.dispose();
                    sparkle.material.dispose();
                }
            });
            
            if (sparklePhase < 1) {
                requestAnimationFrame(animateSparkles);
            }
        };
        
        requestAnimationFrame(animateSparkles);
    },
    
    // Default avatar
    createDefaultAvatar: function() {
        if (this.avatars.has('default')) {
            console.log('🚀 Default Among Us avatar already exists');
            return this.avatars.get('default');
        }
        
        const defaultAvatar = this.createAvatar('default', {
            name: window.ROOM_CONFIG?.username || 'You',
            nationality: window.ROOM_CONFIG?.userNationality || 'UN',
            position: { x: 0, y: 0, z: 0 },
            color: this.colors.red,
            hat: 'none',
            clothes: 'none',
            accessory: 'none'
        });
        
        console.log('🚀 Created default Among Us avatar');
        return defaultAvatar;
    },
    
    // Remote avatar creation
    createRemoteAvatarSafe: function(userData) {
        console.log(`🚀 Creating Among Us avatar for: ${userData.username}`);
        
        // Prevent creating avatar for current user
        if (userData.user_id === (window.ROOM_CONFIG?.userId || window.WebSocketManager?.userId)) {
            console.warn('❌ Attempted to create avatar for current user - skipping');
            return null;
        }
        
        try {
            // Generate position based on user ID
            const hash = userData.user_id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            
            const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
            const radius = 3 + (Math.abs(hash) % 4);
            
            const position = userData.position || {
                x: Math.cos(angle) * radius,
                y: 0,
                z: Math.sin(angle) * radius
            };
            
            // Pick random color based on hash
            const colorKeys = Object.keys(this.colors);
            const colorIndex = Math.abs(hash) % colorKeys.length;
            const color = this.colors[colorKeys[colorIndex]];
            
            // Create avatar
            const avatarData = this.createAvatar(userData.user_id, {
                name: userData.username,
                nationality: userData.nationality || 'UN',
                position: position,
                color: color,
                hat: Math.random() > 0.7 ? this.getRandomChoice('hats') : 'none',
                clothes: Math.random() > 0.5 ? this.getRandomChoice('clothes') : 'none',
                accessory: Math.random() > 0.8 ? this.getRandomChoice('accessories') : 'none'
            });
            
            return avatarData;
            
        } catch (error) {
            console.error('❌ Error creating Among Us avatar:', error);
            return null;
        }
    },
    
    // WebSocket integration
    integrateWithWebSocket: function() {
        if (window.WebSocketManager) {
            console.log('🔗 Integrating Among Us avatar system with WebSocket');
            
            // Override WebSocket avatar methods
            window.WebSocketManager.createRemoteAvatar = (userData) => {
                return window.AmongUsAvatarSystem.createRemoteAvatarSafe(userData);
            };
            
            window.WebSocketManager.removeRemoteAvatar = (userId) => {
                return window.AmongUsAvatarSystem.removeAvatar(userId);
            };
            
            console.log('✅ Among Us avatar system integrated');
        }
    },
    
    // Management methods
    updateAvatarPosition: function(avatarId, position) {
        const avatar = this.avatars.get(avatarId);
        if (avatar && position) {
            avatar.group.position.set(position.x, position.y, position.z);
            avatar.position = avatar.group.position.clone();
            avatar.lastUpdate = Date.now();
        }
    },
    
    removeAvatar: function(avatarId) {
        const avatar = this.avatars.get(avatarId);
        if (avatar) {
            // Play despawn animation
            let despawnPhase = 0;
            const animateDespawn = () => {
                despawnPhase += 0.05;
                
                avatar.group.scale.setScalar(
                    avatar.customization.scale * (1 - despawnPhase)
                );
                avatar.group.rotation.y += 0.2;
                
                if (despawnPhase >= 1) {
                    // Clean up
                    this.cleanupAvatar(avatar);
                    
                    if (window.SceneManager) {
                        window.SceneManager.removeObject(avatar.group);
                    }
                    
                    this.avatars.delete(avatarId);
                    console.log(`🚀 Removed Among Us avatar: ${avatarId}`);
                    
                    if (window.EventBus) {
                        window.EventBus.emit('avatar:removed', { avatarId });
                    }
                } else {
                    requestAnimationFrame(animateDespawn);
                }
            };
            
            requestAnimationFrame(animateDespawn);
        }
    },
    
    cleanupAvatar: function(avatar) {
        avatar.group.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        if (avatar.nameLabel && avatar.nameLabel.material) {
            if (avatar.nameLabel.material.map) {
                avatar.nameLabel.material.map.dispose();
            }
            avatar.nameLabel.material.dispose();
        }
    },
    
    // Utility methods
    getRandomColor: function() {
        const colorKeys = Object.keys(this.colors);
        return this.colors[colorKeys[Math.floor(Math.random() * colorKeys.length)]];
    },
    
    getRandomChoice: function(category) {
        const choices = this.customization[category];
        return choices[Math.floor(Math.random() * choices.length)];
    },
    
    easeOutBounce: function(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    },
    
    lerpAngle: function(a, b, t) {
        const difference = b - a;
        const wrapped = ((difference + Math.PI) % (Math.PI * 2)) - Math.PI;
        return a + wrapped * t;
    },
    
    roundRect: function(ctx, x, y, width, height, radius) {
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
        ctx.closePath();
    },
    
    updateAnimations: function() {
        const delta = this.clock.getDelta();
        
        // Update any specific animations
        this.animationMixers.forEach(mixer => {
            mixer.update(delta);
        });
    },
    
    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // Public API
    getAvatar: function(avatarId) {
        return this.avatars.get(avatarId);
    },
    
    getAllAvatars: function() {
        return Array.from(this.avatars.values());
    },
    
    getAvatarCount: function() {
        return this.avatars.size;
    },
    
    // Compatibility methods for room-core.js
    getRandomCustomization: function() {
        return {
            color: this.getRandomColor(),
            hat: this.getRandomChoice('hats'),
            clothes: this.getRandomChoice('clothes'),
            accessory: this.getRandomChoice('accessories')
        };
    },
    
    // Get avatar by name for friend system
    getAvatarByName: function(name) {
        for (const [id, avatar] of this.avatars) {
            if (avatar.customization.name === name) {
                return avatar;
            }
        }
        return null;
    },
    
    // Check if system is ready
    isReady: function() {
        return this.isInitialized && window.SceneManager && window.SceneManager.scene;
    },
    
    // Customization UI
    showCustomizationPanel: function() {
        const modal = document.createElement('div');
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
        `;
        
        const panel = document.createElement('div');
        panel.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
            padding: 30px;
            border-radius: 15px;
            max-width: 600px;
            width: 90%;
            color: white;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        const currentAvatar = this.getAvatar('default') || this.avatars.values().next().value;
        const currentCustom = currentAvatar ? currentAvatar.customization : {};
        
        panel.innerHTML = `
            <h2 style="margin-top: 0; color: #FF6B35;">🎮 Customize Your Among Us Avatar</h2>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4CAF50;">Color</h3>
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;">
                    ${Object.entries(this.colors).map(([name, color]) => `
                        <button class="color-btn" data-color="${name}" style="
                            background: ${color};
                            border: ${currentCustom.color === color ? '3px solid white' : '1px solid #666'};
                            width: 60px;
                            height: 40px;
                            border-radius: 8px;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        " title="${name}"></button>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4CAF50;">Hat</h3>
                <select id="hat-select" style="
                    width: 100%;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #666;
                    background: #333;
                    color: white;
                    font-size: 14px;
                ">
                    ${this.customization.hats.map(hat => `
                        <option value="${hat}" ${currentCustom.hat === hat ? 'selected' : ''}>
                            ${hat.charAt(0).toUpperCase() + hat.slice(1)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4CAF50;">Clothes</h3>
                <select id="clothes-select" style="
                    width: 100%;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #666;
                    background: #333;
                    color: white;
                    font-size: 14px;
                ">
                    ${this.customization.clothes.map(clothes => `
                        <option value="${clothes}" ${currentCustom.clothes === clothes ? 'selected' : ''}>
                            ${clothes.charAt(0).toUpperCase() + clothes.slice(1).replace('_', ' ')}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #4CAF50;">Accessory</h3>
                <select id="accessory-select" style="
                    width: 100%;
                    padding: 10px;
                    border-radius: 8px;
                    border: 1px solid #666;
                    background: #333;
                    color: white;
                    font-size: 14px;
                ">
                    ${this.customization.accessories.map(acc => `
                        <option value="${acc}" ${currentCustom.accessory === acc ? 'selected' : ''}>
                            ${acc.charAt(0).toUpperCase() + acc.slice(1)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancel-custom" style="
                    padding: 10px 20px;
                    background: #666;
                    border: none;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                ">Cancel</button>
                <button id="apply-custom" style="
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #FF6B35, #ff8a50);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    font-weight: bold;
                ">Apply Changes</button>
            </div>
        `;
        
        modal.appendChild(panel);
        document.body.appendChild(modal);
        
        // Color button handlers
        panel.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.color-btn').forEach(b => {
                    b.style.border = '1px solid #666';
                });
                btn.style.border = '3px solid white';
            });
            
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.1)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
            });
        });
        
        // Button handlers
        document.getElementById('cancel-custom').onclick = () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('apply-custom').onclick = () => {
            const selectedColorBtn = panel.querySelector('.color-btn[style*="3px solid white"]');
            const selectedColorName = selectedColorBtn ? selectedColorBtn.dataset.color : 'red';
            
            const customization = {
                color: this.colors[selectedColorName],
                hat: document.getElementById('hat-select').value,
                clothes: document.getElementById('clothes-select').value,
                accessory: document.getElementById('accessory-select').value
            };
            
            // Apply to default avatar or first available
            const avatarId = currentAvatar ? currentAvatar.id : 'default';
            this.customizeAvatar(avatarId, customization);
            
            document.body.removeChild(modal);
            
            // Show success notification
            this.showNotification('🎨 Avatar customized!');
        };
        
        // Close on background click
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
    },
    
    showNotification: function(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FF6B35, #ff8a50);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 10001;
            font-weight: 600;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transform: translateX(400px);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    playEmergencyMeetingAnimation: function() {
        // Flash red lights
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            this.avatars.forEach(avatar => {
                if (avatar.mesh) {
                    const body = avatar.mesh.getObjectByName('body');
                    if (body) {
                        body.material.emissive = flashCount % 2 === 0 ? 
                            new THREE.Color(0xFF0000) : new THREE.Color(0x000000);
                        body.material.emissiveIntensity = 0.5;
                    }
                }
            });
            
            flashCount++;
            if (flashCount > 6) {
                clearInterval(flashInterval);
                // Reset emissive
                this.avatars.forEach(avatar => {
                    if (avatar.mesh) {
                        const body = avatar.mesh.getObjectByName('body');
                        if (body) {
                            body.material.emissive = new THREE.Color(0x000000);
                            body.material.emissiveIntensity = 0;
                        }
                    }
                });
            }
        }, 200);
    },
    
    // Voting animation
    playVoteAnimation: function(voterId, targetId) {
        const voter = this.avatars.get(voterId);
        if (!voter) return;
        
        // Create vote indicator
        const voteGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.02);
        const voteMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide
        });
        
        const vote = new THREE.Mesh(voteGeometry, voteMaterial);
        vote.position.copy(voter.group.position);
        vote.position.y = 1;
        
        // Add "I VOTED" text representation
        const textGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.01);
        const textMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const text = new THREE.Mesh(textGeometry, textMaterial);
        text.position.z = 0.02;
        vote.add(text);
        
        if (window.SceneManager) {
            window.SceneManager.addObject(vote);
        }
        
        // Animate vote flying up
        let votePhase = 0;
        const animateVote = () => {
            votePhase += 0.05;
            
            vote.position.y = 1 + votePhase * 2;
            vote.material.opacity = 1 - votePhase;
            vote.rotation.y += 0.1;
            
            if (votePhase >= 1) {
                if (window.SceneManager) {
                    window.SceneManager.removeObject(vote);
                }
                vote.geometry.dispose();
                vote.material.dispose();
            } else {
                requestAnimationFrame(animateVote);
            }
        };
        
        requestAnimationFrame(animateVote);
    },
    
    // Eject animation
    playEjectAnimation: function(avatarId, wasImpostor) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        const originalPosition = avatar.group.position.clone();
        
        // Spinning eject animation
        let ejectPhase = 0;
        const animateEject = () => {
            ejectPhase += 0.02;
            
            // Spin and fly away
            avatar.group.rotation.z += 0.2;
            avatar.group.rotation.y += 0.3;
            avatar.group.position.x = originalPosition.x + ejectPhase * 10;
            avatar.group.position.y = originalPosition.y + Math.sin(ejectPhase * 3) * 2;
            avatar.group.scale.setScalar(avatar.customization.scale * (1 - ejectPhase * 0.5));
            
            if (ejectPhase >= 1) {
                // Show result text
                this.showEjectResult(avatarId, wasImpostor);
                
                // Remove avatar
                setTimeout(() => {
                    this.removeAvatar(avatarId);
                }, 2000);
            } else {
                requestAnimationFrame(animateEject);
            }
        };
        
        requestAnimationFrame(animateEject);
    },
    
    showEjectResult: function(avatarId, wasImpostor) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Text
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.fillStyle = 'white';
        
        const avatar = this.avatars.get(avatarId);
        const name = avatar ? avatar.customization.name : 'Unknown';
        
        context.fillText(
            `${name} was ${wasImpostor ? '' : 'not '}The Impostor`,
            canvas.width / 2,
            canvas.height / 2
        );
        
        // Remaining impostors text
        if (wasImpostor) {
            context.font = '18px Arial';
            context.fillText(
                '0 Impostors remain',
                canvas.width / 2,
                canvas.height / 2 + 30
            );
        }
        
        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(8, 2, 1);
        sprite.position.set(0, 3, 0);
        
        if (window.SceneManager) {
            window.SceneManager.addObject(sprite);
        }
        
        // Remove after delay
        setTimeout(() => {
            if (window.SceneManager) {
                window.SceneManager.removeObject(sprite);
            }
            texture.dispose();
            material.dispose();
        }, 3000);
    }
};

// Auto-integration with existing systems
if (typeof window !== 'undefined') {
    // Replace the old avatar system
    window.AvatarSystem = window.AmongUsAvatarSystem;
    
    // Try immediate integration
    if (window.WebSocketManager) {
        window.AmongUsAvatarSystem.integrateWithWebSocket();
    }
    
    // Also listen for when WebSocket becomes available
    const checkWebSocket = () => {
        if (window.WebSocketManager && !window.AmongUsAvatarSystem._webSocketIntegrated) {
            window.AmongUsAvatarSystem.integrateWithWebSocket();
            window.AmongUsAvatarSystem._webSocketIntegrated = true;
        }
    };
    
    // Check periodically
    const integrationInterval = setInterval(() => {
        checkWebSocket();
        if (window.AmongUsAvatarSystem._webSocketIntegrated) {
            clearInterval(integrationInterval);
        }
    }, 1000);
    
    // Stop after 30 seconds
    setTimeout(() => {
        clearInterval(integrationInterval);
    }, 30000);
}

console.log('✅ Among Us Avatar System (r128 compatible) loaded and ready!');