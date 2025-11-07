// Game Variables
const gameContainer = document.getElementById('gameContainer');
const dino = document.getElementById('dino');
const dragon = document.getElementById('dragon');
const ground = document.getElementById('ground');
const currentScoreEl = document.getElementById('currentScore');
const highScoreEl = document.getElementById('highScore');
const scoreGapEl = document.getElementById('scoreGap');
const welcomeScreen = document.getElementById('welcomeScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const finalScoreEl = document.getElementById('finalScore');
const motivationMsgEl = document.getElementById('motivationMsg');

let score = 0;
let highScore = localStorage.getItem('dinoHighScore') || 0;
let gameRunning = false;
let isJumping = false;
let obstacles = [];
let obstacleSpeed = 5;
let obstacleFrequency = 2000;
let lastObstacleTime = 0;
let dragonActive = false;
let dragonSpeed = 6;
let gameLoopId;
let obstacleId = 0;

// Initialize high score display
highScoreEl.textContent = highScore;

// Start game function
function startGame() {
    welcomeScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    score = 0;
    gameRunning = true;
    isJumping = false;
    obstacles = [];
    obstacleSpeed = 5;
    obstacleFrequency = 2000;
    lastObstacleTime = Date.now();
    dragonActive = false;
    dragon.style.display = 'none';
    updateScore();
    gameLoop();
}

// Jump function with smooth animation
function jump() {
    if (!gameRunning || isJumping) return;
    
    isJumping = true;
    const jumpHeight = 200;
    const originalBottom = 100;
    
    // Jump up
    dino.style.bottom = (originalBottom + jumpHeight) + 'px';
    
    // Fall down after 500ms
    setTimeout(() => {
        dino.style.bottom = originalBottom + 'px';
        // Reset jumping flag after landing
        setTimeout(() => {
            isJumping = false;
        }, 300);
    }, 500);
}

// Create rock obstacle SVG
function createRockSVG() {
    return `<svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M 5 45 L 10 25 L 15 30 L 20 10 L 25 20 L 30 15 L 35 40 L 30 50 L 10 50 Z" 
              fill="#696969" stroke="#404040" stroke-width="2"/>
        <ellipse cx="15" cy="35" rx="3" ry="4" fill="#808080" opacity="0.5"/>
        <ellipse cx="25" cy="30" rx="2" ry="3" fill="#505050" opacity="0.6"/>
    </svg>`;
}

// Create obstacle (rock)
function createObstacle() {
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle';
    obstacle.id = 'obstacle-' + obstacleId++;
    obstacle.innerHTML = createRockSVG();
    obstacle.style.right = '-50px';
    gameContainer.appendChild(obstacle);
    obstacles.push({
        element: obstacle,
        type: 'rock',
        scored: false
    });
}

// Create dragon
function createDragon() {
    dragon.style.right = '-80px';
    dragon.style.display = 'block';
    dragonActive = true;
}

// Update score display
function updateScore() {
    currentScoreEl.textContent = score;
    
    if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = highScore;
        localStorage.setItem('dinoHighScore', highScore);
        scoreGapEl.style.display = 'none';
    } else if (score > 0) {
        const gap = highScore - score;
        scoreGapEl.style.display = 'block';
        scoreGapEl.querySelector('span').textContent = `${gap} points to beat high score!`;
    }
}

// Update difficulty based on score
function updateDifficulty() {
    const difficultyLevel = Math.floor(score / 10);
    
    // Increase obstacle speed by 1.5x for every 10 points
    obstacleSpeed = 5 + (difficultyLevel * 1.5);
    
    // Decrease obstacle frequency (more obstacles)
    obstacleFrequency = Math.max(1000, 2000 - (difficultyLevel * 150));
    
    // Increase dragon speed
    if (difficultyLevel > 0) {
        dragonSpeed = 6 + (difficultyLevel * 1);
    }
}

// Collision detection with margin for better gameplay
function checkCollision(obj1, obj2) {
    const rect1 = obj1.getBoundingClientRect();
    const rect2 = obj2.getBoundingClientRect();
    
    // Add small margin for more forgiving collision
    const margin = 10;
    
    return !(
        rect1.right - margin < rect2.left + margin ||
        rect1.left + margin > rect2.right - margin ||
        rect1.bottom - margin < rect2.top + margin ||
        rect1.top + margin > rect2.bottom - margin
    );
}

// Game over function
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(gameLoopId);
    
    // Display final score
    finalScoreEl.textContent = `Your Score: ${score}`;
    
    // Generate motivational message
    if (score >= highScore) {
        motivationMsgEl.textContent = '🎉 NEW HIGH SCORE! You are amazing! 🎉';
    } else if (score >= highScore * 0.8) {
        motivationMsgEl.textContent = '👏 So close! Just a bit more to beat the high score!';
    } else if (score >= highScore * 0.5) {
        motivationMsgEl.textContent = '💪 Good effort! Keep practicing!';
    } else {
        motivationMsgEl.textContent = '🚀 Don\'t give up! You can do better!';
    }
    
    // Clean up obstacles
    obstacles.forEach(obs => {
        if (obs.element && obs.element.parentNode) {
            obs.element.remove();
        }
    });
    obstacles = [];
    dragon.style.display = 'none';
    dragonActive = false;
    
    // Show game over screen
    gameOverScreen.style.display = 'flex';
}

// Main game loop
function gameLoop() {
    if (!gameRunning) return;
    
    const currentTime = Date.now();
    
    // Spawn obstacles based on frequency and rationality
    if (currentTime - lastObstacleTime > obstacleFrequency) {
        // Dragon appears after score 10 with 30% probability
        const shouldSpawnDragon = score >= 10 && Math.random() < 0.3 && !dragonActive;
        const shouldSpawnRock = Math.random() < 0.7;
        
        // Check if there's enough space between obstacles for rational gameplay
        const dinoRect = dino.getBoundingClientRect();
        const hasNearbyObstacle = obstacles.some(obs => {
            const obsRect = obs.element.getBoundingClientRect();
            return obsRect.right > dinoRect.left - 200; // Minimum 200px spacing
        });
        
        if (!hasNearbyObstacle) {
            if (shouldSpawnDragon && !dragonActive) {
                createDragon();
                lastObstacleTime = currentTime;
            } else if (shouldSpawnRock) {
                createObstacle();
                lastObstacleTime = currentTime;
            }
        }
    }
    
    // Move and check obstacles
    obstacles.forEach((obs, index) => {
        const currentRight = parseInt(obs.element.style.right) || 0;
        obs.element.style.right = (currentRight + obstacleSpeed) + 'px';
        
        // Check collision
        if (checkCollision(dino, obs.element)) {
            gameOver();
            return;
        }
        
        // Remove obstacle if off screen and update score
        const obsRect = obs.element.getBoundingClientRect();
        if (obsRect.right < 0) {
            obs.element.remove();
            obstacles.splice(index, 1);
            score++;
            updateScore();
            updateDifficulty();
        }
    });
    
    // Move and check dragon
    if (dragonActive) {
        const currentDragonRight = parseInt(dragon.style.right) || 0;
        dragon.style.right = (currentDragonRight + dragonSpeed) + 'px';
        
        // Check collision with dragon
        if (checkCollision(dino, dragon)) {
            gameOver();
            return;
        }
        
        // Remove dragon if off screen
        const dragonRect = dragon.getBoundingClientRect();
        if (dragonRect.right < 0) {
            dragon.style.display = 'none';
            dragonActive = false;
            score++;
            updateScore();
            updateDifficulty();
        }
    }
    
    // Continue game loop
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Event listeners for starting game
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Keyboard controls for PC
document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && gameRunning) {
        e.preventDefault();
        jump();
    }
});

// Touch controls for mobile
gameContainer.addEventListener('touchstart', (e) => {
    if (gameRunning) {
        e.preventDefault();
        jump();
    }
});

// Click/tap controls (works for both PC and mobile)
gameContainer.addEventListener('click', (e) => {
    if (gameRunning && !e.target.closest('button')) {
        jump();
    }
});

// Prevent default touch behavior to avoid scrolling
document.body.addEventListener('touchmove', (e) => {
    if (gameRunning) {
        e.preventDefault();
    }
}, { passive: false });