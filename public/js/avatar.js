const avatarImg = document.getElementById('bot-avatar');

// Simula el movimiento del avatar mientras habla
function startMouthAnimation() {
    if (avatarImg) {
        avatarImg.classList.add('speaking');
    }
}

function stopMouthAnimation() {
    if (avatarImg) {
        avatarImg.classList.remove('speaking');
    }
}

window.avatarAnimation = { startMouthAnimation, stopMouthAnimation };
