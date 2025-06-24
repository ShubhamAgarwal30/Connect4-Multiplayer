import { getDatabase, ref, set, onValue, get, update } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

const db = getDatabase(firebaseApp);

const ROWS = 6;
const COLS = 7;
const board = document.getElementById("board");
const resetBtn = document.getElementById("reset");
const message = document.getElementById("winner-message");

let currentPlayer = 1;
let grid = [];
let isMyTurn = false;
let roomCode;
let gameRef;
let myPlayerRole = null;
let playerId = localStorage.getItem("playerId") || crypto.randomUUID();
localStorage.setItem("playerId", playerId);

function promptRoomCode() {
  roomCode = prompt("Enter room code (share with your friend):").trim();
  gameRef = ref(db, `rooms/${roomCode}`);

  const playersRef = ref(db, `rooms/${roomCode}/players`);
  get(playersRef).then(snapshot => {
    const players = snapshot.val() || {};

    if (players.player1 === playerId) {
      myPlayerRole = 'player1';
    } else if (players.player2 === playerId) {
      myPlayerRole = 'player2';
    } else if (!players.player1) {
      myPlayerRole = 'player1';
      update(playersRef, { player1: playerId });
    } else if (!players.player2) {
      myPlayerRole = 'player2';
      update(playersRef, { player2: playerId });
    } else {
      alert("Room is full. Please use a different room code.");
      return;
    }

    console.log("Assigned role:", myPlayerRole);
    createBoard();

    onValue(gameRef, snapshot => {
      const data = snapshot.val();
      if (!data || !data.grid) {
        if (myPlayerRole === 'player1') {
          console.log("Creating grid as Player 1");
          grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
          currentPlayer = 1;
          set(gameRef, { grid, currentPlayer, gameStarted: true });
        } else {
          console.log("Waiting for Player 1 to start the game...");
          return;
        }
      } else {
        grid = data.grid;
        currentPlayer = data.currentPlayer;
        renderBoard();
        updatePlayerIndicator();
        checkForEnd();
      }
    });
  });
}

function createBoard() {
  board.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener("click", handleClick);
      board.appendChild(cell);
    }
  }
  message.textContent = "";
  message.classList.remove("show");
}

function renderBoard() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = r * COLS + c;
      const cell = board.children[index];
      cell.classList.remove("player1", "player2");
      if (grid[r][c] === 1) cell.classList.add("player1");
      else if (grid[r][c] === 2) cell.classList.add("player2");
    }
  }
}

function handleClick(e) {
  updatePlayerIndicator();
  if (!isMyTurn || !grid.length) return;
  const col = parseInt(e.target.dataset.col);
  if (makeMove(col)) {
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    isMyTurn = false;
    syncGame();
  }
}

function makeMove(col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r][col] === 0) {
      grid[r][col] = currentPlayer;
      return true;
    }
  }
  return false;
}

function syncGame() {
  set(gameRef, { grid, currentPlayer });
}

function checkForEnd() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && checkWin(r, c)) {
        message.textContent = `🎉 Player ${grid[r][c] === 1 ? "Red" : "Yellow"} wins! 🎉`;
        message.className = "show animate__animated animate__fadeInDown";
        return;
      }
    }
  }
  if (grid.flat().every(cell => cell !== 0)) {
    message.textContent = "😐 It's a draw!";
    message.className = "show animate__animated animate__fadeInDown";
  }
}

function checkWin(r, c) {
  const player = grid[r][c];
  const directions = [
    [[0, 1], [0, -1]],
    [[1, 0], [-1, 0]],
    [[1, 1], [-1, -1]],
    [[1, -1], [-1, 1]]
  ];
  return directions.some(dir => {
    let count = 1;
    for (let [dr, dc] of dir) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] === player) {
        count++;
        nr += dr; nc += dc;
      }
    }
    return count >= 4;
  });
}

function updatePlayerIndicator() {
  resetBtn.textContent = currentPlayer === 1 ? "Red's Turn (Reset)" : "Yellow's Turn (Reset)";
  isMyTurn = (currentPlayer === 1 && myPlayerRole === 'player1') || (currentPlayer === 2 && myPlayerRole === 'player2');
}

resetBtn.addEventListener("click", promptRoomCode);
promptRoomCode();
