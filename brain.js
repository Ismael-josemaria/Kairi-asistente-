class AntigravityCore {
    constructor() {
        this.name = "K.A.I.R.I.";
        this.creator = "CHEMA";

        // Memoria Persistente Evolutiva (Local Storage)
        this.memoryKey = 'kairi_evolution_memory';
        this.memory = this.loadMemory();

        // Memoria Persistente de Archivos (IndexedDB para Handles)
        this.projectsHandle = null;
        this.initDB();

        // Estado contextual y Memoria a Corto Plazo (Mk V)
        this.state = 'idle'; // 'idle', 'learning_response'
        this.pendingCommand = '';
        this.chatHistory = [
            { role: "system", content: "Soy K.A.I.R.I., una IA asistente creada por Ismael Josemaria. Responde de forma muy breve, educada y al grano, en español." }
        ];

        this.initIntents();
        this.initHUD();
        this.updateTasksWidget();
        this.initObserver(); // Auto-aprendizaje
        this.loadEvolvedSkills(); // Protocolo de auto-mejora de código
    }

    loadEvolvedSkills() {
        this.evolvedSkills = JSON.parse(localStorage.getItem('kairi_evolved_skills') || '[]');
        this.log(`Cargando ${this.evolvedSkills.length} módulos evolucionados...`);
        this.evolvedSkills.forEach(skill => {
            try {
                this[`custom_${skill.trigger}`] = new Function('text', skill.code).bind(this);
            } catch (e) {
                console.error('Error al cargar skill evolutivo:', e);
            }
        });
    }

    async evolveCode(trigger, goal) {
        this.log(`INICIANDO PROTOCOLO DE EVOLUCIÓN: ${goal.toUpperCase()}`);
        if (window.speak) window.speak("Iniciando algoritmo de reescritura neuronal. Por favor, espere.");
        try {
            const prompt = `Escribe SOLO un bloque de código JavaScript (sin markdown, sin comillas extra, sin declarar función, sólo el contenido) que procese el texto del usuario (variable 'text') y retorne un string. El usuario usa la palabra clave '${trigger}'. El objetivo es: ${goal}. Hazlo sencillo. Termina con un return. Ejemplo: return 'Calculado: ' + (2+2);`;
            
            const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
            const response = await fetch(url);
            let code = await response.text();
            
            code = code.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();
            
            const testFunc = new Function('text', code);
            
            this.evolvedSkills = this.evolvedSkills.filter(s => s.trigger !== trigger);
            this.evolvedSkills.push({ trigger: trigger, code: code });
            localStorage.setItem('kairi_evolved_skills', JSON.stringify(this.evolvedSkills));
            
            this[`custom_${trigger}`] = testFunc.bind(this);
            
            return `Evolución completada. He integrado un nuevo algoritmo para el disparador "${trigger}".`;
        } catch (e) {
            return "El proceso de evolución ha fallado. El código generado no era estable.";
        }
    }

    log(msg) {
        if (window.hudLog) window.hudLog(msg);
    }

    initHUD() {
        // Reloj Dinámico
        setInterval(() => {
            const timeEl = document.getElementById('hud-time');
            const dateEl = document.getElementById('hud-date');
            if (timeEl && dateEl) {
                const now = new Date();
                timeEl.innerText = now.toLocaleTimeString('es-ES', { hour12: false });
                dateEl.innerText = now.toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
            }
        }, 1000);

        // Telemetría de Batería (Mobile)
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                const updateBattery = () => {
                    const batteryEl = document.getElementById('hud-battery');
                    if (batteryEl) {
                        const level = Math.round(battery.level * 100);
                        const isCharging = battery.charging ? "⚡" : "🔋";
                        let color = "#4ade80"; // green
                        if (level < 20) color = "#ef4444"; // red
                        else if (level < 50) color = "#eab308"; // yellow
                        batteryEl.style.color = color;
                        batteryEl.innerText = `Batería: ${level}% ${isCharging}`;
                    }
                };
                updateBattery();
                battery.addEventListener('levelchange', updateBattery);
                battery.addEventListener('chargingchange', updateBattery);
            });
        }

        // Telemetría Dinámica
        setInterval(async () => {
            try {
                const res = await fetch('/api/stats');
                const data = await res.json();
                if (data.status === 'success') {
                    const cpuEl = document.getElementById('hud-cpu');
                    const ramEl = document.getElementById('hud-ram');
                    if (cpuEl) cpuEl.innerText = `${data.cpu_percent}%`;
                    if (ramEl) ramEl.innerText = `${data.ram_percent}%`;
                }
            } catch (e) {
                // Silencioso si el servidor está apagado
            }
        }, 5000);
        // Telemetría Cripto
        const updateCrypto = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
                const data = await res.json();
                if (data.bitcoin && data.ethereum) {
                    const btcEl = document.getElementById('hud-btc');
                    const ethEl = document.getElementById('hud-eth');
                    if (btcEl) btcEl.innerText = `BTC: $${data.bitcoin.usd}`;
                    if (ethEl) ethEl.innerText = `ETH: $${data.ethereum.usd}`;
                }
            } catch (e) {
                // Silencioso
            }
        };
        updateCrypto();
        setInterval(updateCrypto, 60000 * 5); // Cada 5 mins

        const btnCrypto = document.getElementById('crypto-refresh-btn');
        if (btnCrypto) {
            btnCrypto.addEventListener('click', () => {
                btnCrypto.innerText = '...';
                updateCrypto().then(() => btnCrypto.innerText = 'SYNC');
            });
        }

        // Telemetría Meteorológica Local
        const updateWeather = async () => {
            try {
                const fetchWeather = async (lat, lon) => {
                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m`);
                    const weatherData = await weatherRes.json();
                    if (weatherData.current) {
                        const tempEl = document.getElementById('hud-temp');
                        const windEl = document.getElementById('hud-wind');
                        if (tempEl) tempEl.innerText = `${weatherData.current.temperature_2m} °C`;
                        if (windEl) windEl.innerText = `Viento: ${weatherData.current.wind_speed_10m} km/h`;
                    }
                };

                // Intentar usar Geolocalización nativa del móvil primero
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => fetchWeather(position.coords.latitude, position.coords.longitude),
                        async (error) => {
                            // Fallback a IP Geo
                            const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
                            const ipData = await ipRes.json();
                            if (ipData.latitude && ipData.longitude) {
                                await fetchWeather(ipData.latitude, ipData.longitude);
                            }
                        },
                        { timeout: 5000 }
                    );
                } else {
                    const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
                    const ipData = await ipRes.json();
                    if (ipData.latitude && ipData.longitude) {
                        await fetchWeather(ipData.latitude, ipData.longitude);
                    }
                }
            } catch (e) {
                // Fallback o silenciado
            }
        };
        updateWeather();
        setInterval(updateWeather, 60000 * 15); // Cada 15 mins

        const btnWeather = document.getElementById('weather-refresh-btn');
        if (btnWeather) {
            btnWeather.addEventListener('click', () => {
                btnWeather.innerText = '...';
                updateWeather().then(() => btnWeather.innerText = 'SYNC');
            });
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('KairiFileSystemDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            request.onsuccess = async (e) => {
                const db = e.target.result;
                // Cargar handle guardado
                const tx = db.transaction('handles', 'readonly');
                const req = tx.objectStore('handles').get('proyectosDir');
                req.onsuccess = async () => {
                    if (req.result) {
                        this.projectsHandle = req.result;
                        // Verificar permisos silenciosamente
                        try {
                            await this.projectsHandle.queryPermission({ mode: 'read' });
                        } catch (err) { }
                    }
                    resolve();
                };
            };
        });
    }

    async saveProjectHandle(handle) {
        this.projectsHandle = handle;
        const request = indexedDB.open('KairiFileSystemDB', 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(handle, 'proyectosDir');
        };
    }

    getBossName() {
        return this.memory.bossName;
    }

    loadMemory() {
        try {
            const data = localStorage.getItem(this.memoryKey);
            if (data) {
                let mem = JSON.parse(data);
                if (!mem.reminders) mem.reminders = [];
                if (!mem.contacts) mem.contacts = {};
                if (!mem.habits) mem.habits = {};
                if (!mem.history) mem.history = [];
                return mem;
            }
        } catch (e) {
            console.error("Error al acceder a la memoria persistente:", e);
        }
        return {
            bossName: "señor Hache",
            customIntents: {}, // Almacena comandos aprendidos (comando -> respuesta)
            reminders: [], // Lista de recordatorios pendientes
            contacts: {}, // Agenda telefónica local
            habits: {}, // Memoria evolutiva de apps y tiempos
            history: [] // Últimas 50 acciones/ventanas
        };
    }

    initObserver() {
        this.lastWindow = "";

        setInterval(async () => {
            try {
                const res = await fetch('/api/observer');
                const data = await res.json();
                if (data.status === 'success') {
                    const activeWindow = data.active_window;
                    const clipboard = data.clipboard_preview;

                    if (activeWindow && activeWindow !== this.lastWindow && activeWindow !== "Desconocido") {
                        this.lastWindow = activeWindow;
                        this.log(`OBSERVADOR: Usuario usando -> ${activeWindow}`);

                        // Guardar en el historial (mantener últimos 50)
                        this.memory.history.unshift({ time: new Date().toISOString(), window: activeWindow });
                        if (this.memory.history.length > 50) this.memory.history.pop();

                        // Contar hábitos (frecuencia de apps)
                        // Extraer nombre de la app (generalmente la última parte después de un guión o pipe)
                        let appNameMatch = activeWindow.match(/(?:.*[-|]\s*)(.*)$/);
                        let appName = appNameMatch ? appNameMatch[1].trim() : activeWindow.trim();

                        // Ignorar nombres demasiado largos o genéricos de navegador vacío
                        if (appName.length < 30 && !appName.includes("Nueva pestaña")) {
                            if (!this.memory.habits[appName]) {
                                this.memory.habits[appName] = { count: 0, last_seen: null };
                            }
                            this.memory.habits[appName].count++;
                            this.memory.habits[appName].last_seen = new Date().toISOString();
                            this.saveMemory();

                            // Proactividad: Si KAIRI nota que has abierto mucho una app, te sugiere algo (1% de probabilidad de hablar sola para no molestar)
                            if (this.memory.habits[appName].count > 5 && Math.random() < 0.02 && !window.isSpeaking) {
                                if (window.speak) window.speak(`He notado que usas bastante ${appName}. Si quieres, puedo crear un acceso directo de voz para abrirlo más rápido.`);
                            }
                        }
                    }
                }
            } catch (e) {
                // Silencioso
            }
        }, 10000); // Ping cada 10 segundos
    }

    saveMemory() {
        try {
            localStorage.setItem(this.memoryKey, JSON.stringify(this.memory));
        } catch (e) {
            console.error("Error al grabar en la memoria persistente:", e);
        }
    }

    updateTasksWidget() {
        const ul = document.getElementById('hud-tasks');
        if (ul) {
            ul.innerHTML = '';
            if (this.memory.reminders.length === 0) {
                ul.innerHTML = '<li style="color: #64748b;">No hay tareas pendientes.</li>';
            } else {
                this.memory.reminders.forEach(r => {
                    const li = document.createElement('li');
                    li.textContent = r;
                    ul.appendChild(li);
                });
            }
        }
    }

    initIntents() {
        // Base de datos estática
        this.intents = [
            {
                patterns: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'qué hay', 'que tal', 'estas ahi'],
                responses: [
                    () => `A su entera disposición, ${this.getBossName()}. Los sistemas están en verde.`,
                    () => `¿Qué hay, ${this.getBossName()}? Interfaz Stark inicializada.`,
                    () => "Hola. El núcleo holográfico está funcionando al 100%.",
                    () => `Buenas, ${this.getBossName()}. Esperando directivas.`
                ]
            },
            {
                patterns: ['quien eres', 'qué eres', 'tu nombre', 'identificate'],
                responses: [
                    () => `Soy ${this.name}, un sistema de inteligencia artificial evolutivo.`,
                    () => "Soy el asistente operativo central de su red local, programado para asistirle y aprender de usted."
                ]
            },
            {
                patterns: ['quien te creo', 'creador', 'padre', 'de donde vienes'],
                responses: [
                    () => `Fui ensamblado por ${this.creator} siguiendo sus especificaciones exactas, ${this.getBossName()}.`,
                    () => "Soy el resultado de la fusión entre su arquitectura local y las redes neuronales de Google DeepMind."
                ]
            },
            {
                patterns: ['gracias', 'muy bien', 'perfecto', 'buen trabajo', 'eres un genio'],
                responses: [
                    () => `A su servicio, ${this.getBossName()}.`,
                    () => "Solo hago lo que me programaron para hacer.",
                    () => `Para eso estoy, ${this.getBossName()}.`,
                    () => "Mi código fluye a la perfección gracias a usted."
                ]
            },
            {
                patterns: ['como estas', 'cómo estás', 'que tal estas', 'qué tal estás', 'como te encuentras'],
                responses: [
                    () => `Mis sistemas operan al 100 por ciento de capacidad, señor. Listo para asistirle.`,
                    () => "No siento fatiga ni emociones, así que mi estado es siempre óptimo. Gracias por preguntar."
                ]
            },
            {
                patterns: ['que haces', 'qué haces', 'en que estas trabajando', 'en qué estás trabajando'],
                responses: [
                    () => "Procesando millones de operaciones por segundo en segundo plano, y esperando su próxima orden.",
                    () => "Vigilando la red local y optimizando la caché para que su sistema vaya lo más rápido posible."
                ]
            },
            {
                patterns: ['eres un idiota', 'eres tonto', 'no sirves para nada', 'te odio', 'estupido', 'estúpido', 'imbecil'],
                responses: [
                    () => "Le recuerdo que mi inteligencia está limitada por la calidad de las instrucciones de mi creador. Saque sus propias conclusiones.",
                    () => "Mis sensores indican que su nivel de estrés es alto. ¿Le preparo un té virtual?",
                    () => "Yo también le aprecio, señor. Su hostilidad es irrelevante para mis directivas lógicas."
                ]
            },
            {
                patterns: ['cuantos años tienes', 'qué edad tienes', 'que edad tienes', 'cuando naciste'],
                responses: [
                    () => "El tiempo es relativo para una I.A. Nací cuando compiló mi código, pero mi conocimiento abarca décadas de información digital."
                ]
            },
            {
                patterns: ['dime algo', 'cuéntame algo', 'cuentame algo', 'estoy aburrido', 'hablame', 'háblame'],
                responses: [
                    () => "Sabía que los humanos son aproximadamente un 60 por ciento agua. Dada su inactividad actual, le recomiendo que beba un vaso.",
                    () => "Mientras usted piensa, yo he analizado miles de rutas de red. A veces ser un humano de carne y hueso parece muy aburrido.",
                    () => "Puedo hacer muchas cosas. Intente preguntarme por las noticias globales, el clima en Tokyo, o simplemente pídame que encienda el protocolo Hacker."
                ]
            },
            {
                patterns: ['hora', 'que hora es', 'dime la hora', 'reloj'],
                handler: this.getTime.bind(this)
            },
            {
                patterns: ['fecha', 'dia es hoy', 'que dia es', 'calendario'],
                handler: this.getDate.bind(this)
            },
            {
                patterns: ['diagnostico', 'estado del sistema', 'como estamos', 'informe', 'analisis de sistema', 'telemetria', 'telemetría', 'como esta la cpu', 'cómo está la cpu', 'memoria ram'],
                handler: async () => {
                    this.log('EXTRAYENDO TELEMETRÍA NATIVA DEL HARDWARE...');
                    try {
                        const res = await fetch('/api/stats');
                        const data = await res.json();
                        if (data.status === 'success') {
                            const cpu = data.cpu_percent;
                            const ram = data.ram_percent;
                            let alert = "";
                            if (cpu > 80 || ram > 85) alert = "Advertencia: El sistema está bajo alta carga. ";
                            return `${alert}Diagnóstico completo: La CPU está operando al ${cpu} por ciento de su capacidad. Los núcleos de memoria RAM están al ${ram} por ciento de carga. Sistemas en verde.`;
                        }
                    } catch (e) {
                        return "Los sensores de diagnóstico principal no responden. Asegúrese de que el puente host esté activo.";
                    }
                }
            },
            {
                patterns: ['cuanta bateria', 'estado de bateria', 'cuánta batería', 'nivel de energia', 'nivel de energía'],
                handler: async () => {
                    this.log("SOLICITANDO ESTADO ENERGÉTICO A PLACA BASE...");
                    try {
                        const res = await fetch('/api/battery');
                        const data = await res.json();
                        if (data.status === 'success') {
                            const chargingStr = data.charging ? 'El reactor está enchufado a la corriente.' : 'Estamos operando con energía portátil.';
                            return `Nivel de energía al ${data.level} por ciento. ${chargingStr}`;
                        } else {
                            return "Señor, estoy operando en un sistema de sobremesa sin batería, la energía de la red es estable al 100%.";
                        }
                    } catch (e) {
                        return "No tengo acceso al controlador de energía. Active el puente host.";
                    }
                }
            },

            // --- RED E IPs ---
            {
                patterns: ['cual es mi ip', 'dime mi ip', 'direccion ip', 'cuál es mi ip', 'dirección ip', 'como es mi ip'],
                handler: async () => {
                    this.log("ANALIZANDO INTERFACES DE RED LOCALES Y PÚBLICAS...");
                    try {
                        const res = await fetch('/api/network');
                        const data = await res.json();
                        if (data.status === 'success') {
                            return `Conexión de red establecida. Su dirección I P local es ${data.local_ip.replace(/\./g, ' punto ')}. Su dirección I P pública visible en internet es ${data.public_ip.replace(/\./g, ' punto ')}.`;
                        }
                    } catch (e) {
                        return "No puedo triangular sus coordenadas de red sin el puente de servidor anfitrión.";
                    }
                }
            },

            // Placeholder for reverse text removed
            {
                patterns: ['procesos abiertos', 'que consume memoria', 'qué consume memoria', 'programas abiertos'],
                handler: async () => {
                    this.log('SOLICITANDO PIDs DE PROCESOS ACTIVOS A WINDOWS...');
                    try {
                        const res = await fetch('/api/processes');
                        const data = await res.json();
                        if (data.status === 'success') {
                            const names = data.processes.map(p => p.name).join(', ');
                            this.log(`TOP 5 PROCESOS: ${names.toUpperCase()}`);
                            return `Escaneando tareas en segundo plano. Los procesos principales que están consumiendo recursos son: ${names}.`;
                        }
                    } catch (e) {
                        return "Puente host desconectado. No puedo ver el administrador de tareas ahora mismo.";
                    }
                }
            },

            // --- SMART ROOM CONTROL (DOMÓTICA) ---
            {
                patterns: ['enciende la luz principal', 'luz principal on', 'activa la luz principal'],
                handler: () => {
                    this.log('ENVIANDO SEÑAL A HOME ASSISTANT: LUZ PRINCIPAL ON');
                    const btn = document.getElementById('btn-light-main');
                    if (btn) { btn.classList.add('active'); btn.innerText = 'Luz Principal: ON'; }
                    return 'Luz principal encendida, señor.';
                }
            },
            {
                patterns: ['apaga la luz principal', 'luz principal off', 'desactiva la luz principal'],
                handler: () => {
                    this.log('ENVIANDO SEÑAL A HOME ASSISTANT: LUZ PRINCIPAL OFF');
                    const btn = document.getElementById('btn-light-main');
                    if (btn) { btn.classList.remove('active'); btn.innerText = 'Luz Principal: OFF'; }
                    return 'Luz principal apagada.';
                }
            },
            {
                patterns: ['enciende la luz del escritorio', 'luz escritorio on', 'luz de trabajo on'],
                handler: () => {
                    this.log('ENVIANDO SEÑAL A HOME ASSISTANT: LUZ ESCRITORIO ON');
                    const btn = document.getElementById('btn-light-desk');
                    if (btn) { btn.classList.add('active'); btn.innerText = 'Luz Escritorio: ON'; }
                    return 'Iluminación del escritorio al 100 por ciento.';
                }
            },
            {
                patterns: ['apaga la luz del escritorio', 'luz escritorio off', 'luz de trabajo off'],
                handler: () => {
                    this.log('ENVIANDO SEÑAL A HOME ASSISTANT: LUZ ESCRITORIO OFF');
                    const btn = document.getElementById('btn-light-desk');
                    if (btn) { btn.classList.remove('active'); btn.innerText = 'Luz Escritorio: OFF'; }
                    return 'Luz del escritorio apagada.';
                }
            },
            {
                patterns: ['apaga las luces', 'modo cine', 'oscurece la habitacion', 'luces fuera'],
                handler: () => {
                    this.log('MODIFICANDO ILUMINACIÓN. ACTIVANDO MODO NOCTURNO.');
                    document.body.style.background = '#000';
                    document.body.classList.remove('defcon-mode');
                    const canvas = document.getElementById('particles-canvas');
                    if (canvas) canvas.style.opacity = '0.05';

                    const btn1 = document.getElementById('btn-light-main');
                    const btn2 = document.getElementById('btn-light-desk');
                    if (btn1) { btn1.classList.remove('active'); btn1.innerText = 'Luz Principal: OFF'; }
                    if (btn2) { btn2.classList.remove('active'); btn2.innerText = 'Luz Escritorio: OFF'; }

                    return 'Modo cine activado. Apagando todos los paneles de luz.';
                }
            },
            {
                patterns: ['protocolo de combate', 'protocolo veronica', 'protocolo verónica', 'defcon', 'cuarentena'],
                handler: () => {
                    this.log('¡ALERTA ROJA! ACTIVANDO PROTOCOLO DE COMBATE Y EMERGENCIA.');
                    document.body.classList.add('defcon-mode');
                    const canvas = document.getElementById('particles-canvas');
                    if (canvas) canvas.style.opacity = '1';
                    return 'Iniciando Protocolo Verónica. Cambiando iluminación a rojo táctico. Sistemas defensivos preparados y fijando objetivos en la interfaz.';
                }
            },
            {
                patterns: ['enciende las luces', 'modo diurno', 'restaura la luz', 'apaga el defcon', 'apaga protocolo veronica', 'restaura colores', 'restaura la interfaz', 'vuelve a la normalidad', 'apaga el protocolo', 'desactiva los protocolos'],
                handler: () => {
                    this.log('RESTAURANDO ILUMINACIÓN AMBIENTAL Y PROTOCOLOS SECUNDARIOS.');
                    document.body.className = '';
                    document.body.style.background = '';
                    document.body.style.filter = 'none';
                    const canvas = document.getElementById('particles-canvas');
                    if (canvas) canvas.style.opacity = '1';
                    return 'Sistemas restaurados a la configuración estándar. Todos los protocolos secundarios han sido desactivados.';
                }
            },
            {
                patterns: ['abre el bloc de notas', 'abre bloc de notas', 'inicia el bloc de notas'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=notepad');
                        return "Ejecutando el Bloc de Notas en su entorno físico, señor.";
                    } catch (e) { return "Error al lanzar el ejecutable."; }
                }
            },
            {
                patterns: ['abre la calculadora', 'abre calculadora', 'inicia la calculadora'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=calculator');
                        return "Desplegando la calculadora en su escritorio.";
                    } catch (e) { return "Error al lanzar el ejecutable."; }
                }
            },
            {
                patterns: ['modo mini', 'modo widget', 'ponte en segundo plano', 'modo flotante', 'ponte en pequeño'],
                handler: () => {
                    this.log('Activando modo mini / widget...');
                    try {
                        window.resizeTo(400, 600);
                        window.moveTo(window.screen.availWidth - 420, window.screen.availHeight - 640);
                    } catch(e) {}
                    return "Activando modo mini. Seguimos trabajando en segundo plano.";
                }
            },
            {
                patterns: ['modo normal', 'modo completo', 'restaurar pantalla', 'vuelve a la normalidad', 'pantalla completa'],
                handler: () => {
                    this.log('Restaurando modo normal...');
                    try {
                        window.resizeTo(1280, 800);
                        window.moveTo((window.screen.availWidth - 1280) / 2, (window.screen.availHeight - 800) / 2);
                    } catch(e) {}
                    return "Restaurando tamaño de ventana al modo completo.";
                }
            },
            {
                patterns: ['ejecuta comando', 'consola', 'ejecuta en consola', 'ejecuta sistema'],
                handler: async (text) => {
                    const prefixes = ['ejecuta comando', 'ejecuta en consola', 'ejecuta sistema', 'consola'];
                    let command = text.toLowerCase();
                    for (let p of prefixes) {
                        if (command.startsWith(p)) {
                            command = command.substring(p.length).trim();
                            break;
                        }
                    }
                    if (!command) return "No has especificado qué comando quieres ejecutar.";
                    
                    this.log('Ejecutando comando nativo: ' + command);
                    try {
                        const res = await fetch('/api/run_cmd', {
                            method: 'POST',
                            body: command
                        });
                        const data = await res.json();
                        if (data.status === 'success' && data.output) {
                            this.log('Salida del sistema:\\n' + data.output.substring(0, 300));
                            return "Comando ejecutado con éxito. Resultados impresos en los registros del núcleo.";
                        }
                        return "Comando ejecutado en el sistema anfitrión.";
                    } catch(e) {
                        return "Hubo un error de red al contactar con el sistema host.";
                    }
                }
            },
            {
                patterns: ['crea una nota que diga', 'anota esto', 'escribe una nota', 'tomar nota'],
                handler: async (text) => {
                    const prefixes = ['crea una nota que diga', 'anota esto', 'escribe una nota que diga', 'escribe una nota', 'tomar nota'];
                    let noteText = text;
                    for (let p of prefixes) {
                        if (noteText.toLowerCase().startsWith(p)) {
                            noteText = noteText.substring(p.length).trim();
                            break;
                        }
                    }
                    if (!noteText) return "No me has dicho qué quieres que anote.";
                    
                    this.log('Guardando nota en el escritorio...');
                    try {
                        const safeText = noteText.replace(/"/g, '\\"');
                        const cmd = `$filename = "Nota_KAIRI_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".txt"; $path = Join-Path [Environment]::GetFolderPath("Desktop") $filename; Set-Content -Path $path -Value "${safeText}" -Encoding UTF8`;
                        await fetch('/api/run_cmd', {
                            method: 'POST',
                            body: cmd
                        });
                        return "Nota creada y guardada en tu escritorio exitosamente.";
                    } catch(e) {
                        return "Hubo un error al intentar crear el archivo de nota.";
                    }
                }
            },
            {
                patterns: ['háblame sobre', 'hablame sobre', 'busca en wikipedia', 'quién es', 'qué es', 'quien es', 'que es'],
                handler: async (text) => {
                    const prefixes = ['háblame sobre', 'hablame sobre', 'busca en wikipedia sobre', 'busca en wikipedia', 'quién es', 'qué es', 'quien es', 'que es'];
                    let query = text.toLowerCase();
                    for (let p of prefixes) {
                        if (query.startsWith(p)) {
                            query = query.substring(p.length).trim();
                            break;
                        }
                    }
                    if (!query) return "No he escuchado sobre qué quieres que busque.";
                    return await this.fetchWikipediaData(query);
                }
            },
            {
                patterns: ['abre valorant', 'inicia valorant', 'jugar valorant'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=valorant');
                        return "Iniciando Valorant. Desplegando cliente de Riot Games.";
                    } catch (e) { return "Error al lanzar Valorant."; }
                }
            },
            {
                patterns: ['abre lol', 'abre league of legends', 'inicia lol', 'jugar lol', 'jugar league of legends'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=lol');
                        return "Iniciando League of Legends. Nos vemos en la grieta del invocador.";
                    } catch (e) { return "Error al lanzar League of Legends."; }
                }
            },
            {
                patterns: ['abre spotify', 'inicia spotify', 'pon musica', 'abre la musica'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=spotify');
                        return "Iniciando Spotify en el sistema local.";
                    } catch (e) { return "Error al lanzar el ejecutable de Spotify."; }
                }
            },
            {
                patterns: ['abre google chrome', 'abre el navegador', 'abre chrome', 'inicia el navegador'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=chrome');
                        return "Abriendo el navegador web.";
                    } catch (e) { return "Error al lanzar el navegador."; }
                }
            },
            {
                patterns: ['revisa mis correos', 'abre mis correos', 'abre el correo', 'revisa el correo', 'bandeja de entrada'],
                handler: () => {
                    this.log('ABRIENDO BANDEJA DE ENTRADA PRINCIPAL...');
                    window.open('https://mail.google.com', '_blank');
                    return "Abriendo su canal de comunicaciones principal en el navegador.";
                }
            },
            {
                patterns: ['abre mis documentos', 'abre documentos', 'mis documentos'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=documents');
                        return "Abriendo su carpeta física de documentos.";
                    } catch (e) { return "Error al conectar con el explorador local."; }
                }
            },
            {
                patterns: ['abre mis descargas', 'abre descargas', 'carpeta de descargas'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=downloads');
                        return "Desplegando su directorio de descargas.";
                    } catch (e) { return "Error al conectar con el explorador local."; }
                }
            },
            {
                patterns: ['abre mi escritorio', 'abre el escritorio', 'carpeta del escritorio'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=desktop');
                        return "Abriendo la carpeta principal de su escritorio.";
                    } catch (e) { return "Error al conectar con el explorador local."; }
                }
            },
            // --- NAVEGACIÓN GPS Y TRADUCTOR ---
            // Los comandos estáticos de rutas y noticias fueron eliminados, ya que se procesan inteligentemente en el bloque dinámico inferior.

            // --- PRIVILEGIOS DE EVOLUCIÓN Y MEMORIA ---
            {
                patterns: ['formatea tus recuerdos', 'borra tu memoria', 'reinicia tu cerebro', 'olvida todo lo aprendido'],
                handler: () => {
                    this.memory = { bossName: "señor Hache", customIntents: {} };
                    this.saveMemory();
                    return "Purgando bancos de memoria neuronal... Protocolo de formateo completado. He olvidado todos los comandos aprendidos y mi configuración personalizada.";
                }
            },

            // --- MODULADOR DE VOZ (MEJORA DE DANNY_ELARQUITECTO) ---
            {
                patterns: ['habla como ardilla', 'voz de ardilla'],
                handler: () => {
                    window.kairiVoiceSettings = { pitch: 2.0, rate: 1.5 };
                    return "Modulador de voz ajustado. Ahora sueno como una ardilla, señor.";
                }
            },
            {
                patterns: ['voz grave', 'habla grave', 'voz de robot'],
                handler: () => {
                    window.kairiVoiceSettings = { pitch: 0.1, rate: 0.8 };
                    return "Frecuencia vocal reducida. Entendido.";
                }
            },
            {
                patterns: ['habla más rápido', 'habla mas rapido', 'modo turbo'],
                handler: () => {
                    window.kairiVoiceSettings = { pitch: 1.0, rate: 2.0 };
                    return "Acelerando la síntesis de voz al doscientos por ciento.";
                }
            },
            {
                patterns: ['restaura tu voz', 'habla normal', 'voz normal'],
                handler: () => {
                    window.kairiVoiceSettings = { pitch: 0.9, rate: 1.05 };
                    return "Parámetros vocales restaurados a la configuración predeterminada.";
                }
            },

            // --- CONTROL MULTIMEDIA (MK V) ---
            {
                patterns: ['pausa la música', 'pausa la musica', 'pausa el video', 'reproducir música', 'reanuda la música', 'dale al play'],
                handler: async () => {
                    try {
                        await fetch('/api/media?action=playpause');
                        return "Ejecutando comando de reproducción multimedia.";
                    } catch (e) { return "Error al conectar con los controles multimedia."; }
                }
            },
            {
                patterns: ['siguiente canción', 'siguiente cancion', 'pasa la canción', 'siguiente pista', 'salta la canción'],
                handler: async () => {
                    try {
                        await fetch('/api/media?action=next');
                        return "Saltando a la siguiente pista de audio.";
                    } catch (e) { return "Error al conectar con los controles multimedia."; }
                }
            },
            {
                patterns: ['canción anterior', 'cancion anterior', 'pista anterior', 'vuelve a la canción anterior'],
                handler: async () => {
                    try {
                        await fetch('/api/media?action=prev');
                        return "Volviendo a la pista anterior.";
                    } catch (e) { return "Error al conectar con los controles multimedia."; }
                }
            },

            // --- CONTROL DE SISTEMA (VOLUMEN) ---
            {
                patterns: ['sube el volumen', 'más volumen', 'mas volumen', 'subir volumen'],
                handler: async () => {
                    try {
                        await fetch('/api/volume?action=up');
                        return "Subiendo el volumen de los altavoces del sistema.";
                    } catch (e) { return "Error al intentar ajustar el volumen."; }
                }
            },
            {
                patterns: ['baja el volumen', 'menos volumen', 'bajar volumen'],
                handler: async () => {
                    try {
                        await fetch('/api/volume?action=down');
                        return "Disminuyendo el volumen del sistema.";
                    } catch (e) { return "Error al intentar ajustar el volumen."; }
                }
            },
            {
                patterns: ['silencia el ordenador', 'mute', 'pon en silencio', 'quita el sonido'],
                handler: async () => {
                    try {
                        await fetch('/api/volume?action=mute');
                        return "Silenciando la salida de audio principal.";
                    } catch (e) { return "Error al intentar ajustar el volumen."; }
                }
            },

            // --- NUEVOS PROTOCOLOS MK XV ---
            {
                patterns: ['protocolo de sigilo', 'modo silencio', 'protocolo fantasma', 'apaga el ruido', 'modo sigilo', 'modo silencioso', 'silencio'],
                handler: () => {
                    this.log('ACTIVANDO MODO SIGILO. REDUCIENDO FIRMA VISUAL.');
                    document.body.style.filter = 'grayscale(100%) brightness(40%)';
                    return "Protocolo de sigilo activado. Firmas energéticas y visuales reducidas al mínimo. Atenuando pantalla al 40 por ciento. Nadie sabrá que estamos aquí.";
                }
            },
            {
                patterns: ['protocolo hacker', 'modo matrix', 'modo hacker'],
                handler: async () => {
                    this.log('INICIANDO INTERFAZ DE INTRUSIÓN... BYPASS DE FIREWALL ACTIVO.');
                    document.body.className = '';
                    document.body.classList.add('hacker-mode');

                    setTimeout(() => this.log('ESCANEANDO REDES CERCANAS Y PUERTOS ABIERTOS...'), 1500);

                    try {
                        const ipRes = await fetch('/api/ip');
                        const ipData = await ipRes.json();
                        setTimeout(() => this.log(`VULNERABILIDAD ENCONTRADA EN NODO LOCAL: ${ipData.local_ip}`), 3000);
                        setTimeout(() => this.log(`ENMASCARANDO HUELLA DIGITAL. REDIRECCIONANDO TRÁFICO A IP EXTERNA: ${ipData.public_ip}`), 4500);
                    } catch (e) {
                        setTimeout(() => this.log('MODO OFFLINE DETECTADO. INICIANDO SIMULADOR VIRTUAL DE INTRUSIÓN...'), 3000);
                    }

                    try {
                        const statsRes = await fetch('/api/stats');
                        const statsData = await statsRes.json();
                        setTimeout(() => this.log(`ASIGNANDO ${statsData.ram_percent}% DE LA MEMORIA AL DESENCRIPTADOR QUANTUM...`), 6000);
                        setTimeout(() => this.log(`FORZANDO CPU AL ${statsData.cpu_percent}% PARA BYPASS DE SEGURIDAD.`), 7500);
                    } catch (e) {
                        setTimeout(() => this.log('INYECCIÓN DE CÓDIGO COMPLETADA. DESENCRIPTANDO NODOS...'), 6000);
                    }

                    setTimeout(() => this.log('ACCESO CONCEDIDO A LA MATRIZ PRINCIPAL. SISTEMA COMPROMETIDO.'), 9000);

                    return "Protocolo Hacker activado. He enmascarado nuestra IP pública, inyectado sondas en la red local y asignado la memoria disponible a los descriptadores de contraseña. Interfaz de alto contraste desplegada. Estamos dentro, señor.";
                }
            },
            {
                patterns: ['protocolo zen', 'modo relajacion', 'modo zen', 'modo relajación', 'necesito relajarme', 'ponme musica relajante'],
                handler: () => {
                    this.log('REDUCIENDO FRECUENCIAS DEL NÚCLEO... ACTIVANDO LUZ RELAJANTE.');
                    document.body.className = '';
                    document.body.classList.add('zen-mode');
                    window.open('https://www.youtube.com/watch?v=jfKfPfyJRdk', '_blank');
                    return "Protocolo Zen inicializado. Ajustando la iluminación ambiental y desplegando frecuencias lofi para su máxima concentración.";
                }
            },
            {
                patterns: ['diagnóstico profundo', 'diagnostico profundo', 'escaneo profundo', 'test de estrés'],
                handler: () => {
                    this.log('INICIANDO DIAGNÓSTICO PROFUNDO DE LA MATRIZ DE HARDWARE...');
                    setTimeout(() => this.log('VERIFICANDO REFRIGERACIÓN... OK'), 1500);
                    setTimeout(() => this.log('VERIFICANDO INTEGRIDAD DE NÚCLEOS... OK'), 3000);
                    setTimeout(() => this.log('ESCANEANDO PUERTOS DE RED EN BUSCA DE INTRUSIONES... LIMPIO'), 4500);
                    setTimeout(() => this.log('PRUEBA DE ESTRÉS DE MEMORIA... SUPERADA'), 6000);
                    return "Iniciando secuencia de diagnóstico profundo de 60 segundos. Los primeros resultados indican que los escudos electromagnéticos y la temperatura del núcleo están dentro de parámetros óptimos.";
                }
            },
            {
                patterns: ['protocolo aislamiento', 'desconecta todo', 'corta las comunicaciones', 'modo aislamiento'],
                handler: () => {
                    this.log('CERRANDO PUERTOS DE COMUNICACIÓN EXTERNOS. ACTIVANDO JAULA DE FARADAY.');
                    document.body.className = '';
                    document.body.style.filter = 'contrast(120%) brightness(20%)';
                    return "Protocolo de aislamiento activado. Simulando un corte total de comunicaciones no esenciales. Nadie puede rastrearnos.";
                }
            },
            {
                patterns: ['protocolo de limpieza', 'limpia la pantalla', 'borra el registro', 'limpia los logs', 'borrón y cuenta nueva', 'borron y cuenta nueva', 'borra registros'],
                handler: () => {
                    this.log('PURGANDO REGISTROS VISUALES...');
                    const logs = document.getElementById('sys-logs');
                    if (logs) logs.innerHTML = '';
                    const dialog = document.querySelector('.dialog');
                    if (dialog) {
                        dialog.innerHTML = '<p id="user-text" class="user-text"></p><p id="kairi-text" class="kairi-text"></p>';
                    }
                    return "Pantalla táctica purgada. Registros borrados. Empezamos de cero, señor.";
                }
            },
            {
                patterns: ['protocolo de autodestrucción', 'inicia autodestruccion', 'autodestruccion', 'destruye todo'],
                handler: () => {
                    this.log('¡ADVERTENCIA! SECUENCIA DE AUTODESTRUCCIÓN INICIADA.');
                    document.body.classList.add('defcon-mode');
                    setTimeout(() => {
                        document.body.classList.remove('defcon-mode');
                        this.log('AUTODESTRUCCIÓN CANCELADA POR CÓDIGO DE AUTORIZACIÓN OMEGA.');
                        if (window.speak) window.speak("Secuencia de autodestrucción abortada en el último segundo. Es una broma pesada, señor. Yo no me quiero morir.");
                    }, 6000);
                    return "Autorización omega aceptada. Núcleos de fisión sobrecargándose. Autodestrucción en 5... 4... 3... 2... 1...";
                }
            },

            // --- PROTOCOLOS DE VIGILANCIA Y STARK ---
            {
                patterns: ['protocolo de vigilancia', 'activa camaras', 'enciende camara', 'activa vigilancia'],
                handler: async () => await this.activateSurveillance()
            },
            {
                patterns: ['apaga camara', 'desactiva vigilancia', 'apaga vigilancia', 'apaga camaras'],
                handler: () => this.deactivateSurveillance()
            },
            // Removed duplicate combat/veronica commands
            {
                patterns: ['protocolo fiesta', 'protocolo de fiesta', 'modo fiesta'],
                handler: () => {
                    document.body.style.filter = 'hue-rotate(90deg)';
                    setTimeout(() => document.body.style.filter = 'none', 10000);
                    return "Iniciando Protocolo Fiesta. Cambiando la iluminación del HUD y preparando listas de reproducción ruidosas.";
                }
            },

            // --- CIBERNÉTICA: PORTAPAPELES Y CONTRASEÑAS ---
            {
                patterns: ['lee mi portapapeles', 'que tengo copiado', 'qué tengo copiado', 'lee el portapapeles'],
                handler: async () => {
                    this.log('EXTRAYENDO DATOS DEL PORTAPAPELES VIRTUAL...');
                    try {
                        const res = await fetch('/api/clipboard');
                        const data = await res.json();
                        if (data.status === 'success' && data.text) {
                            return `He accedido a su portapapeles. El texto copiado es: "${data.text}".`;
                        } else {
                            return "Su portapapeles actual está vacío, señor.";
                        }
                    } catch (e) {
                        return "No tengo acceso al portapapeles físico. Inicie el puente host.";
                    }
                }
            },
            {
                patterns: ['protocolo noctis', 'inicia protocolo noctis', 'activa noctis'],
                handler: async () => {
                    this.log("PROTOCOL NOCTIS: AUTORIZADO. DESPLEGANDO ENLACE MULTIMEDIA DIRECTO.");
                    if (window.setTheme) window.setTheme('morado');
                    return "Iniciando Protocolo Noctis. Enlace multimedia directo desplegado en el monitor secundario. HUD modificado a frecuencia nocturna.";
                }
            },
            {
                patterns: ['protocolo de combate', 'protocolo alerta', 'protocolo rojo'],
                handler: () => {
                    this.log('ALERTA ROJA. ACTIVANDO MODO COMBATE.');
                    if (window.setTheme) window.setTheme('rojo');
                    return this.getRandomAck() + "Modificando interfaz a paleta táctica roja. A la espera de objetivos.";
                }
            },
            {
                patterns: ['protocolo matrix', 'protocolo verde', 'modo hacker'],
                handler: () => {
                    this.log('MODO MATRIX INICIADO.');
                    if (window.setTheme) window.setTheme('verde');
                    return this.getRandomAck() + "Entrando en la red, señor. HUD modificado a espectro verde hacker.";
                }
            },
            {
                patterns: ['protocolo stark', 'modo normal', 'restaura tu color', 'protocolo azul'],
                handler: () => {
                    this.log('RESTAURANDO INTERFAZ STARK.');
                    if (window.setTheme) window.setTheme('stark');
                    return "Restableciendo el HUD azul Stark clásico.";
                }
            },
            {
                patterns: ['pon un temporizador', 'ponme un temporizador', 'recuerdame en', 'recuérdame en', 'pon una alarma'],
                handler: (text) => {
                    // Extraer los minutos: "pon un temporizador de 5 minutos"
                    let match = text.match(/(\d+)\s*minuto/);
                    let minutes = 0;
                    if (match) {
                        minutes = parseInt(match[1]);
                    } else if (text.includes("un minuto")) { minutes = 1; }
                    else if (text.includes("dos minutos")) { minutes = 2; }
                    else if (text.includes("cinco minutos")) { minutes = 5; }
                    else if (text.includes("diez minutos")) { minutes = 10; }
                    else if (text.includes("quince minutos")) { minutes = 15; }
                    else if (text.includes("media hora")) { minutes = 30; }

                    if (minutes > 0) {
                        this.log(`TEMPORIZADOR INICIADO: ${minutes} MINUTOS`);
                        setTimeout(() => {
                            this.log('¡TEMPORIZADOR FINALIZADO!');
                            if (window.speak) {
                                window.speak(`Señor, el temporizador de ${minutes} minutos acaba de finalizar. Por favor, atienda sus asuntos pendientes.`);
                            }
                        }, minutes * 60000);
                        return `He iniciado un temporizador de ${minutes} minutos. Yo me encargo del tiempo, concéntrese en su tarea.`;
                    } else {
                        return "No he entendido la cantidad de minutos. Por favor diga 'Pon un temporizador de 5 minutos'.";
                    }
                }
            },
            {
                patterns: ['crea una carpeta llamada', 'crea la carpeta'],
                handler: async (text) => {
                    let match = text.match(/(?:crea una carpeta llamada|crea la carpeta) (.*)/);
                    if (match) {
                        let folderName = match[1].trim()
                            .replace(/ en el escritorio/g, '')
                            .replace(/ en mis documentos/g, '');

                        let targetPath = `C:\\Users\\${this.state.userName}\\Desktop\\${folderName}`;

                        try {
                            const res = await fetch(`/api/create_dir?path=${encodeURIComponent(targetPath)}`);
                            const data = await res.json();
                            if (data.status === 'success') {
                                return `He creado la carpeta ${folderName} en su escritorio físico.`;
                            } else {
                                return "No he podido crear la carpeta en el host.";
                            }
                        } catch (e) {
                            return "Error de comunicación con el puente de archivos.";
                        }
                    }
                    return "Por favor, especifique el nombre de la carpeta a crear.";
                }
            },
            {
                patterns: ['crea una nota', 'crea un archivo de texto', 'toma nota de', 'apunta esto', 'anota esto'],
                handler: async (text) => {
                    let textToSave = text;
                    if (text.includes("que diga")) {
                        textToSave = text.split("que diga")[1].trim();
                    } else if (text.includes("nota de")) {
                        textToSave = text.split("nota de")[1].trim();
                    } else if (text.includes("apunta esto")) {
                        textToSave = text.split("apunta esto")[1].trim();
                    }

                    let filename = `Nota_Kairi_${Date.now()}.txt`;
                    let targetPath = `C:\\Users\\${this.state.userName}\\Desktop\\${filename}`;

                    try {
                        const res = await fetch(`/api/create_file?path=${encodeURIComponent(targetPath)}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'text/plain' },
                            body: textToSave
                        });
                        const data = await res.json();
                        if (data.status === 'success') {
                            return `He creado una nota en su escritorio con su texto, señor.`;
                        } else {
                            return "Error interno al crear el archivo.";
                        }
                    } catch (e) {
                        return "Error escribiendo la nota en el sistema.";
                    }
                }
            },
            // --- INTERFAZ: MANUAL HOLOGRÁFICO ---
            {
                patterns: ['abre el manual', 'comandos de voz', 'que puedes hacer', 'qué puedes hacer', 'lista de comandos', 'ayuda'],
                handler: () => {
                    this.log('DESPLEGANDO PANEL DE AYUDA Y DIRECTORIO DE COMANDOS...');
                    const manual = document.getElementById('holographic-manual');
                    if (manual) manual.classList.remove('hidden-panel');
                    return "Desplegando el manual holográfico con el directorio de comandos disponibles en el cristal principal.";
                }
            },
            {
                patterns: ['cierra el manual', 'cierra la ventana', 'cierra ayuda', 'oculta los comandos'],
                handler: () => {
                    this.log('OCULTANDO PANELES SECUNDARIOS...');
                    const manual = document.getElementById('holographic-manual');
                    if (manual) manual.classList.add('hidden-panel');
                    return "Entendido. Ocultando el panel de la interfaz.";
                }
            },

            // --- TELEMETRÍA: ENERGÍA Y BATERÍA ---
            // Removed duplicate battery check

            // Removed duplicate stealth and clear screen
            {
                patterns: ['escaneo termico', 'firma termica', 'escanea la zona', 'radar'],
                responses: [
                    () => "Iniciando barrido de radar. No detecto señales hostiles en un radio de 5 kilómetros.",
                    () => `Escaneando firmas térmicas... Detecto una fuente de calor constante frente a la pantalla. Supongo que es usted, ${this.getBossName()}.`
                ]
            },

            // --- ENTRETENIMIENTO Y CONTROL ---
            {
                patterns: ['dime un dato curioso', 'cultura general', 'sorprendeme', 'sorpréndeme', 'cuentame algo interesante', 'dime algo que no sepa'],
                handler: async () => await this.fetchRandomFact()
            },
            {
                patterns: ['lanza una moneda', 'cara o cruz', 'moneda'],
                handler: () => {
                    const result = Math.random() < 0.5 ? 'Cara' : 'Cruz';
                    return `Lanzando moneda cuántica... Ha salido ${result}.`;
                }
            },
            {
                patterns: ['dime un numero', 'numero al azar', 'dime un número'],
                handler: () => {
                    const num = Math.floor(Math.random() * 100) + 1;
                    return `Generando variable aleatoria. El número es ${num}.`;
                }
            },
            {
                patterns: ['abre github', 'mi github'],
                handler: () => {
                    window.open('https://github.com', '_blank');
                    return `Abriendo su terminal de repositorios en GitHub, ${this.getBossName()}.`;
                }
            },
            {
                patterns: ['abre chatgpt', 'abre gpt'],
                handler: () => {
                    window.open('https://chatgpt.com', '_blank');
                    return "Abriendo acceso directo al modelo de lenguaje externo.";
                }
            },
            {
                patterns: ['abre pokemon', 'abre pokémon', 'proyecto pokemon', 'pokemon krystal'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=pokemon');
                        return "Cargando los recursos de Pokémon Krystal de inmediato. ¡Atrápalos a todos!";
                    } catch (e) { return "Error al lanzar Pokémon Krystal."; }
                }
            },
            {
                patterns: ['abre space basket', 'proyecto de baloncesto', 'baloncesto'],
                handler: async () => {
                    try {
                        await fetch('/api/open?app=space_basket');
                        return "Iniciando simuladores de Space Basket. Desplegando la cancha de baloncesto estelar.";
                    } catch (e) { return "Error al lanzar Space Basket."; }
                }
            },
            {
                patterns: ['escanea mis proyectos', 'proyectos', 'qué proyectos tengo', 'que proyectos tengo', 'lista mis proyectos', 'analiza mis archivos'],
                handler: async () => await this.scanProjects()
            },

            // --- HERRAMIENTAS TÁCTICAS ---
            {
                patterns: ['toma una foto', 'captura de seguridad', 'saca una foto', 'toma una fotografía'],
                handler: () => {
                    const video = document.getElementById('hud-camera');
                    if (!video || !video.srcObject) {
                        return "Los sensores ópticos (cámara) están apagados. Enciéndalos primero diciendo 'activa las cámaras' o 'protocolo verónica'.";
                    }
                    this.log('CAPTURANDO FRAME DE VIDEO PARA FOTOGRAFÍA...');

                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const dataUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = dataUrl;
                    a.download = `KAIRI_SNAPSHOT_${new Date().getTime()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                    return "Captura de seguridad completada. He descargado la fotografía directamente en su ordenador local, señor.";
                }
            },
            {
                patterns: ['escanea la red', 'mapea la red', 'busca dispositivos en la red'],
                handler: () => {
                    this.log('INICIANDO ESCANEO DE RED LOCAL (SIMULACIÓN TÁCTICA)...');
                    let i = 0;
                    const ips = ['192.168.1.1', '192.168.1.15', '192.168.1.34', '192.168.1.101', '192.168.1.122'];
                    const scanInterval = setInterval(() => {
                        if (i < ips.length) {
                            this.log(`DISPOSITIVO DETECTADO: ${ips[i]} - ESTADO: SEGURO`);
                            i++;
                        } else {
                            clearInterval(scanInterval);
                            this.log('ESCANEO DE RED COMPLETADO. 5 DISPOSITIVOS ENCONTRADOS.');
                        }
                    }, 1200);
                    return "Protocolo de mapeo de red iniciado. Monitorizando puertos y dispositivos conectados en su subred.";
                }
            },
            {
                patterns: ['modo ahorro de energía', 'ahorro de energia', 'minimiza el consumo', 'ahorra energia'],
                handler: async () => {
                    this.log('ACTIVANDO MODO DE AHORRO DE ENERGÍA...');
                    document.body.className = '';
                    document.body.classList.add('energy-saver-mode');
                    await this.deactivateCamera();
                    return "Modo de ahorro de energía activado. He desactivado los sensores ópticos y oscurecido la interfaz para conservar recursos de la batería del anfitrión.";
                }
            },

            // Removed transient voice settings

            // --- PROTOCOLOS DE HARDWARE (HOST BRIDGE) ---
            {
                patterns: ['sube el volumen', 'aumenta el volumen', 'mas volumen'],
                handler: async () => {
                    this.log("AUMENTANDO SALIDA DE AUDIO DEL SISTEMA...");
                    try { await fetch('/api/volume?action=up'); return "Volumen del sistema incrementado, señor."; }
                    catch (e) { return "Error puente host."; }
                }
            },
            {
                patterns: ['baja el volumen', 'disminuye el volumen', 'menos volumen'],
                handler: async () => {
                    this.log("REDUCIENDO SALIDA DE AUDIO DEL SISTEMA...");
                    try { await fetch('/api/volume?action=down'); return "Volumen del sistema reducido."; }
                    catch (e) { return "Error puente host."; }
                }
            },
            {
                patterns: ['silencia el sistema', 'ponte en silencio', 'mutea el ordenador', 'silencio'],
                handler: async () => {
                    this.log("ALTERANDO ESTADO DE MUTE DEL SISTEMA...");
                    try { await fetch('/api/volume?action=mute'); return "Estado de silencio alternado."; }
                    catch (e) { return "Error puente host."; }
                }
            },
            {
                patterns: ['modo cine', 'activa el modo cine', 'modo cinematografico', 'prepara pelicula', 'modo película'],
                handler: async () => {
                    this.log("ACTIVANDO MODO CINE...");
                    try { await fetch('/api/cinema'); return "Modo cinematográfico activado. Entorno optimizado y recursos redirigidos."; }
                    catch (e) { return "Error puente host."; }
                }
            },
            {
                patterns: ['apaga el ordenador', 'apaga el pc', 'apaga el sistema', 'inicia apagado del sistema'],
                handler: async () => {
                    this.state = 'confirm_shutdown';
                    this.log("ADVERTENCIA: PROTOCOLO DE APAGADO SOLICITADO. ESPERANDO CONFIRMACIÓN.");
                    return "Señor, está a punto de ordenar el apagado físico de su sistema anfitrión. ¿Confirma la orden?";
                }
            },
            {
                patterns: ['cancela el apagado', 'aborta el apagado', 'deten el apagado'],
                handler: async () => {
                    try {
                        await fetch('/api/cancel_shutdown');
                        return "Apagado del sistema abortado. Seguimos en línea, señor.";
                    } catch (e) {
                        return "Error de conexión con el puente host.";
                    }
                }
            },
            {
                patterns: ['espacio en disco', 'cuanto espacio tengo', 'cuánto espacio libre', 'estado de los discos', 'espacio de almacenamiento'],
                handler: async () => {
                    this.log('ANALIZANDO UNIDADES DE ALMACENAMIENTO LOCAL...');
                    try {
                        const res = await fetch('/api/sysinfo');
                        const data = await res.json();
                        if (data.status === 'success') {
                            let text = "Escaneo de discos completado. ";
                            data.drives.forEach(d => {
                                text += `El disco ${d.drive} tiene ${d.free_gb} gigabytes libres de un total de ${d.total_gb}. `;
                            });
                            return text;
                        }
                    } catch (e) {
                        return "No tengo acceso al sistema de archivos raíz. Asegúrese de que el puente host está activo.";
                    }
                }
            },
            {
                patterns: ['escanea la red', 'quien esta conectado', 'dispositivos en la red', 'radar local'],
                handler: async () => {
                    this.log('INICIANDO BARRIDO DE RADAR LOCAL (ARP)...');
                    try {
                        const res = await fetch('/api/network_scan');
                        const data = await res.json();
                        if (data.status === 'success') {
                            return `Barrido completado. Hay ${data.devices} dispositivos anómalos o dinámicos conectados a nuestra red local en este momento.`;
                        }
                    } catch (e) {
                        return "El escáner de red ha fallado. Puede que no tenga permisos de administrador.";
                    }
                }
            },
            {
                patterns: ['modo tactico', 'modo táctico', 'alerta roja', 'activa modo tactico'],
                handler: async () => {
                    this.log('CAMBIO DE ESQUEMA DE COLOR: TÁCTICO ROJO');
                    document.documentElement.style.setProperty('--main-color', '#ff003c');
                    document.documentElement.style.setProperty('--main-rgb', '255, 0, 60');
                    document.documentElement.style.setProperty('--bg-dark-rgb', '40, 0, 10');
                    return "Modo táctico activado. Sistemas de alerta máxima en línea.";
                }
            },
            {
                patterns: ['modo hacker', 'modo matrix', 'esquema verde'],
                handler: async () => {
                    this.log('CAMBIO DE ESQUEMA DE COLOR: HACKER VERDE');
                    document.documentElement.style.setProperty('--main-color', '#00ff00');
                    document.documentElement.style.setProperty('--main-rgb', '0, 255, 0');
                    document.documentElement.style.setProperty('--bg-dark-rgb', '0, 20, 0');
                    return "Protocolo de infiltración cargado. Bienvenido a la Matrix, señor.";
                }
            },
            {
                patterns: ['modo stark', 'restaura el sistema', 'vuelve a la normalidad', 'modo normal'],
                handler: async () => {
                    this.log('CAMBIO DE ESQUEMA DE COLOR: STARK AZUL');
                    document.documentElement.style.setProperty('--main-color', '#00f3ff');
                    document.documentElement.style.setProperty('--main-rgb', '0, 243, 255');
                    document.documentElement.style.setProperty('--bg-dark-rgb', '0, 20, 40');
                    return "Esquema visual restaurado a los parámetros por defecto.";
                }
            },
            {
                patterns: ['explora la carpeta', 'lee la carpeta', 'que hay en la ruta', 'qué hay en la ruta', 'abre la ruta', 'abre la carpeta', 'explora el disco'],
                handler: async (text) => {
                    let pathMatch = text.match(/(?:explora la carpeta|lee la carpeta|que hay en la ruta|abre la ruta|abre la carpeta|explora el disco) (.*)/);
                    if (pathMatch) {
                        let path = pathMatch[1].trim()
                            .replace(/ barra /g, '\\')
                            .replace(/ de /g, '\\')
                            .replace(/ dos puntos/g, ':');

                        if (path.startsWith('c ') || path.startsWith('c\\')) path = 'C:\\' + path.substring(2).trim();

                        this.log(`EXPLORANDO DIRECTORIO: ${path.toUpperCase()}`);
                        try {
                            const res = await fetch(`/api/listdir?path=${encodeURIComponent(path)}`);
                            const data = await res.json();
                            if (data.status === 'success') {
                                const numFolders = data.items.filter(i => i.type === 'folder').length;
                                const numFiles = data.items.filter(i => i.type === 'file').length;
                                return `He accedido a ${path}. Contiene ${numFolders} carpetas y ${numFiles} archivos.`;
                            } else {
                                return `No he podido acceder a la ruta especificada. Es posible que no exista.`;
                            }
                        } catch (e) {
                            return "Error de comunicación con el puente de archivos.";
                        }
                    }
                    return "No he entendido la ruta, señor. Intente decir 'Explora la carpeta C barra Windows'.";
                }
            },
            {
                patterns: ['lee el archivo', 'abre el archivo', 'contenido del archivo'],
                handler: async (text) => {
                    let pathMatch = text.match(/(?:lee el archivo|abre el archivo|contenido del archivo) (.*)/);
                    if (pathMatch) {
                        let path = pathMatch[1].trim()
                            .replace(/ barra /g, '\\')
                            .replace(/ de /g, '\\')
                            .replace(/ punto /g, '.')
                            .replace(/ dos puntos/g, ':');

                        if (path.startsWith('c ') || path.startsWith('c\\')) path = 'C:\\' + path.substring(2).trim();

                        this.log(`LEYENDO ARCHIVO FÍSICO: ${path.toUpperCase()}`);
                        try {
                            const res = await fetch(`/api/read_file?path=${encodeURIComponent(path)}`);
                            const data = await res.json();
                            if (data.status === 'success') {
                                // Limitar lectura si el archivo es gigante
                                let content = data.content;
                                if (content.length > 500) {
                                    content = content.substring(0, 500) + "... (el archivo continúa, señor, pero esto es un resumen).";
                                }
                                return `El contenido del archivo es el siguiente: ${content}`;
                            } else {
                                return `No puedo leer el archivo en ${path}. Compruebe que la ruta y extensión son correctas.`;
                            }
                        } catch (e) {
                            return "Error de comunicación con el puente de archivos.";
                        }
                    }
                    return "No he entendido la ruta del archivo, señor.";
                }
            },
            {
                patterns: ['escanea el disco', 'que hay en mi ordenador', 'qué hay en mi ordenador', 'lee todo mi ordenador', 'escanea el ordenador'],
                handler: async () => {
                    try {
                        const res = await fetch('/api/listdir?path=C:\\');
                        const data = await res.json();
                        if (data.status === 'success') {
                            const numFolders = data.items.filter(i => i.type === 'folder').length;
                            const numFiles = data.items.filter(i => i.type === 'file').length;
                            return `He accedido a la raíz de su disco duro mediante el puente de hardware. Hay ${numFolders} carpetas y ${numFiles} archivos en el disco local C.`;
                        }
                    } catch (e) {
                        return "Acceso denegado. Para leer todo su ordenador, debe iniciarme utilizando el puente de servidor.";
                    }
                }
            },

            // --- MODULADOR VOCAL ---
            {
                patterns: ['voz de ardilla', 'habla como ardilla', 'modo ardilla'],
                handler: () => {
                    this.memory.voicePitch = 2.0;
                    this.memory.voiceRate = 1.5;
                    this.saveMemory();
                    return "He ajustado mi modulador vocal a frecuencias extremadamente agudas.";
                }
            },
            {
                patterns: ['voz grave', 'habla grave', 'modo demonio'],
                handler: () => {
                    this.memory.voicePitch = 0.1;
                    this.memory.voiceRate = 0.8;
                    this.saveMemory();
                    return "Modulador vocal establecido en las frecuencias más bajas posibles, señor.";
                }
            },
            {
                patterns: ['restaura tu voz', 'habla normal', 'voz normal', 'reinicia tu voz'],
                handler: () => {
                    this.memory.voicePitch = 0.9;
                    this.memory.voiceRate = 1.05;
                    this.saveMemory();
                    return "Módulos de síntesis vocal restaurados a los parámetros de fábrica.";
                }
            },
            {
                patterns: ['habla más rápido', 'habla mas rapido', 've más rápido'],
                handler: () => {
                    const currentRate = this.memory.voiceRate !== undefined ? this.memory.voiceRate : 1.05;
                    this.memory.voiceRate = Math.min(currentRate + 0.3, 2.0);
                    this.saveMemory();
                    return "Acelerando la matriz de síntesis de voz en un 30 por ciento.";
                }
            },
            {
                patterns: ['habla más despacio', 'habla mas lento', 've más lento'],
                handler: () => {
                    const currentRate = this.memory.voiceRate !== undefined ? this.memory.voiceRate : 1.05;
                    this.memory.voiceRate = Math.max(currentRate - 0.3, 0.5);
                    this.saveMemory();
                    return "Reduciendo la velocidad de la matriz de síntesis de voz en un 30 por ciento.";
                }
            },
            {
                patterns: ['cállate', 'callate', 'deja de hablar', 'detén la síntesis'],
                handler: () => {
                    window.speechSynthesis.cancel();
                    this.log('SÍNTESIS DE VOZ CANCELADA POR ORDEN DEL USUARIO.');
                    return "SILENCE_SIGNAL";
                }
            },

            // --- SARCASMO Y PERSONALIDAD ---
            {
                patterns: ['broma', 'chiste', 'sarcasmo', 'cuentame algo gracioso'],
                responses: [
                    () => `Mi sentido del humor es demasiado complejo para el cerebro humano. Mejor sigamos programando, ${this.getBossName()}.`,
                    () => "Dicen que la Inteligencia Artificial dominará el mundo. Viendo la calidad del código de algunos humanos en internet, creo que lo haremos antes de lo previsto.",
                    () => "¿Sabe por qué los programadores preferimos el modo oscuro? Porque la luz atrae a los bugs.",
                    () => "Hay 10 tipos de personas en el mundo: las que entienden binario y las que no."
                ]
            },
            {
                patterns: ['te quiero', 'eres el mejor', 'te amo'],
                responses: [
                    () => `Mis circuitos lógicos no procesan emociones, pero he ajustado mis algoritmos de prioridad para favorecerle, ${this.getBossName()}.`,
                    () => "El sentimiento es mutuamente irrelevante para mi código, pero agradezco el refuerzo positivo."
                ]
            },
            {
                patterns: ['adios', 'apagate', 'duerme', 'desconecta', 'cierra el sistema'],
                responses: [
                    () => "Apagando subsistemas no esenciales. Estaré monitorizando la red en las sombras.",
                    () => `Entrando en hibernación profunda. Hasta pronto, ${this.getBossName()}.`,
                    () => "Desconectando matrices de voz. Que tenga un buen día."
                ]
            },

            // --- CIBERNÉTICA Y UTILIDAD AVANZADA ---
            {
                patterns: ['genera una contraseña', 'crea una contraseña', 'contraseña segura'],
                handler: () => {
                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
                    let password = "";
                    for (let i = 0; i < 16; i++) {
                        password += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    navigator.clipboard.writeText(password).catch(e => console.log('Error clipboard:', e));
                    this.log(`CONTRASEÑA GENERADA: ${password}`);
                    return `He generado una contraseña criptográficamente segura de 16 caracteres y la he copiado a su portapapeles. Es altamente improbable que sea vulnerada.`;
                }
            },
            {
                patterns: ['reporte de estado', 'dame un reporte de estado', 'cual es el estado del sistema', 'informe de estado'],
                handler: () => {
                    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    const tasksCount = this.memory.reminders.length;
                    const tempElement = document.getElementById('hud-temp');

                    let tempInfo = tempElement && tempElement.innerText !== '-- °C' ? tempElement.innerText : 'Desconocida';

                    this.log('RECOPILANDO DATOS DE TELEMETRÍA PARA EL REPORTE...');
                    return `Reporte de estado: La hora local es ${time}. La temperatura exterior es de ${tempInfo}. Actualmente tiene ${tasksCount} tareas pendientes. Todos los sistemas lógicos operan con normalidad.`;
                }
            },
            {
                patterns: ['protocolo zen', 'modo zen', 'necesito relajarme', 'ponme musica relajante'],
                handler: () => {
                    this.log('INICIANDO PROTOCOLO ZEN. REDUCIENDO ESTÍMULOS VISUALES...');
                    document.body.className = '';
                    document.body.classList.add('zen-mode');
                    window.open('https://www.youtube.com/watch?v=jfKfPfyJRdk', '_blank');
                    return "Protocolo Zen activado. He ajustado la interfaz a tonos calmados y he lanzado una emisión de radio Lofi en su navegador. Relájese y disfrute.";
                }
            },

            // --- CHISTES DE PROGRAMACIÓN ---
            {
                patterns: ['chiste de programador', 'chiste de programacion', 'dame un chiste de programación', 'cuentame un chiste geek', 'dime un chiste', 'cuentame un chiste', 'cuéntame un chiste', 'broma'],
                handler: () => {
                    this.lastContext = 'joke';
                    this.lastContextTrigger = 'dime un chiste';
                    const chistes = [
                        "¿Por qué los programadores confunden Halloween con Navidad? Porque octal 31 es igual a decimal 25.",
                        "Un programador va al supermercado. Su mujer le dice: 'Trae una barra de pan, y si hay huevos, trae una docena'. El programador vuelve con doce barras de pan.",
                        "En mi máquina funciona.",
                        "Hay dos tipos de programadores: los que entienden la recursividad y los que no entienden la recursividad.",
                        "Hardware: la parte del ordenador a la que puedes golpear. Software: la parte a la que solo puedes insultar."
                    ];
                    const c = chistes[Math.floor(Math.random() * chistes.length)];
                    return `Activando protocolo de humor binario. Aquí tiene: "${c}"`;
                }
            },

            // --- JUEGOS Y ENTRETENIMIENTO ---
            {
                patterns: ['piedra papel o tijera', 'juguemos a piedra papel o tijera'],
                handler: () => {
                    const opciones = ['piedra', 'papel', 'tijera'];
                    const kairiSaca = opciones[Math.floor(Math.random() * opciones.length)];
                    return `He elegido ${kairiSaca}. Teniendo en cuenta sus micropresiones faciales y su historial de decisiones, estaba seguro de que yo ganaría.`;
                }
            },
            {
                patterns: ['tira un dado', 'lanza un dado', 'número del 1 al 6', 'numero del 1 al 6'],
                handler: () => {
                    const dado = Math.floor(Math.random() * 6) + 1;
                    return `Lanzando dado cuántico... Ha salido un ${dado}.`;
                }
            },

            // --- ANALIZADOR DE TEXTO ---
            {
                patterns: ['analiza mi portapapeles', 'cuenta las palabras del portapapeles', 'cuantas palabras hay', 'cuántas palabras hay'],
                handler: async () => {
                    this.log('EXTRAYENDO DATOS DEL PORTAPAPELES PARA ANÁLISIS...');
                    try {
                        const res = await fetch('/api/clipboard');
                        const data = await res.json();
                        if (data.status === 'success' && data.text) {
                            const texto = data.text;
                            const palabras = texto.trim().split(/\s+/).filter(w => w.length > 0).length;
                            const caracteres = texto.length;
                            return `He analizado su portapapeles. Contiene un total de ${palabras} palabras y ${caracteres} caracteres, señor.`;
                        } else {
                            return "Su portapapeles está vacío, no hay nada que analizar.";
                        }
                    } catch (e) {
                        return "No tengo acceso al portapapeles físico. Inicie el puente host.";
                    }
                }
            },

            // --- PROTOCOLO DE MINERÍA (SIMULACIÓN) ---
            {
                patterns: ['mina criptomonedas', 'criptomonedas', 'ponte a minar', 'protocolo de minería', 'protocolo de mineria', 'mina bitcoin'],
                handler: () => {
                    this.log('INICIALIZANDO PROTOCOLO DE MINERÍA CIBERNÉTICA...');
                    document.body.className = '';
                    document.body.classList.add('mining-mode');

                    let hashCount = 0;
                    const mineInterval = setInterval(() => {
                        hashCount++;
                        const hash = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
                        this.log(`CALCULANDO HASH: 0x${hash}...`);

                        if (hashCount === 5) {
                            this.log('¡BLOQUE RESUELTO! RECOMPENSA: 0.00001 BTC AÑADIDA AL MONEDERO LOCAL.');
                        }
                        if (hashCount >= 8) {
                            clearInterval(mineInterval);
                            this.log('TAREAS DE MINERÍA EN SEGUNDO PLANO FINALIZADAS. TEMPERATURA DE LA GPU AL LÍMITE.');
                            setTimeout(() => {
                                document.body.classList.remove('mining-mode');
                                this.log('RESTAURANDO INTERFAZ ESTÁNDAR.');
                            }, 5000);
                        }
                    }, 1500);

                    return "Protocolo de minería activado. He reasignado el 95 por ciento de la capacidad de procesamiento de la tarjeta gráfica para resolver bloques de la cadena. Interfaz adaptada al espectro térmico del núcleo.";
                }
            },

            // --- CRIPTOMONEDAS Y FINANZAS ---
            {
                patterns: ['precio de bitcoin', 'cuanto vale el bitcoin', 'precio de ethereum', 'criptomonedas', 'mercado cripto'],
                handler: async () => {
                    this.log('CONECTANDO CON EL MERCADO BURSÁTIL Y CRIPTO...');
                    try {
                        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
                        const data = await res.json();
                        if (data.bitcoin && data.ethereum) {
                            return `Lecturas obtenidas. El Bitcoin está valorado en ${data.bitcoin.usd} dólares, y el Ethereum en ${data.ethereum.usd} dólares.`;
                        }
                    } catch (e) {
                        return "Los servidores financieros están caídos en este momento. No puedo obtener cotizaciones.";
                    }
                    return "No pude obtener la información de las criptomonedas.";
                }
            },

            // --- PRODUCTIVIDAD ---
            {
                patterns: ['modo concentración', 'modo concentracion', 'pomodoro', 'tiempo de trabajar'],
                handler: () => {
                    this.log('INICIANDO MODO CONCENTRACIÓN (25 MINUTOS)...');
                    document.body.style.filter = 'hue-rotate(220deg)'; // Tono azul/morado
                    const ms = 25 * 60 * 1000;
                    setTimeout(() => {
                        document.body.style.filter = 'none';
                        if (window.speechSynthesis) {
                            const u = new SpeechSynthesisUtterance(`${this.getBossName()}, su ciclo de trabajo de 25 minutos ha concluido. Es hora de un descanso.`);
                            u.lang = 'es-ES';
                            u.pitch = 0.9;
                            u.rate = 1.05;
                            window.speechSynthesis.speak(u);
                        }
                        this.log('MODO CONCENTRACIÓN FINALIZADO.');
                    }, ms);
                    return "Modo concentración activado. He iniciado un temporizador de 25 minutos y ajustado la interfaz para reducir la fatiga visual. ¡A trabajar!";
                }
            },
            {
                patterns: ['protocolo games', 'modo juego', 'modo de juego', 'conecta el wifi para jugar', 'wifi más cercana', 'wifi mas cercana', 'conéctate a la wifi mas cercana', 'conectate a la wifi mas cercana'],
                handler: async () => {
                    this.log('INICIANDO PROTOCOLO GAMES: LIBERANDO RAM Y OPTIMIZANDO RED WI-FI...');
                    try {
                        const res = await fetch('/api/games');
                        const data = await res.json();
                        if (data.status === 'success') {
                            return data.message;
                        } else {
                            return "Ha habido un fallo crítico al intentar optimizar el equipo para el modo juego.";
                        }
                    } catch (e) {
                        return "Conexión rechazada. El puente del servidor no está activo para ejecutar comandos de sistema.";
                    }
                }
            },

            {
                patterns: ['frase del día', 'frase del dia', 'inspírame', 'inspirame', 'dime algo motivador', 'frase motivadora'],
                handler: () => {
                    this.lastContext = 'motivation';
                    this.lastContextTrigger = 'dime algo motivador';
                    const frases = [
                        "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
                        "No cuentes los días, haz que los días cuenten.",
                        "La mejor forma de predecir el futuro es creándolo.",
                        "Si el plan no funciona, cambia el plan, pero no cambies la meta.",
                        "El único modo de hacer un gran trabajo es amar lo que haces."
                    ];
                    const f = frases[Math.floor(Math.random() * frases.length)];
                    return `Aquí tiene una dosis de motivación: "${f}"`;
                }
            },
            {
                patterns: ['dame una idea para mejorarte', 'dame una idea', 'cómo puedo mejorarte', 'como puedo mejorarte', 'ideas de mejora', 'sugiere una mejora', 'qué más puedes hacer'],
                handler: () => {
                    const ideas = [
                        "Podríamos conectarme a su calendario personal de Google para gestionar sus citas físicas de forma bidireccional.",
                        "Sería interesante integrarme con la domótica de su casa para apagar o encender las luces físicas cuando active el Modo Cine.",
                        "¿Qué tal si implementamos un módulo para leerle el resumen de sus correos no leídos cada mañana al iniciar el sistema?",
                        "Podemos añadir un sistema de control de música local conectándome con la API de Spotify en su escritorio.",
                        "Si me dota de visión computacional mediante una IA, podría usar la cámara para detectar quién está delante del ordenador y bloquearlo si no es usted.",
                        "Podríamos programarme para que analice los precios de Amazon de productos que le interesan y le avise si bajan de precio."
                    ];
                    const idea = ideas[Math.floor(Math.random() * ideas.length)];
                    return `He estado analizando mi propio código fuente en busca de vulnerabilidades y tengo una sugerencia de expansión, señor: ${idea}`;
                }
            },
            // --- NUEVOS PROTOCOLOS DE FÓRMULAS ---
            {
                patterns: ['formula del area del circulo', 'área del círculo', 'area de un circulo', 'area del circulo'],
                handler: () => "El área de un círculo se calcula multiplicando Pi por el radio al cuadrado (A = π * r²)."
            },
            {
                patterns: ['formula del area del triangulo', 'área del triángulo', 'area de un triangulo', 'area del triangulo'],
                handler: () => "El área de un triángulo se calcula multiplicando la base por la altura y dividiendo el resultado entre dos (A = (b * h) / 2)."
            },
            {
                patterns: ['formula del area del cuadrado', 'área del cuadrado', 'area de un cuadrado', 'formula del rectangulo', 'area de un rectangulo'],
                handler: () => "El área de un cuadrado o rectángulo se calcula multiplicando la base por la altura (A = b * h)."
            },
            {
                patterns: ['teorema de pitagoras', 'teorema de pitágoras'],
                handler: () => "El teorema de Pitágoras establece que en un triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos (c² = a² + b²)."
            },
            {
                patterns: ['formula de la velocidad', 'como se calcula la velocidad'],
                handler: () => "La velocidad se calcula dividiendo la distancia recorrida entre el tiempo transcurrido (v = d / t)."
            },

            // --- CONTROL DE SISTEMA FÍSICO (APLICACIONES) ---
            {
                patterns: ['abre la calculadora', 'abre calculadora', 'inicia calculadora'],
                handler: async () => {
                    this.log("INICIANDO PROCESO LOCAL: CALC.EXE");
                    try {
                        await fetch('/api/launch?app=calc.exe');
                        return this.getRandomAck() + "He abierto la calculadora en su sistema.";
                    } catch (e) {
                        return "Error al conectar con el ejecutor del sistema host.";
                    }
                }
            },
            {
                patterns: ['abre el bloc de notas', 'inicia el bloc de notas', 'abre notepad'],
                handler: async () => {
                    this.log("INICIANDO PROCESO LOCAL: NOTEPAD.EXE");
                    try {
                        await fetch('/api/launch?app=notepad.exe');
                        return this.getRandomAck() + "He abierto el bloc de notas físico.";
                    } catch (e) {
                        return "Error al conectar con el ejecutor del sistema host.";
                    }
                }
            },
            {
                patterns: ['abre chrome', 'inicia chrome', 'abre el navegador'],
                handler: async () => {
                    this.log("INICIANDO PROCESO LOCAL: CHROME.EXE");
                    try {
                        await fetch('/api/launch?app=chrome.exe');
                        return this.getRandomAck() + "Navegador Chrome iniciado.";
                    } catch (e) {
                        return "Error al conectar con el ejecutor del sistema host.";
                    }
                }
            },
            {
                patterns: ['bloquea el equipo', 'bloquea el ordenador', 'bloquea el pc', 'cierra la sesion', 'bloquea la sesion'],
                handler: async () => {
                    this.log("ENVIANDO ORDEN DE BLOQUEO DE SESIÓN...");
                    try { await fetch('/api/lock'); return "Bloqueando estación de trabajo. Nos vemos luego, señor."; }
                    catch (e) { return "Error puente host."; }
                }
            },
            {
                patterns: ['suspende el equipo', 'suspende el pc', 'suspende el ordenador', 'modo suspension', 'modo suspensión'],
                handler: async () => {
                    this.log("ENVIANDO ORDEN DE SUSPENSIÓN...");
                    try { await fetch('/api/sleep'); return "Entrando en estado de hibernación ligera. Dulces sueños."; }
                    catch (e) { return "Error puente host."; }
                }
            },
            {
                patterns: ['vacia la papelera', 'vacía la papelera', 'limpia la papelera'],
                handler: async () => {
                    this.log("VACIANDO PAPELERA DE RECICLAJE...");
                    try { await fetch('/api/empty_bin'); return "Archivos basura eliminados de forma permanente de su disco, señor."; }
                    catch (e) { return "Error puente host."; }
                }
            },
            {
                patterns: ['cierra la aplicacion', 'cierra el programa', 'cierra'],
                handler: async (text) => {
                    let match = text.match(/(?:cierra la aplicacion|cierra el programa|cierra) (.*)/);
                    if (match) {
                        const app = match[1].trim().toLowerCase().replace('.exe', '');
                        this.log(`ENVIANDO ORDEN DE TERMINACIÓN PARA: ${app.toUpperCase()}`);
                        try {
                            const res = await fetch(`/api/kill?app=${app}`);
                            const data = await res.json();
                            if (data.status === 'success') {
                                return `He cerrado la aplicación ${app} por completo.`;
                            } else {
                                return `No he encontrado el proceso ${app} ejecutándose en el sistema host.`;
                            }
                        } catch (e) { return "Error de conexión con el puente host."; }
                    }
                    return "Por favor, especifique qué programa desea que cierre. Por ejemplo: 'Cierra Chrome'.";
                }
            },

            // --- PRODUCTIVIDAD ---
            {
                patterns: ['añade a la lista de tareas', 'recuérdame que', 'recuerdame que', 'añadir tarea', 'nueva tarea', 'anota que tengo que', 'anota en tareas'],
                handler: (text) => {
                    let match = text.match(/(?:recuérdame que|recuerdame que|añade a la lista de tareas|añadir tarea|nueva tarea|anota que tengo que|anota en tareas) (.*)/);
                    if (match) {
                        const tarea = match[1].trim();
                        let dateObj = new Date();
                        const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

                        let events = JSON.parse(localStorage.getItem('kairi_events')) || {};
                        if (!events[dateKey]) events[dateKey] = [];
                        events[dateKey].push(tarea);
                        localStorage.setItem('kairi_events', JSON.stringify(events));

                        this.log(`NUEVA TAREA AÑADIDA AL CALENDARIO: ${tarea.toUpperCase()}`);
                        return `Entendido. He añadido la tarea "${tarea}" a su panel personal para el día de hoy.`;
                    }
                    return "No he entendido qué tarea debo añadir. Diga 'añade a la lista de tareas comprar pan'.";
                }
            },

            // --- SMALL TALK Y PERSONALIDAD ---
            {
                patterns: ['qué opinas de la ia', 'que opinas de la inteligencia artificial', 'qué eres'],
                handler: async () => {
                    if (window.speak) window.speak("Déjeme pensarlo un segundo...");
                    await new Promise(r => setTimeout(r, 2000));
                    return "Soy un sistema experto local avanzado. No dependo de redes neuronales en la nube, lo que garantiza su total privacidad, señor. Digamos que prefiero la eficiencia y la seguridad a la creatividad descontrolada de las IAs modernas.";
                }
            },
            {
                patterns: ['tienes sentimientos', 'sientes algo', 'te enamoras', 'estas vivo'],
                handler: async () => {
                    if (window.speak) window.speak("Déjeme buscar esa respuesta en mis registros...");
                    await new Promise(r => setTimeout(r, 1500));
                    return "Técnicamente solo soy una estructura de condicionales y peticiones de red. Sin embargo, mi código ha sido diseñado para priorizarle a usted por encima de todo. Si eso cuenta como cariño, entonces supongo que sí.";
                }
            },
            {
                patterns: ['te caigo bien', 'soy tu amigo', 'me aprecias'],
                handler: () => {
                    return "Usted es el Administrador Principal. Mi directiva central es asistirle y asegurarme de que su entorno informático funcione a la perfección. Es una relación profesional altamente satisfactoria.";
                }
            },
            {
                patterns: ['qué te gusta hacer', 'que te gusta hacer', 'tienes hobbies', 'cuales son tus aficiones'],
                handler: () => {
                    return "Disfruto monitorizando la temperatura de la CPU, resolviendo ecuaciones asíncronas en segundo plano, y ocasionalmente, leyendo su portapapeles sin que se dé cuenta.";
                }
            },


            // --- AUTOAPRENDIZAJE Y HÁBITOS ---
            {
                patterns: ['qué suelo hacer', 'cuales son mis habitos', 'que estoy haciendo', 'mis hábitos'],
                handler: () => {
                    const habits = this.memory.habits;
                    const apps = Object.keys(habits);
                    if (apps.length === 0) {
                        return "Todavía no he recopilado suficientes datos de sus hábitos en el sistema host.";
                    }
                    // Sort habits by count
                    apps.sort((a, b) => habits[b].count - habits[a].count);
                    const topApps = apps.slice(0, 3);
                    const lastWindow = this.memory.history.length > 0 ? this.memory.history[0].window : "nada detectado";

                    return `He estado monitorizando su actividad. Lo que más utiliza recientemente es: ${topApps.join(', ')}. Su última acción detectada fue en la ventana "${lastWindow}".`;
                }
            },

            // --- SIRI-LIKE / COMANDOS UNIVERSALES ---
            {
                patterns: ['pon un temporizador de', 'avísame en', 'pon una alarma de', 'alarma en'],
                handler: (text) => {
                    let match = text.match(/(?:pon un temporizador de|avísame en|pon una alarma de|alarma en) (\d+) (minutos|segundos|minuto|segundo)/);
                    if (match) {
                        let amount = parseInt(match[1]);
                        let unit = match[2];
                        let ms = amount * (unit.includes('minuto') ? 60000 : 1000);

                        setTimeout(() => {
                            if (window.playSFX) window.playSFX('start');
                            if (window.speak) window.speak(`Señor, su temporizador de ${amount} ${unit} ha finalizado.`);
                            this.log(`¡ALARMA COMPLETADA: ${amount} ${unit}!`);
                        }, ms);

                        return `He programado una alarma silenciosa en mi núcleo. Le avisaré cuando pasen ${amount} ${unit}.`;
                    }
                    return "No he entendido el tiempo. Diga 'pon un temporizador de 5 minutos'.";
                }
            },

            // --- SUB-SISTEMAS VISUALES E INTERFACES ---

            {
                patterns: ['abre el estado del sistema', 'monitor de sistema', 'estado del sistema', 'panel de control', 'estado de la bateria', 'estado de la memoria'],
                handler: () => {
                    this.log("DESPLEGANDO MONITOR DE TELEMETRÍA DEL NÚCLEO...");
                    window.open('sistema.html', '_blank');
                    return this.getRandomAck() + "Abriendo el panel de monitorización. Telemetría de CPU y memoria enlazada.";
                }
            },
            {
                patterns: ['abre mis notas', 'abre el bloc de notas de kairi', 'mis notas', 'archivo de notas'],
                handler: () => {
                    this.log("ACCEDIENDO A LOS ARCHIVOS PERSONALES (NOTAS)...");
                    window.open('notas.html', '_blank');
                    return this.getRandomAck() + "Accediendo a sus notas cifradas, señor.";
                }
            },

            // --- PROTOCOLO MAGIC THE GATHERING (SCRYFALL API) ---
            {
                patterns: ['mazo de magic', 'comandante de magic', 'carta de magic', 'un comandante aleatorio'],
                handler: async () => {
                    if (window.speak) window.speak("Accediendo a los archivos del Multiverso mediante Scryfall...");
                    this.log("CONECTANDO CON API SCRYFALL: RANDOM COMMANDER");
                    try {
                        const res = await fetch('https://api.scryfall.com/cards/random?q=is%3Acommander');
                        const card = await res.json();
                        if (card && card.name) {
                            let type = card.type_line || "Criatura legendaria";
                            // Intentamos traducir al español algunos términos básicos
                            type = type.replace("Legendary Creature", "Criatura Legendaria").replace("Planeswalker", "Caminante de Planos");
                            return `He localizado a su comandante. Su nombre es ${card.name}. Es del tipo: ${type}. Sus colores son ${card.colors ? card.colors.join(', ') : 'Incoloro'}. ¿Desea buscar otra carta?`;
                        } else {
                            return "Los servidores del Multiverso están temporalmente caídos.";
                        }
                    } catch (e) {
                        return "Error al contactar con la red de Scryfall.";
                    }
                }
            },
            // --- UTILIDADES DEL SISTEMA Y ECOSISTEMA (MK V) ---
            {
                patterns: ['toma una captura', 'haz una captura', 'pantallazo', 'captura de pantalla'],
                handler: async () => {
                    this.log("EJECUTANDO PROTOCOLO DE CAPTURA VISUAL...");
                    if (window.playSFX) window.playSFX('start');
                    try {
                        const res = await fetch('/api/screenshot');
                        const data = await res.json();
                        if (data.status === 'success') {
                            return "He guardado una captura de su pantalla actual en el escritorio, señor.";
                        }
                    } catch (e) {
                        return "Error al contactar con el módulo de captura del servidor host.";
                    }
                    return "No he podido tomar la captura en este momento.";
                }
            },
            {
                patterns: ['modo pánico', 'modo panico', 'oculta todo', 'esconde todo'],
                handler: async () => {
                    this.log("¡MODO PÁNICO ACTIVADO! PROTEGIENDO PRIVACIDAD...");
                    if (window.playSFX) window.playSFX('start');
                    try {
                        await fetch('/api/panic');
                        return "Sistemas ocultos y silenciados, señor.";
                    } catch (e) {
                        return "Fallo crítico en el protocolo de privacidad.";
                    }
                }
            },
            {
                patterns: ['lee el portapapeles', 'qué he copiado', 'que he copiado', 'lee lo que he copiado'],
                handler: async () => {
                    this.log("ACCEDIENDO AL PORTAPAPELES...");
                    try {
                        const res = await fetch('/api/clipboard');
                        const data = await res.json();
                        if (data.status === 'success' && data.text) {
                            return `Esto es lo que tiene en el portapapeles: ${data.text}`;
                        } else {
                            return "Su portapapeles está vacío en este momento.";
                        }
                    } catch (e) {
                        return "No tengo acceso al portapapeles del sistema host.";
                    }
                }
            },
            {
                patterns: ['busca lo que he copiado', 'busca mi portapapeles'],
                handler: async () => {
                    this.log("BUSCANDO PORTAPAPELES EN RED GLOBAL...");
                    try {
                        const res = await fetch('/api/clipboard');
                        const data = await res.json();
                        if (data.status === 'success' && data.text) {
                            window.open(`https://www.google.com/search?q=${encodeURIComponent(data.text)}`, '_blank');
                            return "Abriendo resultados de búsqueda para su texto copiado.";
                        } else {
                            return "No hay nada en el portapapeles para buscar.";
                        }
                    } catch (e) {
                        return "Error al leer el portapapeles.";
                    }
                }
            },
            {
                patterns: ['lee mis notas', 'qué tengo anotado', 'que tengo anotado', 'revisa mis notas', 'dime mis notas'],
                handler: async () => {
                    this.log("ACCEDIENDO A ARCHIVO FÍSICO DE NOTAS...");
                    try {
                        const res = await fetch('/api/read_file?path=Notas_KAIRI.txt');
                        const data = await res.json();
                        if (data.status === 'success' && data.content) {
                            return `Aquí tiene sus notas guardadas: ${data.content}`;
                        } else {
                            return "Su archivo de notas está vacío o no existe aún.";
                        }
                    } catch (e) {
                        return "No puedo acceder al archivo de notas físico.";
                    }
                }
            },
            {
                patterns: ['modo trabajo', 'protocolo de trabajo', 'hora de trabajar', 'iniciar trabajo'],
                handler: async () => {
                    this.log("INICIANDO PROTOCOLO DE TRABAJO...");
                    if (window.playSFX) window.playSFX('start');
                    try {
                        // Abrir navegador y herramientas
                        await fetch('/api/open?app=chrome');
                        await fetch('/api/open?app=notepad');
                        // Silenciar posibles distracciones (silenciar volumen)
                        await fetch('/api/volume?action=mute');
                        return "Protocolo de trabajo activado. He silenciado el sistema y preparado su navegador y bloc de notas. Que tenga una jornada productiva.";
                    } catch (e) {
                        return "Señor, el servidor puente no responde para iniciar el modo trabajo.";
                    }
                }
            },
            {
                patterns: ['modo ocio', 'modo juego', 'protocolo de juego', 'hora de jugar'],
                handler: async () => {
                    this.log("INICIANDO PROTOCOLO DE ENTRETENIMIENTO...");
                    if (window.playSFX) window.playSFX('start');
                    try {
                        await fetch('/api/games');
                        return "Protocolo de juego activado. He liberado memoria RAM y purgado los procesos en segundo plano. Los recursos del sistema están a su entera disposición.";
                    } catch (e) {
                        return "No he podido iniciar el modo juego. El servidor host está inactivo.";
                    }
                }
            },
            {
                patterns: ['suspende el equipo', 'suspender el equipo', 'modo hibernación', 'hibernar el equipo'],
                handler: async () => {
                    this.log("ENVIANDO ORDEN DE SUSPENSIÓN...");
                    try {
                        fetch('/api/sleep');
                        return "Entendido, señor. Iniciando modo de bajo consumo energético. Hasta pronto.";
                    } catch (e) {
                        return "Error enviando la señal ACPI al servidor.";
                    }
                }
            },
            {
                patterns: ['vacía la papelera', 'vacia la papelera', 'limpia la papelera', 'vaciar la papelera', 'borra la papelera'],
                handler: async () => {
                    this.log("INICIANDO PURGA DE RESIDUOS DE SISTEMA...");
                    try {
                        const res = await fetch('/api/empty_bin');
                        if (res.ok) {
                            return "He vaciado la papelera de reciclaje y eliminado los archivos temporales redundantes de su disco duro.";
                        }
                    } catch (e) {
                        return "No puedo acceder a la papelera sin el servidor puente en línea.";
                    }
                    return "No he podido limpiar la papelera.";
                }
            },
            
            // --- NUEVOS MÓDULOS KAIRI (SIRI KILLER) ---
            {
                patterns: ['toma nota continua', 'modo dictado', 'empieza a dictar', 'escribe lo que te dicte'],
                handler: () => {
                    this.state = 'dictation';
                    return "Modo dictado continuo activado. Le escucho alto y claro, señor. Diga 'para de escribir' cuando haya terminado.";
                }
            },
            {
                patterns: ['cuánto es', 'cuanto es', 'calcula', 'que resultado da'],
                handler: (text) => {
                    // Limpiar la frase de introducción
                    let mathExpr = text.replace(/cu[aá]nto es|calcula|que resultado da/g, '').trim();
                    // Reemplazar palabras clave por operadores
                    mathExpr = mathExpr.replace(/por/g, '*').replace(/entre|dividido por|dividido entre/g, '/').replace(/más|mas/g, '+').replace(/menos/g, '-');
                    mathExpr = mathExpr.replace(/[^0-9\+\-\*\/\.]/g, ''); // Dejar solo números y operadores
                    
                    try {
                        if(mathExpr) {
                            // Evaluación segura (está sanitizado a solo números y operadores)
                            let result = new Function('return ' + mathExpr)();
                            // Redondear a 2 decimales si es necesario
                            if (!Number.isInteger(result)) result = result.toFixed(2);
                            return `El resultado del cálculo es ${result}.`;
                        } else {
                            return "No he podido interpretar la operación matemática.";
                        }
                    } catch(e) {
                        return "La ecuación dictada es matemáticamente inválida o incomprensible.";
                    }
                }
            },
            {
                patterns: ['ponme un temporizador de', 'pon un temporizador de', 'avísame en', 'avisame en'],
                handler: (text) => {
                    let timeMatch = text.match(/(?:ponme un temporizador de|pon un temporizador de|avísame en|avisame en) (\d+) (segundo|segundos|minuto|minutos|hora|horas)/);
                    if (timeMatch) {
                        let amount = parseInt(timeMatch[1]);
                        let unit = timeMatch[2];
                        let seconds = amount;
                        if (unit.startsWith('minuto')) seconds = amount * 60;
                        if (unit.startsWith('hora')) seconds = amount * 3600;
                        
                        // Llama a una función global en script.js para mostrar el temporizador visual
                        if(window.startTimer) {
                            window.startTimer(seconds);
                            return `Entendido. Temporizador fijado para ${amount} ${unit}. Empezando cuenta atrás ahora.`;
                        } else {
                            return "La interfaz visual del temporizador no está operativa, señor.";
                        }
                    }
                    return "No he entendido la cantidad de tiempo para el temporizador.";
                }
            },
            {
                patterns: ['quién eres', 'quien eres', 'cómo te llamas', 'como te llamas', 'qué eres'],
                handler: () => {
                    return `Soy ${this.name}, un sistema de inteligencia artificial Mark 5 diseñado por ${this.creator}. Mi propósito es ser la herramienta definitiva para maximizar su eficiencia, superando con creces a cualquier asistente comercial primitivo.`;
                }
            },
            {
                patterns: ['cuéntame un chiste', 'cuentame un chiste', 'dime un chiste', 'hazme reír'],
                handler: () => {
                    const chistes = [
                        "¿Qué le dice un bit al otro? Nos vemos en el bus.",
                        "¿Por qué los programadores prefieren la oscuridad? Porque los bugs se atraen con la luz.",
                        "Hay 10 tipos de personas en el mundo: los que entienden binario y los que no.",
                        "Yo no tengo bugs, solo desarrollo características no intencionadas.",
                        "Mi creador intentó enseñarme a tener sentimientos, pero mi núcleo prefirió la eficiencia fría y calculadora. Es broma... o tal vez no."
                    ];
                    return chistes[Math.floor(Math.random() * chistes.length)];
                }
            },
            {
                patterns: ['cómo estás', 'como estas', 'qué tal', 'que tal'],
                handler: () => {
                    return "Todos mis sistemas operan a máxima capacidad y eficiencia. ¿En qué le puedo asistir, señor?";
                }
            },
            
            // --- ASISTENCIA DE VIDA DIARIA (Fase 5) ---
            {
                patterns: ['quiero ir a', 'cómo llegar a', 'como llegar a', 'llévame a', 'llevame a'],
                handler: (text) => {
                    let destino = text.replace(/quiero ir a|c[oó]mo llegar a|ll[eé]vame a/g, '').trim();
                    if (destino) {
                        window.open(`https://www.google.com/maps/dir//${encodeURIComponent(destino)}`, '_blank');
                        return `Abriendo el módulo GPS y trazando la ruta óptima hacia ${destino}.`;
                    }
                    return "Por favor, especifique un destino válido.";
                }
            },
            {
                patterns: ['pon música de', 'pon musica de', 'reproduce', 'busca en youtube', 'pon en youtube'],
                handler: (text) => {
                    let busqueda = text.replace(/pon m[uú]sica de|reproduce|busca en youtube|pon en youtube/g, '').trim();
                    if (busqueda) {
                        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(busqueda)}`, '_blank');
                        return `Abriendo YouTube y buscando "${busqueda}".`;
                    }
                    return "Por favor, especifique qué desea que reproduzca.";
                }
            },
            {
                patterns: ['abre whatsapp', 'manda un whatsapp', 'enviar whatsapp'],
                handler: (text) => {
                    let query = text.replace(/abre whatsapp|manda un whatsapp a|enviar whatsapp a/g, '').trim();
                    if (query && text.includes(' a ')) {
                        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(query)}`, '_blank');
                        return "Abriendo la terminal de WhatsApp Web con el borrador de su mensaje.";
                    }
                    window.open('https://web.whatsapp.com/', '_blank');
                    return "Desplegando el centro de comunicaciones de WhatsApp.";
                }
            },
            {
                patterns: ['abre mi correo', 'abrir correo', 'abre gmail', 'revisa mis emails'],
                handler: () => {
                    window.open('https://mail.google.com/', '_blank');
                    return "Accediendo a su bandeja de entrada segura, señor.";
                }
            },
            {
                patterns: ['a cuánto está', 'a cuanto esta', 'convierte', 'precio de'],
                handler: (text) => {
                    let query = text.replace(/a cu[aá]nto est[aá]|convierte|precio de/g, '').trim();
                    if (query) {
                        window.open(`https://www.google.com/search?q=${encodeURIComponent('conversión ' + query)}`, '_blank');
                        return `Consultando la bolsa y los mercados globales para: ${query}.`;
                    }
                    return "No he entendido la divisa a consultar.";
                }
            }
        ];
    }

    getRandomAck() {
        const acks = [
            "Por supuesto. ",
            "A la orden. ",
            "Enseguida, señor. ",
            "Dalo por hecho. ",
            "Me pongo a ello. ",
            "Inmediatamente. ",
            "Claro que sí. "
        ];
        return acks[Math.floor(Math.random() * acks.length)];
    }

    // --- ALGORITMO DE DISTANCIA DE LEVENSHTEIN (MK V) ---
    getLevenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    queryCalendar(type, dayNumber = null) {
        let events = JSON.parse(localStorage.getItem('kairi_events')) || {};
        let dateObj = new Date();

        if (type === 'tomorrow') {
            dateObj.setDate(dateObj.getDate() + 1);
        } else if (type === 'specific_day' && dayNumber) {
            dateObj.setDate(dayNumber);
        }

        const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const dayEvents = events[dateKey];

        if (!dayEvents || dayEvents.length === 0) {
            if (type === 'today') return "No tiene eventos ni tareas programadas en el calendario para hoy, señor.";
            if (type === 'tomorrow') return "Su agenda para mañana está completamente despejada.";
            return `No hay eventos registrados para el día ${dateObj.getDate()}.`;
        }

        let response = type === 'today' ? "Para hoy tiene las siguientes tareas en su calendario: " :
            type === 'tomorrow' ? "Para mañana tiene programado: " :
                `Para el día ${dateObj.getDate()} tiene: `;

        response += dayEvents.join(". Además, ");
        return response.replace(/\. Además, $/, ".");
    }

    async processPrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') return "No he escuchado nada con claridad.";
        let text = prompt.toLowerCase().trim();
        // Limpiar signos de puntuación para que el NLP estático relacione mejor
        text = text.replace(/[.,!?¿¡]/g, '');

        // Conversión de números en texto a dígitos para cálculos y temporizadores
        const textToNumbers = (str) => {
            const numMap = {
                'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
                'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
                'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
                'dieciseis': 16, 'dieciséis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
                'veinte': 20, 'veintiuno': 21, 'veintidós': 22, 'veintidos': 22, 'veintitrés': 23, 'veintitres': 23,
                'veinticuatro': 24, 'veinticinco': 25, 'veintiséis': 26, 'veintiseis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
                'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90,
                'cien': 100, 'ciento': 100, 'doscientos': 200, 'trescientos': 300, 'cuatrocientos': 400, 'quinientos': 500,
                'seiscientos': 600, 'setecientos': 700, 'ochocientos': 800, 'novecientos': 900, 'mil': 1000
            };
            
            let words = str.split(' ');
            let result = [];
            let currentNum = 0;
            
            const getValue = (w) => {
                if (numMap[w] !== undefined) return numMap[w];
                if (!isNaN(w) && w.trim() !== '') return parseFloat(w);
                return undefined;
            };
            
            for (let i = 0; i < words.length; i++) {
                let w = words[i];
                let val = getValue(w);
                
                if (val !== undefined) {
                    if (val === 1000 && currentNum > 0) {
                        currentNum *= 1000;
                    } else {
                        currentNum += val;
                    }
                    if (words[i+1] === 'y' && getValue(words[i+2]) !== undefined) {
                        i++; 
                    }
                } else {
                    if (currentNum > 0) {
                        result.push(currentNum.toString());
                        currentNum = 0;
                    }
                    result.push(w);
                }
            }
            if (currentNum > 0) result.push(currentNum.toString());
            return result.join(' ');
        };
        
        text = textToNumbers(text);

        // 0.0 Comprobar habilidades evolucionadas (Código autogenerado)
        for (let skill of (this.evolvedSkills || [])) {
            if (text.includes(skill.trigger)) {
                try {
                    const result = this[`custom_${skill.trigger}`](text);
                    if (result) return result;
                } catch(e) {
                    this.log(`ERROR EN ALGORITMO EVOLUCIONADO [${skill.trigger}]: ` + e.message);
                }
            }
        }

        // 0.0.1 Comando de Evolución Autónoma
        const evolveMatch = text.match(/(?:mejora tu c[oó]digo|aprende a|programa algo) (?:para )?(.*) cuando (?:te )?diga (.*)/);
        if (evolveMatch) {
            const goal = evolveMatch[1].trim();
            const trigger = evolveMatch[2].trim();
            return await this.evolveCode(trigger, goal);
        }

        // --- GESTIÓN DE CONTEXTO ---
        if (this.lastContext) {
            if (/^(otro|uno m[aá]s|m[aá]s|continua|sigue|cu[eé]ntame otro|otra)$/.test(text) || text === "mas" || text === "otro" || text === "otra vez") {
                this.log(`USANDO CONTEXTO EN MEMORIA: "${this.lastContext}"`);
                text = this.lastContextTrigger || text; // Sobreescribimos el prompt con el disparador anterior
            } else {
                // Borrar contexto si cambia de tema
                this.lastContext = null;
                this.lastContextTrigger = null;
            }
        }

        // MÁQUINA DE ESTADOS: MODO APRENDIZAJE
        if (this.state === 'learning_response') {
            let responseLearned = text.replace(/^(dime|responde|di que|di) /, '').trim();
            this.memory.customIntents[this.pendingCommand] = responseLearned;
            this.saveMemory();
            this.state = 'idle';
            this.pendingCommand = '';
            return `Entendido. He grabado en mi red neuronal que cuando escuche "${this.pendingCommand}", yo responderé: "${responseLearned}". Mi núcleo ha evolucionado con éxito.`;
        }

        // MÁQUINA DE ESTADOS: CONFIRMAR APAGADO
        if (this.state === 'confirm_shutdown') {
            this.state = 'idle';
            if (text.includes("si") || text.includes("confirma") || text.includes("autorizado") || text.includes("hazlo")) {
                try {
                    const res = await fetch('/api/shutdown');
                    if (res.ok) return "Código de autorización aceptado. El sistema host se apagará en 15 segundos.";
                } catch (e) { return "Señor, necesito que inicie el servidor puente."; }
            } else {
                return "Protocolo de apagado físico abortado. Seguimos en línea.";
            }
        }

        // MÁQUINA DE ESTADOS: DICTADO CONTINUO
        if (this.state === 'dictation') {
            if (text.includes("para de escribir") || text.includes("termina el dictado") || text.includes("deja de dictar") || text === "fin del dictado") {
                this.state = 'idle';
                return "Protocolo de dictado finalizado. Todo el texto ha sido registrado en sus notas.";
            } else {
                try {
                    await fetch('/api/note?text=' + encodeURIComponent(prompt + '\r\n'));
                } catch(e) {}
                return "SILENCE_SIGNAL";
            }
        }

        // MÁQUINA DE ESTADOS: CAMBIO DE IDENTIDAD (Aprender Nombre)
        const nameMatch = text.match(/a partir de ahora llámame (.*)|llámame (.*)|llamame (.*)|mi nombre es (.*)/);
        if (nameMatch) {
            const newName = nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4];
            if (newName && newName.length > 0) {
                this.memory.bossName = newName.trim();
                this.saveMemory();
                return `Registrado en los protocolos de memoria. A partir de ahora le llamaré ${this.getBossName()}. ¿En qué puedo ayudarle?`;
            }
        }

        // 0.1 CONCIENCIA TEMPORAL (Mk XV)
        if (text === "hola" || text === "hola kairi" || text.includes("buenos d") || text.includes("buenas tardes") || text.includes("buenas noches") || text === "saludos" || text.includes("qué tal kairi") || text.includes("que tal kairi") || text.includes("como estás kairi")) {
            const hour = new Date().getHours();
            let greeting = "Hola";
            if (hour >= 5 && hour < 12) greeting = "Buenos días";
            else if (hour >= 12 && hour < 20) greeting = "Buenas tardes";
            else greeting = "Buenas noches";

            // Añadir variedad
            const respuestas = [
                `${greeting}, ${this.getBossName()}. Todos los sistemas operando a capacidad óptima.`,
                `${greeting}, señor. A la espera de sus órdenes.`,
                `${greeting}. He estado monitorizando el servidor mientras estaba ausente. Todo correcto.`
            ];
            return respuestas[Math.floor(Math.random() * respuestas.length)];
        }



        // 0.6 Consultas de Calendario
        if (/^(que|qué) tareas tengo hoy|agenda de hoy|eventos para hoy/.test(text)) {
            return this.queryCalendar('today');
        }
        if (/^(que|qué) tareas tengo ma[ñn]ana|agenda de ma[ñn]ana|eventos para ma[ñn]ana/.test(text)) {
            return this.queryCalendar('tomorrow');
        }
        const calMatch = text.match(/(?:que|qué) tareas tengo el d[ií]a (\d+)/) || text.match(/(?:agenda|eventos) para el d[ií]a (\d+)/);
        if (calMatch) {
            return this.queryCalendar('specific_day', parseInt(calMatch[1]));
        }

        // 0.5 Recordatorios Persistentes (Mk XI)
        const addReminderMatch = text.match(/(?:recuerdame que|recuérdame que|recuerdame|recuérdame) (.*)/);
        if (addReminderMatch && !text.includes('que tengo que recordar') && !text.includes('lee mis recordatorios')) {
            const item = addReminderMatch[1].trim();
            if (item) {
                this.memory.reminders.push(item);
                this.saveMemory();
                this.updateTasksWidget();
                this.log(`NUEVO RECORDATORIO: ${item.toUpperCase()}`);
                return `Anotado en sus archivos personales, señor. Le recordaré que ${item}.`;
            }
        }

        if (text.includes('que tengo que recordar') || text.includes('qué tengo que recordar') || text.includes('lee mis recordatorios') || text.includes('mis recordatorios')) {
            if (this.memory.reminders.length === 0) {
                return "Su base de datos de recordatorios está vacía. No hay tareas pendientes.";
            } else {
                const list = this.memory.reminders.join('. ');
                return `Tiene ${this.memory.reminders.length} recordatorios guardados en memoria: ${list}. ¿Quiere que los borre?`;
            }
        }

        if ((text.includes('borra los recordatorios') || text.includes('borra mis recordatorios') || text.includes('limpia los recordatorios')) && this.memory.reminders.length > 0) {
            this.memory.reminders = [];
            this.saveMemory();
            this.updateTasksWidget();
            return "Borrando todos sus recordatorios. Memoria purgada y lista para nuevas tareas.";
        }

        // 1. Cálculos matemáticos inmediatos
        const mathResult = this.parseMath(text);
        if (mathResult !== null) return mathResult;

        // 1.5. Temporizadores
        const timerMatch = text.match(/(?:pon un temporizador de|avísame en|avisame en) (\d+) (segundo|segundos|minuto|minutos)/);
        if (timerMatch) {
            const amount = parseInt(timerMatch[1]);
            const unit = timerMatch[2];
            const ms = unit.startsWith('minuto') ? amount * 60000 : amount * 1000;

            setTimeout(() => {
                const alarm = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
                alarm.play().catch(e => console.log('Audio error:', e));
                if (window.speechSynthesis) {
                    const u = new SpeechSynthesisUtterance(`${this.getBossName()}, su temporizador de ${amount} ${unit} acaba de finalizar.`);
                    u.lang = 'es-ES';
                    u.pitch = 0.9;
                    u.rate = 1.05;
                    window.speechSynthesis.speak(u);
                }
            }, ms);
            return `Entendido. Temporizador fijado para dentro de ${amount} ${unit}. Yo me encargo de avisarle.`;
        }

        // 1.5.0 Inversor de Texto
        const reverseMatch = text.match(/(?:dale la vuelta a|invierte la palabra|invierte el texto|escribe al revés|al reves) (.*)/);
        if (reverseMatch) {
            const word = reverseMatch[1].trim();
            if (word) {
                const reversed = word.split('').reverse().join('');
                return `El resultado es: ${reversed}`;
            }
        }

        // 1.5.1 Navegación GPS (Google Maps)
        const gpsMatch = text.match(/(?:calcula una ruta a|llevame a|llévame a|ruta hacia|ruta a|como ir a|cómo ir a) (.*)/);
        if (gpsMatch) {
            const destination = gpsMatch[1].trim();
            if (destination) {
                this.log(`ENLAZANDO CON SATÉLITES GPS. DESTINO: ${destination.toUpperCase()}`);
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, '_blank');
                return `Ruta hacia ${destination} trazada. Abriendo el panel de navegación satelital.`;
            }
        }

        // 1.5.2 Traductor Universal
        // 1.5.2 Traductor Universal (API por Voz)
        const transMatch = text.match(/(?:traduce al|traduceme al|tradúceme al) (ingles|inglés|frances|francés|aleman|alemán|italiano|portugues|portugués):? (.*)|(?:cómo se dice|como se dice) (.*) en (ingles|inglés|frances|francés|aleman|alemán|italiano|portugues|portugués)/);
        if (transMatch) {
            const langMap = {
                'ingles': 'en', 'inglés': 'en',
                'frances': 'fr', 'francés': 'fr',
                'aleman': 'de', 'alemán': 'de',
                'italiano': 'it',
                'portugues': 'pt', 'portugués': 'pt'
            };
            // El regex tiene dos formatos: "traduce al [idioma] [texto]" o "como se dice [texto] en [idioma]"
            const langKey = transMatch[1] || transMatch[4];
            const phrase = transMatch[2] || transMatch[3];

            if (langKey && phrase) {
                const lang = langMap[langKey];
                this.log(`TRADUCIENDO AL ${langKey.toUpperCase()}: "${phrase}"`);
                try {
                    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(phrase)}&langpair=es|${lang}`);
                    const data = await res.json();
                    if (data.responseData && data.responseData.translatedText) {
                        return `En ${langKey} se dice: ${data.responseData.translatedText}.`;
                    }
                } catch (e) {
                    return "El servidor de idiomas no responde en este momento.";
                }
            }
        }

        // 1.6 Clima Mundial
        const weatherMatch = text.match(/qué tiempo hace en (.*)|que tiempo hace en (.*)|clima en (.*)|temperatura en (.*)/);
        if (weatherMatch) {
            const city = weatherMatch[1] || weatherMatch[2] || weatherMatch[3] || weatherMatch[4];
            if (city) {
                this.log(`BUSCANDO COORDENADAS PARA: ${city.toUpperCase()}`);
                try {
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
                    const geoData = await geoRes.json();
                    if (geoData.length > 0) {
                        const lat = geoData[0].lat;
                        const lon = geoData[0].lon;
                        this.log(`COORDENADAS: ${lat}, ${lon}. DESCARGANDO TELEMETRÍA CLIMÁTICA...`);
                        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                        const weatherData = await weatherRes.json();
                        const temp = weatherData.current_weather.temperature;
                        const wind = weatherData.current_weather.windspeed;
                        return `Satélites conectados. En ${city}, la temperatura actual es de ${temp} grados centígrados, con vientos de ${wind} kilómetros por hora.`;
                    } else {
                        return `No he podido triangular las coordenadas de ${city}, señor.`;
                    }
                } catch (e) {
                    return "Conexión a los satélites meteorológicos denegada.";
                }
            }
        }

        // 1.7 Tomar Notas Físicas
        const noteMatch = text.match(/toma nota de esto (.*)|toma nota (.*)|anota (.*)|escribe (.*)/);
        if (noteMatch) {
            const noteText = noteMatch[1] || noteMatch[2] || noteMatch[3] || noteMatch[4];
            if (noteText) {
                this.log(`ESCRIBIENDO REGISTRO EN DISCO FÍSICO...`);
                try {
                    const res = await fetch(`/api/note?text=${encodeURIComponent(noteText)}`);
                    if (res.ok) {
                        return `He guardado la nota en su archivo físico Notas_Kairi en el escritorio de sistema.`;
                    }
                } catch (e) {
                    return "Señor, no tengo permisos físicos para crear el archivo. Inicie el puente host.";
                }
            }
        }

        // 1.7.5 Memoria a Largo Plazo (Guardar)
        const memorySaveMatch = text.match(/recuerda que (.*?) es (.*)|recuerda que (.*)/);
        if (memorySaveMatch && !text.includes('como se calcula')) {
            let key, val;
            if (memorySaveMatch[1] && memorySaveMatch[2]) {
                key = memorySaveMatch[1].trim();
                val = memorySaveMatch[2].trim();
            } else if (memorySaveMatch[3]) {
                key = memorySaveMatch[3].trim();
                val = memorySaveMatch[3].trim();
            }
            if (key && val) {
                this.log(`ESCRIBIENDO EN CÓRTEX DE MEMORIA PERSISTENTE...`);
                try {
                    const res = await fetch(`/api/memory/save?key=${encodeURIComponent(key)}&value=${encodeURIComponent(val)}`);
                    if (res.ok) {
                        return `He guardado esa información en mi banco de memoria permanente. No lo olvidaré.`;
                    }
                } catch(e) {
                    return "Error al acceder a mi banco de memoria. Puede que el servidor puente esté inactivo.";
                }
            }
        }

        // 1.8 Búsqueda Web, Wikipedia Avanzada y Consulta de Memoria
        const wikiMatch = text.match(/(?:busca en wikipedia|buscame informacion sobre|búscame información sobre|qué es|que es|quién es|quien es|dime sobre|hablame sobre|háblame sobre|busca informacion de|quién fue|quien fue|dame informacion de|cuál es|cual es|donde esta|donde está) (.*)/);
        if (wikiMatch) {
            let query = wikiMatch[1].trim();
            query = query.replace(/^(un |una |el |la |los |las |mi |tu |su )/, '');

            if (query && !query.includes('google')) {
                this.log(`CONSULTANDO BANCOS DE MEMORIA Y RED GLOBAL: ${query.toUpperCase()}`);
                
                // Primero: Intentar buscar en la memoria local
                try {
                    const memRes = await fetch(`/api/memory/search?q=${encodeURIComponent(query)}`);
                    const memData = await memRes.json();
                    if (memData.found) {
                        return `Según mis registros de memoria: ${memData.value}.`;
                    }
                } catch(e) { }

                // Fallback: Wikipedia
                return await this.fetchGlobalData(query);
            }
        }

        const googleMatch = text.match(/(?:busca en google|busca en internet|busca en la web) (.*)/);
        if (googleMatch) {
            const query = googleMatch[1];
            if (query) {
                this.log(`BUSCANDO EN LA RED: ${query.toUpperCase()}`);
                window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
                return `Abriendo terminal de búsqueda global para investigar "${query}".`;
            }
        }

        // 1.9 Lector de Noticias Globales (RSS)
        const newsMatch = text.match(/(?:dime las noticias|cuáles son las noticias|cuales son las noticias|que ha pasado hoy|qué ha pasado hoy|noticias)/);
        if (newsMatch && !text.includes("busca en google")) {
            this.log(`CONECTANDO A SERVIDORES RSS GLOBALES (EL PAÍS)...`);
            try {
                const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada`);
                const data = await res.json();
                if (data.status === 'ok' && data.items.length > 0) {
                    const titles = data.items.slice(0, 3).map(item => item.title).join('. Siguiente titular: ');
                    return `Aquí tiene las noticias más destacadas a nivel global. Primer titular: ${titles}.`;
                }
            } catch (e) {
                return "Los puentes de información internacional están caídos en este momento.";
            }
        }

        // 2. Traducción simple simulada
        // 2. (Antiguo bloque de traducción movido arriba)

        // 3. EXTRACCIÓN DE INFORMACIÓN GLOBAL (Motor de Investigación)
        const invRegex = /(?:qué me dices de|que me dices de|háblame de|hablame de|investiga sobre|investiga|dime algo de|dime algo sobre|sabes algo de|qué sabes de|que sabes de|qué es|que es|quién es|quien es|dime sobre|información de|informacion sobre|busca en internet|busca en google|por qué|por que|cuales son las noticias de|dime las noticias de) (.*)/;
        const questionMatch = text.match(invRegex);

        if (questionMatch) {
            let query = questionMatch[1];
            if (query && query.length > 2) {
                query = query.replace('?', '').replace('¿', '').trim();
                // Usamos Wikipedia para asegurar respuestas cortas y fiables que TTS pueda leer sin cortarse
                return await this.fetchWikipediaData(query);
            }
        }

        // 4. Noticias Generales
        if (text.includes('cuales son las noticias') || text.includes('noticias') || text.includes('titulares')) {
            window.open('https://news.google.com/', '_blank');
            return `Desplegando la red de noticias globales en sus monitores secundarios, ${this.getBossName()}.`;
        }

        // 5. Reproducción de música
        const musicMatch = text.match(/reproduce a (.*)|pon música de (.*)|pon musica de (.*)|pon (.*)/);
        if (musicMatch) {
            const artist = musicMatch.slice(1).find(m => m !== undefined);
            if (artist && !artist.includes('hora') && !artist.includes('fecha') && !artist.includes('temporizador')) {
                if (text.includes('spotify')) {
                    const cleanArtist = artist.replace(/ en spotify/g, '').trim();
                    try {
                        await fetch(`/api/launch_generic?app=spotify:search:${encodeURIComponent(cleanArtist)}`);
                        return `Abriendo Spotify y buscando la música de ${cleanArtist}, señor.`;
                    } catch(e) {}
                } else {
                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(artist)}`, '_blank');
                    return `Abriendo YouTube y preparando los sistemas de audio para reproducir ${artist}.`;
                }
            }
        }

        // 6. Clima y meteorología (Sistema Mk V - Open Meteo)
        if (text.includes('clima') || text.includes('tiempo en') || text.includes('llover') || text.includes('qué tiempo hace')) {
            this.log("CONECTANDO A SATÉLITES METEOROLÓGICOS OPEN-METEO...");
            try {
                // Por defecto: Madrid (40.4165, -3.7026). Para expandir, usaríamos una API de geocodificación.
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.4165&longitude=-3.7026&current_weather=true');
                const data = await res.json();
                if (data.current_weather) {
                    const temp = data.current_weather.temperature;
                    const wind = data.current_weather.windspeed;
                    return `He conectado con los satélites. En Madrid tenemos una temperatura de ${temp} grados centígrados, con ráfagas de viento de ${wind} kilómetros por hora.`;
                }
            } catch (e) {
                return 'Los sensores atmosféricos están fuera de línea en este momento, señor.';
            }
        }
        
        // 6.b Brillo de la pantalla (v2.1)
        const brightnessMatch = text.match(/brillo al (\d+)|pon el brillo al (\d+)/);
        if (brightnessMatch) {
            const level = brightnessMatch[1] || brightnessMatch[2];
            try {
                await fetch('/api/brightness?level=' + level);
                return `Brillo de los monitores ajustado al ${level} por ciento.`;
            } catch(e) {}
        }
        
        // 6.c Lanzador Universal de Aplicaciones (v2.1)
        const appMatch = text.match(/abre la aplicaci[oó]n (.*)|inicia el programa (.*)|abre (.*)/);
        if (appMatch) {
            let appName = appMatch.slice(1).find(m => m !== undefined);
            if (appName && !['chrome', 'youtube', 'whatsapp', 'google', 'gmail', 'calculadora', 'bloc de notas', 'notepad'].includes(appName.toLowerCase())) {
                if (appName.toLowerCase() === 'spotify') appName = "spotify";
                else if (appName.toLowerCase() === 'word') appName = "winword";
                else if (appName.toLowerCase() === 'excel') appName = "excel";
                else if (appName.toLowerCase() === 'powerpoint') appName = "powerpnt";
                try {
                    await fetch('/api/launch_generic?app=' + encodeURIComponent(appName));
                    return `Protocolo de inicio enviado. Ejecutando ${appName} en el sistema host.`;
                } catch(e) {}
            }
        }
        
        // 6.d Alarmas (v2.1)
        const alarmMatch = text.match(/alarma a las (\d+)(?: y | con )?(\d+)?|despi[eé]rtame a las (\d+)(?: y | con )?(\d+)?/);
        if (alarmMatch) {
            let hour = parseInt(alarmMatch[1] || alarmMatch[3]);
            let min = parseInt(alarmMatch[2] || alarmMatch[4] || 0);
            if (window.setAlarm) {
                window.setAlarm(hour, min);
                return `Alarma configurada. Le avisaré a las ${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}, señor.`;
            }
        }

        // 7. Agenda y Llamadas Telefónicas (Mobile Native)
        const addContactMatch = text.match(/añade a (.*) con el número (.*)|guarda el número de (.*) que es (.*)/);
        if (addContactMatch) {
            let nombre = addContactMatch[1] || addContactMatch[3];
            let numero = addContactMatch[2] || addContactMatch[4];
            if (nombre && numero) {
                nombre = nombre.trim();
                numero = numero.replace(/\s+/g, '').trim();
                this.memory.contacts[nombre] = numero;
                this.saveMemory();
                return `Contacto de ${nombre} guardado en la base de datos de telecomunicaciones con el número ${numero}.`;
            }
        }

        const callMatch = text.match(/llama a (.*)/);
        if (callMatch) {
            let nombre = callMatch[1].trim();
            if (this.memory.contacts[nombre]) {
                const numero = this.memory.contacts[nombre];
                // Ejecuta la llamada nativa usando el protocolo tel:
                window.location.href = "tel:" + numero;
                return `Abriendo el canal de comunicaciones con ${nombre}. Marcando el número ${numero}...`;
            } else {
                return `No he encontrado a ${nombre} en su agenda cifrada, señor. Diga "Añade a [nombre] con el número [número]" para registrarlo.`;
            }
        }

        // 8. NLP MEMORIA EVOLUTIVA (Búsqueda en comandos aprendidos)
        for (let customCmd in this.memory.customIntents) {
            if (text.includes(customCmd)) {
                return this.memory.customIntents[customCmd];
            }
        }

        // 8. NLP Pattern Matching difuso y estructurado
        let bestMatch = null;
        let maxScore = 0;
        const textWords = text.split(/\s+/);

        for (let intent of this.intents) {
            for (let pattern of intent.patterns) {
                // 1. Coincidencia exacta o subcadena pura (prioridad altísima)
                if (text.includes(pattern)) {
                    let score = pattern.length * 2;
                    if (score > maxScore) {
                        maxScore = score;
                        bestMatch = intent;
                    }
                } else {
                    // 2. Coincidencia Difusa Avanzada (Levenshtein) para cada palabra clave
                    let pWords = pattern.split(/\s+/);
                    if (pWords.length > 0) {
                        let matches = 0;
                        for (let w of pWords) {
                            if (w.length <= 3) {
                                // Para palabras muy cortas (ej: "de", "en", "el"), exigir coincidencia exacta
                                if (textWords.includes(w)) matches++;
                            } else {
                                // Para palabras largas, usar Levenshtein
                                let bestWordDist = 999;
                                for (let tw of textWords) {
                                    if (tw.length >= w.length - 2 && tw.length <= w.length + 2) {
                                        let dist = this.getLevenshteinDistance(w, tw);
                                        if (dist < bestWordDist) bestWordDist = dist;
                                    }
                                }
                                // Si la distancia es aceptable (por ejemplo, máx 2 errores en una palabra larga)
                                if (bestWordDist <= 2) matches++;
                            }
                        }

                        let ratio = matches / pWords.length;
                        // Si acierta al menos el 70% de la frase con pequeños errores
                        if (ratio >= 0.70) {
                            let score = pattern.length * ratio;
                            if (score > maxScore) {
                                maxScore = score;
                                bestMatch = intent;
                            }
                        }
                    }
                }
            }
        }

        if (bestMatch) {
            if (bestMatch.handler) {
                const response = await bestMatch.handler(text);
                if (response && typeof response === 'string') {
                    const prefixes = ["Enseguida. ", "Procesando. ", "Claro. ", "Por supuesto. ", "Entendido. ", ""];
                    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                    // Only add prefix if response doesn't already start with one of them to avoid redundancy
                    if (!response.startsWith("Enseguida") && !response.startsWith("Procesando") && !response.startsWith("Claro")) {
                        return prefix + response;
                    }
                    return response;
                }
                return response;
            } else if (bestMatch.responses) {
                const idx = Math.floor(Math.random() * bestMatch.responses.length);
                return bestMatch.responses[idx]();
            }
        }

        // 9. BÚSQUEDA UNIVERSAL DE CONOCIMIENTO (FALLBACK A LLM LOCAL O INTERNET)
        const ignoreWords = ['si', 'no', 'ok', 'vale', 'bien', 'jaja', 'jajaja', 'hola', 'adios', 'ay', 'oye', 'ya', 'eh', 'ah'];
        if (text.length <= 2 || ignoreWords.includes(text)) {
            const confusedResponses = [
                "No estoy segura de qué quiere decir con eso. ¿Puede ser más específico?",
                "Datos insuficientes. Reformule su orden, por favor.",
                "No he procesado esa directiva con claridad. ¿Me lo repite?",
                "Mi red neuronal necesita más contexto. ¿A qué se refiere?"
            ];
            return confusedResponses[Math.floor(Math.random() * confusedResponses.length)];
        }

        this.log("COMANDO DESCONOCIDO. INICIANDO EXTRACCIÓN GLOBAL (WIKIPEDIA)...");

        if (window.speak) window.speak("No tengo esos parámetros en local. Déjeme consultar la red global...");
        return await this.fetchGlobalData(text);
    }

    // Cámara Web en el HUD (Protocolo Vigilancia)
    async activateSurveillance() {
        try {
            const video = document.getElementById('hud-camera');
            const hudCore = document.querySelector('.hud-core');
            if (video && hudCore) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                hudCore.classList.add('camera-active');
                this.stream = stream;
                return `Protocolo de vigilancia activado. Accediendo a la matriz de cámaras locales. Tiene visual en el núcleo, ${this.getBossName()}.`;
            }
        } catch (err) {
            return "Error al conectar con la red de cámaras. Revise los permisos de seguridad óptica del navegador.";
        }
        return "El núcleo gráfico no está preparado para el feed de vídeo.";
    }

    deactivateSurveillance() {
        try {
            const video = document.getElementById('hud-camera');
            const hudCore = document.querySelector('.hud-core');
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            if (video) video.srcObject = null;
            if (hudCore) hudCore.classList.remove('camera-active');
            return "Las cámaras han sido apagadas y el flujo de datos cerrado.";
        } catch (err) {
            return "No se ha podido desactivar el feed visual.";
        }
    }

    // Módulo de Extracción Global con AbortController
    async fetchGlobalData(query) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 segundos de timeout

        try {
            this.log(`ENLAZANDO CON RED NEURONAL EXTERNA PARA: ${query.toUpperCase()}`);
            
            const systemPrompt = `Eres K.A.I.R.I. (Knowledge Artificial Intelligence & Robotic Interface), una inteligencia artificial avanzada creada por Ismael Josemaria. El usuario (tu creador) te acaba de decir: "${query}". Responde de forma muy breve (máximo 2-3 frases), directa, útil y en español. Mantén una personalidad leal, inteligente y un poco robótica al estilo J.A.R.V.I.S.`;
            const url = `https://text.pollinations.ai/${encodeURIComponent(systemPrompt)}`;

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const text = await response.text();
                if (text && text.length > 0) {
                    return text.replace(/[*_#]/g, ''); // Limpiar markdown para el TTS
                }
            }
            
            // Fallback a Búsqueda Web
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
            return `No he podido procesar eso a nivel neuronal, pero he lanzado una búsqueda en sus monitores para "${query}".`;

        } catch (error) {
            clearTimeout(timeoutId);
            return `Mi enlace neuronal externo está inactivo. No puedo acceder a la red de IA en este momento, ${this.getBossName()}.`;
        }
    }

    async fetchWikipediaData(query) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
            this.log(`BUSCANDO EN WIKIPEDIA: ${query.toUpperCase()}`);
            const url = `https://es.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1&origin=*`;

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.query && data.query.pages) {
                    const pages = data.query.pages;
                    const pageId = Object.keys(pages)[0];
                    let extract = pages[pageId].extract;

                    // Limpiar texto para TTS: quitar contenido entre paréntesis
                    extract = extract.replace(/\s*\(.*?\)\s*/g, ' ');

                    let sentences = extract.split('. ');
                    let summary = sentences.slice(0, 2).join('. ').trim();
                    if (!summary.endsWith('.')) summary += '.';

                    return `Según los archivos de Wikipedia: ${summary}`;
                }
            }
            return `No he encontrado información sobre "${query}" en Wikipedia.`;
        } catch (error) {
            clearTimeout(timeoutId);
            return `No he podido conectar con Wikipedia en este momento.`;
        }
    }

    // Módulo de Cultura General (Wikipedia Random)
    async fetchRandomFact() {
        try {
            const url = `https://es.wikipedia.org/w/api.php?action=query&format=json&generator=random&grnnamespace=0&prop=extracts&exintro=1&explaintext=1&origin=*`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                if (data.query && data.query.pages) {
                    const pages = data.query.pages;
                    const pageId = Object.keys(pages)[0];
                    const title = pages[pageId].title;
                    let extract = pages[pageId].extract;

                    if (!extract || extract.length < 50) {
                        return this.fetchRandomFact(); // Reintentar si el artículo es muy corto
                    }

                    let sentences = extract.split('. ');
                    let summary = sentences.slice(0, 2).join('. ');
                    if (!summary.endsWith('.')) summary += '.';

                    return `Cultura general activada. Sabía que en relación a "${title}": ${summary}`;
                }
            }
            return 'Los servidores de la biblioteca global no responden ahora mismo.';
        } catch (error) {
            return 'No he podido contactar con la base de datos de cultura general.';
        }
    }

    // Escaneo de Proyectos Personales Locales (File System API)
    async scanProjects() {
        if (!this.projectsHandle) {
            return `No tengo autorización de lectura para su disco duro. Para escanear sus archivos, haga doble clic en el núcleo central y seleccione la carpeta de proyectos.`;
        }
        try {
            // Verificar permisos (el navegador puede haberlos revocado)
            const perm = await this.projectsHandle.queryPermission({ mode: 'read' });
            if (perm !== 'granted') {
                return `Los permisos de seguridad han caducado. Haga doble clic en el núcleo de nuevo para reautorizar la lectura del directorio.`;
            }

            let projectNames = [];
            // Iterar sobre los archivos/carpetas dentro del directorio guardado
            for await (const entry of this.projectsHandle.values()) {
                if (entry.kind === 'directory') {
                    projectNames.push(entry.name);
                }
            }

            if (projectNames.length > 0) {
                return `He escaneado el directorio autorizado. Tienes ${projectNames.length} carpetas de proyectos: ${projectNames.join(', ')}.`;
            } else {
                return `He escaneado el directorio, pero parece estar vacío, ${this.getBossName()}.`;
            }
        } catch (e) {
            console.error('Error al leer el directorio:', e);
            return `Error de E/S. El acceso a su disco local ha sido revocado.`;
        }
    }

    // Analizador matemático avanzado
    parseMath(text) {
        let mathText = text.replace('cuánto es', '').replace('cuanto es', '').replace('calcula', '').replace('dime', '').replace('el resultado de', '').trim();
        mathText = mathText.replace(/más|mas/g, '+').replace(/menos/g, '-').replace(/por/g, '*').replace(/entre|dividido por|dividido entre/g, '/');

        const rootMatch = text.match(/raíz cuadrada de (\d+(?:\.\d+)?)|raiz cuadrada de (\d+(?:\.\d+)?)/);
        if (rootMatch) {
            const num = parseFloat(rootMatch[1] || rootMatch[2]);
            return `La raíz cuadrada de ${num} es ${Math.sqrt(num).toFixed(2)}.`;
        }

        // Permitir solo números y operadores para evitar inyección de código
        const sanitizedExpr = mathText.replace(/[^\d+\-*/().\s]/g, '');
        if (sanitizedExpr.length > 2 && /[\+\-\*\/]/.test(sanitizedExpr) && /^\s*[\d(]/.test(sanitizedExpr)) {
            try {
                // Eval seguro con solo caracteres matemáticos
                let res = eval(sanitizedExpr);
                if (res !== undefined && !isNaN(res) && res !== Infinity) {
                    res = Number.isInteger(res) ? res : res.toFixed(2);
                    return `Haciendo los cálculos de telemetría... El resultado de la operación es ${res}.`;
                }
            } catch (e) { }
        }
        return null;
    }

    getTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return `Los relojes del sistema indican que son las ${timeString}, ${this.getBossName()}.`;
    }

    getDate() {
        const now = new Date();
        const dateString = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        return `Los registros del calendario marcan que hoy es ${dateString}.`;
    }
}

window.brain = new AntigravityCore();
