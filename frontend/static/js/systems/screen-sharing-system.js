// ================================
// EUPHORIE 3D COMPLETE SCREEN SHARING SYSTEM - DARK SCREEN FIXES
// Complete implementation with enhanced remote stream handling
// Version: 2.1.0 - Fixed Dark Screen Bug
// ================================

class EuphorieScreenSharingSystem {
    constructor() {
        console.log('🖥️ Initializing Enhanced Screen Sharing System v2.1.0...');
        
        // Core properties
        this.isInitialized = false;
        this.isSharing = false;
        this.mediaStream = null;
        this.videoElement = null;
        this.projectionSurface = null;
        this.projectionTexture = null;
        this.projectionMaterial = null;
        
        // ENHANCED: Video texture update system with dark screen fixes
        this.textureUpdateInterval = null;
        this.isTextureUpdating = false;
        this.videoMonitorInterval = null;
        this.debugMode = true;
        
        // Enhanced stream tracking for debugging
        this.receivedStreams = new Map(); // Track received streams
        this.videoPlayPromises = new Map(); // Track video play promises
        this.streamStartTimes = new Map(); // Track when streams started
        this.darkScreenDetection = new Map(); // Track dark screen detection
        
        // Screen sharing state
        this.activeShares = new Map();
        this.currentSharer = null;
        this.projectionMode = 'ceiling';
        this.shareDataStore = new Map(); // Store share data for orientation detection
        
        // WebRTC peer connections for screen sharing
        this.peerConnections = new Map();
        this.localStream = null;
        
        // Three.js references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Mobile orientation properties
        this.cameraFacing = 'environment';
        this.cameraSettings = null;
        this.cameraCapabilities = null;
        
        // Fullscreen properties - ENHANCED
        this.fullscreenOverlay = null;
        this.fullscreenExitHandlers = null;
        this.touchStartTime = null;
        this.raycaster = null;
        this.mouse = null;
        this.clickableProjection = null;
        this.canvasClickHandler = null;
        this.canvasDoubleClickHandler = null;
        this.canvasElement = null;
        
        // Configuration
        this.config = {
            maxSharers: 1,
            projectionWidth: 16,
            projectionHeight: 9,
            ceilingHeight: 8,
            wallDistance: 12,
            quality: 'high',
            frameRate: 30,
            autoSwitchOnStop: true,
            enableControls: true,
            // ENHANCED: Dark screen detection settings
            darkScreenThreshold: 10,
            darkScreenCheckInterval: 100,
            darkScreenMaxFrames: 30,
            videoPlayRetries: 5,
            videoContentTimeout: 10000
        };
        
        console.log('✅ Enhanced Screen Sharing System created with dark screen fixes');
    }
    
    async init() {
        console.log('🚀 Initializing Enhanced Screen Sharing System...');
        
        try {
            // Wait for Three.js scene
            if (!this.waitForScene()) {
                console.log('⏳ Waiting for Three.js scene...');
                setTimeout(() => this.init(), 500);
                return;
            }
            
            // Setup WebSocket integration - FIXED
            this.setupWebSocketIntegration();
            
            // Create projection surface with VideoTexture fix
            this.createProjectionSurface();
            
            // Setup global functions
            this.setupGlobalFunctions();
            
            // Setup orientation change listeners
            this.setupOrientationListeners();
            
            this.isInitialized = true;
            console.log('✅ Enhanced Screen Sharing System initialized with dark screen fixes');
            
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
    
    // FIXED: WebSocket integration that properly handles all message types
    setupWebSocketIntegration() {
        if (!window.WebSocketManager) {
            console.warn('⚠️ WebSocketManager not found, will retry...');
            setTimeout(() => this.setupWebSocketIntegration(), 1000);
            return;
        }

        console.log('🔗 Setting up WebSocket integration for screen sharing...');
        
        // Store original handler if it exists
        const originalHandleMessage = window.WebSocketManager.handleMessage;
        
        // FIXED: Override the handleMessage to intercept screen sharing messages
        window.WebSocketManager.handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Handle screen sharing messages first
                if (data.type && data.type.includes('screen_share')) {
                    console.log('📥 Screen sharing message received:', data.type);
                    this.handleWebSocketMessage(data);
                    return; // Don't pass to original handler
                }
                
                // Handle ongoing share notifications for late joiners
                if (data.type === 'ongoing_screen_share') {
                    console.log('📺 Ongoing screen share detected:', data);
                    this.handleOngoingScreenShare(data);
                    return;
                }
                
                // Handle new viewer notifications
                if (data.type === 'new_viewer_joined') {
                    console.log('👁️ New viewer joined:', data);
                    this.handleNewViewerJoined(data);
                    return;
                }
                
                // Handle viewer requests
                if (data.type === 'viewer_requests_offer') {
                    console.log('📤 Viewer requesting offer:', data);
                    this.handleViewerRequestsOffer(data);
                    return;
                }
                
                // Pass all other messages to original handler
                if (originalHandleMessage) {
                    originalHandleMessage.call(window.WebSocketManager, event);
                }
                
            } catch (error) {
                console.error('❌ Error handling WebSocket message:', error);
                // Fallback to original handler
                if (originalHandleMessage) {
                    originalHandleMessage.call(window.WebSocketManager, event);
                }
            }
        };
        
        // Add screen sharing methods to WebSocket manager
        this.addWebSocketMethods();
        
        console.log('✅ WebSocket integration setup complete');
    }

    // FIXED: Centralized WebSocket message handler for screen sharing
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'screen_share_started':
                this.handleScreenShareStarted(data);
                break;
            case 'screen_share_stopped':
                this.handleScreenShareStopped(data);
                break;
            case 'screen_share_webrtc_offer':
                this.handleWebRTCOffer(data);
                break;
            case 'screen_share_webrtc_answer':
                this.handleWebRTCAnswer(data);
                break;
            case 'screen_share_webrtc_candidate':
                this.handleWebRTCCandidate(data);
                break;
            case 'screen_share_webrtc_ready':
                this.handleWebRTCReady(data);
                break;
            default:
                console.log('🔍 Unknown screen sharing message type:', data.type);
        }
    }

    // ENHANCED: Handle screen share started with auto-connection
    handleScreenShareStarted(data) {
        if (data.user_id === window.WebSocketManager?.userId) {
            console.log('⏭️ Ignoring own screen share start message');
            return;
        }
        
        console.log(`📺 ${data.username} started sharing their screen`);
        
        // Store share data for orientation detection
        if (data.share_data) {
            this.storeShareData(data.user_id, data.share_data);
        }
        
        this.currentSharer = data.user_id;
        
        // Show notification with device type
        const deviceType = data.share_data?.mobile_device ? '📱 camera' : '🖥️ screen';
        this.showNotification(`📺 ${data.username} is sharing their ${deviceType}`);
        
        // Update projection mode if specified
        if (data.share_data?.projection_mode) {
            this.projectionMode = data.share_data.projection_mode;
            this.updateProjectionSurface();
        }
        
        // AUTO-CONNECT: Immediately try to connect to the sharer
        setTimeout(() => {
            this.autoConnectToSharer(data.user_id, data.username, data.share_data);
        }, 1000);
    }

    // ENHANCED: Handle screen share stopped
    handleScreenShareStopped(data) {
        if (data.user_id === this.currentSharer) {
            console.log(`📺 ${data.username} stopped sharing their screen`);
            
            // Clear share data
            if (this.shareDataStore) {
                this.shareDataStore.delete(data.user_id);
            }
            
            this.stopVideoTextureUpdates();
            
            if (this.videoMonitorInterval) {
                clearInterval(this.videoMonitorInterval);
                this.videoMonitorInterval = null;
            }
            
            if (this.projectionSurface) {
                this.animateProjectionOut();
            }
            
            this.currentSharer = null;
            this.mediaStream = null;
            
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            
            // Close peer connection
            const pc = this.peerConnections.get(data.user_id);
            if (pc) {
                pc.close();
                this.peerConnections.delete(data.user_id);
            }
            
            // Clean up tracking
            this.receivedStreams.delete(data.user_id);
            this.streamStartTimes.delete(data.user_id);
            this.darkScreenDetection.delete(data.user_id);
            
            this.showNotification(`📺 ${data.username} stopped sharing`);
            this.hideViewerControls();
        }
    }

    // NEW: Handle ongoing screen share for late joiners
    handleOngoingScreenShare(data) {
        console.log('📺 Handling ongoing screen share from:', data.username);
        
        if (data.user_id === window.WebSocketManager?.userId) {
            console.log('⏭️ Skipping ongoing share from self');
            return;
        }
        
        // Store share data
        if (data.share_data) {
            this.storeShareData(data.user_id, data.share_data);
        }
        
        this.currentSharer = data.user_id;
        
        // Update projection mode if specified
        if (data.share_data?.projection_mode) {
            this.projectionMode = data.share_data.projection_mode;
            this.updateProjectionSurface();
        }
        
        // Show notification
        const deviceType = data.share_data?.mobile_device ? '📱 camera' : '🖥️ screen';
        this.showNotification(`📺 ${data.username} is already sharing their ${deviceType}`);
        
        // Auto-connect to ongoing share with proper flow
        this.setupViewerConnection(data.user_id, data.username, data.share_data);
    }

    // NEW: Handle new viewer joined notification
    handleNewViewerJoined(data) {
        console.log('👁️ New viewer joined:', data.viewer_username);
        
        if (this.isSharing && this.localStream && data.sharer_user_id === window.WebSocketManager?.userId) {
            console.log('📤 Sending offer to new viewer:', data.viewer_user_id);
            setTimeout(() => {
                this.sendOfferToNewViewer(data.viewer_user_id);
            }, 1000);
        }
    }

    // NEW: Handle viewer requests offer
    handleViewerRequestsOffer(data) {
        console.log('📤 Viewer requesting offer:', data.viewer_username);
        
        if (this.isSharing && this.localStream) {
            console.log('📤 Sending offer to requesting viewer:', data.viewer_user_id);
            this.sendOfferToNewViewer(data.viewer_user_id);
        }
    }

    // Add WebSocket methods
    addWebSocketMethods() {
        window.WebSocketManager.sendScreenShareStart = (shareData) => {
            const message = {
                type: 'screen_share_started',
                user_id: window.WebSocketManager.userId,
                room_id: window.WebSocketManager.roomId,
                username: window.WebSocketManager.username,
                nationality: window.WebSocketManager.nationality || 'unknown',
                share_data: shareData,
                timestamp: Date.now()
            };
            console.log('📤 Sending screen share start:', message);
            window.WebSocketManager.send(message);
        };
        
        window.WebSocketManager.sendScreenShareStop = () => {
            const message = {
                type: 'screen_share_stopped',
                user_id: window.WebSocketManager.userId,
                room_id: window.WebSocketManager.roomId,
                username: window.WebSocketManager.username,
                nationality: window.WebSocketManager.nationality || 'unknown',
                timestamp: Date.now()
            };
            console.log('📤 Sending screen share stop:', message);
            window.WebSocketManager.send(message);
        };
        
        window.WebSocketManager.sendWebRTCMessage = (targetUserId, messageType, data) => {
            const message = {
                type: messageType,
                user_id: window.WebSocketManager.userId,
                room_id: window.WebSocketManager.roomId,
                target_user_id: targetUserId,
                nationality: window.WebSocketManager.nationality || 'unknown',
                data: data,
                timestamp: Date.now()
            };
            console.log(`📤 Sending WebRTC message (${messageType}) to ${targetUserId}:`, data);
            window.WebSocketManager.send(message);
        };

        // NEW: Request to join ongoing screen share
        window.WebSocketManager.sendJoinOngoingShare = (sharerUserId) => {
            const message = {
                type: 'join_ongoing_screen_share',
                user_id: window.WebSocketManager.userId,
                room_id: window.WebSocketManager.roomId,
                target_user_id: sharerUserId,
                nationality: window.WebSocketManager.nationality || 'unknown',
                timestamp: Date.now()
            };
            console.log('📤 Requesting to join ongoing share:', message);
            window.WebSocketManager.send(message);
        };
    }

    // ENHANCED: Auto-connect to sharer with better error handling
    async autoConnectToSharer(sharerUserId, sharerUsername, shareData) {
        if (sharerUserId === window.WebSocketManager?.userId) {
            console.log('⏭️ Skipping auto-connect to self');
            return;
        }
        
        console.log(`🌐 Auto-connecting to ${sharerUsername}'s screen share...`);
        
        try {
            // Create peer connection to receive stream
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            });
            
            // CRITICAL FIX: Handle incoming stream with enhanced processing
            pc.ontrack = (event) => {
                console.log(`📺 Receiving stream from ${sharerUsername}!`);
                const stream = event.streams[0];
                this.handleRemoteStreamEnhanced(stream, sharerUserId);
                this.showNotification(`✅ Now showing ${sharerUsername}'s screen!`);
            };
            
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`🧊 Sending ICE candidate to ${sharerUsername}`);
                    window.WebSocketManager.sendWebRTCMessage(
                        sharerUserId,
                        'screen_share_webrtc_candidate',
                        event.candidate
                    );
                }
            };
            
            // Connection state logging
            pc.onconnectionstatechange = () => {
                console.log(`🔗 Connection to ${sharerUsername}:`, pc.connectionState);
                if (pc.connectionState === 'connected') {
                    this.showNotification(`✅ Connected to ${sharerUsername}'s screen`);
                } else if (pc.connectionState === 'failed') {
                    this.showNotification(`❌ Failed to connect to ${sharerUsername}'s screen`);
                    // Retry connection
                    setTimeout(() => {
                        this.retryConnection(sharerUserId, sharerUsername);
                    }, 2000);
                }
            };
            
            // Store peer connection
            this.peerConnections.set(sharerUserId, pc);
            
            // Set current sharer
            this.currentSharer = sharerUserId;
            
            // Set projection mode from share data
            if (shareData?.projection_mode) {
                this.projectionMode = shareData.projection_mode;
                this.updateProjectionSurface();
            }
            
            // Send join request to notify sharer
            window.WebSocketManager.sendJoinOngoingShare(sharerUserId);
            
            console.log(`✅ Auto-connection setup complete for ${sharerUsername} - waiting for offer`);
            
        } catch (error) {
            console.error(`❌ Error auto-connecting to ${sharerUsername}:`, error);
            this.showNotification(`❌ Failed to connect to ${sharerUsername}'s screen`);
        }
    }

    // ================================
    // CRITICAL DARK SCREEN FIXES
    // ================================
    
    // CRITICAL FIX 1: Enhanced remote stream handling with proper video setup
    async handleRemoteStreamEnhanced(stream, userId) {
        console.log(`📺 [FIX] Enhanced remote stream handling for user: ${userId}`);
        console.log(`📺 [FIX] Stream details:`, {
            id: stream.id,
            active: stream.active,
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length
        });
        
        // Store received stream
        this.receivedStreams.set(userId, stream);
        this.streamStartTimes.set(userId, Date.now());
        
        // CRITICAL: Ensure video element is properly configured BEFORE setting stream
        if (!this.videoElement) {
            console.log('📺 [FIX] Creating new video element for remote stream');
            this.createProjectionSurface();
        }
        
        // Enhanced video element configuration for remote streams
        this.configureVideoElementForRemoteStream(this.videoElement, stream);
        
        // Set stream and wait for it to load properly
        this.videoElement.srcObject = stream;
        this.mediaStream = stream;
        
        try {
            // CRITICAL FIX: Force video to play and wait for actual readiness
            console.log('🎬 [FIX] Starting enhanced video play sequence...');
            await this.forceVideoPlayWithRetries(this.videoElement, userId);
            
            // Wait for video to have actual content
            await this.waitForVideoContent(this.videoElement, userId);
            
            // Check stream tracks are active
            this.verifyStreamTracks(stream, userId);
            
            // Apply mobile orientation fix if needed
            const shareData = this.getShareDataForUser(userId);
            if (shareData && shareData.mobile_device) {
                console.log('📱 [FIX] Applying mobile orientation fixes for remote stream');
                setTimeout(() => {
                    this.detectAndFixMobileOrientation();
                }, 500);
            }
            
            // CRITICAL: Enhanced texture update system
            this.startEnhancedVideoTextureUpdates();
            
            console.log('✅ [FIX] Remote stream setup completed successfully');
            
        } catch (error) {
            console.error('❌ [FIX] Remote video setup failed:', error);
            // Try fallback approach
            await this.fallbackVideoSetup(stream, userId);
        }
        
        // Show projection surface with enhanced visibility
        if (this.projectionSurface) {
            this.projectionSurface.visible = true;
            this.enhanceProjectionVisibility();
            this.animateProjectionIn();
        }
        
        this.currentSharer = userId;
        this.showViewerControls(userId);
        this.showNotification(`📺 Now viewing ${userId}'s screen`);
        
        // Start monitoring for dark screen issues
        this.startDarkScreenMonitoring(userId);
    }
    
    // CRITICAL FIX 2: Enhanced video element configuration
    configureVideoElementForRemoteStream(videoElement, stream) {
        console.log('🔧 [FIX] Configuring video element for remote stream');
        
        // Remove any existing event listeners to prevent conflicts
        const newVideo = videoElement.cloneNode();
        if (videoElement.parentNode) {
            videoElement.parentNode.replaceChild(newVideo, videoElement);
        } else {
            document.body.appendChild(newVideo);
        }
        this.videoElement = newVideo;
        
        // Enhanced video configuration
        this.videoElement.style.display = 'none';
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        this.videoElement.loop = false; // Important for streams
        this.videoElement.controls = false;
        this.videoElement.crossOrigin = 'anonymous';
        
        // CRITICAL: Set properties that help with WebRTC streams
        this.videoElement.disablePictureInPicture = true;
        this.videoElement.disableRemotePlayback = true;
        
        // Enhanced loading attributes
        this.videoElement.preload = 'auto';
        this.videoElement.defaultMuted = true;
        
        console.log('✅ [FIX] Video element configured for remote stream');
    }
    
    // CRITICAL FIX 3: Enhanced video play with retries and debugging
    async forceVideoPlayWithRetries(videoElement, userId, maxRetries = 5) {
        console.log(`🎬 [FIX] Force playing video for user ${userId} (max retries: ${maxRetries})`);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🎬 [FIX] Play attempt ${attempt}/${maxRetries} for user ${userId}`);
                
                // Cancel any pending play promises
                if (this.videoPlayPromises.has(userId)) {
                    try {
                        await this.videoPlayPromises.get(userId);
                    } catch (e) {
                        console.log('Previous play promise rejected, continuing...');
                    }
                }
                
                // Create new play promise
                const playPromise = videoElement.play();
                this.videoPlayPromises.set(userId, playPromise);
                
                await playPromise;
                
                console.log(`✅ [FIX] Video play successful on attempt ${attempt} for user ${userId}`);
                
                // Verify video is actually playing
                if (!videoElement.paused && videoElement.readyState >= 2) {
                    console.log(`✅ [FIX] Video confirmed playing for user ${userId}`);
                    return true;
                }
                
                console.warn(`⚠️ [FIX] Video play succeeded but video not ready, retrying...`);
                
            } catch (error) {
                console.warn(`⚠️ [FIX] Play attempt ${attempt} failed for user ${userId}:`, error.message);
                
                if (attempt === maxRetries) {
                    throw new Error(`Video play failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                console.log(`⏳ [FIX] Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        return false;
    }
    
    // CRITICAL FIX 4: Wait for actual video content (not just metadata)
    async waitForVideoContent(videoElement, userId, timeout = 10000) {
        console.log(`⏳ [FIX] Waiting for video content for user ${userId}...`);
        
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let checkAttempts = 0;
            const maxAttempts = timeout / 100;
            
            const checkContent = () => {
                checkAttempts++;
                const elapsed = Date.now() - startTime;
                
                // Check multiple conditions for content availability
                const hasMetadata = videoElement.readyState >= 1;
                const hasCurrentData = videoElement.readyState >= 2;
                const hasVideoSize = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;
                const isPlaying = !videoElement.paused && !videoElement.ended;
                const hasCurrentTime = videoElement.currentTime > 0;
                
                console.log(`🔍 [FIX] Content check ${checkAttempts}/${maxAttempts} for user ${userId}:`, {
                    readyState: videoElement.readyState,
                    videoSize: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
                    paused: videoElement.paused,
                    currentTime: videoElement.currentTime,
                    hasMetadata,
                    hasCurrentData,
                    hasVideoSize,
                    isPlaying,
                    hasCurrentTime
                });
                
                // Success condition: has data AND video dimensions AND is playing
                if (hasCurrentData && hasVideoSize && isPlaying) {
                    console.log(`✅ [FIX] Video content confirmed for user ${userId} after ${elapsed}ms`);
                    resolve();
                    return;
                }
                
                // Timeout condition
                if (elapsed >= timeout) {
                    console.warn(`⚠️ [FIX] Video content timeout for user ${userId} after ${elapsed}ms`);
                    console.warn(`⚠️ [FIX] Final state:`, {
                        readyState: videoElement.readyState,
                        videoSize: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
                        paused: videoElement.paused,
                        currentTime: videoElement.currentTime
                    });
                    
                    // Don't reject - continue with whatever we have
                    resolve();
                    return;
                }
                
                // Continue checking
                setTimeout(checkContent, 100);
            };
            
            // Add event listeners for faster detection
            const onLoadedData = () => {
                console.log(`📺 [FIX] Video loadeddata event for user ${userId}`);
                checkContent();
            };
            
            const onCanPlay = () => {
                console.log(`📺 [FIX] Video canplay event for user ${userId}`);
                checkContent();
            };
            
            const onTimeUpdate = () => {
                console.log(`📺 [FIX] Video timeupdate event for user ${userId} - currentTime:`, videoElement.currentTime);
                checkContent();
            };
            
            videoElement.addEventListener('loadeddata', onLoadedData, { once: true });
            videoElement.addEventListener('canplay', onCanPlay, { once: true });
            videoElement.addEventListener('timeupdate', onTimeUpdate, { once: true });
            
            // Start checking immediately
            checkContent();
        });
    }
    
    // CRITICAL FIX 5: Verify stream tracks are active and working
    verifyStreamTracks(stream, userId) {
        console.log(`🔍 [FIX] Verifying stream tracks for user ${userId}`);
        
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();
        
        console.log(`📹 [FIX] Video tracks (${videoTracks.length}):`, videoTracks.map(track => ({
            id: track.id,
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
            muted: track.muted
        })));
        
        console.log(`🎵 [FIX] Audio tracks (${audioTracks.length}):`, audioTracks.map(track => ({
            id: track.id,
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
            muted: track.muted
        })));
        
        // Check for issues
        const disabledVideoTracks = videoTracks.filter(track => !track.enabled);
        const endedVideoTracks = videoTracks.filter(track => track.readyState === 'ended');
        const mutedVideoTracks = videoTracks.filter(track => track.muted);
        
        if (disabledVideoTracks.length > 0) {
            console.warn(`⚠️ [FIX] ${disabledVideoTracks.length} disabled video tracks for user ${userId}`);
        }
        
        if (endedVideoTracks.length > 0) {
            console.warn(`⚠️ [FIX] ${endedVideoTracks.length} ended video tracks for user ${userId}`);
        }
        
        if (mutedVideoTracks.length > 0) {
            console.warn(`⚠️ [FIX] ${mutedVideoTracks.length} muted video tracks for user ${userId}`);
        }
        
        // Try to fix common issues
        videoTracks.forEach((track, index) => {
            if (!track.enabled) {
                console.log(`🔧 [FIX] Enabling video track ${index} for user ${userId}`);
                track.enabled = true;
            }
        });
        
        return {
            videoTracks: videoTracks.length,
            activeVideoTracks: videoTracks.filter(track => track.enabled && track.readyState === 'live').length,
            audioTracks: audioTracks.length,
            issues: {
                disabled: disabledVideoTracks.length,
                ended: endedVideoTracks.length,
                muted: mutedVideoTracks.length
            }
        };
    }
    
    // CRITICAL FIX 6: Enhanced texture update system with better error handling
    startEnhancedVideoTextureUpdates() {
        if (this.isTextureUpdating || !this.projectionTexture) {
            console.log('⚠️ [FIX] Enhanced texture updates already running or no texture available');
            return;
        }

        this.isTextureUpdating = true;
        console.log('🔄 [FIX] Starting enhanced video texture update loop...');

        // More aggressive texture updating with better error handling
        this.textureUpdateInterval = setInterval(() => {
            try {
                if (this.projectionTexture && this.videoElement) {
                    const video = this.videoElement;
                    
                    // Enhanced readiness checks
                    const isReady = video.readyState >= video.HAVE_CURRENT_DATA;
                    const isPlaying = !video.paused && !video.ended;
                    const hasSize = video.videoWidth > 0 && video.videoHeight > 0;
                    const hasTime = video.currentTime > 0;
                    
                    if (isReady && isPlaying && hasSize) {
                        // Force texture update
                        this.projectionTexture.needsUpdate = true;
                        
                        // CRITICAL: Ensure material is updated too
                        if (this.projectionMaterial) {
                            this.projectionMaterial.needsUpdate = true;
                            
                            // Verify material map is correct
                            if (this.projectionMaterial.map !== this.projectionTexture) {
                                console.log('🔧 [FIX] Reassigning texture to material');
                                this.projectionMaterial.map = this.projectionTexture;
                            }
                        }
                        
                        // Debug video state occasionally
                        if (Math.random() < 0.01) {
                            console.log(`📺 [FIX] Video: ${video.videoWidth}x${video.videoHeight}, Time: ${video.currentTime.toFixed(2)}, Ready: ${video.readyState}`);
                        }
                    } else {
                        // Debug why video isn't ready
                        if (Math.random() < 0.1) {
                            console.log(`🔍 [FIX] Video not ready:`, {
                                readyState: video.readyState,
                                paused: video.paused,
                                ended: video.ended,
                                videoSize: `${video.videoWidth}x${video.videoHeight}`,
                                currentTime: video.currentTime,
                                isReady,
                                isPlaying,
                                hasSize,
                                hasTime
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('❌ [FIX] Error in enhanced texture update:', error);
            }
        }, 16); // 60 FPS

        console.log('✅ [FIX] Enhanced video texture update loop started at 60 FPS');
    }
    
    // CRITICAL FIX 7: Enhanced projection visibility
    enhanceProjectionVisibility() {
        if (!this.projectionSurface || !this.projectionMaterial) return;
        
        console.log('🔧 [FIX] Enhancing projection visibility...');
        
        // Enhanced material settings for better visibility
        this.projectionMaterial.transparent = false;
        this.projectionMaterial.opacity = 1.0;
        this.projectionMaterial.side = THREE.DoubleSide;
        this.projectionMaterial.color.setHex(0xffffff);
        
        // CRITICAL: Ensure proper texture settings for Three.js r128
        if (this.projectionTexture) {
            this.projectionTexture.minFilter = THREE.LinearFilter;
            this.projectionTexture.magFilter = THREE.LinearFilter;
            this.projectionTexture.format = THREE.RGBAFormat;
            this.projectionTexture.generateMipmaps = false;
            this.projectionTexture.flipY = true;
            this.projectionTexture.wrapS = THREE.ClampToEdgeWrapping;
            this.projectionTexture.wrapT = THREE.ClampToEdgeWrapping;
        }
        
        // Add extra bright lighting specifically for the projection
        this.addProjectionLighting();
        
        console.log('✅ [FIX] Projection visibility enhanced');
    }
    
    // CRITICAL FIX 8: Add specific lighting for projection surface
    addProjectionLighting() {
        if (!this.scene || !this.projectionSurface) return;
        
        // Remove existing projection lighting
        const existingLights = this.scene.children.filter(child => 
            child.name && child.name.includes('projection-light')
        );
        existingLights.forEach(light => this.scene.remove(light));
        
        // Add very bright point light near projection surface
        const pointLight = new THREE.PointLight(0xffffff, 2.0, 100);
        const surfacePos = this.projectionSurface.position;
        pointLight.position.set(surfacePos.x, surfacePos.y + 5, surfacePos.z + 5);
        pointLight.name = 'projection-point-light';
        this.scene.add(pointLight);
        
        // Add directional light pointing at surface
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(surfacePos.x + 10, surfacePos.y + 10, surfacePos.z + 10);
        dirLight.target.position.copy(surfacePos);
        dirLight.name = 'projection-directional-light';
        this.scene.add(dirLight);
        this.scene.add(dirLight.target);
        
        console.log('💡 [FIX] Added projection-specific lighting');
    }
    
    // CRITICAL FIX 9: Fallback video setup for problematic streams
    async fallbackVideoSetup(stream, userId) {
        console.log(`🔧 [FIX] Attempting fallback video setup for user ${userId}`);
        
        try {
            // Create a new video element as fallback
            const fallbackVideo = document.createElement('video');
            this.configureVideoElementForRemoteStream(fallbackVideo, stream);
            
            // Replace current video element
            if (this.videoElement && this.videoElement.parentNode) {
                this.videoElement.parentNode.replaceChild(fallbackVideo, this.videoElement);
            } else {
                document.body.appendChild(fallbackVideo);
            }
            this.videoElement = fallbackVideo;
            
            // Set stream and try basic play
            this.videoElement.srcObject = stream;
            
            // Simple play without retries
            await this.videoElement.play();
            
            // Force texture recreation
            if (this.projectionTexture) {
                this.projectionTexture.dispose();
            }
            
            this.projectionTexture = new THREE.VideoTexture(this.videoElement);
            this.projectionTexture.minFilter = THREE.LinearFilter;
            this.projectionTexture.magFilter = THREE.LinearFilter;
            
            if (this.projectionMaterial) {
                this.projectionMaterial.map = this.projectionTexture;
                this.projectionMaterial.needsUpdate = true;
            }
            
            console.log('✅ [FIX] Fallback video setup completed');
            
        } catch (error) {
            console.error('❌ [FIX] Fallback video setup also failed:', error);
            this.showNotification('❌ Video setup failed - trying test pattern');
            this.showTestPattern();
        }
    }
    
    // CRITICAL FIX 10: Dark screen monitoring and auto-recovery
    startDarkScreenMonitoring(userId) {
        console.log(`🕵️ [FIX] Starting dark screen monitoring for user ${userId}`);
        
        let consecutiveDarkFrames = 0;
        const maxDarkFrames = this.config.darkScreenMaxFrames;
        
        const monitorInterval = setInterval(() => {
            if (!this.videoElement || this.currentSharer !== userId) {
                clearInterval(monitorInterval);
                return;
            }
            
            try {
                // Create canvas to sample video pixels
                const canvas = document.createElement('canvas');
                const video = this.videoElement;
                
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                    canvas.width = Math.min(video.videoWidth, 100);
                    canvas.height = Math.min(video.videoHeight, 100);
                    const ctx = canvas.getContext('2d');
                    
                    // Draw video frame
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    // Sample pixels
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imageData.data;
                    
                    // Calculate average brightness
                    let totalBrightness = 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                        const r = pixels[i];
                        const g = pixels[i + 1];
                        const b = pixels[i + 2];
                        totalBrightness += (r + g + b) / 3;
                    }
                    
                    const avgBrightness = totalBrightness / (pixels.length / 4);
                    
                    // Check if frame is too dark (possibly black)
                    if (avgBrightness < this.config.darkScreenThreshold) {
                        consecutiveDarkFrames++;
                        
                        if (consecutiveDarkFrames >= maxDarkFrames) {
                            console.warn(`🚨 [FIX] Dark screen detected for user ${userId} - attempting recovery`);
                            this.attemptDarkScreenRecovery(userId);
                            consecutiveDarkFrames = 0; // Reset counter
                        }
                    } else {
                        consecutiveDarkFrames = 0; // Reset counter on good frame
                    }
                    
                    canvas.remove();
                }
                
            } catch (error) {
                // Ignore errors in monitoring - don't spam console
            }
            
        }, this.config.darkScreenCheckInterval);
        
        // Store monitoring reference
        this.darkScreenDetection.set(userId, monitorInterval);
        
        // Stop monitoring after 30 seconds
        setTimeout(() => {
            clearInterval(monitorInterval);
            this.darkScreenDetection.delete(userId);
            console.log(`🕵️ [FIX] Dark screen monitoring ended for user ${userId}`);
        }, 30000);
    }
    
    // CRITICAL FIX 11: Dark screen recovery mechanisms
    async attemptDarkScreenRecovery(userId) {
        console.log(`🚑 [FIX] Attempting dark screen recovery for user ${userId}`);
        
        try {
            // Recovery step 1: Force video play again
            console.log('🚑 [FIX] Recovery step 1: Force video replay');
            await this.videoElement.play();
            
            // Recovery step 2: Force texture update
            console.log('🚑 [FIX] Recovery step 2: Force texture update');
            if (this.projectionTexture) {
                this.projectionTexture.needsUpdate = true;
            }
            
            // Recovery step 3: Recreate texture if needed
            console.log('🚑 [FIX] Recovery step 3: Recreate texture');
            const oldTexture = this.projectionTexture;
            this.projectionTexture = new THREE.VideoTexture(this.videoElement);
            this.projectionTexture.minFilter = THREE.LinearFilter;
            this.projectionTexture.magFilter = THREE.LinearFilter;
            
            if (this.projectionMaterial) {
                this.projectionMaterial.map = this.projectionTexture;
                this.projectionMaterial.needsUpdate = true;
            }
            
            // Dispose old texture
            if (oldTexture) {
                oldTexture.dispose();
            }
            
            // Recovery step 4: Check WebRTC connection
            console.log('🚑 [FIX] Recovery step 4: Check WebRTC connection');
            const pc = this.peerConnections.get(userId);
            if (pc && pc.connectionState !== 'connected') {
                console.warn(`🚑 [FIX] WebRTC connection issue: ${pc.connectionState}`);
                // Could trigger reconnection here
            }
            
            this.showNotification('🚑 Attempting to fix dark screen...');
            
        } catch (error) {
            console.error('❌ [FIX] Dark screen recovery failed:', error);
            this.showNotification('❌ Could not fix dark screen - please refresh');
        }
    }
    
    // CRITICAL FIX 12: Show test pattern for debugging
    showTestPattern() {
        console.log('🧪 [FIX] Showing test pattern for debugging');
        
        // Create colorful test pattern
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw colorful pattern
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.25, '#00ff00');
        gradient.addColorStop(0.5, '#0000ff');
        gradient.addColorStop(0.75, '#ffff00');
        gradient.addColorStop(1, '#ff00ff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('VIDEO FEED', 256, 200);
        ctx.fillText('TEST PATTERN', 256, 250);
        ctx.fillText('FAILED', 256, 300);
        
        // Create texture from canvas
        const testTexture = new THREE.CanvasTexture(canvas);
        
        if (this.projectionMaterial) {
            this.projectionMaterial.map = testTexture;
            this.projectionMaterial.needsUpdate = true;
        }
        
        console.log('✅ [FIX] Test pattern displayed');
    }

    // NEW: Auto-connect to ongoing share for late joiners
    async autoConnectToOngoingShare(sharerUserId, sharerUsername, shareData) {
        if (sharerUserId === window.WebSocketManager?.userId) {
            return;
        }
        
        console.log(`📺 Auto-connecting to ongoing share from ${sharerUsername}...`);
        
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            pc.ontrack = (event) => {
                console.log(`📺 Connected to ongoing share from ${sharerUsername}!`);
                this.handleRemoteStreamEnhanced(event.streams[0], sharerUserId);
                this.showNotification(`✅ Joined ${sharerUsername}'s screen share!`);
            };
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    window.WebSocketManager.sendWebRTCMessage(
                        sharerUserId,
                        'screen_share_webrtc_candidate',
                        event.candidate
                    );
                }
            };
            
            this.peerConnections.set(sharerUserId, pc);
            this.currentSharer = sharerUserId;
            
            if (shareData?.projection_mode) {
                this.projectionMode = shareData.projection_mode;
                this.updateProjectionSurface();
            }
            
            // Request connection to sharer
            this.requestConnectionToSharer(sharerUserId);
            
        } catch (error) {
            console.error(`❌ Error connecting to ongoing share:`, error);
        }
    }

    // NEW: Request connection to sharer
    requestConnectionToSharer(sharerUserId) {
        console.log('📤 Requesting connection to sharer...');
        
        if (window.WebSocketManager && window.WebSocketManager.send) {
            window.WebSocketManager.send({
                type: 'join_ongoing_screen_share',
                user_id: window.WebSocketManager.userId,
                room_id: window.WebSocketManager.roomId,
                target_user_id: sharerUserId,
                nationality: window.WebSocketManager.nationality || 'unknown',
                timestamp: Date.now()
            });
        }
    }

    // NEW: Send offer to new viewer
    async sendOfferToNewViewer(viewerId) {
        if (!this.localStream || !this.isSharing) {
            console.log('❌ Cannot send offer - not sharing or no stream');
            return;
        }
        
        try {
            console.log(`📤 Sending offer to new viewer: ${viewerId}`);
            
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    window.WebSocketManager.sendWebRTCMessage(
                        viewerId,
                        'screen_share_webrtc_candidate',
                        event.candidate
                    );
                }
            };
            
            pc.onconnectionstatechange = () => {
                console.log(`🔗 Connection to viewer ${viewerId}: ${pc.connectionState}`);
                if (pc.connectionState === 'connected') {
                    this.showNotification(`✅ New viewer connected`);
                }
            };
            
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
            
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            window.WebSocketManager.sendWebRTCMessage(
                viewerId,
                'screen_share_webrtc_offer',
                offer
            );
            
            this.peerConnections.set(viewerId, pc);
            console.log(`✅ Offer sent to new viewer: ${viewerId}`);
            
        } catch (error) {
            console.error(`❌ Failed to send offer to viewer ${viewerId}:`, error);
        }
    }

    // NEW: Retry connection on failure
    async retryConnection(sharerUserId, sharerUsername) {
        console.log(`🔄 Retrying connection to ${sharerUsername}...`);
        
        // Close existing connection
        const existingPc = this.peerConnections.get(sharerUserId);
        if (existingPc) {
            existingPc.close();
            this.peerConnections.delete(sharerUserId);
        }
        
        // Request new connection
        this.requestConnectionToSharer(sharerUserId);
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
        this.videoElement.crossOrigin = 'anonymous';
        document.body.appendChild(this.videoElement);
        
        // Create VideoTexture with correct orientation
        this.projectionTexture = new THREE.VideoTexture(this.videoElement);
        this.projectionTexture.minFilter = THREE.LinearFilter;
        this.projectionTexture.magFilter = THREE.LinearFilter;
        this.projectionTexture.format = THREE.RGBAFormat;
        this.projectionTexture.generateMipmaps = false;
        this.projectionTexture.flipY = true;
        this.projectionTexture.wrapS = THREE.ClampToEdgeWrapping;
        this.projectionTexture.wrapT = THREE.ClampToEdgeWrapping;
        this.projectionTexture.needsUpdate = true;
        
        // Use MeshBasicMaterial for unlit rendering
        this.projectionMaterial = new THREE.MeshBasicMaterial({
            map: this.projectionTexture,
            transparent: false,
            side: THREE.DoubleSide,
            color: 0xffffff
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
        
        const geometry = new THREE.PlaneGeometry(12, 7);
        let position;
        let rotation;
        
        switch (this.projectionMode) {
            case 'ceiling':
                position = new THREE.Vector3(0, 15, 0);
                rotation = new THREE.Euler(-Math.PI / 2, 0, 0);
                console.log('📺 Ceiling mode: Looking UP to see screen on ceiling');
                break;
                
            case 'wall':
                position = new THREE.Vector3(0, 6, -12);
                rotation = new THREE.Euler(0, 0, 0);
                console.log('📺 Wall mode: Looking FORWARD to see screen on wall');
                break;
                
            case 'floating':
                position = new THREE.Vector3(0, 10, -8);
                rotation = new THREE.Euler(-Math.PI / 6, 0, 0);
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
        
        // Add bright lighting for video visibility
        this.ensureProjectionLighting();
        
        // Add bright border for debugging positioning
        const borderGeometry = new THREE.EdgesGeometry(geometry);
        const borderMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
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
        projectionGroup.visible = true;
        
        // ENHANCED: Add click handler for fullscreen
        this.addFullscreenClickHandler(projectionGroup);
        
        this.scene.add(projectionGroup);
        this.projectionSurface = projectionGroup;
        
        console.log(`✅ Projection surface updated (mode: ${this.projectionMode}) with fullscreen click support`);
    }
    
    // NEW: Add fullscreen click handler to projection surface
    addFullscreenClickHandler(projectionGroup) {
        // Set up raycasting for click detection
        if (!this.raycaster) {
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
            this.setupScreenClickListener();
        }
        
        // Store reference for click detection
        this.clickableProjection = projectionGroup;
        
        console.log('🖱️ Fullscreen click handler added to projection surface');
    }
    
    // NEW: Setup global click listener for screen interaction - FIXED VERSION
    setupScreenClickListener() {
        // Try multiple methods to find the canvas and camera
        let canvas = null;
        let camera = null;
        
        // Method 1: Try renderer domElement
        if (this.renderer?.domElement) {
            canvas = this.renderer.domElement;
            camera = this.camera;
        }
        
        // Method 2: Try SceneManager
        if (!canvas && window.SceneManager) {
            canvas = window.SceneManager.renderer?.domElement;
            camera = window.SceneManager.camera;
        }
        
        // Method 3: Try any canvas element
        if (!canvas) {
            canvas = document.querySelector('canvas');
            camera = window.camera || this.camera;
        }
        
        // Method 4: Try Three.js container
        if (!canvas) {
            const threeContainer = document.getElementById('three-container');
            if (threeContainer) {
                canvas = threeContainer.querySelector('canvas');
            }
        }
        
        if (!canvas) {
            console.warn('⚠️ No canvas found for click detection, will retry...');
            // Retry after a delay
            setTimeout(() => this.setupScreenClickListener(), 2000);
            return;
        }
        
        if (!camera) {
            console.warn('⚠️ No camera found for click detection, will retry...');
            setTimeout(() => this.setupScreenClickListener(), 2000);
            return;
        }
        
        console.log('🖱️ Found canvas and camera for click detection');
        
        const handleClick = (event) => {
            if (!this.clickableProjection || !camera) {
                console.log('🖱️ Click detected but no projection surface available');
                return;
            }
            
            // Calculate mouse position in normalized device coordinates
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            console.log('🖱️ Click position:', this.mouse.x, this.mouse.y);
            
            // Update raycaster
            this.raycaster.setFromCamera(this.mouse, camera);
            
            // Check for intersections with projection surface
            const intersects = this.raycaster.intersectObjects([this.clickableProjection], true);
            
            console.log('🖱️ Intersections found:', intersects.length);
            
            if (intersects.length > 0) {
                console.log('🖱️ Projection screen clicked - entering fullscreen');
                this.enterFullscreen();
            }
        };
        
        // Add click event listener
        canvas.addEventListener('click', handleClick);
        
        // Store reference for cleanup
        this.canvasClickHandler = handleClick;
        this.canvasElement = canvas;
        this.camera = camera; // Store camera reference
        
        console.log('🖱️ Screen click listener setup complete on canvas');
        
        // ALTERNATIVE: Also add a simpler fallback - double-click anywhere on canvas
        const handleDoubleClick = (event) => {
            if (this.isSharing || this.currentSharer) {
                console.log('🖱️ Double-click detected - entering fullscreen (fallback)');
                this.enterFullscreen();
            }
        };
        
        canvas.addEventListener('dblclick', handleDoubleClick);
        this.canvasDoubleClickHandler = handleDoubleClick;
        
        console.log('🖱️ Added double-click fallback for fullscreen');
    }
    
    // NEW: Enter fullscreen mode
    async enterFullscreen() {
        try {
            console.log('🖥️ Entering fullscreen mode...');
            
            // Create fullscreen overlay
            this.createFullscreenOverlay();
            
            // Try to enter browser fullscreen
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen();
            } else if (document.documentElement.msRequestFullscreen) {
                await document.documentElement.msRequestFullscreen();
            }
            
            this.showNotification('🖥️ Fullscreen mode activated - Press ESC to exit');
            
        } catch (error) {
            console.log('⚠️ Browser fullscreen not available, using overlay fullscreen');
            // Fallback to custom fullscreen overlay
            this.showNotification('🖥️ Fullscreen view activated - Click outside to exit');
        }
    }
    
    // NEW: Create fullscreen video overlay - ENHANCED WITH TOUCH TO EXIT
    createFullscreenOverlay() {
        // Remove existing overlay
        this.removeFullscreenOverlay();
        
        // Create fullscreen container
        this.fullscreenOverlay = document.createElement('div');
        this.fullscreenOverlay.id = 'screen-share-fullscreen';
        this.fullscreenOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000;
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            touch-action: manipulation;
            user-select: none;
            -webkit-user-select: none;
            -webkit-touch-callout: none;
        `;
        
        // Create fullscreen video element
        const fullscreenVideo = document.createElement('video');
        fullscreenVideo.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            pointer-events: none;
        `;
        
        // Copy video source and properties
        if (this.videoElement && this.videoElement.srcObject) {
            fullscreenVideo.srcObject = this.videoElement.srcObject;
            fullscreenVideo.autoplay = true;
            fullscreenVideo.muted = true;
            fullscreenVideo.playsInline = true;
            
            // Apply same orientation fixes to fullscreen video
            if (this.videoElement.style.transform) {
                fullscreenVideo.style.transform = this.videoElement.style.transform;
            }
        }
        
        // Create enhanced exit hint with animations
        const exitHint = document.createElement('div');
        exitHint.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            animation: fullscreenHint 4s ease-in-out;
            text-align: center;
            pointer-events: none;
        `;
        
        // Detect device type for appropriate hint
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        exitHint.innerHTML = `
            <div style="margin-bottom: 4px;">📺 Fullscreen Mode</div>
            <div style="font-size: 12px; opacity: 0.8;">
                ${isMobile ? 'Tap anywhere to exit' : 'Click anywhere or press ESC to exit'}
            </div>
        `;
        
        // Add enhanced animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fullscreenHint {
                0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                85% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
            
            @keyframes pulseExit {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        // Create tap/click indicator for better UX
        const tapIndicator = document.createElement('div');
        tapIndicator.style.cssText = `
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,255,255,0.1);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            opacity: 0.7;
            animation: pulseExit 2s ease-in-out infinite;
            pointer-events: none;
            border: 1px solid rgba(255,255,255,0.2);
        `;
        tapIndicator.textContent = isMobile ? '👆 Tap to exit' : '🖱️ Click to exit';
        
        // Assemble fullscreen overlay
        this.fullscreenOverlay.appendChild(fullscreenVideo);
        this.fullscreenOverlay.appendChild(exitHint);
        this.fullscreenOverlay.appendChild(tapIndicator);
        document.body.appendChild(this.fullscreenOverlay);
        
        // Add exit handlers with enhanced touch support
        this.setupFullscreenExitHandlers();
        
        console.log('🖥️ Fullscreen overlay created with touch/click to exit');
    }
    
    // ENHANCED: Setup fullscreen exit handlers with better touch support
    setupFullscreenExitHandlers() {
        if (!this.fullscreenOverlay) return;
        
        // Enhanced click/touch to exit - works anywhere on the overlay
        const clickTouchExit = (event) => {
            console.log('🖱️ Fullscreen overlay touched/clicked - exiting');
            event.preventDefault();
            event.stopPropagation();
            this.exitFullscreen();
        };
        
        // Escape key to exit
        const keyExit = (event) => {
            if (event.key === 'Escape') {
                console.log('⌨️ ESC key pressed - exiting fullscreen');
                this.exitFullscreen();
            }
        };
        
        // Browser fullscreen change
        const fullscreenExit = () => {
            if (!document.fullscreenElement && 
                !document.webkitFullscreenElement && 
                !document.msFullscreenElement) {
                console.log('🖥️ Browser fullscreen exited - cleaning up overlay');
                this.exitFullscreen();
            }
        };
        
        // Enhanced touch support for mobile
        const touchStart = (event) => {
            // Prevent default touch behaviors
            event.preventDefault();
            this.touchStartTime = Date.now();
        };
        
        const touchEnd = (event) => {
            event.preventDefault();
            const touchDuration = Date.now() - (this.touchStartTime || 0);
            
            // Only exit on quick taps (not long presses)
            if (touchDuration < 500) {
                console.log('📱 Quick tap detected - exiting fullscreen');
                this.exitFullscreen();
            }
        };
        
        // Add all event listeners
        this.fullscreenOverlay.addEventListener('click', clickTouchExit);
        this.fullscreenOverlay.addEventListener('touchstart', touchStart, { passive: false });
        this.fullscreenOverlay.addEventListener('touchend', touchEnd, { passive: false });
        
        document.addEventListener('keydown', keyExit);
        document.addEventListener('fullscreenchange', fullscreenExit);
        document.addEventListener('webkitfullscreenchange', fullscreenExit);
        document.addEventListener('msfullscreenchange', fullscreenExit);
        
        // Store handlers for cleanup
        this.fullscreenExitHandlers = {
            clickTouchExit,
            touchStart,
            touchEnd,
            keyExit,
            fullscreenExit
        };
        
        console.log('✅ Enhanced fullscreen exit handlers setup (click, touch, keyboard)');
    }
    
    // NEW: Exit fullscreen mode
    exitFullscreen() {
        console.log('🖥️ Exiting fullscreen mode...');
        
        // Exit browser fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        
        // Remove overlay
        this.removeFullscreenOverlay();
        
        this.showNotification('🖥️ Exited fullscreen mode');
    }
    
    // ENHANCED: Remove fullscreen overlay with better cleanup
    removeFullscreenOverlay() {
        if (this.fullscreenOverlay) {
            // Remove enhanced event listeners
            if (this.fullscreenExitHandlers) {
                // Remove overlay-specific listeners
                if (this.fullscreenExitHandlers.clickTouchExit) {
                    this.fullscreenOverlay.removeEventListener('click', this.fullscreenExitHandlers.clickTouchExit);
                }
                if (this.fullscreenExitHandlers.touchStart) {
                    this.fullscreenOverlay.removeEventListener('touchstart', this.fullscreenExitHandlers.touchStart);
                }
                if (this.fullscreenExitHandlers.touchEnd) {
                    this.fullscreenOverlay.removeEventListener('touchend', this.fullscreenExitHandlers.touchEnd);
                }
                
                // Remove document-level listeners
                if (this.fullscreenExitHandlers.keyExit) {
                    document.removeEventListener('keydown', this.fullscreenExitHandlers.keyExit);
                }
                if (this.fullscreenExitHandlers.fullscreenExit) {
                    document.removeEventListener('fullscreenchange', this.fullscreenExitHandlers.fullscreenExit);
                    document.removeEventListener('webkitfullscreenchange', this.fullscreenExitHandlers.fullscreenExit);
                    document.removeEventListener('msfullscreenchange', this.fullscreenExitHandlers.fullscreenExit);
                }
            }
            
            this.fullscreenOverlay.remove();
            this.fullscreenOverlay = null;
            this.fullscreenExitHandlers = null;
            this.touchStartTime = null;
            
            console.log('🧹 Fullscreen overlay and all handlers cleaned up');
        }
    }
    
    ensureProjectionLighting() {
        if (!this.scene) return;
        
        // Remove existing screen sharing lights first
        const existingLights = this.scene.children.filter(child => 
            child.name && child.name.includes('screen-sharing')
        );
        existingLights.forEach(light => this.scene.remove(light));
        
        // Add very bright ambient light for video visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
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

    // ================================
    // MOBILE ORIENTATION FIX METHODS
    // ================================
    
    detectAndFixMobileOrientation() {
        if (!this.isMobile() || !this.videoElement || !this.projectionTexture) {
            return;
        }
        
        console.log('📱 Auto-detecting and fixing mobile orientation seamlessly...');
        
        // Get comprehensive device and browser info
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);
        const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
        const isChrome = /Chrome/.test(userAgent);
        const isFirefox = /Firefox/.test(userAgent);
        const isEdge = /Edge/.test(userAgent);
        
        // Get camera info
        const isBackCamera = this.cameraFacing === 'environment';
        const isFrontCamera = this.cameraFacing === 'user';
        
        console.log('📱 Device analysis:', {
            isIOS,
            isAndroid,
            isSafari,
            isChrome,
            isFirefox,
            isEdge,
            cameraFacing: this.cameraFacing,
            isBackCamera,
            isFrontCamera
        });
        
        // Apply smart device-specific fixes automatically
        let fixApplied = false;
        
        if (isIOS) {
            if (isSafari) {
                // iOS Safari - typically needs flipY
                this.projectionTexture.flipY = true;
                console.log('📱 Applied iOS Safari fix: flipY = true');
                fixApplied = true;
            } else if (isChrome) {
                // iOS Chrome - needs both flipY and CSS transform
                this.projectionTexture.flipY = true;
                this.videoElement.style.transform = 'scaleY(-1)';
                console.log('📱 Applied iOS Chrome fix: flipY + scaleY(-1)');
                fixApplied = true;
            } else {
                // iOS other browsers
                this.projectionTexture.flipY = true;
                console.log('📱 Applied iOS other browser fix: flipY = true');
                fixApplied = true;
            }
        } else if (isAndroid) {
            if (isChrome) {
                // Android Chrome - typically just needs CSS transform
                this.videoElement.style.transform = 'scaleY(-1)';
                console.log('📱 Applied Android Chrome fix: scaleY(-1)');
                fixApplied = true;
            } else if (isFirefox) {
                // Android Firefox - needs flipY
                this.projectionTexture.flipY = true;
                console.log('📱 Applied Android Firefox fix: flipY = true');
                fixApplied = true;
            } else {
                // Android other browsers - try flipY first
                this.projectionTexture.flipY = true;
                console.log('📱 Applied Android other browser fix: flipY = true');
                fixApplied = true;
            }
        } else {
            // Unknown mobile device - try flipY as default
            this.projectionTexture.flipY = true;
            console.log('📱 Applied unknown device fix: flipY = true');
            fixApplied = true;
        }
        
        // Force texture and material updates
        if (fixApplied) {
            this.projectionTexture.needsUpdate = true;
            if (this.projectionMaterial) {
                this.projectionMaterial.needsUpdate = true;
            }
            
            // Set up intelligent fallback detection
            this.setupIntelligentFallback();
            
            console.log('✅ Seamless mobile orientation fix applied automatically');
        }
    }
    
    // NEW: Intelligent fallback system that detects if the fix worked
    setupIntelligentFallback() {
        // Wait a moment for the fix to take effect, then verify
        setTimeout(() => {
            this.verifyOrientationFix();
        }, 2000);
    }
    
    // NEW: Verify if orientation fix worked and apply fallback if needed
    verifyOrientationFix() {
        if (!this.videoElement || !this.projectionTexture) return;
        
        console.log('🔍 Verifying orientation fix effectiveness...');
        
        try {
            // Create a test canvas to analyze video content
            const canvas = document.createElement('canvas');
            const video = this.videoElement;
            
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                
                // Draw current video frame
                ctx.drawImage(video, 0, 0);
                
                // Analyze pixel distribution to detect if image looks upside down
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const isLikelyUpsideDown = this.analyzeImageOrientation(imageData, canvas.width, canvas.height);
                
                if (isLikelyUpsideDown) {
                    console.log('🔄 First fix insufficient, applying fallback...');
                    this.applyFallbackFix();
                } else {
                    console.log('✅ Orientation fix appears successful');
                }
                
                canvas.remove();
            }
        } catch (error) {
            console.log('⚠️ Could not verify orientation, fix likely applied correctly');
        }
    }
    
    // NEW: Analyze image to detect if it's likely upside down
    analyzeImageOrientation(imageData, width, height) {
        // Simple heuristic: compare top and bottom portions of the image
        // This is a basic implementation - you could make it more sophisticated
        
        const topPortion = this.getAverageBrightness(imageData, 0, 0, width, Math.floor(height * 0.3));
        const bottomPortion = this.getAverageBrightness(imageData, 0, Math.floor(height * 0.7), width, height);
        
        // In many cases, upside-down images have different brightness patterns
        // This is a simple heuristic and may not work for all scenarios
        const brightnessDiff = Math.abs(topPortion - bottomPortion);
        
        // If there's a significant difference, it might indicate orientation issues
        // This is just one possible heuristic - you might want to remove this or improve it
        console.log('🔍 Image analysis:', { topPortion, bottomPortion, brightnessDiff });
        
        // For now, we'll be conservative and not auto-apply fallback based on this analysis
        // Instead, we'll rely on the device-specific fixes
        return false;
    }
    
    // NEW: Get average brightness of image region
    getAverageBrightness(imageData, x, y, width, height) {
        let totalBrightness = 0;
        let pixelCount = 0;
        
        for (let row = y; row < y + height && row < imageData.height; row++) {
            for (let col = x; col < x + width && col < imageData.width; col++) {
                const index = (row * imageData.width + col) * 4;
                const r = imageData.data[index];
                const g = imageData.data[index + 1];
                const b = imageData.data[index + 2];
                
                // Calculate brightness using standard formula
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                totalBrightness += brightness;
                pixelCount++;
            }
        }
        
        return pixelCount > 0 ? totalBrightness / pixelCount : 0;
    }
    
    // NEW: Apply fallback fix if initial fix didn't work
    applyFallbackFix() {
        console.log('🔄 Applying intelligent fallback orientation fix...');
        
        // Try the opposite approach
        if (this.videoElement.style.transform.includes('scaleY(-1)')) {
            // If CSS transform was applied, try removing it and using flipY instead
            this.videoElement.style.transform = this.videoElement.style.transform.replace('scaleY(-1)', '').trim();
            this.projectionTexture.flipY = !this.projectionTexture.flipY;
            console.log('🔄 Fallback: Switched from CSS to texture flipY');
        } else {
            // If flipY was used, try adding CSS transform instead
            const currentTransform = this.videoElement.style.transform || '';
            this.videoElement.style.transform = currentTransform + ' scaleY(-1)';
            console.log('🔄 Fallback: Added CSS scaleY(-1) transform');
        }
        
        // Force updates
        this.projectionTexture.needsUpdate = true;
        if (this.projectionMaterial) {
            this.projectionMaterial.needsUpdate = true;
        }
        
        console.log('✅ Fallback fix applied');
    }
    
    async setupMobileCamera() {
        console.log('📱 Setting up mobile camera with orientation detection...');
        
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30 },
                    facingMode: this.cameraFacing || 'environment'
                },
                audio: false
            };
            
            console.log('📱 Requesting camera with constraints:', constraints);
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Get actual camera info
            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            
            console.log('📱 Camera settings:', settings);
            console.log('📱 Camera capabilities:', videoTrack.getCapabilities());
            
            // Store camera info for orientation detection
            this.cameraSettings = settings;
            this.cameraCapabilities = videoTrack.getCapabilities();
            
            this.showNotification('📱 Camera sharing started');
            return stream;
            
        } catch (error) {
            console.error('📱 Mobile camera setup failed:', error);
            throw error;
        }
    }
    
    handleOrientationChange() {
        if (!this.isMobile() || !this.isSharing) return;
        
        console.log('📱 Orientation changed, reapplying fixes...');
        
        // Wait a bit for orientation to settle
        setTimeout(() => {
            this.detectAndFixMobileOrientation();
        }, 300);
    }
    
    setupOrientationListeners() {
        // Add orientation change listener
        window.addEventListener('orientationchange', () => {
            this.handleOrientationChange();
        });
        
        // Also listen for resize events (covers more cases)
        window.addEventListener('resize', () => {
            if (this.isMobile()) {
                setTimeout(() => {
                    this.handleOrientationChange();
                }, 500);
            }
        });
        
        console.log('📱 Orientation change listeners setup');
    }

    // ================================
    // ENHANCED SCREEN SHARING METHODS
    // ================================
    
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
                // Enhanced mobile camera setup with orientation detection
                console.log('📱 Mobile detected, using enhanced camera setup...');
                stream = await this.setupMobileCamera();
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
            
            // Set up video element with proper properties
            this.videoElement.srcObject = stream;
            this.videoElement.muted = true;
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            console.log('📺 Video element configured');
            
            // Immediate aggressive video play forcing
            try {
                console.log('🎬 Forcing video to play immediately...');
                await this.videoElement.play();
                console.log('✅ Video is playing immediately');
                
                // Wait for video to be fully ready
                await this.waitForVideoReady(this.videoElement);
                console.log('✅ Video is ready and playing');
                
                // MOBILE FIX: Apply orientation fix for mobile devices
                if (this.isMobile()) {
                    console.log('📱 Applying mobile orientation fix...');
                    await new Promise(resolve => setTimeout(resolve, 500)); // Allow video dimensions to stabilize
                    this.detectAndFixMobileOrientation();
                }
                
                // Force texture update immediately
                if (this.projectionTexture) {
                    this.projectionTexture.needsUpdate = true;
                    console.log('🔄 Forced immediate texture update');
                }
                
                // Start the monitoring system
                this.startVideoMonitoring();
                
                // Start continuous texture updates
                this.startVideoTextureUpdates();
                
            } catch (error) {
                console.warn('⚠️ Video setup failed, trying fallback:', error);
                await this.tryBasicCameraConstraints();
            }
            
            // Show projection surface
            if (this.projectionSurface) {
                this.projectionSurface.visible = true;
                this.animateProjectionIn();
                console.log('🎬 Projection surface shown');
            }
            
            // Handle stream ended
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                console.log('📹 Stream ended by user');
                this.stopScreenShare();
            });
            
            // Set sharing state
            this.isSharing = true;
            this.currentSharer = window.WebSocketManager?.userId;
            
            // Notify other users via WebSocket
            if (window.WebSocketManager?.sendScreenShareStart) {
                const shareData = {
                    projection_mode: this.projectionMode,
                    quality: this.config.quality,
                    sharer_id: window.WebSocketManager.userId,
                    sharer_name: window.WebSocketManager.username,
                    share_type: this.isMobile() ? 'camera' : 'screen',
                    stream_id: this.localStream.id,
                    video_tracks: this.localStream.getVideoTracks().length,
                    audio_tracks: this.localStream.getAudioTracks().length,
                    // Mobile orientation info
                    mobile_device: this.isMobile(),
                    camera_facing: this.cameraFacing,
                    orientation_applied: this.isMobile()
                };
                
                window.WebSocketManager.sendScreenShareStart(shareData);
                console.log('📡 Share notification sent via WebSocket:', shareData);
            }
            
            // Setup WebRTC and show controls
            await this.setupWebRTCConnections();
            this.showSharingControls();
            
            console.log('✅ Sharing started successfully');
            
        } catch (error) {
            console.error('❌ Error starting share:', error);
            this.handleScreenShareError(error);
        }
    }
    
    handleScreenShareError(error) {
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
            this.showNotification('❌ Camera constraints not supported. Trying basic camera...');
            this.tryBasicCameraConstraints();
        } else {
            this.showNotification(`❌ Could not start sharing: ${error.message}`);
        }
    }
    
    async tryBasicCameraConstraints() {
        if (!this.isMobile()) return;
        
        try {
            console.log('📱 Trying basic camera constraints...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            
            this.localStream = stream;
            this.mediaStream = stream;
            this.videoElement.srcObject = stream;
            
            await this.videoElement.play();
            await this.waitForVideoReady(this.videoElement);
            
            // Apply orientation fix
            setTimeout(() => {
                this.detectAndFixMobileOrientation();
            }, 500);
            
            this.startVideoTextureUpdates();
            
            if (this.projectionSurface) {
                this.projectionSurface.visible = true;
                this.animateProjectionIn();
            }
            
            this.isSharing = true;
            this.showNotification('📱 Basic camera sharing started');
            
        } catch (basicError) {
            console.error('❌ Basic camera constraints also failed:', basicError);
            this.showNotification('❌ Camera access failed completely');
        }
    }

    // ================================
    // VIDEO TEXTURE UPDATE SYSTEM
    // ================================
    
    startVideoTextureUpdates() {
        if (this.isTextureUpdating || !this.projectionTexture) {
            console.log('⚠️ Video texture updates already running or no texture available');
            return;
        }

        this.isTextureUpdating = true;
        console.log('🔄 Starting video texture update loop...');

        // More aggressive texture updating for r128
        this.textureUpdateInterval = setInterval(() => {
            if (this.projectionTexture && this.videoElement) {
                const video = this.videoElement;
                
                // Check multiple conditions for video readiness
                if (video.readyState >= video.HAVE_CURRENT_DATA && 
                    !video.paused &&
                    video.videoWidth > 0 &&
                    video.videoHeight > 0) {
                    
                    // Multiple update flags for r128
                    this.projectionTexture.needsUpdate = true;
                    
                    // Force material update
                    if (this.projectionMaterial) {
                        this.projectionMaterial.needsUpdate = true;
                        this.projectionMaterial.map = this.projectionTexture;
                    }
                    
                    // Log video dimensions occasionally
                    if (Math.random() < 0.01) {
                        console.log(`📺 Video: ${video.videoWidth}x${video.videoHeight}, Ready: ${video.readyState}`);
                    }
                }
            }
        }, 16); // 60 FPS

        console.log('✅ Video texture update loop started at 60 FPS');
    }
    
    stopVideoTextureUpdates() {
        if (this.textureUpdateInterval) {
            clearInterval(this.textureUpdateInterval);
            this.textureUpdateInterval = null;
            this.isTextureUpdating = false;
            console.log('🛑 Video texture updates stopped');
        }
    }
    
    startVideoMonitoring() {
        if (this.videoMonitorInterval) {
            clearInterval(this.videoMonitorInterval);
        }
        
        console.log('🔄 Starting aggressive video monitoring...');
        
        this.videoMonitorInterval = setInterval(() => {
            if (this.videoElement && this.mediaStream) {
                const video = this.videoElement;
                
                // Check if video is paused
                if (video.paused) {
                    console.log('🔄 Video paused detected, forcing play...');
                    video.play().then(() => {
                        console.log('✅ Video restarted successfully');
                        if (this.projectionTexture) {
                            this.projectionTexture.needsUpdate = true;
                        }
                    }).catch(e => console.log('Failed to restart video:', e));
                }
                
                // Check if video has stopped producing frames
                if (video.readyState < 2) {
                    console.log('⚠️ Video not ready, forcing reload...');
                    const currentStream = video.srcObject;
                    video.srcObject = null;
                    setTimeout(() => {
                        video.srcObject = currentStream;
                        video.play().catch(e => console.log('Reload play failed:', e));
                    }, 100);
                }
                
                // Stop monitoring if sharing stopped
                if (!this.isSharing || !this.mediaStream) {
                    clearInterval(this.videoMonitorInterval);
                    this.videoMonitorInterval = null;
                    console.log('🛑 Video monitoring stopped');
                }
            }
        }, 500);
        
        console.log('✅ Aggressive video monitoring started');
    }
    
    async waitForVideoReady(videoElement) {
        return new Promise((resolve, reject) => {
            if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
                console.log('✅ Video already ready');
                resolve();
                return;
            }

            let checkAttempts = 0;
            const maxAttempts = 50;

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
                    resolve();
                } else {
                    console.log(`⏳ Waiting for video... attempt ${checkAttempts}/${maxAttempts}`);
                    setTimeout(checkReady, 100);
                }
            };

            videoElement.addEventListener('loadeddata', checkReady);
            videoElement.addEventListener('canplay', checkReady);
            checkReady();
        });
    }

    // ================================
    // WEBRTC SYSTEM  
    // ================================
    
    // ENHANCED: WebRTC setup with better error handling and debugging
    async setupWebRTCConnections() {
        if (!this.localStream || !window.WebSocketManager) {
            console.error('❌ Cannot setup WebRTC: missing stream or WebSocket manager');
            return;
        }
        
        console.log('🔗 Setting up WebRTC connections for screen sharing...');
        console.log('📹 Local stream tracks:', this.localStream.getTracks().length);
        
        // Get connected users with enhanced debugging
        let connectedUsers = [];
        
        if (typeof window.WebSocketManager.getConnectedUsers === 'function') {
            try {
                connectedUsers = window.WebSocketManager.getConnectedUsers();
                console.log('📡 Found connected users via getConnectedUsers:', connectedUsers.length);
            } catch (error) {
                console.error('❌ Error getting connected users:', error);
            }
        }
        
        // Try alternative methods to get users
        if (!connectedUsers || connectedUsers.length === 0) {
            console.log('⚠️ getConnectedUsers method not found or returned empty, using alternative approach');
            
            if (window.WebSocketManager.connectedUsers && window.WebSocketManager.connectedUsers.size > 0) {
                connectedUsers = Array.from(window.WebSocketManager.connectedUsers.values());
                console.log('📡 Found connected users via connectedUsers Map:', connectedUsers.length);
            } else if (window.WebSocketManager.roomState?.users) {
                connectedUsers = window.WebSocketManager.roomState.users;
                console.log('📡 Found connected users via roomState:', connectedUsers.length);
            } else {
                console.log('📡 No user list available, setting up broadcast mode');
                this.setupBroadcastConnection();
                
                // ENHANCED: Also try to manually trigger WebRTC offers
                this.broadcastWebRTCOffer();
                return;
            }
        }
        
        if (!connectedUsers || connectedUsers.length === 0) {
            console.log('📡 No connected users found, using broadcast approach');
            this.setupBroadcastConnection();
            this.broadcastWebRTCOffer();
            return;
        }
        
        console.log(`🔗 Setting up peer connections to ${connectedUsers.length} users`);
        
        // Setup individual peer connections
        for (const userData of connectedUsers) {
            if (userData.user_id === window.WebSocketManager.userId) {
                console.log(`⏭️ Skipping self: ${userData.user_id}`);
                continue;
            }
            
            try {
                console.log(`🔗 Setting up WebRTC connection to ${userData.user_id} (${userData.username || 'Unknown'})`);
                
                const success = await this.createPeerConnection(userData);
                if (success) {
                    console.log(`✅ WebRTC setup completed for ${userData.user_id}`);
                } else {
                    console.log(`❌ WebRTC setup failed for ${userData.user_id}`);
                }
                
            } catch (error) {
                console.error(`❌ Error setting up WebRTC connection to ${userData.user_id}:`, error);
            }
        }
        
        console.log(`✅ WebRTC setup process complete. Active connections: ${this.peerConnections.size}`);
        
        // ENHANCED: Send a ready signal to all users
        this.broadcastScreenShareReady();
    }
    
    // NEW: Create individual peer connection with enhanced error handling
    async createPeerConnection(userData) {
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ],
                iceCandidatePoolSize: 10
            });
            
            // Enhanced logging for peer connection events
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`🧊 Sending ICE candidate to ${userData.user_id}`);
                    window.WebSocketManager.sendWebRTCMessage(
                        userData.user_id,
                        'screen_share_webrtc_candidate',
                        event.candidate
                    );
                } else {
                    console.log(`🧊 ICE gathering complete for ${userData.user_id}`);
                }
            };
            
            pc.onconnectionstatechange = () => {
                console.log(`🔗 WebRTC connection to ${userData.user_id}: ${pc.connectionState}`);
                if (pc.connectionState === 'connected') {
                    console.log(`✅ Screen sharing connection established with ${userData.user_id}`);
                    this.showNotification(`✅ Connected to ${userData.username || userData.user_id}`);
                } else if (pc.connectionState === 'failed') {
                    console.log(`❌ Screen sharing connection failed with ${userData.user_id}`);
                    this.showNotification(`❌ Connection failed to ${userData.username || userData.user_id}`);
                }
            };
            
            pc.oniceconnectionstatechange = () => {
                console.log(`🧊 ICE connection to ${userData.user_id}: ${pc.iceConnectionState}`);
            };
            
            // CRITICAL: Add all tracks from local stream
            console.log(`📹 Adding ${this.localStream.getTracks().length} tracks to peer connection for ${userData.user_id}`);
            this.localStream.getTracks().forEach((track, index) => {
                console.log(`📹 Adding track ${index}: ${track.kind} (${track.label}) to ${userData.user_id}`);
                pc.addTrack(track, this.localStream);
            });
            
            // Create and send offer
            console.log(`📤 Creating offer for ${userData.user_id}`);
            const offer = await pc.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            });
            
            await pc.setLocalDescription(offer);
            console.log(`📤 Sending offer to ${userData.user_id}`);
            
            window.WebSocketManager.sendWebRTCMessage(
                userData.user_id,
                'screen_share_webrtc_offer',
                offer
            );
            
            this.peerConnections.set(userData.user_id, pc);
            return true;
            
        } catch (error) {
            console.error(`❌ Error creating peer connection for ${userData.user_id}:`, error);
            return false;
        }
    }
    
    // NEW: Broadcast WebRTC offer to all connected users
    broadcastWebRTCOffer() {
        console.log('📡 Broadcasting WebRTC offer to all users...');
        
        if (window.WebSocketManager && window.WebSocketManager.send) {
            window.WebSocketManager.send({
                type: 'screen_share_broadcast_offer',
                user_id: window.WebSocketManager.userId,
                room_id: window.WebSocketManager.roomId,
                username: window.WebSocketManager.username,
                share_type: this.isMobile() ? 'camera' : 'screen',
                timestamp: Date.now()
            });
            
            console.log('📡 Broadcast offer sent');
        }
    }
    
    // NEW: Broadcast that screen share is ready
    broadcastScreenShareReady() {
        console.log('📡 Broadcasting screen share ready signal...');
        
        if (window.WebSocketManager && window.WebSocketManager.send) {
            window.WebSocketManager.send({
                type: 'screen_share_ready',
                user_id: window.WebSocketManager.userId,
                room_id: window.WebSocketManager.roomId,
                username: window.WebSocketManager.username,
                share_data: {
                    projection_mode: this.projectionMode,
                    mobile_device: this.isMobile(),
                    camera_facing: this.cameraFacing,
                    stream_id: this.localStream.id,
                    tracks: this.localStream.getTracks().length
                },
                timestamp: Date.now()
            });
            
            console.log('📡 Screen share ready signal sent');
        }
    }
    
    setupBroadcastConnection() {
        console.log('📡 Setting up broadcast connection for screen sharing...');
        
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            this.localStream.getTracks().forEach(track => {
                console.log(`📹 Adding track to broadcast: ${track.kind}`);
                pc.addTrack(track, this.localStream);
            });
            
            this.peerConnections.set('broadcast', pc);
            
            console.log('✅ Broadcast connection setup complete');
            
            if (window.WebSocketManager?.sendScreenShareStart) {
                window.WebSocketManager.sendScreenShareStart({
                    projection_mode: this.projectionMode,
                    quality: this.config.quality,
                    sharer_id: window.WebSocketManager.userId,
                    sharer_name: window.WebSocketManager.username,
                    share_type: this.isMobile() ? 'camera' : 'screen',
                    broadcast_mode: true
                });
                console.log('📡 Broadcast screen share notification sent');
            }
            
        } catch (error) {
            console.error('❌ Error setting up broadcast connection:', error);
        }
    }
    
    async handleWebRTCReady(data) {
        if (!window.WebSocketManager || data.user_id === window.WebSocketManager.userId) return;
        
        console.log(`📡 Received WebRTC ready notification from ${data.user_id}`);
        
        this.currentSharer = data.user_id;
        
        if (data.share_data?.projection_mode) {
            this.projectionMode = data.share_data.projection_mode;
            this.updateProjectionSurface();
        }
        
        this.showNotification(`📺 ${data.username} is ready to share screen - waiting for connection...`);
        
        console.log(`✅ Ready to receive screen share from ${data.user_id}`);
    }
    
    async handleWebRTCOffer(data) {
        if (!window.WebSocketManager || data.user_id === window.WebSocketManager.userId) return;
        
        console.log(`📥 Received WebRTC offer from ${data.user_id} for screen sharing`);
        
        try {
            const pc = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            });
            
            pc.ontrack = (event) => {
                console.log(`📺 Received screen sharing stream from ${data.user_id}`);
                this.handleRemoteStreamEnhanced(event.streams[0], data.user_id);
            };
            
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`🧊 Sending ICE candidate to ${data.user_id}`);
                    window.WebSocketManager.sendWebRTCMessage(
                        data.user_id,
                        'screen_share_webrtc_candidate',
                        event.candidate
                    );
                } else {
                    console.log(`🧊 ICE gathering complete for ${data.user_id}`);
                }
            };
            
            pc.onconnectionstatechange = () => {
                console.log(`🔗 WebRTC connection from ${data.user_id}: ${pc.connectionState}`);
                if (pc.connectionState === 'connected') {
                    console.log(`✅ Screen sharing reception established from ${data.user_id}`);
                } else if (pc.connectionState === 'failed') {
                    console.log(`❌ Screen sharing reception failed from ${data.user_id}`);
                }
            };
            
            pc.oniceconnectionstatechange = () => {
                console.log(`🧊 ICE connection from ${data.user_id}: ${pc.iceConnectionState}`);
            };
            
            console.log(`📥 Setting remote description from ${data.user_id}`);
            await pc.setRemoteDescription(data.data);
            
            console.log(`📤 Creating answer for ${data.user_id}`);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log(`📤 Sending answer to ${data.user_id}`);
            window.WebSocketManager.sendWebRTCMessage(
                data.user_id,
                'screen_share_webrtc_answer',
                answer
            );
            
            this.peerConnections.set(data.user_id, pc);
            console.log(`✅ WebRTC answer sent to ${data.user_id}`);
            
        } catch (error) {
            console.error(`❌ Error handling WebRTC offer from ${data.user_id}:`, error);
        }
    }
    
    async handleWebRTCAnswer(data) {
        if (!window.WebSocketManager || data.user_id === window.WebSocketManager.userId) return;
        
        try {
            const pc = this.peerConnections.get(data.user_id);
            if (pc) {
                console.log(`📥 Setting remote description (answer) from ${data.user_id}`);
                await pc.setRemoteDescription(data.data);
                console.log(`✅ WebRTC answer processed from ${data.user_id}`);
            }
        } catch (error) {
            console.error('❌ Error handling WebRTC answer:', error);
        }
    }
    
    async handleWebRTCCandidate(data) {
        if (!window.WebSocketManager || data.user_id === window.WebSocketManager.userId) return;
        
        try {
            const pc = this.peerConnections.get(data.user_id);
            if (pc) {
                console.log(`🧊 Adding ICE candidate from ${data.user_id}`);
                await pc.addIceCandidate(data.data);
                console.log(`✅ ICE candidate added from ${data.user_id}`);
            }
        } catch (error) {
            console.error('❌ Error handling WebRTC candidate:', error);
        }
    }

    // ================================
    // SHARE DATA MANAGEMENT
    // ================================
    
    storeShareData(userId, shareData) {
        if (!this.shareDataStore) {
            this.shareDataStore = new Map();
        }
        this.shareDataStore.set(userId, shareData);
    }
    
    getShareDataForUser(userId) {
        if (!this.shareDataStore) {
            return null;
        }
        return this.shareDataStore.get(userId);
    }
    
    stopScreenShare() {
        if (!this.isSharing && !this.mediaStream) return;
        
        console.log('🖥️ Stopping screen share...');
        
        try {
            this.stopVideoTextureUpdates();
            
            if (this.videoMonitorInterval) {
                clearInterval(this.videoMonitorInterval);
                this.videoMonitorInterval = null;
            }
            
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            
            if (this.projectionSurface) {
                this.animateProjectionOut();
            }
            
            this.peerConnections.forEach(pc => pc.close());
            this.peerConnections.clear();
            
            // Clean up dark screen monitoring
            this.darkScreenDetection.forEach(interval => clearInterval(interval));
            this.darkScreenDetection.clear();
            
            this.isSharing = false;
            this.currentSharer = null;
            
            if (window.WebSocketManager?.sendScreenShareStop) {
                window.WebSocketManager.sendScreenShareStop();
            }
            
            this.hideSharingControls();
            
            this.showNotification('✅ Screen sharing stopped');
            console.log('✅ Screen sharing stopped');
            
        } catch (error) {
            console.error('Error stopping screen share:', error);
        }
    }

    // ================================
    // UI AND ANIMATION METHODS
    // ================================
    
    animateProjectionIn() {
        if (!this.projectionSurface) return;
        
        this.projectionSurface.scale.set(0.1, 0.1, 0.1);
        this.projectionSurface.visible = true;
        
        const startTime = Date.now();
        const duration = 1000;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const scale = 0.1 + (0.9 * easeProgress);
            this.projectionSurface.scale.set(scale, scale, scale);
            
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
            
            const easeProgress = Math.pow(progress, 2);
            
            const scale = 1 - (0.9 * easeProgress);
            this.projectionSurface.scale.set(scale, scale, scale);
            
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
            // Clean sharing controls without orientation buttons
            panel.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div style="width: 12px; height: 12px; background: #ff4444; border-radius: 50%; animation: pulse 1s infinite;"></div>
                    <strong>${this.isMobile() ? '📱' : '🖥️'} You're sharing your ${this.isMobile() ? 'camera' : 'screen'}</strong>
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
            // Clean viewer controls without orientation buttons
            panel.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <div style="width: 12px; height: 12px; background: #4CAF50; border-radius: 50%; animation: pulse 1s infinite;"></div>
                    <strong>📺 Watching ${sharerName}'s screen</strong>
                </div>
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 12px;">
                    Displayed on ${this.projectionMode}
                </div>
                <button onclick="window.ScreenSharingSystem.hideViewerControls()" 
                        style="padding: 8px 16px; background: #666; border: none; border-radius: 8px; 
                               color: white; cursor: pointer;">
                    ✕ Hide Controls
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
        
        if (this.isSharing) {
            this.showSharingControls();
        }
        
        this.showNotification(`📺 Projection mode changed to: ${mode}`);
        console.log(`📺 Projection mode changed to: ${mode}`);
    }
    
    showScreenShareUI() {
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
        return; // Disabled to prevent blocking hamburger menu        const notification = document.createElement('div');
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
    
    // ================================
    // GLOBAL FUNCTIONS & UTILITIES
    // ================================
    
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
        
        // Fullscreen functions
        window.enterFullscreen = () => {
            if (this.isSharing || this.currentSharer) {
                this.enterFullscreen();
            } else {
                console.log('❌ No screen share active to fullscreen');
                this.showNotification('❌ No screen sharing active');
            }
        };
        
        window.exitFullscreen = () => this.exitFullscreen();
        
        window.toggleFullscreen = () => {
            if (this.fullscreenOverlay) {
                this.exitFullscreen();
            } else {
                this.enterFullscreen();
            }
        };
        
        // Debug functions
        window.testClickDetection = () => {
            console.log('🧪 Testing click detection system...');
            console.log('Canvas element:', this.canvasElement);
            console.log('Camera:', this.camera);
            console.log('Raycaster:', this.raycaster);
            console.log('Clickable projection:', this.clickableProjection);
            
            if (this.canvasElement) {
                console.log('✅ Canvas found - click detection should work');
                console.log('💡 Try double-clicking anywhere on the 3D scene as fallback');
            } else {
                console.log('❌ No canvas found - click detection will not work');
            }
        };
        
        window.forceFullscreen = () => {
            console.log('🔧 Force entering fullscreen...');
            this.enterFullscreen();
        };
        
        // WebRTC debugging functions
        window.debugWebRTCConnections = () => {
            console.log('🔗 WebRTC Debug Info:');
            console.log('👥 Peer connections:', this.peerConnections.size);
            this.peerConnections.forEach((pc, userId) => {
                console.log(`  - ${userId}: ${pc.connectionState} (ICE: ${pc.iceConnectionState})`);
            });
            console.log('📺 Current sharer:', this.currentSharer);
            console.log('📹 Local stream:', !!this.localStream);
            console.log('📺 Media stream:', !!this.mediaStream);
            console.log('🎬 Is sharing:', this.isSharing);
            console.log('🌐 WebSocket Manager connected:', !!window.WebSocketManager);
            
            if (this.localStream) {
                console.log('📹 Local stream tracks:');
                this.localStream.getTracks().forEach((track, index) => {
                    console.log(`  Track ${index}: ${track.kind} - ${track.label} (enabled: ${track.enabled})`);
                });
            }
        };
        
        // Mobile orientation fix functions
        window.fixMobileOrientationManual = () => {
            if (window.ScreenSharingSystem && window.ScreenSharingSystem.projectionTexture) {
                console.log('🔧 Emergency manual orientation toggle...');
                
                window.ScreenSharingSystem.projectionTexture.flipY = !window.ScreenSharingSystem.projectionTexture.flipY;
                window.ScreenSharingSystem.projectionTexture.needsUpdate = true;
                
                console.log('🔄 Emergency toggle applied, flipY:', window.ScreenSharingSystem.projectionTexture.flipY);
            }
        };
        
        window.autoFixMobileOrientation = () => {
            if (window.ScreenSharingSystem && window.ScreenSharingSystem.isMobile()) {
                console.log('🤖 Console: Manual auto-fix trigger...');
                window.ScreenSharingSystem.detectAndFixMobileOrientation();
            }
        };
        
        // Debug functions for dark screen fixes
        window.debugRemoteStream = (userId) => {
            if (this.receivedStreams.has(userId)) {
                const stream = this.receivedStreams.get(userId);
                console.log(`🔍 Remote stream debug for ${userId}:`, {
                    id: stream.id,
                    active: stream.active,
                    tracks: stream.getTracks().length,
                    videoTracks: stream.getVideoTracks().map(t => ({
                        enabled: t.enabled,
                        readyState: t.readyState,
                        muted: t.muted
                    }))
                });
            } else {
                console.log(`❌ No remote stream found for user ${userId}`);
            }
        };
        
        window.fixDarkScreen = (userId) => {
            if (this.currentSharer === userId) {
                this.attemptDarkScreenRecovery(userId);
            } else {
                console.log(`❌ ${userId} is not the current sharer`);
            }
        };
        
        window.showTestPattern = () => this.showTestPattern();
        window.forceVideoPlay = () => {
            if (this.videoElement) {
                this.videoElement.play().then(() => {
                    console.log('✅ Video play forced');
                    if (this.projectionTexture) {
                        this.projectionTexture.needsUpdate = true;
                    }
                }).catch(e => console.log('❌ Force play failed:', e));
            }
        };
        
        window.recreateTexture = () => {
            if (this.videoElement && this.projectionMaterial) {
                const oldTexture = this.projectionTexture;
                this.projectionTexture = new THREE.VideoTexture(this.videoElement);
                this.projectionTexture.minFilter = THREE.LinearFilter;
                this.projectionTexture.magFilter = THREE.LinearFilter;
                this.projectionMaterial.map = this.projectionTexture;
                this.projectionMaterial.needsUpdate = true;
                if (oldTexture) oldTexture.dispose();
                console.log('✅ Texture recreated');
            }
        };
        
        // Debug functions
        window.debugScreenOrientation = () => {
            if (this.videoElement && this.projectionTexture) {
                console.log('🖼️ Screen Orientation Debug:');
                console.log('  - Video dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight);
                console.log('  - Texture flipY:', this.projectionTexture.flipY);
                console.log('  - Video rotation:', this.videoElement.style.transform);
                console.log('  - Projection surface rotation:', this.projectionSurface?.rotation);
            }
        };
        
        window.fixScreenOrientation = () => {
            if (this.projectionTexture) {
                this.projectionTexture.flipY = !this.projectionTexture.flipY;
                this.projectionTexture.needsUpdate = true;
                console.log('🔄 Toggled texture flipY to:', this.projectionTexture.flipY);
            }
        };

        window.debugWebRTC = () => {
            console.log('🔗 WebRTC Debug Info:');
            console.log('👥 Peer connections:', this.peerConnections.size);
            this.peerConnections.forEach((pc, userId) => {
                console.log(`  - ${userId}: ${pc.connectionState} (ICE: ${pc.iceConnectionState})`);
            });
            console.log('📺 Current sharer:', this.currentSharer);
            console.log('📹 Local stream:', !!this.localStream);
            console.log('📺 Media stream:', !!this.mediaStream);
            console.log('🎬 Is sharing:', this.isSharing);
        };
        
        window.forceWebRTCReconnect = () => {
            console.log('🔄 Forcing WebRTC reconnection...');
            if (this.isSharing && this.localStream) {
                this.setupWebRTCConnections();
            } else {
                console.log('❌ Not currently sharing or no stream available');
            }
        };

        window.forceVideoPlayNow = () => {
            if (this.videoElement) {
                console.log('🎬 Manual: Forcing video to play...');
                this.videoElement.play().then(() => {
                    console.log('✅ Manual video play successful');
                    if (this.projectionTexture) {
                        this.projectionTexture.needsUpdate = true;
                        console.log('🔄 Manual texture update applied');
                    }
                }).catch(e => console.log('❌ Manual video play failed:', e));
            } else {
                console.log('❌ No video element found');
            }
        };

        window.testCameraAccess = () => this.testCameraAccess();
        window.debugScreenShare = () => this.debugScreenShare();
        window.testVideoTexture = () => this.testVideoTexture();
        window.fixVideoTextureNow = () => this.fixVideoTextureNow();
        window.testWithSolidColor = () => this.testWithSolidColor();
        
        console.log('✅ Screen sharing global functions setup');
    }
    
    // ================================
    // DEBUG AND UTILITY METHODS
    // ================================
    
    async testCameraAccess() {
        console.log('🧪 Testing camera access...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            console.log('✅ Camera access successful');
            console.log('📹 Video tracks:', stream.getVideoTracks().length);
            
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
        
        if (this.projectionTexture) {
            console.log('🎨 Texture debug:');
            console.log('  - Needs update:', this.projectionTexture.needsUpdate);
            console.log('  - Format:', this.projectionTexture.format);
            console.log('  - FlipY:', this.projectionTexture.flipY);
        }
        
        if (this.projectionMaterial) {
            console.log('🎭 Material debug:');
            console.log('  - Type:', this.projectionMaterial.type);
            console.log('  - Has map:', !!this.projectionMaterial.map);
            console.log('  - Needs update:', this.projectionMaterial.needsUpdate);
            console.log('  - Visible:', this.projectionMaterial.visible);
        }
        
        this.testCameraAccess();
    }
    
    testVideoTexture() {
        if (!this.videoElement || !this.projectionTexture) {
            console.log('❌ No video element or texture to test');
            return;
        }
        
        console.log('🧪 Testing video texture...');
        
        this.projectionTexture.needsUpdate = true;
        
        const video = this.videoElement;
        console.log('📺 Video test results:');
        console.log('  - Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        console.log('  - Ready state:', video.readyState, '(need >= 2)');
        console.log('  - Current time:', video.currentTime);
        console.log('  - Paused:', video.paused);
        console.log('  - Ended:', video.ended);
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        
        try {
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, 10, 10);
            const pixels = Array.from(imageData.data.slice(0, 12));
            console.log('🎨 Video pixel data (first 12 values):', pixels);
            
            const hasData = pixels.some(pixel => pixel > 0);
            console.log('✅ Video has actual content:', hasData);
            
            if (hasData) {
                console.log('✅ Video texture should work - issue might be in Three.js rendering');
                this.fixVideoTextureNow();
            } else {
                console.log('❌ Video has no content - check stream source');
            }
            
        } catch (error) {
            console.log('❌ Cannot read video pixels:', error.message);
        }
        
        canvas.remove();
    }
    
    fixVideoTextureNow() {
        console.log('🔧 Applying immediate video texture fix...');
        
        if (!this.videoElement || !this.projectionTexture || !this.projectionMaterial) {
            console.log('❌ Missing components for texture fix');
            return;
        }
        
        if (this.videoElement.paused) {
            this.videoElement.play().catch(e => console.log('Video play failed:', e));
        }
        
        if (this.projectionTexture.format !== THREE.RGBAFormat) {
            this.projectionTexture.format = THREE.RGBAFormat;
            console.log('🔄 Switched texture to RGBA format');
        }
        
        this.projectionTexture.needsUpdate = true;
        
        this.projectionMaterial.map = this.projectionTexture;
        this.projectionMaterial.needsUpdate = true;
        
        console.log('✅ Immediate video texture fix applied');
    }
    
    testWithSolidColor() {
        console.log('🧪 Testing with solid color texture...');
        
        if (!this.projectionMaterial) {
            console.log('❌ No projection material available');
            return;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 512, 512);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TEST SCREEN', 256, 200);
        ctx.fillText('VISIBLE?', 256, 300);
        ctx.fillText(this.projectionMode.toUpperCase(), 256, 400);
        
        const testTexture = new THREE.CanvasTexture(canvas);
        
        this.projectionMaterial.map = testTexture;
        this.projectionMaterial.needsUpdate = true;
        
        console.log('✅ Applied solid color test texture');
        console.log('📺 You should see a bright red screen with white text');
        console.log(`📍 Look ${this.projectionMode === 'ceiling' ? 'UP' : this.projectionMode === 'wall' ? 'FORWARD' : 'UP-FORWARD'} to see it`);
    }
    
    isScreenSharingSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
    
    cleanup() {
        console.log('🧹 Cleaning up screen sharing system...');
        
        this.stopVideoTextureUpdates();
        
        if (this.videoMonitorInterval) {
            clearInterval(this.videoMonitorInterval);
            this.videoMonitorInterval = null;
        }
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
            this.videoElement.remove();
            this.videoElement = null;
        }
        
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
        
        this.removeFullscreenOverlay();
        
        if (this.canvasClickHandler && this.canvasElement) {
            this.canvasElement.removeEventListener('click', this.canvasClickHandler);
            this.canvasClickHandler = null;
        }
        
        if (this.canvasDoubleClickHandler && this.canvasElement) {
            this.canvasElement.removeEventListener('dblclick', this.canvasDoubleClickHandler);
            this.canvasDoubleClickHandler = null;
        }
        
        this.canvasElement = null;
        
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        
        this.isSharing = false;
        this.currentSharer = null;
        this.isTextureUpdating = false;
        
        console.log('✅ Screen sharing cleanup complete');
    }
}

// Initialize Enhanced Screen Sharing System
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

console.log('🖥️ ENHANCED Screen Sharing System with Dark Screen Fixes loaded!');
console.log('🔧 ✅ Enhanced remote stream handling');
console.log('📺 ✅ Dark screen detection and recovery');
console.log('🎬 ✅ Video play retry mechanisms');
console.log('🎯 ✅ Enhanced texture update system');
console.log('💡 Available debug functions:');
console.log('  - debugRemoteStream(userId) - Debug specific user\'s stream');
console.log('  - fixDarkScreen(userId) - Force recovery for user');
console.log('  - showTestPattern() - Display test pattern');
console.log('  - forceVideoPlay() - Force video to play');
console.log('  - recreateTexture() - Recreate video texture');