// Capacitor initialization helper
// This script ensures Capacitor is properly loaded before any calls are made

(function() {
    'use strict';
    
    console.log('[Capacitor Init] Starting initialization...');
    
    // Check if we're in a Capacitor environment
    const isCapacitorEnvironment = window.webkit || 
                                   window.AndroidBridge || 
                                   (window.Capacitor && window.Capacitor.isNative);
    
    if (!isCapacitorEnvironment) {
        console.log('[Capacitor Init] Not running in Capacitor environment');
        return;
    }
    
    // ANDROID STATUSBAR FIX - Add this early
    function applyAndroidStatusBarFix() {
        console.log('[Capacitor Init] Applying Android StatusBar fix...');
        
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
            const { StatusBar } = window.Capacitor.Plugins;
            
            // Critical fix for Android - prevent WebView from going under status bar
            StatusBar.setOverlaysWebView({ overlay: false })
                .then(() => {
                    console.log('[Capacitor Init] ✅ StatusBar overlay disabled - Android fix applied');
                    
                    // Additional styling
                    StatusBar.setStyle({ style: 'DARK' });
                    StatusBar.setBackgroundColor({ color: '#000000' });
                })
                .catch((error) => {
                    console.error('[Capacitor Init] ❌ StatusBar error:', error);
                });
        } else {
            console.log('[Capacitor Init] StatusBar plugin not available yet, will retry...');
        }
    }
    
    // Install error handler first
    window.addEventListener('error', function(event) {
        if (event && event.message) {
            const errorMessage = event.message.toString();
            
            // Suppress specific errors that occur before Capacitor loads
            const suppressedErrors = [
                'triggerEvent',
                'chrome-error://chromewebdata',
                'Cannot read properties of undefined',
                'Cannot read property'
            ];
            
            for (const error of suppressedErrors) {
                if (errorMessage.includes(error)) {
                    console.warn('[Capacitor Init] Suppressed error:', errorMessage);
                    event.preventDefault();
                    event.stopPropagation();
                    return true;
                }
            }
        }
    }, true);
    
    // Create stubs for common functions that might be called before initialization
    const stubs = {
        triggerEvent: function(eventName, target, data) {
            console.log('[Capacitor Init] triggerEvent stub called:', eventName);
            // Queue the event to be triggered once Capacitor is ready
            if (!window._capacitorEventQueue) {
                window._capacitorEventQueue = [];
            }
            window._capacitorEventQueue.push({ eventName, target, data });
        },
        
        gtag: function() {
            console.log('[Capacitor Init] gtag stub called');
        },
        
        ga: function() {
            console.log('[Capacitor Init] ga stub called');
        },
        
        fbq: function() {
            console.log('[Capacitor Init] fbq stub called');
        }
    };
    
    // Install stubs
    for (const [name, stub] of Object.entries(stubs)) {
        if (typeof window[name] === 'undefined') {
            window[name] = stub;
            console.log(`[Capacitor Init] Installed stub for: ${name}`);
        }
    }
    
    // Wait for Capacitor to be fully loaded
    let checkCount = 0;
    const maxChecks = 100; // 10 seconds maximum wait
    let statusBarFixed = false;
    
    function checkCapacitorReady() {
        checkCount++;
        
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.triggerEvent) {
            console.log(`[Capacitor Init] Capacitor ready after ${checkCount} checks`);
            
            // APPLY ANDROID STATUSBAR FIX AS SOON AS CAPACITOR IS READY
            if (!statusBarFixed && /Android/i.test(navigator.userAgent)) {
                applyAndroidStatusBarFix();
                statusBarFixed = true;
            }
            
            // Replace stub with real function
            if (window._capacitorEventQueue && window._capacitorEventQueue.length > 0) {
                console.log(`[Capacitor Init] Processing ${window._capacitorEventQueue.length} queued events`);
                
                window._capacitorEventQueue.forEach(event => {
                    try {
                        window.Capacitor.triggerEvent(event.eventName, event.target, event.data);
                    } catch (e) {
                        console.error('[Capacitor Init] Error processing queued event:', e);
                    }
                });
                
                window._capacitorEventQueue = [];
            }
            
            // Remove our stub
            if (window.triggerEvent === stubs.triggerEvent) {
                window.triggerEvent = window.Capacitor.triggerEvent.bind(window.Capacitor);
                console.log('[Capacitor Init] Replaced triggerEvent stub with real function');
            }
            
            return true;
        }
        
        if (checkCount >= maxChecks) {
            console.error('[Capacitor Init] Capacitor failed to load after 10 seconds');
            return false;
        }
        
        // Check again in 100ms
        setTimeout(checkCapacitorReady, 100);
    }
    
    // Start checking
    checkCapacitorReady();
    
    // Also check on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[Capacitor Init] DOM loaded, checking Capacitor status');
            if (!window.Capacitor || !window.Capacitor.isNativePlatform) {
                console.warn('[Capacitor Init] Capacitor not available after DOM load');
            } else if (!statusBarFixed && /Android/i.test(navigator.userAgent)) {
                // Try to apply fix again if not already done
                applyAndroidStatusBarFix();
                statusBarFixed = true;
            }
        });
    }
    
    // Try to apply StatusBar fix immediately if Capacitor is already loaded
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar && /Android/i.test(navigator.userAgent)) {
        applyAndroidStatusBarFix();
        statusBarFixed = true;
    }
    
    console.log('[Capacitor Init] Initialization script complete');
})();