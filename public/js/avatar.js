const mouth = document.getElementById('mouth');
let animationInterval;

// Simula el movimiento de la boca mientras habla
function startMouthAnimation() {
    const originalD = "M 70 130 Q 100 130 130 130";
    const openD = "M 70 130 Q 100 160 130 130";
    let isOpen = false;

    animationInterval = setInterval(() => {
        isOpen = !isOpen;
        mouth.setAttribute('d', isOpen ? openD : originalD);
    }, 150);
}

function stopMouthAnimation() {
    clearInterval(animationInterval);
    mouth.setAttribute('d', "M 70 130 Q 100 130 130 130");
}

window.avatarAnimation = { startMouthAnimation, stopMouthAnimation };
