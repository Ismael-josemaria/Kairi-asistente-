document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.getElementById('ops-iframe');
    const urlBar = document.getElementById('ops-url-bar');
    const goBtn = document.getElementById('ops-go-btn');
    const backBtn = document.getElementById('ops-back-btn');
    const forwardBtn = document.getElementById('ops-forward-btn');
    const reloadBtn = document.getElementById('ops-reload-btn');
    const homeBtn = document.getElementById('ops-home-btn');
    const notesArea = document.getElementById('ops-notes');
    const ipDisplay = document.getElementById('ops-ip-display');

    // Load saved notes
    const savedNotes = localStorage.getItem('KAIRI_ops_notes');
    if (savedNotes) {
        notesArea.value = savedNotes;
    }

    // Save notes on input
    notesArea.addEventListener('input', () => {
        localStorage.setItem('KAIRI_ops_notes', notesArea.value);
    });

    // Navigation logic
    function navigateTo(url) {
        let finalUrl = url.trim();
        if (!finalUrl) return;

        // Si es una URL válida (empieza por http o tiene un punto y no tiene espacios)
        const isUrl = finalUrl.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/);
        
        if (isUrl) {
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = 'https://' + finalUrl;
            }
        } else {
            // Es una búsqueda
            finalUrl = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(finalUrl);
        }

        iframe.src = finalUrl;
        urlBar.value = finalUrl;
    }

    goBtn.addEventListener('click', () => {
        navigateTo(urlBar.value);
    });

    urlBar.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            navigateTo(urlBar.value);
        }
    });

    backBtn.addEventListener('click', () => {
        // Iframe history back is restricted by cross-origin policies. 
        // We will just do a standard fallback if allowed, or it might throw DOMException
        try {
            iframe.contentWindow.history.back();
        } catch(e) {
            console.warn("Navegación bloqueada por política cross-origin. Mostrando mensaje al usuario.");
            alert("KAIRI: La política de seguridad del sitio actual impide volver atrás desde el HUD.");
        }
    });

    forwardBtn.addEventListener('click', () => {
        try {
            iframe.contentWindow.history.forward();
        } catch(e) {
            console.warn("Navegación bloqueada por política cross-origin.");
        }
    });

    reloadBtn.addEventListener('click', () => {
        try {
            iframe.contentWindow.location.reload();
        } catch(e) {
            // Fallback for cross-origin
            iframe.src = iframe.src;
        }
    });

    homeBtn.addEventListener('click', () => {
        const homeUrl = 'https://lite.duckduckgo.com/lite/';
        iframe.src = homeUrl;
        urlBar.value = homeUrl;
    });

    // Fetch IP for network status widget
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            ipDisplay.innerText = `IP: ${data.ip}`;
        })
        .catch(err => {
            ipDisplay.innerText = 'IP: DESCONOCIDA';
        });
});
