// Avatar System for Euphorie 3D - Sophisticated with Collision Detection
class AvatarSystem {
    constructor() {
        this.scene = null;
        this.avatars = new Map();
        this.currentUserAvatar = null;
        this.isInitialized = false;
        this.isMobile = window.innerWidth <= 768;
        this.occupiedPositions = [];
        this.minDistance = 2.5; // Minimum distance between avatars
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

        // Premium color palette with metallic tones
        const crewmateColors = [
            0xe74c3c, // Ruby Red
            0x3498db, // Sapphire Blue
            0x2ecc71, // Emerald Green
            0xe91e63, // Rose Pink
            0xf39c12, // Amber Orange
            0xf1c40f, // Gold Yellow
            0x34495e, // Slate Black
            0xecf0f1, // Pearl White
            0x9b59b6, // Amethyst Purple
            0x8b4513, // Bronze Brown
            0x1abc9c, // Turquoise
            0x7fb069  // Jade Lime
        ];
        
        const colorIndex = Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % crewmateColors.length;
        const primaryColor = crewmateColors[colorIndex];

        // Enhanced materials with environmental mapping
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: primaryColor,
            metalness: 0.1,
            roughness: 0.3,
            envMapIntensity: 0.5
        });

        // Main body - more detailed
        const bodyGeometry = this.isMobile ? 
            new THREE.SphereGeometry(0.5, 16, 12) : 
            new THREE.SphereGeometry(0.5, 24, 18);
        
        // Create more organic bean shape
        const positions = bodyGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const scaleFactor = 1 + (y * 0.3); // Taper toward top
            positions.setX(i, positions.getX(i) * scaleFactor * 0.9);
            positions.setZ(i, positions.getZ(i) * scaleFactor * 0.85);
            positions.setY(i, y * 1.4); // Stretch vertically
        }
        bodyGeometry.computeVertexNormals();
        
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.7;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        avatarGroup.add(bodyMesh);

        // Enhanced visor with gradient effect
        const visorGeometry = this.isMobile ?
            new THREE.SphereGeometry(0.35, 12, 10) :
            new THREE.SphereGeometry(0.35, 20, 16);
        visorGeometry.scale(1.1, 0.85, 1.3);
        
        const visorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7dd3fc,
            metalness: 0.8,
            roughness: 0.1,
            transparent: true,
            opacity: 0.9,
            envMapIntensity: 1.0
        });
        const visorMesh = new THREE.Mesh(visorGeometry, visorMaterial);
        visorMesh.position.set(0, 1.15, 0.32);
        visorMesh.castShadow = true;
        avatarGroup.add(visorMesh);

        // Multiple reflection highlights for realism
        const highlights = [
            { pos: [-0.12, 1.18, 0.48], size: 0.08, opacity: 0.8 },
            { pos: [0.05, 1.25, 0.45], size: 0.05, opacity: 0.6 },
            { pos: [-0.08, 1.08, 0.5], size: 0.04, opacity: 0.4 }
        ];
        
        highlights.forEach(highlight => {
            const reflectionGeometry = new THREE.SphereGeometry(highlight.size, 8, 6);
            const reflectionMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: highlight.opacity
            });
            const reflectionMesh = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
            reflectionMesh.position.set(...highlight.pos);
            avatarGroup.add(reflectionMesh);
        });

        // Detailed backpack with straps
        if (!this.isMobile) {
            const backpackGeometry = new THREE.BoxGeometry(0.28, 0.4, 0.15);
            // Add rounded edges
            backpackGeometry.parameters = { ...backpackGeometry.parameters };
            
            const backpackMaterial = new THREE.MeshStandardMaterial({ 
                color: this.darkenColor(primaryColor, 0.4),
                metalness: 0.05,
                roughness: 0.6
            });
            const backpackMesh = new THREE.Mesh(backpackGeometry, backpackMaterial);
            backpackMesh.position.set(0, 0.85, -0.38);
            backpackMesh.castShadow = true;
            avatarGroup.add(backpackMesh);

            // Backpack straps
            const strapGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
            const strapMaterial = new THREE.MeshStandardMaterial({ 
                color: this.darkenColor(primaryColor, 0.6),
                metalness: 0.1,
                roughness: 0.8
            });
            
            [-0.1, 0.1].forEach(x => {
                const strap = new THREE.Mesh(strapGeometry, strapMaterial);
                strap.position.set(x, 0.95, -0.25);
                strap.rotation.x = 0.3;
                avatarGroup.add(strap);
            });

            // Enhanced legs with proper joints
            const legGeometry = new THREE.CylinderGeometry(0.12, 0.16, 0.35, 12);
            const legMaterial = new THREE.MeshStandardMaterial({ 
                color: primaryColor,
                metalness: 0.1,
                roughness: 0.3
            });
            
            [-0.15, 0.15].forEach(x => {
                const leg = new THREE.Mesh(legGeometry, legMaterial);
                leg.position.set(x, 0.17, 0);
                leg.castShadow = true;
                avatarGroup.add(leg);
            });
        }

        // Enhanced feet with better shape
        const footGeometry = this.isMobile ?
            new THREE.SphereGeometry(0.18, 10, 8) :
            new THREE.SphereGeometry(0.20, 12, 10);
        footGeometry.scale(1.3, 0.6, 1.1);
        
        const footMaterial = new THREE.MeshStandardMaterial({ 
            color: this.darkenColor(primaryColor, 0.3),
            metalness: 0.2,
            roughness: 0.4
        });
        
        [-0.15, 0.15].forEach(x => {
            const foot = new THREE.Mesh(footGeometry, footMaterial);
            foot.position.set(x, 0.08, 0.08);
            foot.castShadow = true;
            foot.receiveShadow = true;
            avatarGroup.add(foot);
        });

        // Get non-overlapping position
        const position = userData.position || this.getNonOverlappingPosition();
        avatarGroup.position.set(position.x, position.y || 0, position.z);
        
        // Store this position as occupied
        this.occupiedPositions.push({
            x: position.x,
            z: position.z,
            userId: userId
        });

        // Enhanced idle animation with personality
        if (!this.isMobile) {
            this.addPersonalityIdleAnimation(avatarGroup, colorIndex);
        }

        this.scene.add(avatarGroup);
        this.avatars.set(userId, avatarGroup);

        console.log(`Created sophisticated crewmate for ${userData.username || userId}`);
        return avatarGroup;
    }

    getNonOverlappingPosition() {
        let attempts = 0;
        let position;
        
        do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 5;
            position = {
                x: Math.cos(angle) * radius,
                y: 0,
                z: Math.sin(angle) * radius
            };
            attempts++;
        } while (this.isPositionOccupied(position) && attempts < 50);
        
        // If we can't find a free spot after 50 attempts, use a grid position
        if (attempts >= 50) {
            position = this.getGridPosition();
        }
        
        return position;
    }

    isPositionOccupied(newPos) {
        return this.occupiedPositions.some(pos => {
            const distance = Math.sqrt(
                Math.pow(pos.x - newPos.x, 2) + 
                Math.pow(pos.z - newPos.z, 2)
            );
            return distance < this.minDistance;
        });
    }

    getGridPosition() {
        // Fallback grid positioning
        const gridSize = 3;
        const spacing = this.minDistance;
        const totalPositions = this.occupiedPositions.length;
        
        const row = Math.floor(totalPositions / gridSize);
        const col = totalPositions % gridSize;
        
        return {
            x: (col - gridSize/2) * spacing,
            y: 0,
            z: (row - gridSize/2) * spacing
        };
    }

    addPersonalityIdleAnimation(avatar, colorIndex) {
        const startY = avatar.position.y;
        let time = Math.random() * Math.PI * 2;
        
        // Different personalities based on color
        const personalities = [
            { speed: 0.015, bobAmount: 0.04, swayAmount: 0.08 }, // Calm
            { speed: 0.025, bobAmount: 0.06, swayAmount: 0.12 }, // Energetic
            { speed: 0.012, bobAmount: 0.03, swayAmount: 0.06 }, // Sleepy
            { speed: 0.020, bobAmount: 0.05, swayAmount: 0.10 }  // Normal
        ];
        
        const personality = personalities[colorIndex % personalities.length];
        
        const animate = () => {
            if (avatar.parent) {
                time += personality.speed;
                avatar.position.y = startY + Math.sin(time) * personality.bobAmount;
                avatar.rotation.y = Math.sin(time * 0.7) * personality.swayAmount;
                
                // Occasional head tilt
                if (Math.random() < 0.001) {
                    avatar.rotation.z = (Math.random() - 0.5) * 0.2;
                    setTimeout(() => {
                        avatar.rotation.z = 0;
                    }, 1000);
                }
                
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    removeAvatar(userId) {
        const avatar = this.avatars.get(userId);
        if (avatar && this.scene) {
            // Remove from occupied positions
            this.occupiedPositions = this.occupiedPositions.filter(pos => pos.userId !== userId);
            
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

    darkenColor(color, factor) {
        const r = Math.max(0, ((color >> 16) & 0xff) * (1 - factor));
        const g = Math.max(0, ((color >> 8) & 0xff) * (1 - factor));
        const b = Math.max(0, (color & 0xff) * (1 - factor));
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    updateAvatarPosition(userId, position) {
        const avatar = this.avatars.get(userId);
        if (avatar && position) {
            // Update occupied positions
            const occupiedIndex = this.occupiedPositions.findIndex(pos => pos.userId === userId);
            if (occupiedIndex !== -1) {
                this.occupiedPositions[occupiedIndex].x = position.x;
                this.occupiedPositions[occupiedIndex].z = position.z;
            }
            
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
        return this.getNonOverlappingPosition();
    }

    // Enhanced animations
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
        const duration = 1500;
        const startTime = Date.now();
        const originalRotation = { ...avatar.rotation };

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                avatar.rotation.z = originalRotation.z + Math.sin(progress * Math.PI * 3) * 0.25;
                avatar.rotation.x = originalRotation.x + Math.sin(progress * Math.PI * 6) * 0.1;
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.z = originalRotation.z;
                avatar.rotation.x = originalRotation.x;
            }
        };
        animate();
    }

    playDanceAnimation(avatar) {
        const startTime = Date.now();
        const duration = 3000;
        const startY = avatar.position.y;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                avatar.rotation.y = Math.sin(progress * Math.PI * 8) * 0.6;
                avatar.rotation.z = Math.sin(progress * Math.PI * 12) * 0.2;
                avatar.position.y = startY + Math.abs(Math.sin(progress * Math.PI * 16)) * 0.3;
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.y = 0;
                avatar.rotation.z = 0;
                avatar.position.y = startY;
            }
        };
        animate();
    }

    playJumpAnimation(avatar) {
        const startY = avatar.position.y;
        const duration = 1000;
        const height = 1.2;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                const jumpProgress = Math.sin(progress * Math.PI);
                avatar.position.y = startY + jumpProgress * height;
                avatar.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;
                requestAnimationFrame(animate);
            } else {
                avatar.position.y = startY;
                avatar.rotation.z = 0;
            }
        };
        animate();
    }

    dispose() {
        this.avatars.forEach((avatar, userId) => {
            this.removeAvatar(userId);
        });
        this.avatars.clear();
        this.occupiedPositions = [];
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

console.log('Sophisticated Avatar System with collision detection loaded');