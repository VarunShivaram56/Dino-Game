let score = 0;
let highScore = 0;
let cross = true;
let gameActive = false;
let gameStarted = false;

/* ----------------------- Smooth movement physics ----------------------- */
const move = {
  left: false,
  right: false,
  vel: 0,          // px/s
  max: 520,        // max speed
  accel: 2200,     // accelerate px/s^2
  friction: 2200   // decelerate when no key held
};

const dino = document.getElementById('dino');
const obstacle = document.getElementById('obstacle'); // dragon element
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const gameOverlay = document.getElementById('gameOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const welcomeScreen = document.getElementById('welcomeScreen');

/* ----------------------------- Rocks lane ------------------------------ */
const rocksLane = document.getElementById('rocks');
let rocks = [];

/* ------------------------ Difficulty & pacing -------------------------- */
/* We scale ONLY every +10 points as you asked. These are formulas so
   everything tightens gradually but stays avoidable. */
let difficulty = 0;
let rockInterval = 1700;               // ms between rock spawns (starts chill)
let rockDurMin = 3.4, rockDurMax = 3.9; // CSS animation time range for rocks
let minHazardGap = 1200;               // ms gap required between rock & dragon
let dragonCooldown = 2400;             // ms before dragon can appear again
let dragonDuration = 3.6;              // seconds for dragon to cross screen

let lastRockAt = 0;
let lastDragonAt = 0;
let dragonActive = false;

/* ------------------------ Dragon appearance loop ----------------------- */
/* Instead of infinite animation, we fire the dragon in single passes with
   controlled cooldowns. */
function spawnDragon() {
  if (dragonActive) return;
  dragonActive = true;

  // Start from right edge; one pass; duration based on difficulty
  obstacle.style.left = '100vw';
  obstacle.style.animation = `obstacleMove ${dragonDuration}s linear 1`;
  obstacle.style.animationPlayState = 'running';

  const endHandler = () => {
    dragonActive = false;
    lastDragonAt = performance.now();
    obstacle.style.animation = 'none';
    obstacle.removeEventListener('animationend', endHandler);
  };
  obstacle.addEventListener('animationend', endHandler);
}

/* ------------------------------ Utilities ------------------------------ */
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function now() { return performance.now(); }

function setDifficultyFromScore() {
  const newDiff = Math.floor(score / 10);
  if (newDiff === difficulty) return;
  difficulty = newDiff;

  // Pace tuning: each 10 points tightens timings a bit
  rockInterval = clamp(1700 * Math.pow(0.90, difficulty), 900, 1700);
  rockDurMin   = clamp(3.4  * Math.pow(0.92, difficulty), 1.9, 3.4);
  rockDurMax   = clamp(3.9  * Math.pow(0.92, difficulty), 2.4, 3.9);
  minHazardGap = clamp(1200 * Math.pow(0.92, difficulty), 700, 1200);
  dragonCooldown = clamp(2400 * Math.pow(0.92, difficulty), 1400, 2400);
  dragonDuration = clamp(3.6  * Math.pow(0.94, difficulty), 2.2, 3.6);
}

/* --------------------------- Game lifecycle ---------------------------- */
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
  }, 500);
}

function restartGame() {
  resetWorld();
  gameOverlay.classList.remove('active');
  setTimeout(() => { gameActive = true; }, 10);
}

function resetWorld() {
  // HUD
  score = 0;
  scoreDisplay.textContent = '0';
  cross = true;

  // Controls
  move.left = move.right = false;
  move.vel = 0;

  // Difficulty reset
  difficulty = 0;
  rockInterval = 1700;
  rockDurMin = 3.4; rockDurMax = 3.9;
  minHazardGap = 1200;
  dragonCooldown = 2400;
  dragonDuration = 3.6;

  // Dino reset
  dino.style.left = '100px';
  dino.classList.remove('animateDino');

  // Rocks reset
  for (const r of rocks) r.el.remove();
  rocks = [];
  lastRockAt = now();

  // Dragon reset
  dragonActive = false;
  obstacle.style.animation = 'none';
  obstacle.style.left = '100vw';
  lastDragonAt = now() - dragonCooldown; // eligible soon
}

/* ------------------------------- Controls ------------------------------ */
document.addEventListener('keydown', (e) => {
  if (!gameStarted && e.code === 'Space') { gameStarted = true; startGame(); return; }
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

// Touch (swipe up to jump; horizontal swipe is a nudge)
let touchStartX = 0, touchStartY = 0, touchStartT = 0;
document.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX; touchStartY = t.clientY; touchStartT = now();
}, {passive:true});
document.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  const dt = now() - touchStartT;

  if (!gameStarted) { gameStarted = true; startGame(); return; }
  if (!gameActive) { restartGame(); return; }

  if (Math.abs(dy) > Math.abs(dx) && dy < -30 && dt < 500) {
    jump();
  } else if (Math.abs(dx) > 30) {
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

/* --------------------------- Rock management --------------------------- */
function spawnRock() {
  const el = document.createElement('div');
  el.className = 'rock';
  // random size
  const r = Math.random();
  if (r < 0.25) el.classList.add('small');
  if (r > 0.75) el.classList.add('large');

  // duration drawn from current range (slower early)
  const dur = (rockDurMin + Math.random() * (rockDurMax - rockDurMin));
  el.style.setProperty('--dur', dur.toFixed(2) + 's');
  el.classList.add('rockAni');

  el.dataset.passed = '0';
  rocksLane.appendChild(el);

  el.addEventListener('animationend', () => {
    el.remove();
    rocks = rocks.filter(k => k.el !== el);
  });

  rocks.push({ el });
}

function safeToSpawnRock() {
  if (!dragonActive) return true;
  // If dragon is in the right 55% of the screen (entering), delay rock
  const dr = obstacle.getBoundingClientRect();
  return !(dr.left > window.innerWidth * 0.45);
}

/* -------------------------- Dragon scheduling -------------------------- */
function maybeSpawnDragon(t) {
  if (score < 10) return; // dragon unlock
  if (dragonActive) return;
  if (t - lastDragonAt < dragonCooldown) return;
  if (t - lastRockAt < minHazardGap) return; // keep playable spacing
  spawnDragon();
}

/* ----------------------------- Particles ------------------------------- */
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

/* ------------------------------- Collisions ---------------------------- */
function rectsOverlap(a, b, pad=0) {
  return !(
    a.right - pad < b.left + pad ||
    a.left + pad > b.right - pad ||
    a.bottom - pad < b.top + pad ||
    a.top + pad > b.bottom - pad
  );
}

/* ------------------------------- Game loop ----------------------------- */
let tPrev = performance.now();
function frame(tNow) {
  if (gameActive) {
    const dt = Math.min((tNow - tPrev) / 1000, 0.032);

    // Smooth horizontal move
    if (move.left && !move.right)      move.vel -= move.accel * dt;
    else if (move.right && !move.left) move.vel += move.accel * dt;
    else {
      if (move.vel > 0) move.vel = Math.max(0, move.vel - move.friction * dt);
      else if (move.vel < 0) move.vel = Math.min(0, move.vel + move.friction * dt);
    }
    move.vel = clamp(move.vel, -move.max, move.max);
    if (Math.abs(move.vel) > 0.01) {
      const x = parseInt(getComputedStyle(dino).left, 10) || 100;
      setDinoX(x + move.vel * dt);
    }

    // Spawn rocks with rational spacing
    const t = tNow;
    if (t - lastRockAt >= rockInterval && safeToSpawnRock() && (t - lastDragonAt) >= minHazardGap) {
      spawnRock();
      lastRockAt = t;
    }

    // Possibly spawn dragon (single pass)
    maybeSpawnDragon(t);

    // Collisions and scoring
    const dinoRect = dino.getBoundingClientRect();

    // Dragon collision
    if (dragonActive) {
      const dragonRect = obstacle.getBoundingClientRect();
      if (rectsOverlap(dinoRect, dragonRect, 10)) endGame();
      // Award +1 when you pass the dragon (mirrors your original idea)
      if (cross && dragonRect.left < dinoRect.left - 10) {
        score += 1;
        scoreDisplay.textContent = score;
        cross = false;
        setTimeout(() => (cross = true), 700);
        setDifficultyFromScore();
      }
    }

    // Rocks
    for (const rk of rocks) {
      const rr = rk.el.getBoundingClientRect();
      if (rectsOverlap(dinoRect, rr, 8)) { endGame(); break; }
      if (rk.el.dataset.passed === '0' && rr.right < dinoRect.left) {
        rk.el.dataset.passed = '1';
        score += 1;
        scoreDisplay.textContent = score;
        createParticles(dinoRect.left + 30, 180);
        setDifficultyFromScore();
      }
    }
  }

  tPrev = tNow;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ------------------------------- End game ------------------------------ */
function endGame() {
  if (!gameActive) return;
  gameActive = false;

  // stop dragon immediately
  obstacle.style.animationPlayState = 'paused';

  gameOverlay.classList.add('active');
  finalScoreDisplay.textContent = score;

  if (score > highScore) {
    highScore = score;
    highScoreDisplay.textContent = highScore;
    localStorage.setItem('dinoHighScore', String(highScore));
  }
}

/* --------------------------- Legacy shortcuts -------------------------- */
document.addEventListener('keydown', (e) => {
  if (!gameStarted && e.code === 'Space') { gameStarted = true; }
});
