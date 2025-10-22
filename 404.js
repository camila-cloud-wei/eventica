// Simple 404 page functionality

// Initialize the 404 page
function init404Page() {
    console.log('Eventica 404 Page - The page you were looking for was not found.');
    
    // Add subtle interaction to the 404 numbers
    addNumberInteractions();
    
    // Add navigation helper
    setupNavigation();
}

// Add subtle hover effects to numbers
function addNumberInteractions() {
    const digits = document.querySelectorAll('.digit');
    
    digits.forEach(digit => {
        digit.addEventListener('mouseover', () => {
            digit.style.transform = 'scale(1.1)';
            digit.style.transition = 'transform 0.2s ease';
        });
        
        digit.addEventListener('mouseout', () => {
            digit.style.transform = 'scale(1)';
        });
        
        digit.addEventListener('click', () => {
            // Create a subtle ripple effect
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(0, 102, 255, 0.1);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            const rect = digit.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${rect.left + window.scrollX}px`;
            ripple.style.top = `${rect.top + window.scrollY}px`;
            
            document.body.appendChild(ripple);
            
            // Add ripple animation
            const style = document.createElement('style');
            if (!document.querySelector('#ripple-style')) {
                style.id = 'ripple-style';
                style.textContent = `
                    @keyframes ripple {
                        to {
                            transform: scale(2.5);
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Remove ripple after animation
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Setup navigation helpers
function setupNavigation() {
    // Track link clicks for analytics (in a real application)
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            console.log(`Navigating to: ${link.href}`);
            // In a real app, you might send this to analytics
        });
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Escape key goes back in history
        if (e.key === 'Escape') {
            if (document.referrer && !document.referrer.includes(window.location.hostname)) {
                window.location.href = 'index.html';
            } else {
                window.history.back();
            }
        }
    });
}

// Show a helpful message in console
console.log(`
╔═══════════════════════════════════════╗
║            Eventica 404               ║
║                                       ║
║   The page you're looking for isn't   ║
║   here, but don't worry - our event   ║
║   registration is still working!      ║
║                                       ║
║   Press Escape to go back or use      ║
║   the links above to navigate.        ║
╚═══════════════════════════════════════╝
`);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init404Page);