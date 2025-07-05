// Enhanced Avatar System - Realistic human avatars with natural arms and detailed features
// Compatible with room-core.js and room_3d.html
// UPDATED: Complete ChatBubble Integration v4.0

window.AvatarSystem = {
    avatars: new Map(),
    isInitialized: false,
    animationMixers: new Map(),
    
    // Enhanced avatar customization presets
    customization: {
        hairStyles: ['short_1', 'long_1', 'curly_1', 'wavy_1', 'spiky_1', 'braided_1'],
        hairColors: ['#8B4513', '#FFD700', '#000000', '#654321', '#FF4500', '#800080', '#4169E1', '#228B22', '#FF69B4', '#DC143C'],
        skinTones: ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524', '#F3D7A7', '#E8B88F', '#D2945B'],
        shirtColors: ['#4169E1', '#FF0000', '#00FF00', '#FFFF00', '#FF69B4', '#800080', '#FF4500', '#00CED1', '#32CD32', '#FF1493'],
        pantsColors: ['#000080', '#8B4513', '#000000', '#696969', '#2F4F4F', '#483D8B', '#556B2F', '#8B0000'],
        shoeColors: ['#654321', '#000000', '#8B4513', '#2F4F4F', '#800000', '#191970'],
        eyeColors: ['#654321', '#4169E1', '#228B22', '#8B4513', '#800080', '#DC143C'],
        emotions: ['happy', 'sad', 'excited', 'angry', 'surprised', 'neutral', 'love', 'confused'],
        accessories: ['none', 'glasses', 'hat', 'necklace', 'earrings']
    },
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('👤 Initializing Enhanced Avatar System with ChatBubble Integration');
        
        this.isInitialized = true;
        
        // Create default avatar immediately if scene is ready
        if (window.SceneManager && window.SceneManager.isInitialized) {
            this.createDefaultAvatar();
        } else {
            // Wait for scene to be ready
            if (window.EventBus) {
                window.EventBus.on('scene:initialized', () => {
                    console.log('🎬 Scene ready, creating realistic default avatar...');
                    this.createDefaultAvatar();
                });
            }
        }
        
        // Listen for customization events
        if (window.EventBus) {
            window.EventBus.on('avatar:customize', (options) => {
                this.customizeAvatar('default', options);
            });
            
            window.EventBus.on('scene:frame', () => {
                this.updateAnimations();
            });
        }
        
        // Set up breathing animation for all avatars
        this.startBreathingAnimation();
        
        console.log('✅ Enhanced Avatar System initialized with ChatBubble support');
        
        // Emit initialization event for other systems
        if (window.EventBus) {
            window.EventBus.emit('avatar-system:initialized', this);
        }
    },
    
    createAvatar: function(userId, options = {}) {
        const avatarId = userId || this.generateId();
        
        // Enhanced default customization options
        const defaultOptions = {
            name: options.name || `User ${avatarId.slice(0, 4)}`,
            position: options.position || { x: 0, y: 0, z: 0 },
            hairStyle: options.hairStyle || 'short_1',
            hairColor: options.hairColor || '#8B4513',
            skinTone: options.skinTone || '#FDBCB4',
            shirtColor: options.shirtColor || '#4169E1',
            pantsColor: options.pantsColor || '#000080',
            shoeColor: options.shoeColor || '#654321',
            eyeColor: options.eyeColor || '#654321',
            emotion: options.emotion || 'neutral',
            accessory: options.accessory || 'none',
            scale: options.scale || 1.0,
            bodyType: options.bodyType || 'average'
        };
        
        // Create avatar group
        const avatarGroup = new THREE.Group();
        
        // CRITICAL: Add userId to userData for ChatBubble system
        avatarGroup.userData = {
            userId: avatarId,
            type: 'avatar',
            isAvatar: true
        };
        avatarGroup.name = `avatar_${avatarId}`;
        
        // Create ultra-realistic human avatar
        const avatar = this.createRealisticHuman(defaultOptions);
        avatarGroup.add(avatar);
        
        // Add enhanced name label
        const nameLabel = this.createEnhancedNameLabel(defaultOptions.name);
        nameLabel.position.y = 2.8;
        avatarGroup.add(nameLabel);
        
        // Add subtle glow effect
        const glowEffect = this.createGlowEffect();
        glowEffect.position.y = 1;
        avatarGroup.add(glowEffect);
        
        // Set initial position and scale
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
            mesh: avatar,
            nameLabel: nameLabel,
            glowEffect: glowEffect,
            position: avatarGroup.position.clone(),
            rotation: avatarGroup.rotation.clone(),
            animation: 'idle',
            emotion: defaultOptions.emotion,
            customization: { ...defaultOptions },
            lastUpdate: Date.now(),
            animationPhase: Math.random() * Math.PI * 2,
            isBreathing: true,
            scale: defaultOptions.scale
        };
        
        this.avatars.set(avatarId, avatarData);
        
        // Add to scene
        if (window.SceneManager && window.SceneManager.scene) {
            window.SceneManager.addObject(avatarGroup);
            console.log(`👤 Added realistic avatar ${avatarId} to scene at position:`, defaultOptions.position);
        } else {
            console.error('❌ Scene not ready when trying to add avatar');
        }
        
        console.log(`👤 Created ultra-realistic avatar: ${avatarId}`);
        
        // Add entrance animation
        this.playEntranceAnimation(avatarData);
        
        // CRITICAL: Emit event for ChatBubble system with proper structure
        if (window.EventBus) {
            setTimeout(() => {
                window.EventBus.emit('avatar:created', {
                    id: avatarId,
                    avatar: avatarData,
                    position: avatarGroup.position.clone(),
                    userData: avatarGroup.userData
                });
            }, 100); // Small delay to ensure avatar is fully added to scene
        }
        
        return avatarData;
    },
    
    // CRITICAL: Enhanced avatar position getter for ChatBubble system
    getAvatarPosition: function(userId) {
        try {
            // Method 1: Direct avatar lookup from our avatars Map
            if (this.avatars && this.avatars.has(userId)) {
                const avatar = this.avatars.get(userId);
                if (avatar?.group?.position) {
                    return avatar.group.position.clone();
                }
            }
            
            // Method 2: Scene search for backwards compatibility
            if (window.SceneManager?.scene) {
                const avatar = window.SceneManager.scene.children.find(child => 
                    child.userData?.userId === userId || 
                    child.name === `avatar_${userId}` ||
                    child.userData?.id === userId
                );
                if (avatar?.position) {
                    return avatar.position.clone();
                }
            }
            
            // Method 3: Default position for current user
            if (userId === window.ROOM_CONFIG?.userId || userId === 'default') {
                return new THREE.Vector3(0, 0, 0);
            }
            
            console.warn(`👤 No position found for avatar: ${userId}`);
            return null;
            
        } catch (error) {
            console.error('❌ Error getting avatar position:', error);
            return null;
        }
    },
    
    // CRITICAL: Enhanced position update with ChatBubble integration
    updateAvatarPosition: function(avatarId, position) {
        try {
            const avatar = this.avatars.get(avatarId);
            if (avatar && avatar.group) {
                // Update avatar position
                avatar.group.position.set(position.x, position.y, position.z);
                avatar.position = avatar.group.position.clone();
                avatar.lastUpdate = Date.now();
                
                console.log(`👤 Updated avatar ${avatarId} position:`, position);
                
                // CRITICAL: Emit position change event for ChatBubble system
                if (window.EventBus) {
                    window.EventBus.emit('avatar:position-changed', {
                        userId: avatarId,
                        position: avatar.group.position.clone(),
                        avatar: avatar
                    });
                }
                
                // Direct notification to ChatBubbleSystem if available
                if (window.ChatBubbleSystem?.handleAvatarPositionUpdate) {
                    try {
                        window.ChatBubbleSystem.handleAvatarPositionUpdate(avatarId, position);
                    } catch (error) {
                        console.warn('Error notifying ChatBubbleSystem:', error);
                    }
                }
                
                return true;
            } else {
                console.warn(`👤 Avatar ${avatarId} not found for position update`);
                return false;
            }
        } catch (error) {
            console.error('❌ Error updating avatar position:', error);
            return false;
        }
    },
    
    // CRITICAL: Enhanced methods for ChatBubble system integration
    getAllAvatars: function() {
        try {
            return Array.from(this.avatars.values());
        } catch (error) {
            console.warn('Error getting all avatars:', error);
            return [];
        }
    },
    
    hasAvatar: function(userId) {
        return this.avatars && this.avatars.has(userId);
    },
    
    getAvatar: function(userId) {
        return this.avatars ? this.avatars.get(userId) : null;
    },
    
    // CRITICAL: Avatar movement with automatic ChatBubble updates
    moveAvatar: function(avatarId, newPosition, duration = 1000) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        const startPosition = avatar.group.position.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth interpolation
            const currentPosition = startPosition.clone().lerp(newPosition, progress);
            this.updateAvatarPosition(avatarId, currentPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    },
    
    createRealisticHuman: function(options = {}) {
        const group = new THREE.Group();
        
        const skinColor = parseInt(options.skinTone.replace('#', '0x'));
        const shirtColor = parseInt(options.shirtColor.replace('#', '0x'));
        const pantsColor = parseInt(options.pantsColor.replace('#', '0x'));
        const shoeColor = parseInt(options.shoeColor.replace('#', '0x'));
        const eyeColor = parseInt(options.eyeColor.replace('#', '0x'));
        
        const skinMaterial = new THREE.MeshPhongMaterial({ 
            color: skinColor,
            shininess: 30
        });
        
        // TORSO - Fixed position and proportions
        const torsoGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.3);
        const torsoMaterial = new THREE.MeshPhongMaterial({ color: shirtColor });
        const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
        torso.position.set(0, 1.0, 0); // Proper height
        torso.castShadow = true;
        torso.receiveShadow = true;
        torso.name = 'torso';
        group.add(torso);
        
        // NECK - Properly positioned
        const neckGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.2, 12);
        const neck = new THREE.Mesh(neckGeometry, skinMaterial);
        neck.position.set(0, 1.5, 0); // Connected to torso top
        neck.castShadow = true;
        neck.name = 'neck';
        group.add(neck);
        
        // HEAD - Properly positioned on neck
        const headGeometry = new THREE.SphereGeometry(0.25, 24, 24);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        head.position.set(0, 1.75, 0); // On top of neck
        head.castShadow = true;
        head.name = 'head';
        group.add(head);
        
        // Add facial features
        this.addFacialFeatures(group, eyeColor, options.emotion);
        
        // Add hair
        const hair = this.createHair(options.hairStyle, options.hairColor);
        if (hair) {
            hair.position.set(0, 1.75, 0); // Same as head
            group.add(hair);
        }
        
        // ARMS - Enhanced natural arms with proper connection and curves
        this.addNaturalArms(group, skinMaterial, shirtColor);
        
        // LEGS - Properly connected to torso
        this.addLegs(group, skinMaterial, pantsColor);
        
        // FEET - Properly positioned
        this.addFeet(group, shoeColor);
        
        // Add accessory
        const accessory = this.createAccessory(options.accessory);
        if (accessory) {
            accessory.position.set(0, 1.75, 0);
            group.add(accessory);
        }
        
        return group;
    },
    
    addFacialFeatures: function(group, eyeColor, emotion) {
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.03, 12, 12);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 1.78, 0.22);
        group.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 1.78, 0.22);
        group.add(rightEye);
        
        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.015, 8, 8);
        const pupilMaterial = new THREE.MeshPhongMaterial({ color: eyeColor });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.08, 1.78, 0.24);
        leftPupil.name = 'leftPupil';
        group.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.08, 1.78, 0.24);
        rightPupil.name = 'rightPupil';
        group.add(rightPupil);
        
        // Nose
        const noseGeometry = new THREE.ConeGeometry(0.02, 0.06, 6);
        const noseMaterial = new THREE.MeshPhongMaterial({ color: parseInt('#FDBCB4'.replace('#', '0x')) });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 1.72, 0.23);
        nose.rotation.x = Math.PI;
        group.add(nose);
        
        // Mouth
        this.addMouth(group, emotion);
    },
    
    addMouth: function(group, emotion) {
        let mouthGeometry;
        const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0xcc6666 });
        
        switch(emotion) {
            case 'happy':
                mouthGeometry = new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI);
                break;
            case 'sad':
                mouthGeometry = new THREE.TorusGeometry(0.04, 0.008, 4, 8, Math.PI);
                break;
            default:
                mouthGeometry = new THREE.BoxGeometry(0.06, 0.01, 0.01);
        }
        
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, 1.68, 0.22);
        
        if (emotion === 'happy') {
            mouth.rotation.x = Math.PI;
        } else if (emotion === 'sad') {
            mouth.rotation.x = 0;
        }
        
        mouth.name = 'mouth';
        group.add(mouth);
    },
    
    addNaturalArms: function(group, skinMaterial, shirtColor) {
        const shirtMaterial = new THREE.MeshPhongMaterial({ color: shirtColor });
        
        // UPPER ARMS - Natural shape and positioning
        const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.09, 0.4, 16);
        
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, shirtMaterial);
        leftUpperArm.position.set(-0.38, 1.1, 0.05); // Slightly forward for natural posture
        leftUpperArm.rotation.z = -0.15; // Natural angle
        leftUpperArm.rotation.x = 0.1; // Slight forward tilt
        leftUpperArm.castShadow = true;
        leftUpperArm.name = 'leftUpperArm';
        group.add(leftUpperArm);
        
        const rightUpperArm = new THREE.Mesh(upperArmGeometry, shirtMaterial);
        rightUpperArm.position.set(0.38, 1.1, 0.05);
        rightUpperArm.rotation.z = -0.15;
        rightUpperArm.rotation.x = 0.1;
        rightUpperArm.castShadow = true;
        rightUpperArm.name = 'rightUpperArm';
        group.add(rightUpperArm);
        
        // LOWER ARMS (FOREARMS) - Connected and natural
        const lowerArmGeometry = new THREE.CylinderGeometry(0.06, 0.07, 0.35, 16);
        
        const leftLowerArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
        leftLowerArm.position.set(-0.50, 0.65, 0.15); // Connected to upper arm
        leftLowerArm.rotation.z = -0.08; // Slight outward angle
        leftLowerArm.rotation.x = 0.05; // Slight forward bend
        leftLowerArm.castShadow = true;
        leftLowerArm.name = 'leftLowerArm';
        group.add(leftLowerArm);
        
        const rightLowerArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
        rightLowerArm.position.set(0.50, 0.65, 0.15);
        rightLowerArm.rotation.z = 0.08;
        rightLowerArm.rotation.x = 0.05;
        rightLowerArm.castShadow = true;
        rightLowerArm.name = 'rightLowerArm';
        group.add(rightLowerArm);
        
        // HANDS - Simple but realistic
        this.addSimpleHands(group, skinMaterial);
    },
    
    addSimpleHands: function(group, skinMaterial) {
        // Simple but effective hands - just palm and thumb
        
        // LEFT HAND
        const handGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.05);
        
        const leftHand = new THREE.Mesh(handGeometry, skinMaterial);
        leftHand.position.set(-0.58, 0.45, 0.20); // Connected to lower arm
        leftHand.rotation.x = 0.1; // Slight natural curl
        leftHand.rotation.z = 0.05;
        leftHand.castShadow = true;
        leftHand.name = 'leftHand';
        group.add(leftHand);
        
        // LEFT THUMB
        const thumbGeometry = new THREE.BoxGeometry(0.02, 0.06, 0.03);
        const leftThumb = new THREE.Mesh(thumbGeometry, skinMaterial);
        leftThumb.position.set(-0.54, 0.42, 0.22);
        leftThumb.rotation.z = 0.8;
        leftThumb.rotation.x = 0.3;
        leftThumb.castShadow = true;
        group.add(leftThumb);
        
        // RIGHT HAND
        const rightHand = new THREE.Mesh(handGeometry.clone(), skinMaterial);
        rightHand.position.set(0.58, 0.45, 0.20);
        rightHand.rotation.x = 0.1;
        rightHand.rotation.z = -0.05;
        rightHand.castShadow = true;
        rightHand.name = 'rightHand';
        group.add(rightHand);
        
        // RIGHT THUMB
        const rightThumb = new THREE.Mesh(thumbGeometry.clone(), skinMaterial);
        rightThumb.position.set(0.54, 0.42, 0.22);
        rightThumb.rotation.z = -0.8;
        rightThumb.rotation.x = 0.3;
        rightThumb.castShadow = true;
        group.add(rightThumb);
    },
    
    addLegs: function(group, skinMaterial, pantsColor) {
        const pantsMaterial = new THREE.MeshPhongMaterial({ color: pantsColor });
        
        // Thighs - properly connected to torso
        const thighGeometry = new THREE.CylinderGeometry(0.11, 0.13, 0.45, 12);
        
        const leftThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
        leftThigh.position.set(-0.15, 0.38, 0); // Connected to torso bottom
        leftThigh.castShadow = true;
        leftThigh.name = 'leftThigh';
        group.add(leftThigh);
        
        const rightThigh = new THREE.Mesh(thighGeometry, pantsMaterial);
        rightThigh.position.set(0.15, 0.38, 0);
        rightThigh.castShadow = true;
        rightThigh.name = 'rightThigh';
        group.add(rightThigh);
        
        // Shins - connected to thighs
        const shinGeometry = new THREE.CylinderGeometry(0.08, 0.10, 0.4, 12);
        
        const leftShin = new THREE.Mesh(shinGeometry, pantsMaterial);
        leftShin.position.set(-0.15, -0.05, 0); // Connected to thigh
        leftShin.castShadow = true;
        leftShin.name = 'leftShin';
        group.add(leftShin);
        
        const rightShin = new THREE.Mesh(shinGeometry, pantsMaterial);
        rightShin.position.set(0.15, -0.05, 0);
        rightShin.castShadow = true;
        rightShin.name = 'rightShin';
        group.add(rightShin);
    },
    
    addFeet: function(group, shoeColor) {
        const shoeMaterial = new THREE.MeshPhongMaterial({ color: shoeColor });
        
        // Shoes - properly positioned
        const shoeGeometry = new THREE.BoxGeometry(0.18, 0.08, 0.3);
        
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.15, -0.3, 0.05); // Connected to shin
        leftShoe.castShadow = true;
        leftShoe.name = 'leftShoe';
        group.add(leftShoe);
        
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.15, -0.3, 0.05);
        rightShoe.castShadow = true;
        rightShoe.name = 'rightShoe';
        group.add(rightShoe);
    },
    
    createHair: function(style, color) {
        const hairColor = parseInt(color.replace('#', '0x'));
        const hairMaterial = new THREE.MeshPhongMaterial({ 
            color: hairColor,
            shininess: 60
        });
        
        let hairGeometry;
        
        switch(style) {
            case 'long_1':
                const group = new THREE.Group();
                hairGeometry = new THREE.SphereGeometry(0.28, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.7);
                const topHair = new THREE.Mesh(hairGeometry, hairMaterial);
                topHair.position.y = 0.1;
                group.add(topHair);
                
                const backHairGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.1);
                const backHair = new THREE.Mesh(backHairGeometry, hairMaterial);
                backHair.position.set(0, -0.1, -0.25);
                group.add(backHair);
                return group;
                
            case 'curly_1':
                hairGeometry = new THREE.SphereGeometry(0.32, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.7);
                break;
                
            case 'spiky_1':
                const spikyGroup = new THREE.Group();
                hairGeometry = new THREE.SphereGeometry(0.26, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6);
                const baseHair = new THREE.Mesh(hairGeometry, hairMaterial);
                spikyGroup.add(baseHair);
                
                for (let i = 0; i < 8; i++) {
                    const spikeGeometry = new THREE.ConeGeometry(0.02, 0.15, 6);
                    const spike = new THREE.Mesh(spikeGeometry, hairMaterial);
                    const angle = (i / 8) * Math.PI * 2;
                    spike.position.set(
                        Math.cos(angle) * 0.2,
                        0.2,
                        Math.sin(angle) * 0.2
                    );
                    spikyGroup.add(spike);
                }
                return spikyGroup;
                
            default: // short_1
                hairGeometry = new THREE.SphereGeometry(0.28, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.65);
        }
        
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 0.08;
        hair.castShadow = true;
        return hair;
    },
    
    createAccessory: function(type) {
        switch(type) {
            case 'glasses':
                return this.createGlasses();
            case 'hat':
                return this.createHat();
            case 'necklace':
                return this.createNecklace();
            default:
                return null;
        }
    },
    
    createGlasses: function() {
        const group = new THREE.Group();
        const glassMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        
        const frameGeometry = new THREE.TorusGeometry(0.07, 0.01, 8, 16);
        
        const leftFrame = new THREE.Mesh(frameGeometry, glassMaterial);
        leftFrame.position.set(-0.08, 0.03, 0.22);
        group.add(leftFrame);
        
        const rightFrame = new THREE.Mesh(frameGeometry, glassMaterial);
        rightFrame.position.set(0.08, 0.03, 0.22);
        group.add(rightFrame);
        
        const bridgeGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.08, 6);
        const bridge = new THREE.Mesh(bridgeGeometry, glassMaterial);
        bridge.position.set(0, 0.03, 0.22);
        bridge.rotation.z = Math.PI / 2;
        group.add(bridge);
        
        return group;
    },
    
    createHat: function() {
        const group = new THREE.Group();
        const hatMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        
        const crownGeometry = new THREE.CylinderGeometry(0.22, 0.22, 0.15, 16);
        const crown = new THREE.Mesh(crownGeometry, hatMaterial);
        crown.position.y = 0.2;
        group.add(crown);
        
        const brimGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.02, 20);
        const brim = new THREE.Mesh(brimGeometry, hatMaterial);
        brim.position.y = 0.12;
        group.add(brim);
        
        return group;
    },
    
    createNecklace: function() {
        const group = new THREE.Group();
        const goldMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 100 });
        
        for (let i = 0; i < 16; i++) {
            const linkGeometry = new THREE.SphereGeometry(0.006, 6, 6);
            const link = new THREE.Mesh(linkGeometry, goldMaterial);
            const angle = (i / 16) * Math.PI * 2;
            link.position.set(
                Math.cos(angle) * 0.2,
                -0.7,
                Math.sin(angle) * 0.15
            );
            group.add(link);
        }
        
        return group;
    },
    
    createEnhancedNameLabel: function(name) {
        // Create canvas for text with better styling
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Create gradient background
        const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0.8)');
        
        // Draw rounded background
        context.fillStyle = gradient;
        this.roundRect(context, 20, 20, canvas.width - 40, canvas.height - 40, 20);
        context.fill();
        
        // Draw border
        context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        context.lineWidth = 2;
        this.roundRect(context, 20, 20, canvas.width - 40, canvas.height - 40, 20);
        context.stroke();
        
        // Draw text with shadow
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.fillText(name, canvas.width / 2 + 2, canvas.height / 2 + 12);
        
        context.fillStyle = 'white';
        context.fillText(name, canvas.width / 2, canvas.height / 2 + 10);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 0.5, 1);
        
        return sprite;
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
    
    createGlowEffect: function() {
        const glowGeometry = new THREE.SphereGeometry(1.2, 20, 20);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4CAF50,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.name = 'glow';
        return glow;
    },
    
    playEntranceAnimation: function(avatarData) {
        const group = avatarData.group;
        
        // Start small and grow
        group.scale.setScalar(0.1);
        
        let animationPhase = 0;
        const animateEntrance = () => {
            animationPhase += 0.08;
            const scale = Math.min(avatarData.scale, animationPhase);
            group.scale.setScalar(scale);
            
            // Add bounce effect
            group.position.y = Math.sin(animationPhase * 4) * 0.1;
            
            if (animationPhase < avatarData.scale) {
                requestAnimationFrame(animateEntrance);
            } else {
                group.position.y = 0;
                group.scale.setScalar(avatarData.scale);
            }
        };
        
        requestAnimationFrame(animateEntrance);
    },
    
    startBreathingAnimation: function() {
        // Enhanced breathing animation with natural arm movement
        setInterval(() => {
            this.avatars.forEach(avatar => {
                if (avatar.isBreathing && avatar.mesh) {
                    avatar.animationPhase += 0.03;
                    
                    // Torso breathing
                    const torso = avatar.mesh.getObjectByName('torso');
                    if (torso) {
                        torso.scale.y = 1 + Math.sin(avatar.animationPhase) * 0.015;
                    }
                    
                    // Natural arm sway
                    const leftUpperArm = avatar.mesh.getObjectByName('leftUpperArm');
                    const rightUpperArm = avatar.mesh.getObjectByName('rightUpperArm');
                    
                    if (leftUpperArm && rightUpperArm) {
                        leftUpperArm.rotation.x = -0.1 + Math.sin(avatar.animationPhase * 0.8) * 0.03;
                        rightUpperArm.rotation.x = -0.1 + Math.sin(avatar.animationPhase * 0.8 + Math.PI) * 0.03;
                        
                        leftUpperArm.rotation.z = 0.15 + Math.sin(avatar.animationPhase * 1.2) * 0.02;
                        rightUpperArm.rotation.z = -0.15 + Math.sin(avatar.animationPhase * 1.2 + Math.PI) * 0.02;
                    }
                    
                    // Slight hand movement
                    const leftHand = avatar.mesh.getObjectByName('leftHand');
                    const rightHand = avatar.mesh.getObjectByName('rightHand');
                    
                    if (leftHand && rightHand) {
                        leftHand.rotation.y = Math.sin(avatar.animationPhase * 1.5) * 0.05;
                        rightHand.rotation.y = Math.sin(avatar.animationPhase * 1.5 + Math.PI) * 0.05;
                    }
                }
            });
        }, 50);
    },
    
    updateAnimations: function() {
        // Update all avatar animations
        this.avatars.forEach(avatar => {
            if (avatar.glowEffect) {
                // Gentle glow pulsing
                avatar.glowEffect.material.opacity = 0.05 + Math.sin(Date.now() * 0.001) * 0.03;
            }
        });
    },
    
    customizeAvatar: function(avatarId, options) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        // Update customization options
        Object.assign(avatar.customization, options);
        
        // Remove old avatar mesh
        avatar.group.remove(avatar.mesh);
        
        // Create new avatar with updated options
        const newMesh = this.createRealisticHuman(avatar.customization);
        avatar.group.add(newMesh);
        avatar.mesh = newMesh;
        
        // Update emotion if specified
        if (options.emotion) {
            avatar.emotion = options.emotion;
        }
        
        console.log(`👤 Customized realistic avatar: ${avatarId}`, options);
        
        // Add customization effect
        this.playCustomizationEffect(avatar);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('avatar:customized', { avatar, options });
        }
    },
    
    playCustomizationEffect: function(avatar) {
        // Create sparkle effect during customization
        for (let i = 0; i < 15; i++) {
            const sparkle = new THREE.Mesh(
                new THREE.SphereGeometry(0.015, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: 0xffd700,
                    transparent: true,
                    opacity: 0.9
                })
            );
            
            sparkle.position.set(
                avatar.group.position.x + (Math.random() - 0.5) * 2,
                avatar.group.position.y + Math.random() * 2,
                avatar.group.position.z + (Math.random() - 0.5) * 2
            );
            
            if (window.SceneManager) {
                window.SceneManager.addObject(sparkle);
            }
            
            // Animate sparkle
            let sparklePhase = 0;
            const animateSparkle = () => {
                sparklePhase += 0.08;
                sparkle.position.y += 0.025;
                sparkle.material.opacity = 0.9 - sparklePhase;
                sparkle.rotation.y += 0.15;
                sparkle.scale.setScalar(1 + sparklePhase * 0.5);
                
                if (sparklePhase < 0.9) {
                    requestAnimationFrame(animateSparkle);
                } else {
                    if (window.SceneManager) {
                        window.SceneManager.removeObject(sparkle);
                    }
                }
            };
            
            setTimeout(() => {
                requestAnimationFrame(animateSparkle);
            }, i * 80);
        }
    },
    
    createDefaultAvatar: function() {
        // Check if default avatar already exists
        if (this.avatars.has('default')) {
            console.log('👤 Default realistic avatar already exists');
            return this.avatars.get('default');
        }
        
        // Create default avatar for the current user
        const defaultAvatar = this.createAvatar('default', {
            name: 'You',
            position: { x: 0, y: 0, z: 0 },
            hairStyle: 'short_1',
            hairColor: '#8B4513',
            shirtColor: '#4169E1',
            pantsColor: '#000080',
            skinTone: '#FDBCB4',
            eyeColor: '#654321',
            emotion: 'happy',
            accessory: 'none',
            bodyType: 'average'
        });
        
        console.log('👤 Created ultra-realistic default avatar successfully');
        return defaultAvatar;
    },
    
    // Animation methods for interaction system
    waveAnimation: function(avatarId, duration = 2000) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            const wavePhase = (elapsed / 200) % (Math.PI * 2);
            
            // Wave animation - right arm
            const rightUpperArm = avatar.mesh.getObjectByName('rightUpperArm');
            const rightLowerArm = avatar.mesh.getObjectByName('rightLowerArm');
            if (rightUpperArm && rightLowerArm) {
                rightUpperArm.rotation.z = -1.5 + Math.sin(wavePhase * 3) * 0.2;
                rightUpperArm.rotation.x = Math.sin(wavePhase * 4) * 0.1;
                rightLowerArm.rotation.x = Math.sin(wavePhase * 5) * 0.3;
            }
            
            // Slight head turn toward waving hand
            const head = avatar.mesh.getObjectByName('head');
            if (head) {
                head.rotation.y = Math.sin(wavePhase) * 0.05;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Reset pose after waving
                this.resetPose(avatar);
                if (head) head.rotation.y = 0;
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    danceAnimation: function(avatarId, duration = 5000) {
        const avatar = this.avatars.get(avatarId);
        if (!avatar) return;
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            const dancePhase = (elapsed / 300) % (Math.PI * 2);
            
            // Dance movements - arms
            const leftUpperArm = avatar.mesh.getObjectByName('leftUpperArm');
            const rightUpperArm = avatar.mesh.getObjectByName('rightUpperArm');
            if (leftUpperArm && rightUpperArm) {
                leftUpperArm.rotation.z = 0.15 + Math.sin(dancePhase) * 0.8;
                rightUpperArm.rotation.z = -0.15 + Math.sin(dancePhase + Math.PI) * 0.8;
                leftUpperArm.rotation.x = Math.sin(dancePhase * 1.5) * 0.3;
                rightUpperArm.rotation.x = Math.sin(dancePhase * 1.5 + Math.PI) * 0.3;
            }
            
            // Dance movements - body
            avatar.group.rotation.y = Math.sin(dancePhase * 0.5) * 0.2;
            avatar.group.rotation.z = Math.sin(dancePhase * 2) * 0.1;
            avatar.group.position.y = Math.abs(Math.sin(dancePhase * 3)) * 0.1;
            
            // Dance movements - head
            const head = avatar.mesh.getObjectByName('head');
            if (head) {
                head.rotation.y = Math.sin(dancePhase * 1.2) * 0.15;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Reset pose after dancing
                this.resetPose(avatar);
                avatar.group.position.y = 0;
                avatar.group.rotation.y = 0;
                if (head) head.rotation.y = 0;
            }
        };
        
        requestAnimationFrame(animate);
    },
    
    resetPose: function(avatar) {
        // Reset all rotations to neutral
        const parts = ['leftThigh', 'rightThigh', 'leftShin', 'rightShin', 'leftUpperArm', 'rightUpperArm'];
        parts.forEach(partName => {
            const part = avatar.mesh.getObjectByName(partName);
            if (part) {
                part.rotation.x = 0;
                part.rotation.y = 0;
                if (partName.includes('leftUpperArm')) {
                    part.rotation.z = 0.15;
                    part.rotation.x = -0.1;
                } else if (partName.includes('rightUpperArm')) {
                    part.rotation.z = -0.15;
                    part.rotation.x = -0.1;
                } else {
                    part.rotation.z = 0;
                }
            }
        });
        avatar.group.rotation.z = 0;
    },
    
    // Get random customization for variety
    getRandomCustomization: function() {
        return {
            hairStyle: this.customization.hairStyles[Math.floor(Math.random() * this.customization.hairStyles.length)],
            hairColor: this.customization.hairColors[Math.floor(Math.random() * this.customization.hairColors.length)],
            skinTone: this.customization.skinTones[Math.floor(Math.random() * this.customization.skinTones.length)],
            shirtColor: this.customization.shirtColors[Math.floor(Math.random() * this.customization.shirtColors.length)],
            pantsColor: this.customization.pantsColors[Math.floor(Math.random() * this.customization.pantsColors.length)],
            shoeColor: this.customization.shoeColors[Math.floor(Math.random() * this.customization.shoeColors.length)],
            eyeColor: this.customization.eyeColors[Math.floor(Math.random() * this.customization.eyeColors.length)],
            emotion: this.customization.emotions[Math.floor(Math.random() * this.customization.emotions.length)],
            accessory: this.customization.accessories[Math.floor(Math.random() * this.customization.accessories.length)]
        };
    },
    
    removeAvatar: function(avatarId) {
        const avatar = this.avatars.get(avatarId);
        if (avatar) {
            if (window.SceneManager && window.SceneManager.scene) {
                window.SceneManager.removeObject(avatar.group);
            }
            this.avatars.delete(avatarId);
            console.log(`👤 Removed realistic avatar: ${avatarId}`);
            
            // Emit removal event for ChatBubble system
            if (window.EventBus) {
                window.EventBus.emit('avatar:removed', {
                    userId: avatarId,
                    avatar: avatar
                });
            }
        }
    },
    
    generateId: function() {
        return Math.random().toString(36).substr(2, 9);
    },
    
    // CRITICAL: Additional ChatBubble integration methods
    
    // Get avatar world position (including any parent transforms)
    getAvatarWorldPosition: function(userId) {
        try {
            const avatar = this.avatars.get(userId);
            if (avatar?.group) {
                const worldPosition = new THREE.Vector3();
                avatar.group.getWorldPosition(worldPosition);
                return worldPosition;
            }
            return this.getAvatarPosition(userId);
        } catch (error) {
            console.warn('Error getting avatar world position:', error);
            return this.getAvatarPosition(userId);
        }
    },
    
    // Get all avatar positions at once for performance
    getAllAvatarPositions: function() {
        const positions = new Map();
        try {
            this.avatars.forEach((avatar, userId) => {
                if (avatar.group?.position) {
                    positions.set(userId, avatar.group.position.clone());
                }
            });
        } catch (error) {
            console.warn('Error getting all avatar positions:', error);
        }
        return positions;
    },
    
    // Check if avatar is visible in scene
    isAvatarVisible: function(userId) {
        try {
            const avatar = this.avatars.get(userId);
            return avatar?.group?.visible && avatar.group.parent;
        } catch (error) {
            return false;
        }
    },
    
    // Enhanced debugging methods
    debugAvatarSystem: function() {
        console.log('👤 AvatarSystem Debug Info:');
        console.log('- Total avatars:', this.avatars.size);
        console.log('- Initialized:', this.isInitialized);
        
        this.avatars.forEach((avatar, id) => {
            console.log(`- Avatar ${id}:`, {
                position: avatar.group?.position,
                visible: avatar.group?.visible,
                inScene: !!avatar.group?.parent,
                lastUpdate: new Date(avatar.lastUpdate).toLocaleTimeString()
            });
        });
        
        return {
            totalAvatars: this.avatars.size,
            isInitialized: this.isInitialized,
            avatarList: Array.from(this.avatars.keys())
        };
    }
};

console.log('👤✨ Enhanced AvatarSystem with complete ChatBubble integration loaded');