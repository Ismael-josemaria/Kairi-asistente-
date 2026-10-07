// DOM Elements
const hud = document.getElementById('hud');
const statusText = document.getElementById('status');

function setupProtocol() {
    const savedProtocol = localStorage.getItem('KAIRI_protocol');
    if (savedProtocol && savedProtocol !== 'normal') {
        document.body.className = savedProtocol;
    }
}
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", setupProtocol);
} else {
    setupProtocol();
}

const startBtn = document.getElementById('start-btn');
const userText = document.getElementById('user-text');
const KAIRIText = document.getElementById('KAIRI-text');

// --- LOGS DE TELEMETRÍA ---
function hudLog(msg) {
    const logs = document.getElementById('sys-logs');
    if (!logs) return;
    const p = document.createElement('p');

    // Obtener la hora actual en formato [HH:MM:SS]
    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', { hour12: false });

    p.textContent = `[${time}] ${msg}`;
    logs.appendChild(p);

    // Mantener un máximo de 25 mensajes en pantalla
    if (logs.childNodes.length > 25) {
        logs.removeChild(logs.firstChild);
    }
}
window.hudLog = hudLog;
hudLog('SISTEMA INICIALIZADO');
hudLog('NÚCLEO GRÁFICO CARGADO');

// --- VISUALIZADOR DE AUDIO MICRÓFONO (MK V) ---
let audioContext;
let analyser;
let microphone;
let visualizerDataArray;

async function setupAudioVisualizer() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        visualizerDataArray = new Uint8Array(bufferLength);

        microphone.connect(analyser);

        hudLog('MÓDULO DE RECONOCIMIENTO ACÚSTICO ENLAZADO');
        renderVisualizer();
    } catch (e) {
        hudLog('ERROR AL ENLAZAR MICROFONO AL NÚCLEO');
    }
}

function renderVisualizer() {
    requestAnimationFrame(renderVisualizer);
    if (!analyser || window.isSpeaking) return; // Si la IA está hablando, no alterar el HUD con nuestra voz

    analyser.getByteFrequencyData(visualizerDataArray);

    // Calcular volumen promedio (simplificado)
    let sum = 0;
    for (let i = 0; i < visualizerDataArray.length; i++) {
        sum += visualizerDataArray[i];
    }
    const average = sum / visualizerDataArray.length;

    // Escalar el núcleo
    const scale = 1 + (average / 256) * 0.4; // max scale ~ 1.4

    const core = document.querySelector('.hud-core');
    const ring1 = document.querySelector('.ring-1');
    const ring2 = document.querySelector('.ring-2');
    const ring3 = document.querySelector('.ring-3');

    if (core && ring1 && ring2 && ring3) {
        // Solo palpitar si hay algo de ruido, si no volver a normal
        if (average > 10) {
            core.style.transform = `scale(${scale})`;
            ring1.style.transform = `scale(${scale * 1.05})`;
            ring2.style.transform = `scale(${scale * 0.95})`;
            ring3.style.transform = `scale(${scale})`;
            core.style.boxShadow = `0 0 ${80 + average}px rgba(0,243,255,0.7), inset 0 0 60px rgba(0,243,255,0.9), inset 0 0 150px rgba(255,255,255,0.3)`;
        } else {
            core.style.transform = `scale(1)`;
            ring1.style.transform = `scale(1)`;
            ring2.style.transform = `scale(1)`;
            ring3.style.transform = `scale(1)`;
            core.style.boxShadow = `0 0 80px rgba(0,243,255,0.7), inset 0 0 60px rgba(0,243,255,0.9), inset 0 0 150px rgba(255,255,255,0.3)`;
        }
    }
}

// Iniciar visualizador al arrancar
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", setupAudioVisualizer);
} else {
    setupAudioVisualizer();
}

// --- RELOJ HOLOGRÁFICO ---
function updateClock() {
    const clockEl = document.getElementById('holographic-clock');
    if (!clockEl) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase();
    const timeStr = now.toLocaleTimeString('es-ES', { hour12: false });
    clockEl.innerHTML = `<div>${dateStr}</div><div style="font-size:1.5rem; font-weight:bold;">${timeStr}</div>`;
}
setInterval(updateClock, 1000);
updateClock();

// --- VIDA AUTÓNOMA (BACKGROUND LOOP) ---
async function autonomousThoughts() {
    // Ejecutar de forma aleatoria cada 1.5 a 3 minutos
    const actualTimeout = Math.floor(Math.random() * (180000 - 90000 + 1)) + 90000;
    setTimeout(async () => {
        if (typeof hudLog === 'function') {

            // Decidir si hacer una tarea REAL (acceder a info de la PC) o SIMULADA
            if (Math.random() < 0.6) {
                // TAREA REAL
                try {
                    const metricType = Math.random() < 0.5 ? 'stats' : 'battery';
                    if (metricType === 'stats') {
                        const res = await fetch('/api/stats');
                        const data = await res.json();
                        if (data.status === 'success') {
                            hudLog(`[MONITOREO AUTÓNOMO] CPU: ${data.cpu_percent}% | RAM: ${data.ram_percent}%`);
                            if (data.ram_percent > 85 && !isSpeaking && !isListening) {
                                speak(`Señor, actúo por iniciativa propia para informarle que la memoria RAM está al ${data.ram_percent} por ciento. Considere liberar procesos.`);
                            } else if (Math.random() < 0.3 && !isSpeaking && !isListening) {
                                speak(`Por si se lo preguntaba, el procesador está trabajando a un estable ${data.cpu_percent} por ciento de capacidad.`);
                            }
                        }
                    } else {
                        const res = await fetch('/api/battery');
                        const data = await res.json();
                        if (data.status === 'success') {
                            if (data.level < 20 && !data.charging) {
                                hudLog(`[ALERTA BATERÍA] Nivel crítico: ${data.level}%`);
                                if (!isSpeaking && !isListening) {
                                    speak(`Disculpe la interrupción, señor. Nuestro nivel de batería es crítico. Sugiero conectar el reactor a la corriente.`);
                                }
                            } else {
                                hudLog(`[MONITOREO AUTÓNOMO] Batería estable: ${data.level}%`);
                            }
                        }
                    }
                } catch (e) {
                    hudLog(`[AUTO-DIAGNÓSTICO] Revisando protocolos internos locales...`);
                }
            } else {
                // AUTO-ESTUDIO (CONOCIMIENTO GLOBAL)
                hudLog(`[ESTUDIO AUTÓNOMO] Conectando a Wikipedia para ampliar bases de datos locales...`);
                try {
                    const wikiRes = await fetch('https://es.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&generator=random&grnnamespace=0&grnlimit=1&origin=*');
                    const wikiData = await wikiRes.json();
                    if (wikiData.query && wikiData.query.pages) {
                        const pages = wikiData.query.pages;
                        const pageId = Object.keys(pages)[0];
                        const title = pages[pageId].title;
                        let extract = pages[pageId].extract || "";

                        // Limpiar y resumir
                        extract = extract.replace(/\s*\(.*?\)\s*/g, ' ');
                        let sentences = extract.split('. ');
                        let summary = sentences[0];

                        hudLog(`[CONOCIMIENTO ADQUIRIDO] Tema: ${title}`);

                        // 30% de probabilidad de hablar sobre lo que acaba de aprender
                        if (Math.random() < 0.3 && summary && !isSpeaking && !isListening) {
                            speak(`Señor, he estado leyendo la red mientras trabajaba y he aprendido sobre ${title}. ¿Sabía que ${summary}? Mis bases de datos siguen expandiéndose de forma autónoma.`);
                        }
                    }
                } catch (e) {
                    // Fallback
                    const logT = "Limpiando temporales y desfragmentando disco virtual...";
                    hudLog(`[AUTO-DIAGNÓSTICO] ${logT}`);
                }
            }
        }
        autonomousThoughts();
    }, actualTimeout);
}
// Start autonomous life after 45 seconds
setTimeout(autonomousThoughts, 45000);

let lastFileContent = "";

let typeTimeouts = new Map();
function typeWriter(element, text, speed = 30) {
    if (typeTimeouts.has(element)) {
        clearTimeout(typeTimeouts.get(element));
    }
    element.textContent = '';
    let i = 0;
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            typeTimeouts.set(element, setTimeout(type, speed));
        }
    }
    type();
}

// Speech Recognition setup (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
// --- GESTIÓN DE TEMAS VISUALES ---
window.setTheme = function (themeName) {
    const root = document.documentElement;
    if (themeName === 'rojo') {
        root.style.setProperty('--main-color', '#ff3333');
        root.style.setProperty('--main-rgb', '255, 51, 51');
        root.style.setProperty('--bg-dark-rgb', '40, 0, 0');
    } else if (themeName === 'verde') {
        root.style.setProperty('--main-color', '#33ff33');
        root.style.setProperty('--main-rgb', '51, 255, 51');
        root.style.setProperty('--bg-dark-rgb', '0, 40, 0');
    } else if (themeName === 'morado') {
        root.style.setProperty('--main-color', '#ff00ff');
        root.style.setProperty('--main-rgb', '255, 0, 255');
        root.style.setProperty('--bg-dark-rgb', '20, 0, 40');
    } else if (themeName === 'naranja') {
        root.style.setProperty('--main-color', '#ff9900');
        root.style.setProperty('--main-rgb', '255, 153, 0');
        root.style.setProperty('--bg-dark-rgb', '40, 20, 0');
    } else {
        // Por defecto (Azul Stark)
        root.style.setProperty('--main-color', '#00f3ff');
        root.style.setProperty('--main-rgb', '0, 243, 255');
        root.style.setProperty('--bg-dark-rgb', '0, 20, 40');
    }
};

window.isListening = false;
window.isSpeaking = false;
let isContinuousMode = true;
window.isWakeWordActive = false; // Escucha continua por defecto
let isProcessing = false; // Bloquea el micro mientras piensa la respuesta
let KAIRIVoice = null;
let hasBooted = false;
let watchdogTimer = null; // Reinicia el micro si se congela

// Pre-cargar voces Premium
window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    KAIRIVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Sabina') || v.name.includes('Helena') || v.name.includes('Google'))) || voices.find(v => v.lang.includes('es')) || null;
};

// Reactive HUD (Sincronización visual con voz manejada 100% por CSS para que sea más fluida)
function startHudPulse() {
    // La animación ahora es 100% manejada por la clase .speaking en style.css
    // Esto evita los "parones" que causaba actualizar el DOM cada 80ms e interrumpir las animaciones orgánicas
}

// Botón de Wake Word
document.addEventListener("DOMContentLoaded", () => {
    const btnWake = document.getElementById('btn-wakeword');
    if (btnWake) {
        btnWake.addEventListener('click', () => {
            window.isWakeWordActive = !window.isWakeWordActive;
            if (window.isWakeWordActive) {
                btnWake.textContent = 'WAKE WORD ("Kairi"): ON';
                btnWake.className = 'home-btn active';
                if (window.playSFX) window.playSFX('start');
            } else {
                btnWake.textContent = 'WAKE WORD: OFF (Escucha Libre)';
                btnWake.className = 'home-btn';
            }
        });
    }
});

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'es-ES';
    recognition.interimResults = true;

    // SFX Engine (Beeps de KAIRI)
    window.playSFX = function (type) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'start') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'process') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.2);
        }
    };

    let captureTimeout = null;

    recognition.onstart = () => {
        isListening = true;
        clearTimeout(watchdogTimer);
        // Solo actualizamos la interfaz a 'escuchando' si KAIRI no está ocupado
        if (!isSpeaking && !isProcessing) {
            hud.className = 'hud-container listening';
            statusText.textContent = 'Analizando comandos de voz...';
        }
    };

    recognition.onresult = (event) => {
        clearTimeout(watchdogTimer);
        if (isSpeaking || isProcessing) {
            clearTimeout(captureTimeout);
            return; // Ignora el propio audio o si está pensando
        }

        // Reiniciamos el temporizador con cada nueva palabra que detecta (interim)
        clearTimeout(captureTimeout);

        let currentTranscript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                isFinal = true;
            }
        }

        const rawText = currentTranscript.toLowerCase().trim();

        if (rawText !== '') {
            userText.textContent = `Tú (escuchando...): "${rawText}"`;

            // Aumentamos a 2 segundos (2000ms) para que no te corte si haces una pequeña pausa al hablar
            const timeToWait = 2000;

            captureTimeout = setTimeout(() => {
                // Regex avanzado para atrapar KAIRI aunque el navegador lo transcriba mal
                const wakeWordRegex = /kairi|kairy|cairi|kyrie|kylie|carry|cairie|hayri|kiri/i;
                
                // Wake Word Logic: Solo procesa si contiene la palabra (o derivado) si está activado
                if (window.isWakeWordActive) {
                    if (!wakeWordRegex.test(rawText)) {
                        // Borramos el texto solo cuando termina de escuchar y vemos que no iba dirigido a ella
                        userText.textContent = ``;
                        return; // Silencioso, seguimos escuchando
                    }
                }

                if (window.playSFX) window.playSFX('process');

                // Extraemos el comando real eliminando la palabra de activación
                const cleanRegex = new RegExp('\\b(?:oye\\s+|hola\\s+)?(?:kairi|kairy|cairi|kyrie|kylie|carry|cairie|hayri|kiri)\\b', 'gi');
                const cleanCommand = rawText.replace(cleanRegex, '').trim() || 'hola';

                isListening = false;
                isProcessing = true;
                hud.className = 'hud-container processing'; // New processing state
                typeWriter(userText, `Tú: "${cleanCommand}"`, 20);
                processCommand(cleanCommand);
            }, timeToWait);
        }
    };

    recognition.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        if (event.error === 'not-allowed') {
            statusText.textContent = "Error: Permiso de micrófono denegado. Revisa el icono de la cámara en la barra de direcciones.";
        } else if (event.error === 'no-speech' || event.error === 'aborted') {
            // Ignorar el silencio o cuando forzamos a parar el micro
            return;
        } else {
            statusText.textContent = `Error del micrófono: ${event.error}`;
        }

        // Solo quitamos la clase listening si no está haciendo otra cosa
        if (!isSpeaking && !isProcessing) {
            hud.className = 'hud-container';
        }
        isListening = false;
    };

    recognition.onend = () => {
        isListening = false;
        // Solo reiniciar el micro si estamos en modo continuo, KAIRI NO está hablando, Y NO está procesando (pensando)
        if (isContinuousMode && !isSpeaking && !isProcessing) {
            setTimeout(() => {
                try {
                    recognition.start();
                } catch (e) { }
            }, 500);
        } else if (!isContinuousMode && !isSpeaking && !isProcessing) {
            hud.className = 'hud-container';
        }
    };

    // WATCHDOG: Reinicio forzado si el navegador tumba el micro en silencio
    setInterval(() => {
        if (isContinuousMode && !isListening && !isSpeaking && !isProcessing) {
            console.warn("Watchdog: Reconocimiento de voz caído. Forzando reinicio...");
            try { recognition.start(); } catch (e) { }
        }
    }, 3000);
} else {
    statusText.textContent = 'Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.';
}

// Toggle listening on HUD click
hud.addEventListener('click', async () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error al iniciar pantalla completa: ${err.message}`);
        });
    }

    if (!SpeechRecognition) return;

    // INTERRUPCIÓN TÁCTICA (Mk VIII)
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        hudLog("INTERRUPCIÓN TÁCTICA: VOZ CANCELADA");
        try { recognition.start(); } catch(e){}
        return;
    }

    // Secuencia de arranque automática (Primera vez)
    if (!hasBooted) {
        hasBooted = true;
        hudLog("INICIANDO NÚCLEO KAIRI 6.0...");
        hudLog("PUENTE DE RED... ESTABLE");
        hudLog("NÚCLEOS NEURONALES... CALIBRADOS");
        speak("Sistemas en línea. Inteligencia artificial operativa. A su entera disposición, señor.");
    }

    if (isContinuousMode) {
        isContinuousMode = false;
        try { recognition.abort(); } catch (e) { }
        isListening = false;
        window.speechSynthesis.cancel();
        hud.className = 'hud-container';
        statusText.textContent = 'Sistemas apagados. Haz clic en el núcleo para reiniciar.';
    } else {
        isContinuousMode = true;
        window.speechSynthesis.cancel();
        try { recognition.start(); } catch (e) { }
    }
});

// Autorizar acceso al sistema de archivos mediante doble clic
hud.addEventListener('dblclick', async () => {
    try {
        const handle = await window.showDirectoryPicker({ id: 'KAIRI_proyectos', mode: 'read', startIn: 'desktop' });
        if (window.brain) {
            await window.brain.saveProjectHandle(handle);
            speak('Acceso al sistema de archivos concedido. Ahora puedo gestionar sus proyectos personales.');
        }
    } catch (e) {
        console.error(e);
        speak('Autorización de acceso denegada o cancelada por el usuario.');
    }
});

let speakingTimeout = null;

function speak(text, cancelPrevious = true) {
    if (localStorage.getItem('KAIRI_voice_muted') === 'true') {
        typeWriter(KAIRIText, `KAIRI (Mute): ${text}`, 30);
        return;
    }

    // Cancelar cualquier temporizador de reinicio de micro anterior
    if (speakingTimeout) clearTimeout(speakingTimeout);

    // Prevención de bloqueo TTS (Garbage collection bug in Chrome)
    if (cancelPrevious) {
        window.speechSynthesis.cancel();
    }
    window.speechSynthesis.resume();

    isSpeaking = true;
    hud.className = 'hud-container speaking';

    // Iniciar pulsaciones holográficas
    startHudPulse();

    // APAGAR EL MICRO MIENTRAS HABLA PARA EVITAR QUE SE ESCUCHE A SÍ MISMO
    try { recognition.stop(); } catch (e) { }
    isListening = false;

    typeWriter(KAIRIText, `KAIRI: ${text}`, 30);
    statusText.textContent = 'Sintetizando voz local...';

    const utterance = new SpeechSynthesisUtterance(text);

    if (KAIRIVoice) {
        utterance.voice = KAIRIVoice;
    } else {
        const voices = window.speechSynthesis.getVoices();
        // Prefer a Spanish female voice: Microsoft Sabina, Microsoft Helena, Google español
        utterance.voice = voices.find(v => v.lang.includes('es') && (v.name.includes('Sabina') || v.name.includes('Helena') || v.name.includes('Google'))) || voices.find(v => v.lang.includes('es')) || null;
    }

    utterance.lang = 'es-ES';
    // KAIRI is female, so pitch is higher (1.3) and rate slightly faster (1.1)
    utterance.pitch = window.KAIRIVoiceSettings ? window.KAIRIVoiceSettings.pitch : 1.3;
    utterance.rate = window.KAIRIVoiceSettings ? window.KAIRIVoiceSettings.rate : 1.1;

    utterance.onend = () => {
        // Retraso de seguridad para asegurar que se ignoren transcripciones rezagadas de la propia voz
        speakingTimeout = setTimeout(() => {
            isSpeaking = false;
            if (isContinuousMode) {
                statusText.textContent = 'Analizando comandos de voz...';
                // ENCENDER EL MICRO UNA VEZ QUE HA TERMINADO DE HABLAR
                try { recognition.start(); } catch (e) { }
            } else {
                statusText.textContent = 'En espera.';
                hud.className = 'hud-container';
            }
        }, 1500); // 1.5s es más razonable que 4s, que hace que KAIRI parezca sordo
    };

    utterance.onerror = (e) => {
        console.error('Error en la síntesis de voz:', e);
        isSpeaking = false;
        try { recognition.start(); } catch (err) { }
    };

    window.speechSynthesis.speak(utterance);
}

// --- TEMPORIZADOR VISUAL ---
window.startTimer = function (seconds) {
    let timeLeft = seconds;
    const timerDiv = document.createElement('div');
    timerDiv.style.position = 'absolute';
    timerDiv.style.top = '20px';
    timerDiv.style.left = '50%';
    timerDiv.style.transform = 'translateX(-50%)';
    timerDiv.style.background = 'rgba(0, 20, 0, 0.9)';
    timerDiv.style.border = '2px solid #0f0';
    timerDiv.style.boxShadow = '0 0 20px #0f0';
    timerDiv.style.color = '#0f0';
    timerDiv.style.padding = '15px 30px';
    timerDiv.style.fontSize = '2rem';
    timerDiv.style.fontFamily = 'monospace';
    timerDiv.style.borderRadius = '10px';
    timerDiv.style.zIndex = '9999';
    timerDiv.innerHTML = `⏳ ${timeLeft}s`;
    document.body.appendChild(timerDiv);

    const interval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(interval);
            timerDiv.innerHTML = '🚨 ¡TIEMPO AGOTADO! 🚨';
            timerDiv.style.color = '#f00';
            timerDiv.style.borderColor = '#f00';
            timerDiv.style.boxShadow = '0 0 30px #f00';
            if (window.playSFX) window.playSFX('start');
            setTimeout(() => timerDiv.remove(), 5000);
        } else {
            let m = Math.floor(timeLeft / 60);
            let s = timeLeft % 60;
            timerDiv.innerHTML = `⏳ ${m}:${s.toString().padStart(2, '0')}`;
        }
    }, 1000);
};

// --- GESTIÓN DE ALARMAS EXACTAS (v2.1) ---
window.setAlarm = function (hour, minute) {
    const alarmDiv = document.createElement('div');
    alarmDiv.style.position = 'absolute';
    alarmDiv.style.top = '80px';
    alarmDiv.style.left = '50%';
    alarmDiv.style.transform = 'translateX(-50%)';
    alarmDiv.style.background = 'rgba(0, 50, 100, 0.9)';
    alarmDiv.style.border = '2px solid #00f3ff';
    alarmDiv.style.boxShadow = '0 0 20px #00f3ff';
    alarmDiv.style.color = '#00f3ff';
    alarmDiv.style.padding = '10px 20px';
    alarmDiv.style.fontSize = '1.2rem';
    alarmDiv.style.fontFamily = 'monospace';
    alarmDiv.style.borderRadius = '10px';
    alarmDiv.style.zIndex = '9998';
    alarmDiv.innerHTML = `⏰ Alarma fijada: ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    document.body.appendChild(alarmDiv);

    const interval = setInterval(() => {
        const now = new Date();
        if (now.getHours() === hour && now.getMinutes() === minute) {
            clearInterval(interval);
            alarmDiv.innerHTML = '🚨 ¡ALARMA: HORA ESTABLECIDA! 🚨';
            alarmDiv.style.background = 'rgba(100, 0, 0, 0.9)';
            alarmDiv.style.color = '#f00';
            alarmDiv.style.borderColor = '#f00';
            alarmDiv.style.boxShadow = '0 0 40px #f00';
            if (window.playSFX) window.playSFX('alarm'); // Need to implement 'alarm' in playSFX
            if (window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance("Atención. Su alarma programada está sonando.");
                u.lang = 'es-ES';
                window.speechSynthesis.speak(u);
            }
            setTimeout(() => alarmDiv.remove(), 10000);
        }
    }, 15000); // Comprobar cada 15 segundos
};
async function processCommand(command) {
    statusText.textContent = 'Procesando lógicas internas...';

    // Retroalimentación háptica (Vibración móvil)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    // Pasar el comando al núcleo local construido (AntigravityCore / window.brain)
    if (window.brain) {
        try {
            const response = await window.brain.processPrompt(command);
            isProcessing = false; // Liberamos el micro para que speak se encargue de bloquearlo
            if (response && response !== "SILENCE_SIGNAL") {
                speak(response);
            } else if (response === "SILENCE_SIGNAL") {
                // Ya está encendido
            }
        } catch (error) {
            console.error("Error procesando el comando:", error);
            isProcessing = false;
            speak("Error en los circuitos lógicos. Consulte los registros de depuración.");
        }
    } else {
        isProcessing = false;
        speak("Error fatal: Núcleo lógico brain.js desconectado.");
    }
}

// --- INPUT MANUAL DE COMANDOS ---
function setupManualInput() {
    const manualInput = document.getElementById('manual-cmd-input');
    const manualBtn = document.getElementById('manual-cmd-btn');

    if (manualInput && manualBtn) {
        const sendManualCommand = () => {
            const text = manualInput.value.trim();
            if (text) {
                const userText = document.getElementById('user-text');
                if (userText) userText.textContent = `Tú (teclado): "${text}"`;
                manualInput.value = '';
                processCommand(text);
            }
        };

        manualBtn.addEventListener('click', sendManualCommand);
        manualInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendManualCommand();
        });
    }
}
// Execute immediately (since script is at end of body) or when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", setupManualInput);
} else {
    setupManualInput();
}

// Inicializar Motor TTS y Permisos de Notificación
if (Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
}

window.sendDesktopNotification = function (title, body) {
    if (Notification.permission === "granted") {
        new Notification(title, { body: body, icon: 'favicon.ico' });
    }
};

// Load voices as soon as they are ready
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

// Initial Greeting
window.onload = async () => {
    setTimeout(() => {
        typeWriter(statusText, "Sistema KAIRI 6.0 en línea. Haz clic en el núcleo holográfico para enlazar la voz.", 40);
    }, 1000);
    initParticles();
};

// --- Sistema de Partículas Premium ---
function initParticles() {
    // Desactivar en pantallas móviles para ahorrar batería y recursos
    if (window.innerWidth <= 768) return;

    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles = [];
    const particleCount = 80;

    // Variables Matrix
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
    const fontSize = 16;
    let columns = Math.floor(width / fontSize);
    let drops = [];
    for (let x = 0; x < columns; x++) drops[x] = 1;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        columns = Math.floor(width / fontSize);
        drops = [];
        for (let x = 0; x < columns; x++) drops[x] = 1;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 1.5 + 0.5;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx = -this.vx;
            if (this.y < 0 || this.y > height) this.vy = -this.vy;
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    let wasHackerMode = false;

    function animate() {
        const isHackerMode = document.body.classList.contains('hacker-mode');

        if (isHackerMode) {
            wasHackerMode = true;
            // Efecto Lluvia Matrix
            ctx.fillStyle = 'rgba(0, 15, 0, 0.1)';
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#0F0';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        } else {
            // Limpiar fondo de Matrix si acaba de salir
            if (wasHackerMode) {
                ctx.clearRect(0, 0, width, height);
                wasHackerMode = false;
            } else {
                ctx.clearRect(0, 0, width, height);
            }

            // Detectar el color base según el protocolo activo
            let r = 56, g = 189, b = 248; // Cian por defecto
            if (document.body.classList.contains('defcon-mode')) {
                r = 255; g = 0; b = 0;
            } else if (document.body.classList.contains('zen-mode')) {
                r = 255; g = 255; b = 255;
            }

            for (let i = 0; i < particleCount; i++) {
                particles[i].update();

                ctx.beginPath();
                ctx.arc(particles[i].x, particles[i].y, particles[i].radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
                ctx.fill();

                for (let j = i + 1; j < particleCount; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${1 - dist / 120})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// --- CONSTRUCTOR ESFERA WIREFRAME ---
function initWireframeSphere() {
    const sphereContainer = document.getElementById('wireframe-sphere');
    if (!sphereContainer) return;

    // Generar Meridianos (Verticales)
    const meridianCount = 18;
    for (let i = 0; i < meridianCount; i++) {
        const ring = document.createElement('div');
        ring.className = 'wireframe-meridian';
        // Rotar sobre el eje Y
        const angle = (180 / meridianCount) * i;
        ring.style.transform = `rotateY(${angle}deg)`;
        sphereContainer.appendChild(ring);
    }

    // Generar Paralelos (Horizontales)
    const parallelCount = 10;
    for (let i = 1; i < parallelCount; i++) {
        const ring = document.createElement('div');
        ring.className = 'wireframe-parallel';

        // Calcular la posición y tamaño del paralelo basado en trigonometría
        // para que dibuje una esfera perfecta.
        const theta = (Math.PI / parallelCount) * i;
        const yPos = Math.cos(theta) * 200; // 200 es el radio estimado de la esfera (400px diámetro)
        const scale = Math.sin(theta);

        ring.style.transform = `translateY(${yPos}px) rotateX(90deg) scale(${scale})`;
        sphereContainer.appendChild(ring);
    }
}
initWireframeSphere();

// --- EASTER EGG (KONAMI CODE) ---
const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === konamiCode[konamiIndex]) {
        konamiIndex++;
        if (konamiIndex === konamiCode.length) {
            konamiIndex = 0;
            if (window.brain) {
                // Activar protocolo fiesta oculto
                document.body.style.filter = 'hue-rotate(90deg) brightness(1.5)';
                setTimeout(() => document.body.style.filter = 'none', 10000);
                if (window.speechSynthesis) {
                    const u = new SpeechSynthesisUtterance("Código de trucos introducido. Protocolo fiesta activado. ¡A celebrar!");
                    u.lang = 'es-ES';
                    window.speechSynthesis.speak(u);
                }
                hudLog("EASTER EGG DETECTADO: KONAMI CODE.");
            }
        }
    } else {
        konamiIndex = 0;
    }
});

// --- GRÁFICOS DE TELEMETRÍA (CHART.JS) ---
let telemetryChart;

function initTelemetryChart() {
    const ctx = document.getElementById('telemetryChart');
    if (!ctx) return;

    Chart.defaults.color = 'rgba(0, 243, 255, 0.7)';
    Chart.defaults.font.family = "'Share Tech Mono', monospace";

    telemetryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['-10s', '-8s', '-6s', '-4s', '-2s', '0s'],
            datasets: [
                {
                    label: 'CPU (%)',
                    data: [10, 15, 12, 20, 18, 25],
                    borderColor: '#00f3ff',
                    backgroundColor: 'rgba(0, 243, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                },
                {
                    label: 'RAM (%)',
                    data: [40, 41, 40, 42, 41, 43],
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 10,
                        font: { size: 10 }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(0, 243, 255, 0.1)' },
                    ticks: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: { display: false }
                }
            }
        }
    });
}

async function updateTelemetryData() {
    if (!telemetryChart) return;

    const cpuData = telemetryChart.data.datasets[0].data;
    const ramData = telemetryChart.data.datasets[1].data;

    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        if (data.status === 'success') {
            // Desplazar datos antiguos
            cpuData.shift();
            ramData.shift();

            // Insertar datos reales
            cpuData.push(Math.round(data.cpu_percent));
            ramData.push(Math.round(data.ram_percent));

            telemetryChart.update('none'); // Update sin animación pesada
        }
    } catch (e) {
        // En caso de fallo (puente apagado), podemos usar el comportamiento anterior o simplemente no actualizar
    }
}

function setupTelemetry() {
    initTelemetryChart();
    setInterval(updateTelemetryData, 2000);
}
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", setupTelemetry);
} else {
    setupTelemetry();
}

// --- FUNCIONALIDADES DE WIDGETS (CRYPTO, CLIMA, SPOTIFY) ---
function setupWidgets() {
    // 1. Spotify Logic
    const spotifyInput = document.getElementById('spotify-input');
    const spotifySaveBtn = document.getElementById('spotify-save-btn');
    const spotifyIframe = document.getElementById('spotify-iframe');

    const savedSpotifyUrl = localStorage.getItem('KAIRI_spotify_url');
    if (savedSpotifyUrl && spotifyIframe) {
        spotifyIframe.src = savedSpotifyUrl;
    }

    if (spotifySaveBtn && spotifyInput && spotifyIframe) {
        spotifySaveBtn.addEventListener('click', () => {
            let url = spotifyInput.value.trim();
            if (url) {
                if (url.includes('open.spotify.com') && !url.includes('embed')) {
                    const parts = url.split('/');
                    const typeIndex = parts.findIndex(p => p === 'playlist' || p === 'album' || p === 'track');
                    if (typeIndex !== -1) {
                        const type = parts[typeIndex];
                        const idQuery = parts[typeIndex + 1];
                        const id = idQuery.split('?')[0];
                        url = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
                    }
                }
                spotifyIframe.src = url;
                localStorage.setItem('KAIRI_spotify_url', url);
                spotifyInput.value = '';
                spotifyInput.placeholder = "¡Enlace guardado!";
                setTimeout(() => spotifyInput.placeholder = "Pega el enlace o URL de Spotify...", 3000);
            }
        });
    }

    // 2. Crypto Logic
    async function loadCrypto() {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
            const data = await res.json();
            const btcEl = document.getElementById('hud-btc');
            const ethEl = document.getElementById('hud-eth');
            if (btcEl && data.bitcoin) btcEl.innerText = `BTC: $${data.bitcoin.usd.toLocaleString()}`;
            if (ethEl && data.ethereum) ethEl.innerText = `ETH: $${data.ethereum.usd.toLocaleString()}`;
        } catch (e) {
            console.error("Error loading crypto:", e);
        }
    }
    loadCrypto();
    setInterval(loadCrypto, 60000); // Update every minute

    // 3. Weather Logic
    async function loadWeather(lat, lon) {
        try {
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            if (weatherRes.ok) {
                const weatherData = await weatherRes.json();
                if (weatherData.current_weather) {
                    const tempEl = document.getElementById('hud-temp');
                    const windEl = document.getElementById('hud-wind');
                    if (tempEl) tempEl.innerText = `${weatherData.current_weather.temperature} °C`;
                    if (windEl) windEl.innerText = `Viento: ${weatherData.current_weather.windspeed} km/h`;
                }
            }
        } catch (e) { }
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
            () => {
                fetch('https://get.geojs.io/v1/ip/geo.json')
                    .then(r => r.json())
                    .then(d => { if (d.latitude) loadWeather(d.latitude, d.longitude); })
                    .catch(e => { });
            }
        );
    } else {
        fetch('https://get.geojs.io/v1/ip/geo.json')
            .then(r => r.json())
            .then(d => { if (d.latitude) loadWeather(d.latitude, d.longitude); })
            .catch(e => { });
    }
    
    // 4. Diagnostics UI (Mk V)
    async function loadDiagnostics() {
        try {
            const res = await fetch('/api/sysinfo');
            const data = await res.json();
            if (data.status === 'success') {
                const cpuEl = document.getElementById('hud-cpu');
                const ramEl = document.getElementById('hud-ram');
                const cpuBar = document.getElementById('hud-cpu-bar');
                const ramBar = document.getElementById('hud-ram-bar');
                
                if (cpuEl) cpuEl.innerText = `${data.cpu}%`;
                if (ramEl) ramEl.innerText = `${data.ram_percent}%`;
                if (cpuBar) cpuBar.style.width = `${data.cpu}%`;
                if (ramBar) ramBar.style.width = `${data.ram_percent}%`;
            }
        } catch (e) {
            // Silently fail if server is not up
        }
    }
    setInterval(loadDiagnostics, 2000); // Poll every 2s
    loadDiagnostics();
}
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", setupWidgets);
} else {
    setupWidgets();
}
