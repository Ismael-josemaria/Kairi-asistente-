document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    
    // Scale for high DPI and size
    const ROWS = 20;
    const COLS = 10;
    const BLOCK_SIZE = 30; // 10*30 = 300, 20*30 = 600
    
    // Colors matching KAIRI theme
    const COLORS = [
        null,
        '#00f3ff', // I - Cyan
        '#00ff00', // J - Green
        '#ff00ff', // L - Magenta
        '#ffff00', // O - Yellow
        '#ff0000', // S - Red
        '#0000ff', // T - Blue
        '#ff8800'  // Z - Orange
    ];
    
    const PIECES = [
        [],
        [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // I
        [[2,0,0], [2,2,2], [0,0,0]], // J
        [[0,0,3], [3,3,3], [0,0,0]], // L
        [[4,4], [4,4]], // O
        [[0,5,5], [5,5,0], [0,0,0]], // S
        [[0,6,0], [6,6,6], [0,0,0]], // T
        [[7,7,0], [0,7,7], [0,0,0]]  // Z
    ];
    
    let board = [];
    let score = 0;
    let level = 1;
    let dropCounter = 0;
    let dropInterval = 1000;
    let lastTime = 0;
    let isGameOver = false;
    let animationId = null;
    let playerName = "ANONYMOUS";
    
    const player = {
        pos: {x: 0, y: 0},
        matrix: null,
    };
    
    // UI Elements
    const scoreElement = document.getElementById('current-score');
    const levelElement = document.getElementById('current-level');
    const statusElement = document.getElementById('game-status');
    const startBtn = document.getElementById('start-btn');
    const leaderboardEl = document.getElementById('leaderboard');
    
    function createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill(0));
        }
        return matrix;
    }
    
    function drawMatrix(matrix, offset) {
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = COLORS[value];
                    ctx.fillRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    // Add KAIRI neon glow effect
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect((x + offset.x) * BLOCK_SIZE, (y + offset.y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
    
    function draw() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
        for(let i=0; i<COLS; i++) {
            for(let j=0; j<ROWS; j++) {
                ctx.strokeRect(i * BLOCK_SIZE, j * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
        
        drawMatrix(board, {x: 0, y: 0});
        drawMatrix(player.matrix, player.pos);
    }
    
    function merge(board, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[y + player.pos.y][x + player.pos.x] = value;
                }
            });
        });
    }
    
    function collide(board, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }
    
    function rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [
                    matrix[x][y],
                    matrix[y][x],
                ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
            }
        }
        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }
    
    function playerDrop() {
        player.pos.y++;
        if (collide(board, player)) {
            player.pos.y--;
            merge(board, player);
            playerReset();
            arenaSweep();
            updateScore();
        }
        dropCounter = 0;
    }
    
    function playerMove(dir) {
        player.pos.x += dir;
        if (collide(board, player)) {
            player.pos.x -= dir;
        }
    }
    
    function playerRotate() {
        const pos = player.pos.x;
        let offset = 1;
        rotate(player.matrix, 1);
        while (collide(board, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -1);
                player.pos.x = pos;
                return;
            }
        }
    }
    
    function playerReset() {
        const pieces = '1234567';
        const type = pieces[pieces.length * Math.random() | 0];
        player.matrix = PIECES[type];
        player.pos.y = 0;
        player.pos.x = (Math.floor(COLS / 2)) - (Math.floor(player.matrix[0].length / 2));
        
        if (collide(board, player)) {
            gameOver();
        }
    }
    
    function arenaSweep() {
        let rowCount = 1;
        outer: for (let y = board.length - 1; y > 0; --y) {
            for (let x = 0; x < board[y].length; ++x) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            ++y;
            
            score += rowCount * 100;
            rowCount *= 2;
            
            if (score > level * 1000) {
                level++;
                dropInterval = Math.max(100, 1000 - (level * 100));
            }
        }
    }
    
    function updateScore() {
        scoreElement.innerText = score;
        levelElement.innerText = level;
    }
    
    function update(time = 0) {
        if (isGameOver) return;
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
        
        draw();
        animationId = requestAnimationFrame(update);
    }
    
    async function gameOver() {
        isGameOver = true;
        cancelAnimationFrame(animationId);
        statusElement.innerText = "SIMULACIÓN TERMINADA";
        
        // Solicitar nombre
        let name = prompt("Fin del juego. Ingrese su nombre para el registro de K.A.I.R.I.:", playerName);
        if (name) {
            playerName = name.substring(0, 15).toUpperCase();
            await saveScore(playerName, score);
        }
        
        startBtn.style.display = 'block';
        startBtn.innerText = 'REINICIAR SIMULACIÓN';
    }
    
    async function fetchScores() {
        try {
            const data = JSON.parse(localStorage.getItem('kairi_tetris_scores')) || [];
            
            leaderboardEl.innerHTML = '';
            if (data && data.length > 0) {
                data.sort((a, b) => b.score - a.score);
                data.forEach(s => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span>${s.player}</span> <span>${s.score}</span>`;
                    leaderboardEl.appendChild(li);
                });
            } else {
                leaderboardEl.innerHTML = '<li>Sin registros aún.</li>';
            }
        } catch (e) {
            leaderboardEl.innerHTML = '<li>Error al cargar registros.</li>';
        }
    }
    
    async function saveScore(playerStr, points) {
        if (points <= 0) return;
        try {
            let data = JSON.parse(localStorage.getItem('kairi_tetris_scores')) || [];
            data.push({ player: playerStr, score: points });
            data.sort((a, b) => b.score - a.score);
            data = data.slice(0, 5); // Keep top 5
            localStorage.setItem('kairi_tetris_scores', JSON.stringify(data));
            await fetchScores();
        } catch (e) {
            console.error(e);
        }
    }
    
    // Controles
    document.addEventListener('keydown', event => {
        if (isGameOver) return;
        
        if (event.keyCode === 37) { // Left
            playerMove(-1);
        } else if (event.keyCode === 39) { // Right
            playerMove(1);
        } else if (event.keyCode === 40) { // Down
            playerDrop();
        } else if (event.keyCode === 38) { // Up
            playerRotate();
        }
    });
    
    startBtn.addEventListener('click', () => {
        board = createMatrix(COLS, ROWS);
        score = 0;
        level = 1;
        dropInterval = 1000;
        isGameOver = false;
        statusElement.innerText = "";
        updateScore();
        playerReset();
        startBtn.style.display = 'none';
        update();
    });

    // Cargar puntuaciones al iniciar
    fetchScores();
});
