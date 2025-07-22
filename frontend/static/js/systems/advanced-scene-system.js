// Advanced Scene System - Dynamic environments, lighting, and furniture with UI Integration

window.AdvancedSceneSystem = {
    isInitialized: false,
    currentEnvironment: null,
    dynamicLighting: null,
    weatherSystem: null,
    furnitureSystem: null,
    timeOfDay: 'day',
    currentWeather: 'clear',
    
    // Enhanced environment presets
    environments: {
        modern_office: {
            name: 'Modern Office',
            emoji: '🏢',
            backgroundColor: 0x2c3e50,
            groundColor: 0x34495e,
            lighting: {
                ambient: { color: 0x404040, intensity: 0.6 },
                directional: { color: 0xffffff, intensity: 0.8, position: [50, 50, 50] },
                point: { color: 0xffa500, intensity: 0.3, position: [0, 10, 0] }
            },
            fog: { color: 0x2c3e50, near: 20, far: 50 },
            furniture: ['desk', 'chair', 'computer', 'plant', 'whiteboard'],
            atmosphere: 'professional',
            soundscape: 'office_ambient'
        },
        cozy_lounge: {
            name: 'Cozy Lounge',
            emoji: '🛋️',
            backgroundColor: 0x8b4513,
            groundColor: 0xa0522d,
            lighting: {
                ambient: { color: 0x603020, intensity: 0.7 },
                directional: { color: 0xffaa80, intensity: 0.6, position: [30, 40, 30] },
                point: { color: 0xff6b35, intensity: 0.4, position: [-5, 8, 5] }
            },
            fog: { color: 0x8b4513, near: 15, far: 40 },
            furniture: ['sofa', 'coffee_table', 'lamp', 'bookshelf', 'fireplace'],
            atmosphere: 'warm',
            soundscape: 'fireplace_crackle'
        },
        outdoor_garden: {
            name: 'Outdoor Garden',
            emoji: '🌳',
            backgroundColor: 0x87ceeb,
            groundColor: 0x228b22,
            lighting: {
                ambient: { color: 0x606060, intensity: 0.8 },
                directional: { color: 0xffffcc, intensity: 1.0, position: [100, 100, 50] },
                point: { color: 0x98fb98, intensity: 0.2, position: [0, 5, 0] }
            },
            fog: { color: 0x87ceeb, near: 30, far: 80 },
            furniture: ['bench', 'tree', 'flowers', 'fountain', 'gazebo'],
            atmosphere: 'fresh',
            soundscape: 'nature_birds',
            weather: ['sunny', 'cloudy', 'light_rain']
        },
        party_venue: {
            name: 'Party Venue',
            emoji: '🎉',
            backgroundColor: 0x191970,
            groundColor: 0x4b0082,
            lighting: {
                ambient: { color: 0x301040, intensity: 0.4 },
                directional: { color: 0xff69b4, intensity: 0.7, position: [0, 30, 0] },
                point: { color: 0x00ffff, intensity: 0.6, position: [0, 15, 0] }
            },
            fog: { color: 0x191970, near: 10, far: 30 },
            furniture: ['dj_booth', 'speakers', 'dance_floor', 'bar', 'disco_ball'],
            atmosphere: 'energetic',
            soundscape: 'party_music',
            effects: ['disco_lights', 'laser_show', 'fog_machine']
        },
        zen_temple: {
            name: 'Zen Temple',
            emoji: '⛩️',
            backgroundColor: 0x2f4f4f,
            groundColor: 0x696969,
            lighting: {
                ambient: { color: 0x404050, intensity: 0.5 },
                directional: { color: 0xf0f8ff, intensity: 0.6, position: [0, 80, 80] },
                point: { color: 0xffd700, intensity: 0.3, position: [0, 12, 0] }
            },
            fog: { color: 0x2f4f4f, near: 25, far: 60 },
            furniture: ['temple_gate', 'stone_lantern', 'meditation_cushion', 'bonsai', 'water_feature'],
            atmosphere: 'peaceful',
            soundscape: 'zen_meditation',
            effects: ['floating_particles', 'soft_glow']
        },
        cyberpunk_city: {
            name: 'Cyberpunk City',
            emoji: '🌆',
            backgroundColor: 0x0a0a0a,
            groundColor: 0x1a1a1a,
            lighting: {
                ambient: { color: 0x001122, intensity: 0.3 },
                directional: { color: 0x00ffff, intensity: 0.5, position: [-50, 30, 50] },
                point: { color: 0xff00ff, intensity: 0.8, position: [0, 20, 0] }
            },
            fog: { color: 0x001122, near: 15, far: 45 },
            furniture: ['neon_signs', 'hologram', 'cyber_terminal', 'floating_platform', 'energy_core'],
            atmosphere: 'futuristic',
            soundscape: 'cyber_ambient',
            effects: ['neon_glow', 'holographic_rain', 'data_streams']
        }
    },
    
    weatherTypes: {
        clear: { name: 'Clear', emoji: '☀️' },
        sunny: { name: 'Sunny', emoji: '🌞' },
        cloudy: { name: 'Cloudy', emoji: '☁️' },
        light_rain: { name: 'Light Rain', emoji: '🌦️' },
        heavy_rain: { name: 'Heavy Rain', emoji: '🌧️' },
        snow: { name: 'Snow', emoji: '❄️' },
        fog: { name: 'Fog', emoji: '🌫️' },
        storm: { name: 'Storm', emoji: '⛈️' }
    },
    
    timesOfDay: {
        dawn: { name: 'Dawn', emoji: '🌅' },
        day: { name: 'Day', emoji: '☀️' },
        dusk: { name: 'Dusk', emoji: '🌆' },
        night: { name: 'Night', emoji: '🌙' }
    },
    
    furnitureTypes: {
        // Office furniture
        desk: { model: 'office_desk', scale: [1, 1, 1], interactive: true },
        chair: { model: 'office_chair', scale: [0.8, 0.8, 0.8], interactive: true },
        computer: { model: 'computer_setup', scale: [0.6, 0.6, 0.6], interactive: true },
        plant: { model: 'office_plant', scale: [0.7, 0.7, 0.7], interactive: false },
        whiteboard: { model: 'whiteboard', scale: [1.2, 1.2, 0.1], interactive: true },
        
        // Lounge furniture
        sofa: { model: 'cozy_sofa', scale: [1.5, 1, 1.5], interactive: true },
        coffee_table: { model: 'coffee_table', scale: [1, 0.5, 1], interactive: true },
        lamp: { model: 'table_lamp', scale: [0.4, 1, 0.4], interactive: true },
        bookshelf: { model: 'bookshelf', scale: [0.8, 1.5, 0.3], interactive: true },
        fireplace: { model: 'fireplace', scale: [2, 1.5, 0.5], interactive: true },
        
        // Garden furniture
        bench: { model: 'park_bench', scale: [1.5, 0.8, 0.6], interactive: true },
        tree: { model: 'garden_tree', scale: [1, 2, 1], interactive: false },
        flowers: { model: 'flower_bed', scale: [1, 0.3, 1], interactive: false },
        fountain: { model: 'water_fountain', scale: [1.2, 1.5, 1.2], interactive: true },
        gazebo: { model: 'garden_gazebo', scale: [3, 2, 3], interactive: true },
        
        // Party furniture
        dj_booth: { model: 'dj_setup', scale: [2, 1.2, 1], interactive: true },
        speakers: { model: 'party_speakers', scale: [0.8, 1.5, 0.8], interactive: true },
        dance_floor: { model: 'disco_floor', scale: [4, 0.1, 4], interactive: false },
        bar: { model: 'party_bar', scale: [3, 1.2, 0.8], interactive: true },
        disco_ball: { model: 'mirror_ball', scale: [0.5, 0.5, 0.5], interactive: false },
        
        // Temple furniture
        temple_gate: { model: 'torii_gate', scale: [3, 2.5, 0.5], interactive: false },
        stone_lantern: { model: 'stone_lantern', scale: [0.6, 1.5, 0.6], interactive: true },
        meditation_cushion: { model: 'zabuton', scale: [0.8, 0.2, 0.8], interactive: true },
        bonsai: { model: 'bonsai_tree', scale: [0.4, 0.6, 0.4], interactive: false },
        water_feature: { model: 'zen_fountain', scale: [1.5, 0.8, 1.5], interactive: true },
        
        // Cyberpunk furniture
        neon_signs: { model: 'neon_billboard', scale: [2, 1, 0.1], interactive: false },
        hologram: { model: 'holo_display', scale: [1, 1.5, 1], interactive: true },
        cyber_terminal: { model: 'cyber_console', scale: [1.2, 1, 0.8], interactive: true },
        floating_platform: { model: 'hover_platform', scale: [2, 0.2, 2], interactive: true },
        energy_core: { model: 'power_core', scale: [0.8, 1.5, 0.8], interactive: false }
    },
    
    init: async function() {
        if (this.isInitialized) return;
        
        console.log('🌟 Initializing Advanced Scene System');
        
        // Initialize sub-systems
        this.dynamicLighting = new DynamicLightingSystem();
        this.weatherSystem = new WeatherSystem();
        this.furnitureSystem = new FurnitureSystem();
        
        await this.dynamicLighting.init();
        await this.weatherSystem.init();
        await this.furnitureSystem.init();
        
        // Set up UI event handlers
        this.setupUIEventHandlers();
        
        // Set up time-based lighting changes
        this.setupTimeOfDaySystem();
        
        // Listen for environment change requests
        if (window.EventBus) {
            window.EventBus.on('scene:change', (data) => {
                this.changeEnvironment(data.environment, data.options);
            });
            
            window.EventBus.on('lighting:adjust', (data) => {
                this.adjustLighting(data);
            });
        }
        
        this.isInitialized = true;
        console.log('✅ Advanced Scene System initialized');
    },
    
    setupUIEventHandlers: function() {
        console.log('🎮 Setting up Scene system UI handlers...');
        
        // Keep track of buttons we've already set up to avoid duplicates
        this.setupButtons = new Set();
        
        const setupButtons = () => {
            console.log('🔍 Looking for buttons...');
            
            // Find all control buttons
            const allControlBtns = document.querySelectorAll('.control-btn');
            console.log(`Found ${allControlBtns.length} control buttons total`);
            
            allControlBtns.forEach((btn, index) => {
                // Skip if we've already set up this button
                if (this.setupButtons.has(btn)) return;
                
                const text = btn.textContent.toLowerCase();
                console.log(`Control button ${index}: "${btn.textContent}"`);
                
                if (text.includes('environment') || text.includes('🌍')) {
                    console.log(`✅ Setting up environment button ${index}`);
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🌍 Environment button clicked!');
                        this.showEnvironmentSelector();
                    });
                    this.setupButtons.add(btn);
                } else if (text.includes('weather') || text.includes('🌦️')) {
                    console.log(`✅ Setting up weather button ${index}`);
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🌦️ Weather button clicked!');
                        this.showWeatherSelector();
                    });
                    this.setupButtons.add(btn);
                } else if (text.includes('time') || text.includes('🌅')) {
                    console.log(`✅ Setting up time button ${index}`);
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🌅 Time button clicked!');
                        this.showTimeOfDaySelector();
                    });
                    this.setupButtons.add(btn);
                }
            });
        };
        
        // Try setting up immediately
        setupButtons.call(this);
        
        // Also try again after a delay in case buttons load later
        setTimeout(() => {
            console.log('🔄 Retrying button setup after delay...');
            setupButtons.call(this);
        }, 1000);
        
        console.log('🎮 Scene system UI handlers setup complete');
    },
    
    showEnvironmentSelector: function() {
        console.log('🌍 Opening environment selector...');
        
        // Remove existing selector if present
        const existingSelector = document.getElementById('environment-selector');
        if (existingSelector) {
            existingSelector.remove();
            return;
        }
        
        // Create environment selector modal
        const selector = document.createElement('div');
        selector.id = 'environment-selector';
        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 24px;
            z-index: 10000;
            color: white;
            min-width: 400px;
            max-width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            backdrop-filter: blur(10px);
        `;
        
        const environmentKeys = Object.keys(this.environments);
        const currentKey = this.currentEnvironment?.key || 'modern_office';
        
        selector.innerHTML = `
            <h3 style="margin: 0 0 20px 0; text-align: center; color: #4CAF50;">🌍 Choose Environment</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px;">
                ${environmentKeys.map(key => {
                    const env = this.environments[key];
                    const isActive = key === currentKey;
                    return `
                        <button class="env-option" data-environment="${key}" style="
                            padding: 16px;
                            background: ${isActive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
                            border: 2px solid ${isActive ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'};
                            border-radius: 12px;
                            color: white;
                            cursor: pointer;
                            text-align: center;
                            font-size: 13px;
                            transition: all 0.3s ease;
                            min-height: 80px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        ">
                            <div style="font-size: 24px; margin-bottom: 8px;">${env.emoji}</div>
                            <div style="font-weight: bold; margin-bottom: 4px;">${env.name}</div>
                            <div style="font-size: 11px; opacity: 0.8;">${env.atmosphere}</div>
                        </button>
                    `;
                }).join('')}
            </div>
            <button id="close-env-selector" style="
                width: 100%; 
                padding: 12px; 
                background: #666; 
                border: none; 
                border-radius: 8px; 
                color: white; 
                cursor: pointer;
                font-weight: bold;
            ">Close</button>
        `;
        
        // Add to a container that won't trigger DOM mutations we care about
        document.body.appendChild(selector);
        
        // Add event listeners
        selector.querySelectorAll('.env-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const environmentKey = e.currentTarget.dataset.environment;
                console.log('🌍 Selected environment:', environmentKey);
                this.changeEnvironment(environmentKey);
                selector.remove();
            });
            
            btn.addEventListener('mouseenter', (e) => {
                if (!e.currentTarget.style.borderColor.includes('76, 175, 80')) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }
            });
            
            btn.addEventListener('mouseleave', (e) => {
                if (!e.currentTarget.style.borderColor.includes('76, 175, 80')) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                }
            });
        });
        
        selector.querySelector('#close-env-selector').addEventListener('click', () => {
            selector.remove();
        });
        
        console.log('✅ Environment selector created successfully');
    },
    
    showWeatherSelector: function() {
        // Remove existing selector if present
        const existingSelector = document.getElementById('weather-selector');
        if (existingSelector) {
            existingSelector.remove();
            return;
        }
        
        // Create weather selector modal
        const selector = document.createElement('div');
        selector.id = 'weather-selector';
        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 24px;
            z-index: 1000;
            color: white;
            min-width: 350px;
            max-width: 90vw;
            backdrop-filter: blur(10px);
        `;
        
        const weatherKeys = Object.keys(this.weatherTypes);
        
        selector.innerHTML = `
            <h3 style="margin: 0 0 20px 0; text-align: center; color: #2196F3;">🌦️ Weather Control</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-bottom: 20px;">
                ${weatherKeys.map(key => {
                    const weather = this.weatherTypes[key];
                    const isActive = key === this.currentWeather;
                    return `
                        <button class="weather-option" data-weather="${key}" style="
                            padding: 12px;
                            background: ${isActive ? 'rgba(33, 150, 243, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
                            border: 2px solid ${isActive ? '#2196F3' : 'rgba(255, 255, 255, 0.2)'};
                            border-radius: 10px;
                            color: white;
                            cursor: pointer;
                            text-align: center;
                            font-size: 12px;
                            transition: all 0.3s ease;
                            min-height: 60px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        ">
                            <div style="font-size: 20px; margin-bottom: 4px;">${weather.emoji}</div>
                            <div style="font-weight: bold;">${weather.name}</div>
                        </button>
                    `;
                }).join('')}
            </div>
            <button id="close-weather-selector" style="
                width: 100%; 
                padding: 12px; 
                background: #666; 
                border: none; 
                border-radius: 8px; 
                color: white; 
                cursor: pointer;
                font-weight: bold;
            ">Close</button>
        `;
        
        document.body.appendChild(selector);
        
        // Add event listeners
        selector.querySelectorAll('.weather-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const weatherKey = e.currentTarget.dataset.weather;
                this.setWeather(weatherKey);
                
                // Update active state
                selector.querySelectorAll('.weather-option').forEach(b => {
                    b.style.background = 'rgba(255, 255, 255, 0.1)';
                    b.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                });
                e.currentTarget.style.background = 'rgba(33, 150, 243, 0.3)';
                e.currentTarget.style.borderColor = '#2196F3';
                
                setTimeout(() => selector.remove(), 1000);
            });
            
            btn.addEventListener('mouseenter', (e) => {
                if (!e.currentTarget.style.borderColor.includes('33, 150, 243')) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }
            });
            
            btn.addEventListener('mouseleave', (e) => {
                if (!e.currentTarget.style.borderColor.includes('33, 150, 243')) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                }
            });
        });
        
        selector.querySelector('#close-weather-selector').addEventListener('click', () => {
            selector.remove();
        });
    },
    
    showTimeOfDaySelector: function() {
        // Remove existing selector if present
        const existingSelector = document.getElementById('time-selector');
        if (existingSelector) {
            existingSelector.remove();
            return;
        }
        
        // Create time of day selector modal
        const selector = document.createElement('div');
        selector.id = 'time-selector';
        selector.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 24px;
            z-index: 1000;
            color: white;
            min-width: 300px;
            max-width: 90vw;
            backdrop-filter: blur(10px);
        `;
        
        const timeKeys = Object.keys(this.timesOfDay);
        
        selector.innerHTML = `
            <h3 style="margin: 0 0 20px 0; text-align: center; color: #FF9800;">🌅 Time of Day</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                ${timeKeys.map(key => {
                    const time = this.timesOfDay[key];
                    const isActive = key === this.timeOfDay;
                    return `
                        <button class="time-option" data-time="${key}" style="
                            padding: 16px;
                            background: ${isActive ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
                            border: 2px solid ${isActive ? '#FF9800' : 'rgba(255, 255, 255, 0.2)'};
                            border-radius: 12px;
                            color: white;
                            cursor: pointer;
                            text-align: center;
                            font-size: 13px;
                            transition: all 0.3s ease;
                            min-height: 70px;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                        ">
                            <div style="font-size: 24px; margin-bottom: 6px;">${time.emoji}</div>
                            <div style="font-weight: bold;">${time.name}</div>
                        </button>
                    `;
                }).join('')}
            </div>
            <button id="close-time-selector" style="
                width: 100%; 
                padding: 12px; 
                background: #666; 
                border: none; 
                border-radius: 8px; 
                color: white; 
                cursor: pointer;
                font-weight: bold;
            ">Close</button>
        `;
        
        document.body.appendChild(selector);
        
        // Add event listeners
        selector.querySelectorAll('.time-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeKey = e.currentTarget.dataset.time;
                this.setTimeOfDay(timeKey);
                
                // Update active state
                selector.querySelectorAll('.time-option').forEach(b => {
                    b.style.background = 'rgba(255, 255, 255, 0.1)';
                    b.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                });
                e.currentTarget.style.background = 'rgba(255, 152, 0, 0.3)';
                e.currentTarget.style.borderColor = '#FF9800';
                
                setTimeout(() => selector.remove(), 1000);
            });
            
            btn.addEventListener('mouseenter', (e) => {
                if (!e.currentTarget.style.borderColor.includes('255, 152, 0')) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }
            });
            
            btn.addEventListener('mouseleave', (e) => {
                if (!e.currentTarget.style.borderColor.includes('255, 152, 0')) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'scale(1)';
                }
            });
        });
        
        selector.querySelector('#close-time-selector').addEventListener('click', () => {
            selector.remove();
        });
    },
    
    setWeather: function(weatherType) {
        if (!this.weatherTypes[weatherType]) {
            console.error('Unknown weather type:', weatherType);
            return;
        }
        
        this.currentWeather = weatherType;
        this.weatherSystem.setWeather(weatherType);
        
        const weather = this.weatherTypes[weatherType];
        console.log(`🌦️ Weather changed to: ${weather.name}`);
        
        // Show notification
        if (window.RoomCore) {
            window.RoomCore.showNotification(`${weather.emoji} Weather: ${weather.name}`);
        }
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('weather:changed', {
                weather: weatherType,
                config: weather
            });
        }
    },
    
    setTimeOfDay: function(timeKey) {
        if (!this.timesOfDay[timeKey]) {
            console.error('Unknown time of day:', timeKey);
            return;
        }
        
        this.timeOfDay = timeKey;
        this.dynamicLighting.adjustForTimeOfDay(timeKey);
        
        const time = this.timesOfDay[timeKey];
        console.log(`🌅 Time of day changed to: ${time.name}`);
        
        // Show notification
        if (window.RoomCore) {
            window.RoomCore.showNotification(`${time.emoji} Time: ${time.name}`);
        }
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('time:changed', {
                time: timeKey,
                config: time
            });
        }
    },
    
    changeEnvironment: function(environmentKey, options = {}) {
        const environment = this.environments[environmentKey];
        if (!environment) {
            console.error('Unknown environment:', environmentKey);
            return;
        }
        
        console.log(`🌍 Changing to ${environment.name}`);
        
        // Store current environment
        this.currentEnvironment = { ...environment, key: environmentKey };
        
        // Apply environment settings
        this.applyEnvironmentSettings(environment);
        
        // Update lighting
        this.dynamicLighting.applyLightingConfig(environment.lighting);
        
        // Clear existing furniture and add new ones
        this.furnitureSystem.clearAll();
        this.addEnvironmentFurniture(environment);
        
        // Apply weather if supported
        if (environment.weather && !options.noWeather) {
            const randomWeather = environment.weather[Math.floor(Math.random() * environment.weather.length)];
            this.setWeather(randomWeather);
        }
        
        // Apply special effects
        if (environment.effects) {
            this.applyEnvironmentEffects(environment.effects);
        }
        
        // Create transition effect
        this.createEnvironmentTransition(environment);
        
        // Update UI
        if (window.RoomCore) {
            window.RoomCore.showNotification(`🌟 Welcome to ${environment.name}! ${environment.emoji}`);
        }
        
        // Emit event
        if (window.EventBus) {
            window.EventBus.emit('environment:changed', {
                environment: environmentKey,
                config: environment
            });
        }
    },
    
    applyEnvironmentSettings: function(environment) {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        const scene = window.SceneManager.scene;
        
        // Update background color
        scene.background = new THREE.Color(environment.backgroundColor);
        
        // Update ground color
        scene.traverse(child => {
            if (child.name === 'ground' || (child.geometry && child.geometry.type === 'PlaneGeometry')) {
                if (child.material) {
                    child.material.color.setHex(environment.groundColor);
                }
            }
        });
        
        // Add or update fog
        if (environment.fog) {
            scene.fog = new THREE.Fog(
                environment.fog.color,
                environment.fog.near,
                environment.fog.far
            );
        } else {
            scene.fog = null;
        }
    },
    
    addEnvironmentFurniture: function(environment) {
        if (!environment.furniture) return;
        
        const furnitureCount = Math.min(environment.furniture.length, 8); // Limit for performance
        
        for (let i = 0; i < furnitureCount; i++) {
            const furnitureType = environment.furniture[i];
            const position = this.generateFurniturePosition(i, furnitureCount);
            
            this.furnitureSystem.addFurniture(furnitureType, position);
        }
    },
    
    generateFurniturePosition: function(index, total) {
        // Generate positions in a circle or grid pattern
        if (total <= 6) {
            // Circle pattern
            const angle = (index / total) * Math.PI * 2;
            const radius = 5 + Math.random() * 3;
            return {
                x: Math.cos(angle) * radius,
                y: 0,
                z: Math.sin(angle) * radius,
                rotation: angle + Math.PI + (Math.random() - 0.5) * 0.5
            };
        } else {
            // Grid pattern
            const cols = Math.ceil(Math.sqrt(total));
            const col = index % cols;
            const row = Math.floor(index / cols);
            const spacing = 3;
            
            return {
                x: (col - cols/2) * spacing + (Math.random() - 0.5),
                y: 0,
                z: (row - Math.ceil(total/cols)/2) * spacing + (Math.random() - 0.5),
                rotation: Math.random() * Math.PI * 2
            };
        }
    },
    
    applyEnvironmentEffects: function(effects) {
        effects.forEach(effect => {
            switch(effect) {
                case 'disco_lights':
                    this.createDiscoLightEffect();
                    break;
                case 'laser_show':
                    this.createLaserShowEffect();
                    break;
                case 'fog_machine':
                    this.createFogMachineEffect();
                    break;
                case 'floating_particles':
                    this.createFloatingParticlesEffect();
                    break;
                case 'soft_glow':
                    this.createSoftGlowEffect();
                    break;
                case 'neon_glow':
                    this.createNeonGlowEffect();
                    break;
                case 'holographic_rain':
                    this.createHolographicRainEffect();
                    break;
                case 'data_streams':
                    this.createDataStreamsEffect();
                    break;
            }
        });
    },
    
    createEnvironmentTransition: function(environment) {
        // Create a wave transition effect
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        const transitionCount = 15;
        const colors = [environment.backgroundColor, environment.groundColor];
        
        for (let i = 0; i < transitionCount; i++) {
            const wave = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 8, 8),
                new THREE.MeshBasicMaterial({
                    color: colors[i % colors.length],
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            wave.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 8,
                (Math.random() - 0.5) * 20
            );
            
            window.SceneManager.addObject(wave);
            
            // Animate wave
            let wavePhase = 0;
            const waveInterval = setInterval(() => {
                wavePhase += 0.08;
                wave.position.y += 0.03;
                wave.scale.setScalar(1 + wavePhase);
                wave.material.opacity = 0.6 - (wavePhase / 2);
                wave.rotation.y += 0.1;
                
                if (wavePhase >= 2) {
                    clearInterval(waveInterval);
                    window.SceneManager.removeObject(wave);
                }
            }, 50);
            
            // Stagger the waves
            setTimeout(() => {}, i * 100);
        }
    },
    
    setupTimeOfDaySystem: function() {
        // Cycle through time of day every 2 minutes in demo
        const timeOfDayDuration = 120000; // 2 minutes
        
        setInterval(() => {
            this.cycleTimeOfDay();
        }, timeOfDayDuration);
    },
    
    cycleTimeOfDay: function() {
        const times = ['dawn', 'day', 'dusk', 'night'];
        const currentIndex = times.indexOf(this.timeOfDay);
        const nextIndex = (currentIndex + 1) % times.length;
        this.setTimeOfDay(times[nextIndex]);
    },
    
    adjustLighting: function(adjustments) {
        this.dynamicLighting.adjust(adjustments);
    },
    
    // Effect creation methods
    createDiscoLightEffect: function() {
        if (!window.SceneManager) return;
        
        // Create rotating disco lights
        const lightCount = 6;
        const lights = [];
        
        for (let i = 0; i < lightCount; i++) {
            const light = new THREE.SpotLight(
                Math.random() * 0xffffff,
                1,
                20,
                Math.PI / 6
            );
            
            light.position.set(0, 8, 0);
            light.target.position.set(
                Math.cos(i * Math.PI * 2 / lightCount) * 5,
                0,
                Math.sin(i * Math.PI * 2 / lightCount) * 5
            );
            
            window.SceneManager.addObject(light);
            window.SceneManager.addObject(light.target);
            lights.push(light);
        }
        
        // Animate disco lights
        let rotation = 0;
        const discoInterval = setInterval(() => {
            rotation += 0.05;
            
            lights.forEach((light, index) => {
                const angle = rotation + (index * Math.PI * 2 / lightCount);
                light.target.position.set(
                    Math.cos(angle) * 5,
                    0,
                    Math.sin(angle) * 5
                );
                
                // Change colors
                if (Math.random() < 0.1) {
                    light.color.setHex(Math.random() * 0xffffff);
                }
            });
        }, 50);
        
        // Store for cleanup
        this.activeEffects = this.activeEffects || [];
        this.activeEffects.push({ type: 'disco_lights', interval: discoInterval, objects: lights });
    },
    
    createFloatingParticlesEffect: function() {
        // Create peaceful floating particles
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.03, 6, 6),
                new THREE.MeshBasicMaterial({
                    color: 0xffd700,
                    transparent: true,
                    opacity: 0.6
                })
            );
            
            particle.position.set(
                (Math.random() - 0.5) * 15,
                Math.random() * 8,
                (Math.random() - 0.5) * 15
            );
            
            window.SceneManager.addObject(particle);
            
            // Gentle floating animation
            let particlePhase = Math.random() * Math.PI * 2;
            const particleInterval = setInterval(() => {
                particlePhase += 0.02;
                particle.position.y += Math.sin(particlePhase) * 0.01;
                particle.position.x += Math.cos(particlePhase * 0.7) * 0.005;
                particle.material.opacity = 0.3 + Math.sin(particlePhase * 0.5) * 0.3;
            }, 50);
            
            // Store for cleanup
            setTimeout(() => {
                clearInterval(particleInterval);
                window.SceneManager.removeObject(particle);
            }, 60000);
        }
    },
    
    createNeonGlowEffect: function() {
        // Create neon glow lines and shapes
        const neonShapes = [];
        
        // Create neon grid lines
        for (let i = -10; i <= 10; i += 2) {
            // Vertical lines
            const vGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
            const vMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.7
            });
            const vLine = new THREE.Mesh(vGeometry, vMaterial);
            vLine.position.set(i, 0.25, -8);
            
            // Horizontal lines  
            const hGeometry = new THREE.CylinderGeometry(0.02, 0.02, 20, 6);
            const hMaterial = new THREE.MeshBasicMaterial({
                color: 0xff00ff,
                transparent: true,
                opacity: 0.5
            });
            const hLine = new THREE.Mesh(hGeometry, hMaterial);
            hLine.rotation.z = Math.PI / 2;
            hLine.position.set(0, 0.25, i);
            
            window.SceneManager.addObject(vLine);
            window.SceneManager.addObject(hLine);
            neonShapes.push(vLine, hLine);
        }
        
        // Animate neon glow
        let neonPhase = 0;
        const neonInterval = setInterval(() => {
            neonPhase += 0.1;
            
            neonShapes.forEach((shape, index) => {
                const intensity = 0.3 + Math.sin(neonPhase + index * 0.2) * 0.4;
                shape.material.opacity = intensity;
            });
        }, 50);
        
        // Store for cleanup
        setTimeout(() => {
            clearInterval(neonInterval);
            neonShapes.forEach(shape => window.SceneManager.removeObject(shape));
        }, 60000);
    },
    
    getCurrentEnvironment: function() {
        return this.currentEnvironment;
    },
    
    getAvailableEnvironments: function() {
        return Object.keys(this.environments);
    },
    
    getTimeOfDay: function() {
        return this.timeOfDay;
    },
    
    getCurrentWeather: function() {
        return this.currentWeather;
    },
    
    cleanup: function() {
        // Clean up active effects
        if (this.activeEffects) {
            this.activeEffects.forEach(effect => {
                if (effect.interval) clearInterval(effect.interval);
                if (effect.objects) {
                    effect.objects.forEach(obj => {
                        if (window.SceneManager) {
                            window.SceneManager.removeObject(obj);
                        }
                    });
                }
            });
            this.activeEffects = [];
        }
        
        // Clean up sub-systems
        if (this.dynamicLighting) this.dynamicLighting.cleanup();
        if (this.weatherSystem) this.weatherSystem.cleanup();
        if (this.furnitureSystem) this.furnitureSystem.cleanup();
    }
};

// Dynamic Lighting System
class DynamicLightingSystem {
    constructor() {
        this.lights = {
            ambient: null,
            directional: null,
            point: null,
            spot: []
        };
        this.isInitialized = false;
    }
    
    async init() {
        console.log('💡 Initializing Dynamic Lighting System');
        this.isInitialized = true;
    }
    
    applyLightingConfig(config) {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        const scene = window.SceneManager.scene;
        
        // Clear existing lights
        this.clearLights();
        
        // Add ambient light
        if (config.ambient) {
            this.lights.ambient = new THREE.AmbientLight(
                config.ambient.color,
                config.ambient.intensity
            );
            scene.add(this.lights.ambient);
        }
        
        // Add directional light
        if (config.directional) {
            this.lights.directional = new THREE.DirectionalLight(
                config.directional.color,
                config.directional.intensity
            );
            
            if (config.directional.position) {
                this.lights.directional.position.set(...config.directional.position);
            }
            
            this.lights.directional.castShadow = true;
            this.lights.directional.shadow.mapSize.width = 2048;
            this.lights.directional.shadow.mapSize.height = 2048;
            
            scene.add(this.lights.directional);
        }
        
        // Add point light
        if (config.point) {
            this.lights.point = new THREE.PointLight(
                config.point.color,
                config.point.intensity,
                100
            );
            
            if (config.point.position) {
                this.lights.point.position.set(...config.point.position);
            }
            
            scene.add(this.lights.point);
        }
    }
    
    adjustForTimeOfDay(timeOfDay) {
        if (!this.lights.directional || !this.lights.ambient) return;
        
        const timeSettings = {
            dawn: { 
                directionalIntensity: 0.4, 
                ambientIntensity: 0.3,
                directionalColor: 0xffa500, 
                ambientColor: 0x404040 
            },
            day: { 
                directionalIntensity: 0.8, 
                ambientIntensity: 0.6,
                directionalColor: 0xffffff, 
                ambientColor: 0x404040 
            },
            dusk: { 
                directionalIntensity: 0.3, 
                ambientIntensity: 0.4,
                directionalColor: 0xff6347, 
                ambientColor: 0x302030 
            },
            night: { 
                directionalIntensity: 0.1, 
                ambientIntensity: 0.2,
                directionalColor: 0x87ceeb, 
                ambientColor: 0x202040 
            }
        };
        
        const settings = timeSettings[timeOfDay];
        if (settings) {
            this.lights.directional.intensity = settings.directionalIntensity;
            this.lights.directional.color.setHex(settings.directionalColor);
            this.lights.ambient.intensity = settings.ambientIntensity;
            this.lights.ambient.color.setHex(settings.ambientColor);
        }
    }
    
    adjust(adjustments) {
        if (adjustments.directionalIntensity && this.lights.directional) {
            this.lights.directional.intensity = adjustments.directionalIntensity;
        }
        if (adjustments.ambientIntensity && this.lights.ambient) {
            this.lights.ambient.intensity = adjustments.ambientIntensity;
        }
    }
    
    clearLights() {
        if (!window.SceneManager || !window.SceneManager.scene) return;
        
        const scene = window.SceneManager.scene;
        
        Object.values(this.lights).forEach(light => {
            if (light) {
                if (Array.isArray(light)) {
                    light.forEach(l => scene.remove(l));
                } else {
                    scene.remove(light);
                }
            }
        });
        
        // Reset lights object
        this.lights = {
            ambient: null,
            directional: null,
            point: null,
            spot: []
        };
    }
    
    cleanup() {
        this.clearLights();
    }
}

// Weather System
class WeatherSystem {
    constructor() {
        this.currentWeather = 'clear';
        this.activeEffects = [];
        this.isInitialized = false;
    }
    
    async init() {
        console.log('🌤️ Initializing Weather System');
        this.isInitialized = true;
    }
    
    setWeather(weatherType) {
        console.log(`🌦️ Setting weather to: ${weatherType}`);
        
        // Clear existing weather
        this.clearWeather();
        
        this.currentWeather = weatherType;
        
        switch(weatherType) {
            case 'sunny':
                this.createSunnyWeather();
                break;
            case 'cloudy':
                this.createCloudyWeather();
                break;
            case 'light_rain':
            case 'heavy_rain':
                this.createRainWeather(weatherType === 'heavy_rain');
                break;
            case 'snow':
                this.createSnowWeather();
                break;
            case 'fog':
                this.createFoggyWeather();
                break;
            case 'storm':
                this.createStormWeather();
                break;
        }
    }
    
    createRainWeather(heavy = false) {
        if (!window.SceneManager) return;
        
        // Create rain particles
        const rainCount = heavy ? 150 : 100;
        const rainDrops = [];
        
        for (let i = 0; i < rainCount; i++) {
            const drop = new THREE.Mesh(
                new THREE.CylinderGeometry(0.01, 0.01, heavy ? 0.5 : 0.3, 4),
                new THREE.MeshBasicMaterial({
                    color: 0x87ceeb,
                    transparent: true,
                    opacity: heavy ? 0.8 : 0.6
                })
            );
            
            drop.position.set(
                (Math.random() - 0.5) * 30,
                Math.random() * 15 + 10,
                (Math.random() - 0.5) * 30
            );
            
            rainDrops.push(drop);
            window.SceneManager.addObject(drop);
        }
        
        // Animate rain
        const rainSpeed = heavy ? 0.3 : 0.2;
        const rainInterval = setInterval(() => {
            rainDrops.forEach(drop => {
                drop.position.y -= rainSpeed;
                
                // Reset position when it hits ground
                if (drop.position.y < 0) {
                    drop.position.y = 15;
                    drop.position.x = (Math.random() - 0.5) * 30;
                    drop.position.z = (Math.random() - 0.5) * 30;
                }
            });
        }, 50);
        
        this.activeEffects.push({ type: 'rain', interval: rainInterval, objects: rainDrops });
    }
    
    createSnowWeather() {
        if (!window.SceneManager) return;
        
        // Create snow particles
        const snowCount = 80;
        const snowFlakes = [];
        
        for (let i = 0; i < snowCount; i++) {
            const flake = new THREE.Mesh(
                new THREE.SphereGeometry(0.02, 6, 6),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8
                })
            );
            
            flake.position.set(
                (Math.random() - 0.5) * 25,
                Math.random() * 12 + 8,
                (Math.random() - 0.5) * 25
            );
            
            snowFlakes.push(flake);
            window.SceneManager.addObject(flake);
        }
        
        // Animate snow
        let snowTime = 0;
        const snowInterval = setInterval(() => {
            snowTime += 0.02;
            
            snowFlakes.forEach((flake, index) => {
                flake.position.y -= 0.05;
                flake.position.x += Math.sin(snowTime + index) * 0.01;
                
                // Reset position when it hits ground
                if (flake.position.y < 0) {
                    flake.position.y = 12;
                    flake.position.x = (Math.random() - 0.5) * 25;
                    flake.position.z = (Math.random() - 0.5) * 25;
                }
            });
        }, 50);
        
        this.activeEffects.push({ type: 'snow', interval: snowInterval, objects: snowFlakes });
    }
    
    createCloudyWeather() {
        // Just adjust lighting for cloudy conditions
        if (window.AdvancedSceneSystem.dynamicLighting) {
            window.AdvancedSceneSystem.dynamicLighting.adjust({
                directionalIntensity: 0.4,
                ambientIntensity: 0.7
            });
        }
    }
    
    createSunnyWeather() {
        // Create sun rays effect
        const rayCount = 8;
        const sunRays = [];
        
        for (let i = 0; i < rayCount; i++) {
            const ray = new THREE.Mesh(
                new THREE.PlaneGeometry(0.1, 8),
                new THREE.MeshBasicMaterial({
                    color: 0xffff99,
                    transparent: true,
                    opacity: 0.3
                })
            );
            
            const angle = (i / rayCount) * Math.PI * 2;
            ray.position.set(
                Math.cos(angle) * 0.5,
                12,
                Math.sin(angle) * 0.5
            );
            ray.rotation.z = angle;
            
            sunRays.push(ray);
            window.SceneManager.addObject(ray);
        }
        
        // Animate sun rays
        let rayRotation = 0;
        const rayInterval = setInterval(() => {
            rayRotation += 0.01;
            sunRays.forEach(ray => {
                ray.rotation.z += 0.01;
                ray.material.opacity = 0.2 + Math.sin(rayRotation) * 0.1;
            });
        }, 50);
        
        this.activeEffects.push({ type: 'sunny', interval: rayInterval, objects: sunRays });
    }
    
    createFoggyWeather() {
        // Add extra fog to the scene
        if (window.SceneManager && window.SceneManager.scene) {
            const scene = window.SceneManager.scene;
            scene.fog = new THREE.Fog(0x999999, 5, 25);
        }
    }
    
    createStormWeather() {
        // Combine heavy rain with lightning effects
        this.createRainWeather(true);
        
        // Add lightning flashes
        let lightningCount = 0;
        const lightningInterval = setInterval(() => {
            if (lightningCount++ > 10) {
                clearInterval(lightningInterval);
                return;
            }
            
            // Create lightning flash
            if (window.SceneManager && window.SceneManager.scene) {
                const originalFog = window.SceneManager.scene.fog;
                window.SceneManager.scene.fog = new THREE.Fog(0xffffff, 10, 30);
                
                setTimeout(() => {
                    if (window.SceneManager && window.SceneManager.scene) {
                        window.SceneManager.scene.fog = originalFog;
                    }
                }, 100);
            }
        }, 3000 + Math.random() * 2000);
        
        this.activeEffects.push({ type: 'lightning', interval: lightningInterval, objects: [] });
    }
    
    clearWeather() {
        this.activeEffects.forEach(effect => {
            if (effect.interval) clearInterval(effect.interval);
            if (effect.objects) {
                effect.objects.forEach(obj => {
                    if (window.SceneManager) {
                        window.SceneManager.removeObject(obj);
                    }
                });
            }
        });
        this.activeEffects = [];
        
        // Reset fog
        if (window.SceneManager && window.SceneManager.scene) {
            const currentEnv = window.AdvancedSceneSystem.currentEnvironment;
            if (currentEnv && currentEnv.fog) {
                window.SceneManager.scene.fog = new THREE.Fog(
                    currentEnv.fog.color,
                    currentEnv.fog.near,
                    currentEnv.fog.far
                );
            }
        }
    }
    
    cleanup() {
        this.clearWeather();
    }
}

// Furniture System
class FurnitureSystem {
    constructor() {
        this.furnitureObjects = new Map();
        this.isInitialized = false;
    }
    
    async init() {
        console.log('🪑 Initializing Furniture System');
        this.isInitialized = true;
    }
    
    addFurniture(type, position) {
        const furnitureConfig = window.AdvancedSceneSystem.furnitureTypes[type];
        if (!furnitureConfig) {
            console.error('Unknown furniture type:', type);
            return;
        }
        
        // Create simplified furniture mesh
        const furniture = this.createFurnitureMesh(type, furnitureConfig);
        
        // Position furniture
        furniture.position.set(position.x, position.y, position.z);
        if (position.rotation !== undefined) {
            furniture.rotation.y = position.rotation;
        }
        
        // Scale furniture
        if (furnitureConfig.scale) {
            furniture.scale.set(...furnitureConfig.scale);
        }
        
        // Add to scene
        if (window.SceneManager) {
            window.SceneManager.addObject(furniture);
        }
        
        // Store reference
        const furnitureId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        this.furnitureObjects.set(furnitureId, {
            id: furnitureId,
            type: type,
            mesh: furniture,
            interactive: furnitureConfig.interactive,
            position: position
        });
        
        console.log(`🪑 Added ${type} furniture at`, position);
        return furnitureId;
    }
    
    createFurnitureMesh(type, config) {
        // Create simplified 3D representations of furniture
        let geometry, material, mesh;
        
        switch(type) {
            case 'desk':
            case 'coffee_table':
                // Table/desk shape
                geometry = new THREE.BoxGeometry(1.5, 0.1, 0.8);
                material = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                mesh = new THREE.Mesh(geometry, material);
                
                // Add legs
                const legGeometry = new THREE.BoxGeometry(0.05, 0.7, 0.05);
                const legMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
                
                for (let i = 0; i < 4; i++) {
                    const leg = new THREE.Mesh(legGeometry, legMaterial);
                    const x = i % 2 === 0 ? -0.6 : 0.6;
                    const z = i < 2 ? -0.3 : 0.3;
                    leg.position.set(x, -0.4, z);
                    mesh.add(leg);
                }
                break;
                
            case 'chair':
                // Chair shape
                const seatGeometry = new THREE.BoxGeometry(0.5, 0.05, 0.5);
                const seatMaterial = new THREE.MeshLambertMaterial({ color: 0x4169e1 });
                mesh = new THREE.Mesh(seatGeometry, seatMaterial);
                
                // Backrest
                const backGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.05);
                const back = new THREE.Mesh(backGeometry, seatMaterial);
                back.position.set(0, 0.3, -0.22);
                mesh.add(back);
                
                // Chair legs
                for (let i = 0; i < 4; i++) {
                    const leg = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8),
                        new THREE.MeshLambertMaterial({ color: 0x333333 })
                    );
                    const x = i % 2 === 0 ? -0.2 : 0.2;
                    const z = i < 2 ? -0.2 : 0.2;
                    leg.position.set(x, -0.22, z);
                    mesh.add(leg);
                }
                break;
                
            case 'sofa':
                // Sofa shape
                geometry = new THREE.BoxGeometry(2, 0.4, 0.8);
                material = new THREE.MeshLambertMaterial({ color: 0x708090 });
                mesh = new THREE.Mesh(geometry, material);
                
                // Sofa back
                const sofaBackGeometry = new THREE.BoxGeometry(2, 0.6, 0.2);
                const sofaBack = new THREE.Mesh(sofaBackGeometry, material);
                sofaBack.position.set(0, 0.3, -0.3);
                mesh.add(sofaBack);
                
                // Armrests
                const armGeometry = new THREE.BoxGeometry(0.2, 0.4, 0.8);
                const leftArm = new THREE.Mesh(armGeometry, material);
                leftArm.position.set(-0.9, 0.2, 0);
                mesh.add(leftArm);
                
                const rightArm = new THREE.Mesh(armGeometry, material);
                rightArm.position.set(0.9, 0.2, 0);
                mesh.add(rightArm);
                break;
                
            case 'plant':
                // Plant pot and leaves
                const potGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
                const potMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                mesh = new THREE.Mesh(potGeometry, potMaterial);
                
                // Plant leaves
                const leafGeometry = new THREE.SphereGeometry(0.3, 8, 6);
                const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
                const leaves = new THREE.Mesh(leafGeometry, leafMaterial);
                leaves.position.y = 0.4;
                leaves.scale.set(1, 1.5, 1);
                mesh.add(leaves);
                break;
                
            case 'tree':
                // Tree trunk and crown
                const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 8);
                const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                mesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
                
                // Tree crown
                const crownGeometry = new THREE.SphereGeometry(0.8, 12, 8);
                const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
                const crown = new THREE.Mesh(crownGeometry, crownMaterial);
                crown.position.y = 1.2;
                mesh.add(crown);
                break;
                
            case 'lamp':
                // Lamp base and shade
                const baseGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.05, 8);
                const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
                mesh = new THREE.Mesh(baseGeometry, baseMaterial);
                
                // Lamp post
                const postGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
                const post = new THREE.Mesh(postGeometry, baseMaterial);
                post.position.y = 0.4;
                mesh.add(post);
                
                // Lamp shade
                const shadeGeometry = new THREE.ConeGeometry(0.2, 0.3, 8);
                const shadeMaterial = new THREE.MeshLambertMaterial({ color: 0xfffacd });
                const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
                shade.position.y = 0.9;
                mesh.add(shade);
                break;
                
            case 'fountain':
                // Water fountain
                const fountainBase = new THREE.CylinderGeometry(0.8, 1.0, 0.3, 12);
                const fountainMaterial = new THREE.MeshLambertMaterial({ color: 0x708090 });
                mesh = new THREE.Mesh(fountainBase, fountainMaterial);
                
                // Water pillar
                const waterGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8);
                const waterMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x87ceeb, 
                    transparent: true, 
                    opacity: 0.7 
                });
                const water = new THREE.Mesh(waterGeometry, waterMaterial);
                water.position.y = 0.65;
                mesh.add(water);
                break;
                
            case 'disco_ball':
                // Mirror ball
                geometry = new THREE.SphereGeometry(0.3, 16, 16);
                material = new THREE.MeshLambertMaterial({ 
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.9
                });
                mesh = new THREE.Mesh(geometry, material);
                
                // Add sparkle effect
                const sparkles = [];
                for (let i = 0; i < 20; i++) {
                    const sparkle = new THREE.Mesh(
                        new THREE.SphereGeometry(0.01, 4, 4),
                        new THREE.MeshBasicMaterial({ color: 0xffffff })
                    );
                    sparkle.position.set(
                        (Math.random() - 0.5) * 0.6,
                        (Math.random() - 0.5) * 0.6,
                        (Math.random() - 0.5) * 0.6
                    );
                    mesh.add(sparkle);
                    sparkles.push(sparkle);
                }
                
                // Animate sparkles
                setInterval(() => {
                    sparkles.forEach(sparkle => {
                        sparkle.material.opacity = Math.random();
                    });
                }, 200);
                break;
                
            case 'fireplace':
                // Fireplace structure
                geometry = new THREE.BoxGeometry(2, 1.5, 0.5);
                material = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
                mesh = new THREE.Mesh(geometry, material);
                
                // Fire effect
                const fireGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
                const fireMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff4500,
                    transparent: true,
                    opacity: 0.8
                });
                const fire = new THREE.Mesh(fireGeometry, fireMaterial);
                fire.position.set(0, 0.4, 0.2);
                mesh.add(fire);
                
                // Animate fire
                let firePhase = 0;
                setInterval(() => {
                    firePhase += 0.1;
                    fire.scale.y = 1 + Math.sin(firePhase) * 0.3;
                    fire.material.opacity = 0.6 + Math.sin(firePhase * 2) * 0.2;
                }, 100);
                break;
                
            case 'computer':
                // Computer monitor
                const monitorGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.05);
                const monitorMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
                mesh = new THREE.Mesh(monitorGeometry, monitorMaterial);
                
                // Computer base
                const baseGeometry2 = new THREE.BoxGeometry(0.3, 0.1, 0.3);
                const baseMaterial2 = new THREE.MeshLambertMaterial({ color: 0x333333 });
                const base = new THREE.Mesh(baseGeometry2, baseMaterial2);
                base.position.set(0, -0.25, 0);
                mesh.add(base);
                
                // Screen glow
                const screenGeometry = new THREE.PlaneGeometry(0.55, 0.35);
                const screenMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0x0066ff,
                    transparent: true,
                    opacity: 0.3
                });
                const screen = new THREE.Mesh(screenGeometry, screenMaterial);
                screen.position.z = 0.026;
                mesh.add(screen);
                break;
                
            default:
                // Generic furniture - simple box
                geometry = new THREE.BoxGeometry(1, 1, 1);
                material = new THREE.MeshLambertMaterial({ color: 0x808080 });
                mesh = new THREE.Mesh(geometry, material);
                break;
        }
        
        // Add shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Add interaction helper
        if (config.interactive) {
            mesh.userData.interactive = true;
            mesh.userData.furnitureType = type;
        }
        
        return mesh;
    }
    
    clearAll() {
        this.furnitureObjects.forEach(furniture => {
            if (window.SceneManager) {
                window.SceneManager.removeObject(furniture.mesh);
            }
        });
        this.furnitureObjects.clear();
        console.log('🪑 Cleared all furniture');
    }
    
    getFurniture(id) {
        return this.furnitureObjects.get(id);
    }
    
    getAllFurniture() {
        return Array.from(this.furnitureObjects.values());
    }
    
    cleanup() {
        this.clearAll();
    }
}

// Auto-initialize when loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AdvancedSceneSystem.init();
    });
} else {
    window.AdvancedSceneSystem.init();
}