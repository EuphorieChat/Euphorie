// Avatar System for Euphorie 3D - Ultra Detailed & Cute
class AvatarSystem {
    constructor() {
        this.scene = null;
        this.avatars = new Map();
        this.currentUserAvatar = null;
        this.isInitialized = false;
        this.isMobile = window.innerWidth <= 768;
        this.occupiedPositions = [];
        this.minDistance = 2.8;
    }

    init() {
        if (this.isInitialized) return true;
        
        this.scene = window.SceneManager?.scene || window.scene;
        
        if (!this.scene) {
            console.warn('Scene not available for avatar system');
            return false;
        }

        this.isInitialized = true;
        console.log('Ultra cute avatar system initialized');
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

        // Pastel cute color palette
        const cuteColors = [
            0xff6b9d, // Bubblegum Pink
            0x87ceeb, // Sky Blue  
            0x98fb98, // Mint Green
            0xdda0dd, // Plum Purple
            0xffd700, // Sunshine Yellow
            0xffa07a, // Light Salmon
            0x20b2aa, // Light Sea Green
            0xf0e68c, // Khaki
            0xee82ee, // Violet
            0xffc0cb, // Pink
            0xb0e0e6, // Powder Blue
            0xf5deb3  // Wheat
        ];
        
        const colorIndex = Math.abs(userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % cuteColors.length;
        const primaryColor = cuteColors[colorIndex];

        // Ultra soft materials
        const bodyMaterial = new THREE.MeshToonMaterial({ 
            color: primaryColor,
            transparent: true,
            opacity: 0.95
        });

        // Main body - extra rounded and cute
        const bodyGeometry = this.isMobile ? 
            new THREE.SphereGeometry(0.55, 20, 16) : 
            new THREE.SphereGeometry(0.55, 32, 24);
        
        // Make it even more bean-like and squishy
        const positions = bodyGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            // Create cute bulge at bottom
            const bulgeFactor = Math.max(0, -y + 0.2) * 0.15;
            positions.setX(i, x * (0.85 + bulgeFactor));
            positions.setZ(i, z * (0.8 + bulgeFactor));
            positions.setY(i, y * 1.5); // Taller
        }
        bodyGeometry.computeVertexNormals();
        
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        bodyMesh.position.y = 0.75;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        avatarGroup.add(bodyMesh);

        // Cute oversized visor
        const visorGeometry = this.isMobile ?
            new THREE.SphereGeometry(0.42, 16, 12) :
            new THREE.SphereGeometry(0.42, 24, 18);
        visorGeometry.scale(1.2, 0.9, 1.4);
        
        const visorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xb8e6ff,
            shininess: 100,
            transparent: true,
            opacity: 0.85,
            specular: 0x444444
        });
        const visorMesh = new THREE.Mesh(visorGeometry, visorMaterial);
        visorMesh.position.set(0, 1.25, 0.35);
        visorMesh.castShadow = true;
        avatarGroup.add(visorMesh);

        // Multiple cute reflection spots
        const reflections = [
            { pos: [-0.15, 1.3, 0.52], size: 0.12, color: 0xffffff, opacity: 0.9 },
            { pos: [0.08, 1.38, 0.48], size: 0.07, color: 0xffffff, opacity: 0.7 },
            { pos: [-0.05, 1.18, 0.55], size: 0.05, color: 0xe6f3ff, opacity: 0.6 },
            { pos: [0.12, 1.15, 0.5], size: 0.03, color: 0xffffff, opacity: 0.8 }
        ];
        
        reflections.forEach(reflection => {
            const reflectionGeometry = new THREE.SphereGeometry(reflection.size, 8, 6);
            const reflectionMaterial = new THREE.MeshBasicMaterial({ 
                color: reflection.color,
                transparent: true,
                opacity: reflection.opacity
            });
            const reflectionMesh = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
            reflectionMesh.position.set(...reflection.pos);
            avatarGroup.add(reflectionMesh);
        });

        // Add cute little antenna/horn (optional detail)
        if (Math.random() > 0.7) { // 30% chance
            const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.15, 8);
            const antennaMaterial = new THREE.MeshToonMaterial({ 
                color: this.darkenColor(primaryColor, 0.3)
            });
            const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.position.set(0, 1.5, 0);
            avatarGroup.add(antenna);

            // Little ball on top
            const ballGeometry = new THREE.SphereGeometry(0.04, 8, 6);
            const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const ball = new THREE.Mesh(ballGeometry, ballMaterial);
            ball.position.set(0, 1.58, 0);
            avatarGroup.add(ball);
        }

        // Enhanced backpack with cute details
        if (!this.isMobile) {
            const backpackGeometry = new THREE.BoxGeometry(0.32, 0.45, 0.18);
            // Round the corners
            const backpackMaterial = new THREE.MeshToonMaterial({ 
                color: this.darkenColor(primaryColor, 0.35)
            });
            const backpackMesh = new THREE.Mesh(backpackGeometry, backpackMaterial);
            backpackMesh.position.set(0, 0.9, -0.42);
            backpackMesh.castShadow = true;
            avatarGroup.add(backpackMesh);

            // Cute backpack details - little pockets
            const pocketGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.05);
            const pocketMaterial = new THREE.MeshToonMaterial({ 
                color: this.darkenColor(primaryColor, 0.5)
            });
            const pocket = new THREE.Mesh(pocketGeometry, pocketMaterial);
            pocket.position.set(0, 0.8, -0.32);
            avatarGroup.add(pocket);

            // Backpack straps with more detail
            const strapGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8);
            const strapMaterial = new THREE.MeshToonMaterial({ 
                color: this.darkenColor(primaryColor, 0.6)
            });
            
            [-0.12, 0.12].forEach(x => {
                const strap = new THREE.Mesh(strapGeometry, strapMaterial);
                strap.position.set(x, 1.0, -0.28);
                strap.rotation.x = 0.25;
                avatarGroup.add(strap);
            });

            // Stubby cute legs
            const legGeometry = new THREE.CylinderGeometry(0.14, 0.18, 0.4, 12);
            const legMaterial = new THREE.MeshToonMaterial({ 
                color: primaryColor,
                transparent: true,
                opacity: 0.95
            });
            
            [-0.16, 0.16].forEach(x => {
                const leg = new THREE.Mesh(legGeometry, legMaterial);
                leg.position.set(x, 0.2, 0);
                leg.castShadow = true;
                avatarGroup.add(leg);
            });
        }

        // Extra cute rounded feet
        const footGeometry = this.isMobile ?
            new THREE.SphereGeometry(0.22, 12, 10) :
            new THREE.SphereGeometry(0.24, 16, 12);
        footGeometry.scale(1.4, 0.7, 1.2);
        
        const footMaterial = new THREE.MeshToonMaterial({ 
            color: this.darkenColor(primaryColor, 0.25),
            transparent: true,
            opacity: 0.95
        });
        
        [-0.16, 0.16].forEach(x => {
            const foot = new THREE.Mesh(footGeometry, footMaterial);
            foot.position.set(x, 0.12, 0.1);
            foot.castShadow = true;
            foot.receiveShadow = true;
            avatarGroup.add(foot);
        });

        // Cute little arms (sometimes visible)
        if (!this.isMobile && Math.random() > 0.5) {
            const armGeometry = new THREE.SphereGeometry(0.08, 8, 6);
            armGeometry.scale(2, 1, 0.8);
            const armMaterial = new THREE.MeshToonMaterial({ 
                color: primaryColor,
                transparent: true,
                opacity: 0.9
            });
            
            [-0.45, 0.45].forEach((x, index) => {
                const arm = new THREE.Mesh(armGeometry, armMaterial);
                arm.position.set(x, 0.9, 0);
                arm.rotation.z = index === 0 ? 0.3 : -0.3;
                avatarGroup.add(arm);
            });
        }

        // Floating cute particles around avatar
        this.addCuteParticles(avatarGroup, primaryColor);

        // Get non-overlapping position
        const position = userData.position || this.getNonOverlappingPosition();
        avatarGroup.position.set(position.x, position.y || 0, position.z);
        
        this.occupiedPositions.push({
            x: position.x,
            z: position.z,
            userId: userId
        });

        // Extra cute idle animation
        if (!this.isMobile) {
            this.addUltraCuteIdleAnimation(avatarGroup, colorIndex);
        }

        this.scene.add(avatarGroup);
        this.avatars.set(userId, avatarGroup);

        console.log(`Created ultra cute crewmate for ${userData.username || userId}`);
        return avatarGroup;
    }

    addCuteParticles(avatarGroup, color) {
        // Create floating heart/star particles
        const particleCount = this.isMobile ? 3 : 5;
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.02, 6, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: this.lightenColor(color, 0.3),
                transparent: true,
                opacity: 0.6
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Random position around avatar
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.8 + Math.random() * 0.4;
            particle.position.set(
                Math.cos(angle) * radius,
                1.5 + Math.random() * 0.5,
                Math.sin(angle) * radius
            );
            
            // Animate particles
            particle.userData = {
                originalY: particle.position.y,
                floatSpeed: 0.01 + Math.random() * 0.01,
                floatOffset: Math.random() * Math.PI * 2
            };
            
            avatarGroup.add(particle);
        }
    }

    addUltraCuteIdleAnimation(avatar, colorIndex) {
        const startY = avatar.position.y;
        let time = Math.random() * Math.PI * 2;
        
        const cutePersonalities = [
            { speed: 0.018, bobAmount: 0.06, swayAmount: 0.12, bouncy: true },
            { speed: 0.022, bobAmount: 0.04, swayAmount: 0.08, gentle: true },
            { speed: 0.015, bobAmount: 0.08, swayAmount: 0.15, energetic: true },
            { speed: 0.020, bobAmount: 0.05, swayAmount: 0.10, calm: true }
        ];
        
        const personality = cutePersonalities[colorIndex % cutePersonalities.length];
        
        const animate = () => {
            if (avatar.parent) {
                time += personality.speed;
                
                // Main body movement
                avatar.position.y = startY + Math.sin(time) * personality.bobAmount;
                avatar.rotation.y = Math.sin(time * 0.6) * personality.swayAmount;
                
                // Animate particles
                avatar.children.forEach(child => {
                    if (child.userData && child.userData.floatSpeed) {
                        child.userData.floatOffset += child.userData.floatSpeed;
                        child.position.y = child.userData.originalY + Math.sin(child.userData.floatOffset) * 0.1;
                        child.rotation.y += 0.02;
                    }
                });
                
                // Occasional cute head tilt
                if (Math.random() < 0.002) {
                    avatar.rotation.z = (Math.random() - 0.5) * 0.3;
                    setTimeout(() => {
                        avatar.rotation.z = 0;
                    }, 1500);
                }
                
                // Very rare happy bounce
                if (Math.random() < 0.0005) {
                    this.playHappyBounce(avatar);
                }
                
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    playHappyBounce(avatar) {
        const startY = avatar.position.y;
        let bounceTime = 0;
        
        const bounce = () => {
            bounceTime += 0.15;
            if (bounceTime <= Math.PI) {
                avatar.position.y = startY + Math.sin(bounceTime) * 0.3;
                avatar.rotation.z = Math.sin(bounceTime * 2) * 0.2;
                requestAnimationFrame(bounce);
            } else {
                avatar.position.y = startY;
                avatar.rotation.z = 0;
            }
        };
        bounce();
    }

    lightenColor(color, factor) {
        const r = Math.min(255, ((color >> 16) & 0xff) + (255 - ((color >> 16) & 0xff)) * factor);
        const g = Math.min(255, ((color >> 8) & 0xff) + (255 - ((color >> 8) & 0xff)) * factor);
        const b = Math.min(255, (color & 0xff) + (255 - (color & 0xff)) * factor);
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    darkenColor(color, factor) {
        const r = Math.max(0, ((color >> 16) & 0xff) * (1 - factor));
        const g = Math.max(0, ((color >> 8) & 0xff) * (1 - factor));
        const b = Math.max(0, (color & 0xff) * (1 - factor));
        return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
    }

    getNonOverlappingPosition() {
        let attempts = 0;
        let position;
        
        do {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3.5 + Math.random() * 4;
            position = {
                x: Math.cos(angle) * radius,
                y: 0,
                z: Math.sin(angle) * radius
            };
            attempts++;
        } while (this.isPositionOccupied(position) && attempts < 50);
        
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
        const gridSize = 4;
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

    removeAvatar(userId) {
        const avatar = this.avatars.get(userId);
        if (avatar && this.scene) {
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

    updateAvatarPosition(userId, position) {
        const avatar = this.avatars.get(userId);
        if (avatar && position) {
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

    animateAvatar(userId, animationType) {
        const avatar = this.avatars.get(userId);
        if (!avatar) return;

        switch (animationType) {
            case 'wave':
                this.playCuteWave(avatar);
                break;
            case 'dance':
                this.playCuteDance(avatar);
                break;
            case 'jump':
                this.playCuteJump(avatar);
                break;
        }
    }

    playCuteWave(avatar) {
        const duration = 2000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                avatar.rotation.z = Math.sin(progress * Math.PI * 4) * 0.3;
                avatar.position.y += Math.sin(progress * Math.PI * 8) * 0.02;
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.z = 0;
            }
        };
        animate();
    }

    playCuteDance(avatar) {
        const startTime = Date.now();
        const duration = 4000;
        const startY = avatar.position.y;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                avatar.rotation.y = Math.sin(progress * Math.PI * 10) * 0.7;
                avatar.rotation.z = Math.sin(progress * Math.PI * 16) * 0.25;
                avatar.position.y = startY + Math.abs(Math.sin(progress * Math.PI * 20)) * 0.4;
                avatar.scale.setScalar(1 + Math.sin(progress * Math.PI * 12) * 0.05);
                requestAnimationFrame(animate);
            } else {
                avatar.rotation.y = 0;
                avatar.rotation.z = 0;
                avatar.position.y = startY;
                avatar.scale.setScalar(1);
            }
        };
        animate();
    }

    playCuteJump(avatar) {
        const startY = avatar.position.y;
        const duration = 1200;
        const height = 1.5;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                const jumpProgress = Math.sin(progress * Math.PI);
                avatar.position.y = startY + jumpProgress * height;
                avatar.scale.y = 1 + jumpProgress * 0.1;
                avatar.rotation.z = Math.sin(progress * Math.PI * 3) * 0.15;
                requestAnimationFrame(animate);
            } else {
                avatar.position.y = startY;
                avatar.scale.y = 1;
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

console.log('Ultra cute detailed avatar system loaded');