// Enhanced Room Core - Main coordination system with advanced interactions

window.RoomCore = {
    isInitialized: false,
    currentRoom: null,
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🏠 Initializing Enhanced Room Core');
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize core systems
            await this.initializeSystems();
            
            // Set up UI event handlers
            this.setupUIHandlers();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            this.isInitialized = true;
            console.log('✅ Enhanced Room Core initialized successfully');
            
        } catch (error) {
            console.error('❌ Room Core initialization failed:', error);
            this.showError('Failed to initialize 3D room. Please refresh the page.');
        }
    },
    
    initializeSystems: async function() {
        // Initialize Event Bus first
        if (window.EventBus) {
            await window.EventBus.init();
        }
        
        // Initialize Euphorie globals
        if (window.Euphorie) {
            await window.Euphorie.init();
            this.currentRoom = window.Euphorie.state.currentRoom;
        }
        
        // Initialize Scene Manager
        if (window.SceneManager) {
            const scenePreset = this.currentRoom?.scenePreset || 'modern_office';
            await window.SceneManager.init('three-container', scenePreset);
        }
        
        // Initialize Avatar System
        if (window.AvatarSystem) {
            await window.AvatarSystem.init();
        }
        
        // Initialize Interaction System
        if (window.InteractionSystem) {
            await window.InteractionSystem.init();
        }
        
        console.log('🔧 All systems initialized');
    },
    
    setupUIHandlers: function() {
        // Toggle magic button
        const magicBtn = document.getElementById('toggle-magic');
        if (magicBtn) {
            magicBtn.addEventListener('click', () => {
                this.toggleMagicEffects();
            });
        }
        
        // Change scene button
        const sceneBtn = document.getElementById('change-scene');
        if (sceneBtn) {
            sceneBtn.addEventListener('click', () => {
                this.changeScene();
            });
        }
        
        // Avatar customize button
        const avatarBtn = document.getElementById('avatar-customize');
        if (avatarBtn) {
            avatarBtn.addEventListener('click', () => {
                this.showAvatarCustomizationPanel();
            });
        }
        
        // Add interaction button
        const interactionBtn = document.getElementById('interaction-toggle');
        if (interactionBtn) {
            interactionBtn.addEventListener('click', () => {
                this.toggleInteractionMode();
            });
        }
        
        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (chatInput && sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
            
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
        
        // Set up camera controls
        this.setupCameraControls();
        
        // Add friends button
        const friendsBtn = document.getElementById('add-friends');
        if (friendsBtn) {
            friendsBtn.addEventListener('click', () => {
                this.addRandomFriends();
            });
        }
        
        console.log('🎮 Enhanced UI handlers set up');
    },
    
    setupCameraControls: function() {
        const container = document.getElementById('three-container');
        if (!container || !window.SceneManager.camera) return;
        
        let isMouseDown = false;
        let mouseX = 0;
        let mouseY = 0;
        let cameraAngle = 0;
        let cameraHeight = 5;
        
        container.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        container.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;
            
            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;
            
            cameraAngle += deltaX * 0.01;
            cameraHeight += deltaY * 0.02;
            cameraHeight = Math.max(2, Math.min(10, cameraHeight)); // Clamp height
            
            const camera = window.SceneManager.camera;
            const radius = 10;
            camera.position.x = Math.sin(cameraAngle) * radius;
            camera.position.z = Math.cos(cameraAngle) * radius;
            camera.position.y = cameraHeight;
            camera.lookAt(0, 1, 0); // Look at avatar level
            
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        container.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        // Enhanced zoom with mouse wheel
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const camera = window.SceneManager.camera;
            const zoomSpeed = 0.2;
            const minDistance = 5;
            const maxDistance = 25;
            
            const direction = camera.position.clone().normalize();
            const distance = camera.position.length();
            
            let newDistance = distance + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed);
            newDistance = Math.max(minDistance, Math.min(maxDistance, newDistance));
            
            camera.position.copy(direction.multiplyScalar(newDistance));
            camera.lookAt(0, 1, 0);
        });
    },
    
    toggleMagicEffects: function() {
        // Enhanced magic effects with interactions
        if (window.SceneManager && window.SceneManager.scene) {
            // Create magical portal effect
            const portalGeometry = new THREE.RingGeometry(1, 1.5, 16);
            const portalMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            const portal = new THREE.Mesh(portalGeometry, portalMaterial);
            portal.position.set(0, 0.1, 0);
            portal.rotation.x = -Math.PI / 2;
            
            window.SceneManager.addObject(portal);
            
            // Animate portal
            let portalPhase = 0;
            const portalInterval = setInterval(() => {
                portalPhase += 0.1;
                portal.rotation.z += 0.05;
                portal.material.opacity = 0.6 + Math.sin(portalPhase) * 0.3;
                
                if (portalPhase >= Math.PI * 4) {
                    clearInterval(portalInterval);
                    window.SceneManager.removeObject(portal);
                }
            }, 50);
            
            // Add sparkles around all avatars
            const avatars = window.AvatarSystem.getAllAvatars();
            avatars.forEach(avatar => {
                if (window.InteractionSystem) {
                    window.InteractionSystem.createParticleEffect(avatar, 'sparkle');
                }
            });
            
            // Trigger magic interaction for all avatars
            setTimeout(() => {
                avatars.forEach(avatar => {
                    if (avatar.id !== 'default') {
                        this.addMagicalGlow(avatar);
                    }
                });
            }, 1000);
        }
        
        console.log('✨ Enhanced magic effects activated!');
        this.showNotification('✨ Magical aura activated! All avatars are glowing!');
    },
    
    addMagicalGlow: function(avatar) {
        // Add a magical glow effect to avatar
        const glowGeometry = new THREE.SphereGeometry(1.2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(avatar.group.position);
        
        window.SceneManager.addObject(glow);
        
        // Animate glow
        let glowPhase = 0;
        const glowInterval = setInterval(() => {
            glowPhase += 0.05;
            glow.material.opacity = 0.2 + Math.sin(glowPhase * 2) * 0.1;
            glow.scale.setScalar(1 + Math.sin(glowPhase) * 0.1);
            
            if (glowPhase >= Math.PI * 6) {
                clearInterval(glowInterval);
                window.SceneManager.removeObject(glow);
            }
        }, 50);
    },
    
    changeScene: function() {
        const scenes = ['modern_office', 'cozy_lounge', 'outdoor_garden'];
        const currentPreset = this.currentRoom?.scenePreset || 'modern_office';
        const currentIndex = scenes.indexOf(currentPreset);
        const nextIndex = (currentIndex + 1) % scenes.length;
        const nextScene = scenes[nextIndex];
        
        if (window.SceneManager) {
            window.SceneManager.applyPreset(nextScene);
            
            // Add scene transition effect
            this.createSceneTransitionEffect();
            
            const sceneName = nextScene.replace('_', ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            this.showNotification(`🏠 Welcome to ${sceneName}!`);
        }
    },
    
    createSceneTransitionEffect: function() {
        // Create a wave effect across the scene
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        for (let i = 0; i < 20; i++) {
            const wave = new THREE.Mesh(
                new THREE.PlaneGeometry(0.5, 0.5),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.3
                })
            );
            
            wave.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 5,
                (Math.random() - 0.5) * 20
            );
            
            window.SceneManager.addObject(wave);
            
            // Animate wave
            setTimeout(() => {
                let wavePhase = 0;
                const waveInterval = setInterval(() => {
                    wavePhase += 0.1;
                    wave.position.y += 0.05;
                    wave.material.opacity = 0.3 - (wavePhase / Math.PI);
                    wave.rotation.z += 0.1;
                    
                    if (wavePhase >= Math.PI) {
                        clearInterval(waveInterval);
                        window.SceneManager.removeObject(wave);
                    }
                }, 50);
            }, i * 100);
        }
    },
    
    toggleInteractionMode: function() {
        // Toggle interaction mode (this could be used for different interaction sets)
        const isActive = document.body.classList.toggle('interaction-mode');
        
        if (isActive) {
            this.showNotification('🎯 Interaction mode activated! Click on avatars to interact.');
            // Highlight all avatars
            this.highlightInteractableAvatars();
        } else {
            this.showNotification('🎯 Interaction mode deactivated.');
            this.unhighlightAvatars();
        }
    },
    
    highlightInteractableAvatars: function() {
        const avatars = window.AvatarSystem.getAllAvatars();
        avatars.forEach(avatar => {
            if (avatar.id !== 'default') {
                // Add highlight ring
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(0.8, 1.0, 16),
                    new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        transparent: true,
                        opacity: 0.5,
                        side: THREE.DoubleSide
                    })
                );
                ring.position.copy(avatar.group.position);
                ring.position.y = 0.1;
                ring.rotation.x = -Math.PI / 2;
                ring.userData.isHighlight = true;
                ring.userData.avatarId = avatar.id;
                
                window.SceneManager.addObject(ring);
                
                // Pulse animation
                let pulsePhase = 0;
                const pulseInterval = setInterval(() => {
                    pulsePhase += 0.1;
                    ring.scale.setScalar(1 + Math.sin(pulsePhase * 2) * 0.1);
                    ring.material.opacity = 0.3 + Math.sin(pulsePhase) * 0.2;
                }, 50);
                
                ring.userData.pulseInterval = pulseInterval;
            }
        });
    },
    
    unhighlightAvatars: function() {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        const objectsToRemove = [];
        window.SceneManager.scene.traverse(child => {
            if (child.userData && child.userData.isHighlight) {
                objectsToRemove.push(child);
                if (child.userData.pulseInterval) {
                    clearInterval(child.userData.pulseInterval);
                }
            }
        });
        
        objectsToRemove.forEach(obj => {
            window.SceneManager.removeObject(obj);
        });
    },
    
    addRandomFriends: function() {
        // Add some random friends to the room
        const friendNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
        const usedNames = new Set();
        
        // Get existing avatar names to avoid duplicates
        const existingAvatars = window.AvatarSystem.getAllAvatars();
        existingAvatars.forEach(avatar => {
            usedNames.add(avatar.customization.name);
        });
        
        const availableNames = friendNames.filter(name => !usedNames.has(name));
        
        if (availableNames.length === 0) {
            this.showNotification('🎉 Room is full of friends!');
            return;
        }
        
        // Add 2-3 random friends
        const friendsToAdd = Math.min(3, availableNames.length);
        
        for (let i = 0; i < friendsToAdd; i++) {
            const name = availableNames[Math.floor(Math.random() * availableNames.length)];
            availableNames.splice(availableNames.indexOf(name), 1);
            
            const randomCustomization = window.AvatarSystem.getRandomCustomization();
            
            const friend = window.AvatarSystem.createAvatar(`friend_${Date.now()}_${i}`, {
                name: name,
                position: {
                    x: (Math.random() - 0.5) * 8,
                    y: 0,
                    z: (Math.random() - 0.5) * 8
                },
                ...randomCustomization
            });
            
            // Make friend do a random greeting
            setTimeout(() => {
                const greetings = ['wave', 'dance'];
                const greeting = greetings[Math.floor(Math.random() * greetings.length)];
                
                if (window.InteractionSystem) {
                    // Simulate friend doing an interaction
                    window.InteractionSystem.createParticleEffect(friend, 'sparkle');
                    this.showNotification(`👋 ${name} waves hello!`);
                }
            }, 1000 + i * 500);
        }
        
        this.showNotification(`🎉 ${friendsToAdd} new friends joined the room!`);
    },
    
    showAvatarCustomizationPanel: function() {
        // Remove existing panel if it exists
        const existingPanel = document.getElementById('avatar-customization-panel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }
        
        // Create avatar customization panel
        const panel = document.createElement('div');
        panel.id = 'avatar-customization-panel';
        panel.style.cssText = `
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
            min-width: 320px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 15px; text-align: center;">👤 Customize Your Avatar</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Hair Style:</label>
                <select id="hair-style" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: white;">
                    <option value="short_1">Short Hair</option>
                    <option value="long_1">Long Hair</option>
                    <option value="curly_1">Curly Hair</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Hair Color:</label>
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px;">
                    ${window.AvatarSystem.customization.hairColors.map(color => 
                        `<div style="width: 35px; height: 35px; background: ${color}; border: 2px solid rgba(255,255,255,0.3); border-radius: 6px; cursor: pointer; transition: transform 0.2s;" data-hair-color="${color}" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></div>`
                    ).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Skin Tone:</label>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px;">
                    ${window.AvatarSystem.customization.skinTones.map(color => 
                        `<div style="width: 35px; height: 35px; background: ${color}; border: 2px solid rgba(255,255,255,0.3); border-radius: 6px; cursor: pointer; transition: transform 0.2s;" data-skin-tone="${color}" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></div>`
                    ).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Shirt Color:</label>
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px;">
                    ${window.AvatarSystem.customization.shirtColors.map(color => 
                        `<div style="width: 35px; height: 35px; background: ${color}; border: 2px solid rgba(255,255,255,0.3); border-radius: 6px; cursor: pointer; transition: transform 0.2s;" data-shirt-color="${color}" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></div>`
                    ).join('')}
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: bold;">Pants Color:</label>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px;">
                    ${window.AvatarSystem.customization.pantsColors.map(color => 
                        `<div style="width: 35px; height: 35px; background: ${color}; border: 2px solid rgba(255,255,255,0.3); border-radius: 6px; cursor: pointer; transition: transform 0.2s;" data-pants-color="${color}" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></div>`
                    ).join('')}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <button id="randomize-avatar" style="padding: 12px; background: #FF6B35; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">🎲 Random</button>
                <button id="dance-preview" style="padding: 12px; background: #9C27B0; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">💃 Dance</button>
                <button id="wave-preview" style="padding: 12px; background: #2196F3; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">👋 Wave</button>
            </div>
            
            <button id="close-customization" style="width: 100%; padding: 12px; background: #666; border: none; border-radius: 6px; color: white; cursor: pointer;">Close</button>
        `;
        
        document.body.appendChild(panel);
        
        // Add event listeners for customization
        this.setupCustomizationListeners(panel);
        
        this.showNotification('👤 Avatar customization panel opened!');
    },
    
    setupCustomizationListeners: function(panel) {
        // Hair style dropdown
        const hairStyleSelect = panel.querySelector('#hair-style');
        hairStyleSelect.addEventListener('change', (e) => {
            this.updateAvatar({ hairStyle: e.target.value });
        });
        
        // Color pickers
        panel.querySelectorAll('[data-hair-color]').forEach(colorDiv => {
            colorDiv.addEventListener('click', (e) => {
                this.updateAvatar({ hairColor: e.target.dataset.hairColor });
                this.highlightSelectedColor(e.target, '[data-hair-color]');
            });
        });
        
        panel.querySelectorAll('[data-skin-tone]').forEach(colorDiv => {
            colorDiv.addEventListener('click', (e) => {
                this.updateAvatar({ skinTone: e.target.dataset.skinTone });
                this.highlightSelectedColor(e.target, '[data-skin-tone]');
            });
        });
        
        panel.querySelectorAll('[data-shirt-color]').forEach(colorDiv => {
            colorDiv.addEventListener('click', (e) => {
                this.updateAvatar({ shirtColor: e.target.dataset.shirtColor });
                this.highlightSelectedColor(e.target, '[data-shirt-color]');
            });
        });
        
        panel.querySelectorAll('[data-pants-color]').forEach(colorDiv => {
            colorDiv.addEventListener('click', (e) => {
                this.updateAvatar({ pantsColor: e.target.dataset.pantsColor });
                this.highlightSelectedColor(e.target, '[data-pants-color]');
            });
        });
        
        // Action buttons
        panel.querySelector('#randomize-avatar').addEventListener('click', () => {
            const randomOptions = window.AvatarSystem.getRandomCustomization();
            this.updateAvatar(randomOptions);
            this.showNotification('🎲 Avatar randomized!');
        });
        
        panel.querySelector('#dance-preview').addEventListener('click', () => {
            if (window.InteractionSystem) {
                window.InteractionSystem.triggerInteraction('dance');
            }
        });
        
        panel.querySelector('#wave-preview').addEventListener('click', () => {
            if (window.InteractionSystem) {
                window.InteractionSystem.triggerInteraction('wave');
            }
        });
        
        // Close button
        panel.querySelector('#close-customization').addEventListener('click', () => {
            panel.remove();
        });
    },
    
    highlightSelectedColor: function(selectedElement, selector) {
        // Remove previous selection
        document.querySelectorAll(selector).forEach(el => {
            el.style.borderColor = 'rgba(255,255,255,0.3)';
            el.style.boxShadow = 'none';
        });
        
        // Highlight selected
        selectedElement.style.borderColor = '#00ff00';
        selectedElement.style.boxShadow = '0 0 10px rgba(0,255,0,0.5)';
    },
    
    updateAvatar: function(options) {
        if (window.AvatarSystem) {
            window.AvatarSystem.customizeAvatar('default', options);
            console.log('👤 Avatar updated:', options);
        }
    },
    
    sendChatMessage: function() {
        const chatInput = document.getElementById('chat-input');
        const chatMessages = document.getElementById('chat-messages');
        
        if (!chatInput || !chatMessages) return;
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add message to chat
        const messageElement = document.createElement('div');
        messageElement.style.cssText = 'margin: 5px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 6px; border-left: 3px solid #4CAF50;';
        messageElement.innerHTML = `<strong>You:</strong> ${message}`;
        chatMessages.appendChild(messageElement);
        
        // Clear input
        chatInput.value = '';
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Show typing animation on avatar
        const myAvatar = window.AvatarSystem.getAvatar('default');
        if (myAvatar && window.InteractionSystem) {
            window.InteractionSystem.createParticleEffect(myAvatar, 'sparkle');
        }
        
        console.log('💬 Chat message sent:', message);
    },
    
    hideLoadingScreen: function() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    },
    
    showNotification: function(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(40,40,40,0.9));
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            max-width: 300px;
            border-left: 4px solid #4CAF50;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    },
    
    showError: function(message) {
        const container = document.getElementById('three-container');
        if (container) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; background: rgba(0,0,0,0.8);">
                    <div style="padding: 40px; border-radius: 12px; background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3);">
                        <h3 style="color: #ff6b6b; margin-bottom: 20px;">🚨 Error</h3>
                        <p style="margin-bottom: 20px; line-height: 1.5;">${message}</p>
                        <button onclick="location.reload()" style="padding: 12px 24px; background: #ff6b6b; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold;">Reload Page</button>
                    </div>
                </div>
            `;
        }
    }
};

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.RoomCore.init();
    });
} else {
    window.RoomCore.init();
}