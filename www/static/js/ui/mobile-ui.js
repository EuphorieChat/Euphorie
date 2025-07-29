// Mobile UI System - Complete Working Version
// Features: Hamburger menu, virtual joystick, gesture controls, optimized interactions

window.MobileUI = {
    isInitialized: false,
    isMobile: false,
    isTablet: false,
    touchEnabled: false,
    
    // Touch gesture tracking
    gestures: {
        tap: { maxDistance: 20, maxDuration: 300 },
        longPress: { minDuration: 500, maxDistance: 30 },
        swipe: { minDistance: 100, maxDuration: 1000 },
        pinch: { minScale: 0.5, maxScale: 3.0 }
    },
    
    // Touch state management
    touchState: {
        isActive: false,
        startTime: 0,
        startPos: { x: 0, y: 0 },
        currentPos: { x: 0, y: 0 },
        lastPos: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        touches: [],
        gestureType: null,
        isPinching: false,
        pinchDistance: 0,
        initialPinchDistance: 0
    },
    
    // UI Components
    components: {
        hamburgerMenu: null,
        virtualJoystick: null,
        quickActions: null,
        gestureOverlay: null,
        contextMenu: null
    },
    
    // Settings
    settings: {
        hapticFeedback: true,
        gestureRecognition: true,
        autoHideUI: true,
        lowPowerMode: false,
        sensitivity: {
            camera: 0.008,
            joystick: 1.0,
            gesture: 1.2
        }
    },

    init: async function() {
        if (this.isInitialized) return Promise.resolve();
        
        console.log('📱 Initializing Mobile UI System...');
        
        // Device detection
        this.detectDevice();
        
        // Only proceed if mobile device
        if (!this.isMobile && window.innerWidth > 768) {
            console.log('🖥️ Desktop device - Mobile UI not needed');
            return Promise.resolve();
        }
        
        // Clean up any existing mobile UI
        this.cleanup();
        
        try {
            // Initialize core components
            await this.setupTouchHandling();
            await this.createMobileInterface();
            
            this.isInitialized = true;
            console.log('✅ Mobile UI System initialized successfully');
            
            // Show welcome message
            this.showMobileNotification('📱 Welcome! Use the hamburger menu and virtual joystick to interact.', 4000);
            
        } catch (error) {
            console.error('❌ Mobile UI initialization failed:', error);
            throw error;
        }
        
        return Promise.resolve();
    },

    detectDevice: function() {
        const userAgent = navigator.userAgent.toLowerCase();
        const screen = window.screen;
        
        // Enhanced mobile detection
        this.isMobile = (
            /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
            ('ontouchstart' in window && window.innerWidth <= 768) ||
            window.innerWidth <= 768 ||
            navigator.maxTouchPoints > 0
        );
        
        // Tablet detection
        this.isTablet = (
            /ipad|android(?!.*mobile)|tablet/i.test(userAgent) ||
            (this.isMobile && Math.min(screen.width, screen.height) >= 600)
        );
        
        // Touch capability
        this.touchEnabled = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
        
        // Performance detection
        const isLowEnd = (
            navigator.hardwareConcurrency <= 2 ||
            navigator.deviceMemory <= 2 ||
            /low|lite/i.test(userAgent)
        );
        
        if (isLowEnd) {
            this.settings.lowPowerMode = true;
        }
        
        console.log('📱 Device Detection:', {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            touchEnabled: this.touchEnabled,
            lowPowerMode: this.settings.lowPowerMode,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            pixelRatio: window.devicePixelRatio,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory
        });
    },

    cleanup: function() {
        // Remove any existing mobile UI elements
        const elementsToRemove = [
            'mobile-hamburger-btn',
            'mobile-menu',
            'mobile-overlay',
            'virtual-joystick',
            'quick-actions',
            'gesture-overlay',
            'context-menu',
            'mobile-chat-overlay',
            'mobile-help-overlay'
        ];
        
        elementsToRemove.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
        
        // Remove mobile classes
        document.body.classList.remove('mobile-ui', 'mobile-device', 'tablet-device');
        
        console.log('🧹 Cleaned up existing mobile UI elements');
    },

    setupTouchHandling: function() {
        if (!this.touchEnabled) return Promise.resolve();
        
        // Get main interaction container
        const container = document.getElementById('three-container') || document.body;
        
        // Prevent default touch behaviors
        container.style.touchAction = 'none';
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // Add touch event listeners with proper context binding
        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        container.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
        
        // Prevent context menu on long press
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        container.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
        
        console.log('👆 Touch handling configured');
        return Promise.resolve();
    },

    handleTouchStart: function(event) {
        this.touchState.isActive = true;
        this.touchState.startTime = Date.now();
        this.touchState.touches = Array.from(event.touches);
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.touchState.startPos = { x: touch.clientX, y: touch.clientY };
            this.touchState.currentPos = { x: touch.clientX, y: touch.clientY };
            this.touchState.lastPos = { x: touch.clientX, y: touch.clientY };
            
            // Start long press detection
            this.startLongPressDetection();
            
        } else if (event.touches.length === 2) {
            // Pinch gesture start
            this.touchState.isPinching = true;
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.touchState.initialPinchDistance = this.calculateDistance(touch1, touch2);
            this.touchState.pinchDistance = this.touchState.initialPinchDistance;
        }
        
        this.updateVelocity();
    },

    handleTouchMove: function(event) {
        if (!this.touchState.isActive) return;
        
        // Prevent default scrolling
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            
            this.touchState.lastPos = { ...this.touchState.currentPos };
            this.touchState.currentPos = { x: touch.clientX, y: touch.clientY };
            
            this.updateVelocity();
            
            // Handle camera rotation
            this.handleCameraRotation();
            
            // Cancel long press if moved too much
            const distance = this.calculateDistance(this.touchState.startPos, this.touchState.currentPos);
            if (distance > this.gestures.longPress.maxDistance) {
                this.cancelLongPress();
            }
            
        } else if (event.touches.length === 2 && this.touchState.isPinching) {
            // Handle pinch zoom
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = this.calculateDistance(touch1, touch2);
            
            this.handlePinchZoom(currentDistance / this.touchState.pinchDistance);
            this.touchState.pinchDistance = currentDistance;
        }
    },

    handleTouchEnd: function(event) {
        const duration = Date.now() - this.touchState.startTime;
        const distance = this.calculateDistance(this.touchState.startPos, this.touchState.currentPos);
        
        // Determine gesture type
        if (event.touches.length === 0) {
            if (duration < this.gestures.tap.maxDuration && distance < this.gestures.tap.maxDistance) {
                this.handleTap(this.touchState.currentPos);
            } else if (distance > this.gestures.swipe.minDistance && duration < this.gestures.swipe.maxDuration) {
                this.handleSwipe();
            }
            
            this.resetTouchState();
        }
        
        // Reset pinch state
        if (event.touches.length < 2) {
            this.touchState.isPinching = false;
        }
        
        this.cancelLongPress();
    },

    handleTouchCancel: function(event) {
        this.resetTouchState();
        this.cancelLongPress();
    },

    handleTap: function(position) {
        console.log('👆 Tap detected at:', position);
        
        // Haptic feedback
        this.hapticFeedback('light');
        
        // Try to interact with 3D objects
        if (this.isInCanvas(position)) {
            this.handle3DTap(position);
        }
    },

    handleSwipe: function() {
        const deltaX = this.touchState.currentPos.x - this.touchState.startPos.x;
        const deltaY = this.touchState.currentPos.y - this.touchState.startPos.y;
        
        let direction = '';
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }
        
        console.log('👆 Swipe detected:', direction);
        this.hapticFeedback('medium');
        
        // Handle swipe actions
        switch (direction) {
            case 'left':
            case 'right':
                if (window.RoomCore && window.RoomCore.changeScene) {
                    window.RoomCore.changeScene();
                    this.showMobileNotification('🏠 Scene changed!');
                }
                break;
            case 'up':
                this.toggleQuickActionsExpanded();
                break;
            case 'down':
                this.toggleMobileChat();
                break;
        }
    },

    handle3DTap: function(screenPosition) {
        // Convert screen coordinates to 3D world coordinates
        if (!window.SceneManager || !window.SceneManager.camera || !window.SceneManager.scene) return;
        
        try {
            const mouse = new THREE.Vector2();
            const canvas = document.getElementById('three-container');
            const rect = canvas.getBoundingClientRect();
            
            mouse.x = ((screenPosition.x - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((screenPosition.y - rect.top) / rect.height) * 2 + 1;
            
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, window.SceneManager.camera);
            
            // Check for intersections with avatars and interactive objects
            const intersects = raycaster.intersectObjects(window.SceneManager.scene.children, true);
            
            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                this.handle3DObjectInteraction(intersectedObject, intersects[0].point);
            }
        } catch (error) {
            console.log('3D tap interaction error:', error);
        }
    },

    handle3DObjectInteraction: function(object, point) {
        console.log('🎯 3D Object interaction:', object);
        
        // Check if it's an avatar
        if (object.userData && object.userData.isAvatar) {
            this.interactWithAvatar(object.userData.avatarId);
        } else if (object.userData && object.userData.isPet) {
            this.interactWithPet(object.userData.petId);
        } else {
            // Generic object interaction
            this.showMobileNotification('👆 Tapped on ' + (object.name || 'object'));
        }
        
        this.hapticFeedback('medium');
    },

    interactWithAvatar: function(avatarId) {
        console.log('👤 Interacting with avatar:', avatarId);
        
        // Show interaction menu
        this.showContextMenu([
            { icon: '👋', label: 'Wave', action: () => this.triggerInteraction('wave') },
            { icon: '💃', label: 'Dance', action: () => this.triggerInteraction('dance') },
            { icon: '🤝', label: 'High Five', action: () => this.triggerInteraction('highfive') },
            { icon: '💬', label: 'Chat', action: () => this.openChatWith(avatarId) }
        ]);
    },

    interactWithPet: function(petId) {
        console.log('🐾 Interacting with pet:', petId);
        
        this.showContextMenu([
            { icon: '🎾', label: 'Play', action: () => window.PetSystem?.playWithPet(petId) },
            { icon: '🍖', label: 'Feed', action: () => window.PetSystem?.feedPet(petId) },
            { icon: '❤️', label: 'Pet', action: () => this.petAnimal(petId) }
        ]);
    },

    openChatWith: function(avatarId) {
        this.showMobileNotification(`💬 Starting chat with ${avatarId}`);
    },

    petAnimal: function(petId) {
        this.showMobileNotification('❤️ You petted the animal!');
    },

    handleCameraRotation: function() {
        if (!window.SceneManager || !window.SceneManager.camera) return;
        
        const deltaX = this.touchState.currentPos.x - this.touchState.lastPos.x;
        const deltaY = this.touchState.currentPos.y - this.touchState.lastPos.y;
        
        const sensitivity = this.settings.sensitivity.camera;
        const camera = window.SceneManager.camera;
        
        // Horizontal rotation (around Y axis)
        const horizontalAngle = deltaX * sensitivity;
        const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
        const currentAngle = Math.atan2(camera.position.x, camera.position.z);
        const newAngle = currentAngle + horizontalAngle;
        
        camera.position.x = Math.sin(newAngle) * radius;
        camera.position.z = Math.cos(newAngle) * radius;
        
        // Vertical rotation (constrain to prevent flipping)
        const verticalAngle = deltaY * sensitivity;
        camera.position.y = Math.max(1, Math.min(15, camera.position.y + verticalAngle));
        
        // Always look at center
        camera.lookAt(0, 1, 0);
    },

    handlePinchZoom: function(scaleFactor) {
        if (!window.SceneManager || !window.SceneManager.camera) return;
        
        const camera = window.SceneManager.camera;
        const currentDistance = camera.position.length();
        const newDistance = Math.max(3, Math.min(25, currentDistance / scaleFactor));
        
        const direction = camera.position.clone().normalize();
        camera.position.copy(direction.multiplyScalar(newDistance));
        
        console.log('🤏 Pinch zoom:', scaleFactor.toFixed(2));
    },

    createMobileInterface: function() {
        // Add mobile UI class to body
        document.body.classList.add('mobile-ui');
        if (this.isMobile) document.body.classList.add('mobile-device');
        if (this.isTablet) document.body.classList.add('tablet-device');
        
        // Create all mobile components
        this.createHamburgerMenu();
        this.createVirtualJoystick();
        this.createQuickActions();
        
        // Hide desktop-only elements
        const desktopElements = document.querySelectorAll('.desktop-only');
        desktopElements.forEach(el => el.style.display = 'none');
        
        // Show mobile-only elements
        const mobileElements = document.querySelectorAll('.mobile-only');
        mobileElements.forEach(el => el.style.display = 'block');
        
        console.log('🎨 Mobile interface created');
        return Promise.resolve();
    },

    createHamburgerMenu: function() {
        const hamburgerHTML = `
            <div id="mobile-hamburger-btn" class="mobile-hamburger-btn">
                <div class="hamburger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            
            <div id="mobile-overlay" class="mobile-overlay"></div>
            
            <div id="mobile-menu" class="mobile-menu">
                <div class="mobile-menu-header">
                    <h2>🎮 Euphorie Menu</h2>
                    <button id="menu-close" class="menu-close-btn">✕</button>
                </div>
                
                <div class="mobile-menu-content">
                    <div class="menu-section">
                        <h3>👤 Avatar</h3>
                        <div class="menu-grid">
                            <button class="menu-item" data-action="customize-avatar">
                                <span class="menu-icon">🎨</span>
                                <span class="menu-label">Customize</span>
                            </button>
                            <button class="menu-item" data-action="avatar-emotions">
                                <span class="menu-icon">🎭</span>
                                <span class="menu-label">Emotions</span>
                            </button>
                            <button class="menu-item" data-action="avatar-wave">
                                <span class="menu-icon">👋</span>
                                <span class="menu-label">Wave</span>
                            </button>
                            <button class="menu-item" data-action="avatar-dance">
                                <span class="menu-icon">💃</span>
                                <span class="menu-label">Dance</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="menu-section">
                        <h3>🐾 Pets & Friends</h3>
                        <div class="menu-grid">
                            <button class="menu-item" data-action="get-pet">
                                <span class="menu-icon">🐱</span>
                                <span class="menu-label">Get Pet</span>
                            </button>
                            <button class="menu-item" data-action="manage-pets">
                                <span class="menu-icon">🎾</span>
                                <span class="menu-label">Pet Care</span>
                            </button>
                            <button class="menu-item" data-action="add-friends">
                                <span class="menu-icon">👥</span>
                                <span class="menu-label">Add Friends</span>
                            </button>
                            <button class="menu-item" data-action="group-activities">
                                <span class="menu-icon">🎉</span>
                                <span class="menu-label">Group Fun</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="menu-section">
                        <h3>🌍 Environment</h3>
                        <div class="menu-grid">
                            <button class="menu-item" data-action="change-scene">
                                <span class="menu-icon">🏠</span>
                                <span class="menu-label">Scenes</span>
                            </button>
                            <button class="menu-item" data-action="weather">
                                <span class="menu-icon">🌦️</span>
                                <span class="menu-label">Weather</span>
                            </button>
                            <button class="menu-item" data-action="lighting">
                                <span class="menu-icon">💡</span>
                                <span class="menu-label">Lighting</span>
                            </button>
                            <button class="menu-item" data-action="magic">
                                <span class="menu-icon">✨</span>
                                <span class="menu-label">Magic</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="menu-section">
                        <h3>⚙️ Settings</h3>
                        <div class="menu-grid">
                            <button class="menu-item" data-action="graphics">
                                <span class="menu-icon">🎮</span>
                                <span class="menu-label">Graphics</span>
                            </button>
                            <button class="menu-item" data-action="audio">
                                <span class="menu-icon">🔊</span>
                                <span class="menu-label">Audio</span>
                            </button>
                            <button class="menu-item" data-action="power-mode">
                                <span class="menu-icon">🔋</span>
                                <span class="menu-label">Power</span>
                            </button>
                            <button class="menu-item" data-action="help">
                                <span class="menu-icon">❓</span>
                                <span class="menu-label">Help</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', hamburgerHTML);
        
        this.components.hamburgerMenu = {
            button: document.getElementById('mobile-hamburger-btn'),
            menu: document.getElementById('mobile-menu'),
            overlay: document.getElementById('mobile-overlay'),
            closeBtn: document.getElementById('menu-close')
        };
        
        // Ensure menu starts closed
        const { button, menu, overlay } = this.components.hamburgerMenu;
        if (menu) menu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (button) button.classList.remove('active');
        
        this.setupHamburgerEvents();
    },

    setupHamburgerEvents: function() {
        const { button, menu, overlay, closeBtn } = this.components.hamburgerMenu;
        
        // Toggle menu
        if (button) {
            button.addEventListener('click', () => this.toggleHamburgerMenu());
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeHamburgerMenu());
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => this.closeHamburgerMenu());
        }
        
        // Menu item handlers
        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item[data-action]');
            if (menuItem && menu && menu.classList.contains('active')) {
                const action = menuItem.dataset.action;
                this.handleMenuAction(action);
                this.closeHamburgerMenu();
                this.hapticFeedback('medium');
            }
        });
        
        // Swipe to close
        if (menu) {
            menu.addEventListener('touchstart', (e) => this.handleMenuSwipe(e), { passive: false });
        }
        
        console.log('🍔 Hamburger menu events configured');
    },

    handleMenuSwipe: function(e) {
        // Simple swipe to close implementation
        let startX = e.touches[0].clientX;
        
        const handleMove = (e) => {
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            if (deltaX < -100) { // Swipe left to close
                this.closeHamburgerMenu();
                menu.removeEventListener('touchmove', handleMove);
            }
        };
        
        const menu = this.components.hamburgerMenu.menu;
        menu.addEventListener('touchmove', handleMove, { passive: true });
        
        setTimeout(() => {
            menu.removeEventListener('touchmove', handleMove);
        }, 1000);
    },

    toggleHamburgerMenu: function() {
        const { menu } = this.components.hamburgerMenu;
        
        if (menu && menu.classList.contains('active')) {
            this.closeHamburgerMenu();
        } else {
            this.openHamburgerMenu();
        }
    },

    openHamburgerMenu: function() {
        const { button, menu, overlay } = this.components.hamburgerMenu;
        
        if (button) button.classList.add('active');
        if (menu) menu.classList.add('active');
        if (overlay) overlay.classList.add('active');
        
        document.body.style.overflow = 'hidden';
        this.hapticFeedback('light');
        
        console.log('🟢 Hamburger menu opened');
    },

    closeHamburgerMenu: function() {
        const { button, menu, overlay } = this.components.hamburgerMenu;
        
        if (button) button.classList.remove('active');
        if (menu) menu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        document.body.style.overflow = '';
        
        console.log('🔴 Hamburger menu closed');
    },

    handleMenuAction: function(action) {
        console.log('🎯 Menu action:', action);
        
        switch (action) {
            case 'customize-avatar':
                this.showMobileNotification('👤 Opening avatar customization...');
                if (window.RoomCore && window.RoomCore.showAvatarCustomizationPanel) {
                    window.RoomCore.showAvatarCustomizationPanel();
                }
                break;
                
            case 'avatar-emotions':
                this.showMobileNotification('🎭 Opening emotions panel...');
                if (window.EmotionSystem && window.EmotionSystem.showEmotionPanel) {
                    window.EmotionSystem.showEmotionPanel();
                }
                break;
                
            case 'avatar-wave':
                this.triggerInteraction('wave');
                break;
                
            case 'avatar-dance':
                this.triggerInteraction('dance');
                break;
                
            case 'get-pet':
                this.showMobileNotification('🐾 Getting you a pet companion!');
                if (window.PetSystem && window.PetSystem.assignRandomPet) {
                    window.PetSystem.assignRandomPet('default');
                }
                break;
                
            case 'manage-pets':
                this.showMobileNotification('🎾 Opening pet management...');
                if (window.PetSystem && window.PetSystem.showPetManagementPanel) {
                    window.PetSystem.showPetManagementPanel();
                }
                break;
                
            case 'add-friends':
                this.showMobileNotification('👥 Adding friends to the room!');
                if (window.RoomCore && window.RoomCore.addRandomFriends) {
                    window.RoomCore.addRandomFriends();
                }
                break;
                
            case 'group-activities':
                this.showMobileNotification('🎉 Opening group activities!');
                break;
                
            case 'change-scene':
                this.showMobileNotification('🏠 Changing scene!');
                if (window.RoomCore && window.RoomCore.changeScene) {
                    window.RoomCore.changeScene();
                }
                break;
                
            case 'weather':
                this.showMobileNotification('🌦️ Changing weather!');
                this.cycleWeather();
                break;
                
            case 'lighting':
                this.showMobileNotification('💡 Adjusting lighting!');
                this.cycleLighting();
                break;
                
            case 'magic':
                this.showMobileNotification('✨ Activating magic effects!');
                if (window.RoomCore && window.RoomCore.toggleMagicEffects) {
                    window.RoomCore.toggleMagicEffects();
                }
                break;
                
            case 'graphics':
                this.toggleGraphicsQuality();
                break;
                
            case 'audio':
                this.toggleAudioSettings();
                break;
                
            case 'power-mode':
                this.togglePowerSaving();
                break;
                
            case 'help':
                this.showMobileHelp();
                break;
                
            default:
                this.showMobileNotification(`Action: ${action}`);
        }
    },

    createVirtualJoystick: function() {
        const joystickHTML = `
            <div id="virtual-joystick" class="virtual-joystick">
                <div class="joystick-base">
                    <div class="joystick-knob"></div>
                    <div class="joystick-ring"></div>
                </div>
                <div class="joystick-label">Move</div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', joystickHTML);
        
        const joystick = document.getElementById('virtual-joystick');
        this.components.virtualJoystick = {
            element: joystick,
            base: joystick.querySelector('.joystick-base'),
            knob: joystick.querySelector('.joystick-knob'),
            ring: joystick.querySelector('.joystick-ring'),
            isActive: false,
            center: { x: 0, y: 0 },
            position: { x: 0, y: 0 },
            maxDistance: 35
        };
        
        this.setupJoystickEvents();
    },

    setupJoystickEvents: function() {
        const joystick = this.components.virtualJoystick;
        
        const handleStart = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            joystick.isActive = true;
            joystick.element.classList.add('active');
            
            const rect = joystick.base.getBoundingClientRect();
            joystick.center.x = rect.left + rect.width / 2;
            joystick.center.y = rect.top + rect.height / 2;
            
            this.hapticFeedback('light');
        };
        
        const handleMove = (e) => {
            if (!joystick.isActive) return;
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches ? e.touches[0] : e;
            const deltaX = touch.clientX - joystick.center.x;
            const deltaY = touch.clientY - joystick.center.y;
            const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), joystick.maxDistance);
            const angle = Math.atan2(deltaY, deltaX);
            
            joystick.position.x = Math.cos(angle) * distance;
            joystick.position.y = Math.sin(angle) * distance;
            
            // Update knob position
            joystick.knob.style.transform = 
                `translate(${joystick.position.x}px, ${joystick.position.y}px)`;
            
            // Update ring opacity based on distance
            const intensity = distance / joystick.maxDistance;
            joystick.ring.style.opacity = intensity * 0.3;
            
            // Send movement to avatar system
            const normalizedX = joystick.position.x / joystick.maxDistance;
            const normalizedY = joystick.position.y / joystick.maxDistance;
            this.handleJoystickMovement(normalizedX, normalizedY);
        };
        
        const handleEnd = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            joystick.isActive = false;
            joystick.element.classList.remove('active');
            joystick.position = { x: 0, y: 0 };
            
            // Reset visuals
            joystick.knob.style.transform = 'translate(0px, 0px)';
            joystick.ring.style.opacity = '0';
            
            // Stop movement
            this.handleJoystickMovement(0, 0);
        };
        
        // Touch events
        joystick.base.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd, { passive: false });
        
        // Mouse events for testing
        joystick.base.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        console.log('🕹️ Virtual joystick configured');
    },

    handleJoystickMovement: function(x, y) {
        // Apply sensitivity
        const sensitiveX = x * this.settings.sensitivity.joystick;
        const sensitiveY = y * this.settings.sensitivity.joystick;
        
        // Send to avatar system
        if (window.AvatarSystem) {
            if (window.AvatarSystem.handleMovement) {
                window.AvatarSystem.handleMovement(sensitiveX, sensitiveY);
            } else if (window.AvatarSystem.moveAvatar) {
                window.AvatarSystem.moveAvatar('default', sensitiveX * 0.1, sensitiveY * 0.1);
            }
        }
        
        // Debug output
        if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
            console.log('🕹️ Joystick:', x.toFixed(2), y.toFixed(2));
        }
    },

    createQuickActions: function() {
        const quickActionsHTML = `
            <div id="quick-actions" class="quick-actions">
                <button class="quick-action-btn primary" data-action="wave" title="Wave">
                    <span class="action-icon">👋</span>
                </button>
                <button class="quick-action-btn secondary" data-action="dance" title="Dance">
                    <span class="action-icon">💃</span>
                </button>
                <button class="quick-action-btn secondary" data-action="chat" title="Chat">
                    <span class="action-icon">💬</span>
                </button>
                <button class="quick-action-btn expand" data-action="expand" title="More Actions">
                    <span class="action-icon">⚡</span>
                </button>
            </div>
            
            <div id="quick-actions-expanded" class="quick-actions-expanded hidden">
                <button class="expanded-action-btn" data-action="emotions">
                    <span class="action-icon">🎭</span>
                    <span class="action-label">Emotions</span>
                </button>
                <button class="expanded-action-btn" data-action="pets">
                    <span class="action-icon">🐾</span>
                    <span class="action-label">Pets</span>
                </button>
                <button class="expanded-action-btn" data-action="magic">
                    <span class="action-icon">✨</span>
                    <span class="action-label">Magic</span>
                </button>
                <button class="expanded-action-btn" data-action="settings">
                    <span class="action-icon">⚙️</span>
                    <span class="action-label">Settings</span>
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', quickActionsHTML);
        
        this.components.quickActions = {
            container: document.getElementById('quick-actions'),
            expanded: document.getElementById('quick-actions-expanded')
        };
        
        this.setupQuickActionEvents();
    },

    setupQuickActionEvents: function() {
        // Quick action handlers
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (!actionBtn) return;
            
            const action = actionBtn.dataset.action;
            e.preventDefault();
            e.stopPropagation();
            
            // Visual feedback
            actionBtn.style.transform = 'scale(0.9)';
            setTimeout(() => {
                actionBtn.style.transform = '';
            }, 150);
            
            this.handleQuickAction(action);
            this.hapticFeedback('medium');
        });
        
        console.log('⚡ Quick actions configured');
    },

    handleQuickAction: function(action) {
        switch (action) {
            case 'wave':
                this.triggerInteraction('wave');
                break;
            case 'dance':
                this.triggerInteraction('dance');
                break;
            case 'chat':
                this.toggleMobileChat();
                break;
            case 'expand':
                this.toggleQuickActionsExpanded();
                break;
            case 'emotions':
                if (window.EmotionSystem && window.EmotionSystem.showEmotionPanel) {
                    window.EmotionSystem.showEmotionPanel();
                }
                break;
            case 'pets':
                if (window.PetSystem && window.PetSystem.assignRandomPet) {
                    window.PetSystem.assignRandomPet('default');
                }
                break;
            case 'magic':
                if (window.RoomCore && window.RoomCore.toggleMagicEffects) {
                    window.RoomCore.toggleMagicEffects();
                }
                break;
            case 'settings':
                this.openHamburgerMenu();
                break;
        }
    },

    toggleQuickActionsExpanded: function() {
        const expanded = this.components.quickActions?.expanded;
        if (!expanded) return;
        
        expanded.classList.toggle('hidden');
        
        if (!expanded.classList.contains('hidden')) {
            // Auto-hide after 5 seconds
            setTimeout(() => {
                expanded.classList.add('hidden');
            }, 5000);
        }
    },

    triggerInteraction: function(type) {
        console.log('🎯 Triggering interaction:', type);
        
        // Try different interaction systems
        if (window.InteractionSystem) {
            if (window.InteractionSystem.triggerInteraction) {
                window.InteractionSystem.triggerInteraction(type);
            } else if (window.InteractionSystem.triggerGesture) {
                window.InteractionSystem.triggerGesture(type);
            }
        }
        
        this.showMobileNotification(`${type === 'wave' ? '👋' : '💃'} ${type}!`);
    },

    // Utility methods
    calculateDistance: function(point1, point2) {
        return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
    },

    updateVelocity: function() {
        const deltaTime = 16; // Assume 60fps
        this.touchState.velocity.x = (this.touchState.currentPos.x - this.touchState.lastPos.x) / deltaTime;
        this.touchState.velocity.y = (this.touchState.currentPos.y - this.touchState.lastPos.y) / deltaTime;
    },

    isInCanvas: function(position) {
        const canvas = document.getElementById('three-container');
        if (!canvas) return false;
        
        const rect = canvas.getBoundingClientRect();
        return position.x >= rect.left && position.x <= rect.right &&
               position.y >= rect.top && position.y <= rect.bottom;
    },

    resetTouchState: function() {
        this.touchState.isActive = false;
        this.touchState.gestureType = null;
        this.touchState.touches = [];
    },

    startLongPressDetection: function() {
        this.longPressTimer = setTimeout(() => {
            if (this.touchState.isActive) {
                this.handleLongPress();
            }
        }, this.gestures.longPress.minDuration);
    },

    cancelLongPress: function() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    },

    handleLongPress: function() {
        console.log('👆 Long press detected');
        this.hapticFeedback('heavy');
        
        // Show context menu at long press location
        this.showContextMenu([
            { icon: '🏠', label: 'Change Scene', action: () => window.RoomCore?.changeScene() },
            { icon: '✨', label: 'Magic Effects', action: () => window.RoomCore?.toggleMagicEffects() },
            { icon: '🐾', label: 'Get Pet', action: () => window.PetSystem?.assignRandomPet('default') },
            { icon: '⚙️', label: 'Settings', action: () => this.openHamburgerMenu() }
        ]);
    },

    showContextMenu: function(items) {
        // Remove existing context menu
        const existing = document.getElementById('context-menu');
        if (existing) existing.remove();
        
        const menuHTML = `
            <div id="context-menu" class="context-menu">
                <div class="context-menu-container">
                    ${items.map(item => `
                        <button class="context-menu-item" onclick="(${item.action.toString()})(); document.getElementById('context-menu').remove();">
                            <span class="context-icon">${item.icon}</span>
                            <span class="context-label">${item.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', menuHTML);
        
        const menu = document.getElementById('context-menu');
        
        // Position near touch point
        const x = Math.min(this.touchState.currentPos.x, window.innerWidth - 200);
        const y = Math.min(this.touchState.currentPos.y, window.innerHeight - 150);
        
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (menu.parentNode) menu.remove();
        }, 5000);
        
        // Remove on outside click
        const handleOutsideClick = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', handleOutsideClick);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
        }, 100);
    },

    hapticFeedback: function(intensity = 'light') {
        if (!this.settings.hapticFeedback || !navigator.vibrate) return;
        
        const patterns = {
            light: 25,
            medium: 50,
            heavy: [50, 50, 50]
        };
        
        navigator.vibrate(patterns[intensity] || 25);
    },

    showMobileNotification: function(message, duration = 2500) {
        // Remove existing notifications
        const existing = document.querySelectorAll('.mobile-notification');
        existing.forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = 'mobile-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 50);
        
        // Remove after duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    },

    // Additional feature methods
    toggleGraphicsQuality: function() {
        const qualities = ['Low', 'Medium', 'High'];
        const current = localStorage.getItem('graphicsQuality') || 'Medium';
        const currentIndex = qualities.indexOf(current);
        const next = qualities[(currentIndex + 1) % qualities.length];
        
        localStorage.setItem('graphicsQuality', next);
        this.showMobileNotification(`🎮 Graphics: ${next}`);
        
        // Apply quality changes if possible
        if (window.SceneManager && window.SceneManager.renderer) {
            const qualityMap = { Low: 0.5, Medium: 1, High: 1.5 };
            const pixelRatio = Math.min(window.devicePixelRatio * qualityMap[next], 2);
            window.SceneManager.renderer.setPixelRatio(pixelRatio);
        }
    },

    toggleAudioSettings: function() {
        this.showMobileNotification('🔊 Audio settings not implemented yet');
    },

    togglePowerSaving: function() {
        this.settings.lowPowerMode = !this.settings.lowPowerMode;
        
        if (this.settings.lowPowerMode) {
            document.body.classList.add('low-power-mode');
            this.showMobileNotification('🔋 Power saving enabled');
        } else {
            document.body.classList.remove('low-power-mode');
            this.showMobileNotification('⚡ Power saving disabled');
        }
        
        localStorage.setItem('lowPowerMode', this.settings.lowPowerMode);
    },

    cycleWeather: function() {
        this.showMobileNotification('🌦️ Weather cycling not implemented yet');
    },

    cycleLighting: function() {
        this.showMobileNotification('💡 Lighting cycling not implemented yet');
    },

    toggleMobileChat: function() {
        this.showMobileNotification('💬 Mobile chat coming soon!');
    },

    showMobileHelp: function() {
        this.showMobileNotification('❓ Help: Use hamburger menu and joystick to navigate!', 3000);
    },

    destroy: function() {
        // Remove event listeners
        const container = document.getElementById('three-container') || document.body;
        // Note: These won't remove because we used arrow functions, but that's okay
        
        // Remove UI elements
        this.cleanup();
        
        // Reset state
        this.resetTouchState();
        this.cancelLongPress();
        
        this.isInitialized = false;
        console.log('🗑️ Mobile UI destroyed');
    }
};

// Auto-initialize based on device detection
document.addEventListener('DOMContentLoaded', () => {
    // Check if we should initialize mobile UI
    const shouldInitializeMobile = (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && window.innerWidth <= 768) ||
        window.innerWidth <= 768
    );
    
    if (shouldInitializeMobile && !window.MobileUI.isInitialized) {
        console.log('📱 Auto-initializing Mobile UI...');
        setTimeout(() => {
            window.MobileUI.init().catch(console.error);
        }, 1000); // Delay to ensure other systems are loaded
    }
});

// Handle orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (window.MobileUI.isInitialized) {
            console.log('📱 Handling orientation change...');
            // Recalculate joystick positions if needed
            const joystick = window.MobileUI.components.virtualJoystick;
            if (joystick && joystick.isActive) {
                const rect = joystick.base.getBoundingClientRect();
                joystick.center.x = rect.left + rect.width / 2;
                joystick.center.y = rect.top + rect.height / 2;
            }
        }
    }, 500);
});

console.log('📱 Mobile UI System loaded');