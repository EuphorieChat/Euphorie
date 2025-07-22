document.addEventListener('DOMContentLoaded', () => {
    // Animate existing messages on load
    const animateMessages = () => {
        const messages = document.querySelectorAll('.chat-message, .ai-message');
        messages.forEach((msg, index) => {
            msg.style.opacity = '0';
            msg.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                msg.style.transition = 'all 0.4s ease';
                msg.style.opacity = '1';
                msg.style.transform = 'translateY(0)';
            }, index * 50);
        });
    };
    
    // Run after a short delay to ensure elements are loaded
    setTimeout(animateMessages, 500);
    
    // Add ripple effect to buttons
    const addRipple = (button) => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                transform: translate(${x}px, ${y}px) scale(0);
                animation: rippleEffect 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    };
    
    // Apply ripple to all buttons
    document.querySelectorAll('button').forEach(addRipple);
});

// Add ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes rippleEffect {
        to {
            transform: translate(var(--x, 0), var(--y, 0)) scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);