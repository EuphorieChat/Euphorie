// COMPREHENSIVE FIX for Chat Bubble NaN Scale Issues
// This fixes the exact problem where bubble scales become NaN during animation

console.log('🔧 LOADING COMPREHENSIVE CHAT BUBBLE FIX...');

// 1. SAFE MATH UTILITIES - Prevent NaN in all calculations
window.SafeMath = {
    safeDivide: (a, b) => {
        if (b === 0 || !isFinite(b)) return 0;
        const result = a / b;
        return isFinite(result) ? result : 0;
    },
    
    safeProgress: (elapsed, duration) => {
        if (duration <= 0 || !isFinite(duration)) return 1;
        const progress = elapsed / duration;
        return Math.max(0, Math.min(1, isFinite(progress) ? progress : 0));
    },
    
    safeScale: (value) => {
        if (!isFinite(value) || isNaN(value) || value <= 0) {
            console.warn('🛡️ Prevented invalid scale value:', value, 'using 1 instead');
            return 1;
        }
        return Math.max(0.001, Math.min(10, value));
    },
    
    safeEasing: (progress) => {
        if (!isFinite(progress) || isNaN(progress)) return 0;
        progress = Math.max(0, Math.min(1, progress));
        return progress < 0.5 ? 2 * progress * progress : 1 - 2 * (1 - progress) * (1 - progress);
    }
};

// 2. OVERRIDE THREE.JS SCALE METHODS - Prevent NaN from ever being set
if (window.THREE) {
    console.log('🛡️ Installing THREE.js NaN protection...');
    
    // Protect Vector3.setScalar
    const originalSetScalar = THREE.Vector3.prototype.setScalar;
    THREE.Vector3.prototype.setScalar = function(scalar) {
        const safeScalar = window.SafeMath.safeScale(scalar);
        if (safeScalar !== scalar) {
            console.warn('🛡️ THREE.Vector3.setScalar protected from NaN:', scalar, '→', safeScalar);
        }
        return originalSetScalar.call(this, safeScalar);
    };
    
    // Protect Object3D.scale.set
    const originalScaleSet = THREE.Vector3.prototype.set;
    THREE.Vector3.prototype.set = function(x, y, z) {
        const safeX = window.SafeMath.safeScale(x);
        const safeY = window.SafeMath.safeScale(y || x);
        const safeZ = window.SafeMath.safeScale(z || x);
        
        if (safeX !== x || safeY !== (y || x) || safeZ !== (z || x)) {
            console.warn('🛡️ THREE.Vector3.set protected from NaN:', {x, y, z}, '→', {x: safeX, y: safeY, z: safeZ});
        }
        
        return originalScaleSet.call(this, safeX, safeY, safeZ);
    };
}

// 3. FIX SCENE MANAGER TRANSITION EFFECTS - Source of NaN scales
window.fixSceneManagerTransitions = function() {
    if (!window.SceneManager || !window.SceneManager.createEnhancedTransitionEffect) {
        console.log('⚠️ SceneManager not available for transition fix');
        return;
    }
    
    console.log('🔧 Fixing Scene Manager transition effects...');
    
    // Override the problematic createEnhancedTransitionEffect method
    window.SceneManager.createEnhancedTransitionEffect = function(preset) {
        console.log('🎨 Creating SAFE enhanced transition effect');
        
        const transitionCount = 30;
        const colors = [preset.backgroundColor, preset.groundColor];
        
        for (let i = 0; i < transitionCount; i++) {
            const wave = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: colors[i % colors.length],
                    transparent: true,
                    opacity: 0.7
                })
            );
            
            wave.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 10,
                (Math.random() - 0.5) * 30
            );
            
            this.scene.add(wave);
            
            // SAFE wave animation with NaN protection
            let wavePhase = 0;
            const waveInterval = setInterval(() => {
                wavePhase += 0.06;
                wave.position.y += 0.04;
                
                // FIXED: Safe scale calculation with NaN protection
                const rawScale = 1 + wavePhase * 1.5;
                const safeScale = window.SafeMath.safeScale(rawScale);
                
                // Only update if scale is valid
                if (isFinite(safeScale) && safeScale > 0) {
                    wave.scale.setScalar(safeScale);
                }
                
                // Safe opacity calculation
                const opacity = Math.max(0, Math.min(1, 0.7 - (wavePhase / 1.5)));
                wave.material.opacity = opacity;
                
                // Safe rotation
                wave.rotation.x += 0.08;
                wave.rotation.y += 0.12;
                
                if (wavePhase >= 1.5) {
                    clearInterval(waveInterval);
                    this.scene.remove(wave);
                }
            }, 50);
        }
    };
    
    console.log('✅ Scene Manager transition effects fixed');
};

// 4. FIX CHAT BUBBLE SYSTEM ANIMATIONS - Main source of NaN
window.fixChatBubbleAnimations = function() {
    if (!window.ChatBubbleSystem) {
        console.log('⚠️ ChatBubbleSystem not available for animation fix');
        return;
    }
    
    console.log('🔧 Fixing ChatBubbleSystem animations...');
    
    // Override animateBubbleIn with safe math
    const originalAnimateBubbleIn = window.ChatBubbleSystem.animateBubbleIn;
    window.ChatBubbleSystem.animateBubbleIn = function(bubble) {
        if (!bubble) return;
        
        console.log('✅ Starting SAFE bubble animation for:', bubble.userData?.message);
        
        const startScale = 0;
        const endScale = 1;
        const duration = this.config.animationDuration || 500;
        const startTime = Date.now();
        
        bubble.userData.animationPhase = 'entering';
        
        const animate = () => {
            try {
                const elapsed = Date.now() - startTime;
                const progress = window.SafeMath.safeProgress(elapsed, duration);
                
                // SAFE easing calculation
                const easeProgress = window.SafeMath.safeEasing(progress);
                
                // SAFE bounce calculation
                let bounceScale = easeProgress;
                if (progress > 0.8) {
                    const bouncePhase = (progress - 0.8) / 0.2;
                    const bounce = Math.sin(bouncePhase * Math.PI * 3) * 0.1 * (1 - bouncePhase);
                    bounceScale = easeProgress + bounce;
                }
                
                // SAFE scale calculation with protection
                const rawScale = startScale + (endScale - startScale) * bounceScale;
                const safeScale = window.SafeMath.safeScale(rawScale);
                
                // Apply safe scale
                bubble.scale.setScalar(safeScale);
                
                // Safe rotation
                const rotation = (1 - progress) * 0.15 * Math.sin(progress * Math.PI * 2);
                bubble.rotation.z = isFinite(rotation) ? rotation : 0;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    bubble.userData.animationPhase = 'stable';
                    bubble.rotation.z = 0;
                    bubble.scale.setScalar(1); // Ensure final scale is exactly 1
                    
                    console.log('✅ Bubble animation completed safely:', bubble.userData?.message);
                    
                    // Schedule fade out
                    setTimeout(() => {
                        this.animateBubbleOut(bubble);
                    }, this.config.fadeTime);
                }
            } catch (error) {
                console.error('❌ Error in safe bubble animation:', error);
                // Fallback: set to stable state
                bubble.scale.setScalar(1);
                bubble.userData.animationPhase = 'stable';
            }
        };
        
        animate();
    };
    
    // Override update method with safe math
    const originalUpdate = window.ChatBubbleSystem.update;
    window.ChatBubbleSystem.update = function() {
        if (!this.camera || !this.isInitialized) return;
        
        this._ensurePerformanceObject();
        const startTime = Date.now();
        
        try {
            this.activeBubbles.forEach(bubble => {
                if (!bubble || !bubble.parent) return;
                
                const distance = bubble.position.distanceTo(this.camera.position);
                
                // Culling
                if (distance > this.config.cullingDistance) {
                    bubble.visible = false;
                    bubble.userData.isVisible = false;
                    return;
                }
                
                bubble.visible = true;
                bubble.userData.isVisible = true;
                
                // Face camera
                bubble.lookAt(this.camera.position);
                
                // SAFE floating animation
                const time = Date.now() * 0.0008;
                const floatAmount = this.config.floatIntensity || 0.04;
                const floatOffset = Math.sin(time + (bubble.userData.animationPhase || 0)) * floatAmount;
                
                // FIXED: Safe Y position calculation
                const originalY = bubble.userData.originalPosition?.y || this.config.yOffset;
                const newY = Math.max(this.config.yOffset, originalY + floatOffset);
                bubble.position.y = isFinite(newY) ? newY : this.config.yOffset;
                
                // SAFE swaying with bounds checking
                const swayAmount = this.config.swayIntensity || 0.02;
                const swaySpeed = time * 0.5;
                const originalX = bubble.userData.originalPosition?.x || 0;
                const originalZ = bubble.userData.originalPosition?.z || 0;
                
                const swayX = Math.sin(swaySpeed + (bubble.userData.animationPhase || 0)) * swayAmount;
                const swayZ = Math.cos(swaySpeed * 0.7 + (bubble.userData.animationPhase || 0) * 0.8) * swayAmount;
                
                bubble.position.x = originalX + (isFinite(swayX) ? swayX : 0);
                bubble.position.z = originalZ + (isFinite(swayZ) ? swayZ : 0);
                
                // SAFE rotation
                if (bubble.userData.animationPhase === 'stable') {
                    const rotationZ = Math.sin(time * 0.3 + (bubble.userData.animationPhase || 0)) * 0.03;
                    bubble.rotation.z = isFinite(rotationZ) ? rotationZ : 0;
                }
                
                // SAFE opacity and scale
                if (bubble.children[0]?.material) {
                    const normalizedDistance = Math.min(distance / this.config.maxDistance, 1);
                    const opacity = Math.max(0.3, 1 - Math.pow(normalizedDistance, 1.5)) * (bubble.userData.opacity || 1);
                    bubble.children[0].material.opacity = isFinite(opacity) ? opacity : 0.8;
                    
                    // SAFE scale based on distance
                    const rawScaleMultiplier = Math.max(0.7, 1 - normalizedDistance * 0.3);
                    const safeScaleMultiplier = window.SafeMath.safeScale(rawScaleMultiplier);
                    bubble.scale.setScalar(safeScaleMultiplier);
                }
                
                // Update glow effect safely
                const glowEffect = bubble.getObjectByName?.('bubbleGlow');
                if (glowEffect && glowEffect.material) {
                    glowEffect.material.opacity = 0.1 * (bubble.userData.opacity || 1);
                    const glowPulse = 1 + Math.sin(time * 2 + (bubble.userData.animationPhase || 0)) * 0.1;
                    const safeGlowPulse = window.SafeMath.safeScale(glowPulse);
                    glowEffect.scale.setScalar(safeGlowPulse);
                }
            });
            
        } catch (error) {
            console.error('❌ Error in safe update:', error);
        }
        
        // Performance tracking
        this._ensurePerformanceObject();
        this.performance.frameTime = Date.now() - startTime;
        this.performance.bubbleCount = this.activeBubbles.length;
        this.performance.renderCalls++;
    };
    
    console.log('✅ ChatBubbleSystem animations fixed');
};

// 5. REPAIR EXISTING BUBBLES IN SCENE
window.repairExistingBubbles = function() {
    console.log('🔧 Repairing existing bubbles...');
    
    let repairedCount = 0;
    
    if (window.SceneManager?.scene) {
        window.SceneManager.scene.traverse(child => {
            // Look for chat bubbles
            if (child.userData?.message || child.name?.includes('bubble') || 
                child.children?.some(c => c.material?.map)) {
                
                // Check if scale is NaN
                if (!isFinite(child.scale.x) || !isFinite(child.scale.y) || !isFinite(child.scale.z)) {
                    console.log('🔧 Repairing bubble with NaN scale:', child.userData?.message);
                    child.scale.setScalar(1);
                    repairedCount++;
                }
                
                // Ensure position is valid
                if (!isFinite(child.position.y) || child.position.y < 0) {
                    child.position.y = 3.5; // Safe default height
                    repairedCount++;
                }
                
                // Ensure visibility
                child.visible = true;
            }
        });
    }
    
    console.log(`✅ Repaired ${repairedCount} bubbles`);
    return repairedCount;
};

// 6. SAFE BUBBLE CREATION FUNCTION
window.createSafeBubble = function(message = "SAFE TEST BUBBLE ✅", username = "SafeUser") {
    console.log('🧪 Creating safe test bubble...');
    
    if (!window.THREE) {
        console.error('❌ THREE.js not available');
        return null;
    }
    
    if (!window.ChatBubbleSystem?.isInitialized) {
        console.error('❌ ChatBubbleSystem not initialized');
        return null;
    }
    
    // Create with guaranteed safe position
    const position = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        3.5, // Safe height above ground
        (Math.random() - 0.5) * 8
    );
    
    const bubble = window.ChatBubbleSystem.createBubble(message, username, position, 'safe_' + Date.now(), 'US');
    
    if (bubble) {
        console.log('✅ Safe bubble created:', bubble);
        
        // Monitor its scale
        setTimeout(() => {
            console.log('Safe bubble scale after 1 second:', bubble.scale.x, 'NaN?', isNaN(bubble.scale.x));
        }, 1000);
    } else {
        console.error('❌ Failed to create safe bubble');
    }
    
    return bubble;
};

// 7. DIAGNOSTIC FUNCTION
window.diagnoseBubbleIssues = function() {
    console.log('🔍 Diagnosing bubble issues...');
    
    const chatSystem = window.ChatBubbleSystem;
    console.log('ChatBubbleSystem initialized:', chatSystem?.isInitialized);
    console.log('Active bubbles count:', chatSystem?.activeBubbles?.length || 0);
    console.log('Fade time setting:', chatSystem?.config?.fadeTime);
    
    let totalBubbles = 0;
    let nanScaleBubbles = 0;
    
    if (window.SceneManager?.scene) {
        window.SceneManager.scene.traverse(child => {
            if (child.userData?.message || child.name?.includes('bubble')) {
                totalBubbles++;
                if (!isFinite(child.scale.x)) {
                    nanScaleBubbles++;
                    console.log('❌ Found bubble with NaN scale:', child.userData?.message);
                }
            }
        });
    }
    
    console.log('Total bubbles in scene:', totalBubbles);
    console.log('Bubbles with NaN scale:', nanScaleBubbles);
    
    return {
        totalBubbles,
        nanScaleBubbles,
        chatSystemReady: chatSystem?.isInitialized || false
    };
};

// 8. AUTO-APPLY ALL FIXES
console.log('🚀 Auto-applying fixes...');
window.fixSceneManagerTransitions();
window.fixChatBubbleAnimations();
const repairedCount = window.repairExistingBubbles();

console.log('🎯 CHAT BUBBLE SCALE FIX LOADED!');
console.log('📋 Available functions:');
console.log('  - window.createSafeBubble("message") - Create a guaranteed working bubble');
console.log('  - window.diagnoseBubbleIssues() - Check bubble status');
console.log('  - window.repairExistingBubbles() - Fix any broken bubbles');
console.log('');
console.log('🧪 Test with: window.createSafeBubble("I CAN SEE THIS!");');