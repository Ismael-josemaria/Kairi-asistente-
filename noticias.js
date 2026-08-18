document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('news-sections');
    const statusText = document.getElementById('status');

    if (!container) return; 

    // Múltiples fuentes de información
    const SOURCES = [
        { id: 'elpais', title: 'EL PAÍS (Actualidad)', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
        { id: 'elmundo', title: 'EL MUNDO (Actualidad)', url: 'https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml' },
        { id: 'confidencial', title: 'EL CONFIDENCIAL', url: 'https://rss.elconfidencial.com/espana/' },
        { id: 'abc', title: 'ABC (Nacional)', url: 'https://www.abc.es/rss/feeds/abc_espana.xml' },
        { id: 'marca', title: 'MARCA (Deportes)', url: 'https://e00-marca.uecdn.es/rss/portada.xml' },
        { id: 'as', title: 'AS (Deportes)', url: 'https://as.com/rss/portada.xml' },
        { id: 'vandal', title: 'VANDAL (Videojuegos)', url: 'https://vandal.elespanol.com/xml.cgi' },
        { id: 'xataka', title: 'XATAKA (Tecnología)', url: 'https://feeds.weblogssl.com/xataka2' },
        { id: 'espinof', title: 'ESPINOF (Cine y Series)', url: 'https://feeds.weblogssl.com/espinof2' },
        { id: 'motor', title: 'MOTORPASIÓN (Motor)', url: 'https://feeds.weblogssl.com/motorpasion2' },
        { id: 'mtg', title: 'MAGIC THE GATHERING', url: 'https://draftsim.com/feed/' },
        { id: 'chisme', title: 'PRENSA ROSA (¡Hola!)', url: 'https://www.hola.com/rss.xml' }
    ];

    statusText.style.display = 'none'; // Ya no necesitamos el texto global
    container.style.display = 'flex';
    container.style.flexDirection = 'column';

    // 1. CREAR TODAS LAS SECCIONES DESDE EL PRINCIPIO (Estructura visual y "Cargando")
    SOURCES.forEach((source, index) => {
        const wrapper = document.createElement('div');
        wrapper.style.order = index; // Flexbox layout ordenado
        wrapper.id = `section-${source.id}`;
        wrapper.className = 'news-section-block';
        
        wrapper.innerHTML = `
            <h2 class="source-title" style="color: #00f3ff; margin-top: 50px; margin-bottom: 20px; border-bottom: 1px solid rgba(0, 243, 255, 0.3); padding-bottom: 10px; font-size: 1.8rem; text-shadow: 0 0 10px #00f3ff;">
                ${source.title}
            </h2>
            <div id="grid-${source.id}" class="news-grid">
                <div style="color: #a0aec0; grid-column: 1 / -1; text-align: center; padding: 20px; font-size: 1.2rem; font-style: italic;">
                    <span style="display:inline-block; animation: pulse 1.5s infinite;">Sintonizando señal de satélite...</span>
                </div>
            </div>
        `;
        
        container.appendChild(wrapper);
    });

    // Función de fetch con timeout de 6 segundos
    async function fetchWithTimeout(resource, options = {}) {
        const { timeout = 6000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal  
        });
        clearTimeout(id);
        return response;
    }

    // 2. DESCARGAR Y SUSTITUIR LOS DATOS EN PARALELO (Escalonado para evitar Rate Limit)
    const fetchPromises = SOURCES.map(async (source, index) => {
        const gridDiv = document.getElementById(`grid-${source.id}`);
        
        // Esperar unos milisegundos entre cada petición para no saturar rss2json y evitar bloqueos (HTTP 429)
        await new Promise(resolve => setTimeout(resolve, index * 800));
        
        try {
            const response = await fetchWithTimeout(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`);
            const data = await response.json();

            if (data.status === 'ok' && data.items && data.items.length > 0) {
                gridDiv.innerHTML = ''; // Limpiar el "Cargando..."

                data.items.slice(0, 4).forEach((item, cardIndex) => {
                    let imageUrl = 'https://via.placeholder.com/400x200/001428/00f3ff?text=K.A.I.R.I.+NEWS';
                    if (item.enclosure && item.enclosure.link) imageUrl = item.enclosure.link;
                    else if (item.thumbnail) imageUrl = item.thumbnail;
                    else if (item.content && item.content.match(/src=["'](.*?)["']/)) {
                        const m = item.content.match(/src=["'](.*?)["']/);
                        if (m && m[1]) imageUrl = m[1];
                    } else if (item.description && item.description.match(/src=["'](.*?)["']/)) {
                        const m = item.description.match(/src=["'](.*?)["']/);
                        if (m && m[1]) imageUrl = m[1];
                    }

                    let desc = item.description ? item.description.replace(/<[^>]+>/g, '').trim() : "Sin descripción disponible.";
                    if (desc.length > 120) desc = desc.substring(0, 117) + '...';

                    const card = document.createElement('div');
                    card.className = 'news-card';
                    card.style.animationDelay = `${cardIndex * 0.1}s`;

                    card.innerHTML = `
                        <div class="news-image" style="background-image: url('${imageUrl}');"></div>
                        <div class="news-content">
                            <h3 class="news-title">${item.title}</h3>
                            <p class="news-desc">${desc}</p>
                            <a href="${item.link}" target="_blank" class="news-btn">LEER MÁS</a>
                        </div>
                    `;
                    gridDiv.appendChild(card);
                });
            } else {
                document.getElementById(`section-${source.id}`).style.display = 'none';
            }
        } catch (e) {
            console.error(`Error sintonizando ${source.title}:`, e);
            document.getElementById(`section-${source.id}`).style.display = 'none';
        }
    });

    await Promise.allSettled(fetchPromises);
});
