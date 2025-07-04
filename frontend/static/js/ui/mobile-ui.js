// Mobile UI System - Without Hamburger Menu (temporarily disabled)

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
        // hamburgerMenu: null, // DISABLED
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
        
        console.log('📱 Initializing Mobile UI System (no hamburger menu)...');
        
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
            
            // Initialize core components (WITHOUT hamburger menu)
            await this.setupTouchHandling();
            await this.createMobileInterface();
            
            this.isInitialized = true;
            console.log('✅ Mobile UI System initialized successfully (no menu)');
            
            // Show welcome message
            this.showMobileNotification('📱 Mobile interface ready! Use joystick and quick actions.', 3000);
            
        } catch (error) {
            console.error('❌ Mobile UI initialization failed:', error);
            throw error;
        }
        
        return Promise.resolve();
    },

    addMobileStyles: function() {
        // Add only essential mobile styles (no hamburger menu styles)
        const style = document.createElement('style');
        style.id = 'mobile-ui-styles';
        style.textContent = `
            /* Mobile UI Base Styles - No Hamburger Menu */
            .mobile-ui {
                touch-action: none;
                user-select: none;
                -webkit-user-select: none;
            }
            
            /* Virtual Joystick */
            .virtual-joystick {
                position: fixed;
                bottom: 30px;
                left: 30px;
                width: 120px;
                height: 140px;
                z-index: 200;
                pointer-events: auto;
                opacity: 0.9;
                transition: all 0.3s ease;
                transform: translateZ(0);
            }
            
            .virtual-joystick.active {
                opacity: 1;
                transform: scale(1.1) translateZ(0);
            }
            
            .joystick-base {
                width: 90px;
                height: 90px;
                border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, 
                    rgba(255, 255, 255, 0.2), 
                    rgba(0, 0, 0, 0.9));
                backdrop-filter: blur(20px);
                border: 3px solid rgba(255, 255, 255, 0.4);
                position: relative;
                cursor: pointer;
                box-shadow: 
                    0 10px 40px rgba(0, 0, 0, 0.7),
                    inset 0 2px 8px rgba(255, 255, 255, 0.1);
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            .joystick-base:active {
                background: radial-gradient(circle at 30% 30%, 
                    rgba(102, 126, 234, 0.3), 
                    rgba(0, 0, 0, 0.95));
                border-color: rgba(102, 126, 234, 0.7);
                transform: scale(1.05);
                box-shadow: 
                    0 12px 50px rgba(102, 126, 234, 0.4),
                    inset 0 2px 8px rgba(102, 126, 234, 0.2);
            }
            
            .joystick-knob {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                transition: transform 0.1s ease-out;
                box-shadow: 
                    0 6px 20px rgba(0, 0, 0, 0.6),
                    0 2px 8px rgba(102, 126, 234, 0.3);
                border: 3px solid rgba(255, 255, 255, 0.9);
                z-index: 3;
            }
            
            .virtual-joystick.active .joystick-knob {
                background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
                box-shadow: 
                    0 8px 25px rgba(102, 126, 234, 0.8),
                    0 3px 12px rgba(102, 126, 234, 0.5);
                transform: translate(-50%, -50%) scale(1.1);
            }
            
            .joystick-ring {
                position: absolute;
                top: -5px;
                left: -5px;
                right: -5px;
                bottom: -5px;
                border-radius: 50%;
                border: 2px solid rgba(102, 126, 234, 0.6);
                opacity: 0;
                transition: opacity 0.2s ease;
                pointer-events: none;
                z-index: 1;
            }
            
            .joystick-label {
                text-align: center;
                color: rgba(255, 255, 255, 0.95);
                font-size: 14px;
                margin-top: 12px;
                font-weight: 600;
                text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
                letter-spacing: 0.5px;
            }
            
            /* Quick Actions */
            .quick-actions {
                position: fixed;
                bottom: 30px;
                right: 30px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                z-index: 200;
                transform: translateZ(0);
            }
            
            .quick-action-btn {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: radial-gradient(circle at 30% 30%, 
                    rgba(255, 255, 255, 0.2), 
                    rgba(0, 0, 0, 0.9));
                backdrop-filter: blur(20px);
                border: 3px solid rgba(255, 255, 255, 0.4);
                color: white;
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
                user-select: none;
                text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
                position: relative;
                overflow: hidden;
            }
            
            .quick-action-btn.primary {
                background: radial-gradient(circle at 30% 30%, 
                    rgba(102, 126, 234, 0.4), 
                    rgba(102, 126, 234, 0.8));
                border-color: rgba(102, 126, 234, 0.8);
                box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5);
            }
            
            .quick-action-btn.secondary {
                background: radial-gradient(circle at 30% 30%, 
                    rgba(255, 255, 255, 0.15), 
                    rgba(0, 0, 0, 0.85));
            }
            
            .quick-action-btn:active {
                transform: scale(0.88);
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.8);
            }
            
            .quick-action-btn:hover {
                transform: scale(1.08);
                box-shadow: 0 15px 50px rgba(0, 0, 0, 0.7);
            }
            
            .action-icon {
                filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
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
            
            /* Responsive adjustments */
            @media (max-width: 480px) {
                .virtual-joystick {
                    width: 100px;
                    height: 120px;
                    bottom: 20px;
                    left: 20px;
                }
                
                .joystick-base {
                    width: 80px;
                    height: 80px;
                }
                
                .joystick-knob {
                    width: 32px;
                    height: 32px;
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
        `;
        
        document.head.appendChild(style);
        console.log('🎨 Mobile CSS styles added (no hamburger menu)');
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
        
        console.log('📱 Device Detection:', {
            isMobile: this.isMobile,
            isTablet: this.isTablet,
            touchEnabled: this.touchEnabled,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        });
    },

    cleanup: function() {
        // Remove any existing mobile UI elements (including old hamburger menu)
        const elementsToRemove = [
            'mobile-hamburger-btn',
            'mobile-menu',
            'mobile-overlay',
            'virtual-joystick',
            'quick-actions',
            'gesture-overlay',
            'context-menu',
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
        
        console.log('👆 Touch handling configured');
        return Promise.resolve();
    },

    createMobileInterface: function() {
        // Add mobile UI class to body
        document.body.classList.add('mobile-ui');
        if (this.isMobile) document.body.classList.add('mobile-device');
        if (this.isTablet) document.body.classList.add('tablet-device');
        
        // Create mobile components (WITHOUT hamburger menu)
        // this.createHamburgerMenu(); // DISABLED
        this.createVirtualJoystick();
        this.createQuickActions();
        
        console.log('🎨 Mobile interface created (no hamburger menu)');
        return Promise.resolve();
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
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', quickActionsHTML);
        
        this.components.quickActions = {
            container: document.getElementById('quick-actions')
        };
        
        this.setupQuickActionEvents();
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
                this.showMobileNotification('💬 Chat functionality coming soon!');
                break;
        }
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

    // Touch handling methods (simplified without hamburger menu conflicts)
    handleTouchStart: function(event) {
        if (this.isTouchingUI(event.target)) return;
        
        this.touchState.isActive = true;
        this.touchState.startTime = Date.now();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.touchState.startPos = { x: touch.clientX, y: touch.clientY };
            this.touchState.currentPos = { x: touch.clientX, y: touch.clientY };
        }
    },

    handleTouchMove: function(event) {
        if (!this.touchState.isActive || this.isTouchingUI(event.target)) return;
        
        event.preventDefault();
        
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.touchState.currentPos = { x: touch.clientX, y: touch.clientY };
            
            // Handle camera rotation if needed
            this.handleCameraRotation();
        }
    },

    handleTouchEnd: function(event) {
        if (!this.touchState.isActive) return;
        
        const duration = Date.now() - this.touchState.startTime;
        const distance = this.calculateDistance(this.touchState.startPos, this.touchState.currentPos);
        
        if (duration < this.gestures.tap.maxDuration && distance < this.gestures.tap.maxDistance) {
            this.handleTap(this.touchState.currentPos);
        }
        
        this.resetTouchState();
    },

    handleTouchCancel: function(event) {
        this.resetTouchState();
    },

    isTouchingUI: function(target) {
        // Check if touch target is a UI element
        return target.closest('.virtual-joystick') ||
               target.closest('.quick-actions') ||
               target.closest('#chat-panel') ||
               target.closest('#pet-panel');
    },

    handleTap: function(position) {
        console.log('👆 Tap detected at:', position);
        this.hapticFeedback('light');
    },

    handleCameraRotation: function() {
        // Placeholder for camera rotation
        console.log('📹 Camera rotation');
    },

    calculateDistance: function(point1, point2) {
        return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
    },

    resetTouchState: function() {
        this.touchState.isActive = false;
        this.touchState.gestureType = null;
        this.touchState.touches = [];
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
        console.log('📱 Auto-initializing Mobile UI (no hamburger menu)...');
        setTimeout(() => {
            window.MobileUI.init().catch(console.error);
        }, 1000);
    }
});

console.log('📱 Mobile UI System loaded (no hamburger menu)');