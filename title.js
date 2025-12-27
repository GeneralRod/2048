// Title page navigation
function goToMenu() {
    window.location.href = 'menu.html';
}

function goToGame() {
    window.location.href = 'game.html';
}

// Add some entrance animations
document.addEventListener('DOMContentLoaded', function() {
    const titleLogo = document.querySelector('.title-logo');
    const subtitle = document.querySelector('.title-subtitle');
    const buttons = document.querySelector('.menu-buttons');
    const credits = document.querySelector('.credits');
    
    // Staggered entrance animation
    setTimeout(() => {
        titleLogo.style.opacity = '1';
        titleLogo.style.transform = 'scale(1)';
    }, 100);
    
    setTimeout(() => {
        subtitle.style.opacity = '1';
        subtitle.style.transform = 'translateY(0)';
    }, 600);
    
    setTimeout(() => {
        buttons.style.opacity = '1';
        buttons.style.transform = 'translateY(0)';
    }, 1100);
    
    setTimeout(() => {
        credits.style.opacity = '1';
    }, 1600);
});
