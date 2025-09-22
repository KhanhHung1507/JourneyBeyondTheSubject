// ================== GAME SCRIPT (fixed collisions + loop id + centers + skill system) ==================
const player = document.getElementById('player');
const game = document.getElementById('game');
const powerDisplay = document.getElementById('powerDisplay');

// Thêm chỗ hiển thị wave
const waveDisplay = document.createElement("div");
waveDisplay.style.color = "white";
waveDisplay.style.marginTop = "5px";
powerDisplay.insertAdjacentElement("afterend", waveDisplay);

// Wave notice góc phải
const waveNotice = document.createElement("div");
waveNotice.style.position = "absolute";
waveNotice.style.top = "10px";
waveNotice.style.right = "10px";
waveNotice.style.padding = "10px";
waveNotice.style.background = "rgba(0,0,0,0.6)";
waveNotice.style.color = "yellow";
waveNotice.style.fontSize = "18px";
waveNotice.style.borderRadius = "8px";
waveNotice.style.display = "none";
document.body.appendChild(waveNotice);

// Flash đỏ khi dính đòn
const damageFlash = document.createElement("div");
damageFlash.id = "damageFlash";
damageFlash.style.position = "absolute";
damageFlash.style.top = "0";
damageFlash.style.left = "0";
damageFlash.style.width = "100%";
damageFlash.style.height = "100%";
damageFlash.style.background = "rgba(255,0,0,0.4)";
damageFlash.style.pointerEvents = "none";
damageFlash.style.opacity = "0";
damageFlash.style.transition = "opacity 0.2s ease-out";
damageFlash.style.zIndex = "999";
document.body.appendChild(damageFlash);

// ---------- Game state ----------
let teamPower = 1;
let playerX = game.clientWidth / 2; // center x
let playerY = game.clientHeight / 2; // center y
let targetX = playerX;
let targetY = playerY;
let playerHP = 10;
let playerMaxHP = 10;

let enemies = [];
let attacks = [];
let currentFriend = null;

const PLAYER_SPEED = 3;
const BASE_ENEMY_SPEED = 3;
const BASE_ATTACK_COOLDOWN = 1500;
const ATTACK_SPEED = 5;
let lastAttackTime = 0;
let gameLoopId = null;
let touchStart = null;

// Wave system
let currentWave = 0;
let waveInProgress = false;

// Bullet system
let currentBullets = 20;
let maxBullets = 40;

// Skill system
let normalShotCount = 0; // đếm số lần bắn thường

// HP bar
const playerHPBar = document.createElement('div');
playerHPBar.className = 'hp-bar';
const playerHPBarInner = document.createElement('div');
playerHPBarInner.className = 'hp-bar-inner';
playerHPBar.appendChild(playerHPBarInner);
player.appendChild(playerHPBar);

// Intro
let introTexts = [
  "Xin chào các bạn, lại là mình, Khánh Hưng đây!",
  "Mục tiêu duy nhất hiện giờ của chúng ta là tốt nghiệp đúng hạn",
  "Hãy cùng nhau thu thập thật nhiều kiến thức và kinh nghiệm nhé!",
  "Tín chỉ tăng khi bạn qua một môn!",
  "Mỗi 10 Tín chỉ sẽ tăng giới hạn túi tiền của bạn!",
  "Mỗi 5 lần bạn vung tiền sẽ có kĩ năng đặc biệt thi triển!"
];
let introIndex = 0;
let inIntro = true;

const introBox = document.createElement("div");
introBox.id = "introBox";
introBox.style.position = "absolute";
introBox.style.top = "50%";
introBox.style.left = "50%";
introBox.style.transform = "translate(-50%, -50%)";
introBox.style.padding = "20px";
introBox.style.background = "rgba(0,0,0,0.7)";
introBox.style.color = "white";
introBox.style.fontSize = "20px";
introBox.style.borderRadius = "10px";
introBox.innerText = introTexts[introIndex];
document.body.appendChild(introBox);

function nextIntro() {
  introIndex++;
  if (introIndex < introTexts.length) {
    introBox.innerText = introTexts[introIndex];
  } else {
    document.body.removeChild(introBox);
    inIntro = false;
    startGame();
  }
}

window.addEventListener("keydown", e => { if (inIntro && e.code === "Space") nextIntro(); });
window.addEventListener("touchstart", () => { if (inIntro) nextIntro(); });

// ================== UI ==================
function showPopup(text, x, y) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerText = text;
  game.appendChild(el);
  setTimeout(() => { if (el.parentNode) game.removeChild(el); }, 1500);
}

function updatePlayerHPBar() {
  const percent = Math.max(0, playerHP) / playerMaxHP * 100;
  playerHPBarInner.style.width = percent + '%';
}

function updateStatusDisplay() {
  powerDisplay.innerText = `Tín chỉ: ${teamPower}  
  Money: ${currentBullets}/${maxBullets}$
  Học kì: ${currentWave}`;
}

// ================== BULLET ITEM ==================
function getRandomPosition() {
  const padding = 50;
  return {
    x: Math.random() * (game.clientWidth - padding * 2) + padding,
    y: Math.random() * (game.clientHeight - padding * 2) + padding
  };
}

function spawnNextBullet() {
  if (currentFriend && currentFriend.parentNode) currentFriend.remove();
  const pos = getRandomPosition();

  const bullet = document.createElement('div');
  bullet.className = 'bullet';
  bullet.style.left = `${pos.x - 18}px`;
  bullet.style.top = `${pos.y - 18}px`;
  bullet.style.width = `36px`;
  bullet.style.height = `36px`;
  bullet.style.borderRadius = `50%`;
  bullet.style.display = 'flex';
  bullet.style.alignItems = 'center';
  bullet.style.justifyContent = 'center';
  bullet.style.position = 'absolute';

  game.appendChild(bullet);
  currentFriend = bullet;
}

function checkBulletPickup() {
  if (!currentFriend) return;
  const playerRect = player.getBoundingClientRect();
  const bulletRect = currentFriend.getBoundingClientRect();
  const playerCenterX = playerRect.left + playerRect.width / 2;
  const playerCenterY = playerRect.top + playerRect.height / 2;
  const bulletCenterX = bulletRect.left + bulletRect.width / 2;
  const bulletCenterY = bulletRect.top + bulletRect.height / 2;
  const dist = Math.hypot(bulletCenterX - playerCenterX, bulletCenterY - playerCenterY);

  if (dist < 40) {
    currentFriend.remove();
    currentFriend = null;
    if (currentBullets < maxBullets) {
      currentBullets += 10;
      if (currentBullets > maxBullets) currentBullets = maxBullets;
      showPopup(`+10$!`, playerCenterX, playerCenterY - 50);
    } else {
      showPopup(`$$$ full!`, playerCenterX, playerCenterY - 50);
    }
    updateStatusDisplay();
    setTimeout(spawnNextBullet, 800);
  }
}

// ================== ENEMY ==================
function spawnEnemy() {
  const enemy = document.createElement('div');
  enemy.className = 'enemy';
  enemy.style.position = 'absolute';

  let posX, posY, tries = 0;
  do {
    posX = Math.random() * (game.clientWidth - 60) + 30;
    posY = Math.random() * (game.clientHeight - 60) + 30;
    tries++;
    if (tries > 40) break;
  } while (Math.hypot(posX - playerX, posY - playerY) < 120);

  enemy.style.left = `${posX}px`;
  enemy.style.top = `${posY}px`;

  enemy.maxHP = 5 + currentWave * 2;
  enemy.health = enemy.maxHP;
  enemy.speed = BASE_ENEMY_SPEED + currentWave * 0.2;

  const frame = Math.floor(Math.random() * 5);
  enemy.style.width = "53.5px";
  enemy.style.height = "56px";
  enemy.style.backgroundSize = "267.5px 56px";
  enemy.style.backgroundPosition = `-${frame * 53.5}px 0`;

  const subjects = ["Tư tưởng Hồ Chí Minh", "Nhập môn CNTT", "Nhập môn lập trình", 
    "Kỹ thuật lập trình", "PP lập trình hướng đối tượng", 
    "Cấu trúc dữ liệu và giải thuật", 
    "Cơ sở dữ liệu – Hệ thống thông tin",
     "Hệ điều hành", "Mạng máy tính", 
     "Hệ thống máy tính",
     "Lập trình trí tuệ nhân tạo",
     "Trực quan hóa dữ liệu", 
     "Thương mại điện tử",
     "Tương tác người - máy", 
     "Nhập môn DevOps", 
     "An ninh mạng", 
     "Cơ sở trí tuệ nhân tạo",
     "Nhập môn khoa học dữ liệu"];
  const subject = subjects[Math.floor(Math.random() * subjects.length)];

  const label = document.createElement('div');
  label.innerText = subject;
  label.style.position = "absolute";
  label.style.bottom = "-20px";
  label.style.width = "100%";
  label.style.textAlign = "center";
  label.style.fontSize = "14px";
  label.style.fontWeight = "bold";
  label.style.color = "white";
  label.style.textShadow = "1px 1px 2px black";
  enemy.appendChild(label);

  const hpBar = document.createElement('div');
  hpBar.className = 'hp-bar';
  const hpInner = document.createElement('div');
  hpInner.className = 'hp-bar-inner';
  hpBar.appendChild(hpInner);
  enemy.appendChild(hpBar);
  enemy.hpInner = hpInner;

  enemy.isSpawning = true;
  enemy.style.opacity = 0;
  enemy.style.transition = "opacity 1s ease";
  setTimeout(() => {
    enemy.style.opacity = 1;
    setTimeout(() => { enemy.isSpawning = false; }, 500);
  }, 50);

  game.appendChild(enemy);
  enemies.push(enemy);
}

function startNextWave() {
  currentWave++;
  updateStatusDisplay();
  waveNotice.style.display = "block";
  waveNotice.innerText = `Học kì ${currentWave} sẽ bắt đầu sau 5 giây...`;

  setTimeout(() => {
    waveNotice.style.display = "none";
    for (let i = 0; i < 2 + currentWave; i++) spawnEnemy();
    if (!currentFriend) spawnNextBullet();
    waveInProgress = true;
  }, 5000);
}

// ================== ATTACK + SKILL ==================
function getNearestEnemy() {
  let nearest = null, minDist = Infinity;
  enemies.forEach(enemy => {
    const ex = enemy.offsetLeft + enemy.offsetWidth / 2;
    const ey = enemy.offsetTop + enemy.offsetHeight / 2;
    const dist = Math.hypot(ex - playerX, ey - playerY);
    if (dist < minDist) { minDist = dist; nearest = enemy; }
  });
  return nearest;
}

function createAttack(targetEnemy, isSkill = false, angleOverride = null) {
  if (!targetEnemy && !angleOverride) return;

  const attack = document.createElement('div');
  attack.className = 'attack';
  attack.x = playerX;
  attack.y = playerY;
  attack.damage = teamPower;

  let dx, dy;
  if (angleOverride !== null) {
    dx = Math.cos(angleOverride);
    dy = Math.sin(angleOverride);
  } else {
    const ex = targetEnemy.offsetLeft + targetEnemy.offsetWidth / 2;
    const ey = targetEnemy.offsetTop + targetEnemy.offsetHeight / 2;
    dx = ex - playerX;
    dy = ey - playerY;
    const dist = Math.hypot(dx, dy) || 1;
    dx /= dist;
    dy /= dist;
  }

  attack.vx = dx * ATTACK_SPEED;
  attack.vy = dy * ATTACK_SPEED;

  attack.style.width = isSkill ? "32px" : "24px";
  attack.style.height = isSkill ? "32px" : "24px";
  attack.style.background = "url('dollar.png') no-repeat center center";
  attack.style.backgroundSize = "contain";
  attack.style.position = "absolute";
  attack.style.left = `${attack.x}px`;
  attack.style.top = `${attack.y}px`;
  game.appendChild(attack);
  attacks.push(attack);
}

// === Skill tấn công (giữ nguyên) ===
function shootAttackSkill() {
  const numBullets = 5;
  const spread = Math.PI / 3;
  const target = getNearestEnemy();
  if (!target) return;

  const ex = target.offsetLeft + target.offsetWidth / 2;
  const ey = target.offsetTop + target.offsetHeight / 2;
  const baseAngle = Math.atan2(ey - playerY, ex - playerX);

  for (let i = 0; i < numBullets; i++) {
    const angle = baseAngle - spread/2 + (i * spread / (numBullets - 1));
    createAttack(null, true, angle);
  }
  showPopup("🔥 Skill Attack!", playerX, playerY - 60);
}

// === Skill phòng thủ (fixed) ===
function shootDefenseSkill() {
  const maxRadius = 200;
  const duration = 500;
  const step = 20;
  let currentRadius = 0;

  const wave = document.createElement('div');
  wave.className = 'defense-wave';
  wave.style.position = "absolute";
  wave.style.left = `${player.offsetLeft + player.offsetWidth/2}px`;
  wave.style.top = `${player.offsetTop + player.offsetHeight/2}px`;
  wave.style.transform = "translate(-50%, -50%)";
  game.appendChild(wave);

  const expand = setInterval(() => {
    currentRadius += step;
    wave.style.width = wave.style.height = `${currentRadius*2}px`;
    wave.style.borderRadius = "50%";

    enemies.forEach(enemy => {
      if (!enemy.isDead) {
        const ex = enemy.offsetLeft + enemy.offsetWidth / 2;
        const ey = enemy.offsetTop + enemy.offsetHeight / 2;
        const dist = Math.hypot(ex - playerX, ey - playerY);

        if (dist < currentRadius) {
          const dmg = Math.floor(enemy.maxHP * 0.5);
          enemy.health -= dmg;
          if (enemy.health <= 0) {
            if (!enemy.isDead) {
              enemy.isDead = true;
              if (enemy.parentNode) enemy.remove();
              enemies = enemies.filter(e => e !== enemy);
              teamPower++;
              playerMaxHP += 2;
              playerHP += 1;
              if (teamPower % 10 === 0) {
                maxBullets++;
                showPopup("Max Bullets +1!", playerX, playerY - 60);
              }
              updateStatusDisplay();
            }
          } else {
            enemy.hpInner.style.width = (enemy.health / enemy.maxHP * 100) + "%";
          }

          const angle = Math.atan2(ey - playerY, ex - playerX);
          const push = 80;
          let newX = enemy.offsetLeft + Math.cos(angle) * push;
          let newY = enemy.offsetTop + Math.sin(angle) * push;
          newX = Math.max(0, Math.min(game.clientWidth - enemy.offsetWidth, newX));
          newY = Math.max(0, Math.min(game.clientHeight - enemy.offsetHeight, newY));
          enemy.style.left = newX + "px";
          enemy.style.top = newY + "px";

          enemy.stunned = true;
          enemy.style.filter = "grayscale(100%)";
          setTimeout(() => {
            enemy.stunned = false;
            enemy.style.filter = "";
          }, 1000);
        }
      }
    });

    if (currentRadius >= maxRadius) {
      clearInterval(expand);
      wave.remove();
    }
  }, duration / (maxRadius / step));

  showPopup("🛡️ Skill Defense!", playerX, playerY - 60);
}

// === Random skill ===
function shootSkill() {
  const skillChoice = Math.random() < 0.5 ? "attack" : "defense";
  if (skillChoice === "attack") shootAttackSkill();
  else shootDefenseSkill();
}

// ================== COLLISIONS ==================
function updateEnemyHPBar(enemy) {
  enemy.hpInner.style.width = Math.max(0, enemy.health) / enemy.maxHP * 100 + '%';
}

function resolveEnemyCollisions() {
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      const e1 = enemies[i];
      const e2 = enemies[j];

      const x1 = e1.offsetLeft + e1.offsetWidth / 2;
      const y1 = e1.offsetTop + e1.offsetHeight / 2;
      const x2 = e2.offsetLeft + e2.offsetWidth / 2;
      const y2 = e2.offsetTop + e2.offsetHeight / 2;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy) || 1;

      const minDist = (e1.offsetWidth / 2) + (e2.offsetWidth / 2);

      if (dist < minDist) {
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;

        e1.style.left = `${e1.offsetLeft - nx * overlap}px`;
        e1.style.top  = `${e1.offsetTop - ny * overlap}px`;

        e2.style.left = `${e2.offsetLeft + nx * overlap}px`;
        e2.style.top  = `${e2.offsetTop + ny * overlap}px`;
      }
    }
  }
}

function moveEnemies() {
  enemies.forEach(enemy => {
    if (enemy.isSpawning) return;

    const ex = enemy.offsetLeft + enemy.offsetWidth / 2;
    const ey = enemy.offsetTop + enemy.offsetHeight / 2;
    const dx = playerX - ex;
    const dy = playerY - ey;
    const dist = Math.hypot(dx, dy) || 1;

    const playerRadius = player.offsetWidth / 2;
    const enemyRadius = enemy.offsetWidth / 2;
    const stopDistance = playerRadius + enemyRadius;

    if (dist > stopDistance) {
      const desiredMove = Math.min(enemy.speed, dist - stopDistance);
      const vx = (dx / dist) * desiredMove;
      const vy = (dy / dist) * desiredMove;
      enemy.style.left = `${enemy.offsetLeft + vx}px`;
      enemy.style.top  = `${enemy.offsetTop + vy}px`;
    } else {
      const angle = Math.atan2(dy, dx) + 0.5;
      const vx = Math.cos(angle) * 0.5;
      const vy = Math.sin(angle) * 0.5;
      enemy.style.left = `${enemy.offsetLeft + vx}px`;
      enemy.style.top  = `${enemy.offsetTop + vy}px`;
    }
  });
}

function moveAttacks() {
  attacks.forEach((attack, i) => {
    attack.x += attack.vx;
    attack.y += attack.vy;
    attack.style.left = `${attack.x}px`;
    attack.style.top = `${attack.y}px`;
    if (attack.x < -50 || attack.x > game.clientWidth + 50 || attack.y < -50 || attack.y > game.clientHeight + 50) {
      if (attack.parentNode) attack.remove();
      attacks.splice(i, 1);
    }
  });
}

function checkAttackCollisions() {
  attacks.forEach((attack, ai) => {
    enemies.forEach((enemy, ei) => {
      const ax = attack.x, ay = attack.y;
      const ex = enemy.offsetLeft + enemy.offsetWidth / 2;
      const ey = enemy.offsetTop + enemy.offsetHeight / 2;
      if (Math.hypot(ax - ex, ay - ey) < (enemy.offsetWidth / 2 + 8)) {
        enemy.health -= attack.damage;
        updateEnemyHPBar(enemy);

        const boom = document.createElement('div');
        boom.style.position = "absolute";
        boom.style.width = "20px";
        boom.style.height = "20px";
        boom.style.borderRadius = "50%";
        boom.style.background = "orange";
        boom.style.left = (attack.x - 10) + "px";
        boom.style.top = (attack.y - 10) + "px";
        boom.style.opacity = "0.9";
        game.appendChild(boom);
        setTimeout(() => { if (boom.parentNode) boom.remove(); }, 200);

        if (enemy.health <= 0) {
          if (enemy.parentNode) enemy.remove();
          enemies.splice(ei, 1);

          teamPower++;
          playerMaxHP += 2;
          playerHP += 1;
          
          if (teamPower % 10 === 0) {
            maxBullets++;
            showPopup("Max Bullets +1!", playerX, playerY - 60);
          }
          updateStatusDisplay();
        }

        if (attack.parentNode) attack.remove();
        attacks.splice(ai, 1);
      }
    });
  });
}

// ================== PLAYER HIT ==================
function triggerDamageEffect() {
  damageFlash.style.opacity = "1";
  setTimeout(() => damageFlash.style.opacity = "0", 200);
  game.classList.add("shake");
  setTimeout(() => game.classList.remove("shake"), 300);
}

function checkEnemyCollisions(timestamp) {
  enemies.forEach(enemy => {
    const enemyRect = enemy.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();

    const enemyCenterX = enemyRect.left + enemyRect.width / 2;
    const enemyCenterY = enemyRect.top + enemyRect.height / 2;
    const playerCenterX = playerRect.left + playerRect.width / 2;
    const playerCenterY = playerRect.top + playerRect.height / 2;

    const dist = Math.hypot(enemyCenterX - playerCenterX, enemyCenterY - playerCenterY);
    const colliderDistance = Math.min(enemyRect.width, enemyRect.height) / 2 + Math.min(playerRect.width, playerRect.height) / 2;

    if (dist <= colliderDistance) {
      if (!enemy.lastDamageTime || timestamp - enemy.lastDamageTime >= 1000) {
        enemy.lastDamageTime = timestamp;

        playerHP--;
        updatePlayerHPBar();
        triggerDamageEffect();

        if (playerHP <= 0) {
          gameOver();
        }
      }
    }
  });
}

// ================== AUTO ATTACK ==================
function autoAttack(timestamp) {
  if (!lastAttackTime) lastAttackTime = timestamp;
  const cooldown = BASE_ATTACK_COOLDOWN / (1 + (teamPower - 1) * 0.2);

  if (timestamp - lastAttackTime > cooldown) {
    const target = getNearestEnemy();
    if (target && currentBullets > 0) {
      normalShotCount++;
      if (normalShotCount >= 5) {
        shootSkill();
        normalShotCount = 0;
      } else {
        createAttack(target);
      }
      currentBullets--;
      updateStatusDisplay();
    }
    lastAttackTime = timestamp;
  }
}

// ================== GAME LOOP ==================
function movePlayer() {
  const dx = targetX - playerX, dy = targetY - playerY;
  const dist = Math.hypot(dx, dy) || 1;
  if (dist > 1) { playerX += (dx / dist) * PLAYER_SPEED; playerY += (dy / dist) * PLAYER_SPEED; }

  player.style.left = `${playerX}px`;
  player.style.top = `${playerY}px`;
}

function gameLoop(timestamp) {
  if (!inIntro) {
    movePlayer();
    checkBulletPickup();
    moveEnemies();
    resolveEnemyCollisions();
    moveAttacks();
    checkAttackCollisions();
    checkEnemyCollisions(timestamp);
    autoAttack(timestamp);
    if (waveInProgress && enemies.length === 0) { waveInProgress = false; startNextWave(); }
  }
  gameLoopId = requestAnimationFrame(gameLoop);
}

// ================== GAME OVER ==================
function gameOver() {
  cancelAnimationFrame(gameLoopId);
  inIntro = true;
  setTimeout(() => { if (confirm("Game Over! Restart?")) resumeGame(); }, 100);
}

function resumeGame() {
  playerHP = playerMaxHP;
  updatePlayerHPBar();
  inIntro = false;
  if (!currentFriend) spawnNextBullet();
  startNextWave();
  gameLoopId = requestAnimationFrame(gameLoop);
}

// ================== START ==================
function startGame() {
  updateStatusDisplay();
  spawnNextBullet();
  startNextWave();
  gameLoopId = requestAnimationFrame(gameLoop);
}

// ================== INPUT ==================
game.addEventListener('mousemove', e => {
  const rect = game.getBoundingClientRect();
  targetX = e.clientX;
  targetY = e.clientY;
});

game.addEventListener('touchstart', e => {
  const rect = game.getBoundingClientRect();
  const touch = e.touches[0];
  touchStart = { fx: touch.clientX - rect.left, fy: touch.clientY - rect.top, px: playerX, py: playerY };
});
game.addEventListener('touchmove', e => {
  e.preventDefault(); if (!touchStart) return;
  const rect = game.getBoundingClientRect();
  const touch = e.touches[0];
  targetX = touchStart.px + (touch.clientX - rect.left - touchStart.fx);
  targetY = touchStart.py + (touch.clientY - rect.top - touchStart.fy);
}, { passive: false });
game.addEventListener('touchend', () => touchStart = null);

// ================== CSS SHAKE ==================
const style = document.createElement("style");
style.innerHTML = `
  .shake { animation: shake 0.3s; }
  @keyframes shake {
    0% { transform: translate(2px, 2px); }
    20% { transform: translate(-2px, -2px); }
    40% { transform: translate(2px, -2px); }
    60% { transform: translate(-2px, 2px); }
    80% { transform: translate(2px, 2px); }
    100% { transform: translate(0, 0); }
  }
`;
document.head.appendChild(style);
//Đây là toàn bộ code của tôi, hãy thêm vào giúp tôi và gửi 1 lần dể tôi dễ copy