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
        { id: '20minutos', title: '20 MINUTOS', url: 'https://www.20minutos.es/rss/' },
        { id: 'eldiario', title: 'EL DIARIO', url: 'https://www.eldiario.es/rss/' },
        { id: 'rtve', title: 'RTVE NOTICIAS', url: 'https://www.rtve.es/api/noticias/rss' },
        { id: 'bbc', title: 'BBC MUNDO', url: 'https://feeds.bbci.co.uk/mundo/rss.xml' },
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
            const response = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`);
            const data = await response.json();
            
            if (data.contents) {
                const parser = new DOMParser();
                const xml = parser.parseFromString(data.contents, "text/xml");
                const items = Array.from(xml.querySelectorAll("item")).slice(0, 6);

                if (items.length > 0) {
                    gridDiv.innerHTML = ''; // Limpiar el "Cargando..."

                    items.forEach((itemNode, cardIndex) => {
                        const title = itemNode.querySelector("title") ? itemNode.querySelector("title").textContent : "Sin título";
                        const link = itemNode.querySelector("link") ? itemNode.querySelector("link").textContent : "#";
                        const descriptionRaw = itemNode.querySelector("description") ? itemNode.querySelector("description").textContent : "";
                        const pubDate = itemNode.querySelector("pubDate") ? itemNode.querySelector("pubDate").textContent : "";
                        
                        let imageUrl = 'https://via.placeholder.com/400x200/001428/00f3ff?text=K.A.I.R.I.+NEWS';
                        const enclosure = itemNode.querySelector("enclosure");
                        const mediaContent = itemNode.getElementsByTagName("media:content")[0];
                        
                        if (enclosure && enclosure.getAttribute("url")) {
                            imageUrl = enclosure.getAttribute("url");
                        } else if (mediaContent && mediaContent.getAttribute("url")) {
                            imageUrl = mediaContent.getAttribute("url");
                        } else if (descriptionRaw.match(/src=["'](.*?)["']/)) {
                            const m = descriptionRaw.match(/src=["'](.*?)["']/);
                            if (m && m[1]) imageUrl = m[1];
                        }

                        let desc = descriptionRaw.replace(/<[^>]+>/g, '').trim() || "Sin descripción disponible.";
                        if (desc.length > 120) desc = desc.substring(0, 117) + '...';
                        
                        let dateHtml = '';
                        if (pubDate) {
                            const d = new Date(pubDate);
                            if (!isNaN(d.getTime())) {
                                dateHtml = `<div style="font-size: 0.85rem; color: #a0aec0; margin-bottom: 10px; font-family: 'Share Tech Mono';"><span style="color: #00f3ff;">🕒</span> ${d.toLocaleDateString()} ${d.toLocaleTimeString()}</div>`;
                            }
                        }

                        const card = document.createElement('div');
                        card.className = 'news-card';
                        card.style.animationDelay = `${cardIndex * 0.1}s`;

                        card.innerHTML = `
                            <div class="news-image" style="background-image: url('${imageUrl}'); height: 200px;"></div>
                            <div class="news-content" style="padding: 25px;">
                                ${dateHtml}
                                <h3 class="news-title" style="font-size: 1.3rem; margin-bottom: 15px; color: #fff; line-height: 1.4;">${title}</h3>
                                <p class="news-desc" style="color: #cbd5e1; flex-grow: 1; line-height: 1.6; font-size: 0.95rem;">${desc}</p>
                                <a href="${link}" target="_blank" class="news-btn" style="margin-top: 20px; display: inline-block; text-align: center; width: 100%; padding: 12px; font-size: 1rem; letter-spacing: 2px;">LEER MÁS</a>
                            </div>
                        `;
                        gridDiv.appendChild(card);
                    });
                } else {
                    document.getElementById(`section-${source.id}`).style.display = 'none';
                }
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
