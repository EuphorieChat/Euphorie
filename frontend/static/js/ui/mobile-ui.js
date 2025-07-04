// Aggressive Mobile UI Removal - Run this in browser console
// This will find and remove ANY element that could be blocking the interface

(function() {
    console.log('🔥 Starting aggressive mobile UI removal...');
    
    // 1. Search and destroy by text content
    const problematicTexts = [
        'Euphorie Menu',
        'Avatar', 
        'Customize',
        'Emotions',
        'Wave',
        'Dance', 
        'Pets & Friends',
        'Get Pet',
        'Pet Care',
        'Add Friends',
        'Group Fun',
        'Environment',
        'Scenes',
        'Weather',
        'Magic',
        'Settings',
        'Graphics',
        'Help'
    ];
    
    problematicTexts.forEach(text => {
        const xpath = `//*[contains(text(), "${text}")]`;
        const result = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
        
        for (let i = 0; i < result.snapshotLength; i++) {
            const element = result.snapshotItem(i);
            const parent = element.closest('div');
            if (parent && (
                parent.classList.contains('menu') ||
                parent.classList.contains('mobile') ||
                parent.id.includes('menu') ||
                parent.id.includes('mobile') ||
                parent.style.position === 'fixed' ||
                parent.style.position === 'absolute'
            )) {
                console.log(`🗑️ Removing element containing: "${text}"`);
                parent.remove();
            }
        }
    });
    
    // 2. Remove any fixed/absolute positioned elements that might be menus
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const isBlocking = (
            (style.position === 'fixed' || style.position === 'absolute') &&
            (style.zIndex > 900) &&
            (el.offsetWidth > 200 || el.offsetHeight > 200) &&
            !el.id.includes('three-container') &&
            !el.id.includes('chat-panel') &&
            !el.id.includes('pet-panel') &&
            !el.id.includes('status-panel') &&
            !el.id.includes('loading')
        );
        
        if (isBlocking) {
            console.log(`🗑️ Removing potentially blocking element:`, el.id || el.className);
            el.remove();
        }
    });
    
    // 3. Specifically target hamburger buttons and menus
    const hamburgerSelectors = [
        '[class*="hamburger"]',
        '[class*="menu"]',
        '[id*="hamburger"]', 
        '[id*="menu"]',
        '[class*="mobile"]',
        '[id*="mobile"]'
    ];
    
    hamburgerSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            // Skip essential elements
            if (el.id === 'three-container' || 
                el.id === 'chat-panel' || 
                el.id === 'pet-panel' ||
                el.id === 'status-panel' ||
                el.id === 'loading-screen') {
                return;
            }
            console.log(`🗑️ Removing menu element: ${selector}`);
            el.remove();
        });
    });
    
    // 4. Remove elements with high z-index that might be overlays
    const highZElements = document.querySelectorAll('*');
    highZElements.forEach(el => {
        const zIndex = parseInt(window.getComputedStyle(el).zIndex);
        if (zIndex > 1000 && 
            !el.id.includes('loading') && 
            !el.classList.contains('notification')) {
            console.log(`🗑️ Removing high z-index element (${zIndex}):`, el.id || el.className);
            el.remove();
        }
    });
    
    // 5. Look for elements that might have "menu" in data attributes
    const dataMenuElements = document.querySelectorAll('[data-action]');
    dataMenuElements.forEach(el => {
        const parent = el.closest('div');
        if (parent && parent.children.length > 3) { // Likely a menu container
            console.log('🗑️ Removing data-action menu container');
            parent.remove();
        }
    });
    
    // 6. Nuclear option - remove any element with emoji icons that could be menu items
    const emojiPattern = /[🎮👤🎨🎭👋💃🐾🐱🎾👥🎉🌍🏠🌦️✨⚙️❓]/;
    const allTextElements = document.querySelectorAll('*');
    allTextElements.forEach(el => {
        if (el.textContent && emojiPattern.test(el.textContent)) {
            const container = el.closest('div');
            if (container && 
                container.children.length > 2 && 
                !container.id.includes('chat') &&
                !container.id.includes('status')) {
                console.log('🗑️ Removing emoji menu container:', el.textContent.substring(0, 20));
                container.remove();
            }
        }
    });
    
    // 7. Check for elements that are covering the three-container
    const threeContainer = document.getElementById('three-container');
    if (threeContainer) {
        const containerRect = threeContainer.getBoundingClientRect();
        const allEls = document.querySelectorAll('*');
        
        allEls.forEach(el => {
            if (el === threeContainer) return;
            
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            
            // Check if element is overlapping three-container
            const isOverlapping = (
                rect.left < containerRect.right &&
                rect.right > containerRect.left &&
                rect.top < containerRect.bottom &&
                rect.bottom > containerRect.top
            );
            
            const isBlocking = (
                isOverlapping &&
                (style.position === 'fixed' || style.position === 'absolute') &&
                style.zIndex !== 'auto' &&
                parseInt(style.zIndex) > 0 &&
                el.offsetWidth > 100 &&
                el.offsetHeight > 100
            );
            
            if (isBlocking) {
                console.log('🗑️ Removing overlapping element:', el.id || el.className);
                el.remove();
            }
        });
    }
    
    // 8. Remove any backdrop/overlay elements
    const backdropSelectors = [
        '[class*="backdrop"]',
        '[class*="overlay"]', 
        '[style*="backdrop-filter"]',
        '[style*="rgba(0, 0, 0"]'
    ];
    
    backdropSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (!el.id.includes('three-container')) {
                console.log(`🗑️ Removing backdrop element: ${selector}`);
                el.remove();
            }
        });
    });
    
    // 9. Final cleanup - remove any remaining mobile-related CSS
    const allStyles = document.querySelectorAll('style');
    allStyles.forEach(style => {
        if (style.textContent.includes('mobile-') || 
            style.textContent.includes('hamburger') ||
            style.textContent.includes('.menu-')) {
            console.log('🗑️ Removing mobile CSS');
            style.remove();
        }
    });
    
    // 10. Reset any body styles that might be blocking interaction
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.height = '';
    document.body.style.width = '';
    document.body.style.touchAction = '';
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    
    // 11. Ensure three-container is accessible
    if (threeContainer) {
        threeContainer.style.pointerEvents = 'auto';
        threeContainer.style.position = 'relative';
        threeContainer.style.zIndex = '1';
        threeContainer.style.width = '100%';
        threeContainer.style.height = '100%';
    }
    
    console.log('🔥 Aggressive cleanup complete!');
    console.log('✅ All potentially blocking elements removed');
    console.log('🖱️ Interface should now be fully accessible');
    
    // 12. Prevent any scripts from re-creating mobile UI
    window.createHamburgerMenu = function() { console.log('🚫 Hamburger menu creation blocked'); };
    window.createMobileInterface = function() { console.log('🚫 Mobile interface creation blocked'); };
    window.MobileUI = { init: function() { console.log('🚫 MobileUI init blocked'); } };
    
})();

console.log('🔥 Aggressive mobile UI removal script ready - run to destroy all blocking elements');