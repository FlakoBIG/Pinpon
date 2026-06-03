// ===== STATE =====
let queue = [];          // nombres en cola
let currentGame = null;  // { p1, p2, score1, score2, winPoints }
let history = [];
let winPoints = 11;
let winnerSide = null;   // 1 o 2 — lado donde se quedó el último ganador
let wins = {};           // { nombre: cantidad }

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('playerInput');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addPlayer(); });
  renderAll();
});

// ===== PLAYERS =====
function addPlayer() {
  const input = document.getElementById('playerInput');
  const name = input.value.trim();
  if (!name) return shake(input);
  if (queue.includes(name)) { shake(input); return; }
  queue.push(name);
  input.value = '';
  renderAll();
  if (!currentGame && queue.length >= 2) startGame();
}

function removePlayer(index) {
  queue.splice(index, 1);
  renderAll();
}

// ===== GAME =====
function startGame() {
  if (queue.length < 2) return;

  let p1, p2;

  if (winnerSide === 1) {
    // El ganador estaba a la izquierda, se queda como p1
    p1 = queue.shift();
    p2 = queue.shift();
  } else if (winnerSide === 2) {
    // El ganador estaba a la derecha, se queda como p2
    p2 = queue.shift();
    p1 = queue.shift();
  } else {
    // Primer juego, sin historial de lado
    p1 = queue.shift();
    p2 = queue.shift();
  }

  winnerSide = null;
  currentGame = { p1, p2, score1: 0, score2: 0, winPoints };
  renderAll();
}

function changeScore(player, delta) {
  if (!currentGame) return;
  if (player === 1) {
    currentGame.score1 = Math.max(0, currentGame.score1 + delta);
    if (delta > 0) bumpScore('p1Score');
  } else {
    currentGame.score2 = Math.max(0, currentGame.score2 + delta);
    if (delta > 0) bumpScore('p2Score');
  }
  renderScoreboard();
  checkWin();
}

function checkWin() {
  if (!currentGame) return;
  const { score1, score2, winPoints: wp } = currentGame;
  if (score1 >= wp) declareWinner(1);
  else if (score2 >= wp) declareWinner(2);
}

function declareWinner(player) {
  const winner = player === 1 ? currentGame.p1 : currentGame.p2;
  const loser  = player === 1 ? currentGame.p2 : currentGame.p1;
  const s1 = currentGame.score1;
  const s2 = currentGame.score2;

  // Sumar victoria
  wins[winner] = (wins[winner] || 0) + 1;

  // Guardar el lado del ganador para el próximo juego
  winnerSide = player;

  // Guardar historial
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  history.unshift({ winner, loser, s1, s2, time: timeStr });

  // El perdedor va al final de la cola
  queue.push(loser);

  // El ganador al frente para que startGame lo tome primero
  if (queue.length >= 1) {
    queue.unshift(winner);
  } else {
    queue.push(winner);
  }

  // Mostrar modal — el siguiente rival es queue[1] (quien jugará contra el ganador)
  showWinModal(winner, player === 1 ? s1 : s2, player === 1 ? s2 : s1);

  currentGame = null;
  renderAll();
}

function endGame() {
  if (!currentGame) return;
  // Devolver ambos jugadores a la cola
  queue.unshift(currentGame.p2);
  queue.unshift(currentGame.p1);
  currentGame = null;
  renderAll();
}

function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  panel.classList.toggle('hidden');
}

function applySettings() {
  const val = parseInt(document.getElementById('winPoints').value);
  if (val >= 1 && val <= 99) {
    winPoints = val;
    if (currentGame) currentGame.winPoints = val;
  }
  document.getElementById('settingsPanel').classList.add('hidden');
  renderAll();
}

// ===== MODAL =====
function showWinModal(winner, wScore, lScore) {
  document.getElementById('winnerName').textContent = winner;
  document.getElementById('winnerScore').textContent = `${wScore} — ${lScore}`;

  const nextInfo = document.getElementById('nextUpInfo');
  // queue[0] = ganador (se queda), queue[1] = su próximo rival
  const nextRival = queue[1] || null;
  if (nextRival) {
    nextInfo.textContent = `⚔️ ${winner} vs ${nextRival}`;
  } else {
    nextInfo.textContent = `${winner} se queda en mesa. Sin rivales en cola.`;
  }

  spawnConfetti();
  document.getElementById('winModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('winModal').classList.add('hidden');
  document.getElementById('confettiArea').innerHTML = '';
  if (!currentGame && queue.length >= 2) startGame();
  renderAll();
}

function spawnConfetti() {
  const area = document.getElementById('confettiArea');
  area.innerHTML = '';
  const colors = ['#00d4ff','#a855f7','#f59e0b','#22c55e','#e94560','#fff'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + '%';
    el.style.top = '-10px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = (1.2 + Math.random() * 1.5) + 's';
    el.style.animationDelay = (Math.random() * 0.6) + 's';
    el.style.width = el.style.height = (6 + Math.random() * 8) + 'px';
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    area.appendChild(el);
  }
}

// ===== RENDER =====
function renderAll() {
  renderQueue();
  renderGameBoard();
  renderNextPlayer();
  renderWins();
  renderHistory();
}

function renderQueue() {
  const list = document.getElementById('queueList');
  const empty = document.getElementById('emptyQueue');
  list.innerHTML = '';

  if (queue.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  queue.forEach((name, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="queue-pos">${i + 1}</span>
      <span class="queue-name">${escHtml(name)}</span>
      <button class="queue-remove" onclick="removePlayer(${i})">✕</button>
    `;
    list.appendChild(li);
  });
}

function renderGameBoard() {
  const noGame   = document.getElementById('noGame');
  const board    = document.getElementById('gameBoard');
  const limitTxt = document.getElementById('gameLimit');

  if (!currentGame) {
    noGame.classList.remove('hidden');
    board.classList.add('hidden');
    return;
  }

  noGame.classList.add('hidden');
  board.classList.remove('hidden');

  document.getElementById('p1Name').textContent = currentGame.p1;
  document.getElementById('p2Name').textContent = currentGame.p2;
  document.getElementById('p1Avatar').textContent = currentGame.p1[0].toUpperCase();
  document.getElementById('p2Avatar').textContent = currentGame.p2[0].toUpperCase();
  limitTxt.innerHTML = `Primero en llegar a <strong>${currentGame.winPoints}</strong> puntos gana`;

  renderScoreboard();
}

function renderScoreboard() {
  if (!currentGame) return;
  const s1El = document.getElementById('p1Score');
  const s2El = document.getElementById('p2Score');
  s1El.textContent = currentGame.score1;
  s2El.textContent = currentGame.score2;

  // Highlight leader
  const b1 = document.getElementById('p1Block');
  const b2 = document.getElementById('p2Block');
  b1.classList.toggle('leading', currentGame.score1 > currentGame.score2);
  b2.classList.toggle('leading', currentGame.score2 > currentGame.score1);
}

function renderNextPlayer() {
  const avatar = document.getElementById('nextAvatar');
  const name   = document.getElementById('nextName');

  if (queue.length === 0) {
    avatar.textContent = '?';
    name.textContent = 'Sin jugadores en cola';
    return;
  }

  const next = queue[0];
  avatar.textContent = next[0].toUpperCase();
  name.textContent = next;
}

function renderWins() {
  const list  = document.getElementById('winsList');
  const empty = document.getElementById('emptyWins');
  list.innerHTML = '';

  const entries = Object.entries(wins).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const medals = ['🥇', '🥈', '🥉'];

  entries.forEach(([name, count], i) => {
    const li = document.createElement('li');
    const medal = medals[i] || '🏓';
    const isFirst = i === 0;
    li.className = isFirst ? 'wins-item wins-first' : 'wins-item';
    li.innerHTML = `
      <span class="wins-medal">${medal}</span>
      <span class="wins-name">${escHtml(name)}</span>
      <span class="wins-bar-wrap">
        <span class="wins-bar" style="width:${Math.min(100, (count / entries[0][1]) * 100)}%"></span>
      </span>
      <span class="wins-count">${count} <span class="wins-label">${count === 1 ? 'victoria' : 'victorias'}</span></span>
    `;
    list.appendChild(li);
  });
}

function renderHistory() {  const list  = document.getElementById('historyList');
  const empty = document.getElementById('emptyHistory');
  list.innerHTML = '';

  if (history.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  history.slice(0, 10).forEach(h => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="history-trophy">🏆</span>
      <span class="history-text">
        <strong>${escHtml(h.winner)}</strong> venció a ${escHtml(h.loser)}
        <span style="color:#888"> (${h.s1}–${h.s2})</span>
      </span>
      <span class="history-time">${h.time}</span>
    `;
    list.appendChild(li);
  });
}

// ===== HELPERS =====
function bumpScore(id) {
  const el = document.getElementById(id);
  el.classList.remove('bump');
  void el.offsetWidth; // reflow
  el.classList.add('bump');
}

function shake(el) {
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'shake 0.35s ease';
  setTimeout(() => el.style.animation = '', 400);
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Shake keyframe via JS (fallback)
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%      { transform: translateX(-8px); }
  40%      { transform: translateX(8px); }
  60%      { transform: translateX(-5px); }
  80%      { transform: translateX(5px); }
}`;
document.head.appendChild(shakeStyle);
