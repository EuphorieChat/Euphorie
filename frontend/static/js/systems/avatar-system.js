// Avatar System for Euphorie 3D - Among Us Style
// Basic avatar rendering and management without customization UI

class AvatarSystem {
    constructor() {
        this.scene = null;
        this.avatars = new Map();
        this.currentUserAvatar = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return true;
        
        // Get scene reference
        this.scene = window.SceneManager?.scene || window.scene;
        
        if (!this.scene) {
            console.warn('Scene not available for avatar system');
            return false;
        }

        this.isInitialized = true;
        console.log('✅ Avatar System initialized');
        return true;
    }

    createAvatar(userId, userData = {}) {
        if (!this.init() || !userId) return null;

        // Remove existing avatar if any
        this.removeAvatar(userId);

        // Create Among Us crewmate
        const avatarGroup = new THREE.Group();
        avatarGroup.name = userId;
        avatarGroup.userData = {
            userId: userId,
            id: userId,
            user_id: userId,
            username: userData.name || userData.username || `User_${userId.slice(-4)}`,
            nationality: userData.nationality || 'UN'
        };

        // Among Us color palette - more vibrant
        const crewmateColors = [
            0xdd2e44, // Red
            0x1982c4, // Blue
            0x11a03e, // Green
            0xee5a52, // Pink
            0xef7611, // Orange
            0xf5d800, // Yellow
            0x3f474f, // Black
            0xd6e5e3, // White
            0x6a2c70, // Purple
            0x7a4f01, // Brown
            0x38f4f4, // Cyan
            0x50ef39  // Lime
        ];
        
        const colorIndex = Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % crewmateColors.length;
        const crewmateColor = crewmateColors[colorIndex];

        // Main body - bean shape - SOLID COLOR
        const bodyGeometry = new THREE.SphereGeometry(0.5, 12, 8);
        bodyGeometry.scale(1, 1.3, 0.9);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: crewmateColor,
            transparent: false // Ensure it's not transparent
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.65;
        avatarGroup.add(bodyMesh);

        // Visor/face area - SOLID LIGHT BLUE
        const visorGeometry = new THREE.SphereGeometry(0.35, 12, 8);
        visorGeometry.scale(1, 0.8, 1.2);
        const visorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x9dd9f3, // Solid light blue
            transparent: false
        });
        const visorMesh = new THREE.Mesh(visorGeometry, visorMaterial);
        visorMesh.position.set(0, 1.1, 0.3);
        avatarGroup.add(visorMesh);

        // Visor reflection - BRIGHT WHITE
        const reflectionGeometry = new THREE.SphereGeometry(0.15, 8, 6);
        reflectionGeometry.scale(0.8, 0.6, 1.1);
        const reflectionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff
        });
        const reflectionMesh = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
        reflectionMesh.position.set(-0.1, 1.15, 0.45);
        avatarGroup.add(reflectionMesh);

        // Backpack - DARKER SOLID COLOR
        const backpackGeometry = new THREE.BoxGeometry(0.3, 0.4, 0.15);
        const backpackMaterial = new THREE.MeshLambertMaterial({ 
            color: this.darkenColor(crewmateColor, 0.4)
        });
        const backpackMesh = new THREE.Mesh(backpackGeometry, backpackMaterial);
        backpackMesh.position.set(0, 0.8, -0.4);
        avatarGroup.add(backpackMesh);

        // Legs - SOLID COLOR
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.3, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ 
            color: crewmateColor,
            transparent: false
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, 0.15, 0);
        avatarGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, 0.15, 0);
        avatarGroup.add(rightLeg);

        // Feet - SOLID DARKER COLOR
        const footGeometry = new THREE.SphereGeometry(0.18, 8, 6);
        footGeometry.scale(1.2, 0.5, 1);
        const footMaterial = new THREE.MeshLambertMaterial({ 
            color: this.darkenColor(crewmateColor, 0.3)
        });
        
        const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
        leftFoot.position.set(-0.15, 0.05, 0.05);
        avatarGroup.add(leftFoot);
        
        const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
        rightFoot.position.set(0.15, 0.05, 0.05);
        avatarGroup.add(rightFoot);

        // Position avatar
        const position = userData.position || this.getRandomPosition();
        avatarGroup.position.set(position.x, position.y || 0, position.z);

        // Add subtle idle animation
        this.addIdleAnimation(avatarGroup);

        // Add to scene and track
        this.scene.add(avatarGroup);
        this.avatars.set(userId, avatarGroup);

        console.log(`👤 Created Among Us crewmate for ${userData.username || userId}`);
        return avatarGroup;
    }

    darkenColor(color, factor) {
        const r = Math.max(0, ((color >> 16) & 0xff) * (1 - factor));
        const g = Math.max(0, ((color >> 8) & 0xff) * (1 - factor));
        const b = Math.max(0, (color & 0xff) * (1 - factor));
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    addIdleAnimation(avatar) {
        const startY = avatar.position.y;
        let time = Math.random() * Math.PI * 2;
        
        const animate = () => {
            if (avatar.parent) {
                time += 0.02;
                avatar.position.y = startY + Math.sin(time) * 0.05;
                avatar.rotation.y = Math.sin(time * 0.5) * 0.1;
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    removeAvatar(userId) {
        const avatar = this.avatars.get(userId);
        if (avatar && this.scene) {
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
                const bounceHeight = Math.abs(Math.sin(progress * Math.PI * 16)) * 0.3;
                avatar.children.forEach((child, index) => {
                    if (child.position) {
                        child.position.y += bounceHeight * (index % 2 === 0 ? 1 : -1) * 0.1;
                    }
                });
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.y = 0;
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

    dispose() {
        this.avatars.forEach((avatar, userId) => {
            this.removeAvatar(userId);
        });
        this.avatars.clear();
        this.isInitialized = false;
    }
}

// Make AvatarSystem globally available
window.AvatarSystem = new AvatarSystem();

// Initialize immediately if scene is ready
if (window.SceneManager && window.SceneManager.scene) {
    window.AvatarSystem.init();
} else {
    const checkScene = setInterval(() => {
        if (window.SceneManager && window.SceneManager.scene) {
            clearInterval(checkScene);
            window.AvatarSystem.init();
        }
    }, 100);
}

console.log('✅ Among Us Avatar System loaded and made globally available');