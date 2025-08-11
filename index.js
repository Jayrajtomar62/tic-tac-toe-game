let currentPlayer = 0;
let players = [];
let board = [];
let isSolo = false;
let soloDifficulty = 'easy';
const gridSize = 6;
const playerSymbols = ['X', 'O', '▲', '●'];
const playerColors = ['#00c6ff', '#ff6b6b', '#feca57', '#1dd1a1'];
let scores = {};

function chooseMode(mode) {
  document.getElementById('mode-selection').classList.add('hidden');
  if (mode === 'solo') {
    document.getElementById('difficulty-selection').classList.remove('hidden');
  } else {
    document.getElementById('players-selection').classList.remove('hidden');
  }
}

function startGame(numPlayers, difficulty = 'easy') {
  isSolo = numPlayers === 1;
  soloDifficulty = difficulty;
  players = isSolo ? ['X', 'O'] : playerSymbols.slice(0, numPlayers);
  board = Array(gridSize * gridSize).fill('');
  currentPlayer = 0;

  scores = {};
  players.forEach(p => (scores[p] = 0));

  updateScoreboard();
  resetDisplay();

  for (let i = 0; i < board.length; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    cell.addEventListener('click', handleMove);
    document.getElementById('game-board').appendChild(cell);
  }

  updateTurnText();
}

function resetDisplay() {
  document.getElementById('difficulty-selection').classList.add('hidden');
  document.getElementById('players-selection').classList.add('hidden');
  document.getElementById('popup').classList.add('hidden');
  document.getElementById('game-container').classList.remove('hidden');
  document.getElementById('game-board').innerHTML = '';
}

function handleMove(event) {
  const index = event.target.dataset.index;
  if (board[index] !== '') return;

  document.getElementById('move-sound').play();
  makeMove(index);

  if (isSolo && players[currentPlayer] === 'O' && !checkGameOver()) {
    setTimeout(aiMove, 500);
  }
}

function makeMove(index) {
  if (checkGameOver()) return;
  
  const symbol = players[currentPlayer];
  const color = playerColors[currentPlayer];
  board[index] = symbol;

  const cell = document.querySelector(`.cell[data-index='${index}']`);
  if (cell) {
    cell.textContent = symbol;
    cell.style.color = color;
  }

  if (checkWin(symbol)) {
    document.getElementById('win-sound').play();
    scores[symbol]++;
    updateScoreboard();
    showPopup(`Player ${symbol} wins!`);
    highlightWinningCells(symbol);
    disableBoard();
    return;
  }

  if (board.every(cell => cell !== '')) {
    document.getElementById('draw-sound').play();
    showPopup("It's a draw!");
    return;
  }

  currentPlayer = (currentPlayer + 1) % players.length;
  updateTurnText();
}

function updateTurnText() {
  const symbol = players[currentPlayer];
  const color = playerColors[currentPlayer];
  const turnEl = document.getElementById('turn-indicator');
  turnEl.textContent = `Player ${symbol}'s Turn`;
  turnEl.style.color = color;
}

function checkGameOver() {
  return document.getElementById('popup').classList.contains('show');
}

function disableBoard() {
  document.querySelectorAll('.cell').forEach(cell =>
    cell.removeEventListener('click', handleMove)
  );
}

function updateScoreboard() {
  const sb = document.getElementById('scoreboard');
  sb.innerHTML = players.map(p => `Player ${p}: ${scores[p]} pts`).join(' | ');
}

function restartSameGame() {
  startGame(players.length, soloDifficulty);
}

function resetGame() {
  document.getElementById('game-container').classList.add('hidden');
  document.getElementById('mode-selection').classList.remove('hidden');
}

function fullReset() {
  location.reload();
}

function showPopup(message) {
  document.getElementById('popup-message').textContent = message;
  document.getElementById('popup').classList.add('show');
  document.getElementById('overlay').classList.remove('hidden');
}
function aiMove() {
  let move;

  if (soloDifficulty === 'easy') {
    const empty = getEmptyCells();
    move = empty[Math.floor(Math.random() * empty.length)];
  } else if (soloDifficulty === 'medium') {
    move = findBestMoveMedium();
  } else if (soloDifficulty === 'hard') {
    move = findBestMoveHard();
  }

  if (move !== undefined) {
    makeMove(move);
  }
}

function getEmptyCells() {
  return board.map((val, idx) => (val === '' ? idx : null)).filter(v => v !== null);
}

// Medium AI: First try win/block, otherwise random
function findBestMoveMedium() {
  const ai = players[currentPlayer];
  const human = players[(currentPlayer + 1) % players.length];
  const empty = getEmptyCells();

  // Try to win
  for (let idx of empty) {
    board[idx] = ai;
    if (checkWin(ai)) {
      board[idx] = '';
      return idx;
    }
    board[idx] = '';
  }

  // Block human
  for (let idx of empty) {
    board[idx] = human;
    if (checkWin(human)) {
      board[idx] = '';
      return idx;
    }
    board[idx] = '';
  }

  // Random
  return empty[Math.floor(Math.random() * empty.length)];
}

// Hard AI: Minimax Algorithm
function findBestMoveHard() {
  let bestScore = -Infinity;
  let bestMove;
  for (let idx of getEmptyCells()) {
    board[idx] = players[currentPlayer];
    let score = minimax(0, false);
    board[idx] = '';
    if (score > bestScore) {
      bestScore = score;
      bestMove = idx;
    }
  }
  return bestMove;
}

function minimax(depth, isMaximizing) {
  const ai = players[currentPlayer];
  const human = players[(currentPlayer + 1) % players.length];

  if (checkWin(ai)) return 10 - depth;
  if (checkWin(human)) return depth - 10;
  if (board.every(cell => cell !== '')) return 0;

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let idx of getEmptyCells()) {
      board[idx] = ai;
      bestScore = Math.max(bestScore, minimax(depth + 1, false));
      board[idx] = '';
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let idx of getEmptyCells()) {
      board[idx] = human;
      bestScore = Math.min(bestScore, minimax(depth + 1, true));
      board[idx] = '';
    }
    return bestScore;
  }
}

// Check for win
function checkWin(symbol) {
  const directions = [1, gridSize, gridSize + 1, gridSize - 1];

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== symbol) continue;
    for (let dir of directions) {
      let count = 1;
      let pos = i + dir;
      while (
        pos < board.length &&
        board[pos] === symbol &&
        Math.abs((pos % gridSize) - ((pos - dir) % gridSize)) <= 1
      ) {
        count++;
        if (count === 4) return true;
        pos += dir;
      }
    }
  }

  // 2x2 square win
  for (let row = 0; row < gridSize - 1; row++) {
    for (let col = 0; col < gridSize - 1; col++) {
      const idx = row * gridSize + col;
      if (
        board[idx] === symbol &&
        board[idx + 1] === symbol &&
        board[idx + gridSize] === symbol &&
        board[idx + gridSize + 1] === symbol
      ) {
        return true;
      }
    }
  }

  return false;
}

// Highlight winning cells
function highlightWinningCells(symbol) {
  const directions = [1, gridSize, gridSize + 1, gridSize - 1];

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== symbol) continue;
    for (let dir of directions) {
      let count = 1;
      let pos = i + dir;
      let indexes = [i];
      while (
        pos < board.length &&
        board[pos] === symbol &&
        Math.abs((pos % gridSize) - ((pos - dir) % gridSize)) <= 1
      ) {
        indexes.push(pos);
        count++;
        if (count === 4) {
          indexes.forEach(idx => {
            const cell = document.querySelector(`.cell[data-index='${idx}']`);
            if (cell) cell.style.backgroundColor = '#00b894';
          });
          return;
        }
        pos += dir;
      }
    }
  }

  // Check 2x2 square
  for (let row = 0; row < gridSize - 1; row++) {
    for (let col = 0; col < gridSize - 1; col++) {
      const idx = row * gridSize + col;
      if (
        board[idx] === symbol &&
        board[idx + 1] === symbol &&
        board[idx + gridSize] === symbol &&
        board[idx + gridSize + 1] === symbol
      ) {
        [idx, idx + 1, idx + gridSize, idx + gridSize + 1].forEach(idx => {
          const cell = document.querySelector(`.cell[data-index='${idx}']`);
          if (cell) cell.style.backgroundColor = '#00b894';
        });
        return;
      }
    }
  }
}
