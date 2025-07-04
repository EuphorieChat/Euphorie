// Complete Mobile UI Cleanup - Run this to remove all mobile UI elements
// Add this to your browser console or at the top of your JavaScript

(function() {
    console.log('🧹 Starting complete mobile UI cleanup...');
    
    // 1. Remove all mobile UI related elements by ID
    const elementsToRemove = [
        'mobile-hamburger-btn',
        'mobile-menu',
        'mobile-overlay', 
        'virtual-joystick',
        'quick-actions',
        'quick-actions-expanded',
        'gesture-overlay',
        'context-menu',
        'mobile-chat-overlay',
        'mobile-help-overlay',
        'mobile-ui-styles',
        'emotion-panel',
        'avatar-customization-panel'
    ];
    
    elementsToRemove.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`🗑️ Removing element: ${id}`);
            element.remove();
        }
    });
    
    // 2. Remove all elements with mobile UI classes
    const mobileUIClasses = [
        '.mobile-hamburger-btn',
        '.mobile-menu', 
        '.mobile-overlay',
        '.virtual-joystick',
        '.quick-actions',
        '.quick-actions-expanded',
        '.mobile-notification',
        '.context-menu',
        '.menu-item',
        '.joystick-base',
        '.quick-action-btn'
    ];
    
    mobileUIClasses.forEach(className => {
        const elements = document.querySelectorAll(className);
        elements.forEach(el => {
            console.log(`🗑️ Removing class element: ${className}`);
            el.remove();
        });
    });
    
    // 3. Remove mobile CSS classes from body
    document.body.classList.remove(
        'mobile-ui', 
        'mobile-device', 
        'tablet-device',
        'low-power-mode'
    );
    
    // 4. Remove any mobile CSS styles
    const mobileStyles = document.querySelectorAll('style[id*="mobile"]');
    mobileStyles.forEach(style => {
        console.log('🗑️ Removing mobile CSS');
        style.remove();
    });
    
    // 5. Reset body styles that might have been changed
    document.body.style.overflow = '';
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.body.style.touchAction = '';
    
    // 6. Reset three-container styles
    const threeContainer = document.getElementById('three-container');
    if (threeContainer) {
        threeContainer.style.touchAction = '';
        threeContainer.style.userSelect = '';
        threeContainer.style.webkitUserSelect = '';
    }
    
    // 7. Clear the MobileUI object if it exists
    if (window.MobileUI) {
        console.log('🗑️ Clearing MobileUI object');
        if (window.MobileUI.destroy) {
            try {
                window.MobileUI.destroy();
            } catch(e) {
                console.log('MobileUI destroy failed:', e);
            }
        }
        window.MobileUI = null;
        delete window.MobileUI;
    }
    
    // 8. Remove any event listeners that might have been added
    const newThreeContainer = document.getElementById('three-container');
    if (newThreeContainer) {
        // Clone the element to remove all event listeners
        const cleanContainer = newThreeContainer.cloneNode(true);
        newThreeContainer.parentNode.replaceChild(cleanContainer, newThreeContainer);
        console.log('🗑️ Cleaned three-container event listeners');
    }
    
    // 9. Show/restore desktop elements that might have been hidden
    const desktopElements = document.querySelectorAll('.desktop-only');
    desktopElements.forEach(el => {
        el.style.display = '';
    });
    
    // 10. Reset chat and pet panel positions if they were modified
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) {
        chatPanel.style.bottom = '';
        chatPanel.style.left = '';
        chatPanel.style.right = '';
        chatPanel.style.width = '';
        chatPanel.style.height = '';
    }
    
    const petPanel = document.getElementById('pet-panel');
    if (petPanel) {
        petPanel.style.bottom = '';
        petPanel.style.left = '';
        petPanel.style.right = '';
        petPanel.style.width = '';
        petPanel.style.maxHeight = '';
    }
    
    const controlsPanel = document.getElementById('controls-panel');
    if (controlsPanel) {
        controlsPanel.style.display = '';
    }
    
    const statusPanel = document.getElementById('status-panel');
    if (statusPanel) {
        statusPanel.style.display = '';
    }
    
    console.log('✅ Complete mobile UI cleanup finished!');
    console.log('📱 All mobile UI elements removed');
    console.log('🖥️ Desktop interface should now be fully accessible');
    
    // 11. Optional: Disable mobile UI auto-initialization
    window.MOBILE_UI_DISABLED = true;
    
})();

// Prevent MobileUI from initializing again
document.addEventListener('DOMContentLoaded', () => {
    if (window.MOBILE_UI_DISABLED) {
        console.log('🚫 Mobile UI initialization blocked - cleanup mode active');
        return;
    }
});

console.log('🧹 Mobile UI cleanup script loaded - run the cleanup function to remove all mobile UI elements');