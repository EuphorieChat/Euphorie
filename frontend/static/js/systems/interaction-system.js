// Avatar Interaction System - Gestures and social interactions

window.InteractionSystem = {
    isInitialized: false,
    activeInteractions: new Map(),
    interactionCooldowns: new Map(),
    
    // Interaction types and their configurations
    interactions: {
        wave: {
            name: 'Wave',
            icon: '👋',
            duration: 2000,
            cooldown: 1000,
            requiresTarget: false,
            animation: 'wave',
            particles: 'sparkle'
        },
        highfive: {
            name: 'High Five',
            icon: '🙏',
            duration: 3000,
            cooldown: 2000,
            requiresTarget: true,
            animation: 'highfive',
            particles: 'celebration'
        },
        handshake: {
            name: 'Handshake',
            icon: '🤝',
            duration: 3000,
            cooldown: 2000,
            requiresTarget: true,
            animation: 'handshake',
            particles: 'connection'
        },
        hug: {
            name: 'Hug',
            icon: '🤗',
            duration: 4000,
            cooldown: 3000,
            requiresTarget: true,
            animation: 'hug',
            particles: 'hearts',
            requiresConsent: true
        },
        dance: {
            name: 'Dance',
            icon: '💃',
            duration: 5000,
            cooldown: 1000,
            requiresTarget: false,
            animation: 'dance',
            particles: 'music'
        }
    },
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🤝 Initializing Interaction System');
        
        this.isInitialized = true;
        
        // Set up click handlers for avatar interactions
        this.setupAvatarClickHandlers();
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Listen for animation events
        if (window.EventBus) {
            window.EventBus.on('animation:complete', (data) => {
                this.onAnimationComplete(data);
            });
        }
        
        console.log('✅ Interaction System initialized');
    },
    
    setupAvatarClickHandlers: function() {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        const container = document.getElementById('three-container');
        if (!container) return;
        
        container.addEventListener('click', (event) => {
            // Don't trigger on UI elements
            if (event.target !== container.children[0]) return;
            
            // Calculate mouse position in normalized device coordinates
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Cast a ray from camera through mouse position
            raycaster.setFromCamera(mouse, window.SceneManager.camera);
            
            // Check for avatar intersections
            const avatars = window.AvatarSystem.getAllAvatars();
            const avatarMeshes = [];
            
            avatars.forEach(avatar => {
                if (avatar.id !== 'default') { // Don't interact with self
                    avatar.group.children.forEach(child => {
                        if (child.type === 'Mesh' || child.type === 'Group') {
                            avatarMeshes.push({ mesh: child, avatar: avatar });
                        }
                    });
                }
            });
            
            const intersects = raycaster.intersectObjects(avatarMeshes.map(item => item.mesh), true);
            
            if (intersects.length > 0) {
                // Find which avatar was clicked
                const clickedObject = intersects[0].object;
                let avatarData = null;
                
                // Find the avatar this mesh belongs to
                avatarMeshes.forEach(item => {
                    if (item.mesh === clickedObject || item.mesh.children.includes(clickedObject)) {
                        avatarData = item.avatar;
                    }
                });
                
                if (avatarData) {
                    this.showInteractionMenu(avatarData);
                }
            }
        });
    },
    
    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (event) => {
            // Only trigger if no input is focused
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(event.key.toLowerCase()) {
                case '1':
                    this.triggerInteraction('wave');
                    break;
                case '2':
                    this.triggerInteraction('dance');
                    break;
                case 'w':
                    if (event.ctrlKey || event.metaKey) return; // Prevent browser shortcuts
                    this.triggerInteraction('wave');
                    break;
                case 'd':
                    if (event.ctrlKey || event.metaKey) return;
                    this.triggerInteraction('dance');
                    break;
            }
        });
    },
    
    showInteractionMenu: function(targetAvatar) {
        // Remove existing menu
        const existingMenu = document.getElementById('interaction-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Create interaction menu
        const menu = document.createElement('div');
        menu.id = 'interaction-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            z-index: 1000;
            color: white;
            min-width: 250px;
            text-align: center;
        `;
        
        menu.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 15px;">Interact with ${targetAvatar.customization.name}</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                ${Object.entries(this.interactions).map(([key, interaction]) => `
                    <button 
                        onclick="window.InteractionSystem.triggerInteraction('${key}', '${targetAvatar.id}')"
                        style="
                            padding: 12px;
                            background: rgba(255, 255, 255, 0.1);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                            color: white;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s ease;
                        "
                        onmouseover="this.style.background='rgba(255,255,255,0.2)'"
                        onmouseout="this.style.background='rgba(255,255,255,0.1)'"
                    >
                        ${interaction.icon} ${interaction.name}
                    </button>
                `).join('')}
            </div>
            <button 
                onclick="document.getElementById('interaction-menu').remove()"
                style="
                    padding: 8px 16px;
                    background: #666;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                "
            >
                Cancel
            </button>
        `;
        
        document.body.appendChild(menu);
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (document.getElementById('interaction-menu')) {
                menu.remove();
            }
        }, 10000);
    },
    
    triggerInteraction: function(interactionType, targetAvatarId = null) {
        const interaction = this.interactions[interactionType];
        if (!interaction) {
            console.error('Unknown interaction type:', interactionType);
            return;
        }
        
        // Check cooldown
        const cooldownKey = `default-${interactionType}`;
        if (this.interactionCooldowns.has(cooldownKey)) {
            const timeLeft = this.interactionCooldowns.get(cooldownKey) - Date.now();
            if (timeLeft > 0) {
                this.showNotification(`⏰ Wait ${Math.ceil(timeLeft / 1000)}s before ${interaction.name} again`);
                return;
            }
        }
        
        // Check if target is required
        if (interaction.requiresTarget && !targetAvatarId) {
            this.showNotification(`🎯 Click on another avatar to ${interaction.name}`);
            return;
        }
        
        // Get avatars
        const myAvatar = window.AvatarSystem.getAvatar('default');
        const targetAvatar = targetAvatarId ? window.AvatarSystem.getAvatar(targetAvatarId) : null;
        
        if (!myAvatar) {
            console.error('Could not find user avatar');
            return;
        }
        
        if (interaction.requiresTarget && !targetAvatar) {
            console.error('Could not find target avatar');
            return;
        }
        
        // Handle consent for intimate interactions
        if (interaction.requiresConsent && targetAvatar) {
            this.requestConsent(interaction, myAvatar, targetAvatar);
            return;
        }
        
        // Close interaction menu
        const menu = document.getElementById('interaction-menu');
        if (menu) menu.remove();
        
        // Execute interaction
        this.executeInteraction(interaction, myAvatar, targetAvatar);
    },
    
    requestConsent: function(interaction, myAvatar, targetAvatar) {
        // In a real app, this would send a request to the other user
        // For demo, we'll auto-accept after a short delay
        this.showNotification(`💭 Asking ${targetAvatar.customization.name} for ${interaction.name}...`);
        
        setTimeout(() => {
            // Simulate consent response (for demo)
            const accepted = Math.random() > 0.3; // 70% acceptance rate
            
            if (accepted) {
                this.showNotification(`✅ ${targetAvatar.customization.name} accepted your ${interaction.name}!`);
                this.executeInteraction(interaction, myAvatar, targetAvatar);
            } else {
                this.showNotification(`❌ ${targetAvatar.customization.name} declined your ${interaction.name}`);
            }
        }, 2000);
    },
    
    executeInteraction: function(interaction, myAvatar, targetAvatar = null) {
        // Set cooldown
        const cooldownKey = `${myAvatar.id}-${interaction.name.toLowerCase()}`;
        this.interactionCooldowns.set(cooldownKey, Date.now() + interaction.cooldown);
        
        // Start animation
        this.startAnimation(myAvatar, interaction);
        
        if (targetAvatar) {
            this.startAnimation(targetAvatar, interaction);
            
            // Move avatars closer for interactions
            this.moveAvatarsForInteraction(myAvatar, targetAvatar);
        }
        
        // Create particle effects
        this.createParticleEffect(myAvatar, interaction.particles);
        
        // Show notification
        const targetName = targetAvatar ? ` with ${targetAvatar.customization.name}` : '';
        this.showNotification(`${interaction.icon} ${myAvatar.customization.name} ${interaction.name.toLowerCase()}s${targetName}!`);
        
        // Schedule interaction completion
        setTimeout(() => {
            this.completeInteraction(myAvatar, targetAvatar, interaction);
        }, interaction.duration);
        
        // Store active interaction
        this.activeInteractions.set(myAvatar.id, {
            type: interaction.name.toLowerCase(),
            target: targetAvatar?.id,
            startTime: Date.now(),
            duration: interaction.duration
        });
        
        console.log(`🤝 ${interaction.name} interaction started`, {
            user: myAvatar.id,
            target: targetAvatar?.id,
            duration: interaction.duration
        });
    },
    
    startAnimation: function(avatar, interaction) {
        // Store original position for restoration
        if (!avatar.originalPosition) {
            avatar.originalPosition = avatar.group.position.clone();
        }
        
        // Apply animation based on type
        switch(interaction.animation) {
            case 'wave':
                this.animateWave(avatar);
                break;
            case 'dance':
                this.animateDance(avatar);
                break;
            case 'highfive':
            case 'handshake':
            case 'hug':
                this.animateApproach(avatar);
                break;
        }
        
        // Update avatar state
        avatar.animation = interaction.animation;
        avatar.lastUpdate = Date.now();
    },
    
    animateWave: function(avatar) {
        // Find the right arm in the avatar
        let rightArm = null;
        avatar.mesh.children.forEach(child => {
            if (child.position.x > 0.3) { // Right side
                rightArm = child;
            }
        });
        
        if (rightArm) {
            // Create wave animation
            const originalRotation = rightArm.rotation.clone();
            let wavePhase = 0;
            
            const waveInterval = setInterval(() => {
                wavePhase += 0.3;
                rightArm.rotation.z = originalRotation.z + Math.sin(wavePhase) * 0.5;
                rightArm.rotation.x = originalRotation.x + Math.cos(wavePhase * 0.5) * 0.3;
                
                if (wavePhase >= Math.PI * 4) { // 2 full waves
                    clearInterval(waveInterval);
                    rightArm.rotation.copy(originalRotation);
                }
            }, 50);
        }
    },
    
    animateDance: function(avatar) {
        // Create a fun dance animation
        const originalPosition = avatar.group.position.clone();
        const originalRotation = avatar.group.rotation.clone();
        let dancePhase = 0;
        
        const danceInterval = setInterval(() => {
            dancePhase += 0.2;
            
            // Bounce up and down
            avatar.group.position.y = originalPosition.y + Math.sin(dancePhase * 2) * 0.2;
            
            // Rotate side to side
            avatar.group.rotation.y = originalRotation.y + Math.sin(dancePhase) * 0.3;
            
            // Move arms (if they exist)
            avatar.mesh.children.forEach(child => {
                if (Math.abs(child.position.x) > 0.3) { // Arms
                    child.rotation.z = Math.sin(dancePhase + (child.position.x > 0 ? 0 : Math.PI)) * 0.4;
                }
            });
            
            if (dancePhase >= Math.PI * 8) { // End dance
                clearInterval(danceInterval);
                avatar.group.position.copy(originalPosition);
                avatar.group.rotation.copy(originalRotation);
                
                // Reset arm rotations
                avatar.mesh.children.forEach(child => {
                    if (Math.abs(child.position.x) > 0.3) {
                        child.rotation.z = 0;
                    }
                });
            }
        }, 50);
    },
    
    animateApproach: function(avatar) {
        // Simple approach animation - slightly move forward
        const originalPosition = avatar.group.position.clone();
        let approachPhase = 0;
        
        const approachInterval = setInterval(() => {
            approachPhase += 0.1;
            avatar.group.position.z = originalPosition.z + Math.sin(approachPhase) * 0.3;
            
            if (approachPhase >= Math.PI) {
                clearInterval(approachInterval);
                avatar.group.position.copy(originalPosition);
            }
        }, 50);
    },
    
    moveAvatarsForInteraction: function(avatar1, avatar2) {
        // Calculate midpoint between avatars
        const pos1 = avatar1.group.position;
        const pos2 = avatar2.group.position;
        const midpoint = new THREE.Vector3(
            (pos1.x + pos2.x) / 2,
            (pos1.y + pos2.y) / 2,
            (pos1.z + pos2.z) / 2
        );
        
        // Move avatars slightly toward each other
        const moveDistance = 0.5;
        const direction1 = pos2.clone().sub(pos1).normalize().multiplyScalar(moveDistance);
        const direction2 = pos1.clone().sub(pos2).normalize().multiplyScalar(moveDistance);
        
        // Animate movement
        let movePhase = 0;
        const moveInterval = setInterval(() => {
            movePhase += 0.1;
            const progress = Math.sin(movePhase) * 0.5;
            
            avatar1.group.position.add(direction1.clone().multiplyScalar(progress * 0.1));
            avatar2.group.position.add(direction2.clone().multiplyScalar(progress * 0.1));
            
            if (movePhase >= Math.PI) {
                clearInterval(moveInterval);
            }
        }, 50);
    },
    
    createParticleEffect: function(avatar, effectType) {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        const position = avatar.group.position.clone();
        position.y += 2; // Above avatar head
        
        switch(effectType) {
            case 'sparkle':
                this.createSparkleEffect(position);
                break;
            case 'hearts':
                this.createHeartEffect(position);
                break;
            case 'celebration':
                this.createCelebrationEffect(position);
                break;
            case 'connection':
                this.createConnectionEffect(position);
                break;
            case 'music':
                this.createMusicEffect(position);
                break;
        }
    },
    
    createSparkleEffect: function(position) {
        for (let i = 0; i < 8; i++) {
            const sparkle = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 6, 6),
                new THREE.MeshBasicMaterial({ 
                    color: 0xffff00,
                    transparent: true,
                    opacity: 0.8 
                })
            );
            
            sparkle.position.copy(position);
            sparkle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ));
            
            window.SceneManager.addObject(sparkle);
            
            // Animate sparkle
            let sparklePhase = 0;
            const sparkleInterval = setInterval(() => {
                sparklePhase += 0.1;
                sparkle.position.y += 0.05;
                sparkle.material.opacity = 0.8 - (sparklePhase / Math.PI);
                sparkle.rotation.y += 0.2;
                
                if (sparklePhase >= Math.PI) {
                    clearInterval(sparkleInterval);
                    window.SceneManager.removeObject(sparkle);
                }
            }, 50);
        }
    },
    
    createHeartEffect: function(position) {
        for (let i = 0; i < 5; i++) {
            const heart = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshBasicMaterial({ 
                    color: 0xff69b4,
                    transparent: true,
                    opacity: 0.9 
                })
            );
            
            heart.position.copy(position);
            heart.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 0.5,
                (Math.random() - 0.5) * 1.5
            ));
            
            window.SceneManager.addObject(heart);
            
            // Float upward animation
            let heartPhase = 0;
            const heartInterval = setInterval(() => {
                heartPhase += 0.08;
                heart.position.y += 0.03;
                heart.material.opacity = 0.9 - (heartPhase / (Math.PI * 1.5));
                heart.scale.setScalar(1 + Math.sin(heartPhase * 2) * 0.2);
                
                if (heartPhase >= Math.PI * 1.5) {
                    clearInterval(heartInterval);
                    window.SceneManager.removeObject(heart);
                }
            }, 50);
        }
    },
    
    createCelebrationEffect: function(position) {
        for (let i = 0; i < 12; i++) {
            const particle = new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 0.03, 0.03),
                new THREE.MeshBasicMaterial({ 
                    color: Math.random() * 0xffffff,
                    transparent: true,
                    opacity: 0.9 
                })
            );
            
            particle.position.copy(position);
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 4,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 4
            );
            
            window.SceneManager.addObject(particle);
            
            // Celebration burst animation
            let celebrationPhase = 0;
            const celebrationInterval = setInterval(() => {
                celebrationPhase += 0.05;
                particle.position.add(velocity.clone().multiplyScalar(0.05));
                velocity.y -= 0.02; // Gravity
                particle.rotation.x += 0.1;
                particle.rotation.y += 0.1;
                particle.material.opacity = 0.9 - (celebrationPhase / 2);
                
                if (celebrationPhase >= 2 || particle.position.y < 0) {
                    clearInterval(celebrationInterval);
                    window.SceneManager.removeObject(particle);
                }
            }, 50);
        }
    },
    
    createConnectionEffect: function(position) {
        // Create connection rings
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.5 + i * 0.3, 0.6 + i * 0.3, 16),
                new THREE.MeshBasicMaterial({ 
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                })
            );
            
            ring.position.copy(position);
            ring.rotation.x = Math.PI / 2;
            
            window.SceneManager.addObject(ring);
            
            // Expanding ring animation
            setTimeout(() => {
                let ringPhase = 0;
                const ringInterval = setInterval(() => {
                    ringPhase += 0.1;
                    ring.scale.setScalar(1 + ringPhase);
                    ring.material.opacity = 0.6 - (ringPhase / 2);
                    
                    if (ringPhase >= 2) {
                        clearInterval(ringInterval);
                        window.SceneManager.removeObject(ring);
                    }
                }, 50);
            }, i * 300);
        }
    },
    
    createMusicEffect: function(position) {
        const notes = ['♪', '♫', '♬', '♭', '♮'];
        
        for (let i = 0; i < 6; i++) {
            // Create text sprite for music notes
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;
            
            context.fillStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
            context.font = '32px Arial';
            context.textAlign = 'center';
            context.fillText(notes[Math.floor(Math.random() * notes.length)], 32, 45);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                opacity: 0.8
            });
            const note = new THREE.Sprite(material);
            note.scale.set(0.5, 0.5, 1);
            
            note.position.copy(position);
            note.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 0.5,
                (Math.random() - 0.5) * 2
            ));
            
            window.SceneManager.addObject(note);
            
            // Floating music note animation
            let notePhase = 0;
            const noteInterval = setInterval(() => {
                notePhase += 0.05;
                note.position.y += 0.02;
                note.position.x += Math.sin(notePhase * 2) * 0.01;
                note.material.opacity = 0.8 - (notePhase / 3);
                
                if (notePhase >= 3) {
                    clearInterval(noteInterval);
                    window.SceneManager.removeObject(note);
                }
            }, 50);
        }
    },
    
    completeInteraction: function(myAvatar, targetAvatar, interaction) {
        // Remove from active interactions
        this.activeInteractions.delete(myAvatar.id);
        
        // Reset avatar animations
        myAvatar.animation = 'idle';
        
        if (targetAvatar) {
            targetAvatar.animation = 'idle';
        }
        
        // Restore original positions if stored
        if (myAvatar.originalPosition) {
            myAvatar.group.position.copy(myAvatar.originalPosition);
        }
        
        if (targetAvatar && targetAvatar.originalPosition) {
            targetAvatar.group.position.copy(targetAvatar.originalPosition);
        }
        
        console.log(`✅ ${interaction.name} interaction completed`);
        
        // Emit event for other systems
        if (window.EventBus) {
            window.EventBus.emit('interaction:complete', {
                type: interaction.name.toLowerCase(),
                participants: [myAvatar.id, targetAvatar?.id].filter(Boolean)
            });
        }
    },
    
    onAnimationComplete: function(data) {
        // Handle animation completion events
        console.log('Animation completed:', data);
    },
    
    showNotification: function(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            border-left: 4px solid #4CAF50;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },
    
    // Public API methods
    getActiveInteractions: function() {
        return Array.from(this.activeInteractions.entries());
    },
    
    isAvatarInteracting: function(avatarId) {
        return this.activeInteractions.has(avatarId);
    },
    
    getInteractionTypes: function() {
        return Object.keys(this.interactions);
    }
};

// CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slideOutRight {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(20px); }
    }
`;
document.head.appendChild(style);