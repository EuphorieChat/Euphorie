// =============================================
// CRITICAL FIX: Chat Bubble Height Stacking Issue
// Apply this patch to your existing ChatBubbleSystem
// =============================================

console.log('🔧 APPLYING Critical Fix for Chat Bubble Stacking...');

// PATCH 1: Fix the core positioning calculation
// Replace the existing calculateConsistentBubblePosition method
window.ChatBubbleSystem.calculateConsistentBubblePosition = function(basePosition, userId) {
    const bubblePosition = basePosition.clone();
    
    // CRITICAL FIX: Use GROUND level as the reference, not basePosition.y
    // This eliminates any height accumulation from avatar positioning
    const groundLevel = this.config.groundY || 0;
    const fixedHeight = groundLevel + this.config.yOffset;
    
    // FORCE the exact same height for ALL bubbles
    bubblePosition.y = fixedHeight;
    
    // Clamp to safe bounds (but don't add to existing height)
    bubblePosition.y = Math.max(this.config.minHeight, bubblePosition.y);
    bubblePosition.y = Math.min(this.config.maxHeight, bubblePosition.y);
    
    if (this.config.enableDebug) {
        console.log(`🎯 [FIX] User ${userId} bubble at FIXED height: ${bubblePosition.y.toFixed(2)} (ground: ${groundLevel}, offset: ${this.config.yOffset})`);
    }
    
    return bubblePosition;
};

// PATCH 2: Enhanced replacement logic with immediate cleanup
// Replace the existing bubble creation tracking
window.ChatBubbleSystem.createBubble = function(message, username, position, userId = null) {
    if (!this.isInitialized || !window.THREE) {
        console.warn('💬 ChatBubbleSystem not ready');
        return null;
    }
    
    try {
        // CRITICAL: Remove old bubble FIRST, before creating new one
        if (userId && this.bubbles.has(userId)) {
            const userBubbles = this.bubbles.get(userId);
            if (userBubbles.length > 0) {
                console.log(`🗑️ [FIX] Removing ${userBubbles.length} existing bubble(s) for ${userId}`);
                
                // Force immediate removal (no animation delay)
                userBubbles.forEach(oldBubble => {
                    this.removeBubbleImmediate(oldBubble);
                });
                userBubbles.length = 0; // Clear array
            }
        }
        
        const bubbleGroup = new THREE.Group();
        const bubbleId = ++this.bubbleIdCounter;
        
        bubbleGroup.userData = { isChatBubble: true };
        
        // Create canvas with high DPI
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
            console.error('Could not get canvas context');
            return null;
        }
        
        // Calculate text dimensions
        const usernameFont = `bold ${this.config.fontSize * 0.85}px "Segoe UI", Arial, sans-serif`;
        const messageFont = `${this.config.fontSize}px "Segoe UI", Arial, sans-serif`;
        const textMetrics = this.calculateTextDimensions(context, message, username, usernameFont, messageFont);
        
        const bubbleWidth = textMetrics.bubbleWidth;
        const bubbleHeight = textMetrics.bubbleHeight;
        
        // High DPI canvas
        canvas.width = bubbleWidth * 3;
        canvas.height = bubbleHeight * 3;
        context.scale(3, 3);
        
        // Draw enhanced bubble
        this.drawBubbleBackground(context, bubbleWidth, bubbleHeight);
        this.drawBubbleText(context, username, textMetrics, usernameFont, messageFont);
        
        // Create sprite
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            alphaTest: 0.001,
            depthTest: false
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.userData = { isChatBubble: true };
        
        const scale = 0.008;
        this.safeScale.setSafeBubbleScale(sprite, bubbleWidth * scale, bubbleHeight * scale, 1);
        
        bubbleGroup.add(sprite);
        
        // FIXED: Calculate position using the patched method
        const bubblePosition = this.calculateConsistentBubblePosition(position, userId);
        bubbleGroup.position.copy(bubblePosition);
        
        // Set bubble data
        bubbleGroup.userData = {
            id: bubbleId,
            message: message,
            username: username,
            userId: userId,
            createdAt: Date.now(),
            opacity: 1,
            isVisible: true,
            originalPosition: bubblePosition.clone(),
            isChatBubble: true
        };
        
        this.safeScale.setSafeBubbleScalar(bubbleGroup, 0);
        this.animateBubbleInSafe(bubbleGroup);
        
        // Add to scene
        this.scene.add(bubbleGroup);
        
        // Track bubble
        this.activeBubbles.push(bubbleGroup);
        
        // Track per-user (now that old ones are removed)
        if (userId) {
            if (!this.bubbles.has(userId)) {
                this.bubbles.set(userId, []);
            }
            this.bubbles.get(userId).push(bubbleGroup);
        }
        
        // Clean up excess bubbles
        if (this.activeBubbles.length > this.config.maxBubbles) {
            const oldBubble = this.activeBubbles.shift();
            this.removeBubbleImmediate(oldBubble);
        }
        
        if (this.config.enableDebug) {
            console.log(`✅ [FIX] Created bubble for ${username} at height ${bubblePosition.y.toFixed(2)}`);
        }
        
        return bubbleGroup;
        
    } catch (error) {
        console.error('❌ Error creating bubble:', error);
        return null;
    }
};

// PATCH 3: Add immediate removal method (no animation delay)
window.ChatBubbleSystem.removeBubbleImmediate = function(bubble) {
    if (!bubble) return;
    
    try {
        // Remove from scene immediately
        if (bubble.parent) {
            bubble.parent.remove(bubble);
        }
        
        // Clean up resources
        bubble.children.forEach(child => {
            if (child.material) {
                if (child.material.map) {
                    child.material.map.dispose();
                }
                child.material.dispose();
            }
            if (child.geometry) {
                child.geometry.dispose();
            }
        });
        
        // Remove from tracking arrays
        const activeIndex = this.activeBubbles.indexOf(bubble);
        if (activeIndex > -1) {
            this.activeBubbles.splice(activeIndex, 1);
        }
        
        if (bubble.userData.userId && this.bubbles.has(bubble.userData.userId)) {
            const userBubbles = this.bubbles.get(bubble.userData.userId);
            const userIndex = userBubbles.indexOf(bubble);
            if (userIndex > -1) {
                userBubbles.splice(userIndex, 1);
            }
            
            if (userBubbles.length === 0) {
                this.bubbles.delete(bubble.userData.userId);
            }
        }
        
        if (this.config.enableDebug) {
            console.log(`🗑️ [FIX] Immediate removal of bubble for user: ${bubble.userData.userId}`);
        }
        
    } catch (error) {
        console.error('Error in immediate bubble removal:', error);
    }
};

// PATCH 4: Fix the update method's floating animation
// Replace the floating logic in the update method
const originalUpdate = window.ChatBubbleSystem.update;
window.ChatBubbleSystem.update = function() {
    if (!this.camera || !this.isInitialized) return;
    
    this._ensurePerformanceObject();
    const startTime = Date.now();
    
    try {
        this.activeBubbles.forEach(bubble => {
            if (!bubble || !bubble.parent) return;
            
            const distance = bubble.position.distanceTo(this.camera.position);
            
            if (distance > this.config.cullingDistance) {
                bubble.visible = false;
                bubble.userData.isVisible = false;
                return;
            }
            
            bubble.visible = true;
            bubble.userData.isVisible = true;
            
            bubble.lookAt(this.camera.position);
            
            // FIXED: Floating animation that maintains base height
            const time = Date.now() * 0.0008;
            const floatAmount = 0.02; // Very minimal float
            const floatOffset = Math.sin(time + bubble.userData.id * 0.7) * floatAmount;
            
            // CRITICAL: Use fixed base height, not original position
            const groundLevel = this.config.groundY || 0;
            const baseHeight = groundLevel + this.config.yOffset;
            const newY = baseHeight + floatOffset; // Add float to fixed base, never to changing position
            
            bubble.position.y = Math.max(this.config.minHeight, newY);
            
            // Very gentle swaying (keep horizontal position)
            const swayAmount = 0.005; // Reduced
            const swaySpeed = time * 0.3;
            const originalX = bubble.userData.originalPosition?.x || 0;
            const originalZ = bubble.userData.originalPosition?.z || 0;
            
            const swayX = Math.sin(swaySpeed + bubble.userData.id) * swayAmount;
            const swayZ = Math.cos(swaySpeed * 0.7 + bubble.userData.id * 0.5) * swayAmount;
            
            bubble.position.x = originalX + (isFinite(swayX) ? swayX : 0);
            bubble.position.z = originalZ + (isFinite(swayZ) ? swayZ : 0);
            
            if (bubble.userData.animationPhase === 'stable') {
                const rotationZ = Math.sin(time * 0.2 + bubble.userData.id) * 0.02;
                bubble.rotation.z = isFinite(rotationZ) ? rotationZ : 0;
            }
            
            if (bubble.children[0]?.material) {
                const normalizedDistance = Math.min(distance / this.config.maxDistance, 1);
                const opacity = Math.max(0.3, 1 - Math.pow(normalizedDistance, 1.5)) * (bubble.userData.opacity || 1);
                bubble.children[0].material.opacity = isFinite(opacity) ? opacity : 0.8;
                
                const rawScaleMultiplier = Math.max(0.7, 1 - normalizedDistance * 0.3);
                const safeScaleMultiplier = this.safeScale ? this.safeScale.safeScale(rawScaleMultiplier) : Math.max(0.1, rawScaleMultiplier);
                this.safeScale.setSafeBubbleScalar(bubble, safeScaleMultiplier);
            }
        });
        
    } catch (error) {
        console.error('Error in safe update:', error);
    }
    
    this._ensurePerformanceObject();
    this.performance.frameTime = Date.now() - startTime;
    this.performance.bubbleCount = this.activeBubbles.length;
    this.performance.renderCalls++;
};

// PATCH 5: Fix position updates to maintain fixed height
window.ChatBubbleSystem.updateBubblePositions = function(userId, newPosition) {
    if (!this.bubbles.has(userId) || !newPosition) return;
    
    try {
        this.cacheAvatarPosition(userId, newPosition);
        
        const userBubbles = this.bubbles.get(userId);
        userBubbles.forEach((bubble) => {
            if (bubble.userData.isVisible && bubble.userData.animationPhase !== 'exiting') {
                // FIXED: Use the same height calculation as creation
                const bubblePosition = newPosition.clone();
                const groundLevel = this.config.groundY || 0;
                const fixedHeight = groundLevel + this.config.yOffset;
                bubblePosition.y = fixedHeight; // Force fixed height
                
                // Update original position reference (for floating animation)
                bubble.userData.originalPosition = bubblePosition.clone();
                
                // Smoothly move to new horizontal position, but keep fixed height
                bubble.position.x = bubble.position.x + (bubblePosition.x - bubble.position.x) * 0.15;
                bubble.position.z = bubble.position.z + (bubblePosition.z - bubble.position.z) * 0.15;
                // Don't interpolate Y - keep it fixed
                bubble.position.y = fixedHeight;
            }
        });
    } catch (error) {
        console.error('Error updating bubble positions:', error);
    }
};

// PATCH 6: Add debugging utilities
window.ChatBubbleSystem.debugHeights = function() {
    console.log('🔍 [DEBUG] Current bubble heights:');
    
    const groundLevel = this.config.groundY || 0;
    const expectedHeight = groundLevel + this.config.yOffset;
    
    console.log(`Expected height: ${expectedHeight.toFixed(2)} (ground: ${groundLevel}, offset: ${this.config.yOffset})`);
    
    this.activeBubbles.forEach((bubble, index) => {
        const actualHeight = bubble.position.y;
        const isCorrect = Math.abs(actualHeight - expectedHeight) < 0.1;
        const status = isCorrect ? '✅' : '❌';
        
        console.log(`  ${status} Bubble ${index}: ${actualHeight.toFixed(2)} (user: ${bubble.userData.userId}, message: "${bubble.userData.message?.substring(0, 20)}...")`);
    });
    
    if (this.activeBubbles.length === 0) {
        console.log('  No active bubbles');
    }
};

// PATCH 7: Force cleanup of any existing problematic bubbles
window.ChatBubbleSystem.fixExistingBubbles = function() {
    console.log('🔧 [FIX] Fixing existing bubble heights...');
    
    const groundLevel = this.config.groundY || 0;
    const correctHeight = groundLevel + this.config.yOffset;
    let fixedCount = 0;
    
    this.activeBubbles.forEach(bubble => {
        if (Math.abs(bubble.position.y - correctHeight) > 0.1) {
            console.log(`🔧 Fixing bubble height: ${bubble.position.y.toFixed(2)} → ${correctHeight.toFixed(2)}`);
            bubble.position.y = correctHeight;
            bubble.userData.originalPosition.y = correctHeight;
            fixedCount++;
        }
    });
    
    console.log(`✅ Fixed ${fixedCount} bubble heights`);
};

// PATCH 8: Configuration override for testing
window.ChatBubbleSystem.config.yOffset = 2.8; // Ensure consistent offset
window.ChatBubbleSystem.config.forceReplacement = true;
window.ChatBubbleSystem.config.maxBubblesPerUser = 1;

console.log('✅ Critical Chat Bubble Stacking Fix Applied!');
console.log('🧪 Test with:');
console.log('  window.ChatBubbleSystem.createTestBubble("Test 1", "User1")');
console.log('  window.ChatBubbleSystem.createTestBubble("Test 2", "User1")'); // Should replace first
console.log('  window.ChatBubbleSystem.debugHeights()'); // Check all heights
console.log('  window.ChatBubbleSystem.fixExistingBubbles()'); // Fix any existing wrong heights