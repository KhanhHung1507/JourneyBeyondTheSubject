const player = document.getElementById('player');
const game = document.getElementById('game');
const powerDisplay = document.getElementById('powerDisplay');

// Thêm chỗ hiển thị wave
const waveDisplay = document.createElement("div");
waveDisplay.style.color = "white";
waveDisplay.style.marginTop = "5px";
powerDisplay.insertAdjacentElement("afterend", waveDisplay);

// Thêm box thông báo wave ở góc phải trên
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

// Thêm overlay flash đỏ khi bị thương
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

let teamPower = 1;
let playerX = game.clientWidth / 2;
let playerY = game.clientHeight / 2;
let targetX = playerX;
let targetY = playerY;
let playerHP = 10;
let playerMaxHP = 10;

let enemies = [];
let attacks = [];

const PLAYER_SPEED = 3;
const BASE_ENEMY_SPEED = 1.5;
const BASE_ATTACK_COOLDOWN = 1500;
const ATTACK_SPEED = 5;
let lastAttackTime = 0;
let gameLoopId = null;

let touchStart = null;

// Wave system
let currentWave = 0;
let waveInProgress = false;

// HP thanh cho player
const playerHPBar = document.createElement('div');
playerHPBar.className = 'hp-bar';
const playerHPBarInner = document.createElement('div');
playerHPBarInner.className = 'hp-bar-inner';
playerHPBar.appendChild(playerHPBarInner);
player.appendChild(playerHPBar);

// Danh sách bạn bè
const friendList = [
  { name: "An" },
  { name: "Bình" },
  { name: "Chi" },
  { name: "Duy" },
  { name: "Hà" }
];

let currentFriend = null;

// ================== INTRO ================== //
let introTexts = [
  "Xin chào, đây là phần giới thiệu của game!",
  "Bạn sẽ điều khiển nhân vật để tìm bạn bè...",
  "Và chống lại kẻ thù đang đuổi theo bạn.",
  "Chúc bạn may mắn!",
  "Power: 1" // đổi chữ ở intro luôn
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

window.addEventListener("keydown", e => {
  if (inIntro && e.code === "Space") {
    nextIntro();
  }
});
window.addEventListener("touchstart", () => {
  if (inIntro) nextIntro();
});

// ================== HÀM GAME ================== //
function getRandomPosition() {
  const padding = 50;
  const x = Math.random() * (game.clientWidth - padding * 2) + padding;
  const y = Math.random() * (game.clientHeight - padding * 2) + padding;
  return { x, y };
}

function spawnNextFriend() {
  if (currentFriend) {
    game.removeChild(currentFriend);
    currentFriend = null;
  }
  const data = friendList[Math.floor(Math.random() * friendList.length)];
  const pos = getRandomPosition();

  const friend = document.createElement('div');
  friend.className = 'friend';
  friend.dataset.name = data.name;
  friend.style.left = `${pos.x - 20}px`;  
  friend.style.top = `${pos.y - 20}px`;
  friend.innerText = data.name[0];

  game.appendChild(friend);
  currentFriend = friend;
}

function showPopup(text, x, y) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerText = text;
  game.appendChild(el);
  setTimeout(() => game.removeChild(el), 1500);
}

function updatePlayerHPBar() {
  const percent = Math.max(0, playerHP) / playerMaxHP * 100;
  playerHPBarInner.style.width = percent + '%';
}

function movePlayer() {
  const dx = targetX - playerX;
  const dy = targetY - playerY;
  const dist = Math.hypot(dx, dy);

  if (dist > 1) {
    playerX += (dx / dist) * PLAYER_SPEED;
    playerY += (dy / dist) * PLAYER_SPEED;
  }

  player.style.left = `${playerX}px`;
  player.style.top = `${playerY}px`;
}

function checkCollision() {
  if (!currentFriend) return;

  const playerRect = player.getBoundingClientRect();
  const friendRect = currentFriend.getBoundingClientRect();

  const playerCenterX = playerRect.left + playerRect.width / 2;
  const playerCenterY = playerRect.top + playerRect.height / 2;
  const friendCenterX = friendRect.left + friendRect.width / 2;
  const friendCenterY = friendRect.top + friendRect.height / 2;

  const playerRadius = Math.min(playerRect.width, playerRect.height) / 2;
  const friendRadius = Math.min(friendRect.width, friendRect.height) / 2;

  const dist = Math.hypot(friendCenterX - playerCenterX, friendCenterY - playerCenterY);
  const colliderDistance = playerRadius + friendRadius;

  if (dist < colliderDistance) {
    const name = currentFriend.dataset.name;
    game.removeChild(currentFriend);
    currentFriend = null;

    teamPower++;
    powerDisplay.innerText = `Power: ${teamPower}`;

    // tăng HP theo power
    playerMaxHP += 2;
    playerHP = playerMaxHP;
    updatePlayerHPBar();

    // tăng kích thước chậm hơn
    const newSize = 80 + teamPower * 2;
    player.style.width = `${newSize}px`;
    player.style.height = `${newSize}px`;

    const gameRect = game.getBoundingClientRect();
    showPopup(`+1: ${name} đã tham gia!`, playerCenterX - gameRect.left, playerCenterY - gameRect.top - 50);

    spawnNextFriend();
  }
}

function spawnEnemy() {
  const enemy = document.createElement('div');
  enemy.className = 'enemy';
  enemy.style.position = 'absolute';

  const posX = Math.random() * (game.clientWidth - 60) + 30;
  const posY = Math.random() * (game.clientHeight - 60) + 30;

  enemy.style.left = `${posX}px`;
  enemy.style.top = `${posY}px`;

  // Enemy mạnh dần theo wave
  enemy.maxHP = 5 + currentWave * 2;
  enemy.health = enemy.maxHP;
  enemy.speed = BASE_ENEMY_SPEED + currentWave * 0.2;

  const hpBar = document.createElement('div');
  hpBar.className = 'hp-bar';
  const hpInner = document.createElement('div');
  hpInner.className = 'hp-bar-inner';
  hpBar.appendChild(hpInner);
  enemy.appendChild(hpBar);

  enemy.hpInner = hpInner;

  game.appendChild(enemy);
  enemies.push(enemy);
}

// Spawn theo wave
function startNextWave() {
  currentWave++;
  waveDisplay.innerText = `Wave: ${currentWave}`;

  waveNotice.style.display = "block";
  waveNotice.innerText = `Wave ${currentWave} sẽ bắt đầu sau 5 giây...`;

  setTimeout(() => {
    waveNotice.style.display = "none";

    const enemyCount = 2 + currentWave; 
    for (let i = 0; i < enemyCount; i++) {
      spawnEnemy();
    }

    waveInProgress = true;
  }, 5000);
}

// ✅ Hàm tìm enemy gần nhất
function getNearestEnemy() {
  if (enemies.length === 0) return null;

  let nearest = enemies[0];
  let minDist = Infinity;

  enemies.forEach(enemy => {
    const ex = enemy.offsetLeft + enemy.offsetWidth / 2;
    const ey = enemy.offsetTop + enemy.offsetHeight / 2;
    const dist = Math.hypot(ex - playerX, ey - playerY);

    if (dist < minDist) {
      minDist = dist;
      nearest = enemy;
    }
  });

  return nearest;
}

// ✅ Bắn đạn về enemy gần nhất
function createAttack(targetEnemy) {
  const attack = document.createElement('div');
  attack.className = 'attack';

  attack.x = playerX;
  attack.y = playerY;
  attack.width = 12;
  attack.height = 12;
  attack.damage = teamPower;

  const ex = targetEnemy.offsetLeft + targetEnemy.offsetWidth / 2;
  const ey = targetEnemy.offsetTop + targetEnemy.offsetHeight / 2;

  const dx = ex - playerX;
  const dy = ey - playerY;
  const dist = Math.hypot(dx, dy);

  attack.vx = (dx / dist) * ATTACK_SPEED;
  attack.vy = (dy / dist) * ATTACK_SPEED;

  attack.style.width = attack.width + "px";
  attack.style.height = attack.height + "px";
  attack.style.borderRadius = "50%";
  attack.style.background = "yellow";
  attack.style.position = "absolute";
  attack.style.left = `${attack.x - attack.width / 2}px`;
  attack.style.top = `${attack.y - attack.height / 2}px`;

  game.appendChild(attack);
  attacks.push(attack);
}

function updateEnemyHPBar(enemy) {
  const percent = Math.max(0, enemy.health) / enemy.maxHP * 100;
  enemy.hpInner.style.width = percent + '%';
}

function moveEnemies() {
  enemies.forEach(enemy => {
    const ex = enemy.offsetLeft + enemy.offsetWidth / 2;
    const ey = enemy.offsetTop + enemy.offsetHeight / 2;

    const dx = playerX - ex;
    const dy = playerY - ey;
    const dist = Math.hypot(dx, dy);

    const playerRadius = player.offsetWidth / 2;
    const enemyRadius = enemy.offsetWidth / 2;

    if (dist > playerRadius + enemyRadius) {
      const vx = (dx / dist) * enemy.speed;
      const vy = (dy / dist) * enemy.speed;
      enemy.style.left = `${enemy.offsetLeft + vx}px`;
      enemy.style.top = `${enemy.offsetTop + vy}px`;
    }
  });
}

function moveAttacks() {
  attacks.forEach((attack, i) => {
    attack.x += attack.vx;
    attack.y += attack.vy;

    if (
      attack.x < 0 || attack.x > game.clientWidth ||
      attack.y < 0 || attack.y > game.clientHeight
    ) {
      game.removeChild(attack);
      attacks.splice(i, 1);
      return;
    }

    attack.style.left = `${attack.x - attack.width / 2}px`;
    attack.style.top = `${attack.y - attack.height / 2}px`;
  });
}

function checkAttackCollisions() {
  attacks.forEach((attack, aIndex) => {
    enemies.forEach((enemy, eIndex) => {
      const attackRect = attack.getBoundingClientRect();
      const enemyRect = enemy.getBoundingClientRect();

      const attackCenterX = attackRect.left + attackRect.width / 2;
      const attackCenterY = attackRect.top + attackRect.height / 2;
      const enemyCenterX = enemyRect.left + enemyRect.width / 2;
      const enemyCenterY = enemyRect.top + enemyRect.height / 2;

      const dist = Math.hypot(enemyCenterX - attackCenterX, enemyCenterY - attackCenterY);
      const colliderDistance = Math.min(attackRect.width, attackRect.height) / 2 + Math.min(enemyRect.width, enemyRect.height) / 2;

      if (dist < colliderDistance) {
        enemy.health -= attack.damage;
        updateEnemyHPBar(enemy);

        if (enemy.health <= 0) {
          game.removeChild(enemy);
          enemies.splice(eIndex, 1);

          teamPower++;
          powerDisplay.innerText = `Power: ${teamPower}`;

          playerMaxHP += 2;
          playerHP = playerMaxHP;
          updatePlayerHPBar();

          const newSize = 80 + teamPower * 2;
          player.style.width = `${newSize}px`;
          player.style.height = `${newSize}px`;
        }

        game.removeChild(attack);
        attacks.splice(aIndex, 1);
      }
    });
  });
}

// ✅ Hiệu ứng rung + flash đỏ
function triggerDamageEffect() {
  damageFlash.style.opacity = "1";
  setTimeout(() => { damageFlash.style.opacity = "0"; }, 200);

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

    if (dist < colliderDistance + 10) {
      if (!enemy.lastDamageTime) {
        enemy.lastDamageTime = timestamp;
        playerHP--;
        updatePlayerHPBar();
        triggerDamageEffect();
      } else if (timestamp - enemy.lastDamageTime >= 1000) {
        enemy.lastDamageTime = timestamp;
        playerHP--;
        updatePlayerHPBar();
        triggerDamageEffect();
      }

      if (playerHP <= 0) {
        gameOver();
      }
    } else {
      enemy.lastDamageTime = null;
    }
  });
}

// ✅ Auto attack với cooldown giảm dần
function autoAttack(timestamp) {
  if (!lastAttackTime) lastAttackTime = timestamp;

  const cooldown = BASE_ATTACK_COOLDOWN / (1 + (teamPower - 1) * 0.2);

  if (timestamp - lastAttackTime > cooldown) {
    const targetEnemy = getNearestEnemy();
    if (targetEnemy) {
      createAttack(targetEnemy);
    }
    lastAttackTime = timestamp;
  }
}

// ================== GAME LOOP ================== //
function gameLoop(timestamp) {
  if (!inIntro) {
    movePlayer();
    checkCollision();
    moveEnemies();
    moveAttacks();
    checkAttackCollisions();
    checkEnemyCollisions(timestamp);
    autoAttack(timestamp);

    if (waveInProgress && enemies.length === 0) {
      waveInProgress = false;
      startNextWave();
    }
  }
  gameLoopId = requestAnimationFrame(gameLoop);
}

// ================== GAME OVER / RESET ================== //
function gameOver() {
  cancelAnimationFrame(gameLoopId);
  inIntro = true;

  setTimeout(() => {
    if (confirm("Bạn đã rớt môn! Game Over.\nBấm OK để chơi tiếp.")) {
      resumeGame();
    }
  }, 100);
}

// không reset wave
function resumeGame() {
  playerHP = playerMaxHP;
  updatePlayerHPBar();
  inIntro = false;
  startNextWave();
  requestAnimationFrame(gameLoop);
}

// ================== START GAME ================== //
function startGame() {
  spawnNextFriend();
  updatePlayerHPBar();
  powerDisplay.innerText = `Power: ${teamPower}`;
  startNextWave();

  requestAnimationFrame(gameLoop);
}

// ================== SỰ KIỆN ================== //
game.addEventListener('mousemove', e => {
  const rect = game.getBoundingClientRect();
  targetX = e.clientX - rect.left;
  targetY = e.clientY - rect.top;
});

game.addEventListener('touchstart', e => {
  const rect = game.getBoundingClientRect();
  const touch = e.touches[0];

  touchStart = {
    fingerX: touch.clientX - rect.left,
    fingerY: touch.clientY - rect.top,
    playerX: playerX,
    playerY: playerY
  };
});

game.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!touchStart) return;

  const rect = game.getBoundingClientRect();
  const touch = e.touches[0];

  const currentFingerX = touch.clientX - rect.left;
  const currentFingerY = touch.clientY - rect.top;

  const dx = currentFingerX - touchStart.fingerX;
  const dy = currentFingerY - touchStart.fingerY;

  targetX = touchStart.playerX + dx;
  targetY = touchStart.playerY + dy;
}, { passive: false });

game.addEventListener('touchend', () => {
  touchStart = null;
});

// ================== BẮT ĐẦU ================== //
window.onload = () => {
  // Bắt đầu bằng intro -> nextIntro() mới startGame
};

// ================== CSS RUNG ================== //
const style = document.createElement("style");
style.innerHTML = `
  .shake {
    animation: shake 0.3s;
  }
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
