// Group Interaction System - Synchronized activities and formations

window.GroupInteractionSystem = {
    isInitialized: false,
    activeGroups: new Map(),
    groupFormations: {
        circle: {
            name: 'Circle Formation',
            minParticipants: 3,
            maxParticipants: 8,
            radius: 3,
            activities: ['group_dance', 'storytelling', 'meditation']
        },
        line: {
            name: 'Line Formation',
            minParticipants: 2,
            maxParticipants: 10,
            spacing: 1.5,
            activities: ['conga_line', 'march', 'wave_sequence']
        },
        huddle: {
            name: 'Huddle Formation',
            minParticipants: 3,
            maxParticipants: 6,
            radius: 1.5,
            activities: ['team_cheer', 'group_hug', 'secret_meeting']
        },
        dance_floor: {
            name: 'Dance Floor',
            minParticipants: 2,
            maxParticipants: 12,
            area: { width: 6, height: 6 },
            activities: ['free_dance', 'synchronized_dance', 'dance_battle']
        }
    },
    
    groupActivities: {
        group_dance: {
            name: 'Group Dance',
            duration: 15000,
            emoji: '💃',
            formation: 'circle',
            syncRequired: true,
            animations: ['dance_sync_1', 'dance_sync_2', 'dance_sync_3'],
            effects: ['music_notes', 'celebration']
        },
        conga_line: {
            name: 'Conga Line',
            duration: 10000,
            emoji: '🎵',
            formation: 'line',
            syncRequired: true,
            animations: ['conga_step'],
            effects: ['rhythm_trail']
        },
        team_cheer: {
            name: 'Team Cheer',
            duration: 8000,
            emoji: '🎉',
            formation: 'huddle',
            syncRequired: true,
            animations: ['cheer_up', 'cheer_clap'],
            effects: ['celebration', 'sparkle']
        },
        group_hug: {
            name: 'Group Hug',
            duration: 6000,
            emoji: '🤗',
            formation: 'huddle',
            syncRequired: false,
            animations: ['hug_together'],
            effects: ['hearts', 'connection']
        },
        meditation: {
            name: 'Meditation Circle',
            duration: 20000,
            emoji: '🧘',
            formation: 'circle',
            syncRequired: true,
            animations: ['meditation_pose'],
            effects: ['zen_aura', 'peaceful_sparkles']
        },
        wave_sequence: {
            name: 'Mexican Wave',
            duration: 12000,
            emoji: '🌊',
            formation: 'line',
            syncRequired: true,
            animations: ['wave_up', 'wave_down'],
            effects: ['wave_trail']
        },
        dance_battle: {
            name: 'Dance Battle',
            duration: 18000,
            emoji: '⚡',
            formation: 'dance_floor',
            syncRequired: false,
            animations: ['battle_dance_1', 'battle_dance_2'],
            effects: ['competition_sparks', 'energy_burst']
        }
    },
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('👥 Initializing Group Interaction System');
        
        this.isInitialized = true;
        
        // Listen for interaction events
        if (window.EventBus) {
            window.EventBus.on('avatar:created', (data) => {
                this.checkForAutoGroup(data.id);
            });
            
            window.EventBus.on('interaction:complete', (data) => {
                this.onInteractionComplete(data);
            });
        }
        
        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        console.log('✅ Group Interaction System initialized');
    },
    
    setupKeyboardShortcuts: function() {
        document.addEventListener('keydown', (event) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(event.key.toLowerCase()) {
                case 'g':
                    if (event.ctrlKey || event.metaKey) return;
                    this.showGroupActivityMenu();
                    break;
                case '3':
                    this.initiateQuickGroup('group_dance');
                    break;
                case '4':
                    this.initiateQuickGroup('team_cheer');
                    break;
            }
        });
    },
    
    showGroupActivityMenu: function() {
        // Remove existing menu
        const existingMenu = document.getElementById('group-activity-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }
        
        // Get available avatars
        const avatars = window.AvatarSystem.getAllAvatars().filter(avatar => 
            avatar.id !== 'default' && !this.isAvatarInGroup(avatar.id)
        );
        
        if (avatars.length < 1) {
            if (window.RoomCore) {
                window.RoomCore.showNotification('👥 Need more people for group activities!');
            }
            return;
        }
        
        // Create group activity menu
        const menu = document.createElement('div');
        menu.id = 'group-activity-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            z-index: 1000;
            color: white;
            min-width: 350px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        
        menu.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 15px; text-align: center;">👥 Start Group Activity</h3>
            
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <strong>Available Participants: ${avatars.length + 1}</strong><br>
                <small style="opacity: 0.7;">You + ${avatars.map(a => a.customization.name).join(', ')}</small>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 15px;">
                ${Object.entries(this.groupActivities).map(([key, activity]) => {
                    const formation = this.groupFormations[activity.formation];
                    const canStart = avatars.length + 1 >= formation.minParticipants;
                    
                    return `
                        <button 
                            onclick="window.GroupInteractionSystem.initiateGroupActivity('${key}')"
                            style="
                                padding: 15px;
                                background: ${canStart ? 'rgba(76, 175, 80, 0.2)' : 'rgba(128, 128, 128, 0.2)'};
                                border: 1px solid ${canStart ? 'rgba(76, 175, 80, 0.4)' : 'rgba(128, 128, 128, 0.4)'};
                                border-radius: 8px;
                                color: white;
                                cursor: ${canStart ? 'pointer' : 'not-allowed'};
                                text-align: left;
                                transition: all 0.3s ease;
                                ${canStart ? '' : 'opacity: 0.6;'}
                            "
                            ${canStart ? `
                                onmouseover="this.style.background='rgba(76, 175, 80, 0.3)'"
                                onmouseout="this.style.background='rgba(76, 175, 80, 0.2)'"
                            ` : 'disabled'}
                        >
                            <div style="font-weight: bold; margin-bottom: 5px;">
                                ${activity.emoji} ${activity.name}
                            </div>
                            <div style="font-size: 12px; opacity: 0.8;">
                                ${formation.name} • ${formation.minParticipants}-${formation.maxParticipants} people
                                ${!canStart ? `<br><span style="color: #ff6b6b;">Need ${formation.minParticipants - avatars.length - 1} more participant(s)</span>` : ''}
                            </div>
                        </button>
                    `;
                }).join('')}
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button 
                    onclick="window.GroupInteractionSystem.autoFormGroup()"
                    style="
                        flex: 1;
                        padding: 12px;
                        background: #2196F3;
                        border: none;
                        border-radius: 6px;
                        color: white;
                        cursor: pointer;
                        font-weight: bold;
                    "
                >
                    🎲 Auto-Form Group
                </button>
                <button 
                    onclick="document.getElementById('group-activity-menu').remove()"
                    style="
                        flex: 1;
                        padding: 12px;
                        background: #666;
                        border: none;
                        border-radius: 6px;
                        color: white;
                        cursor: pointer;
                    "
                >
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Auto-close after 20 seconds
        setTimeout(() => {
            if (document.getElementById('group-activity-menu')) {
                menu.remove();
            }
        }, 20000);
    },
    
    initiateGroupActivity: function(activityKey) {
        const activity = this.groupActivities[activityKey];
        const formation = this.groupFormations[activity.formation];
        
        if (!activity || !formation) {
            console.error('Invalid activity or formation:', activityKey);
            return;
        }
        
        // Close menu
        const menu = document.getElementById('group-activity-menu');
        if (menu) menu.remove();
        
        // Get available avatars
        const availableAvatars = window.AvatarSystem.getAllAvatars().filter(avatar => 
            !this.isAvatarInGroup(avatar.id)
        );
        
        if (availableAvatars.length < formation.minParticipants) {
            if (window.RoomCore) {
                window.RoomCore.showNotification(`👥 Need at least ${formation.minParticipants} participants for ${activity.name}!`);
            }
            return;
        }
        
        // Select participants (limit to max)
        const participants = availableAvatars.slice(0, formation.maxParticipants);
        
        // Create group
        const group = this.createGroup(participants.map(a => a.id), activityKey);
        
        if (group) {
            if (window.RoomCore) {
                window.RoomCore.showNotification(`🎉 ${activity.name} started with ${participants.length} participants!`);
            }
        }
    },
    
    initiateQuickGroup: function(activityKey) {
        // Quick group formation for keyboard shortcuts
        this.initiateGroupActivity(activityKey);
    },
    
    autoFormGroup: function() {
        // Close menu
        const menu = document.getElementById('group-activity-menu');
        if (menu) menu.remove();
        
        // Get available avatars
        const availableAvatars = window.AvatarSystem.getAllAvatars().filter(avatar => 
            !this.isAvatarInGroup(avatar.id)
        );
        
        if (availableAvatars.length < 2) {
            if (window.RoomCore) {
                window.RoomCore.showNotification('👥 Need more people for group activities!');
            }
            return;
        }
        
        // Choose random activity that fits the group size
        const suitableActivities = Object.entries(this.groupActivities).filter(([key, activity]) => {
            const formation = this.groupFormations[activity.formation];
            return availableAvatars.length >= formation.minParticipants;
        });
        
        if (suitableActivities.length === 0) {
            if (window.RoomCore) {
                window.RoomCore.showNotification('👥 No suitable activities for current group size!');
            }
            return;
        }
        
        const [randomActivityKey] = suitableActivities[Math.floor(Math.random() * suitableActivities.length)];
        this.initiateGroupActivity(randomActivityKey);
    },
    
    createGroup: function(participantIds, activityKey) {
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const activity = this.groupActivities[activityKey];
        const formation = this.groupFormations[activity.formation];
        
        // Get participant avatars
        const participants = participantIds.map(id => window.AvatarSystem.getAvatar(id)).filter(Boolean);
        
        if (participants.length < formation.minParticipants) {
            console.error('Not enough participants for group activity');
            return null;
        }
        
        // Calculate formation positions
        const positions = this.calculateFormationPositions(formation, participants.length);
        
        // Create group data
        const groupData = {
            id: groupId,
            activityKey: activityKey,
            activity: activity,
            formation: formation,
            participants: participants.map(p => p.id),
            positions: positions,
            startTime: Date.now(),
            endTime: Date.now() + activity.duration,
            isActive: true,
            currentPhase: 'forming',
            syncTimer: 0
        };
        
        // Store group
        this.activeGroups.set(groupId, groupData);
        
        // Start group activity
        this.startGroupActivity(groupData);
        
        console.log(`👥 Created group ${groupId} for ${activity.name} with ${participants.length} participants`);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('group:created', groupData);
        }
        
        return groupData;
    },
    
    calculateFormationPositions: function(formation, participantCount) {
        const positions = [];
        const centerX = 0;
        const centerZ = 0;
        
        switch(formation.name) {
            case 'Circle Formation':
                const radius = formation.radius;
                const angleStep = (Math.PI * 2) / participantCount;
                
                for (let i = 0; i < participantCount; i++) {
                    const angle = i * angleStep;
                    positions.push({
                        x: centerX + Math.cos(angle) * radius,
                        y: 0,
                        z: centerZ + Math.sin(angle) * radius,
                        rotation: angle + Math.PI // Face inward
                    });
                }
                break;
                
            case 'Line Formation':
                const spacing = formation.spacing;
                const startX = centerX - (participantCount - 1) * spacing / 2;
                
                for (let i = 0; i < participantCount; i++) {
                    positions.push({
                        x: startX + i * spacing,
                        y: 0,
                        z: centerZ,
                        rotation: 0 // Face forward
                    });
                }
                break;
                
            case 'Huddle Formation':
                const huddleRadius = formation.radius;
                const huddleAngleStep = (Math.PI * 2) / participantCount;
                
                for (let i = 0; i < participantCount; i++) {
                    const angle = i * huddleAngleStep;
                    positions.push({
                        x: centerX + Math.cos(angle) * huddleRadius,
                        y: 0,
                        z: centerZ + Math.sin(angle) * huddleRadius,
                        rotation: angle + Math.PI // Face center
                    });
                }
                break;
                
            case 'Dance Floor':
                const area = formation.area;
                const cols = Math.ceil(Math.sqrt(participantCount));
                const rows = Math.ceil(participantCount / cols);
                const spacingX = area.width / (cols + 1);
                const spacingZ = area.height / (rows + 1);
                
                for (let i = 0; i < participantCount; i++) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    
                    positions.push({
                        x: centerX - area.width/2 + (col + 1) * spacingX,
                        y: 0,
                        z: centerZ - area.height/2 + (row + 1) * spacingZ,
                        rotation: Math.random() * Math.PI * 2 // Random facing
                    });
                }
                break;
                
            default:
                // Default to circle
                return this.calculateFormationPositions(this.groupFormations.circle, participantCount);
        }
        
        return positions;
    },
    
    startGroupActivity: function(groupData) {
        // Move participants to formation positions
        this.moveParticipantsToFormation(groupData);
        
        // Start activity timer
        this.startActivityTimer(groupData);
        
        // Create formation visual effect
        this.createFormationEffect(groupData);
        
        console.log(`🎬 Starting ${groupData.activity.name} for group ${groupData.id}`);
    },
    
    moveParticipantsToFormation: function(groupData) {
        groupData.participants.forEach((participantId, index) => {
            const avatar = window.AvatarSystem.getAvatar(participantId);
            const targetPosition = groupData.positions[index];
            
            if (avatar && targetPosition) {
                // Store original position for restoration
                avatar.originalPosition = avatar.group.position.clone();
                
                // Animate to formation position
                this.animateAvatarToPosition(avatar, targetPosition, 2000);
            }
        });
        
        // Set phase to moving
        groupData.currentPhase = 'moving';
        
        // Start activity after movement completes
        setTimeout(() => {
            if (this.activeGroups.has(groupData.id)) {
                groupData.currentPhase = 'active';
                this.executeGroupActivity(groupData);
            }
        }, 2500);
    },
    
    animateAvatarToPosition: function(avatar, targetPosition, duration) {
        const startPosition = avatar.group.position.clone();
        const startRotation = avatar.group.rotation.clone();
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);
            
            // Interpolate position
            avatar.group.position.lerpVectors(startPosition, 
                new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z), 
                easeProgress
            );
            
            // Interpolate rotation
            const targetRotationY = targetPosition.rotation || 0;
            avatar.group.rotation.y = startRotation.y + (targetRotationY - startRotation.y) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    },
    
    executeGroupActivity: function(groupData) {
        const activity = groupData.activity;
        
        console.log(`🎭 Executing ${activity.name} for group ${groupData.id}`);
        
        // Start synchronized animations
        if (activity.syncRequired) {
            this.startSynchronizedAnimation(groupData);
        } else {
            this.startIndividualAnimations(groupData);
        }
        
        // Create activity effects
        this.createActivityEffects(groupData);
        
        // Start activity-specific behavior
        switch(groupData.activityKey) {
            case 'group_dance':
                this.executeGroupDance(groupData);
                break;
            case 'conga_line':
                this.executeCongaLine(groupData);
                break;
            case 'team_cheer':
                this.executeTeamCheer(groupData);
                break;
            case 'meditation':
                this.executeMeditation(groupData);
                break;
            case 'wave_sequence':
                this.executeWaveSequence(groupData);
                break;
            case 'dance_battle':
                this.executeDanceBattle(groupData);
                break;
            case 'group_hug':
                this.executeGroupHug(groupData);
                break;
        }
    },
    
    startSynchronizedAnimation: function(groupData) {
        const activity = groupData.activity;
        let animationIndex = 0;
        
        const syncLoop = () => {
            if (!this.activeGroups.has(groupData.id) || groupData.currentPhase !== 'active') return;
            
            const currentAnimation = activity.animations[animationIndex % activity.animations.length];
            
            // Apply animation to all participants
            groupData.participants.forEach(participantId => {
                const avatar = window.AvatarSystem.getAvatar(participantId);
                if (avatar) {
                    this.applyAnimationToAvatar(avatar, currentAnimation, groupData.syncTimer);
                }
            });
            
            groupData.syncTimer += 0.1;
            animationIndex = Math.floor(groupData.syncTimer / 2); // Change animation every 2 seconds
            
            // Continue loop
            setTimeout(syncLoop, 100);
        };
        
        syncLoop();
    },
    
    startIndividualAnimations: function(groupData) {
        const activity = groupData.activity;
        
        groupData.participants.forEach((participantId, index) => {
            const avatar = window.AvatarSystem.getAvatar(participantId);
            if (avatar) {
                const animationKey = activity.animations[index % activity.animations.length];
                this.applyAnimationToAvatar(avatar, animationKey, 0);
            }
        });
    },
    
    applyAnimationToAvatar: function(avatar, animationKey, timer) {
        const animationParts = avatar.mesh.children || [avatar.mesh];
        
        switch(animationKey) {
            case 'dance_sync_1':
                this.applyDanceSyncAnimation(avatar, timer, 1);
                break;
            case 'dance_sync_2':
                this.applyDanceSyncAnimation(avatar, timer, 2);
                break;
            case 'dance_sync_3':
                this.applyDanceSyncAnimation(avatar, timer, 3);
                break;
            case 'conga_step':
                this.applyCongaStepAnimation(avatar, timer);
                break;
            case 'cheer_up':
                this.applyCheerAnimation(avatar, timer, 'up');
                break;
            case 'cheer_clap':
                this.applyCheerAnimation(avatar, timer, 'clap');
                break;
            case 'meditation_pose':
                this.applyMeditationAnimation(avatar, timer);
                break;
            case 'wave_up':
                this.applyWaveAnimation(avatar, timer, 'up');
                break;
            case 'wave_down':
                this.applyWaveAnimation(avatar, timer, 'down');
                break;
            case 'battle_dance_1':
                this.applyBattleDanceAnimation(avatar, timer, 1);
                break;
            case 'battle_dance_2':
                this.applyBattleDanceAnimation(avatar, timer, 2);
                break;
            case 'hug_together':
                this.applyGroupHugAnimation(avatar, timer);
                break;
        }
    },
    
    applyDanceSyncAnimation: function(avatar, timer, style) {
        const baseFreq = 2;
        const freq = baseFreq * style;
        
        // Synchronized dancing with different styles
        avatar.group.position.y = Math.abs(Math.sin(timer * freq)) * 0.3;
        avatar.group.rotation.y += Math.sin(timer * freq * 0.5) * 0.1;
        
        // Style-specific movements
        switch(style) {
            case 1: // Gentle sway
                avatar.group.position.x += Math.sin(timer * freq * 0.3) * 0.05;
                break;
            case 2: // Energetic bounce
                avatar.group.position.y += Math.abs(Math.sin(timer * freq * 2)) * 0.2;
                avatar.group.rotation.z = Math.sin(timer * freq) * 0.2;
                break;
            case 3: // Spin moves
                avatar.group.rotation.y += 0.05;
                avatar.group.position.x += Math.cos(timer * freq) * 0.1;
                avatar.group.position.z += Math.sin(timer * freq) * 0.1;
                break;
        }
    },
    
    applyCongaStepAnimation: function(avatar, timer) {
        // Conga line stepping motion
        const step = Math.sin(timer * 4);
        avatar.group.position.y = Math.abs(step) * 0.15;
        avatar.group.position.z += step * 0.01; // Move forward
        
        // Arm movements (if available)
        avatar.mesh.children.forEach(child => {
            if (Math.abs(child.position.x) > 0.3) { // Arms
                child.rotation.z = Math.sin(timer * 4 + (child.position.x > 0 ? 0 : Math.PI)) * 0.3;
            }
        });
    },
    
    applyCheerAnimation: function(avatar, timer, type) {
        if (type === 'up') {
            // Jumping cheer
            avatar.group.position.y = Math.abs(Math.sin(timer * 3)) * 0.5;
            
            // Arms up
            avatar.mesh.children.forEach(child => {
                if (Math.abs(child.position.x) > 0.3) {
                    child.rotation.z = (child.position.x > 0 ? -1 : 1) * Math.PI * 0.25;
                }
            });
        } else if (type === 'clap') {
            // Clapping motion
            const clap = Math.sin(timer * 6);
            avatar.mesh.children.forEach(child => {
                if (Math.abs(child.position.x) > 0.3) {
                    child.rotation.z = clap * 0.5 * (child.position.x > 0 ? -1 : 1);
                }
            });
        }
    },
    
    applyMeditationAnimation: function(avatar, timer) {
        // Peaceful breathing
        const breath = Math.sin(timer * 0.5) * 0.02;
        avatar.mesh.scale.setScalar(1 + breath);
        
        // Slight floating
        avatar.group.position.y = Math.sin(timer * 0.3) * 0.05;
    },
    
    applyWaveAnimation: function(avatar, timer, direction) {
        const wave = Math.sin(timer * 4);
        
        if (direction === 'up') {
            avatar.group.position.y = Math.max(0, wave) * 0.4;
            // Arms up during wave
            avatar.mesh.children.forEach(child => {
                if (Math.abs(child.position.x) > 0.3) {
                    child.rotation.z = Math.max(0, wave) * 0.5 * (child.position.x > 0 ? -1 : 1);
                }
            });
        } else {
            avatar.group.position.y = Math.max(0, -wave) * 0.4;
        }
    },
    
    applyBattleDanceAnimation: function(avatar, timer, style) {
        // Competitive dance moves
        if (style === 1) {
            // Breakdance style
            avatar.group.rotation.y += 0.1;
            avatar.group.position.y = Math.abs(Math.sin(timer * 5)) * 0.3;
            avatar.group.rotation.z = Math.sin(timer * 3) * 0.3;
        } else {
            // Hip-hop style
            avatar.group.position.x += Math.sin(timer * 3) * 0.1;
            avatar.group.position.y = Math.abs(Math.sin(timer * 4)) * 0.2;
            avatar.group.rotation.y += Math.sin(timer * 2) * 0.05;
        }
    },
    
    applyGroupHugAnimation: function(avatar, timer) {
        // Gentle swaying hug motion
        const sway = Math.sin(timer * 1.5) * 0.1;
        avatar.group.position.x += sway * 0.5;
        avatar.group.rotation.y += sway * 0.2;
        
        // Bring arms together
        avatar.mesh.children.forEach(child => {
            if (Math.abs(child.position.x) > 0.3) {
                child.rotation.z = 0.5 * (child.position.x > 0 ? -1 : 1);
            }
        });
    },
    
    executeGroupDance: function(groupData) {
        // Create dance floor effect
        this.createDanceFloorEffect(groupData);
        
        // Cycle through different dance styles
        let styleIndex = 0;
        const styleInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id)) {
                clearInterval(styleInterval);
                return;
            }
            
            styleIndex = (styleIndex + 1) % 3;
            console.log(`💃 Switching to dance style ${styleIndex + 1}`);
        }, 5000);
    },
    
    executeCongaLine: function(groupData) {
        // Move the line forward gradually
        let position = 0;
        const moveInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id)) {
                clearInterval(moveInterval);
                return;
            }
            
            position += 0.1;
            groupData.participants.forEach((participantId, index) => {
                const avatar = window.AvatarSystem.getAvatar(participantId);
                if (avatar) {
                    avatar.group.position.z += 0.01;
                }
            });
        }, 100);
    },
    
    executeTeamCheer: function(groupData) {
        // Synchronized cheering with countdown
        const phases = ['Ready!', 'Set!', 'Cheer!'];
        let phaseIndex = 0;
        
        const cheerInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id) || phaseIndex >= phases.length) {
                clearInterval(cheerInterval);
                return;
            }
            
            if (window.RoomCore) {
                window.RoomCore.showNotification(`📣 ${phases[phaseIndex]}`);
            }
            
            phaseIndex++;
        }, 2000);
    },
    
    executeMeditation: function(groupData) {
        // Create peaceful meditation aura
        this.createMeditationAura(groupData);
        
        // Gentle notification reminders
        setTimeout(() => {
            if (this.activeGroups.has(groupData.id) && window.RoomCore) {
                window.RoomCore.showNotification('🧘 Focus on your breathing...');
            }
        }, 5000);
        
        setTimeout(() => {
            if (this.activeGroups.has(groupData.id) && window.RoomCore) {
                window.RoomCore.showNotification('🧘 Feel the peace and connection...');
            }
        }, 12000);
    },
    
    executeWaveSequence: function(groupData) {
        // Sequential wave effect
        let currentWaver = 0;
        const waveInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id)) {
                clearInterval(waveInterval);
                return;
            }
            
            // Trigger wave for current participant
            const participantId = groupData.participants[currentWaver];
            const avatar = window.AvatarSystem.getAvatar(participantId);
            
            if (avatar) {
                // Create individual wave effect
                this.createWaveEffect(avatar);
            }
            
            currentWaver = (currentWaver + 1) % groupData.participants.length;
        }, 500);
    },
    
    executeDanceBattle: function(groupData) {
        // Split into competing teams
        const team1 = groupData.participants.slice(0, Math.ceil(groupData.participants.length / 2));
        const team2 = groupData.participants.slice(Math.ceil(groupData.participants.length / 2));
        
        // Alternate team performances
        let currentTeam = 1;
        const battleInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id)) {
                clearInterval(battleInterval);
                return;
            }
            
            if (window.RoomCore) {
                window.RoomCore.showNotification(`⚡ Team ${currentTeam} is dancing!`);
            }
            
            currentTeam = currentTeam === 1 ? 2 : 1;
        }, 4000);
    },
    
    executeGroupHug: function(groupData) {
        // Create heart effects around the group
        setTimeout(() => {
            groupData.participants.forEach(participantId => {
                const avatar = window.AvatarSystem.getAvatar(participantId);
                if (avatar && window.InteractionSystem) {
                    window.InteractionSystem.createParticleEffect(avatar, 'hearts');
                }
            });
        }, 1000);
    },
    
    createFormationEffect: function(groupData) {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        const formation = groupData.formation;
        
        // Create formation outline
        if (formation.name === 'Circle Formation') {
            this.createCircleFormationEffect(groupData);
        } else if (formation.name === 'Line Formation') {
            this.createLineFormationEffect(groupData);
        }
    },
    
    createCircleFormationEffect: function(groupData) {
        const radius = groupData.formation.radius;
        
        // Create glowing circle outline
        const circleGeometry = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff88,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const circle = new THREE.Mesh(circleGeometry, circleMaterial);
        circle.rotation.x = -Math.PI / 2;
        circle.position.y = 0.05;
        
        window.SceneManager.addObject(circle);
        
        // Animate circle
        let phase = 0;
        const animateInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id)) {
                clearInterval(animateInterval);
                window.SceneManager.removeObject(circle);
                return;
            }
            
            phase += 0.1;
            circle.material.opacity = 0.4 + Math.sin(phase) * 0.2;
            circle.rotation.z += 0.01;
        }, 50);
    },
    
    createLineFormationEffect: function(groupData) {
        const spacing = groupData.formation.spacing;
        const length = (groupData.participants.length - 1) * spacing;
        
        // Create line effect
        const lineGeometry = new THREE.PlaneGeometry(length + 1, 0.2);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.5
        });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.y = 0.05;
        
        window.SceneManager.addObject(line);
        
        // Remove after activity
        setTimeout(() => {
            window.SceneManager.removeObject(line);
        }, groupData.activity.duration);
    },
    
    createActivityEffects: function(groupData) {
        const activity = groupData.activity;
        
        activity.effects.forEach(effectType => {
            groupData.participants.forEach(participantId => {
                const avatar = window.AvatarSystem.getAvatar(participantId);
                if (avatar && window.InteractionSystem) {
                    setTimeout(() => {
                        window.InteractionSystem.createParticleEffect(avatar, effectType);
                    }, Math.random() * 2000);
                }
            });
        });
    },
    
    createDanceFloorEffect: function(groupData) {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        // Create disco floor effect
        const floorGeometry = new THREE.PlaneGeometry(8, 8);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.3
        });
        const danceFloor = new THREE.Mesh(floorGeometry, floorMaterial);
        danceFloor.rotation.x = -Math.PI / 2;
        danceFloor.position.y = 0.02;
        
        window.SceneManager.addObject(danceFloor);
        
        // Animate disco colors
        let colorPhase = 0;
        const colorInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id)) {
                clearInterval(colorInterval);
                window.SceneManager.removeObject(danceFloor);
                return;
            }
            
            colorPhase += 0.1;
            const hue = (colorPhase * 0.5) % 1;
            danceFloor.material.color.setHSL(hue, 1, 0.5);
        }, 100);
    },
    
    createMeditationAura: function(groupData) {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        // Create peaceful aura around meditation circle
        const auraGeometry = new THREE.SphereGeometry(groupData.formation.radius + 1, 16, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.position.y = 1;
        
        window.SceneManager.addObject(aura);
        
        // Gentle pulsing
        let pulsePhase = 0;
        const pulseInterval = setInterval(() => {
            if (!this.activeGroups.has(groupData.id)) {
                clearInterval(pulseInterval);
                window.SceneManager.removeObject(aura);
                return;
            }
            
            pulsePhase += 0.02;
            aura.scale.setScalar(1 + Math.sin(pulsePhase) * 0.1);
            aura.material.opacity = 0.1 + Math.sin(pulsePhase * 0.5) * 0.05;
        }, 50);
    },
    
    createWaveEffect: function(avatar) {
        // Individual wave particle effect
        if (window.InteractionSystem) {
            window.InteractionSystem.createParticleEffect(avatar, 'wave_trail');
        }
    },
    
    startActivityTimer: function(groupData) {
        const duration = groupData.activity.duration;
        
        // Countdown notifications
        const notifications = [
            { time: duration - 5000, message: '⏰ 5 seconds remaining!' },
            { time: duration - 10000, message: '⏰ 10 seconds remaining!' },
            { time: duration / 2, message: `🎭 ${groupData.activity.name} halfway done!` }
        ];
        
        notifications.forEach(notification => {
            setTimeout(() => {
                if (this.activeGroups.has(groupData.id) && window.RoomCore) {
                    window.RoomCore.showNotification(notification.message);
                }
            }, notification.time);
        });
        
        // End activity
        setTimeout(() => {
            this.endGroupActivity(groupData.id);
        }, duration);
    },
    
    endGroupActivity: function(groupId) {
        const groupData = this.activeGroups.get(groupId);
        if (!groupData) return;
        
        console.log(`🏁 Ending ${groupData.activity.name} for group ${groupId}`);
        
        // Restore participant positions
        groupData.participants.forEach(participantId => {
            const avatar = window.AvatarSystem.getAvatar(participantId);
            if (avatar && avatar.originalPosition) {
                this.animateAvatarToPosition(avatar, {
                    x: avatar.originalPosition.x,
                    y: avatar.originalPosition.y,
                    z: avatar.originalPosition.z,
                    rotation: 0
                }, 2000);
                
                // Clear original position
                delete avatar.originalPosition;
            }
        });
        
        // Create completion effect
        this.createCompletionEffect(groupData);
        
        // Show completion message
        if (window.RoomCore) {
            window.RoomCore.showNotification(`🎉 ${groupData.activity.name} completed! Great job everyone!`);
        }
        
        // Remove group
        this.activeGroups.delete(groupId);
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('group:ended', { groupId, activity: groupData.activity.name });
        }
    },
    
    createCompletionEffect: function(groupData) {
        // Fireworks effect for completion
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        groupData.participants.forEach((participantId, index) => {
            const avatar = window.AvatarSystem.getAvatar(participantId);
            if (avatar) {
                setTimeout(() => {
                    if (window.InteractionSystem) {
                        window.InteractionSystem.createParticleEffect(avatar, 'celebration');
                    }
                }, index * 200);
            }
        });
    },
    
    checkForAutoGroup: function(avatarId) {
        // Check if we should auto-form a group when new avatars join
        const availableAvatars = window.AvatarSystem.getAllAvatars().filter(avatar => 
            !this.isAvatarInGroup(avatar.id)
        );
        
        // Auto-form group if we have 4+ people and no active groups
        if (availableAvatars.length >= 4 && this.activeGroups.size === 0) {
            setTimeout(() => {
                if (Math.random() > 0.7) { // 30% chance
                    this.autoFormGroup();
                }
            }, 5000);
        }
    },
    
    onInteractionComplete: function(data) {
        // Check if interaction participants could form a group
        if (data.participants && data.participants.length >= 2) {
            const availableParticipants = data.participants.filter(id => 
                !this.isAvatarInGroup(id)
            );
            
            if (availableParticipants.length >= 2 && Math.random() > 0.8) { // 20% chance
                setTimeout(() => {
                    if (window.RoomCore) {
                        window.RoomCore.showNotification('💡 Press G to start a group activity!');
                    }
                }, 2000);
            }
        }
    },
    
    isAvatarInGroup: function(avatarId) {
        return Array.from(this.activeGroups.values()).some(group => 
            group.participants.includes(avatarId)
        );
    },
    
    getActiveGroups: function() {
        return Array.from(this.activeGroups.values());
    },
    
    getGroupForAvatar: function(avatarId) {
        return Array.from(this.activeGroups.values()).find(group => 
            group.participants.includes(avatarId)
        );
    },
    
    easeInOutCubic: function(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
};