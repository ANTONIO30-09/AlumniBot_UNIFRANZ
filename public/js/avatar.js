const avatarImg = document.getElementById('bot-avatar');

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
