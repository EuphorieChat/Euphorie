// Debug version of main.js to test Capacitor integration
console.log('Euphorie AI Starting...');

// Debug: Check what's available in the global scope
console.log('window.Capacitor:', window.Capacitor);
console.log('window.CapacitorWebPlugin:', window.CapacitorWebPlugin);

let isCapacitorApp = false;

// More thorough Capacitor detection
if (typeof window !== 'undefined') {
    console.log('Window is available');
    
    if (window.Capacitor) {
        isCapacitorApp = true;
        console.log('✅ Capacitor detected');
        console.log('Platform:', window.Capacitor.getPlatform());
        console.log('Native platform:', window.Capacitor.isNativePlatform());
        console.log('Plugins available:', Object.keys(window.Capacitor.Plugins || {}));
    } else {
        console.log('❌ Capacitor NOT detected');
        console.log('Available globals:', Object.keys(window).filter(key => key.toLowerCase().includes('cap')));
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('App loaded, performing diagnostics...');
    await performDiagnostics();
    checkAIService();
});

async function performDiagnostics() {
    console.log('\n=== CAPACITOR DIAGNOSTICS ===');
    
    // Check if Capacitor is available
    if (!window.Capacitor) {
        console.log('❌ Capacitor not found in window object');
        console.log('This suggests the app is running in browser mode, not Capacitor');
        return;
    }
    
    // Check platform
    const platform = window.Capacitor.getPlatform();
    console.log('Platform:', platform);
    
    // Check if it's a native platform
    const isNative = window.Capacitor.isNativePlatform();
    console.log('Is Native Platform:', isNative);
    
    // Try to access Camera plugin
    try {
        console.log('Attempting to load Camera plugin...');
        
        // Check if Camera is available in Plugins
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
            console.log('✅ Camera plugin found in Capacitor.Plugins');
            
            // Try to check permissions
            try {
                const permissions = await window.Capacitor.Plugins.Camera.checkPermissions();
                console.log('Camera permissions status:', permissions);
            } catch (permError) {
                console.log('❌ Error checking permissions:', permError);
            }
            
        } else {
            console.log('❌ Camera plugin not found in Capacitor.Plugins');
            console.log('Available plugins:', Object.keys(window.Capacitor.Plugins || {}));
        }
        
        // Try dynamic import method
        try {
            const { Camera } = await import('@capacitor/camera');
            console.log('✅ Camera module imported successfully');
            console.log('Camera methods:', Object.getOwnPropertyNames(Camera));
            
            // Test permission check without taking photo
            const permissions = await Camera.checkPermissions();
            console.log('Camera permissions via import:', permissions);
            
        } catch (importError) {
            console.log('❌ Failed to import Camera module:', importError);
        }
        
    } catch (error) {
        console.log('❌ Error during camera diagnostics:', error);
    }
    
    console.log('=== END DIAGNOSTICS ===\n');
}

window.initializeApp = async function() {
    console.log('\n=== CAMERA TEST START ===');
    
    const placeholder = document.getElementById('camera-placeholder');
    
    if (!window.Capacitor) {
        placeholder.innerHTML = `
            <div style="text-align: center; color: #ff6b6b;">
                <h3>Capacitor Not Detected</h3>
                <p>The app is running in browser mode.</p>
                <p>Camera functionality requires a native app environment.</p>
                <button class="start-button" onclick="location.reload()">Refresh & Retry</button>
            </div>
        `;
        return;
    }
    
    try {
        console.log('Attempting camera access...');
        
        // Method 1: Try via Capacitor.Plugins
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
            console.log('Using Capacitor.Plugins.Camera');
            
            const image = await window.Capacitor.Plugins.Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: 'Base64',
                source: 'Camera'
            });
            
            console.log('✅ Photo captured via Capacitor.Plugins');
            displayResult('Success! Photo captured via Capacitor.Plugins.Camera', image.base64String);
            return;
        }
        
        // Method 2: Try dynamic import
        console.log('Trying dynamic import method...');
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        
        console.log('Camera module imported, attempting getPhoto...');
        
        const image = await Camera.getPhoto({
            quality: 80,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera
        });
        
        console.log('✅ Photo captured via dynamic import');
        displayResult('Success! Photo captured via dynamic import', image.base64String);
        
    } catch (error) {
        console.log('❌ Camera test failed:', error);
        
        displayResult('Camera Test Failed', null, error.message);
    }
    
    console.log('=== CAMERA TEST END ===\n');
};

function displayResult(message, base64String, errorMessage) {
    const placeholder = document.getElementById('camera-placeholder');
    
    let content = `
        <div style="text-align: center;">
            <h3 style="color: ${errorMessage ? '#ff6b6b' : '#00ff88'};">${message}</h3>
    `;
    
    if (base64String) {
        content += `
            <img src="data:image/jpeg;base64,${base64String}" 
                 style="max-width: 90%; max-height: 300px; object-fit: contain; border-radius: 8px; margin: 1rem 0;">
        `;
    }
    
    if (errorMessage) {
        content += `
            <div style="background: rgba(255,107,107,0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                <p style="color: #ff6b6b; font-family: monospace; font-size: 0.9rem;">${errorMessage}</p>
            </div>
        `;
    }
    
    content += `
            <div style="margin-top: 1rem;">
                <button class="start-button" onclick="initializeApp()">
                    Try Again
                </button>
                <button class="start-button" onclick="performDiagnostics()" style="margin-left: 1rem; background: rgba(0,153,255,0.8);">
                    Run Diagnostics
                </button>
            </div>
        </div>
    `;
    
    placeholder.innerHTML = content;
}

async function checkAIService() {
    const statusEl = document.getElementById('status-indicator');
    
    try {
        statusEl.textContent = 'Capacitor Debug Mode';
        statusEl.className = 'status-indicator connected';
    } catch (error) {
        statusEl.textContent = 'Debug mode';
        statusEl.className = 'status-indicator disconnected';
    }
}

// Make functions globally available
window.performDiagnostics = performDiagnostics;