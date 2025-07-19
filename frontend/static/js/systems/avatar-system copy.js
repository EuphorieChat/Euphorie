// Enhanced Avatar System v2.0 - Ultra-realistic human avatars with improved proportions and animations
// Compatible with room-core.js and room_3d.html

window.AvatarSystem = {
    avatars: new Map(),
    isInitialized: false,
    animationMixers: new Map(),
    clock: new THREE.Clock(),
    
    // Enhanced avatar customization presets with more options
    customization: {
        hairStyles: ['short_clean', 'long_wavy', 'curly_afro', 'pixie_cut', 'bob_cut', 'man_bun', 'buzz_cut', 'ponytail'],
        hairColors: ['#2C1B18', '#8B4513', '#DEB887', '#FFD700', '#000000', '#654321', '#FF4500', '#800080', '#4169E1', '#228B22'],
        skinTones: ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#F3D7A7', '#E8B88F', '#D2945B', '#A0522D', '#654321'],
        shirtStyles: ['t_shirt', 'polo', 'button_down', 'hoodie', 'tank_top', 'sweater'],
        shirtColors: ['#4169E1', '#FF0000', '#00FF00', '#FFFF00', '#FF69B4', '#800080', '#FF4500', '#00CED1', '#32CD32', '#1E90FF'],
        pantsStyles: ['jeans', 'chinos', 'shorts', 'dress_pants', 'cargo'],
        pantsColors: ['#000080', '#8B4513', '#000000', '#696969', '#2F4F4F', '#483D8B', '#556B2F', '#8B0000'],
        shoeStyles: ['sneakers', 'dress_shoes', 'boots', 'sandals'],
        shoeColors: ['#654321', '#000000', '#8B4513', '#2F4F4F', '#800000', '#191970'],
        eyeColors: ['#654321', '#4169E1', '#228B22', '#8B4513', '#800080', '#DC143C', '#32CD32', '#FF8C00'],
        emotions: ['happy', 'sad', 'excited', 'angry', 'surprised', 'neutral', 'love', 'confused', 'determined', 'sleepy'],
        accessories: ['none', 'glasses', 'sunglasses', 'hat', 'cap', 'necklace', 'earrings', 'watch', 'backpack'],
        bodyTypes: ['slim', 'average', 'athletic', 'curvy'],
        heights: ['short', 'average', 'tall']
    },
    
    // Improved body proportions based on real human anatomy
    bodyProportions: {
        head: { width: 0.25, height: 0.25, depth: 0.22 },
        neck: { topRadius: 0.08, bottomRadius: 0.1, height: 0.15 },
        torso: { width: 0.65, height: 0.9, depth: 0.35 },
        upperArm: { topRadius: 0.08, bottomRadius: 0.07, length: 0.42 },
        lowerArm: { topRadius: 0.06, bottomRadius: 0.055, length: 0.38 },
        hand: { width: 0.09, height: 0.15, depth: 0.04 },
        upperLeg: { topRadius: 0.12, bottomRadius: 0.10, length: 0.48 },
        lowerLeg: { topRadius: 0.09, bottomRadius: 0.07, length: 0.42 },
        foot: { width: 0.12, height: 0.08, length: 0.28 }
    },
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('👤 Initializing Enhanced Avatar System v2.0');
        
        this.isInitialized = true;
        this.clock = new THREE.Clock();
        
        // Create default avatar immediately if scene is ready
        if (window.SceneManager && window.SceneManager.isInitialized) {
            this.createDefaultAvatar();
        } else {
            // Wait for scene to be ready
            if (window.EventBus) {
                window.EventBus.on('scene:initialized', () => {
                    console.log('🎬 Scene ready, creating enhanced realistic avatar...');
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
        
        // Start enhanced animation loops
        this.startIdleAnimations();
        this.startBlinkingAnimation();
        this.startSubtleMovements();
        
        console.log('✅ Enhanced Avatar System v2.0 initialized');
    },
    
    createAvatar: function(userId, options = {}) {
        const avatarId = userId || this.generateId();
        
        // Enhanced default customization options
        const defaultOptions = {
            name: options.name || `User ${avatarId.slice(0, 4)}`,
            nationality: options.nationality || 'UN',
            position: options.position || { x: 0, y: 0, z: 0 },
            hairStyle: options.hairStyle || this.getRandomChoice('hairStyles'),
            hairColor: options.hairColor || this.getRandomChoice('hairColors'),
            skinTone: options.skinTone || this.getRandomChoice('skinTones'),
            shirtStyle: options.shirtStyle || this.getRandomChoice('shirtStyles'),
            shirtColor: options.shirtColor || this.getRandomChoice('shirtColors'),
            pantsStyle: options.pantsStyle || this.getRandomChoice('pantsStyles'),
            pantsColor: options.pantsColor || this.getRandomChoice('pantsColors'),
            shoeStyle: options.shoeStyle || this.getRandomChoice('shoeStyles'),
            shoeColor: options.shoeColor || this.getRandomChoice('shoeColors'),
            eyeColor: options.eyeColor || this.getRandomChoice('eyeColors'),
            emotion: options.emotion || 'neutral',
            accessory: options.accessory || 'none',
            bodyType: options.bodyType || 'average',
            height: options.height || 'average',
            scale: options.scale || 1.0
        };
        
        // Create avatar group
        const avatarGroup = new THREE.Group();
        
        // Create enhanced realistic human avatar
        const avatar = this.createEnhancedHuman(defaultOptions);
        avatarGroup.add(avatar);
        
        // Add enhanced name label with nationality flag
        const nameLabel = this.createNameLabelWithFlag(defaultOptions.name, defaultOptions.nationality);
        nameLabel.position.y = 2.8;
        avatarGroup.add(nameLabel);
        
        // Add subtle particle effect
        const particleEffect = this.createParticleEffect();
        particleEffect.position.y = 1;
        avatarGroup.add(particleEffect);
        
        // Set initial position and scale based on height
        const heightMultiplier = this.getHeightMultiplier(defaultOptions.height);
        avatarGroup.position.set(
            defaultOptions.position.x,
            defaultOptions.position.y,
            defaultOptions.position.z
        );
        avatarGroup.scale.setScalar(defaultOptions.scale * heightMultiplier);
        
        // Store comprehensive avatar data
        const avatarData = {
            id: avatarId,
            group: avatarGroup,
            mesh: avatar,
            nameLabel: nameLabel,
            particleEffect: particleEffect,
            position: avatarGroup.position.clone(),
            rotation: avatarGroup.rotation.clone(),
            animation: 'idle',
            emotion: defaultOptions.emotion,
            customization: { ...defaultOptions },
            lastUpdate: Date.now(),
            animationPhase: Math.random() * Math.PI * 2,
            blinkPhase: Math.random() * Math.PI * 2,
            breathPhase: Math.random() * Math.PI * 2,
            isBreathing: true,
            isBlinking: true,
            scale: defaultOptions.scale * heightMultiplier,
            bones: new Map(), // Store bone references for advanced animations
            mixer: null // For future skeletal animations
        };
        
        // Store bone references for animations
        this.storeBoneReferences(avatarData);
        
        this.avatars.set(avatarId, avatarData);
        
        // Add to scene
        if (window.SceneManager && window.SceneManager.scene) {
            window.SceneManager.addObject(avatarGroup);
            console.log(`👤 Added enhanced avatar ${avatarId} to scene at position:`, defaultOptions.position);
        } else {
            console.error('❌ Scene not ready when trying to add avatar');
        }
        
        console.log(`👤 Created enhanced realistic avatar: ${avatarId}`);
        
        // Add entrance animation
        this.playEnhancedEntranceAnimation(avatarData);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('avatar:created', avatarData);
        }
        
        return avatarData;
    },
    
    createEnhancedHuman: function(options = {}) {
        const group = new THREE.Group();
        
        // Parse colors
        const skinColor = parseInt(options.skinTone.replace('#', '0x'));
        const shirtColor = parseInt(options.shirtColor.replace('#', '0x'));
        const pantsColor = parseInt(options.pantsColor.replace('#', '0x'));
        const shoeColor = parseInt(options.shoeColor.replace('#', '0x'));
        const eyeColor = parseInt(options.eyeColor.replace('#', '0x'));
        
        // Enhanced materials with better lighting
        const skinMaterial = new THREE.MeshLambertMaterial({ 
            color: skinColor,
            shininess: 10
        });
        
        const shirtMaterial = new THREE.MeshLambertMaterial({ 
            color: shirtColor,
            shininess: 5
        });
        
        // Get body type modifiers
        const bodyMod = this.getBodyTypeModifiers(options.bodyType);
        const props = this.bodyProportions;
        
        // Create body parts with improved proportions
        this.createHead(group, skinMaterial, eyeColor, options);
        this.createNeck(group, skinMaterial, bodyMod);
        this.createTorso(group, shirtMaterial, bodyMod, options.shirtStyle);
        this.createArms(group, skinMaterial, shirtMaterial, bodyMod);
        this.createLegs(group, skinMaterial, pantsColor, bodyMod, options.pantsStyle);
        this.createFeet(group, shoeColor, options.shoeStyle);
        
        // Add hair
        const hair = this.createAdvancedHair(options.hairStyle, options.hairColor);
        if (hair) {
            hair.position.set(0, 1.85, 0);
            group.add(hair);
        }
        
        // Add accessory
        const accessory = this.createAdvancedAccessory(options.accessory);
        if (accessory) {
            accessory.position.set(0, 1.85, 0);
            group.add(accessory);
        }
        
        return group;
    },
    
    createHead: function(group, skinMaterial, eyeColor, options) {
        const props = this.bodyProportions;
        
        // Head with better shape
        const headGeometry = new THREE.SphereGeometry(props.head.width, 32, 32);
        headGeometry.scale(1, 1.1, 0.9); // More realistic head shape
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.set(0, 1.85, 0);
        head.castShadow = true;
        head.receiveShadow = true;
        head.name = 'head';
        group.add(head);
        
        // Enhanced facial features
        this.addEnhancedFacialFeatures(group, eyeColor, options.emotion, options.skinTone);
    },
    
    createNeck: function(group, skinMaterial, bodyMod) {
        const props = this.bodyProportions;
        
        const neckGeometry = new THREE.CylinderGeometry(
            props.neck.topRadius * bodyMod.neck,
            props.neck.bottomRadius * bodyMod.neck,
            props.neck.height,
            16
        );
        const neck = new THREE.Mesh(neckGeometry, skinMaterial);
        neck.position.set(0, 1.62, 0);
        neck.castShadow = true;
        neck.receiveShadow = true;
        neck.name = 'neck';
        group.add(neck);
    },
    
    createTorso: function(group, shirtMaterial, bodyMod, shirtStyle) {
        const props = this.bodyProportions;
        
        // Enhanced torso based on shirt style
        let torsoGeometry;
        
        switch(shirtStyle) {
            case 'hoodie':
                torsoGeometry = new THREE.BoxGeometry(
                    props.torso.width * bodyMod.torso * 1.1,
                    props.torso.height * bodyMod.torso,
                    props.torso.depth * bodyMod.torso * 1.1
                );
                break;
            case 'tank_top':
                torsoGeometry = new THREE.BoxGeometry(
                    props.torso.width * bodyMod.torso * 0.9,
                    props.torso.height * bodyMod.torso,
                    props.torso.depth * bodyMod.torso * 0.9
                );
                break;
            default:
                torsoGeometry = new THREE.BoxGeometry(
                    props.torso.width * bodyMod.torso,
                    props.torso.height * bodyMod.torso,
                    props.torso.depth * bodyMod.torso
                );
        }
        
        const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
        torso.position.set(0, 1.1, 0);
        torso.castShadow = true;
        torso.receiveShadow = true;
        torso.name = 'torso';
        group.add(torso);
        
        // Add shirt details based on style
        this.addShirtDetails(group, shirtStyle, shirtMaterial, bodyMod);
    },
    
    createArms: function(group, skinMaterial, shirtMaterial, bodyMod) {
        const props = this.bodyProportions;
        
        // Enhanced arm creation with better positioning
        ['left', 'right'].forEach(side => {
            const multiplier = side === 'left' ? -1 : 1;
            
            // Upper arm
            const upperArmGeometry = new THREE.CylinderGeometry(
                props.upperArm.topRadius * bodyMod.arms,
                props.upperArm.bottomRadius * bodyMod.arms,
                props.upperArm.length,
                16
            );
            const upperArm = new THREE.Mesh(upperArmGeometry, shirtMaterial);
            upperArm.position.set(multiplier * 0.42, 1.25, 0.02);
            upperArm.rotation.z = multiplier * -0.1;
            upperArm.rotation.x = 0.05;
            upperArm.castShadow = true;
            upperArm.receiveShadow = true;
            upperArm.name = `${side}UpperArm`;
            group.add(upperArm);
            
            // Lower arm (forearm)
            const lowerArmGeometry = new THREE.CylinderGeometry(
                props.lowerArm.topRadius * bodyMod.arms,
                props.lowerArm.bottomRadius * bodyMod.arms,
                props.lowerArm.length,
                16
            );
            const lowerArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
            lowerArm.position.set(multiplier * 0.52, 0.85, 0.08);
            lowerArm.rotation.z = multiplier * -0.05;
            lowerArm.rotation.x = 0.1;
            lowerArm.castShadow = true;
            lowerArm.receiveShadow = true;
            lowerArm.name = `${side}LowerArm`;
            group.add(lowerArm);
            
            // Hand with improved shape
            this.createDetailedHand(group, side, skinMaterial, bodyMod);
        });
    },
    
    createDetailedHand: function(group, side, skinMaterial, bodyMod) {
        const multiplier = side === 'left' ? -1 : 1;
        const props = this.bodyProportions;
        
        // Palm
        const palmGeometry = new THREE.BoxGeometry(
            props.hand.width * bodyMod.hands,
            props.hand.height * bodyMod.hands,
            props.hand.depth * bodyMod.hands
        );
        const palm = new THREE.Mesh(palmGeometry, skinMaterial);
        palm.position.set(multiplier * 0.62, 0.58, 0.12);
        palm.rotation.x = 0.15;
        palm.rotation.z = multiplier * 0.05;
        palm.castShadow = true;
        palm.name = `${side}Hand`;
        group.add(palm);
        
        // Fingers (simplified but more realistic)
        for (let i = 0; i < 4; i++) {
            const fingerGeometry = new THREE.CylinderGeometry(0.01, 0.012, 0.08, 8);
            const finger = new THREE.Mesh(fingerGeometry, skinMaterial);
            finger.position.set(
                multiplier * (0.58 + (i - 1.5) * 0.02),
                0.52,
                0.14
            );
            finger.rotation.x = 0.3;
            finger.castShadow = true;
            group.add(finger);
        }
        
        // Thumb
        const thumbGeometry = new THREE.CylinderGeometry(0.012, 0.015, 0.06, 8);
        const thumb = new THREE.Mesh(thumbGeometry, skinMaterial);
        thumb.position.set(multiplier * 0.66, 0.60, 0.10);
        thumb.rotation.z = multiplier * 0.8;
        thumb.rotation.x = 0.2;
        thumb.castShadow = true;
        group.add(thumb);
    },
    
    createLegs: function(group, skinMaterial, pantsColor, bodyMod, pantsStyle) {
        const pantsMaterial = new THREE.MeshLambertMaterial({ color: pantsColor });
        const props = this.bodyProportions;
        
        ['left', 'right'].forEach(side => {
            const multiplier = side === 'left' ? -1 : 1;
            
            // Upper leg (thigh)
            const upperLegGeometry = new THREE.CylinderGeometry(
                props.upperLeg.topRadius * bodyMod.legs,
                props.upperLeg.bottomRadius * bodyMod.legs,
                props.upperLeg.length,
                16
            );
            const upperLeg = new THREE.Mesh(upperLegGeometry, pantsMaterial);
            upperLeg.position.set(multiplier * 0.18, 0.41, 0);
            upperLeg.castShadow = true;
            upperLeg.receiveShadow = true;
            upperLeg.name = `${side}UpperLeg`;
            group.add(upperLeg);
            
            // Lower leg (shin)
            const lowerLegGeometry = new THREE.CylinderGeometry(
                props.lowerLeg.topRadius * bodyMod.legs,
                props.lowerLeg.bottomRadius * bodyMod.legs,
                props.lowerLeg.length,
                16
            );
            const lowerLeg = new THREE.Mesh(lowerLegGeometry, pantsMaterial);
            lowerLeg.position.set(multiplier * 0.18, -0.1, 0);
            lowerLeg.castShadow = true;
            lowerLeg.receiveShadow = true;
            lowerLeg.name = `${side}LowerLeg`;
            group.add(lowerLeg);
        });
        
        // Add pants details
        this.addPantsDetails(group, pantsStyle, pantsMaterial, bodyMod);
    },
    
    createFeet: function(group, shoeColor, shoeStyle) {
        const shoeMaterial = new THREE.MeshLambertMaterial({ color: shoeColor });
        const props = this.bodyProportions;
        
        ['left', 'right'].forEach(side => {
            const multiplier = side === 'left' ? -1 : 1;
            
            let shoeGeometry;
            
            switch(shoeStyle) {
                case 'boots':
                    shoeGeometry = new THREE.BoxGeometry(
                        props.foot.width * 1.1,
                        props.foot.height * 1.3,
                        props.foot.length * 1.1
                    );
                    break;
                case 'sandals':
                    shoeGeometry = new THREE.BoxGeometry(
                        props.foot.width * 0.9,
                        props.foot.height * 0.6,
                        props.foot.length * 0.9
                    );
                    break;
                default: // sneakers, dress_shoes
                    shoeGeometry = new THREE.BoxGeometry(
                        props.foot.width,
                        props.foot.height,
                        props.foot.length
                    );
            }
            
            const shoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
            shoe.position.set(multiplier * 0.18, -0.36, 0.05);
            shoe.castShadow = true;
            shoe.receiveShadow = true;
            shoe.name = `${side}Shoe`;
            group.add(shoe);
            
            // Add shoe details
            this.addShoeDetails(group, side, shoeStyle, shoeMaterial);
        });
    },
    
    addEnhancedFacialFeatures: function(group, eyeColor, emotion, skinTone) {
        // Enhanced eyes with more detail
        const eyeWhiteGeometry = new THREE.SphereGeometry(0.035, 16, 16);
        const eyeWhiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        
        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        leftEyeWhite.position.set(-0.09, 1.88, 0.22);
        leftEyeWhite.scale.set(1, 0.8, 0.7);
        leftEyeWhite.name = 'leftEyeWhite';
        group.add(leftEyeWhite);
        
        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        rightEyeWhite.position.set(0.09, 1.88, 0.22);
        rightEyeWhite.scale.set(1, 0.8, 0.7);
        rightEyeWhite.name = 'rightEyeWhite';
        group.add(rightEyeWhite);
        
        // Improved pupils with iris
        const irisGeometry = new THREE.SphereGeometry(0.018, 12, 12);
        const irisMaterial = new THREE.MeshLambertMaterial({ color: eyeColor });
        
        const leftIris = new THREE.Mesh(irisGeometry, irisMaterial);
        leftIris.position.set(-0.09, 1.88, 0.24);
        leftIris.name = 'leftIris';
        group.add(leftIris);
        
        const rightIris = new THREE.Mesh(irisGeometry, irisMaterial);
        rightIris.position.set(0.09, 1.88, 0.24);
        rightIris.name = 'rightIris';
        group.add(rightIris);
        
        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.008, 8, 8);
        const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.09, 1.88, 0.245);
        leftPupil.name = 'leftPupil';
        group.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.09, 1.88, 0.245);
        rightPupil.name = 'rightPupil';
        group.add(rightPupil);
        
        // Enhanced eyebrows
        this.addEyebrows(group, skinTone);
        
        // Enhanced nose
        this.addDetailedNose(group, skinTone);
        
        // Emotion-based mouth
        this.addEmotionalMouth(group, emotion, skinTone);
        
        // Add eyelids for blinking
        this.addEyelids(group, skinTone);
    },
    
    addEyebrows: function(group, skinTone) {
        const browColor = this.darkenColor(skinTone, 0.3);
        const browMaterial = new THREE.MeshLambertMaterial({ color: parseInt(browColor.replace('#', '0x')) });
        
        const browGeometry = new THREE.BoxGeometry(0.08, 0.015, 0.01);
        
        const leftBrow = new THREE.Mesh(browGeometry, browMaterial);
        leftBrow.position.set(-0.09, 1.92, 0.22);
        leftBrow.rotation.z = -0.1;
        leftBrow.name = 'leftBrow';
        group.add(leftBrow);
        
        const rightBrow = new THREE.Mesh(browGeometry, browMaterial);
        rightBrow.position.set(0.09, 1.92, 0.22);
        rightBrow.rotation.z = 0.1;
        rightBrow.name = 'rightBrow';
        group.add(rightBrow);
    },
    
    addDetailedNose: function(group, skinTone) {
        const noseMaterial = new THREE.MeshLambertMaterial({ 
            color: parseInt(skinTone.replace('#', '0x'))
        });
        
        // Nose bridge
        const bridgeGeometry = new THREE.BoxGeometry(0.02, 0.08, 0.03);
        const bridge = new THREE.Mesh(bridgeGeometry, noseMaterial);
        bridge.position.set(0, 1.84, 0.23);
        bridge.name = 'noseBridge';
        group.add(bridge);
        
        // Nose tip
        const tipGeometry = new THREE.SphereGeometry(0.018, 8, 8);
        const tip = new THREE.Mesh(tipGeometry, noseMaterial);
        tip.position.set(0, 1.80, 0.24);
        tip.scale.set(1, 0.8, 1.2);
        tip.name = 'noseTip';
        group.add(tip);
        
        // Nostrils
        const nostrilGeometry = new THREE.SphereGeometry(0.006, 6, 6);
        const nostrilMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const leftNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial);
        leftNostril.position.set(-0.01, 1.79, 0.245);
        group.add(leftNostril);
        
        const rightNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial);
        rightNostril.position.set(0.01, 1.79, 0.245);
        group.add(rightNostril);
    },
    
    addEmotionalMouth: function(group, emotion, skinTone) {
        const lipMaterial = new THREE.MeshLambertMaterial({ color: 0xcc6666 });
        
        let mouthGeometry;
        let mouthRotation = { x: 0, y: 0, z: 0 };
        let mouthPosition = { x: 0, y: 1.75, z: 0.22 };
        
        switch(emotion) {
            case 'happy':
            case 'excited':
                mouthGeometry = new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI);
                mouthRotation.x = Math.PI;
                break;
            case 'sad':
                mouthGeometry = new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI);
                mouthRotation.x = 0;
                break;
            case 'surprised':
                mouthGeometry = new THREE.SphereGeometry(0.025, 8, 8);
                mouthPosition.z = 0.21;
                break;
            case 'angry':
                mouthGeometry = new THREE.BoxGeometry(0.05, 0.008, 0.01);
                break;
            case 'love':
                mouthGeometry = new THREE.SphereGeometry(0.02, 8, 8);
                mouthPosition.z = 0.23;
                break;
            default: // neutral
                mouthGeometry = new THREE.BoxGeometry(0.06, 0.01, 0.01);
        }
        
        const mouth = new THREE.Mesh(mouthGeometry, lipMaterial);
        mouth.position.set(mouthPosition.x, mouthPosition.y, mouthPosition.z);
        mouth.rotation.set(mouthRotation.x, mouthRotation.y, mouthRotation.z);
        mouth.name = 'mouth';
        group.add(mouth);
    },
    
    addEyelids: function(group, skinTone) {
        const eyelidMaterial = new THREE.MeshLambertMaterial({ 
            color: parseInt(skinTone.replace('#', '0x'))
        });
        
        const eyelidGeometry = new THREE.SphereGeometry(0.038, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        
        const leftEyelid = new THREE.Mesh(eyelidGeometry, eyelidMaterial);
        leftEyelid.position.set(-0.09, 1.88, 0.22);
        leftEyelid.scale.set(1, 0.3, 0.7);
        leftEyelid.name = 'leftEyelid';
        leftEyelid.visible = false; // Hidden by default, shown during blink
        group.add(leftEyelid);
        
        const rightEyelid = new THREE.Mesh(eyelidGeometry, eyelidMaterial);
        rightEyelid.position.set(0.09, 1.88, 0.22);
        rightEyelid.scale.set(1, 0.3, 0.7);
        rightEyelid.name = 'rightEyelid';
        rightEyelid.visible = false;
        group.add(rightEyelid);
    },
    
    addShirtDetails: function(group, shirtStyle, shirtMaterial, bodyMod) {
        // Add collar for button-down shirts
        if (shirtStyle === 'button_down') {
            const collarGeometry = new THREE.BoxGeometry(0.15, 0.05, 0.02);
            const collar = new THREE.Mesh(collarGeometry, shirtMaterial);
            collar.position.set(0, 1.45, 0.17);
            collar.name = 'collar';
            group.add(collar);
        }
        
        // Add hood for hoodie
        if (shirtStyle === 'hoodie') {
            const hoodGeometry = new THREE.SphereGeometry(0.35, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
            const hood = new THREE.Mesh(hoodGeometry, shirtMaterial);
            hood.position.set(0, 1.85, -0.2);
            hood.name = 'hood';
            group.add(hood);
        }
    },
    
    addPantsDetails: function(group, pantsStyle, pantsMaterial, bodyMod) {
        // Add belt for appropriate styles
        if (['jeans', 'chinos', 'dress_pants'].includes(pantsStyle)) {
            const beltGeometry = new THREE.TorusGeometry(0.35, 0.02, 4, 16);
            const beltMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
            const belt = new THREE.Mesh(beltGeometry, beltMaterial);
            belt.position.set(0, 0.65, 0);
            belt.rotation.x = Math.PI / 2;
            belt.name = 'belt';
            group.add(belt);
        }
        
        // Add cargo pockets for cargo pants
        if (pantsStyle === 'cargo') {
            ['left', 'right'].forEach(side => {
                const multiplier = side === 'left' ? -1 : 1;
                const pocketGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.04);
                const pocket = new THREE.Mesh(pocketGeometry, pantsMaterial);
                pocket.position.set(multiplier * 0.25, 0.3, 0.18);
                pocket.name = `${side}CargoPocket`;
                group.add(pocket);
            });
        }
    },
    
    addShoeDetails: function(group, side, shoeStyle, shoeMaterial) {
        const multiplier = side === 'left' ? -1 : 1;
        
        // Add laces for sneakers
        if (shoeStyle === 'sneakers') {
            const laceGeometry = new THREE.CylinderGeometry(0.002, 0.002, 0.15, 6);
            const laceMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
            
            for (let i = 0; i < 3; i++) {
                const lace = new THREE.Mesh(laceGeometry, laceMaterial);
                lace.position.set(
                    multiplier * 0.18,
                    -0.32 + i * 0.03,
                    0.12
                );
                lace.rotation.z = Math.PI / 2;
                group.add(lace);
            }
        }
        
        // Add sole for boots
        if (shoeStyle === 'boots') {
            const soleGeometry = new THREE.BoxGeometry(0.14, 0.03, 0.32);
            const soleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            const sole = new THREE.Mesh(soleGeometry, soleMaterial);
            sole.position.set(multiplier * 0.18, -0.42, 0.05);
            sole.name = `${side}Sole`;
            group.add(sole);
        }
    },
    
    createAdvancedHair: function(style, color) {
        const hairColor = parseInt(color.replace('#', '0x'));
        const hairMaterial = new THREE.MeshLambertMaterial({ 
            color: hairColor,
            shininess: 60
        });
        
        let hairGroup = new THREE.Group();
        
        switch(style) {
            case 'long_wavy':
                return this.createLongWavyHair(hairMaterial);
            case 'curly_afro':
                return this.createCurlyAfroHair(hairMaterial);
            case 'pixie_cut':
                return this.createPixieCutHair(hairMaterial);
            case 'bob_cut':
                return this.createBobCutHair(hairMaterial);
            case 'man_bun':
                return this.createManBunHair(hairMaterial);
            case 'buzz_cut':
                return this.createBuzzCutHair(hairMaterial);
            case 'ponytail':
                return this.createPonytailHair(hairMaterial);
            default: // short_clean
                return this.createShortCleanHair(hairMaterial);
        }
    },
    
    createShortCleanHair: function(hairMaterial) {
        const hairGeometry = new THREE.SphereGeometry(0.26, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.65);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 0.08;
        hair.castShadow = true;
        return hair;
    },
    
    createLongWavyHair: function(hairMaterial) {
        const group = new THREE.Group();
        
        // Top hair
        const topGeometry = new THREE.SphereGeometry(0.28, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const topHair = new THREE.Mesh(topGeometry, hairMaterial);
        topHair.position.y = 0.1;
        group.add(topHair);
        
        // Side hair (wavy)
        for (let i = 0; i < 8; i++) {
            const strandGeometry = new THREE.CylinderGeometry(0.02, 0.015, 0.6, 8);
            const strand = new THREE.Mesh(strandGeometry, hairMaterial);
            const angle = (i / 8) * Math.PI * 2;
            strand.position.set(
                Math.cos(angle) * 0.22,
                -0.15,
                Math.sin(angle) * 0.22
            );
            strand.rotation.z = Math.sin(i) * 0.3;
            group.add(strand);
        }
        
        return group;
    },
    
    createCurlyAfroHair: function(hairMaterial) {
        const group = new THREE.Group();
        
        // Base afro shape
        const baseGeometry = new THREE.SphereGeometry(0.32, 20, 20);
        const baseHair = new THREE.Mesh(baseGeometry, hairMaterial);
        baseHair.position.y = 0.15;
        baseHair.scale.set(1, 1.2, 1);
        group.add(baseHair);
        
        return group;
    },
    
    createAdvancedAccessory: function(type) {
        switch(type) {
            case 'glasses':
                return this.createDetailedGlasses();
            case 'sunglasses':
                return this.createSunglasses();
            case 'hat':
                return this.createDetailedHat();
            case 'cap':
                return this.createBaseballCap();
            case 'watch':
                return this.createWatch();
            case 'backpack':
                return this.createBackpack();
            default:
                return null;
        }
    },
    
    createDetailedGlasses: function() {
        const group = new THREE.Group();
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const lensMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.3 
        });
        
        // Frames
        const frameGeometry = new THREE.TorusGeometry(0.065, 0.008, 8, 16);
        
        const leftFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        leftFrame.position.set(-0.08, 0.03, 0.22);
        group.add(leftFrame);
        
        const rightFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        rightFrame.position.set(0.08, 0.03, 0.22);
        group.add(rightFrame);
        
        // Lenses
        const lensGeometry = new THREE.CircleGeometry(0.06, 16);
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.set(-0.08, 0.03, 0.225);
        group.add(leftLens);
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.set(0.08, 0.03, 0.225);
        group.add(rightLens);
        
        // Bridge
        const bridgeGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.position.set(0, 0.03, 0.22);
        bridge.rotation.z = Math.PI / 2;
        group.add(bridge);
        
        return group;
    },
    
    createNameLabelWithFlag: function(name, nationality) {
        // Enhanced name label with nationality flag support
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Enhanced gradient background
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(0.5, 'rgba(20, 20, 40, 0.85)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        
        // Draw enhanced background
        context.fillStyle = gradient;
        this.roundRect(context, 15, 15, canvas.width - 30, canvas.height - 30, 25);
        context.fill();
        
        // Enhanced border with glow
        context.strokeStyle = 'rgba(102, 126, 234, 0.8)';
        context.lineWidth = 3;
        context.shadowColor = 'rgba(102, 126, 234, 0.6)';
        context.shadowBlur = 10;
        this.roundRect(context, 15, 15, canvas.width - 30, canvas.height - 30, 25);
        context.stroke();
        
        // Reset shadow
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        
        // Flag placeholder (can be enhanced with actual flag images)
        if (nationality && nationality !== 'UN') {
            context.fillStyle = 'rgba(255, 255, 255, 0.8)';
            context.font = 'bold 24px Arial';
            context.textAlign = 'left';
            context.fillText('🏳️', 30, 50);
        }
        
        // Enhanced text with better shadow
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText(name, canvas.width / 2 + 2, canvas.height / 2 + 12);
        
        context.fillStyle = 'white';
        context.fillText(name, canvas.width / 2, canvas.height / 2 + 10);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            alphaTest: 0.001
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2.2, 0.55, 1);
        
        return sprite;
    },
    
    createParticleEffect: function() {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2;
            positions[i + 1] = Math.random() * 2;
            positions[i + 2] = (Math.random() - 0.5) * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x4CAF50,
            size: 0.02,
            transparent: true,
            opacity: 0.6
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.name = 'particles';
        return particles;
    },
    
    // Enhanced animation methods
    startIdleAnimations: function() {
        setInterval(() => {
            this.avatars.forEach(avatar => {
                if (avatar.isBreathing && avatar.mesh) {
                    avatar.breathPhase += 0.025;
                    
                    // Enhanced breathing with chest movement
                    const torso = avatar.mesh.getObjectByName('torso');
                    if (torso) {
                        torso.scale.y = 1 + Math.sin(avatar.breathPhase) * 0.012;
                        torso.scale.x = 1 + Math.sin(avatar.breathPhase) * 0.005;
                    }
                    
                    // Subtle shoulder movement
                    const leftUpperArm = avatar.mesh.getObjectByName('leftUpperArm');
                    const rightUpperArm = avatar.mesh.getObjectByName('rightUpperArm');
                    
                    if (leftUpperArm && rightUpperArm) {
                        leftUpperArm.rotation.x = 0.05 + Math.sin(avatar.breathPhase * 0.8) * 0.02;
                        rightUpperArm.rotation.x = 0.05 + Math.sin(avatar.breathPhase * 0.8 + Math.PI) * 0.02;
                    }
                }
            });
        }, 50);
    },
    
    startBlinkingAnimation: function() {
        setInterval(() => {
            this.avatars.forEach(avatar => {
                if (avatar.isBlinking && avatar.mesh) {
                    // Random blinking
                    if (Math.random() < 0.02) { // 2% chance per frame
                        this.performBlink(avatar);
                    }
                }
            });
        }, 100);
    },
    
    performBlink: function(avatar) {
        const leftEyelid = avatar.mesh.getObjectByName('leftEyelid');
        const rightEyelid = avatar.mesh.getObjectByName('rightEyelid');
        const leftEyeWhite = avatar.mesh.getObjectByName('leftEyeWhite');
        const rightEyeWhite = avatar.mesh.getObjectByName('rightEyeWhite');
        
        if (leftEyelid && rightEyelid && leftEyeWhite && rightEyeWhite) {
            // Show eyelids, hide eyes
            leftEyelid.visible = true;
            rightEyelid.visible = true;
            leftEyeWhite.visible = false;
            rightEyeWhite.visible = false;
            
            // Hide again after 150ms
            setTimeout(() => {
                leftEyelid.visible = false;
                rightEyelid.visible = false;
                leftEyeWhite.visible = true;
                rightEyeWhite.visible = true;
            }, 150);
        }
    },
    
    startSubtleMovements: function() {
        setInterval(() => {
            this.avatars.forEach(avatar => {
                if (avatar.mesh) {
                    avatar.animationPhase += 0.02;
                    
                    // Subtle weight shifting
                    avatar.group.rotation.z = Math.sin(avatar.animationPhase * 0.3) * 0.008;
                    
                    // Subtle head movements
                    const head = avatar.mesh.getObjectByName('head');
                    if (head) {
                        head.rotation.y = Math.sin(avatar.animationPhase * 0.4) * 0.03;
                        head.rotation.x = Math.sin(avatar.animationPhase * 0.5) * 0.01;
                    }
                    
                    // Particle animation
                    if (avatar.particleEffect) {
                        avatar.particleEffect.rotation.y += 0.005;
                        const positions = avatar.particleEffect.geometry.attributes.position.array;
                        for (let i = 1; i < positions.length; i += 3) {
                            positions[i] = Math.sin(Date.now() * 0.001 + i) * 0.5 + 1;
                        }
                        avatar.particleEffect.geometry.attributes.position.needsUpdate = true;
                    }
                }
            });
        }, 60);
    },
    
    playEnhancedEntranceAnimation: function(avatarData) {
        const group = avatarData.group;
        
        // Start invisible and small
        group.scale.setScalar(0);
        group.rotation.y = Math.PI * 2;
        
        let animationPhase = 0;
        const animateEntrance = () => {
            animationPhase += 0.06;
            
            // Scale animation with easing
            const scale = Math.min(avatarData.scale, animationPhase * avatarData.scale);
            const easeScale = this.easeOutBounce(scale / avatarData.scale) * avatarData.scale;
            group.scale.setScalar(easeScale);
            
            // Rotation animation
            group.rotation.y = (1 - animationPhase) * Math.PI * 2;
            
            // Bounce effect
            group.position.y = Math.sin(animationPhase * Math.PI) * 0.2;
            
            // Particle burst effect
            if (animationPhase > 0.5 && avatarData.particleEffect) {
                avatarData.particleEffect.material.opacity = Math.min(0.6, (animationPhase - 0.5) * 1.2);
            }
            
            if (animationPhase < 1) {
                requestAnimationFrame(animateEntrance);
            } else {
                group.position.y = 0;
                group.rotation.y = 0;
                group.scale.setScalar(avatarData.scale);
            }
        };
        
        requestAnimationFrame(animateEntrance);
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
    
    // Enhanced wave animation with realistic arm movement
    waveAnimation: function(avatarId, duration = 3000) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            const wavePhase = (elapsed / 250) % (Math.PI * 2);
            
            // Enhanced wave animation
            const rightUpperArm = avatar.mesh.getObjectByName('rightUpperArm');
            const rightLowerArm = avatar.mesh.getObjectByName('rightLowerArm');
            const rightHand = avatar.mesh.getObjectByName('rightHand');
            
            if (rightUpperArm && rightLowerArm) {
                rightUpperArm.rotation.z = -1.2 + Math.sin(wavePhase * 2) * 0.3;
                rightUpperArm.rotation.x = 0.2 + Math.sin(wavePhase * 3) * 0.1;
                rightLowerArm.rotation.x = 0.3 + Math.sin(wavePhase * 4) * 0.2;
                
                if (rightHand) {
                    rightHand.rotation.y = Math.sin(wavePhase * 5) * 0.3;
                }
            }
            
            // Head follows hand
            const head = avatar.mesh.getObjectByName('head');
            if (head) {
                head.rotation.y = Math.sin(wavePhase * 0.5) * 0.1;
                head.rotation.x = Math.sin(wavePhase * 0.3) * 0.05;
            }
            
            // Torso slight movement
            const torso = avatar.mesh.getObjectByName('torso');
            if (torso) {
                torso.rotation.z = Math.sin(wavePhase * 0.8) * 0.02;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.resetToIdlePose(avatar);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    // Enhanced dance animation with full body movement
    danceAnimation: function(avatarId, duration = 6000) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            const dancePhase = (elapsed / 400) % (Math.PI * 2);
            
            // Arms dancing
            const leftUpperArm = avatar.mesh.getObjectByName('leftUpperArm');
            const rightUpperArm = avatar.mesh.getObjectByName('rightUpperArm');
            const leftLowerArm = avatar.mesh.getObjectByName('leftLowerArm');
            const rightLowerArm = avatar.mesh.getObjectByName('rightLowerArm');
            
            if (leftUpperArm && rightUpperArm) {
                leftUpperArm.rotation.z = 0.15 + Math.sin(dancePhase) * 0.9;
                rightUpperArm.rotation.z = -0.15 + Math.sin(dancePhase + Math.PI) * 0.9;
                leftUpperArm.rotation.x = Math.sin(dancePhase * 1.3) * 0.4;
                rightUpperArm.rotation.x = Math.sin(dancePhase * 1.3 + Math.PI) * 0.4;
                
                if (leftLowerArm && rightLowerArm) {
                    leftLowerArm.rotation.x = 0.1 + Math.sin(dancePhase * 2) * 0.3;
                    rightLowerArm.rotation.x = 0.1 + Math.sin(dancePhase * 2 + Math.PI) * 0.3;
                }
            }
            
            // Body movement
            avatar.group.rotation.y = Math.sin(dancePhase * 0.6) * 0.3;
            avatar.group.rotation.z = Math.sin(dancePhase * 1.5) * 0.08;
            avatar.group.position.y = Math.abs(Math.sin(dancePhase * 2.5)) * 0.15;
            
            // Head movement
            const head = avatar.mesh.getObjectByName('head');
            if (head) {
                head.rotation.y = Math.sin(dancePhase * 1.1) * 0.2;
                head.rotation.x = Math.sin(dancePhase * 0.9) * 0.1;
            }
            
            // Torso movement
            const torso = avatar.mesh.getObjectByName('torso');
            if (torso) {
                torso.rotation.z = Math.sin(dancePhase * 1.8) * 0.1;
                torso.rotation.x = Math.sin(dancePhase * 0.7) * 0.05;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.resetToIdlePose(avatar);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    resetToIdlePose: function(avatar) {
        // Smoothly return to idle pose
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeOutCubic(progress);
            
            // Reset all parts to neutral positions
            const parts = [
                'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
                'leftHand', 'rightHand', 'head', 'torso'
            ];
            
            parts.forEach(partName => {
                const part = avatar.mesh.getObjectByName(partName);
                if (part) {
                    // Interpolate back to neutral pose
                    if (partName === 'leftUpperArm') {
                        part.rotation.x = this.lerp(part.rotation.x, 0.05, easeProgress);
                        part.rotation.z = this.lerp(part.rotation.z, 0.1, easeProgress);
                    } else if (partName === 'rightUpperArm') {
                        part.rotation.x = this.lerp(part.rotation.x, 0.05, easeProgress);
                        part.rotation.z = this.lerp(part.rotation.z, -0.1, easeProgress);
                    } else {
                        part.rotation.x = this.lerp(part.rotation.x, 0, easeProgress);
                        part.rotation.y = this.lerp(part.rotation.y, 0, easeProgress);
                        part.rotation.z = this.lerp(part.rotation.z, 0, easeProgress);
                    }
                }
            });
            
            // Reset group transformations
            avatar.group.rotation.y = this.lerp(avatar.group.rotation.y, 0, easeProgress);
            avatar.group.rotation.z = this.lerp(avatar.group.rotation.z, 0, easeProgress);
            avatar.group.position.y = this.lerp(avatar.group.position.y, 0, easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    // Utility functions
    getRandomChoice: function(categoryName) {
        const choices = this.customization[categoryName];
        return choices[Math.floor(Math.random() * choices.length)];
    },
    
    getBodyTypeModifiers: function(bodyType) {
        switch(bodyType) {
            case 'slim':
                return { torso: 0.85, arms: 0.9, legs: 0.9, hands: 0.95, neck: 0.9 };
            case 'athletic':
                return { torso: 1.1, arms: 1.15, legs: 1.1, hands: 1.05, neck: 1.1 };
            case 'curvy':
                return { torso: 1.2, arms: 1.05, legs: 1.15, hands: 1.0, neck: 1.0 };
            default: // average
                return { torso: 1.0, arms: 1.0, legs: 1.0, hands: 1.0, neck: 1.0 };
        }
    },
    
    getHeightMultiplier: function(height) {
        switch(height) {
            case 'short': return 0.85;
            case 'tall': return 1.15;
            default: return 1.0; // average
        }
    },
    
    darkenColor: function(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const newR = Math.floor(r * (1 - factor));
        const newG = Math.floor(g * (1 - factor));
        const newB = Math.floor(b * (1 - factor));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    },
    
    lerp: function(a, b, t) {
        return a + (b - a) * t;
    },
    
    easeOutCubic: function(t) {
        return 1 - Math.pow(1 - t, 3);
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
    
    storeBoneReferences: function(avatarData) {
        // Store references to important bones/parts for easier animation
        const mesh = avatarData.mesh;
        const bones = avatarData.bones;
        
        const boneNames = [
            'head', 'neck', 'torso',
            'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm',
            'leftHand', 'rightHand', 'leftUpperLeg', 'rightUpperLeg',
            'leftLowerLeg', 'rightLowerLeg', 'leftShoe', 'rightShoe'
        ];
        
        boneNames.forEach(boneName => {
            const bone = mesh.getObjectByName(boneName);
            if (bone) {
                bones.set(boneName, bone);
            }
        });
    },
    
    // Enhanced customization methods
    customizeAvatar: function(avatarId, options) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) {
            console.warn(`Avatar ${avatarId} not found for customization`);
            return;
        }
        
        // Update customization options
        Object.assign(avatar.customization, options);
        
        // Remove old avatar mesh
        avatar.group.remove(avatar.mesh);
        
        // Create new avatar with updated options
        const newMesh = this.createEnhancedHuman(avatar.customization);
        avatar.group.add(newMesh);
        avatar.mesh = newMesh;
        
        // Update bone references
        avatar.bones.clear();
        this.storeBoneReferences(avatar);
        
        // Update emotion if specified
        if (options.emotion) {
            avatar.emotion = options.emotion;
        }
        
        // Update scale if height changed
        if (options.height) {
            const heightMultiplier = this.getHeightMultiplier(options.height);
            avatar.scale = avatar.customization.scale * heightMultiplier;
            avatar.group.scale.setScalar(avatar.scale);
        }
        
        // Update name label if name or nationality changed
        if (options.name || options.nationality) {
            avatar.group.remove(avatar.nameLabel);
            const newNameLabel = this.createNameLabelWithFlag(
                avatar.customization.name, 
                avatar.customization.nationality
            );
            newNameLabel.position.y = 2.8;
            avatar.group.add(newNameLabel);
            avatar.nameLabel = newNameLabel;
        }
        
        console.log(`👤 Customized enhanced avatar: ${avatarId}`, options);
        
        // Add customization effect
        this.playCustomizationEffect(avatar);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('avatar:customized', { avatar, options });
        }
    },
    
    playCustomizationEffect: function(avatar) {
        // Enhanced sparkle effect during customization
        const sparkleCount = 25;
        const sparkles = [];
        
        for (let i = 0; i < sparkleCount; i++) {
            const sparkleGeometry = new THREE.SphereGeometry(0.01 + Math.random() * 0.01, 6, 6);
            const sparkleMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
                transparent: true,
                opacity: 0.9
            });
            
            const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
            
            sparkle.position.set(
                avatar.group.position.x + (Math.random() - 0.5) * 3,
                avatar.group.position.y + Math.random() * 2.5,
                avatar.group.position.z + (Math.random() - 0.5) * 3
            );
            
            sparkle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                0.02 + Math.random() * 0.02,
                (Math.random() - 0.5) * 0.02
            );
            
            sparkles.push(sparkle);
            
            if (window.SceneManager) {
                window.SceneManager.addObject(sparkle);
            }
        }
        
        // Animate sparkles
        let sparklePhase = 0;
        const animateSparkles = () => {
            sparklePhase += 0.04;
            
            sparkles.forEach((sparkle, index) => {
                if (sparkle.parent) {
                    sparkle.position.add(sparkle.velocity);
                    sparkle.material.opacity = 0.9 - sparklePhase;
                    sparkle.rotation.y += 0.1;
                    sparkle.rotation.x += 0.15;
                    sparkle.scale.setScalar(1 + sparklePhase * 0.8);
                    
                    // Add slight gravity
                    sparkle.velocity.y -= 0.001;
                    
                    if (sparklePhase > 0.9) {
                        if (window.SceneManager) {
                            window.SceneManager.removeObject(sparkle);
                        }
                        sparkle.geometry.dispose();
                        sparkle.material.dispose();
                    }
                }
            });
            
            if (sparklePhase < 0.9) {
                requestAnimationFrame(animateSparkles);
            }
        };
        
        requestAnimationFrame(animateSparkles);
        
        // Add energy wave effect
        this.createEnergyWave(avatar);
    },
    
    createEnergyWave: function(avatar) {
        const waveGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.copy(avatar.group.position);
        wave.rotation.x = -Math.PI / 2;
        
        if (window.SceneManager) {
            window.SceneManager.addObject(wave);
        }
        
        // Animate wave
        let wavePhase = 0;
        const animateWave = () => {
            wavePhase += 0.08;
            
            const scale = wavePhase * 5;
            wave.scale.setScalar(scale);
            wave.material.opacity = 0.6 - (wavePhase * 0.6);
            
            if (wavePhase < 1) {
                requestAnimationFrame(animateWave);
            } else {
                if (window.SceneManager) {
                    window.SceneManager.removeObject(wave);
                }
                wave.geometry.dispose();
                wave.material.dispose();
            }
        };
        
        requestAnimationFrame(animateWave);
    },
    
    // Advanced hair creation methods
    createLongWavyHair: function(hairMaterial) {
        const group = new THREE.Group();
        
        // Top section
        const topGeometry = new THREE.SphereGeometry(0.28, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.7);
        const topHair = new THREE.Mesh(topGeometry, hairMaterial);
        topHair.position.y = 0.1;
        group.add(topHair);
        
        // Long wavy strands
        for (let i = 0; i < 12; i++) {
            const strandGeometry = new THREE.CylinderGeometry(0.015, 0.01, 0.7, 8);
            const strand = new THREE.Mesh(strandGeometry, hairMaterial);
            const angle = (i / 12) * Math.PI * 2;
            strand.position.set(
                Math.cos(angle) * 0.22,
                -0.2,
                Math.sin(angle) * 0.22
            );
            // Add wave effect
            strand.rotation.z = Math.sin(i * 0.5) * 0.4;
            strand.rotation.x = Math.cos(i * 0.3) * 0.2;
            group.add(strand);
        }
        
        return group;
    },
    
    createBobCutHair: function(hairMaterial) {
        const group = new THREE.Group();
        
        // Main hair volume
        const mainGeometry = new THREE.SphereGeometry(0.27, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.8);
        const mainHair = new THREE.Mesh(mainGeometry, hairMaterial);
        mainHair.position.y = 0.05;
        group.add(mainHair);
        
        // Side sections for bob shape
        const sideGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.25);
        
        const leftSide = new THREE.Mesh(sideGeometry, hairMaterial);
        leftSide.position.set(-0.25, 0, 0);
        group.add(leftSide);
        
        const rightSide = new THREE.Mesh(sideGeometry, hairMaterial);
        rightSide.position.set(0.25, 0, 0);
        group.add(rightSide);
        
        return group;
    },
    
    createManBunHair: function(hairMaterial) {
        const group = new THREE.Group();
        
        // Base hair
        const baseGeometry = new THREE.SphereGeometry(0.26, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const baseHair = new THREE.Mesh(baseGeometry, hairMaterial);
        baseHair.position.y = 0.08;
        group.add(baseHair);
        
        // Bun at the back
        const bunGeometry = new THREE.SphereGeometry(0.08, 12, 12);
        const bun = new THREE.Mesh(bunGeometry, hairMaterial);
        bun.position.set(0, 0.15, -0.2);
        group.add(bun);
        
        return group;
    },
    
    createPonytailHair: function(hairMaterial) {
        const group = new THREE.Group();
        
        // Front hair
        const frontGeometry = new THREE.SphereGeometry(0.27, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.65);
        const frontHair = new THREE.Mesh(frontGeometry, hairMaterial);
        frontHair.position.y = 0.08;
        group.add(frontHair);
        
        // Ponytail
        const tailGeometry = new THREE.CylinderGeometry(0.04, 0.02, 0.5, 12);
        const tail = new THREE.Mesh(tailGeometry, hairMaterial);
        tail.position.set(0, -0.1, -0.22);
        tail.rotation.x = 0.3;
        group.add(tail);
        
        return group;
    },
    
    createBuzzCutHair: function(hairMaterial) {
        const hairGeometry = new THREE.SphereGeometry(0.255, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 0.05;
        hair.castShadow = true;
        return hair;
    },
    
    // Additional accessory creation methods
    createSunglasses: function() {
        const group = new THREE.Group();
        const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        const lensMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x111111, 
            transparent: true, 
            opacity: 0.8 
        });
        
        // Larger frames for sunglasses
        const frameGeometry = new THREE.TorusGeometry(0.07, 0.01, 8, 16);
        
        const leftFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        leftFrame.position.set(-0.08, 0.03, 0.22);
        group.add(leftFrame);
        
        const rightFrame = new THREE.Mesh(frameGeometry, frameMaterial);
        rightFrame.position.set(0.08, 0.03, 0.22);
        group.add(rightFrame);
        
        // Dark lenses
        const lensGeometry = new THREE.CircleGeometry(0.065, 16);
        
        const leftLens = new THREE.Mesh(lensGeometry, lensMaterial);
        leftLens.position.set(-0.08, 0.03, 0.225);
        group.add(leftLens);
        
        const rightLens = new THREE.Mesh(lensGeometry, lensMaterial);
        rightLens.position.set(0.08, 0.03, 0.225);
        group.add(rightLens);
        
        // Bridge
        const bridgeGeometry = new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6);
        const bridge = new THREE.Mesh(bridgeGeometry, frameMaterial);
        bridge.position.set(0, 0.03, 0.22);
        bridge.rotation.z = Math.PI / 2;
        group.add(bridge);
        
        return group;
    },
    
    createBaseballCap: function() {
        const group = new THREE.Group();
        const capMaterial = new THREE.MeshLambertMaterial({ color: 0x000080 });
        
        // Cap crown
        const crownGeometry = new THREE.SphereGeometry(0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
        const crown = new THREE.Mesh(crownGeometry, capMaterial);
        crown.position.y = 0.15;
        group.add(crown);
        
        // Visor
        const visorGeometry = new THREE.CylinderGeometry(0.28, 0.32, 0.02, 16, 1, false, 0, Math.PI);
        const visor = new THREE.Mesh(visorGeometry, capMaterial);
        visor.position.set(0, 0.05, 0.15);
        visor.rotation.x = -Math.PI / 6;
        group.add(visor);
        
        return group;
    },
    
    createWatch: function() {
        const group = new THREE.Group();
        const watchMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const bandMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        
        // Watch face
        const faceGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.01, 16);
        const face = new THREE.Mesh(faceGeometry, watchMaterial);
        face.position.set(0.62, 0.55, 0.12);
        face.rotation.z = Math.PI / 2;
        group.add(face);
        
        // Watch band
        const bandGeometry = new THREE.TorusGeometry(0.04, 0.008, 8, 16);
        const band = new THREE.Mesh(bandGeometry, bandMaterial);
        band.position.set(0.62, 0.55, 0.12);
        band.rotation.x = Math.PI / 2;
        group.add(band);
        
        return group;
    },
    
    createBackpack: function() {
        const group = new THREE.Group();
        const packMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        // Main compartment
        const mainGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.15);
        const main = new THREE.Mesh(mainGeometry, packMaterial);
        main.position.set(0, 1.2, -0.25);
        group.add(main);
        
        // Straps
        const strapGeometry = new THREE.BoxGeometry(0.03, 0.3, 0.02);
        
        const leftStrap = new THREE.Mesh(strapGeometry, packMaterial);
        leftStrap.position.set(-0.1, 1.35, -0.18);
        group.add(leftStrap);
        
        const rightStrap = new THREE.Mesh(strapGeometry, packMaterial);
        rightStrap.position.set(0.1, 1.35, -0.18);
        group.add(rightStrap);
        
        return group;
    },
    
    // Default avatar creation
    createDefaultAvatar: function() {
        if (this.avatars.has('default')) {
            console.log('👤 Enhanced default avatar already exists');
            return this.avatars.get('default');
        }
        
        const defaultAvatar = this.createAvatar('default', {
            name: window.ROOM_CONFIG?.username || 'You',
            nationality: window.ROOM_CONFIG?.userNationality || 'UN',
            position: { x: 0, y: 0, z: 0 },
            hairStyle: 'short_clean',
            hairColor: '#8B4513',
            shirtStyle: 't_shirt',
            shirtColor: '#4169E1',
            pantsStyle: 'jeans',
            pantsColor: '#000080',
            shoeStyle: 'sneakers',
            shoeColor: '#654321',
            skinTone: '#FDBCB4',
            eyeColor: '#654321',
            emotion: 'happy',
            accessory: 'none',
            bodyType: 'average',
            height: 'average'
        });
        
        console.log('👤 Created enhanced realistic default avatar successfully');
        return defaultAvatar;
    },
    
    // Position and management methods
    updateAvatarPosition: function(avatarId, position) {
        const avatar = this.avatars.get(avatarId);
        if (avatar && position) {
            avatar.group.position.set(position.x, position.y, position.z);
            avatar.position = avatar.group.position.clone();
            avatar.lastUpdate = Date.now();
        }
    },
    
    getAvatarPosition: function(avatarId) {
        const avatar = this.avatars.get(avatarId);
        return avatar ? avatar.group.position.clone() : null;
    },
    
    removeAvatar: function(avatarId) {
        const avatar = this.avatars.get(avatarId);
        if (avatar) {
            // Clean up resources
            this.cleanupAvatar(avatar);
            
            if (window.SceneManager && window.SceneManager.scene) {
                window.SceneManager.removeObject(avatar.group);
            }
            this.avatars.delete(avatarId);
            console.log(`👤 Removed enhanced avatar: ${avatarId}`);
            
            // Emit event
            if (window.EventBus) {
                window.EventBus.emit('avatar:removed', { avatarId });
            }
        }
    },
    
    cleanupAvatar: function(avatar) {
        // Dispose of all geometries and materials
        avatar.group.traverse((child) => {
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
        
        // Clean up particle effect
        if (avatar.particleEffect) {
            avatar.particleEffect.geometry.dispose();
            avatar.particleEffect.material.dispose();
        }
        
        // Clean up name label
        if (avatar.nameLabel && avatar.nameLabel.material) {
            if (avatar.nameLabel.material.map) {
                avatar.nameLabel.material.map.dispose();
            }
            avatar.nameLabel.material.dispose();
        }
    },
    
    // Get random customization for variety
    getRandomCustomization: function() {
        return {
            hairStyle: this.getRandomChoice('hairStyles'),
            hairColor: this.getRandomChoice('hairColors'),
            skinTone: this.getRandomChoice('skinTones'),
            shirtStyle: this.getRandomChoice('shirtStyles'),
            shirtColor: this.getRandomChoice('shirtColors'),
            pantsStyle: this.getRandomChoice('pantsStyles'),
            pantsColor: this.getRandomChoice('pantsColors'),
            shoeStyle: this.getRandomChoice('shoeStyles'),
            shoeColor: this.getRandomChoice('shoeColors'),
            eyeColor: this.getRandomChoice('eyeColors'),
            emotion: this.getRandomChoice('emotions'),
            accessory: this.getRandomChoice('accessories'),
            bodyType: this.getRandomChoice('bodyTypes'),
            height: this.getRandomChoice('heights')
        };
    },
    
    // Public API methods
    getAvatar: function(avatarId) {
        return this.avatars.get(avatarId);
    },
    
    getAllAvatars: function() {
        return Array.from(this.avatars.values());
    },
    
    getAvatarCount: function() {
        return this.avatars.size;
    },
    
    updateAnimations: function() {
        const delta = this.clock.getDelta();
        
        // Update any animation mixers if we add skeletal animation later
        this.animationMixers.forEach(mixer => {
            mixer.update(delta);
        });
        
        // Update particle effects
        this.avatars.forEach(avatar => {
            if (avatar.particleEffect) {
                const positions = avatar.particleEffect.geometry.attributes.position;
                if (positions) {
                    positions.needsUpdate = true;
                }
            }
        });
    },
    
    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    }
};