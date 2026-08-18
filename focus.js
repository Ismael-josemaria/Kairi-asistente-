document.addEventListener("DOMContentLoaded", () => {
    const btnPink = document.getElementById('btn-pink');
    const btnWhite = document.getElementById('btn-white');
    const btnAlpha = document.getElementById('btn-alpha');
    const btnStop = document.getElementById('btn-stop');
    const visualizer = document.getElementById('visualizer');
    const volumeSlider = document.getElementById('volume-slider');
    
    // Pomodoro Elements
    const pomoTimer = document.getElementById('pomodoro-timer');
    const btnPomoStart = document.getElementById('btn-pomo-start');
    const btnPomoBreak = document.getElementById('btn-pomo-break');
    const btnPomoReset = document.getElementById('btn-pomo-reset');

    let audioContext = null;
    let currentSource = null;
    let globalGainNode = null;
    let animationId = null;

    // Timer variables
    let timerInterval = null;
    let timeLeft = 25 * 60; // 25 mins
    let isTimerRunning = false;

    // Inicializar visualizador
    const canvasCtx = visualizer.getContext('2d');
    visualizer.width = visualizer.clientWidth;

    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            globalGainNode = audioContext.createGain();
            globalGainNode.gain.value = volumeSlider.value;
            globalGainNode.connect(audioContext.destination);
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    // Actualizar volumen en tiempo real
    volumeSlider.addEventListener('input', (e) => {
        if (globalGainNode) {
            globalGainNode.gain.value = e.target.value;
        }
    });

    function stopAll() {
        if (currentSource) {
            currentSource.stop();
            currentSource.disconnect();
            currentSource = null;
        }
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        // Resetear UI
        btnPink.classList.remove('playing');
        btnWhite.classList.remove('playing');
        btnAlpha.classList.remove('playing');
        btnStop.style.display = 'none';
        visualizer.style.display = 'none';
    }

    function drawWave() {
        visualizer.width = visualizer.clientWidth;
        canvasCtx.clearRect(0, 0, visualizer.width, visualizer.height);
        
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, visualizer.height / 2);
        
        for (let i = 0; i < visualizer.width; i += 5) {
            let y = Math.sin(i * 0.05 + performance.now() * 0.005) * 15;
            if (!btnAlpha.classList.contains('playing')) {
                y += (Math.random() * 10 - 5);
            }
            // Escalar onda por volumen
            y *= volumeSlider.value * 2;
            canvasCtx.lineTo(i, (visualizer.height / 2) + y);
        }
        
        canvasCtx.strokeStyle = '#00f3ff';
        canvasCtx.lineWidth = 2;
        canvasCtx.stroke();
        
        animationId = requestAnimationFrame(drawWave);
    }

    function startVisuals(btn) {
        btn.classList.add('playing');
        btnStop.style.display = 'inline-block';
        visualizer.style.display = 'block';
        drawWave();
    }

    // --- GENERADORES SINTÉTICOS ---

    btnWhite.addEventListener('click', () => {
        stopAll();
        initAudioContext();
        
        const bufferSize = audioContext.sampleRate * 2;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;
        
        noiseSource.connect(globalGainNode);
        noiseSource.start();
        
        currentSource = noiseSource;
        startVisuals(btnWhite);
    });

    btnPink.addEventListener('click', () => {
        stopAll();
        initAudioContext();
        
        const bufferSize = audioContext.sampleRate * 2;
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            let white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11;
            b6 = white * 0.115926;
        }
        
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;
        
        noiseSource.connect(globalGainNode);
        noiseSource.start();
        
        currentSource = noiseSource;
        startVisuals(btnPink);
    });

    btnAlpha.addEventListener('click', () => {
        stopAll();
        initAudioContext();
        
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = 174;
        
        oscillator.connect(globalGainNode);
        oscillator.start();
        
        currentSource = oscillator;
        startVisuals(btnAlpha);
    });

    btnStop.addEventListener('click', stopAll);

    // --- POMODORO TIMER ---
    function updateTimerDisplay() {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        pomoTimer.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function toggleTimer() {
        if (isTimerRunning) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            btnPomoStart.innerText = "REANUDAR";
        } else {
            isTimerRunning = true;
            btnPomoStart.innerText = "PAUSAR";
            timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    isTimerRunning = false;
                    btnPomoStart.innerText = "INICIAR FOCO";
                    // Notificar fin de ciclo
                    if (window.speechSynthesis) {
                        const u = new SpeechSynthesisUtterance("Ciclo de enfoque completado.");
                        u.lang = 'es-ES';
                        window.speechSynthesis.speak(u);
                    }
                }
            }, 1000);
        }
    }

    btnPomoStart.addEventListener('click', () => {
        if (!isTimerRunning && timeLeft === 5 * 60) {
            timeLeft = 25 * 60; // Auto-reset to 25m if it was on break and stopped
        }
        toggleTimer();
    });

    btnPomoBreak.addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timeLeft = 5 * 60; // 5 mins break
        updateTimerDisplay();
        btnPomoStart.innerText = "INICIAR DESCANSO";
    });

    btnPomoReset.addEventListener('click', () => {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timeLeft = 25 * 60;
        updateTimerDisplay();
        btnPomoStart.innerText = "INICIAR FOCO";
    });

    updateTimerDisplay();
});
