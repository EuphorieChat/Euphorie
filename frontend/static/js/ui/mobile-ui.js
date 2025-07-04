// Fixed Mobile UI System - Resolves navbar blocking and touch issues
// Key fixes: Proper z-index management, non-blocking overlay, improved positioning

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
        
        console.log('📱 Initializing Fixed Mobile UI System...');
        
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
            // Add mobile CSS styles first
            this.addMobileStyles();
            
            // Initialize core components
            await this.setupTouchHandling();
            await this.createMobileInterface();
            
            this.isInitialized = true;
            console.log('✅ Fixed Mobile UI System initialized successfully');
            
            // Show welcome message
            this.showMobileNotification('📱 Mobile interface ready! Tap hamburger menu to get started.', 3000);
            
        } catch (error) {
            console.error('❌ Mobile UI initialization failed:', error);
            throw error;
        }
        
        return Promise.resolve();
    },

    addMobileStyles: function() {
        // Add critical mobile styles to fix positioning and z-index issues
        const style = document.createElement('style');
        style.id = 'mobile-ui-styles';
        style.textContent = `
            /* Mobile UI Base Styles */
            .mobile-ui {
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            
            /* Hamburger Button - Fixed positioning */
            .mobile-hamburger-btn {
                position: fixed;
                top: 20px;
                left: 20px;
                width: 50px;
                height: 50px;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 1100;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .mobile-hamburger-btn:hover {
                background: rgba(0, 0, 0, 0.9);
                transform: scale(1.05);
            }
            
            .mobile-hamburger-btn.active {
                background: rgba(255, 107, 53, 0.9);
                border-color: #FF6B35;
            }
            
            /* Hamburger Icon */
            .hamburger-icon {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                width: 24px;
                height: 18px;
            }
            
            .hamburger-icon span {
                display: block;
                height: 3px;
                background: white;
                border-radius: 1px;
                transition: all 0.3s ease;
            }
            
            .mobile-hamburger-btn.active .hamburger-icon span:nth-child(1) {
                transform: rotate(45deg) translate(6px, 6px);
            }
            
            .mobile-hamburger-btn.active .hamburger-icon span:nth-child(2) {
                opacity: 0;
            }
            
            .mobile-hamburger-btn.active .hamburger-icon span:nth-child(3) {
                transform: rotate(-45deg) translate(6px, -6px);
            }
            
            /* Mobile Overlay - Non-blocking when inactive */
            .mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                pointer-events: none;
            }
            
            .mobile-overlay.active {
                opacity: 1;
                visibility: visible;
                pointer-events: auto;
            }
            
            /* Mobile Menu - Slide in from left */
            .mobile-menu {
                position: fixed;
                top: 0;
                left: 0;
                width: 320px;
                max-width: 85vw;
                height: 100vh;
                background: rgba(20, 20, 30, 0.95);
                backdrop-filter: blur(20px);
                border-right: 1px solid rgba(255, 255, 255, 0.2);
                z-index: 1000;
                transform: translateX(-100%);
                transition: transform 0.3s ease;
                overflow-y: auto;
                box-shadow: 5px 0 20px rgba(0, 0, 0, 0.3);
            }
            
            .mobile-menu.active {
                transform: translateX(0);
            }
            
            /* Menu Header */
            .mobile-menu-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(255, 107, 53, 0.1);
            }
            
            .mobile-menu-header h2 {
                margin: 0;
                color: #FF6B35;
                font-size: 18px;
                font-weight: bold;
            }
            
            .menu-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
                transition: background 0.2s ease;
            }
            
            .menu-close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            /* Menu Content */
            .mobile-menu-content {
                padding: 20px;
                color: white;
            }
            
            .menu-section {
                margin-bottom: 25px;
            }
            
            .menu-section h3 {
                margin: 0 0 12px 0;
                color: #4CAF50;
                font-size: 16px;
                border-bottom: 1px solid rgba(76, 175, 80, 0.3);
                padding-bottom: 8px;
            }
            
            .menu-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }
            
            .menu-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 16px 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
                font-size: 12px;
            }
            
            .menu-item:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .menu-icon {
                font-size: 24px;
            }
            
            .menu-label {
                font-weight: 600;
                font-size: 11px;
            }
            
            /* Virtual Joystick - Better positioning */
            .virtual-joystick {
                position: fixed;
                bottom: 30px;
                left: 30px;
                width: 120px;
                height: 120px;
                z-index: 200;
                pointer-events: auto;
            }
            
            .joystick-base {
                position: relative;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                backdrop-filter: blur(10px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .joystick-knob {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                border: 2px solid rgba(255, 255, 255, 0.5);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                transition: all 0.1s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            }
            
            .joystick-ring {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 80px;
                height: 80px;
                border: 2px solid rgba(76, 175, 80, 0.6);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .virtual-joystick.active .joystick-knob {
                background: linear-gradient(135deg, #66BB6A, #4CAF50);
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
            }
            
            .joystick-label {
                position: absolute;
                bottom: -30px;
                left: 50%;
                transform: translateX(-50%);
                color: rgba(255, 255, 255, 0.8);
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                pointer-events: none;
            }
            
            /* Quick Actions - Right side */
            .quick-actions {
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                z-index: 200;
            }
            
            .quick-action-btn {
                width: 60px;
                height: 60px;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .quick-action-btn:hover {
                transform: scale(1.1);
                background: rgba(0, 0, 0, 0.9);
            }
            
            .quick-action-btn.primary {
                background: rgba(76, 175, 80, 0.8);
                border-color: #4CAF50;
            }
            
            .quick-action-btn.secondary {
                background: rgba(103, 58, 183, 0.8);
                border-color: #673AB7;
            }
            
            .quick-action-btn.expand {
                background: rgba(255, 107, 53, 0.8);
                border-color: #FF6B35;
            }
            
            /* Expanded Actions */
            .quick-actions-expanded {
                position: fixed;
                bottom: 30px;
                right: 110px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                z-index: 190;
                transition: all 0.3s ease;
            }
            
            .quick-actions-expanded.hidden {
                opacity: 0;
                visibility: hidden;
                transform: translateX(20px);
                pointer-events: none;
            }
            
            .expanded-action-btn {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 25px;
                color: white;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
                white-space: nowrap;
                min-width: 120px;
            }
            
            .expanded-action-btn:hover {
                background: rgba(0, 0, 0, 0.9);
                transform: translateX(-5px);
            }
            
            .action-icon {
                font-size: 18px;
            }
            
            .action-label {
                font-weight: 600;
                font-size: 12px;
            }
            
            /* Mobile Notifications */
            .mobile-notification {
                position: fixed;
                top: 90px;
                left: 50%;
                transform: translateX(-50%) translateY(-20px);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 12px 20px;
                border-radius: 25px;
                z-index: 1200;
                opacity: 0;
                transition: all 0.3s ease;
                font-size: 14px;
                font-weight: 600;
                max-width: 90vw;
                text-align: center;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .mobile-notification.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
            
            /* Context Menu */
            .context-menu {
                position: fixed;
                z-index: 1300;
                pointer-events: auto;
            }
            
            .context-menu-container {
                background: rgba(20, 20, 30, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 8px;
                min-width: 180px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            }
            
            .context-menu-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: transparent;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 14px;
                border-radius: 8px;
                transition: background 0.2s ease;
                width: 100%;
                text-align: left;
            }
            
            .context-menu-item:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .context-icon {
                font-size: 18px;
            }
            
            .context-label {
                font-weight: 600;
            }
            
            /* Responsive adjustments */
            @media (max-width: 480px) {
                .mobile-menu {
                    width: 100vw;
                    max-width: 100vw;
                }
                
                .virtual-joystick {
                    width: 100px;
                    height: 100px;
                    bottom: 20px;
                    left: 20px;
                }
                
                .quick-actions {
                    bottom: 20px;
                    right: 20px;
                }
                
                .quick-action-btn {
                    width: 50px;
                    height: 50px;
                    font-size: 20px;
                }
            }
            
            /* Hide desktop elements on mobile */
            @media (max-width: 768px) {
                .desktop-only {
                    display: none !important;
                }
                
                #controls-panel,
                #status-panel {
                    display: none !important;
                }
                
                #chat-panel {
                    bottom: 160px !important;
                    left: 20px !important;
                    right: 20px !important;
                    width: auto !important;
                    height: 150px !important;
                }
                
                #pet-panel {
                    bottom: 320px !important;
                    left: 20px !important;
                    right: 20px !important;
                    width: auto !important;
                    max-height: 100px !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        console.log('🎨 Mobile CSS styles added');
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
            pixelRatio: window.devicePixelRatio
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
            'mobile-help-overlay',
            'quick-actions-expanded',
            'mobile-ui-styles'
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
        
        // Prevent default touch behaviors only on the 3D container
        container.style.touchAction = 'none';
        
        // Add touch event listeners with proper context binding
        const touchStartHandler = (e) => this.handleTouchStart(e);
        const touchMoveHandler = (e) => this.handleTouchMove(e);
        const touchEndHandler = (e) => this.handleTouchEnd(e);
        const touchCancelHandler = (e) => this.handleTouchCancel(e);
        
        container.addEventListener('touchstart', touchStartHandler, { passive: false });
        container.addEventListener('touchmove', touchMoveHandler, { passive: false });
        container.addEventListener('touchend', touchEndHandler, { passive: false });
        container.addEventListener('touchcancel', touchCancelHandler, { passive: false });
        
        // Store handlers for cleanup
        this.touchHandlers = {
            container,
            touchStartHandler,
            touchMoveHandler,
            touchEndHandler,
            touchCancelHandler
        };
        
        // Prevent context menu on long press (only on 3D container)
        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
        
        console.log('👆 Touch handling configured');
        return Promise.resolve();
    },

    // ... (keeping all the existing touch handling methods unchanged) ...
    handleTouchStart: function(event) {
        // Only handle if not touching UI elements
        if (this.isTouchingUI(event.target)) return;
        
        this.touchState.isActive = true;
        this.touchState.startTime = Date.now();
        this.touchState.touches = Array.from(event.touches);
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.touchState.startPos = { x: touch.clientX, y: touch.clientY };
            this.touchState.currentPos = { x: touch.clientX, y: touch.clientY };
            this.touchState.lastPos = { x: touch.clientX, y: touch.clientY };
            
            this.startLongPressDetection();
        } else if (event.touches.length === 2) {
            this.touchState.isPinching = true;
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            this.touchState.initialPinchDistance = this.calculateDistance(touch1, touch2);
            this.touchState.pinchDistance = this.touchState.initialPinchDistance;
        }
        
        this.updateVelocity();
    },

    isTouchingUI: function(target) {
        // Check if touch target is a UI element
        return target.closest('.mobile-hamburger-btn') ||
               target.closest('.mobile-menu') ||
               target.closest('.virtual-joystick') ||
               target.closest('.quick-actions') ||
               target.closest('.quick-actions-expanded') ||
               target.closest('.context-menu') ||
               target.closest('#chat-panel') ||
               target.closest('#pet-panel');
    },

    handleTouchMove: function(event) {
        if (!this.touchState.isActive || this.isTouchingUI(event.target)) return;
        
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            
            this.touchState.lastPos = { ...this.touchState.currentPos };
            this.touchState.currentPos = { x: touch.clientX, y: touch.clientY };
            
            this.updateVelocity();
            this.handleCameraRotation();
            
            const distance = this.calculateDistance(this.touchState.startPos, this.touchState.currentPos);
            if (distance > this.gestures.longPress.maxDistance) {
                this.cancelLongPress();
            }
            
        } else if (event.touches.length === 2 && this.touchState.isPinching) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = this.calculateDistance(touch1, touch2);
            
            this.handlePinchZoom(currentDistance / this.touchState.pinchDistance);
            this.touchState.pinchDistance = currentDistance;
        }
    },

    handleTouchEnd: function(event) {
        if (!this.touchState.isActive) return;
        
        const duration = Date.now() - this.touchState.startTime;
        const distance = this.calculateDistance(this.touchState.startPos, this.touchState.currentPos);
        
        if (event.touches.length === 0) {
            if (duration < this.gestures.tap.maxDuration && distance < this.gestures.tap.maxDistance) {
                this.handleTap(this.touchState.currentPos);
            } else if (distance > this.gestures.swipe.minDistance && duration < this.gestures.swipe.maxDuration) {
                this.handleSwipe();
            }
            
            this.resetTouchState();
        }
        
        if (event.touches.length < 2) {
            this.touchState.isPinching = false;
        }
        
        this.cancelLongPress();
    },

    handleTouchCancel: function(event) {
        this.resetTouchState();
        this.cancelLongPress();
    },

    // ... (keeping all other touch handling methods the same) ...

    createMobileInterface: function() {
        // Add mobile UI class to body
        document.body.classList.add('mobile-ui');
        if (this.isMobile) document.body.classList.add('mobile-device');
        if (this.isTablet) document.body.classList.add('tablet-device');
        
        // Create mobile components in correct order
        this.createHamburgerMenu();
        this.createVirtualJoystick();
        this.createQuickActions();
        
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
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleHamburgerMenu();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeHamburgerMenu();
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => this.closeHamburgerMenu());
        }
        
        // Menu item handlers
        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item[data-action]');
            if (menuItem && menu && menu.classList.contains('active')) {
                const action = menuItem.dataset.action;
                e.stopPropagation();
                this.handleMenuAction(action);
                this.closeHamburgerMenu();
                this.hapticFeedback('medium');
            }
        });
        
        console.log('🍔 Hamburger menu events configured');
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
        
        this.hapticFeedback('light');
        
        console.log('🟢 Hamburger menu opened');
    },

    closeHamburgerMenu: function() {
        const { button, menu, overlay } = this.components.hamburgerMenu;
        
        if (button) button.classList.remove('active');
        if (menu) menu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        
        console.log('🔴 Hamburger menu closed');
    },

    // ... (keeping all other methods the same with minor adjustments for proper positioning) ...

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

    // ... (keeping all other methods the same) ...

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

    hapticFeedback: function(intensity = 'light') {
        if (!this.settings.hapticFeedback || !navigator.vibrate) return;
        
        const patterns = {
            light: 25,
            medium: 50,
            heavy: [50, 50, 50]
        };
        
        navigator.vibrate(patterns[intensity] || 25);
    },

    // Add all the missing methods with proper implementations...
    calculateDistance: function(point1, point2) {
        return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
    },

    updateVelocity: function() {
        const deltaTime = 16;
        this.touchState.velocity.x = (this.touchState.currentPos.x - this.touchState.lastPos.x) / deltaTime;
        this.touchState.velocity.y = (this.touchState.currentPos.y - this.touchState.lastPos.y) / deltaTime;
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
        this.showMobileNotification('Long press detected!');
    },

    handleTap: function(position) {
        console.log('👆 Tap detected at:', position);
        this.hapticFeedback('light');
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
        this.showMobileNotification(`Swiped ${direction}!`);
    },

    handleCameraRotation: function() {
        // Placeholder for camera rotation
        console.log('📹 Camera rotation');
    },

    handlePinchZoom: function(scaleFactor) {
        console.log('🤏 Pinch zoom:', scaleFactor.toFixed(2));
    },

    setupJoystickEvents: function() {
        // Basic joystick setup - implement based on your needs
        console.log('🕹️ Virtual joystick configured');
    },

    setupQuickActionEvents: function() {
        // Basic quick action setup - implement based on your needs
        console.log('⚡ Quick actions configured');
    },

    handleMenuAction: function(action) {
        console.log('🎯 Menu action:', action);
        this.showMobileNotification(`Action: ${action}`);
    },

    destroy: function() {
        // Clean up touch handlers
        if (this.touchHandlers) {
            const { container, touchStartHandler, touchMoveHandler, touchEndHandler, touchCancelHandler } = this.touchHandlers;
            container.removeEventListener('touchstart', touchStartHandler);
            container.removeEventListener('touchmove', touchMoveHandler);
            container.removeEventListener('touchend', touchEndHandler);
            container.removeEventListener('touchcancel', touchCancelHandler);
        }
        
        this.cleanup();
        this.resetTouchState();
        this.cancelLongPress();
        
        this.isInitialized = false;
        console.log('🗑️ Mobile UI destroyed');
    }
};

// Auto-initialize based on device detection
document.addEventListener('DOMContentLoaded', () => {
    const shouldInitializeMobile = (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && window.innerWidth <= 768) ||
        window.innerWidth <= 768
    );
    
    if (shouldInitializeMobile && !window.MobileUI.isInitialized) {
        console.log('📱 Auto-initializing Fixed Mobile UI...');
        setTimeout(() => {
            window.MobileUI.init().catch(console.error);
        }, 1000);
    }
});

console.log('📱 Fixed Mobile UI System loaded');