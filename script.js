let score = 0;
let highScore = 0;
let cross = true;
let gameActive = false;
let gameStarted = false;

// --- NEW: movement physics for smoother controls
const move = {
  left: false,
  right: false,
  vel: 0,          // px/s
  max: 520,        // max speed
  accel: 2200,     // accelerate px/s^2
  friction: 2200   // decelerate when no key held
};

const dino = document.getElementById('dino');
const obstacle = document.getElementById('obstacle'); // dragon
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const gameOverlay = document.getElementById('gameOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const welcomeScreen = document.getElementById('welcomeScreen');

// NEW: rocks lane
const rocksLane = document.getElementById('rocks');
let rocks = [];
let lastRockAt = 0;
let rockInterval = 1400; // ms; will shrink with difficulty

// Dragon animation speed like before, but we need its position roughly
let animationSpeed = 3;

// Load high score
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('dinoHighScore');
  if (saved) highScore = parseInt(saved, 10) || 0;
  highScoreDisplay.textContent = highScore;
});

function startGame() {
  welcomeScreen.classList.add('hidden');
  setTimeout(() => {
    resetWorld();
    gameActive = true;
    gameStarted = true;
    obstacle.classList.add('obstacleAni'); // dragon starts moving
  }, 500);
}

function restartGame() {
  resetWorld();
  gameOverlay.classList.remove('active');
  setTimeout(() => {
    obstacle.classList.add('obstacleAni');
    gameActive = true;
  }, 10);
}

function resetWorld() {
  // HUD
  score = 0;
  scoreDisplay.textContent = '0';
  cross = true;

  // Controls
  move.left = move.right = false;
  move.vel = 0;

  // Dragon speed reset
  animationSpeed = 3;
  obstacle.style.animationDuration = animationSpeed + 's';

  // Dino reset
  dino.style.left = '100px';
  dino.classList.remove('animateDino');

  // Clear rocks
  for (const r of rocks) r.el.remove();
  rocks = [];
  rockInterval = 1400;
  lastRockAt = performance.now();

  // Ensure dragon animation restarts cleanly
  obstacle.classList.remove('obstacleAni');
  obstacle.style.left = '100vw';
  void obstacle.offsetWidth; // reflow
}

// --- Controls (smooth) ---
document.addEventListener('keydown', (e) => {
  if (!gameStarted && e.code === 'Space') { startGame(); return; }
  if (!gameActive && e.code === 'Space' && gameStarted) { restartGame(); return; }
  if (!gameActive) return;

  if (e.code === 'ArrowUp' || e.code === 'Space') jump();
  if (e.code === 'ArrowLeft') move.left = true;
  if (e.code === 'ArrowRight') move.right = true;
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft') move.left = false;
  if (e.code === 'ArrowRight') move.right = false;
});

// Touch (swipe up to jump; horizontal swipe = nudge)
let touchStartX = 0, touchStartY = 0, touchStartT = 0;
document.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY; touchStartT = performance.now();
}, {passive:true});
document.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const dt = performance.now() - touchStartT;

  if (!gameStarted) { startGame(); return; }
  if (!gameActive) { restartGame(); return; }
  if (Math.abs(dy) > Math.abs(dx) && dy < -30 && dt < 500) {
    jump(); // swipe up
  } else if (Math.abs(dx) > 30) {
    // nudge left/right for mobile
    const dinoX = parseInt(getComputedStyle(dino).left, 10) || 100;
    const step = Math.min(Math.abs(dx), 160);
    const dir = dx > 0 ? 1 : -1;
    setDinoX(dinoX + dir * step);
  }
}, {passive:true});

function jump() {
  if (!gameActive) return;
  if (!dino.classList.contains('animateDino')) {
    dino.classList.add('animateDino');
    setTimeout(() => dino.classList.remove('animateDino'), 600);
  }
}

function setDinoX(x) {
  const min = 40;
  const max = Math.max(window.innerWidth - 150, 200);
  const nx = Math.min(Math.max(x, min), max);
  dino.style.left = nx + 'px';
}

// --- NEW: Rock spawner (fairness with dragon) ---
function spawnRock() {
  const el = document.createElement('div');
  el.className = 'rock';
  // random size class
  const r = Math.random();
  if (r < 0.25) el.classList.add('small');
  if (r > 0.75) el.classList.add('large');

  // variable duration (faster later)
  const dur = Math.max(1.5, rockInterval / 900); // ~1.5s min visual time
  el.style.setProperty('--dur', (dur + (Math.random() * 0.35 - 0.15)).toFixed(2) + 's');
  el.classList.add('rockAni');

  // track for scoring/collision
  el.dataset.passed = '0';
  rocksLane.appendChild(el);

  // auto cleanup after animation completes
  el.addEventListener('animationend', () => {
    el.remove();
    // purge from array
    rocks = rocks.filter(rk => rk.el !== el);
  });

  // store reference
  rocks.push({ el });
}

// ensure rocks don’t spawn immediately on top of dragon
function safeToSpawnRock() {
  // approximate dragon position using its bounding rect
  const dr = obstacle.getBoundingClientRect();
  // if dragon is near right 40% of screen, hold spawns to avoid impossible stacks
  const nearRight = dr.left > window.innerWidth * 0.6;
  return !nearRight;
}

// --- Difficulty scaling ---
function updateDifficulty() {
  // increase difficulty every 5 score: faster dragon & more frequent rocks
  if (score > 0 && score % 5 === 0) {
    // tighten rock interval
    rockInterval = Math.max(700, rockInterval * 0.88);
    // speed up dragon a touch
    animationSpeed = Math.max(1.6, animationSpeed - 0.10);
    obstacle.style.animationDuration = animationSpeed + 's';
  }
}

// Particles (kept)
function createParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = x + 'px';
    p.style.bottom = y + 'px';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.getElementById('gameContainer').appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

// --- Main loop: movement + collisions + spawns ---
let tPrev = performance.now();
function frame(tNow) {
  if (gameActive) {
    const dt = Math.min((tNow - tPrev) / 1000, 0.032);
    // smooth horizontal movement
    if (move.left && !move.right) {
      move.vel -= move.accel * dt;
    } else if (move.right && !move.left) {
      move.vel += move.accel * dt;
    } else {
      // friction
      if (move.vel > 0) move.vel = Math.max(0, move.vel - move.friction * dt);
      else if (move.vel < 0) move.vel = Math.min(0, move.vel + move.friction * dt);
    }
    move.vel = Math.max(-move.max, Math.min(move.vel, move.max));
    if (Math.abs(move.vel) > 0.01) {
      const x = parseInt(getComputedStyle(dino).left, 10) || 100;
      setDinoX(x + move.vel * dt);
    }

    // Spawn rocks
    if (tNow - lastRockAt >= rockInterval) {
      if (safeToSpawnRock()) {
        spawnRock();
        lastRockAt = tNow;
      } else {
        // retry shortly to avoid unfair overlap
        lastRockAt = tNow - (rockInterval * 0.6);
      }
    }

    // Collisions & scoring
    const dinoRect = dino.getBoundingClientRect();
    const dragonRect = obstacle.getBoundingClientRect();

    // Dragon collision
    if (rectsOverlap(dinoRect, dragonRect, 10)) endGame();

    // Rock collisions + pass scoring
    for (const rk of rocks) {
      const rr = rk.el.getBoundingClientRect();
      if (rectsOverlap(dinoRect, rr, 8)) {
        endGame();
        break;
      }
      // passed if rock's right < dino left and not counted
      if (rk.el.dataset.passed === '0' && rr.right < dinoRect.left) {
        rk.el.dataset.passed = '1';
        score += 1;
        scoreDisplay.textContent = score;
        createParticles(dinoRect.left + 30, 180);
        updateDifficulty();
      }
    }
  }

  tPrev = tNow;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function rectsOverlap(a, b, pad=0) {
  return !(
    a.right - pad < b.left + pad ||
    a.left + pad > b.right - pad ||
    a.bottom - pad < b.top + pad ||
    a.top + pad > b.bottom - pad
  );
}

function endGame() {
  if (!gameActive) return;
  gameActive = false;
  obstacle.classList.remove('obstacleAni');
  gameOverlay.classList.add('active');
  finalScoreDisplay.textContent = score;

  if (score > highScore) {
    highScore = score;
    highScoreDisplay.textContent = highScore;
    localStorage.setItem('dinoHighScore', String(highScore));
  }
}

// Legacy polling loop (kept for compatibility with dragon scoring proximity)
const legacyLoop = setInterval(() => {
  if (!gameActive) return;

  const dinoRect = dino.getBoundingClientRect();
  const dragonRect = obstacle.getBoundingClientRect();

  const dx = dinoRect.left;
  const dy = window.innerHeight - dinoRect.bottom;

  const ox = dragonRect.left;
  const oy = window.innerHeight - dragonRect.bottom;

  const offsetX = Math.abs(dx - ox);
  const offsetY = Math.abs(dy - oy);

  // Award +1 when you pass the dragon (mirrors your original logic)
  if (offsetX < 100 && cross && ox < dx) {
    score += 1;
    scoreDisplay.textContent = score;
    cross = false;
    createParticles(dx + 30, 180);
    setTimeout(() => (cross = true), 700);
    updateDifficulty();
  }
}, 80);
