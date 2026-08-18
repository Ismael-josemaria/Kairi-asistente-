document.addEventListener("DOMContentLoaded", () => {
    // Aplicar protocolo guardado al cargar
    const savedProtocol = localStorage.getItem('kairi_protocol');
    if (savedProtocol && savedProtocol !== 'normal') {
        document.body.className = savedProtocol;
    }

    // Botones de protocolo
    document.querySelectorAll('.proto-btn[data-mode]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.getAttribute('data-mode');
            if (mode === 'normal') {
                window.parent.document.body.className = '';
                localStorage.removeItem('kairi_protocol');
            } else {
                window.parent.document.body.className = mode;
                localStorage.setItem('kairi_protocol', mode);
            }
        });
    });

    // Control de voz
    const btnSilenciar = document.getElementById('btn-silenciar');
    const btnRestaurarVoz = document.getElementById('btn-restaurar-voz');

    btnSilenciar.addEventListener('click', () => {
        window.speechSynthesis.cancel(); // Calla si está hablando
        localStorage.setItem('kairi_voice_muted', 'true');
        btnSilenciar.innerText = "VOZ SILENCIADA";
        btnSilenciar.style.borderColor = "#ff3333";
        setTimeout(() => { btnSilenciar.innerText = "SILENCIAR VOZ"; btnSilenciar.style.borderColor = ""; }, 2000);
    });

    btnRestaurarVoz.addEventListener('click', () => {
        localStorage.removeItem('kairi_voice_muted');
        btnRestaurarVoz.innerText = "VOZ RESTAURADA";
        btnRestaurarVoz.style.borderColor = "#00ff00";
        setTimeout(() => { btnRestaurarVoz.innerText = "RESTAURAR VOZ"; btnRestaurarVoz.style.borderColor = ""; }, 2000);
    });
});
