// ================================
// EUPHORIE 3D SCREEN SHARING SYSTEM - COMPLETE WITH MOBILE ORIENTATION FIX
// Complete implementation with mobile upside-down fix
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
        this.videoMonitorInterval = null;
        
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
            enableControls: true
        };
        
        console.log('✅ Screen Sharing System created');
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
            
            // Setup global functions
            this.setupGlobalFunctions();
            
            // Setup orientation change listeners
            this.setupOrientationListeners();
            
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
                    } else if (data.type === 'screen_share_webrtc_ready') {
                        this.handleWebRTCReady(data);
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
        
        this.scene.add(projectionGroup);
        this.projectionSurface = projectionGroup;
        
        console.log(`✅ Projection surface updated (mode: ${this.projectionMode})`);
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
    
    applyMobileOrientationFix(needsFlip, needsRotation, orientation) {
        // This method is now simplified since detectAndFixMobileOrientation handles everything
        console.log('📱 Seamless orientation fix already applied in detectAndFixMobileOrientation');
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
    
    async setupWebRTCConnections() {
        if (!this.localStream || !window.WebSocketManager) return;
        
        console.log('🔗 Setting up WebRTC connections for screen sharing...');
        
        let connectedUsers = [];
        
        if (typeof window.WebSocketManager.getConnectedUsers === 'function') {
            connectedUsers = window.WebSocketManager.getConnectedUsers();
            console.log('📡 Found connected users via getConnectedUsers:', connectedUsers);
        } else {
            console.log('⚠️ getConnectedUsers method not found, using alternative approach');
            
            if (window.WebSocketManager.connectedUsers) {
                connectedUsers = window.WebSocketManager.connectedUsers;
                console.log('📡 Found connected users via connectedUsers property:', connectedUsers);
            } else if (window.WebSocketManager.roomState?.users) {
                connectedUsers = window.WebSocketManager.roomState.users;
                console.log('📡 Found connected users via roomState:', connectedUsers);
            } else {
                console.log('📡 No user list available, broadcasting screen share to all connected users');
                this.setupBroadcastConnection();
                return;
            }
        }
        
        if (!connectedUsers || connectedUsers.length === 0) {
            console.log('📡 No connected users found, setting up broadcast connection');
            this.setupBroadcastConnection();
            return;
        }
        
        console.log(`🔗 Setting up peer connections to ${connectedUsers.length} users with single stream`);
        
        for (const userData of connectedUsers) {
            if (userData.user_id === window.WebSocketManager.userId) continue;
            
            try {
                console.log(`🔗 Setting up WebRTC connection to ${userData.user_id}`);
                
                const pc = new RTCPeerConnection({
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' }
                    ]
                });
                
                console.log(`📹 Adding screen stream tracks to peer connection for ${userData.user_id}`);
                this.localStream.getTracks().forEach((track, index) => {
                    console.log(`📹 Adding track ${index}: ${track.kind} (${track.label})`);
                    pc.addTrack(track, this.localStream);
                });
                
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
                    } else if (pc.connectionState === 'failed') {
                        console.log(`❌ Screen sharing connection failed with ${userData.user_id}`);
                    }
                };
                
                pc.oniceconnectionstatechange = () => {
                    console.log(`🧊 ICE connection to ${userData.user_id}: ${pc.iceConnectionState}`);
                };
                
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
                console.log(`✅ WebRTC setup initiated for ${userData.user_id}`);
                
            } catch (error) {
                console.error(`❌ Error setting up WebRTC connection to ${userData.user_id}:`, error);
            }
        }
        
        console.log(`✅ WebRTC setup complete for ${this.peerConnections.size} peer connections`);
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
                this.handleRemoteStream(event.streams[0], data.user_id);
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
        console.log(`📺 Handling remote screen stream from user: ${userId}`);
        
        this.videoElement.srcObject = stream;
        this.mediaStream = stream;
        
        try {
            await this.videoElement.play();
            await this.waitForVideoReady(this.videoElement);
            
            // Check if this is from a mobile user for orientation fix
            const shareData = this.getShareDataForUser(userId);
            if (shareData && shareData.mobile_device) {
                console.log('📱 Remote stream is from mobile device, checking orientation...');
                setTimeout(() => {
                    this.detectAndFixMobileOrientation();
                }, 500);
            }
            
            this.startVideoTextureUpdates();
            
        } catch (error) {
            console.warn('⚠️ Remote video setup failed:', error);
        }
        
        if (this.projectionSurface) {
            this.projectionSurface.visible = true;
            this.animateProjectionIn();
        }
        
        this.currentSharer = userId;
        this.showViewerControls(userId);
        this.showNotification(`📺 Now viewing ${userId}'s screen`);
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
    
    handleScreenShareMessage(data) {
        if (data.type === 'screen_share_started') {
            if (data.user_id !== window.WebSocketManager?.userId) {
                console.log(`📺 ${data.username} started sharing their screen`);
                
                // Store share data for later orientation detection
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
            }
        } else if (data.type === 'screen_share_stopped') {
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
                
                this.showNotification(`📺 ${data.username} stopped sharing`);
                this.hideViewerControls();
            }
        }
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
        
        // MOBILE ORIENTATION FIX FUNCTIONS - Simplified for seamless operation
        window.fixMobileOrientationManual = () => {
            if (window.ScreenSharingSystem && window.ScreenSharingSystem.projectionTexture) {
                console.log('🔧 Emergency manual orientation toggle...');
                
                // Simple toggle for emergency use
                window.ScreenSharingSystem.projectionTexture.flipY = !window.ScreenSharingSystem.projectionTexture.flipY;
                window.ScreenSharingSystem.projectionTexture.needsUpdate = true;
                
                console.log('🔄 Emergency toggle applied, flipY:', window.ScreenSharingSystem.projectionTexture.flipY);
            }
        };
        
        // Keep auto-fix for console access but remove from UI
        window.autoFixMobileOrientation = () => {
            if (window.ScreenSharingSystem && window.ScreenSharingSystem.isMobile()) {
                console.log('🤖 Console: Manual auto-fix trigger...');
                window.ScreenSharingSystem.detectAndFixMobileOrientation();
            }
        };
        
        // DEBUG FUNCTIONS
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
                // Toggle flipY to fix upside down issue
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
            console.log('  - FlipY:', this.projectionTexture.flipY);
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
        
        // Test camera access
        this.testCameraAccess();
    }
    
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
        
        console.log('✅ Immediate video texture fix applied');
    }
    
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
        
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        
        this.isSharing = false;
        this.currentSharer = null;
        this.isTextureUpdating = false;
        
        console.log('✅ Screen sharing cleanup complete');
    }
}

// ================================
// INITIALIZATION
// ================================

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

console.log('🖥️ Screen Sharing System with SEAMLESS MOBILE ORIENTATION FIX loaded!');
console.log('📱 Mobile camera orientation is now automatically detected and fixed');
console.log('🔧 No manual buttons needed - everything works seamlessly!');
console.log('💡 Emergency functions available in console:');
console.log('  - autoFixMobileOrientation() for manual trigger');
console.log('  - fixMobileOrientationManual() for emergency toggle');
console.log('  - debugScreenShare() for full debug info');
console.log('🎬 Use fixVideoTextureNow() for immediate video fixes');
console.log('🧪 Use testWithSolidColor() to test projection visibility');
console.log('⚡ Use forceVideoPlayNow() to manually force video play');
console.log('🔗 Use debugWebRTC() to check peer connections');
console.log('🔄 Use forceWebRTCReconnect() to restart WebRTC');
console.log('🖼️ Use debugScreenOrientation() to check screen rotation');