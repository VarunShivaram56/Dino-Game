let score = 0;
let highScore = 0;
let cross = true;
let gameActive = false;
let gameStarted = false;
let animationSpeed = 3;

const dino = document.getElementById('dino');
const obstacle = document.getElementById('obstacle');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const gameOverlay = document.getElementById('gameOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const welcomeScreen = document.getElementById('welcomeScreen');

// Load high score from localStorage
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('dinoHighScore')) {
        highScore = parseInt(localStorage.getItem('dinoHighScore'));
        highScoreDisplay.textContent = highScore;
    }
});

function startGame() {
    welcomeScreen.classList.add('hidden');
    setTimeout(() => {
        gameActive = true;
        gameStarted = true;
        obstacle.classList.add('obstacleAni');
    }, 500);
}

function restartGame() {
    score = 0;
    cross = true;
    animationSpeed = 3;
    scoreDisplay.textContent = '0';
    gameOverlay.classList.remove('active');
    obstacle.style.animation = 'none';
    setTimeout(() => {
        obstacle.style.animation = '';
        obstacle.classList.add('obstacleAni');
        gameActive = true;
    }, 10);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!gameStarted) {
        if (e.code === 'Space') {
            startGame();
        }
        return;
    }

    if (!gameActive && e.code === 'Space') {
        restartGame();
        return;
    }

    if (!gameActive) return;

    // Jump
    if (e.code === 'ArrowUp' || e.code === 'Space') {
        if (!dino.classList.contains('animateDino')) {
            dino.classList.add('animateDino');
            setTimeout(() => {
                dino.classList.remove('animateDino');
            }, 600);
        }
    }

    // Move right
    if (e.code === 'ArrowRight') {
        let dinoX = parseInt(window.getComputedStyle(dino).left);
        if (dinoX < window.innerWidth - 150) {
            dino.style.left = (dinoX + 80) + 'px';
        }
    }

    // Move left
    if (e.code === 'ArrowLeft') {
        let dinoX = parseInt(window.getComputedStyle(dino).left);
        if (dinoX > 50) {
            dino.style.left = (dinoX - 80) + 'px';
        }
    }
});

// Touch controls for mobile
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
    if (!gameStarted) {
        startGame();
        return;
    }

    if (!gameActive) {
        restartGame();
        return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Vertical swipe - jump
        if (deltaY < -30 && !dino.classList.contains('animateDino')) {
            dino.classList.add('animateDino');
            setTimeout(() => {
                dino.classList.remove('animateDino');
            }, 600);
        }
    } else {
        // Horizontal swipe - move
        let dinoX = parseInt(window.getComputedStyle(dino).left);
        if (deltaX > 30 && dinoX < window.innerWidth - 150) {
            dino.style.left = (dinoX + 80) + 'px';
        } else if (deltaX < -30 && dinoX > 50) {
            dino.style.left = (dinoX - 80) + 'px';
        }
    }
});

// Create particles effect
function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.bottom = y + 'px';
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;
        document.getElementById('gameContainer').appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

// Game loop - collision detection and scoring
const gameLoop = setInterval(() => {
    if (!gameActive) return;

    const dinoRect = dino.getBoundingClientRect();
    const obstacleRect = obstacle.getBoundingClientRect();

    const dx = dinoRect.left;
    const dy = window.innerHeight - dinoRect.bottom;

    const ox = obstacleRect.left;
    const oy = window.innerHeight - obstacleRect.bottom;

    const offsetX = Math.abs(dx - ox);
    const offsetY = Math.abs(dy - oy);

    // Collision detection
    if (offsetX < 50 && offsetY < 50) {
        gameActive = false;
        obstacle.classList.remove('obstacleAni');
        gameOverlay.classList.add('active');
        finalScoreDisplay.textContent = score;

        // Update high score
        if (score > highScore) {
            highScore = score;
            highScoreDisplay.textContent = highScore;
            localStorage.setItem('dinoHighScore', highScore);
        }
    }
    // Score increment
    else if (offsetX < 100 && cross && ox < dx) {
        score += 1;
        scoreDisplay.textContent = score;
        cross = false;
        
        // Create particle effect
        createParticles(dx + 30, 180);

        setTimeout(() => {
            cross = true;
        }, 1000);

        // Increase difficulty every 5 points
        if (score % 5 === 0 && animationSpeed > 1.2) {
            animationSpeed -= 0.15;
            obstacle.style.animationDuration = animationSpeed + 's';
        }
    }
}, 10);