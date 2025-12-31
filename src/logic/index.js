window.addEventListener('load', () => {
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 500);
});

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stringCanvas = document.getElementById('stringCanvas');
const stringCtx = stringCanvas.getContext('2d');
const candyContainer = document.getElementById('candyContainer');
const candyImg = document.getElementById('candyImg');
const anchor = document.getElementById('anchor');
const modalOverlay = document.getElementById('modalOverlay');
const wishText = document.getElementById('wishText');
const closeHint = document.getElementById('closeHint');
const giftBox = document.getElementById('giftBox');
const modalBackgroundImage = document.getElementById('modalBackgroundImage');
const modalConfettiCanvas = document.getElementById('modalConfettiCanvas');
const modalConfettiCtx = modalConfettiCanvas.getContext('2d');
const confettiSound = new Audio('src/assets/audio.mp3');
const isMobile = window.innerWidth <= 768;

if (isMobile) {
    modalBackgroundImage.classList.add('mobile');
    modalBackgroundImage.src = '/src/assets/modalPhone.png';
}

const garlandColors = [
    '#FF0040', '#FF1493', '#FF69B4', '#FF4500',
    '#FFD700', '#FFFF00', '#00FF00', '#00FFFF',
    '#0080FF', '#4169E1', '#8B00FF', '#FF00FF',
    '#FF6347', '#32CD32', '#00CED1', '#FF1493',
    '#FFD700', '#FF8C00', '#00FF7F', '#7B68EE'
];

const lightColors = [];

for (let i = 0; i <= 255; i++) {
    lightColors.push(garlandColors[i % garlandColors.length]);
}

let blinkTime = 0;
let wishes = [];

fetch('src/assets/wishes.json')
    .then(response => response.json())
    .then(data => {
        wishes = data.wishes;
    })
    .catch(error => console.error('Помилка завантаження побажань: ', error));

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stringCanvas.width = window.innerWidth;
    stringCanvas.height = window.innerHeight;
    modalConfettiCanvas.width = window.innerWidth;
    modalConfettiCanvas.height = window.innerHeight;
}

resizeCanvas();

const anchorX = canvas.width / 2;
const anchorY = 0;
const stringLength = 300;
let angle = (Math.random() - 0.5) * 0.3;
let angleVelocity = (Math.random() - 0.5) * 0.05;
const angleAcceleration = 0.0008;
const angleDamping = 0.996;
const confettiPullThreshold = isMobile ? 80 : 100;
const confettiCooldown = 3000;
let lastConfettiTime = 0;
const stringSegments = 20;
const stringPoints = [];

for (let i = 0; i <= stringSegments; i++) {
    stringPoints.push({
        x: anchorX,
        y: anchorY + (stringLength / stringSegments) * i,
        vx: 0,
        vy: 0,
        prevX: anchorX,
        prevY: anchorY + (stringLength / stringSegments) * i
    });
}

let posX = anchorX;
let posY = anchorY + stringLength;
let velocityX = 0;
let velocityY = 0;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseVelocityX = 0;
let mouseVelocityY = 0;
let candyTilt = 0;
let lastPosX = posX;
let lastPosY = posY;
let confetti = [];
let modalConfetti = [];
let confettiTriggered = false;
let wasStretched = false;
let confettiAnimationFinished = false;

anchor.style.left = anchorX + 'px';
anchor.style.top = anchorY + 'px';

function updatePositionFromAngle() {
    const targetX = anchorX + Math.sin(angle) * stringLength;
    const targetY = anchorY + Math.cos(angle) * stringLength;
    posX += (targetX - posX) * 0.3;
    posY += (targetY - posY) * 0.3;
}

updatePositionFromAngle();

function handleStart(e) {
    e.preventDefault();
    isDragging = true;

    const touch = e.touches ? e.touches[0] : e;
    const rect = candyContainer.getBoundingClientRect();

    dragOffsetX = touch.clientX - rect.left - rect.width / 2;
    dragOffsetY = touch.clientY - rect.top - rect.height / 2;
    lastMouseX = touch.clientX;
    lastMouseY = touch.clientY;
    mouseVelocityX = 0;
    mouseVelocityY = 0;
    velocityX = 0;
    velocityY = 0;
    confettiTriggered = false;
    wasStretched = false;
}

function handleMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    const currentVelX = touch.clientX - lastMouseX;
    const currentVelY = touch.clientY - lastMouseY;

    mouseVelocityX = mouseVelocityX * 0.7 + currentVelX * 0.3;
    mouseVelocityY = mouseVelocityY * 0.7 + currentVelY * 0.3;
    lastMouseX = touch.clientX;
    lastMouseY = touch.clientY;

    const targetX = touch.clientX - dragOffsetX;
    const targetY = touch.clientY - dragOffsetY;
    const dx = targetX - anchorX;
    const dy = targetY - anchorY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxStretch = stringLength * 1.5;

    if (distance > maxStretch) {
        posX = anchorX + (dx / distance) * maxStretch;
        posY = anchorY + (dy / distance) * maxStretch;
        wasStretched = true;
    } else {
        posX += (targetX - posX) * 0.3;
        posY += (targetY - posY) * 0.3;
    }

    const currentTime = Date.now();
    const pullDistance = posY - (anchorY + stringLength);

    if (pullDistance > confettiPullThreshold && !confettiTriggered &&
        (currentTime - lastConfettiTime) >= confettiCooldown) {
        createConfettiBurst();
        confettiTriggered = true;
        lastConfettiTime = currentTime;
        confettiAnimationFinished = false;
        velocityY = -8;
        velocityX = (Math.random() - 0.5) * 4;
        confettiSound.currentTime = 0;
        confettiSound.play().catch(e => console.log('Помилка відтворення аудіо: ', e));

        setTimeout(() => {
            showWishModal();
        }, 1000);
    }

    updatePosition();
}

function handleEnd(e) {
    if (!isDragging) return;
    e.preventDefault();

    isDragging = false;

    const dx = posX - anchorX;
    const dy = posY - anchorY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);

    if (currentDistance > stringLength * 1.2 || wasStretched) {
        const normalizedX = anchorX + (dx / currentDistance) * stringLength;
        const normalizedY = anchorY + (dy / currentDistance) * stringLength;

        velocityX = (normalizedX - posX) * 0.3 + mouseVelocityX * 0.8;
        velocityY = (normalizedY - posY) * 0.3 + mouseVelocityY * 0.8;
    } else {
        velocityX = mouseVelocityX * 0.8;
        velocityY = mouseVelocityY * 0.8;
    }

    angle = Math.atan2(dx, dy);

    const tangentialVelocity = velocityX * Math.cos(angle) - velocityY * Math.sin(angle);
    angleVelocity = tangentialVelocity / stringLength;
    angleVelocity += (Math.random() - 0.5) * 0.008;
}

candyContainer.addEventListener('mousedown', handleStart);
candyContainer.addEventListener('touchstart', handleStart, {passive: false});
document.addEventListener('mousemove', handleMove);
document.addEventListener('touchmove', handleMove, {passive: false});
document.addEventListener('mouseup', handleEnd);
document.addEventListener('touchend', handleEnd, {passive: false});

function createConfettiBurst(fromX, fromY, isModal = false) {
    const colors = [
        '#FF0040', '#FF1493', '#FF69B4', '#FF4500',
        '#FFD700', '#FFFF00', '#00FF00', '#00FFFF',
        '#0080FF', '#4169E1', '#8B00FF', '#FF00FF',
        '#FF6347', '#32CD32', '#00CED1', '#FF1493',
        '#FFD700', '#FF8C00', '#00FF7F', '#7B68EE'
    ];

    const shapes = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
    const targetArray = isModal ? modalConfetti : confetti;
    const particleCount = isMobile ? 300 : 600;

    if (fromX !== undefined) {
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
            const speed = Math.random() * 12 + 6;

            targetArray.push({
                x: fromX,
                y: fromY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Math.random() * 4,
                gravity: 0.15,
                size: Math.random() * 10 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 20 - 10,
                opacity: 1,
                life: 550 + Math.random() * 300,
                maxLife: 550 + Math.random() * 300,
                wobble: Math.random() * 2.5 - 1.25
            });
        }
    } else {
        const sideParticles = isMobile ? 150 : 300;

        for (let i = 0; i < sideParticles; i++) {
            const angle = Math.random() * Math.PI / 2.5 - Math.PI / 8;
            const speed = Math.random() * 6 + 4;

            targetArray.push({
                x: 0,
                y: Math.random() * canvas.height * 0.6 + canvas.height * 0.2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Math.random() * 3,
                gravity: 0.12,
                size: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 10 - 5,
                opacity: 1,
                life: 400 + Math.random() * 200,
                maxLife: 400 + Math.random() * 200,
                wobble: Math.random() * 1.5 - 0.75
            });
        }

        for (let i = 0; i < sideParticles; i++) {
            const angle = Math.PI - (Math.random() * Math.PI / 2.5 - Math.PI / 8);
            const speed = Math.random() * 6 + 4;

            targetArray.push({
                x: canvas.width,
                y: Math.random() * canvas.height * 0.6 + canvas.height * 0.2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Math.random() * 3,
                gravity: 0.12,
                size: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 10 - 5,
                opacity: 1,
                life: 400 + Math.random() * 200,
                maxLife: 400 + Math.random() * 200,
                wobble: Math.random() * 1.5 - 0.75
            });
        }
    }
}

function showWishModal() {
    if (wishes.length === 0) return;

    const randomWish = wishes[Math.floor(Math.random() * wishes.length)];
    modalOverlay.classList.add('show');
    wishText.textContent = '';
    closeHint.classList.remove('show');
    giftBox.classList.remove('show');
    giftBox.classList.remove('exploding');

    let charIndex = 0;
    const typewriterSpeed = isMobile ? 40 : 50;

    const typewriterInterval = setInterval(() => {
        if (charIndex < randomWish.length) {
            wishText.textContent += randomWish[charIndex];
            charIndex++;
        } else {
            clearInterval(typewriterInterval);
            setTimeout(() => {
                showGiftBox();
            }, 500);
        }
    }, typewriterSpeed);
}

function showGiftBox() {
    giftBox.classList.add('show');

    setTimeout(() => {
        closeHint.classList.add('show');
    }, 3000);
}

giftBox.addEventListener('click', (e) => {
    e.stopPropagation();

    const rect = giftBox.getBoundingClientRect();
    const giftCenterX = rect.left + rect.width / 2;
    const giftCenterY = rect.top + rect.height / 2;

    giftBox.classList.add('exploding');
    confettiSound.currentTime = 0;
    confettiSound.play().catch(e => console.log('Помилка відтворення аудіо: ', e));
    modalConfettiCanvas.classList.add('show');

    createConfettiBurst(giftCenterX, giftCenterY, true);

    setTimeout(() => {
        giftBox.classList.remove('show');
        giftBox.classList.remove('exploding');
        giftBox.style.animation = '';
    }, 500);
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target.closest('#giftBox')) {
        return;
    }

    modalOverlay.classList.remove('show');
    closeHint.classList.remove('show');
    giftBox.classList.remove('show');
    giftBox.classList.remove('exploding');
    giftBox.style.animation = '';
    modalConfettiCanvas.classList.remove('show');
    modalConfetti = [];
});

function updateString() {
    stringPoints[0].x = anchorX;
    stringPoints[0].y = anchorY;
    stringPoints[stringSegments].x = posX;
    stringPoints[stringSegments].y = posY;

    for (let i = 1; i < stringSegments; i++) {
        const point = stringPoints[i];
        const tempX = point.x;
        const tempY = point.y;

        point.x += (point.x - point.prevX) * 0.99;
        point.y += (point.y - point.prevY) * 0.99;
        point.y += 0.12;
        point.prevX = tempX;
        point.prevY = tempY;
    }

    for (let iter = 0; iter < 5; iter++) {
        for (let i = 0; i < stringSegments; i++) {
            const p1 = stringPoints[i];
            const p2 = stringPoints[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const segmentLength = stringLength / stringSegments;
            const difference = (distance - segmentLength) / distance;
            const offsetX = dx * difference * 0.5;
            const offsetY = dy * difference * 0.5;

            if (i > 0) {
                p1.x += offsetX;
                p1.y += offsetY;
            }

            if (i < stringSegments - 1) {
                p2.x -= offsetX;
                p2.y -= offsetY;
            }
        }
    }
}

function drawString() {
    stringCtx.clearRect(0, 0, stringCanvas.width, stringCanvas.height);
    stringCtx.beginPath();
    stringCtx.moveTo(stringPoints[0].x, stringPoints[0].y);

    for (let i = 0; i < stringSegments; i++) {
        const p1 = stringPoints[i];
        const p2 = stringPoints[i + 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        stringCtx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }

    stringCtx.strokeStyle = '#2d5016';
    stringCtx.lineWidth = 2;
    stringCtx.lineCap = 'round';
    stringCtx.stroke();
    blinkTime += 0.05;

    for (let i = 0; i <= stringSegments; i++) {
        const point = stringPoints[i];
        const blinkOffset = i * 0.5;
        const brightness = 0.7 + Math.sin(blinkTime + blinkOffset) * 0.3;
        const bulbSize = isMobile ? 6 : 8;

        const gradient = stringCtx.createRadialGradient(
            point.x, point.y, 0,
            point.x, point.y, bulbSize * 2.5
        );

        const color = lightColors[i];
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.3, color + '88');
        gradient.addColorStop(1, color + '00');

        stringCtx.globalAlpha = brightness * 0.6;
        stringCtx.fillStyle = gradient;
        stringCtx.beginPath();
        stringCtx.arc(point.x, point.y, bulbSize * 2.5, 0, Math.PI * 2);
        stringCtx.fill();
        stringCtx.globalAlpha = 1;
        stringCtx.fillStyle = color;
        stringCtx.shadowBlur = 15 * brightness;
        stringCtx.shadowColor = color;
        stringCtx.beginPath();
        stringCtx.arc(point.x, point.y, bulbSize, 0, Math.PI * 2);
        stringCtx.fill();
        stringCtx.shadowBlur = 0;
        stringCtx.fillStyle = 'rgba(255, 255, 255, ' + (brightness * 0.8) + ')';
        stringCtx.beginPath();
        stringCtx.arc(point.x - bulbSize * 0.3, point.y - bulbSize * 0.3, bulbSize * 0.4, 0, Math.PI * 2);
        stringCtx.fill();
    }

    stringCtx.globalAlpha = 1;
    stringCtx.shadowBlur = 0;
}

function updateCandyPhysics() {
    const moveSpeedX = posX - lastPosX;
    const moveSpeedY = posY - lastPosY;

    lastPosX = posX;
    lastPosY = posY;

    const targetTilt = moveSpeedX * 2;
    candyTilt += (targetTilt - candyTilt) * 0.15;
    candyTilt = Math.max(-45, Math.min(45, candyTilt));
}

function updatePosition() {
    updateCandyPhysics();

    candyContainer.style.left = (posX - 50) + 'px';
    candyContainer.style.top = (posY - 50) + 'px';
    candyContainer.style.transform = `rotate(${candyTilt - 200}deg)`;
}

function drawConfetti(particle, context) {
    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation * Math.PI / 180);
    context.globalAlpha = particle.opacity;
    context.fillStyle = particle.color;
    context.strokeStyle = particle.color;
    context.lineWidth = 2;

    const size = particle.size;

    switch (particle.shape) {
        case 'circle':
            context.beginPath();
            context.arc(0, 0, size, 0, Math.PI * 2);
            context.fill();
            break;
        case 'square':
            context.fillRect(-size, -size, size * 2, size * 2);
            break;
        case 'triangle':
            context.beginPath();
            context.moveTo(0, -size * 1.2);
            context.lineTo(size * 1.2, size * 1.2);
            context.lineTo(-size * 1.2, size * 1.2);
            context.closePath();
            context.fill();
            break;
        case 'star':
            drawStar(context, 0, 0, 5, size * 1.3, size * 0.6);
            break;
        case 'heart':
            drawHeart(context, size);
            break;
        case 'diamond':
            context.beginPath();
            context.moveTo(0, -size * 1.3);
            context.lineTo(size * 0.8, 0);
            context.lineTo(0, size * 1.3);
            context.lineTo(-size * 0.8, 0);
            context.closePath();
            context.fill();
            break;
    }

    context.restore();
}

function drawStar(context, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    context.beginPath();
    context.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
        let x = cx + Math.cos(rot) * outerRadius;
        let y = cy + Math.sin(rot) * outerRadius;
        context.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        context.lineTo(x, y);
        rot += step;
    }

    context.lineTo(cx, cy - outerRadius);
    context.closePath();
    context.fill();
}

function drawHeart(context, size) {
    context.beginPath();
    context.moveTo(0, size * 0.3);
    context.bezierCurveTo(-size * 1.2, -size * 0.6, -size * 1.8, size * 0.5, 0, size * 1.5);
    context.bezierCurveTo(size * 1.8, size * 0.5, size * 1.2, -size * 0.6, 0, size * 0.3);
    context.closePath();
    context.fill();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    modalConfettiCtx.clearRect(0, 0, modalConfettiCanvas.width, modalConfettiCanvas.height);

    if (!isDragging) {
        if (Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01) {
            posX += velocityX;
            posY += velocityY;
            velocityX *= 0.95;
            velocityY *= 0.95;
            velocityY += 0.3;

            const dx = posX - anchorX;
            const dy = posY - anchorY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > stringLength) {
                posX = anchorX + (dx / distance) * stringLength;
                posY = anchorY + (dy / distance) * stringLength;
                angle = Math.atan2(dx, dy);

                const tangentialVelocity = velocityX * Math.cos(angle) - velocityY * Math.sin(angle);
                angleVelocity = tangentialVelocity / stringLength;
                velocityX = 0;
                velocityY = 0;
            }
        } else {
            const angularAcceleration = -angleAcceleration * Math.sin(angle);
            angleVelocity += angularAcceleration;
            angleVelocity *= angleDamping;
            angle += angleVelocity;

            if (Math.abs(angleVelocity) > 0.001) {
                angle += (Math.random() - 0.5) * 0.0003;
            }

            updatePositionFromAngle();
        }

        updatePosition();
    }

    updateString();
    drawString();

    confetti = confetti.filter(particle => {
        particle.vy += particle.gravity;
        particle.vx += particle.wobble * 0.05;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;
        particle.life--;

        if (particle.life < 150) {
            particle.opacity = particle.life / 150;
        }

        drawConfetti(particle, ctx);

        return particle.life > 0 &&
            particle.y < canvas.height + 100 &&
            particle.x > -100 &&
            particle.x < canvas.width + 100;
    });

    modalConfetti = modalConfetti.filter(particle => {
        particle.vy += particle.gravity;
        particle.vx += particle.wobble * 0.05;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;
        particle.life--;

        if (particle.life < 200) {
            particle.opacity = particle.life / 200;
        }

        drawConfetti(particle, modalConfettiCtx);

        return particle.life > 0 &&
            particle.y < modalConfettiCanvas.height + 100 &&
            particle.x > -100 &&
            particle.x < modalConfettiCanvas.width + 100;
    });

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    const wasMobile = isMobile;
    const isNowMobile = window.innerWidth <= 768;

    if (wasMobile !== isNowMobile) {
        location.reload();
    }

    resizeCanvas();
});

animate();

document.addEventListener('contextmenu', function (e) {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
    }
});

document.addEventListener('dragstart', function (e) {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
    }
});