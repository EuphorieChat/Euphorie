// ================================
// EUPHORIE 3D SCREEN SHARING SYSTEM - FIXED VERSION
// Complete implementation with VideoTexture black screen fix
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
        
        // CRITICAL: Video texture update system
        this.textureUpdateInterval = null;
        this.isTextureUpdating = false;
        
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
        
        // Add default camera facing
        this.cameraFacing = 'environment'; // Default to back camera
        
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
            
            // Create projection surface with VideoTexture fix
            this.createProjectionSurface();
            
            // Setup global functions (but don't add UI buttons)
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
        this.videoElement.crossOrigin = 'anonymous'; // CRITICAL: Add this for video texture
        document.body.appendChild(this.videoElement);
        
        // CRITICAL FIX: Create VideoTexture with r128 compatible properties
        this.projectionTexture = new THREE.VideoTexture(this.videoElement);
        this.projectionTexture.minFilter = THREE.LinearFilter;
        this.projectionTexture.magFilter = THREE.LinearFilter;
        this.projectionTexture.format = THREE.RGBAFormat; // Use RGBA for better compatibility
        this.projectionTexture.generateMipmaps = false;
        this.projectionTexture.flipY = false;
        this.projectionTexture.wrapS = THREE.ClampToEdgeWrapping;
        this.projectionTexture.wrapT = THREE.ClampToEdgeWrapping;
        
        // CRITICAL FIX: Force initial update
        this.projectionTexture.needsUpdate = true;
        
        // CRITICAL FIX: Use MeshBasicMaterial for unlit rendering (better for video)
        this.projectionMaterial = new THREE.MeshBasicMaterial({
            map: this.projectionTexture,
            transparent: false,
            side: THREE.DoubleSide,
            color: 0xffffff, // Ensure full brightness
            // No emissive properties for r128 compatibility
        });
        
        // Create projection geometry based on mode
        this.updateProjectionSurface();
        
        console.log('✅ Projection surface created with Three.js r128 compatibility');
    }
    
    updateProjectionSurface() {
        if (!this.scene || !window.THREE) return;
        
        // Remove existing surface
        if (this.projectionSurface) {
            this.scene.remove(this.projectionSurface);
        }
        
        // FIXED: Use smaller, more visible geometry
        const geometry = new THREE.PlaneGeometry(12, 7); // Smaller for better visibility
        let position;
        let rotation;
        
        // FIXED: Clear, distinct positioning for each mode
        switch (this.projectionMode) {
            case 'ceiling':
                position = new THREE.Vector3(0, 15, 0); // High above everything
                rotation = new THREE.Euler(-Math.PI / 2, 0, 0); // Face down
                console.log('📺 Ceiling mode: Looking UP to see screen on ceiling');
                break;
                
            case 'wall':
                position = new THREE.Vector3(0, 6, -12); // In front of camera, eye level
                rotation = new THREE.Euler(0, 0, 0); // Face forward
                console.log('📺 Wall mode: Looking FORWARD to see screen on wall');
                break;
                
            case 'floating':
                position = new THREE.Vector3(0, 10, -8); // Floating in air, angled
                rotation = new THREE.Euler(-Math.PI / 6, 0, 0); // Angled down slightly
                console.log('📺 Floating mode: Looking UP-FORWARD to see floating screen');
                break;
                
            default:
                position = new THREE.Vector3(0, 6, -12);
                rotation = new THREE.Euler(0, 0, 0);
        }
        
        // Create mesh with proper material
        this.projectionSurface = new THREE.Mesh(geometry, this.projectionMaterial);
        this.projectionSurface.position.copy(position);
        this.projectionSurface.rotation.copy(rotation);
        this.projectionSurface.name = 'screen-projection';
        
        // CRITICAL FIX: Add bright lighting for video visibility
        this.ensureProjectionLighting();
        
        // Add bright border for debugging positioning
        const borderGeometry = new THREE.EdgesGeometry(geometry);
        const borderMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000, // Bright red border for visibility
            linewidth: 4,
            transparent: true,
            opacity: 1.0
        });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        border.position.copy(position);
        border.rotation.copy(rotation);
        border.name = 'screen-projection-border';
        
        // Create projection group
        const projectionGroup = new THREE.Group();
        projectionGroup.add(this.projectionSurface);
        projectionGroup.add(border);
        projectionGroup.name = 'screen-projection-group';
        
        // ALWAYS visible when created
        projectionGroup.visible = true;
        
        this.scene.add(projectionGroup);
        this.projectionSurface = projectionGroup;
        
        console.log(`✅ Projection surface updated (mode: ${this.projectionMode}) with r128 compatibility`);
        console.log(`📍 Position: x=${position.x}, y=${position.y}, z=${position.z}`);
        console.log(`🔄 Rotation: x=${rotation.x}, y=${rotation.y}, z=${rotation.z}`);
    }
    
    // CRITICAL FIX: Enhanced texture update method for r128
    startVideoTextureUpdates() {
        if (this.isTextureUpdating || !this.projectionTexture) {
            console.log('⚠️ Video texture updates already running or no texture available');
            return;
        }

        this.isTextureUpdating = true;
        console.log('🔄 Starting video texture update loop...');

        // CRITICAL FIX: More aggressive texture updating for r128
        this.textureUpdateInterval = setInterval(() => {
            if (this.projectionTexture && this.videoElement) {
                const video = this.videoElement;
                
                // Check multiple conditions for video readiness
                if (video.readyState >= video.HAVE_CURRENT_DATA && 
                    !video.paused &&
                    video.videoWidth > 0 &&
                    video.videoHeight > 0) {
                    
                    // CRITICAL: Multiple update flags for r128
                    this.projectionTexture.needsUpdate = true;
                    
                    // Force material update
                    if (this.projectionMaterial) {
                        this.projectionMaterial.needsUpdate = true;
                        this.projectionMaterial.map = this.projectionTexture; // Re-assign map
                    }
                    
                    // DEBUGGING: Log video dimensions
                    if (Math.random() < 0.01) { // Log 1% of updates to avoid spam
                        console.log(`📺 Video: ${video.videoWidth}x${video.videoHeight}, Ready: ${video.readyState}`);
                    }
                }
            }
        }, 16); // Keep 60 FPS

        console.log('✅ Video texture update loop started at 60 FPS with r128 compatibility');
    }
    
    // NEW: Ensure proper lighting for video visibility
    ensureProjectionLighting() {
        if (!this.scene) return;
        
        // Remove existing screen sharing lights first
        const existingLights = this.scene.children.filter(child => 
            child.name && child.name.includes('screen-sharing')
        );
        existingLights.forEach(light => this.scene.remove(light));
        
        // Add very bright ambient light for video visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Full brightness white light
        ambientLight.name = 'screen-sharing-ambient-light';
        this.scene.add(ambientLight);
        
        // Add directional light pointing at projection area
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 20, 5);
        directionalLight.target.position.set(0, 6, -10);
        directionalLight.name = 'screen-sharing-directional-light';
        this.scene.add(directionalLight);
        
        console.log('💡 Added bright lighting for screen sharing visibility');
    }
    
    // CRITICAL FIX: Stop texture updates
    stopVideoTextureUpdates() {
        if (this.textureUpdateInterval) {
            clearInterval(this.textureUpdateInterval);
            this.textureUpdateInterval = null;
            this.isTextureUpdating = false;
            console.log('🛑 Video texture updates stopped');
        }
    }
    
    // CRITICAL FIX: Wait for video to be ready
    async waitForVideoReady(videoElement) {
        return new Promise((resolve, reject) => {
            if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
                console.log('✅ Video already ready');
                resolve();
                return;
            }

            let checkAttempts = 0;
            const maxAttempts = 50; // 5 seconds max

            const checkReady = () => {
                checkAttempts++;
                
                if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
                    console.log(`✅ Video ready after ${checkAttempts * 100}ms`);
                    videoElement.removeEventListener('loadeddata', checkReady);
                    videoElement.removeEventListener('canplay', checkReady);
                    resolve();
                } else if (checkAttempts >= maxAttempts) {
                    console.warn('⚠️ Video took too long to load, proceeding anyway');
                    videoElement.removeEventListener('loadeddata', checkReady);
                    videoElement.removeEventListener('canplay', checkReady);
                    resolve(); // Resolve anyway to continue
                } else {
                    console.log(`⏳ Waiting for video... attempt ${checkAttempts}/${maxAttempts}`);
                    setTimeout(checkReady, 100);
                }
            };

            // Listen for video ready events
            videoElement.addEventListener('loadeddata', checkReady);
            videoElement.addEventListener('canplay', checkReady);
            
            // Start checking immediately
            checkReady();
        });
    }
    
    async startScreenShare() {
        if (this.isSharing) {
            console.log('Already sharing');
            return;
        }
        
        try {
            console.log('🖥️ Starting screen/camera share...');
            console.log('📱 Mobile detected:', this.isMobile());
            
            // Check if someone else is already sharing
            if (this.currentSharer && this.currentSharer !== window.WebSocketManager?.userId) {
                this.showNotification('❌ Someone else is already sharing');
                return;
            }
            
            let stream;
            
            if (this.isMobile()) {
                // Mobile: Use camera instead of screen sharing
                console.log('📱 Mobile detected, requesting camera access...');
                console.log('📱 Camera facing:', this.cameraFacing || 'environment');
                
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280, max: 1920 },
                            height: { ideal: 720, max: 1080 },
                            frameRate: { ideal: 30 },
                            facingMode: this.cameraFacing || 'environment'
                        },
                        audio: false
                    });
                    console.log('📱 Camera stream obtained successfully');
                } catch (cameraError) {
                    console.error('📱 Camera access failed:', cameraError);
                    
                    // Try with basic constraints if specific facing mode fails
                    if (cameraError.name === 'OverconstrainedError' || cameraError.name === 'ConstraintNotSatisfiedError') {
                        console.log('📱 Trying with basic camera constraints...');
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: false
                        });
                        console.log('📱 Basic camera stream obtained');
                    } else {
                        throw cameraError;
                    }
                }
                
                this.showNotification('📱 Camera sharing started');
            } else {
                // Desktop: Use screen sharing
                console.log('🖥️ Desktop detected, requesting screen access...');
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { ideal: 1920, max: 1920 },
                        height: { ideal: 1080, max: 1080 },
                        frameRate: { ideal: this.config.frameRate }
                    },
                    audio: false
                });
                console.log('🖥️ Screen stream obtained successfully');
                this.showNotification('🖥️ Screen sharing started');
            }
            
            this.localStream = stream;
            this.mediaStream = stream;
            
            console.log('📹 Video tracks:', stream.getVideoTracks().length);
            console.log('🎵 Audio tracks:', stream.getAudioTracks().length);
            
            // CRITICAL FIX: Set up video element with proper properties
            this.videoElement.srcObject = stream;
            this.videoElement.muted = true; // Essential for autoplay
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true; // Important for mobile
            console.log('📺 Video element configured');
            
            // CRITICAL FIX: Wait for video to be ready and start texture updates
            try {
                await this.waitForVideoReady(this.videoElement);
                console.log('✅ Video is ready, starting texture updates');
                
                // Start continuous texture updates (CRITICAL for fixing black screen)
                this.startVideoTextureUpdates();
                
                // ADDITIONAL FIX: Force immediate texture update
                if (this.projectionTexture) {
                    this.projectionTexture.needsUpdate = true;
                    console.log('🔄 Forced immediate texture update');
                }
                
            } catch (error) {
                console.warn('⚠️ Video readiness check failed, starting anyway:', error);
                // Start updates anyway
                this.startVideoTextureUpdates();
            }
            
            // Show projection surface
            if (this.projectionSurface) {
                this.projectionSurface.visible = true;
                this.animateProjectionIn();
                console.log('🎬 Projection surface shown');
            } else {
                console.warn('⚠️ Projection surface not available');
            }
            
            // Handle stream ended
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                console.log('📹 Stream ended by user');
                this.stopScreenShare();
            });
            
            // Set sharing state
            this.isSharing = true;
            this.currentSharer = window.WebSocketManager?.userId;
            
            console.log('✅ Sharing state set successfully');
            
            // Notify other users via WebSocket
            if (window.WebSocketManager?.sendScreenShareStart) {
                window.WebSocketManager.sendScreenShareStart({
                    projection_mode: this.projectionMode,
                    quality: this.config.quality,
                    sharer_id: window.WebSocketManager.userId,
                    sharer_name: window.WebSocketManager.username,
                    share_type: this.isMobile() ? 'camera' : 'screen'
                });
                console.log('📡 Share notification sent via WebSocket');
            } else {
                console.warn('⚠️ WebSocket manager not available for notifications');
            }
            
            // Try to setup WebRTC connections (optional)
            try {
                await this.setupWebRTCConnections();
                console.log('🔗 WebRTC setup completed');
            } catch (error) {
                console.log('⚠️ WebRTC setup failed, continuing with WebSocket-only sharing:', error);
            }
            
            // Show sharing controls
            this.showSharingControls();
            console.log('🎮 Sharing controls displayed');
            
            console.log('✅ Sharing started successfully');
            
        } catch (error) {
            console.error('❌ Error starting share:', error);
            console.error('❌ Error name:', error.name);
            console.error('❌ Error message:', error.message);
            
            if (error.name === 'NotAllowedError') {
                this.showNotification('❌ Camera/screen permission denied. Please allow access and try again.');
            } else if (error.name === 'NotFoundError') {
                this.showNotification('❌ No camera found on this device');
            } else if (error.name === 'NotSupportedError') {
                this.showNotification('❌ Camera/screen sharing not supported on this device');
            } else if (error.name === 'NotReadableError') {
                this.showNotification('❌ Camera is already in use by another app');
            } else if (error.name === 'OverconstrainedError') {
                this.showNotification('❌ Camera constraints not supported. Try with different settings.');
            } else {
                this.showNotification(`❌ Could not start sharing: ${error.message}`);
            }
        }
    }
    
    async setupWebRTCConnections() {
        if (!this.localStream || !window.WebSocketManager) return;
        
        console.log('🔗 Setting up WebRTC connections...');
        
        // Get connected users - try multiple approaches
        let connectedUsers = [];
        
        // Method 1: Check if getConnectedUsers exists
        if (typeof window.WebSocketManager.getConnectedUsers === 'function') {
            connectedUsers = window.WebSocketManager.getConnectedUsers();
            console.log('📡 Found connected users via getConnectedUsers:', connectedUsers);
        } else {
            console.log('⚠️ getConnectedUsers method not found, using alternative approach');
            
            // Method 2: Use room state or other available data
            // For now, we'll skip WebRTC setup and rely on WebSocket-only sharing
            console.log('📡 WebRTC peer connections not available, screen sharing will use WebSocket only');
            return;
        }
        
        if (!connectedUsers || connectedUsers.length === 0) {
            console.log('📡 No connected users found for WebRTC setup');
            return;
        }
        
        for (const userData of connectedUsers) {
            if (userData.user_id === window.WebSocketManager.userId) continue;
            
            try {
                console.log(`🔗 Setting up WebRTC connection to ${userData.user_id}`);
                
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
                
                // Handle connection state changes
                pc.onconnectionstatechange = () => {
                    console.log(`🔗 WebRTC connection to ${userData.user_id}: ${pc.connectionState}`);
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
                console.log(`✅ WebRTC setup initiated for ${userData.user_id}`);
                
            } catch (error) {
                console.error(`❌ Error setting up WebRTC connection to ${userData.user_id}:`, error);
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
    
    async handleRemoteStream(stream, userId) {
        console.log('📺 Handling remote stream from user:', userId);
        
        // Set the remote stream to our video element
        this.videoElement.srcObject = stream;
        this.mediaStream = stream;
        
        // CRITICAL FIX: Wait for remote video to be ready and start texture updates
        try {
            await this.waitForVideoReady(this.videoElement);
            this.startVideoTextureUpdates();
        } catch (error) {
            console.warn('⚠️ Remote video readiness check failed, starting anyway:', error);
            this.startVideoTextureUpdates();
        }
        
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
            // CRITICAL FIX: Stop texture updates first
            this.stopVideoTextureUpdates();
            
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
                
                // CRITICAL FIX: Stop texture updates for remote streams too
                this.stopVideoTextureUpdates();
                
                // Hide projection surface
                if (this.projectionSurface) {
                    this.animateProjectionOut();
                }
                
                // Clear state
                this.currentSharer = null;
                this.mediaStream = null;
                
                // Clear video element
                if (this.videoElement) {
                    this.videoElement.srcObject = null;
                }
                
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
        
        this.showNotification(`📺 Projection mode changed to: ${mode}`);
        console.log(`📺 Projection mode changed to: ${mode}`);
    }
    
    requestShareControl() {
        this.showNotification('🎮 Control request sent to sharer');
        // TODO: Implement control request system
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
        
        // Add the showScreenShareUI function for the existing button
        window.showScreenShareUI = () => this.showScreenShareUI();
        
        // Add debug functions
        window.testCameraAccess = () => this.testCameraAccess();
        window.debugScreenShare = () => this.debugScreenShare();
        window.testVideoTexture = () => this.testVideoTexture();
        window.fixVideoTextureNow = () => this.fixVideoTextureNow();
        window.testWithSolidColor = () => this.testWithSolidColor();
        
        console.log('✅ Screen sharing global functions setup');
    }
    
    // Debug functions
    async testCameraAccess() {
        console.log('🧪 Testing camera access...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            console.log('✅ Camera access successful');
            console.log('📹 Video tracks:', stream.getVideoTracks().length);
            
            // Stop the test stream
            stream.getTracks().forEach(track => track.stop());
            
            this.showNotification('✅ Camera test successful');
            return true;
        } catch (error) {
            console.error('❌ Camera test failed:', error);
            this.showNotification(`❌ Camera test failed: ${error.message}`);
            return false;
        }
    }
    
    debugScreenShare() {
        console.log('🔍 Screen Share Debug Info (Three.js r128):');
        console.log('📱 Is Mobile:', this.isMobile());
        console.log('🎥 getUserMedia supported:', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
        console.log('🖥️ getDisplayMedia supported:', !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia));
        console.log('🔧 Is sharing:', this.isSharing);
        console.log('🔄 Is texture updating:', this.isTextureUpdating);
        console.log('👤 Current sharer:', this.currentSharer);
        console.log('📹 Has video element:', !!this.videoElement);
        console.log('🎬 Has projection surface:', !!this.projectionSurface);
        console.log('🎯 Has projection texture:', !!this.projectionTexture);
        console.log('🌐 WebSocket Manager:', !!window.WebSocketManager);
        console.log('🎯 Projection mode:', this.projectionMode);
        console.log('📱 Camera facing:', this.cameraFacing);
        console.log('🎨 Three.js version:', THREE.REVISION);
        
        // Video element debug info
        if (this.videoElement) {
            console.log('📺 Video element debug:');
            console.log('  - Ready state:', this.videoElement.readyState);
            console.log('  - Video width:', this.videoElement.videoWidth);
            console.log('  - Video height:', this.videoElement.videoHeight);
            console.log('  - Paused:', this.videoElement.paused);
            console.log('  - Has src object:', !!this.videoElement.srcObject);
            console.log('  - Current time:', this.videoElement.currentTime);
            console.log('  - Duration:', this.videoElement.duration);
        }
        
        // Texture debug info
        if (this.projectionTexture) {
            console.log('🎨 Texture debug:');
            console.log('  - Needs update:', this.projectionTexture.needsUpdate);
            console.log('  - Format:', this.projectionTexture.format);
            console.log('  - Min filter:', this.projectionTexture.minFilter);
            console.log('  - Mag filter:', this.projectionTexture.magFilter);
            console.log('  - Image:', this.projectionTexture.image);
            console.log('  - Texture UUID:', this.projectionTexture.uuid);
        }
        
        // Material debug info
        if (this.projectionMaterial) {
            console.log('🎭 Material debug:');
            console.log('  - Type:', this.projectionMaterial.type);
            console.log('  - Has map:', !!this.projectionMaterial.map);
            console.log('  - Needs update:', this.projectionMaterial.needsUpdate);
            console.log('  - Visible:', this.projectionMaterial.visible);
            console.log('  - Transparent:', this.projectionMaterial.transparent);
            console.log('  - Opacity:', this.projectionMaterial.opacity);
        }
        
        // Scene lighting debug
        console.log('💡 Scene lighting:');
        let lightCount = 0;
        this.scene.traverse((child) => {
            if (child.isLight) {
                lightCount++;
                console.log(`  - ${child.type}: intensity ${child.intensity}`);
            }
        });
        console.log(`  - Total lights: ${lightCount}`);
        
        // Test camera access
        this.testCameraAccess();
    }
    
    showScreenShareUI() {
        // Create dedicated screen share UI
        const modal = document.createElement('div');
        modal.id = 'screen-share-modal';
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
        
        // Close modal function
        const closeModal = () => {
            const existingModal = document.getElementById('screen-share-modal');
            if (existingModal) {
                existingModal.remove();
            }
        };
        
        const isMobile = this.isMobile();
        const shareType = isMobile ? 'Camera' : 'Screen';
        const shareDescription = isMobile ? 
            'Share your camera view with everyone in the room.' : 
            'Share your screen with everyone in the room.';
        
        content.innerHTML = `
            <h2 style="margin-top: 0; color: #4CAF50;">${isMobile ? '📱' : '🖥️'} ${shareType} Sharing</h2>
            <p style="margin-bottom: 30px; color: #ccc;">
                ${shareDescription}
                Choose where to display it:
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                <div class="projection-option" data-mode="ceiling" 
                     style="padding: 20px; background: #333; border-radius: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">📺</div>
                    <div style="font-weight: bold;">Ceiling</div>
                    <div style="font-size: 12px; opacity: 0.7;">Above everyone</div>
                </div>
                
                <div class="projection-option" data-mode="wall" 
                     style="padding: 20px; background: #333; border-radius: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">🖼️</div>
                    <div style="font-weight: bold;">Wall</div>
                    <div style="font-size: 12px; opacity: 0.7;">On the wall</div>
                </div>
                
                <div class="projection-option" data-mode="floating" 
                     style="padding: 20px; background: #333; border-radius: 10px; cursor: pointer; transition: all 0.3s;">
                    <div style="font-size: 2em; margin-bottom: 10px;">✨</div>
                    <div style="font-weight: bold;">Floating</div>
                    <div style="font-size: 12px; opacity: 0.7;">In the air</div>
                </div>
            </div>
            
            ${isMobile ? `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(74, 144, 226, 0.1); border-radius: 8px; border: 1px solid rgba(74, 144, 226, 0.3);">
                    <div style="font-size: 14px; color: #4a90e2; margin-bottom: 8px;">📱 Mobile Camera Options</div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button id="front-camera" style="padding: 8px 16px; background: #4a90e2; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px;">
                            🤳 Front Camera
                        </button>
                        <button id="back-camera" style="padding: 8px 16px; background: #4a90e2; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 12px;">
                            📷 Back Camera
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="cancel-screen-share" 
                        style="padding: 12px 24px; background: #666; border: none; border-radius: 8px; 
                               color: white; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Add event listeners
        const projectionOptions = content.querySelectorAll('.projection-option');
        projectionOptions.forEach(option => {
            // Hover effects
            option.addEventListener('mouseenter', () => {
                option.style.background = '#444';
                option.style.transform = 'scale(1.05)';
            });
            option.addEventListener('mouseleave', () => {
                option.style.background = '#333';
                option.style.transform = 'scale(1)';
            });
            
            // Click handler
            option.addEventListener('click', () => {
                const mode = option.dataset.mode;
                this.projectionMode = mode;
                closeModal();
                this.startScreenShare();
            });
        });
        
        // Mobile camera selection
        if (isMobile) {
            const frontCameraBtn = content.querySelector('#front-camera');
            const backCameraBtn = content.querySelector('#back-camera');
            
            frontCameraBtn.addEventListener('click', () => {
                this.cameraFacing = 'user';
                frontCameraBtn.style.background = '#4CAF50';
                backCameraBtn.style.background = '#4a90e2';
            });
            
            backCameraBtn.addEventListener('click', () => {
                this.cameraFacing = 'environment';
                backCameraBtn.style.background = '#4CAF50';
                frontCameraBtn.style.background = '#4a90e2';
            });
            
            // Set default
            this.cameraFacing = 'environment';
            backCameraBtn.style.background = '#4CAF50';
        }
        
        // Cancel button
        const cancelButton = content.querySelector('#cancel-screen-share');
        cancelButton.addEventListener('click', closeModal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
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
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad detection
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
    
    // QUICK FIX: Method to test video texture directly
    testVideoTexture() {
        if (!this.videoElement || !this.projectionTexture) {
            console.log('❌ No video element or texture to test');
            return;
        }
        
        console.log('🧪 Testing video texture...');
        
        // Force texture update
        this.projectionTexture.needsUpdate = true;
        
        // Check video element
        const video = this.videoElement;
        console.log('📺 Video test results:');
        console.log('  - Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        console.log('  - Ready state:', video.readyState, '(need >= 2)');
        console.log('  - Current time:', video.currentTime);
        console.log('  - Paused:', video.paused);
        console.log('  - Ended:', video.ended);
        
        // Create test canvas to verify video content
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        
        try {
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, 10, 10);
            const pixels = Array.from(imageData.data.slice(0, 12));
            console.log('🎨 Video pixel data (first 12 values):', pixels);
            
            // Check if we have actual video data (not all zeros)
            const hasData = pixels.some(pixel => pixel > 0);
            console.log('✅ Video has actual content:', hasData);
            
            if (hasData) {
                console.log('✅ Video texture should work - issue might be in Three.js rendering');
                
                // ADDITIONAL FIX: Try to fix the texture right now
                this.fixVideoTextureNow();
            } else {
                console.log('❌ Video has no content - check stream source');
            }
            
        } catch (error) {
            console.log('❌ Cannot read video pixels:', error.message);
        }
        
        canvas.remove();
    }
    
    // NEW: Immediate video texture fix
    fixVideoTextureNow() {
        console.log('🔧 Applying immediate video texture fix...');
        
        if (!this.videoElement || !this.projectionTexture || !this.projectionMaterial) {
            console.log('❌ Missing components for texture fix');
            return;
        }
        
        // Force video to play
        if (this.videoElement.paused) {
            this.videoElement.play().catch(e => console.log('Video play failed:', e));
        }
        
        // Switch to RGBA format if not already
        if (this.projectionTexture.format !== THREE.RGBAFormat) {
            this.projectionTexture.format = THREE.RGBAFormat;
            console.log('🔄 Switched texture to RGBA format');
        }
        
        // Force texture update
        this.projectionTexture.needsUpdate = true;
        
        // Re-assign texture to material
        this.projectionMaterial.map = this.projectionTexture;
        this.projectionMaterial.needsUpdate = true;
        
        // Switch to unlit material if using Lambert
        if (this.projectionMaterial.type === 'MeshLambertMaterial') {
            const newMaterial = new THREE.MeshBasicMaterial({
                map: this.projectionTexture,
                side: THREE.DoubleSide,
                transparent: false,
                color: 0xffffff
            });
            
            // Update material on mesh
            const scene = this.scene;
            const projectionGroup = scene?.getObjectByName('screen-projection-group');
            if (projectionGroup) {
                const surface = projectionGroup.getObjectByName('screen-projection');
                if (surface) {
                    surface.material = newMaterial;
                    this.projectionMaterial = newMaterial;
                    console.log('🔄 Switched to unlit MeshBasicMaterial');
                }
            }
        }
        
        console.log('✅ Immediate video texture fix applied');
    }
    
    // NEW: Test with solid color for debugging
    testWithSolidColor() {
        console.log('🧪 Testing with solid color texture...');
        
        if (!this.projectionMaterial) {
            console.log('❌ No projection material available');
            return;
        }
        
        // Create solid red texture with text
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Red background
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 512, 512);
        
        // White text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TEST SCREEN', 256, 200);
        ctx.fillText('VISIBLE?', 256, 300);
        ctx.fillText(this.projectionMode.toUpperCase(), 256, 400);
        
        const testTexture = new THREE.CanvasTexture(canvas);
        
        // Apply to material
        this.projectionMaterial.map = testTexture;
        this.projectionMaterial.needsUpdate = true;
        
        console.log('✅ Applied solid color test texture');
        console.log('📺 You should see a bright red screen with white text');
        console.log(`📍 Look ${this.projectionMode === 'ceiling' ? 'UP' : this.projectionMode === 'wall' ? 'FORWARD' : 'UP-FORWARD'} to see it`);
    }
    
    // CRITICAL FIX: Cleanup method
    cleanup() {
        console.log('🧹 Cleaning up screen sharing system...');
        
        // Stop texture updates
        this.stopVideoTextureUpdates();
        
        // Stop streams
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Clear video element
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement.remove();
            this.videoElement = null;
        }
        
        // Dispose of Three.js resources
        if (this.projectionTexture) {
            this.projectionTexture.dispose();
            this.projectionTexture = null;
        }
        
        if (this.projectionMaterial) {
            this.projectionMaterial.dispose();
            this.projectionMaterial = null;
        }
        
        if (this.projectionSurface && this.scene) {
            this.scene.remove(this.projectionSurface);
            this.projectionSurface = null;
        }
        
        // Close peer connections
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        
        // Reset state
        this.isSharing = false;
        this.currentSharer = null;
        this.isTextureUpdating = false;
        
        console.log('✅ Screen sharing cleanup complete');
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

console.log('🖥️ Screen Sharing System with Three.js r128 compatibility loaded and ready!');
console.log('💡 Use window.testVideoTexture() to debug video content');
console.log('💡 Use window.debugScreenShare() for full debug info');