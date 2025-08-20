// Avatar System for Euphorie 3D - Optimized Among Us Style
// Mobile-optimized with better materials

class AvatarSystem {
    constructor() {
        this.scene = null;
        this.avatars = new Map();
        this.currentUserAvatar = null;
        this.isInitialized = false;
        this.isMobile = window.innerWidth <= 768;
    }

    init() {
        if (this.isInitialized) return true;
        
        this.scene = window.SceneManager?.scene || window.scene;
        
        if (!this.scene) {
            console.warn('Scene not available for avatar system');
            return false;
        }

        this.isInitialized = true;
        console.log('Avatar System initialized');
        return true;
    }

    createAvatar(userId, userData = {}) {
        if (!this.init() || !userId) return null;

        this.removeAvatar(userId);

        const avatarGroup = new THREE.Group();
        avatarGroup.name = userId;
        avatarGroup.userData = {
            userId: userId,
            id: userId,
            user_id: userId,
            username: userData.name || userData.username || `User_${userId.slice(-4)}`,
            nationality: userData.nationality || 'UN'
        };

        // More saturated colors
        const crewmateColors = [
            0xc51111, // Red
            0x132ed1, // Blue
            0x117f2d, // Green
            0xed54ba, // Pink
            0xf07c0d, // Orange
            0xf5f557, // Yellow
            0x3f474f, // Black
            0xd6e5e3, // White
            0x6b2fbb, // Purple
            0x71491e, // Brown
            0x38ffdd, // Cyan
            0x50ef39  // Lime
        ];
        
        const colorIndex = Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % crewmateColors.length;
        const crewmateColor = crewmateColors[colorIndex];

        // Use MeshToonMaterial for cartoon-like appearance with better performance
        const bodyMaterial = new THREE.MeshToonMaterial({ 
            color: crewmateColor,
            flatShading: false
        });

        // Main body - simplified for mobile
        const bodyGeometry = this.isMobile ? 
            new THREE.SphereGeometry(0.5, 8, 6) : 
            new THREE.SphereGeometry(0.5, 12, 8);
        bodyGeometry.scale(1, 1.3, 0.9);
        
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.65;
        avatarGroup.add(bodyMesh);

        // Visor - use MeshPhongMaterial for slight shine
        const visorGeometry = this.isMobile ?
            new THREE.SphereGeometry(0.35, 8, 6) :
            new THREE.SphereGeometry(0.35, 12, 8);
        visorGeometry.scale(1, 0.8, 1.2);
        
        const visorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x7dd3fc,
            shininess: 30,
            specular: 0x222222
        });
        const visorMesh = new THREE.Mesh(visorGeometry, visorMaterial);
        visorMesh.position.set(0, 1.1, 0.3);
        avatarGroup.add(visorMesh);

        // Simple reflection highlight
        const reflectionGeometry = new THREE.SphereGeometry(0.12, 6, 4);
        const reflectionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff
        });
        const reflectionMesh = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
        reflectionMesh.position.set(-0.08, 1.12, 0.42);
        avatarGroup.add(reflectionMesh);

        // Only add backpack and legs on desktop for performance
        if (!this.isMobile) {
            // Backpack
            const backpackGeometry = new THREE.BoxGeometry(0.25, 0.35, 0.12);
            const backpackMaterial = new THREE.MeshToonMaterial({ 
                color: this.darkenColor(crewmateColor, 0.4)
            });
            const backpackMesh = new THREE.Mesh(backpackGeometry, backpackMaterial);
            backpackMesh.position.set(0, 0.8, -0.35);
            avatarGroup.add(backpackMesh);

            // Legs
            const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.3, 6);
            const legMaterial = new THREE.MeshToonMaterial({ 
                color: crewmateColor
            });
            
            const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
            leftLeg.position.set(-0.15, 0.15, 0);
            avatarGroup.add(leftLeg);
            
            const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
            rightLeg.position.set(0.15, 0.15, 0);
            avatarGroup.add(rightLeg);
        }

        // Feet (always show)
        const footGeometry = this.isMobile ?
            new THREE.SphereGeometry(0.16, 6, 4) :
            new THREE.SphereGeometry(0.18, 8, 6);
        footGeometry.scale(1.2, 0.5, 1);
        
        const footMaterial = new THREE.MeshToonMaterial({ 
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

        // Only add idle animation on desktop
        if (!this.isMobile) {
            this.addIdleAnimation(avatarGroup);
        }

        this.scene.add(avatarGroup);
        this.avatars.set(userId, avatarGroup);

        console.log(`Created crewmate for ${userData.username || userId}`);
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
                time += 0.01; // Slower animation
                avatar.position.y = startY + Math.sin(time) * 0.03;
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
            console.log(`Removed avatar for ${userId}`);
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

    // Simplified animations for better performance
    animateAvatar(userId, animationType) {
        const avatar = this.avatars.get(userId);
        if (!avatar) return;

        switch (animationType) {
            case 'wave':
                this.playSimpleWave(avatar);
                break;
            case 'dance':
                this.playSimpleDance(avatar);
                break;
            case 'jump':
                this.playSimpleJump(avatar);
                break;
        }
    }

    playSimpleWave(avatar) {
        const startRotation = avatar.rotation.z;
        let progress = 0;
        
        const animate = () => {
            progress += 0.1;
            if (progress <= 1) {
                avatar.rotation.z = startRotation + Math.sin(progress * Math.PI * 3) * 0.3;
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.z = startRotation;
            }
        };
        animate();
    }

    playSimpleDance(avatar) {
        const startY = avatar.position.y;
        let progress = 0;
        
        const animate = () => {
            progress += 0.05;
            if (progress <= 2) {
                avatar.rotation.y = Math.sin(progress * Math.PI * 4) * 0.4;
                avatar.position.y = startY + Math.abs(Math.sin(progress * Math.PI * 8)) * 0.2;
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.y = 0;
                avatar.position.y = startY;
            }
        };
        animate();
    }

    playSimpleJump(avatar) {
        const startY = avatar.position.y;
        let progress = 0;
        
        const animate = () => {
            progress += 0.08;
            if (progress <= 1) {
                const jumpHeight = Math.sin(progress * Math.PI) * 0.8;
                avatar.position.y = startY + jumpHeight;
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

console.log('Optimized Among Us Avatar System loaded');