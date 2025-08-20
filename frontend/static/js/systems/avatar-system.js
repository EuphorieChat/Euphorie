// Avatar System for Euphorie 3D
// Basic avatar rendering and management without customization UI

class AvatarSystem {
    constructor() {
        this.scene = null;
        this.avatars = new Map();
        this.currentUserAvatar = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        // Get scene reference
        this.scene = window.SceneManager?.scene || window.scene;
        
        if (!this.scene) {
            console.warn('Scene not available for avatar system');
            return;
        }

        this.isInitialized = true;
        console.log('✅ Avatar System initialized');
    }

    createAvatar(userId, userData = {}) {
        if (!this.scene || !userId) return null;

        // Remove existing avatar if any
        this.removeAvatar(userId);

        // Create simple avatar geometry
        const avatarGroup = new THREE.Group();
        avatarGroup.name = userId;
        avatarGroup.userData = {
            userId: userId,
            id: userId,
            user_id: userId,
            username: userData.name || userData.username || `User_${userId.slice(-4)}`,
            nationality: userData.nationality || 'UN'
        };

        // Body (capsule or cylinder)
        const bodyGeometry = new THREE.CapsuleGeometry ? 
            new THREE.CapsuleGeometry(0.4, 1.4, 4, 8) : 
            new THREE.CylinderGeometry(0.4, 0.4, 1.4, 8);
        
        // Generate color based on user ID
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3, 0x6c5ce7, 0xa29bfe];
        const colorIndex = Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: colors[colorIndex] });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.7;
        avatarGroup.add(bodyMesh);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.y = 1.6;
        avatarGroup.add(headMesh);

        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.04, 6, 4);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 1.65, 0.2);
        avatarGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 1.65, 0.2);
        avatarGroup.add(rightEye);

        // Position avatar
        const position = userData.position || this.getRandomPosition();
        avatarGroup.position.set(position.x, position.y || 0, position.z);

        // Add to scene and track
        this.scene.add(avatarGroup);
        this.avatars.set(userId, avatarGroup);

        console.log(`👤 Created avatar for ${userData.username || userId}`);
        return avatarGroup;
    }

    removeAvatar(userId) {
        const avatar = this.avatars.get(userId);
        if (avatar && this.scene) {
            // Clean up geometry and materials
            avatar.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });

            this.scene.remove(avatar);
            this.avatars.delete(userId);
            console.log(`🗑️ Removed avatar for ${userId}`);
        }
    }

    updateAvatarPosition(userId, position) {
        const avatar = this.avatars.get(userId);
        if (avatar && position) {
            avatar.position.set(
                position.x || avatar.position.x,
                position.y || avatar.position.y,
                position.z || avatar.position.z
            );
        }
    }

    getAvatar(userId) {
        return this.avatars.get(userId);
    }

    getAllAvatars() {
        return Array.from(this.avatars.values());
    }

    getRandomPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 3;
        return {
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius
        };
    }

    getRandomCustomization() {
        // Return random customization options for variety
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57, 0xff9ff3];
        return {
            bodyColor: colors[Math.floor(Math.random() * colors.length)],
            height: 0.8 + Math.random() * 0.4,
            width: 0.8 + Math.random() * 0.4
        };
    }

    // Animation helpers
    animateAvatar(userId, animationType) {
        const avatar = this.avatars.get(userId);
        if (!avatar) return;

        switch (animationType) {
            case 'wave':
                this.playWaveAnimation(avatar);
                break;
            case 'dance':
                this.playDanceAnimation(avatar);
                break;
            case 'jump':
                this.playJumpAnimation(avatar);
                break;
        }
    }

    playWaveAnimation(avatar) {
        const startY = avatar.position.y;
        const duration = 1000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                avatar.rotation.z = Math.sin(progress * Math.PI * 4) * 0.2;
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.z = 0;
            }
        };
        animate();
    }

    playDanceAnimation(avatar) {
        const startTime = Date.now();
        const duration = 2000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                avatar.rotation.y = Math.sin(progress * Math.PI * 8) * 0.5;
                avatar.position.y = Math.abs(Math.sin(progress * Math.PI * 16)) * 0.2;
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.y = 0;
                avatar.position.y = 0;
            }
        };
        animate();
    }

    playJumpAnimation(avatar) {
        const startY = avatar.position.y;
        const duration = 800;
        const height = 1.0;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                const jumpProgress = Math.sin(progress * Math.PI);
                avatar.position.y = startY + jumpProgress * height;
                requestAnimationFrame(animate);
            } else {
                avatar.position.y = startY;
            }
        };
        animate();
    }

    // Clean up
    dispose() {
        this.avatars.forEach((avatar, userId) => {
            this.removeAvatar(userId);
        });
        this.avatars.clear();
        this.isInitialized = false;
    }
}

// Global instance
window.AvatarSystem = new AvatarSystem();

// Auto-initialize when scene is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.AvatarSystem && !window.AvatarSystem.isInitialized) {
                window.AvatarSystem.init();
            }
        }, 1000);
    });
} else {
    setTimeout(() => {
        if (window.AvatarSystem && !window.AvatarSystem.isInitialized) {
            window.AvatarSystem.init();
        }
    }, 1000);
}

console.log('📦 Avatar System loaded');