document.addEventListener("DOMContentLoaded", () => {
    // 0. Persistencia Universal de Protocolos (aplica a todos los HTML que carguen nav.js)
    const savedProtocol = localStorage.getItem('KAIRI_protocol');
    if (savedProtocol && savedProtocol !== 'normal') {
        document.body.className = savedProtocol;
    }

    // SPA Router
    window.navigateModule = function(url) {
        if (window.top !== window.self) {
            window.top.loadModule(url);
        } else {
            if (typeof window.loadModule === 'function') {
                window.loadModule(url);
            } else {
                window.location.href = url;
            }
        }
    };

    // 1. Definir los enlaces del sistema
    const links = [
        { href: 'index.html', text: 'NÚCLEO PRINCIPAL' },
        { href: 'operaciones.html', text: 'ZONA OPERACIONES' },
        { href: 'tareas.html', text: 'CALENDARIO' },
        { href: 'clima.html', text: 'RADAR GLOBAL' },
        { href: 'noticias.html', text: 'CENTRO NOTICIAS' },
        { href: 'mercados.html', text: 'MERCADOS' },
        { href: 'notas.html', text: 'BÓVEDA' },
        { href: 'focus.html', text: 'FOCUS' },
        { href: 'tetris.html', text: 'SIMULADOR TÁCTICO' },
        { href: 'espacio.html', text: 'ISS TRACKER' },
        { href: 'hacker.html', text: 'TERMINAL' },
        { href: 'protocolos.html', text: 'PROTOCOLOS' }
    ];

    // Obtener la página actual
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Generar el HTML de la barra de navegación
    let navHTML = '<nav class="top-nav">';
    links.forEach(link => {
        const isActive = (currentPage === link.href) ? 'active' : '';
        navHTML += `<a href="#" onclick="window.navigateModule('${link.href}'); return false;" class="nav-btn ${isActive}">${link.text}</a>`;
    });
    navHTML += '</nav>';

    // Inyectar justo debajo del div con clase "header"
    const header = document.querySelector('.header');
    if (header) {
        if (window.top !== window.self) {
            // Si estamos dentro de un iframe (SPA), ocultamos la cabecera original
            // y no inyectamos la barra de navegación para evitar duplicados.
            header.style.display = 'none';
        } else {
            header.insertAdjacentHTML('afterend', navHTML);
            
            // Habilitar movimiento dinámico (Drag to Scroll)
            const navBar = document.querySelector('.top-nav');
            let isDown = false;
            let isDragging = false;
            let startX;
            let scrollLeft;

            navBar.style.cursor = 'grab';

            navBar.addEventListener('mousedown', (e) => {
                isDown = true;
                isDragging = false;
                navBar.style.cursor = 'grabbing';
                startX = e.pageX - navBar.offsetLeft;
                scrollLeft = navBar.scrollLeft;
            });

            navBar.addEventListener('mouseleave', () => {
                isDown = false;
                navBar.style.cursor = 'grab';
            });

            navBar.addEventListener('mouseup', () => {
                isDown = false;
                navBar.style.cursor = 'grab';
            });

            navBar.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - navBar.offsetLeft;
                const walk = (x - startX) * 2; // Factor de velocidad
                if (Math.abs(walk) > 5) isDragging = true; // Si se mueve más de 5px, es arrastre
                navBar.scrollLeft = scrollLeft - walk;
            });

            // Prevenir navegación si se suelta el clic después de arrastrar
            navBar.addEventListener('click', (e) => {
                if (isDragging) {
                    e.preventDefault();
                }
            });

            // Prevenir el drag nativo de los enlaces
            navBar.querySelectorAll('a').forEach(a => {
                a.addEventListener('dragstart', (e) => e.preventDefault());
            });
        }
    }
});
