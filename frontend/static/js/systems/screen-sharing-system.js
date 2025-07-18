// ================================
// EUPHORIE 3D SCREEN SHARING SYSTEM
// Complete implementation with ceiling/wall projection
// ================================

class EuphorieScreenSharingSystem {
    constructor() {
        console.log('🖥️ Initializing Screen Sharing System...');
        
        // Core properties
        this.isInitialized = false;
        this.isSharing = false;
        this.mediaStream = null;
        this.videoElement = null;
        this.projectionSurface = null;
        this.projectionTexture = null;
        this.projectionMaterial = null;
        
        // Screen sharing state
        this.activeShares = new Map(); // userId -> shareData
        this.currentSharer = null;
        this.projectionMode = 'ceiling'; // 'ceiling', 'wall', 'floating'
        
        // WebRTC peer connections for screen sharing
        this.peerConnections = new Map();
        this.localStream = null;
        
        // Three.js references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Configuration
        this.config = {
            maxSharers: 1, // Only one person can share at a time
            projectionWidth: 16, // 3D units
            projectionHeight: 9, // 3D units
            ceilingHeight: 8, // Height above ground
            wallDistance: 12, // Distance from center for wall projection
            quality: 'high', // 'low', 'medium', 'high'
            frameRate: 30,
            autoSwitchOnStop: true,
            enableControls: true
        };
        
        // Bind methods with safe binding
        this.bindMethods();
        
        console.log('✅ Screen Sharing System created');
    }
    
    bindMethods() {
        // Remove all method binding - not needed for this class
        console.log('✅ Method binding skipped - methods work without binding');
    }
    
    async init() {
        console.log('🚀 Initializing Screen Sharing System...');
        
        try {
            // Wait for Three.js scene
            if (!this.waitForScene()) {
                console.log('⏳ Waiting for Three.js scene...');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            // Setup WebSocket integration
            this.setupWebSocketIntegration();
            
            // Create projection surface
            this.createProjectionSurface();
            
            // Setup UI controls
            this.setupUIControls();
            
            // Setup global functions
            this.setupGlobalFunctions();
            
            this.isInitialized = true;
            console.log('✅ Screen Sharing System initialized');
            
        } catch (error) {
            console.error('❌ Error initializing Screen Sharing System:', error);
            setTimeout(() => this.init(), 1000);
        }
    }
    
    waitForScene() {
        // Check for available Three.js scene
        if (window.SceneManager?.scene) {
            this.scene = window.SceneManager.scene;
            this.camera = window.SceneManager.camera;
            this.renderer = window.SceneManager.renderer;
            return true;
        }
        
        if (window.scene) {
            this.scene = window.scene;
            this.camera = window.camera;
            this.renderer = window.renderer;
            return true;
        }
        
        return false;
    }
    
    setupWebSocketIntegration() {
        // Extend WebSocket manager with screen sharing support
        if (window.WebSocketManager) {
            const originalHandleMessage = window.WebSocketManager.handleMessage;
            
            window.WebSocketManager.handleMessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'screen_share_started') {
                        this.handleScreenShareMessage(data);
                        return;
                    } else if (data.type === 'screen_share_stopped') {
                        this.handleScreenShareMessage(data);
                        return;
                    } else if (data.type === 'screen_share_webrtc_offer') {
                        this.handleWebRTCOffer(data);
                        return;
                    } else if (data.type === 'screen_share_webrtc_answer') {
                        this.handleWebRTCAnswer(data);
                        return;
                    } else if (data.type === 'screen_share_webrtc_candidate') {
                        this.handleWebRTCCandidate(data);
                        return;
                    }
                    
                    // Call original handler for other messages
                    originalHandleMessage.call(window.WebSocketManager, event);
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            };
            
            // Add screen sharing methods to WebSocket manager
            window.WebSocketManager.sendScreenShareStart = (shareData) => {
                window.WebSocketManager.send({
                    type: 'screen_share_started',
                    user_id: window.WebSocketManager.userId,
                    room_id: window.WebSocketManager.roomId,
                    username: window.WebSocketManager.username,
                    share_data: shareData,
                    timestamp: Date.now()
                });
            };
            
            window.WebSocketManager.sendScreenShareStop = () => {
                window.WebSocketManager.send({
                    type: 'screen_share_stopped',
                    user_id: window.WebSocketManager.userId,
                    room_id: window.WebSocketManager.roomId,
                    username: window.WebSocketManager.username,
                    timestamp: Date.now()
                });
            };
            
            window.WebSocketManager.sendWebRTCMessage = (targetUserId, messageType, data) => {
                window.WebSocketManager.send({
                    type: messageType,
                    user_id: window.WebSocketManager.userId,
                    room_id: window.WebSocketManager.roomId,
                    target_user_id: targetUserId,
                    data: data,
                    timestamp: Date.now()
                });
            };
            
            console.log('✅ WebSocket integration for screen sharing setup');
        }
    }
    
    createProjectionSurface() {
        if (!this.scene || !window.THREE) return;
        
        // Remove existing projection surface
        if (this.projectionSurface) {
            this.scene.remove(this.projectionSurface);
            this.projectionSurface = null;
        }
        
        // Create video element for screen content
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        document.body.appendChild(this.videoElement);
        
        // Create projection texture
        this.projectionTexture = new THREE.VideoTexture(this.videoElement);
        this.projectionTexture.minFilter = THREE.LinearFilter;
        this.projectionTexture.magFilter = THREE.LinearFilter;
        this.projectionTexture.format = THREE.RGBFormat;
        
        // Create projection material
        this.projectionMaterial = new THREE.MeshBasicMaterial({
            map: this.projectionTexture,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        
        // Create projection geometry based on mode
        this.updateProjectionSurface();
        
        console.log('✅ Projection surface created');
    }
    
    updateProjectionSurface() {
        if (!this.scene || !window.THREE) return;
        
        // Remove existing surface
        if (this.projectionSurface) {
            this.scene.remove(this.projectionSurface);
        }
        
        let geometry;
        let position;
        let rotation;
        
        switch (this.projectionMode) {
            case 'ceiling':
                geometry = new THREE.PlaneGeometry(this.config.projectionWidth, this.config.projectionHeight);
                position = new THREE.Vector3(0, this.config.ceilingHeight, 0);
                rotation = new THREE.Euler(-Math.PI / 2, 0, 0); // Face down
                break;
                
            case 'wall':
                geometry = new THREE.PlaneGeometry(this.config.projectionWidth, this.config.projectionHeight);
                position = new THREE.Vector3(0, this.config.projectionHeight / 2 + 2, -this.config.wallDistance);
                rotation = new THREE.Euler(0, 0, 0); // Face forward
                break;
                
            case 'floating':
                geometry = new THREE.PlaneGeometry(this.config.projectionWidth, this.config.projectionHeight);
                position = new THREE.Vector3(0, 6, -8);
                rotation = new THREE.Euler(-Math.PI / 8, 0, 0); // Slightly angled
                break;
                
            default:
                geometry = new THREE.PlaneGeometry(this.config.projectionWidth, this.config.projectionHeight);
                position = new THREE.Vector3(0, this.config.ceilingHeight, 0);
                rotation = new THREE.Euler(-Math.PI / 2, 0, 0);
        }
        
        // Create mesh
        this.projectionSurface = new THREE.Mesh(geometry, this.projectionMaterial);
        this.projectionSurface.position.copy(position);
        this.projectionSurface.rotation.copy(rotation);
        this.projectionSurface.name = 'screen-projection';
        
        // Add glow effect
        const glowGeometry = new THREE.PlaneGeometry(
            this.config.projectionWidth + 1,
            this.config.projectionHeight + 1
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4a90e2,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(position);
        glowMesh.rotation.copy(rotation);
        glowMesh.position.z -= 0.01; // Slightly behind
        
        // Create projection group
        const projectionGroup = new THREE.Group();
        projectionGroup.add(glowMesh);
        projectionGroup.add(this.projectionSurface);
        projectionGroup.name = 'screen-projection-group';
        
        // Initially hidden
        projectionGroup.visible = false;
        
        this.scene.add(projectionGroup);
        this.projectionSurface = projectionGroup;
        
        console.log(`✅ Projection surface updated (mode: ${this.projectionMode})`);
    }
    
    async startScreenShare() {
        if (this.isSharing) {
            console.log('Already sharing screen');
            return;
        }
        
        try {
            console.log('🖥️ Starting screen share...');
            
            // Check if someone else is already sharing
            if (this.currentSharer && this.currentSharer !== window.WebSocketManager?.userId) {
                this.showNotification('❌ Someone else is already sharing their screen');
                return;
            }
            
            // Request screen capture
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920, max: 1920 },
                    height: { ideal: 1080, max: 1080 },
                    frameRate: { ideal: this.config.frameRate }
                },
                audio: false // We'll handle audio separately if needed
            });
            
            this.localStream = stream;
            this.mediaStream = stream;
            
            // Set up video element
            this.videoElement.srcObject = stream;
            
            // Show projection surface
            if (this.projectionSurface) {
                this.projectionSurface.visible = true;
                this.animateProjectionIn();
            }
            
            // Handle stream ended (user stops sharing)
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                this.stopScreenShare();
            });
            
            // Set sharing state
            this.isSharing = true;
            this.currentSharer = window.WebSocketManager?.userId;
            
            // Notify other users
            if (window.WebSocketManager?.sendScreenShareStart) {
                window.WebSocketManager.sendScreenShareStart({
                    projection_mode: this.projectionMode,
                    quality: this.config.quality
                });
            }
            
            // Setup WebRTC connections to other users
            this.setupWebRTCConnections();
            
            // Show sharing controls
            this.showSharingControls();
            
            this.showNotification('✅ Screen sharing started!');
            console.log('✅ Screen sharing started');
            
        } catch (error) {
            console.error('❌ Error starting screen share:', error);
            this.showNotification('❌ Could not start screen sharing');
        }
    }
    
    async setupWebRTCConnections() {
        if (!this.localStream || !window.WebSocketManager) return;
        
        // Get connected users
        const connectedUsers = window.WebSocketManager.getConnectedUsers();
        
        for (const userData of connectedUsers) {
            if (userData.user_id === window.WebSocketManager.userId) continue;
            
            try {
                // Create peer connection
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                });
                
                // Add local stream
                this.localStream.getTracks().forEach(track => {
                    pc.addTrack(track, this.localStream);
                });
                
                // Handle ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        window.WebSocketManager.sendWebRTCMessage(
                            userData.user_id,
                            'screen_share_webrtc_candidate',
                            event.candidate
                        );
                    }
                };
                
                // Create offer
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                
                // Send offer
                window.WebSocketManager.sendWebRTCMessage(
                    userData.user_id,
                    'screen_share_webrtc_offer',
                    offer
                );
                
                this.peerConnections.set(userData.user_id, pc);
                
            } catch (error) {
                console.error(`Error setting up WebRTC connection to ${userData.user_id}:`, error);
            }
        }
    }
    
    async handleWebRTCOffer(data) {
        if (!window.WebSocketManager || data.user_id === window.WebSocketManager.userId) return;
        
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            // Handle incoming stream
            pc.ontrack = (event) => {
                console.log('📺 Received remote screen stream');
                this.handleRemoteStream(event.streams[0], data.user_id);
            };
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    window.WebSocketManager.sendWebRTCMessage(
                        data.user_id,
                        'screen_share_webrtc_candidate',
                        event.candidate
                    );
                }
            };
            
            // Set remote description and create answer
            await pc.setRemoteDescription(data.data);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // Send answer
            window.WebSocketManager.sendWebRTCMessage(
                data.user_id,
                'screen_share_webrtc_answer',
                answer
            );
            
            this.peerConnections.set(data.user_id, pc);
            
        } catch (error) {
            console.error('Error handling WebRTC offer:', error);
        }
    }
    
    async handleWebRTCAnswer(data) {
        if (!window.WebSocketManager || data.user_id === window.WebSocketManager.userId) return;
        
        try {
            const pc = this.peerConnections.get(data.user_id);
            if (pc) {
                await pc.setRemoteDescription(data.data);
            }
        } catch (error) {
            console.error('Error handling WebRTC answer:', error);
        }
    }
    
    async handleWebRTCCandidate(data) {
        if (!window.WebSocketManager || data.user_id === window.WebSocketManager.userId) return;
        
        try {
            const pc = this.peerConnections.get(data.user_id);
            if (pc) {
                await pc.addIceCandidate(data.data);
            }
        } catch (error) {
            console.error('Error handling WebRTC candidate:', error);
        }
    }
    
    handleRemoteStream(stream, userId) {
        // Set the remote stream to our video element
        this.videoElement.srcObject = stream;
        this.mediaStream = stream;
        
        // Show projection surface
        if (this.projectionSurface) {
            this.projectionSurface.visible = true;
            this.animateProjectionIn();
        }
        
        // Update state
        this.currentSharer = userId;
        
        // Show viewer controls
        this.showViewerControls(userId);
        
        console.log(`✅ Displaying screen share from user: ${userId}`);
    }
    
    stopScreenShare() {
        if (!this.isSharing && !this.mediaStream) return;
        
        console.log('🖥️ Stopping screen share...');
        
        try {
            // Stop local stream
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            // Clear media stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            
            // Clear video element
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            
            // Hide projection surface
            if (this.projectionSurface) {
                this.animateProjectionOut();
            }
            
            // Close peer connections
            this.peerConnections.forEach(pc => pc.close());
            this.peerConnections.clear();
            
            // Reset state
            this.isSharing = false;
            this.currentSharer = null;
            
            // Notify other users
            if (window.WebSocketManager?.sendScreenShareStop) {
                window.WebSocketManager.sendScreenShareStop();
            }
            
            // Hide controls
            this.hideSharingControls();
            
            this.showNotification('✅ Screen sharing stopped');
            console.log('✅ Screen sharing stopped');
            
        } catch (error) {
            console.error('Error stopping screen share:', error);
        }
    }
    
    handleScreenShareMessage(data) {
        if (data.type === 'screen_share_started') {
            if (data.user_id !== window.WebSocketManager?.userId) {
                console.log(`📺 ${data.username} started sharing their screen`);
                this.currentSharer = data.user_id;
                
                // Show notification
                this.showNotification(`📺 ${data.username} is sharing their screen`);
                
                // Update projection mode if specified
                if (data.share_data?.projection_mode) {
                    this.projectionMode = data.share_data.projection_mode;
                    this.updateProjectionSurface();
                }
            }
        } else if (data.type === 'screen_share_stopped') {
            if (data.user_id === this.currentSharer) {
                console.log(`📺 ${data.username} stopped sharing their screen`);
                
                // Hide projection surface
                if (this.projectionSurface) {
                    this.animateProjectionOut();
                }
                
                // Clear state
                this.currentSharer = null;
                this.mediaStream = null;
                
                // Show notification
                this.showNotification(`📺 ${data.username} stopped sharing`);
                
                // Hide controls
                this.hideViewerControls();
            }
        }
    }
    
    animateProjectionIn() {
        if (!this.projectionSurface) return;
        
        // Start invisible and small
        this.projectionSurface.scale.set(0.1, 0.1, 0.1);
        this.projectionSurface.visible = true;
        
        // Animate in
        const startTime = Date.now();
        const duration = 1000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Scale animation
            const scale = 0.1 + (0.9 * easeProgress);
            this.projectionSurface.scale.set(scale, scale, scale);
            
            // Slight rotation animation
            this.projectionSurface.rotation.z = Math.sin(progress * Math.PI) * 0.1;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.projectionSurface.rotation.z = 0;
            }
        };
        
        animate();
    }
    
    animateProjectionOut() {
        if (!this.projectionSurface) return;
        
        const startTime = Date.now();
        const duration = 800;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeProgress = Math.pow(progress, 2);
            
            // Scale animation
            const scale = 1 - (0.9 * easeProgress);
            this.projectionSurface.scale.set(scale, scale, scale);
            
            // Rotation animation
            this.projectionSurface.rotation.z = progress * Math.PI * 0.5;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.projectionSurface.visible = false;
                this.projectionSurface.scale.set(1, 1, 1);
                this.projectionSurface.rotation.z = 0;
            }
        };
        
        animate();
    }
    
    showSharingControls() {
        this.createControlPanel('sharing');
    }
    
    showViewerControls(sharerName) {
        this.createControlPanel('viewing', sharerName);
    }
    
    hideSharingControls() {
        this.removeControlPanel();
    }
    
    hideViewerControls() {
        this.removeControlPanel();
    }
    
    createControlPanel(type, sharerName = '') {
        // Remove existing panel
        this.removeControlPanel();
        
        const panel = document.createElement('div');
        panel.id = 'screen-share-controls';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(145deg, rgba(15, 15, 25, 0.95), rgba(25, 25, 40, 0.95));
            backdrop-filter: blur(20px);
            border: 2px solid rgba(255, 107, 53, 0.3);
            border-radius: 16px;
            padding: 20px;
            color: white;
            z-index: 1000;
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4);
            min-width: 300px;
            text-align: center;
            animation: slideInFromTop 0.3s ease-out;
        `;
        
        if (type === 'sharing') {
            panel.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div style="width: 12px; height: 12px; background: #ff4444; border-radius: 50%; animation: pulse 1s infinite;"></div>
                    <strong>🖥️ You're sharing your screen</strong>
                </div>
                <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 16px;">
                    <button onclick="window.ScreenSharingSystem.changeProjectionMode('ceiling')" 
                            style="padding: 8px 16px; background: ${this.projectionMode === 'ceiling' ? '#4CAF50' : '#555'}; 
                                   border: none; border-radius: 8px; color: white; cursor: pointer;">
                        📺 Ceiling
                    </button>
                    <button onclick="window.ScreenSharingSystem.changeProjectionMode('wall')" 
                            style="padding: 8px 16px; background: ${this.projectionMode === 'wall' ? '#4CAF50' : '#555'}; 
                                   border: none; border-radius: 8px; color: white; cursor: pointer;">
                        🖼️ Wall
                    </button>
                    <button onclick="window.ScreenSharingSystem.changeProjectionMode('floating')" 
                            style="padding: 8px 16px; background: ${this.projectionMode === 'floating' ? '#4CAF50' : '#555'}; 
                                   border: none; border-radius: 8px; color: white; cursor: pointer;">
                        ✨ Floating
                    </button>
                </div>
                <button onclick="window.ScreenSharingSystem.stopScreenShare()" 
                        style="padding: 12px 24px; background: #ff4444; border: none; border-radius: 8px; 
                               color: white; cursor: pointer; font-weight: bold;">
                    ⏹️ Stop Sharing
                </button>
            `;
        } else if (type === 'viewing') {
            panel.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div style="width: 12px; height: 12px; background: #4CAF50; border-radius: 50%; animation: pulse 1s infinite;"></div>
                    <strong>📺 Watching ${sharerName}'s screen</strong>
                </div>
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 12px;">
                    Displayed on ${this.projectionMode}
                </div>
                <button onclick="window.ScreenSharingSystem.requestShareControl()" 
                        style="padding: 8px 16px; background: #2196F3; border: none; border-radius: 8px; 
                               color: white; cursor: pointer; margin-right: 8px;">
                    🎮 Request Control
                </button>
                <button onclick="window.ScreenSharingSystem.hideViewerControls()" 
                        style="padding: 8px 16px; background: #666; border: none; border-radius: 8px; 
                               color: white; cursor: pointer;">
                    ✕ Hide
                </button>
            `;
        }
        
        document.body.appendChild(panel);
        
        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInFromTop {
                from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;
        document.head.appendChild(style);
    }
    
    removeControlPanel() {
        const panel = document.getElementById('screen-share-controls');
        if (panel) {
            panel.remove();
        }
    }
    
    changeProjectionMode(mode) {
        if (this.projectionMode === mode) return;
        
        this.projectionMode = mode;
        this.updateProjectionSurface();
        
        // Update controls
        if (this.isSharing) {
            this.showSharingControls();
        }
        
        this.showNotification(`📺 Projection mode: ${mode}`);
        console.log(`📺 Projection mode changed to: ${mode}`);
    }
    
    requestShareControl() {
        this.showNotification('🎮 Control request sent to sharer');
        // TODO: Implement control request system
    }
    
    setupUIControls() {
        // Add screen sharing button to existing UI
        const addScreenShareButton = (container, className) => {
            const button = document.createElement('button');
            button.className = `mobile-action-btn ${className}`;
            button.innerHTML = `
                <div class="icon">🖥️</div>
                <div>Share Screen</div>
            `;
            button.onclick = () => {
                this.startScreenShare();
                // Close menus
                if (window.closeMobileMenu) window.closeMobileMenu();
                if (window.closeDesktopMenu) window.closeDesktopMenu();
            };
            
            if (container) {
                container.appendChild(button);
            }
        };
        
        // Add to mobile menu
        const mobileMenu = document.querySelector('.mobile-actions-menu .mobile-action-grid');
        if (mobileMenu) {
            addScreenShareButton(mobileMenu, 'full-width');
        }
        
        // Add to desktop menu
        const desktopMenu = document.querySelector('.desktop-actions-menu .mobile-action-grid');
        if (desktopMenu) {
            addScreenShareButton(desktopMenu, '');
        }
    }
    
    setupGlobalFunctions() {
        // Make system available globally
        window.ScreenSharingSystem = this;
        
        // Add to global action functions
        window.startScreenShare = () => this.startScreenShare();
        window.stopScreenShare = () => this.stopScreenShare();
        window.toggleScreenShare = () => {
            if (this.isSharing) {
                this.stopScreenShare();
            } else {
                this.startScreenShare();
            }
        };
        
        console.log('✅ Screen sharing global functions setup');
    }
    
    showScreenShareUI() {
        // Create dedicated screen share UI
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
            backdrop-filter: blur(10px);
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            color: white;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        `;
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #4CAF50;">🖥️ Screen Sharing</h2>
            <p style="margin-bottom: 30px; color: #ccc;">
                Share your screen with everyone in the room. 
                Choose where to display it:
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <div onclick="window.ScreenSharingSystem.projectionMode = 'ceiling'; window.ScreenSharingSystem.startScreenShare(); document.body.removeChild(modal);" 
                     style="padding: 20px; background: #333; border-radius: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📺</div>
                    <div style="font-weight: bold;">Ceiling</div>
                    <div style="font-size: 12px; opacity: 0.7;">Above everyone</div>
                </div>
                
                <div onclick="window.ScreenSharingSystem.projectionMode = 'wall'; window.ScreenSharingSystem.startScreenShare(); document.body.removeChild(modal);" 
                     style="padding: 20px; background: #333; border-radius: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">🖼️</div>
                    <div style="font-weight: bold;">Wall</div>
                    <div style="font-size: 12px; opacity: 0.7;">On the wall</div>
                </div>
                
                <div onclick="window.ScreenSharingSystem.projectionMode = 'floating'; window.ScreenSharingSystem.startScreenShare(); document.body.removeChild(modal);" 
                     style="padding: 20px; background: #333; border-radius: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">✨</div>
                    <div style="font-weight: bold;">Floating</div>
                    <div style="font-size: 12px; opacity: 0.7;">In the air</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button onclick="document.body.removeChild(modal)" 
                        style="padding: 12px 24px; background: #666; border: none; border-radius: 8px; 
                               color: white; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Add hover effects
        const options = content.querySelectorAll('div[onclick]');
        options.forEach(option => {
            option.addEventListener('mouseenter', () => {
                option.style.background = '#444';
                option.style.transform = 'scale(1.05)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.background = '#333';
                option.style.transform = 'scale(1)';
            });
        });
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(255, 107, 53, 0.95), rgba(255, 152, 0, 0.95));
            backdrop-filter: blur(15px);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: 600;
            font-size: 13px;
            transform: translateX(400px);
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
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
    }
    
    // Debug and utility methods
    isScreenSharingSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    }
    
    getCurrentSharer() {
        return this.currentSharer;
    }
    
    getProjectionMode() {
        return this.projectionMode;
    }
    
    getActiveShares() {
        return Array.from(this.activeShares.values());
    }
}

// Initialize Screen Sharing System
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.THREE && (window.SceneManager || window.scene)) {
            const screenSharingSystem = new EuphorieScreenSharingSystem();
            screenSharingSystem.init();
        } else {
            console.log('⏳ Waiting for Three.js and scene to be ready...');
            setTimeout(() => {
                const screenSharingSystem = new EuphorieScreenSharingSystem();
                screenSharingSystem.init();
            }, 2000);
        }
    }, 1000);
});

console.log('🖥️ Screen Sharing System loaded and ready!');