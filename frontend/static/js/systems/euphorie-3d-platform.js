// frontend/static/js/euphorie-3d-platform.js
// Main JavaScript for Euphorie 3D Platform
// Handles WebSocket connections, module loading, and UI interactions

// Pass Django context to JavaScript (this will be set by the template)
// window.ROOM_CONFIG should be set in the template before this script loads

// Mobile detection and responsive setup
const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Enhanced mobile detection for better responsiveness
function updateMobileLayout() {
    const currentIsMobile = window.innerWidth <= 768;
    document.body.classList.toggle('mobile-layout', currentIsMobile);
    document.body.classList.toggle('desktop-layout', !currentIsMobile);
}

// Initialize layout
updateMobileLayout();

// Handle resize and orientation changes
window.addEventListener('resize', updateMobileLayout);
window.addEventListener('orientationchange', () => {
    setTimeout(updateMobileLayout, 100);
});

// Enhanced Loading System with Progress Tracking
class LoadingManager {
    constructor() {
        this.currentStep = 0;
        this.totalSteps = 6;
        this.stepProgress = [0, 0, 0, 0, 0, 0];
        this.isComplete = false;
        
        // Loading step configurations
        this.steps = [
            { id: 'loading-step-1', name: '3D Renderer', weight: 15 },
            { id: 'loading-step-2', name: 'Module Systems', weight: 20 },
            { id: 'loading-step-3', name: 'Avatar Systems', weight: 20 },
            { id: 'loading-step-4', name: 'Chat Bubbles', weight: 15 },
            { id: 'loading-step-5', name: 'Server Connection', weight: 20 },
            { id: 'loading-step-6', name: 'Finalization', weight: 10 }
        ];
        
        this.startTime = Date.now();
        this.setupLoadingAnimation();
    }
    
    setupLoadingAnimation() {
        // Add some dynamic loading tips
        this.rotateTips();
    }
    
    rotateTips() {
        const tips = [
            'Use mouse or touch to rotate and zoom the camera',
            'Click the hamburger menu (☰) for all available actions', 
            'Chat messages appear as 3D bubbles above avatars',
            'Try keyboard shortcuts: W = Wave, D = Dance, E = Emotions',
            'Add pets for companionship in your 3D space',
            'Create groups for collaborative activities',
            'Customize your avatar appearance and animations',
            'Use emotions to express yourself in 3D space'
        ];
        
        const tipElements = document.querySelectorAll('.loading-tip');
        let tipIndex = 4; // Start after the initial 4 tips
        
        if (tipElements.length >= 4) {
            setInterval(() => {
                if (this.isComplete) return;
                
                const randomTip = tips[Math.floor(Math.random() * tips.length)];
                const tipElement = tipElements[Math.min(tipIndex % tipElements.length, tipElements.length - 1)];
                
                if (tipElement) {
                    tipElement.style.opacity = '0';
                    setTimeout(() => {
                        tipElement.innerHTML = `💡${randomTip}`;
                        tipElement.style.opacity = '1';
                    }, 300);
                }
                
                tipIndex++;
            }, 3000);
        }
    }
    
    updateStep(stepIndex, progress = 100, message = null) {
        if (stepIndex < 0 || stepIndex >= this.totalSteps) return;
        
        this.stepProgress[stepIndex] = Math.min(100, Math.max(0, progress));
        
        // Update step visual state
        const stepElement = document.getElementById(this.steps[stepIndex].id);
        if (stepElement) {
            stepElement.classList.remove('pending', 'current', 'completed');
            
            if (progress >= 100) {
                stepElement.classList.add('completed');
                stepElement.querySelector('.loading-step-icon').textContent = '✓';
            } else if (progress > 0) {
                stepElement.classList.add('current');
            } else {
                stepElement.classList.add('pending');
            }
            
            // Update message if provided
            if (message) {
                const textElement = stepElement.querySelector('div:last-child');
                if (textElement) {
                    textElement.textContent = message;
                }
            }
        }
        
        this.updateOverallProgress();
    }
    
    updateOverallProgress() {
        let totalProgress = 0;
        
        for (let i = 0; i < this.totalSteps; i++) {
            const stepWeight = this.steps[i].weight / 100;
            totalProgress += (this.stepProgress[i] / 100) * stepWeight;
        }
        
        const percentage = Math.round(totalProgress * 100);
        
        // Update progress bar
        const progressFill = document.getElementById('loading-progress-fill');
        const progressPercentage = document.getElementById('loading-percentage');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${percentage}%`;
        }
        
        // Check if loading is complete
        if (percentage >= 100 && !this.isComplete) {
            this.completeLoading();
        }
    }
    
    completeLoading() {
        this.isComplete = true;
        const loadTime = (Date.now() - this.startTime) / 1000;
        
        console.log(`🎉 Loading completed in ${loadTime.toFixed(1)}s`);
        
        // Final step animation
        setTimeout(() => {
            this.hideLoadingScreen();
        }, 1000);
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 800);
        }
    }
    
    // Simulate loading progress for demonstration
    simulateProgress() {
        const steps = [
            { step: 0, delay: 500, message: 'Loading Three.js and WebGL context...' },
            { step: 1, delay: 800, message: 'Initializing core systems...' },
            { step: 2, delay: 600, message: 'Setting up avatar animations...' },
            { step: 3, delay: 700, message: 'Configuring 3D chat interface...' },
            { step: 4, delay: 900, message: 'Establishing server connection...' },
            { step: 5, delay: 400, message: 'Ready to enter 3D space!' }
        ];
        
        let currentIndex = 0;
        
        const processNextStep = () => {
            if (currentIndex >= steps.length) return;
            
            const { step, delay, message } = steps[currentIndex];
            
            this.updateStep(step, 100, message);
            
            currentIndex++;
            
            if (currentIndex < steps.length) {
                setTimeout(processNextStep, delay);
            }
        };
        
        setTimeout(processNextStep, 300);
    }
}

// Initialize loading manager
window.LoadingManager = null;

// Enhanced WebSocket Manager for Rust Server Integration
class EuphorieWebSocketManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.authenticated = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = [];
        this.typingTimer = null;
        this.isTyping = false;
        this.lastPingTime = 0;
        
        // Generate user ID if not provided
        this.userId = window.ROOM_CONFIG?.userId || 'guest_' + Math.random().toString(36).substr(2, 9);
        this.username = window.ROOM_CONFIG?.username || 'Guest';
        this.roomId = window.ROOM_CONFIG?.roomId;
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.send = this.send.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);
        
        console.log('🔌 WebSocket Manager initialized');
    }
    
    connect() {
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
            return;
        }
        
        try {
            const url = window.ROOM_CONFIG?.rustWebSocketUrl;
            console.log(`🔌 Connecting to Rust WebSocket: ${url}`);
            this.updateConnectionStatus('connecting');
            
            this.socket = new WebSocket(url);
            this.socket.onopen = this.handleOpen;
            this.socket.onmessage = this.handleMessage;
            this.socket.onclose = this.handleClose;
            this.socket.onerror = this.handleError;
            
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }
    
    handleOpen(event) {
        console.log('✅ Connected to Rust WebSocket server');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('connected');
        
        // Send authentication message
        this.send({
            type: 'auth',
            user_id: this.userId,
            room_id: this.roomId,
            username: this.username,
            timestamp: Date.now()
        });
        
        // Send queued messages
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
        
        // Start ping interval
        this.startPingInterval();
    }
    
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Received message:', data);
            
            switch (data.type) {
                case 'auth_success':
                    this.authenticated = true;
                    console.log(`✅ Authentication successful for room: ${data.room_id}`);
                    this.addSystemMessage(`Connected to ${data.room_info ? data.room_info.name : 'room'}`);
                    this.enableChatInput();
                    break;
                    
                case 'auth_error':
                    console.error(`❌ Authentication failed: ${data.error}`);
                    this.addSystemMessage(`Authentication failed: ${data.error}`);
                    break;
                    
                case 'chat_message':
                    this.handleChatMessage(data);
                    break;
                    
                case 'user_joined':
                    console.log(`👋 ${data.username} joined the room`);
                    this.addSystemMessage(`${data.username} joined the room`);
                    break;
                    
                case 'user_left':
                    console.log(`👋 ${data.username} left the room`);
                    this.addSystemMessage(`${data.username} left the room`);
                    break;
                    
                case 'emotion':
                    this.handleEmotion(data);
                    break;
                    
                case 'interaction':
                    this.handleInteraction(data);
                    break;
                    
                case 'typing':
                    this.handleTyping(data);
                    break;
                    
                case 'pong':
                    const latency = Date.now() - this.lastPingTime;
                    console.log(`🏓 Pong received (${latency}ms)`);
                    break;
                    
                case 'system':
                    this.addSystemMessage(data.message);
                    break;
                    
                case 'error':
                    console.error(`❌ Server error: ${data.error}`);
                    this.addSystemMessage(`Error: ${data.error}`);
                    break;
                    
                default:
                    console.log(`🔍 Unknown message type: ${data.type}`);
            }
            
        } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
        }
    }
    
    handleChatMessage(data) {
        const isOwn = data.user_id === this.userId;
        this.addMessageToChat(data.username, data.message, isOwn);
        
        // Create 3D chat bubble if enabled and system is available
        if (window.ROOM_CONFIG?.chatBubblesEnabled && window.ChatBubbleSystem) {
            try {
                // Use the safe wrapper method
                if (window.ChatBubbleSystem.createBubbleFromMessageSafe) {
                    window.ChatBubbleSystem.createBubbleFromMessageSafe(data);
                } else if (window.ChatBubbleSystem.createBubbleFromMessage) {
                    window.ChatBubbleSystem.createBubbleFromMessage(data);
                }
            } catch (error) {
                console.warn('Error creating chat bubble:', error);
            }
        }
        
        // Update bubble count
        this.updateBubbleCount();
    }
    
    handleEmotion(data) {
        console.log(`🎭 ${data.user_id} is feeling ${data.emotion}`);
        this.addSystemMessage(`${data.user_id} is feeling ${data.emotion} 🎭`);
        
        // Trigger 3D emotion if system is available
        if (window.EmotionSystem && window.EmotionSystem.showRemoteEmotion) {
            window.EmotionSystem.showRemoteEmotion(data.user_id, data.emotion);
        }
    }
    
    handleInteraction(data) {
        console.log(`🤝 Interaction: ${data.user_id} -> ${data.interaction_type}`);
        this.addSystemMessage(`${data.user_id} ${data.interaction_type} 🤝`);
        
        // Trigger 3D interaction if system is available
        if (window.InteractionSystem && window.InteractionSystem.handleRemoteInteraction) {
            window.InteractionSystem.handleRemoteInteraction(data);
        }
    }
    
    handleTyping(data) {
        this.updateTypingIndicator(data.user_id, data.username, data.is_typing);
    }
    
    handleClose(event) {
        console.log('🔌 WebSocket connection closed:', event);
        this.connected = false;
        this.authenticated = false;
        this.updateConnectionStatus('disconnected');
        this.disableChatInput();
        
        if (!event.wasClean) {
            this.scheduleReconnect();
        }
    }
    
    handleError(error) {
        console.error('❌ WebSocket error:', error);
        this.updateConnectionStatus('disconnected');
    }
    
    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.addSystemMessage(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateConnectionStatus('disconnected');
            this.addSystemMessage('Connection failed. Please refresh the page.');
        }
    }
    
    send(data) {
        if (this.connected && this.socket.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(JSON.stringify(data));
                console.log('📤 Sent message:', data.type);
            } catch (error) {
                console.error('❌ Error sending message:', error);
            }
        } else {
            console.log('📦 Queuing message (not connected):', data.type);
            this.messageQueue.push(data);
        }
    }
    
    sendChatMessage(message) {
        if (!this.authenticated) {
            console.warn('❌ Not authenticated');
            return;
        }
        
        this.send({
            type: 'chat_message',
            message: message,
            user_id: this.userId,
            room_id: this.roomId,
            timestamp: Date.now()
        });
    }
    
    sendEmotion(emotion) {
        if (!this.authenticated) return;
        
        this.send({
            type: 'emotion',
            user_id: this.userId,
            room_id: this.roomId,
            emotion: emotion,
            timestamp: Date.now()
        });
    }
    
    sendInteraction(interactionType, targetUserId = null, data = null) {
        if (!this.authenticated) return;
        
        this.send({
            type: 'interaction',
            user_id: this.userId,
            room_id: this.roomId,
            target_user_id: targetUserId,
            interaction_type: interactionType,
            data: data,
            timestamp: Date.now()
        });
    }
    
    sendTyping(isTyping) {
        if (!this.authenticated) return;
        
        this.send({
            type: 'typing',
            user_id: this.userId,
            room_id: this.roomId,
            is_typing: isTyping
        });
    }
    
    startPingInterval() {
        setInterval(() => {
            if (this.connected) {
                this.lastPingTime = Date.now();
                this.send({
                    type: 'ping',
                    timestamp: this.lastPingTime
                });
            }
        }, 30000); // Ping every 30 seconds
    }
    
    updateConnectionStatus(status) {
        const indicators = ['connection-indicator', 'connection-indicator-mobile'];
        
        indicators.forEach(id => {
            const indicator = document.getElementById(id);
            if (indicator) {
                indicator.className = `connection-indicator ${status}`;
                
                switch (status) {
                    case 'connected':
                        indicator.textContent = '✅ Connected';
                        break;
                    case 'connecting':
                        indicator.textContent = '🔄 Connecting';
                        break;
                    case 'disconnected':
                        indicator.textContent = '❌ Disconnected';
                        break;
                }
            }
        });
    }
    
    enableChatInput() {
        const inputs = ['chat-input', 'chat-input-mobile'];
        const buttons = ['send-btn', 'send-btn-mobile'];
        
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.disabled = false;
                input.placeholder = 'Type a message...';
            }
        });
        
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = false;
            }
        });
    }
    
    disableChatInput() {
        const inputs = ['chat-input', 'chat-input-mobile'];
        const buttons = ['send-btn', 'send-btn-mobile'];
        
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.disabled = true;
                input.placeholder = 'Connecting...';
            }
        });
        
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = true;
            }
        });
    }
    
    addMessageToChat(username, message, isOwn = false) {
        const chatContainers = ['chat-messages', 'chat-messages-mobile'];
        
        chatContainers.forEach(containerId => {
            const chatMessages = document.getElementById(containerId);
            if (!chatMessages) return;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${isOwn ? 'own' : ''}`;
            
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            messageDiv.innerHTML = `
                <div class="username">${this.escapeHtml(username)}</div>
                <div class="timestamp">${timestamp}</div>
                <div class="text">${this.escapeHtml(message)}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Keep only last 50 messages for performance
            while (chatMessages.children.length > 50) {
                chatMessages.removeChild(chatMessages.firstChild);
            }
        });
    }
    
    addSystemMessage(message) {
        const chatContainers = ['chat-messages', 'chat-messages-mobile'];
        
        chatContainers.forEach(containerId => {
            const chatMessages = document.getElementById(containerId);
            if (!chatMessages) return;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message system';
            
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            messageDiv.innerHTML = `
                <div class="username">System</div>
                <div class="timestamp">${timestamp}</div>
                <div class="text">${this.escapeHtml(message)}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }
    
    updateTypingIndicator(userId, username, isTyping) {
        const containers = ['typing-indicators', 'typing-indicators-mobile'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            const indicatorId = `typing-${userId}-${containerId}`;
            let indicator = document.getElementById(indicatorId);
            
            if (isTyping && userId !== this.userId) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = indicatorId;
                    indicator.className = 'typing-indicator';
                    indicator.innerHTML = `
                        <span>${this.escapeHtml(username)} is typing</span>
                        <div class="typing-dots">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    `;
                    container.appendChild(indicator);
                }
            } else {
                if (indicator) {
                    indicator.remove();
                }
            }
        });
    }
    
    updateBubbleCount() {
        let count = 0;
        if (window.ChatBubbleSystem && window.ChatBubbleSystem.getActiveBubbleCount) {
            try {
                count = window.ChatBubbleSystem.getActiveBubbleCount();
            } catch (error) {
                console.warn('Error getting bubble count:', error);
            }
        }
        
        const bubbleCountElement = document.getElementById('bubble-count');
        if (bubbleCountElement) {
            bubbleCountElement.textContent = count;
        }
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize WebSocket Manager
window.WebSocketManager = null;

// Clean integration setup that works with the fixed ChatBubbleSystem
function setupChatBubbleWebSocketIntegration() {
    console.log('🔗 Setting up ChatBubble WebSocket integration...');
    
    let integrationAttempts = 0;
    const maxAttempts = 10;
    
    function attemptIntegration() {
        integrationAttempts++;
        
        if (integrationAttempts > maxAttempts) {
            console.warn('❌ Max integration attempts reached');
            return;
        }
        
        // Check if required systems are available
        if (!window.WebSocketManager) {
            console.log(`🔗 Attempt ${integrationAttempts}: WebSocketManager not ready`);
            setTimeout(attemptIntegration, 500);
            return;
        }
        
        if (!window.ChatBubbleSystem) {
            console.log(`🔗 Attempt ${integrationAttempts}: ChatBubbleSystem not ready`);
            setTimeout(attemptIntegration, 500);
            return;
        }
        
        // Check if ChatBubbleSystem is initialized
        if (!window.ChatBubbleSystem.isInitialized) {
            console.log(`🔗 Attempt ${integrationAttempts}: ChatBubbleSystem not initialized`);
            
            // Try to initialize it
            if (window.ChatBubbleSystem.init) {
                try {
                    window.ChatBubbleSystem.init();
                } catch (error) {
                    console.log('ChatBubbleSystem init in progress...');
                }
            }
            
            setTimeout(attemptIntegration, 500);
            return;
        }
        
        // Integration successful
        console.log('✅ ChatBubble WebSocket integration completed');
        
        // Start periodic bubble count updates
        setInterval(() => {
            try {
                if (window.WebSocketManager && window.WebSocketManager.updateBubbleCount) {
                    window.WebSocketManager.updateBubbleCount();
                }
            } catch (error) {
                console.warn('Error updating bubble count:', error);
            }
        }, 5000);
    }
    
    // Start integration attempts
    attemptIntegration();
}

// Fixed Module Loader for ChatBubbleSystem
class EuphorieModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
        this.initializationCallbacks = new Map();
        
        // Define system dependencies
        this.dependencies = {
            'globals': [],
            'event-bus': ['globals'],
            'scene-manager': ['globals', 'event-bus'],
            'avatar-system': ['globals', 'event-bus', 'scene-manager'],
            'chat-bubble-system': ['globals', 'event-bus', 'scene-manager', 'avatar-system'],
            'interaction-system': ['globals', 'event-bus', 'avatar-system'],
            'emotion-system': ['globals', 'event-bus', 'avatar-system'],
            'pet-system': ['globals', 'event-bus', 'scene-manager', 'avatar-system'],
            'group-interaction-system': ['globals', 'event-bus', 'avatar-system', 'interaction-system'],
            'advanced-scene-system': ['globals', 'event-bus', 'scene-manager'],
            'room-core': ['globals', 'event-bus', 'scene-manager', 'avatar-system', 'interaction-system']
        };
        
        // Map module names to file paths
        this.modulePaths = {
            'globals': '/static/js/core/globals.js',
            'event-bus': '/static/js/core/event-bus.js',
            'scene-manager': '/static/js/systems/scene-manager.js',
            'avatar-system': '/static/js/systems/avatar-system.js',
            'chat-bubble-system': '/static/js/systems/chat-bubble-system.js?v=' + Date.now(),
            'interaction-system': '/static/js/systems/interaction-system.js',
            'emotion-system': '/static/js/systems/emotion-system.js',
            'pet-system': '/static/js/systems/pet-system.js',
            'group-interaction-system': '/static/js/systems/group-interaction-system.js',
            'advanced-scene-system': '/static/js/systems/advanced-scene-system.js',
            'room-core': '/static/js/room-core.js'
        };
        
        // FIXED: Updated module objects to handle new ChatBubbleSystem pattern
        this.moduleObjects = {
            'globals': () => window.Euphorie,
            'event-bus': () => window.EventBus,
            'scene-manager': () => window.SceneManager,
            'avatar-system': () => window.AvatarSystem,
            'chat-bubble-system': () => this.getChatBubbleSystemInstance(),
            'interaction-system': () => window.InteractionSystem,
            'emotion-system': () => window.EmotionSystem,
            'pet-system': () => window.PetSystem,
            'group-interaction-system': () => window.GroupInteractionSystem,
            'advanced-scene-system': () => window.AdvancedSceneSystem,
            'room-core': () => window.RoomCore
        };
        
        // Special initialization handlers for complex modules
        this.initializationCallbacks.set('chat-bubble-system', () => this.initializeChatBubbleSystem());
    }
    
    // CRITICAL FIX: Smart ChatBubbleSystem instance getter
    getChatBubbleSystemInstance() {
        // Try multiple patterns to get the ChatBubbleSystem
        
        // 1. Try the singleton instance first
        if (window.ChatBubbleSystem && typeof window.ChatBubbleSystem.init === 'function') {
            return window.ChatBubbleSystem;
        }
        
        // 2. Try to get instance from class
        if (window.ChatBubbleSystemClass && typeof window.ChatBubbleSystemClass.getInstance === 'function') {
            try {
                const instance = window.ChatBubbleSystemClass.getInstance();
                if (instance) {
                    // Also set it as the global instance for consistency
                    window.ChatBubbleSystem = instance;
                    return instance;
                }
            } catch (error) {
                console.warn('Could not get ChatBubbleSystem instance from class:', error);
            }
        }
        
        // 3. Return null if nothing is available
        console.warn('No ChatBubbleSystem implementation found');
        return null;
    }
    
    // CRITICAL FIX: Special initialization for ChatBubbleSystem
    async initializeChatBubbleSystem() {
        console.log('🔧 Initializing ChatBubbleSystem...');
        
        try {
            const chatSystem = this.getChatBubbleSystemInstance();
            
            if (!chatSystem) {
                console.warn('ChatBubbleSystem not available for initialization');
                return;
            }
            
            // Check if already initialized
            if (chatSystem.isInitialized) {
                console.log('✅ ChatBubbleSystem already initialized');
                return;
            }
            
            // Try to initialize with proper error handling
            if (typeof chatSystem.init === 'function') {
                await this.safeInitialize(chatSystem, 'ChatBubbleSystem');
            } else if (typeof chatSystem.initSafe === 'function') {
                await this.safeInitialize(chatSystem, 'ChatBubbleSystem', 'initSafe');
            } else {
                console.warn('ChatBubbleSystem has no init method');
            }
            
        } catch (error) {
            console.warn('Error initializing ChatBubbleSystem:', error);
        }
    }
    
    // Safe initialization wrapper
    async safeInitialize(moduleObj, moduleName, methodName = 'init') {
        return new Promise((resolve) => {
            try {
                const result = moduleObj[methodName]();
                
                // If it returns a promise, wait for it
                if (result && typeof result.then === 'function') {
                    result.then(() => {
                        console.log(`✅ ${moduleName} initialized successfully`);
                        resolve();
                    }).catch((error) => {
                        console.warn(`⚠️ ${moduleName} initialization had issues:`, error);
                        resolve(); // Still resolve to continue loading
                    });
                } else {
                    console.log(`✅ ${moduleName} initialized successfully`);
                    resolve();
                }
                
            } catch (error) {
                console.warn(`⚠️ Could not initialize ${moduleName}:`, error);
                resolve(); // Still resolve to continue loading
            }
        });
    }
    
    async loadModule(moduleName) {
        // Return if already loaded
        if (this.loadedModules.has(moduleName)) {
            return Promise.resolve();
        }
        
        // Return existing promise if currently loading
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }
        
        // Load dependencies first
        const deps = this.dependencies[moduleName] || [];
        await Promise.all(deps.map(dep => this.loadModule(dep)));
        
        // Create loading promise
        const loadingPromise = this.loadScript(this.modulePaths[moduleName])
            .then(() => {
                this.loadedModules.add(moduleName);
                console.log(`✅ Module loaded: ${moduleName}`);
                this.updateLoadingStep(moduleName);
                
                // Run any pending initialization callbacks
                const callback = this.initializationCallbacks.get(moduleName);
                if (callback) {
                    return callback();
                }
            })
            .catch((error) => {
                // If external file loading fails, continue without error for most modules
                if (moduleName === 'chat-bubble-system') {
                    console.warn(`⚠️ External ChatBubbleSystem failed to load, using embedded version`);
                    // For chat-bubble-system, we have the embedded version in the HTML
                    this.loadedModules.add(moduleName);
                    const callback = this.initializationCallbacks.get(moduleName);
                    if (callback) {
                        return callback();
                    }
                } else {
                    console.warn(`⚠️ Could not load external module: ${moduleName}`);
                    this.loadedModules.add(moduleName);
                }
                return Promise.resolve();
            });
            
        this.loadingPromises.set(moduleName, loadingPromise);
        return loadingPromise;
    }
    
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script already exists
            const existingScript = document.querySelector(`script[src*="${src.split('?')[0]}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Maintain execution order
            
            script.onload = () => resolve();
            script.onerror = () => {
                console.warn(`Could not load ${src} - continuing without it`);
                resolve(); // Resolve instead of reject to continue
            };
            
            document.head.appendChild(script);
        });
    }
    
    async initializeModule(moduleName) {
        const moduleGetter = this.moduleObjects[moduleName];
        if (!moduleGetter) {
            console.warn(`No module object defined for ${moduleName}`);
            return;
        }
        
        const moduleObj = moduleGetter();
        if (!moduleObj) {
            console.warn(`Module ${moduleName} not available`);
            return;
        }
        
        // Special handling for ChatBubbleSystem
        if (moduleName === 'chat-bubble-system') {
            // Already handled in initializeChatBubbleSystem
            return;
        }
        
        if (typeof moduleObj.init === 'function') {
            try {
                await this.safeInitialize(moduleObj, moduleName);
            } catch (error) {
                console.warn(`⚠️ Could not initialize ${moduleName}:`, error.message);
            }
        } else {
            console.log(`📦 Module ${moduleName} loaded (no init method)`);
        }
    }
    
    async loadAllModules() {
        const moduleNames = Object.keys(this.dependencies);
        console.log('🚀 Loading all Euphorie modules...');
        
        // Update loading screen
        this.updateLoadingStep('starting');
        
        // Load all modules (dependencies will be resolved automatically)
        await Promise.all(moduleNames.map(name => this.loadModule(name)));
        
        console.log('📦 All modules loaded, starting initialization...');
        this.updateLoadingStep('initializing');
        
        // Initialize modules in dependency order
        const initOrder = this.getInitializationOrder();
        for (const moduleName of initOrder) {
            await this.initializeModule(moduleName);
            // Small delay to prevent initialization conflicts
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log('🎉 All Euphorie modules initialized!');
        this.updateLoadingStep('complete');
        
        return this;
    }
    
    getInitializationOrder() {
        const order = [];
        const visited = new Set();
        const visiting = new Set();
        
        const visit = (moduleName) => {
            if (visited.has(moduleName)) return;
            if (visiting.has(moduleName)) {
                console.warn(`Circular dependency detected: ${moduleName}`);
                return;
            }
            
            visiting.add(moduleName);
            const deps = this.dependencies[moduleName] || [];
            deps.forEach(dep => visit(dep));
            visiting.delete(moduleName);
            visited.add(moduleName);
            order.push(moduleName);
        };
        
        Object.keys(this.dependencies).forEach(visit);
        return order;
    }
    
    updateLoadingStep(step) {
        const stepMap = {
            'starting': 1,
            'globals': 2,
            'scene-manager': 3,
            'avatar-system': 3,
            'chat-bubble-system': 4,
            'initializing': 5,
            'complete': 6
        };
        
        const stepNumber = stepMap[step] || 2;
        
        // Update loading steps in UI
        for (let i = 1; i <= 6; i++) {
            const stepElement = document.getElementById(`loading-step-${i}`);
            if (stepElement) {
                stepElement.classList.remove('current', 'completed');
                if (i < stepNumber) {
                    stepElement.classList.add('completed');
                } else if (i === stepNumber) {
                    stepElement.classList.add('current');
                }
            }
        }
    }
    
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }
    
    getModuleObject(moduleName) {
        const getter = this.moduleObjects[moduleName];
        return getter ? getter() : null;
    }
}

// GLOBAL FUNCTIONS & SYSTEM INTEGRATION
class EuphorieGlobalFunctions {
    constructor(loader) {
        this.loader = loader;
        this.setupGlobalFunctions();
    }
    
    setupGlobalFunctions() {
        // Quick Actions
        window.triggerWave = () => this.executeWithFallback(
            () => this.loader.getModuleObject('interaction-system')?.triggerInteraction?.('wave'),
            'Wave gesture',
            '👋 You wave!'
        );
        
        window.triggerDance = () => this.executeWithFallback(
            () => this.loader.getModuleObject('interaction-system')?.triggerInteraction?.('dance'),
            'Dance animation',
            '💃 You dance!'
        );
        
        // Emotions
        window.showEmotionPanel = () => this.executeWithFallback(
            () => this.loader.getModuleObject('emotion-system')?.showEmotionPanel?.(),
            'Emotion panel',
            '🎭 Opening emotions...'
        );
        
        window.triggerEmotion = (emotion) => this.executeWithFallback(
            () => {
                // Send via WebSocket if available
                if (window.sendEmotion) {
                    window.sendEmotion(emotion);
                }
                // Also trigger local emotion system
                this.loader.getModuleObject('emotion-system')?.triggerEmotion?.(emotion);
            },
            'Emotion trigger',
            `🎭 Feeling ${emotion}!`
        );
        
        // Groups
        window.showGroupMenu = () => this.executeWithFallback(
            () => this.loader.getModuleObject('group-interaction-system')?.showGroupActivityMenu?.(),
            'Group menu',
            '👥 Group activities loading...'
        );
        
        // Avatar
        window.customizeAvatar = () => this.executeWithFallback(
            () => this.loader.getModuleObject('room-core')?.showAvatarCustomizationPanel?.(),
            'Avatar customization',
            '👤 Avatar customization loading...'
        );
        
        // Pets
        window.addRandomPet = () => this.executeWithFallback(
            () => {
                const petSystem = this.loader.getModuleObject('pet-system');
                if (petSystem && petSystem.assignRandomPet) {
                    const pet = petSystem.assignRandomPet('default');
                    if (pet && pet.options) {
                        this.showNotification(`🐾 ${pet.options.name} joined you!`);
                    } else {
                        this.showNotification('🐾 A new pet joined you!');
                    }
                    return pet;
                }
            },
            'Pet system',
            '🐾 Getting you a pet...'
        );
        
        window.togglePetPanel = () => this.executeWithFallback(
            () => {
                const petPanel = document.getElementById('pet-panel');
                if (petPanel) {
                    const isVisible = petPanel.style.display !== 'none';
                    petPanel.style.display = isVisible ? 'none' : 'block';
                    this.showNotification(isVisible ? '🎪 Pet panel hidden' : '🎪 Pet panel shown');
                }
            },
            'Pet panel',
            '🎪 Pet panel loading...'
        );
        
        // Friends
        window.addFriends = () => this.executeWithFallback(
            () => this.loader.getModuleObject('room-core')?.addRandomFriends?.(),
            'Friend system',
            '👥 Adding friends...'
        );
        
        // Environment
        window.changeScene = () => this.executeWithFallback(
            () => {
                const advancedScene = this.loader.getModuleObject('advanced-scene-system');
                const roomCore = this.loader.getModuleObject('room-core');
                
                if (advancedScene && advancedScene.showEnvironmentSelector) {
                    advancedScene.showEnvironmentSelector();
                } else if (roomCore && roomCore.changeScene) {
                    roomCore.changeScene();
                } else {
                    this.showNotification('🏠 Scene system loading...');
                }
            },
            'Scene system',
            '🏠 Changing environment...'
        );
        
        window.controlWeather = () => this.executeWithFallback(
            () => this.loader.getModuleObject('advanced-scene-system')?.showWeatherSelector?.(),
            'Weather system',
            '🌦️ Weather controls loading...'
        );
        
        window.controlTime = () => this.executeWithFallback(
            () => this.loader.getModuleObject('advanced-scene-system')?.showTimeOfDaySelector?.(),
            'Time system',
            '🌅 Time controls loading...'
        );
        
        window.toggleMagic = () => this.executeWithFallback(
            () => this.loader.getModuleObject('room-core')?.toggleMagicEffects?.(),
            'Magic system',
            '✨ Magic effects loading...'
        );
        
        // Chat functions
        window.toggleMobileChat = () => this.toggleMobilePanel('mobile-chat-panel', 'expanded');
        window.toggleChatMinimize = () => this.toggleDesktopPanel('chat-panel', 'minimized');
        
        // Menu functions
        window.toggleMobileMenu = () => this.toggleMobileMenu();
        window.closeMobileMenu = () => this.closeMobileMenu();
        window.toggleDesktopMenu = () => this.toggleDesktopMenu();
        window.closeDesktopMenu = () => this.closeDesktopMenu();
        
        console.log('🔧 Global functions configured');
    }
    
    executeWithFallback(primaryFunction, systemName, fallbackMessage) {
        try {
            const result = primaryFunction();
            if (result === undefined || result === null) {
                console.log(`${systemName} not ready yet, showing fallback`);
                this.showNotification(fallbackMessage);
            }
            return result;
        } catch (error) {
            console.warn(`${systemName} not available:`, error.message);
            this.showNotification(fallbackMessage);
            return null;
        }
    }
    
    showNotification(message) {
        // Enhanced fallback notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));
            backdrop-filter: blur(15px);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            z-index: 10000;
            max-width: 350px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.2);
            font-weight: 600;
            font-size: 14px;
            transform: translateX(400px);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Animate out
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }, 4000);
    }
    
    toggleMobilePanel(panelId, toggleClass) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.toggle(toggleClass);
        }
    }
    
    toggleDesktopPanel(panelId, toggleClass) {
        const panel = document.getElementById(panelId);
        const restoreHint = document.getElementById('chat-restore-hint');
        
        if (panel) {
            const isMinimized = panel.classList.toggle(toggleClass);
            if (restoreHint) {
                restoreHint.style.display = isMinimized ? 'block' : 'none';
            }
        }
    }
    
    toggleMobileMenu() {
        const hamburger = document.querySelector('.mobile-hamburger');
        const overlay = document.querySelector('.mobile-menu-overlay');
        const menu = document.querySelector('.mobile-actions-menu');
        
        const isOpen = hamburger?.classList.contains('active');
        
        if (isOpen) {
            this.closeMobileMenu();
        } else {
            hamburger?.classList.add('active');
            overlay?.classList.add('active');
            menu?.classList.add('active');
            document.body.classList.add('menu-open');
        }
    }
    
    closeMobileMenu() {
        document.querySelector('.mobile-hamburger')?.classList.remove('active');
        document.querySelector('.mobile-menu-overlay')?.classList.remove('active');
        document.querySelector('.mobile-actions-menu')?.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
    
    toggleDesktopMenu() {
        const hamburger = document.querySelector('.desktop-hamburger');
        const menu = document.querySelector('.desktop-actions-menu');
        
        const isOpen = hamburger?.classList.contains('active');
        
        if (isOpen) {
            this.closeDesktopMenu();
        } else {
            hamburger?.classList.add('active');
            menu?.classList.add('active');
        }
    }
    
    closeDesktopMenu() {
        document.querySelector('.desktop-hamburger')?.classList.remove('active');
        document.querySelector('.desktop-actions-menu')?.classList.remove('active');
    }
}

// MAIN INITIALIZATION SYSTEM
class EuphorieInitializer {
    constructor() {
        this.loader = null;
        this.globalFunctions = null;
        this.isInitialized = false;
    }
    
    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🚀 Starting Euphorie 3D Platform modular system...');
        
        try {
            // Step 1: Load all modules
            this.loader = new EuphorieModuleLoader();
            await this.loader.loadAllModules();
            
            // Step 2: Setup global functions
            this.globalFunctions = new EuphorieGlobalFunctions(this.loader);
            
            // Step 3: Final setup
            await this.finalSetup();
            
            this.isInitialized = true;
            console.log('🎉 Euphorie 3D Platform modular system initialized!');
            
            // Hide loading screen after everything is ready
            this.hideLoadingScreen();
            
        } catch (error) {
            console.warn('⚠️ Some Euphorie modules failed to load:', error.message);
            // Still hide loading screen and continue with available functionality
            this.hideLoadingScreen();
        }
    }
    
    async finalSetup() {
        // Setup responsive layout
        this.setupResponsiveLayout();
        
        // Setup global event handlers
        this.setupGlobalEvents();
        
        // Update UI counters
        this.updateAllCounters();
        
        // Start periodic updates
        this.startPeriodicUpdates();
    }
    
    setupResponsiveLayout() {
        const isMobile = window.innerWidth <= 768;
        
        // Configure for mobile/desktop
        if (isMobile) {
            document.body.classList.add('mobile-layout');
            console.log('📱 Mobile layout configured');
        } else {
            document.body.classList.add('desktop-layout');
            console.log('💻 Desktop layout configured');
        }
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.setupResponsiveLayout();
                this.updateAllCounters();
            }, 500);
        });
    }
    
    setupGlobalEvents() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('👁️ Page hidden - reducing activity');
            } else {
                console.log('👁️ Page visible - resuming activity');
                this.updateAllCounters();
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateAllCounters();
        });
    }
    
    updateAllCounters() {
        // Update status panel counters
        this.updateCounter('user-count', this.getActiveUserCount());
        this.updateCounter('bubble-count', this.getActiveBubbleCount());
        this.updateCounter('pet-count', this.getActivePetCount());
        this.updateCounter('group-count', this.getActiveGroupCount());
    }
    
    updateCounter(elementId, count) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = count;
        }
    }
    
    getActiveUserCount() {
        const avatarSystem = this.loader?.getModuleObject('avatar-system');
        if (avatarSystem && avatarSystem.getAllAvatars) {
            try {
                return avatarSystem.getAllAvatars().length;
            } catch (error) {
                return 1;
            }
        }
        return 1;
    }
    
    getActiveBubbleCount() {
        if (window.ChatBubbleSystem?.getActiveBubbleCount) {
            try {
                return window.ChatBubbleSystem.getActiveBubbleCount();
            } catch (error) {
                return 0;
            }
        }
        return 0;
    }
    
    getActivePetCount() {
        const petSystem = this.loader?.getModuleObject('pet-system');
        if (petSystem && petSystem.getAllPets) {
            try {
                return petSystem.getAllPets().length;
            } catch (error) {
                return 0;
            }
        }
        return 0;
    }
    
    getActiveGroupCount() {
        const groupSystem = this.loader?.getModuleObject('group-interaction-system');
        if (groupSystem && groupSystem.getActiveGroups) {
            try {
                return groupSystem.getActiveGroups().length;
            } catch (error) {
                return 0;
            }
        }
        return 0;
    }
    
    startPeriodicUpdates() {
        // Update counters every 5 seconds
        setInterval(() => {
            this.updateAllCounters();
        }, 5000);
    }
    
    hideLoadingScreen() {
        // Use the LoadingManager's hide method if available
        if (window.LoadingManager && window.LoadingManager.hideLoadingScreen) {
            window.LoadingManager.hideLoadingScreen();
        } else {
            // Fallback method
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.opacity = '0';
                loadingScreen.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 800);
            }
        }
    }
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', () => {
    // Initialize enhanced loading system
    window.LoadingManager = new LoadingManager();
    
    // Start loading simulation for demonstration
    // In production, you'd call updateStep() as real loading progresses
    if (window.LoadingManager) {
        window.LoadingManager.simulateProgress();
    }
    
    // Initialize WebSocket connection
    window.WebSocketManager = new EuphorieWebSocketManager();
    
    // Setup chat input handlers for both desktop and mobile
    const setupChatHandlers = (inputId, btnId) => {
        const chatInput = document.getElementById(inputId);
        const sendBtn = document.getElementById(btnId);
        
        if (chatInput && sendBtn) {
            let typingTimer;
            let isTyping = false;
            
            // Send message function
            const sendMessage = () => {
                const message = chatInput.value.trim();
                if (!message || !window.WebSocketManager.authenticated) return;
                
                window.WebSocketManager.sendChatMessage(message);
                chatInput.value = '';
                
                // Stop typing indicator
                if (isTyping) {
                    window.WebSocketManager.sendTyping(false);
                    isTyping = false;
                }
            };
            
            // Typing indicator logic
            chatInput.addEventListener('input', () => {
                if (!isTyping && window.WebSocketManager.authenticated) {
                    window.WebSocketManager.sendTyping(true);
                    isTyping = true;
                }
                
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => {
                    if (isTyping) {
                        window.WebSocketManager.sendTyping(false);
                        isTyping = false;
                    }
                }, 2000);
            });
            
            // Send on Enter
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage();
                }
            });
            
            // Send on button click
            sendBtn.addEventListener('click', sendMessage);
        }
    };
    
    // Setup for both desktop and mobile
    setupChatHandlers('chat-input', 'send-btn');
    setupChatHandlers('chat-input-mobile', 'send-btn-mobile');
    
    // Setup bubble mode toggles
    const setupBubbleToggle = (toggleId) => {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.addEventListener('click', () => {
                window.ROOM_CONFIG.chatBubblesEnabled = !window.ROOM_CONFIG.chatBubblesEnabled;
                toggle.classList.toggle('active', window.ROOM_CONFIG.chatBubblesEnabled);
                toggle.textContent = window.ROOM_CONFIG.chatBubblesEnabled ? '3D Bubbles' : 'Text Only';
                
                if (!window.ROOM_CONFIG.chatBubblesEnabled && window.ChatBubbleSystem) {
                    try {
                        window.ChatBubbleSystem.clearAllBubbles();
                    } catch (error) {
                        console.warn('Error clearing bubbles:', error);
                    }
                }
                
                console.log(`💬 Bubble mode: ${window.ROOM_CONFIG.chatBubblesEnabled ? 'enabled' : 'disabled'}`);
            });
        }
    };
    
    setupBubbleToggle('bubble-mode-toggle');
    setupBubbleToggle('bubble-mode-toggle-mobile');
    
    // Auto-connect WebSocket after short delay
    setTimeout(() => {
        if (window.WebSocketManager) {
            window.WebSocketManager.connect();
        }
    }, 1000);
    
    console.log('🚀 Chat system initialized');
    
    // Initialize integration when DOM is ready
    setTimeout(setupChatBubbleWebSocketIntegration, 1000);
    
    // Initialize modular system when DOM is ready
    setTimeout(async () => {
        const initializer = new EuphorieInitializer();
        await initializer.initialize();
    }, 2000);
});

// Make WebSocket functions available globally
window.sendEmotion = function(emotion) {
    if (window.WebSocketManager) {
        window.WebSocketManager.sendEmotion(emotion);
    }
};

window.sendInteraction = function(type, targetId = null, data = null) {
    if (window.WebSocketManager) {
        window.WebSocketManager.sendInteraction(type, targetId, data);
    }
};

console.log('🎮 Euphorie 3D JavaScript system loaded and ready!');