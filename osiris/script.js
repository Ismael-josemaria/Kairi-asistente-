let coleccion = JSON.parse(localStorage.getItem('mtg_nexus_col')) || [];
let mazos = JSON.parse(localStorage.getItem('mtg_nexus_mazos')) || { "Commander 1": [] };
let mazoActivo = localStorage.getItem('mtg_nexus_actual') || "Commander 1";
let colorFiltro = ""; // Para el filtro visual
let vistaMazoVisual = false; // Alternar entre inventario completo y solo mazo
let filtroTrade = false; // Filtro de carpeta de cambios

function guardar() {
    localStorage.setItem('mtg_nexus_col', JSON.stringify(coleccion));
    localStorage.setItem('mtg_nexus_mazos', JSON.stringify(mazos));
    localStorage.setItem('mtg_nexus_actual', mazoActivo);
}

// --- 1. LÓGICA DE API Y COLECCIÓN ---
async function buscarYAñadir() {
    const input = document.getElementById('nombreCartaInput');
    const nombre = input.value.trim();
    if (!nombre) return;

    try {
        const btn = document.querySelector('.btn-primary');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Buscando...';
        btn.disabled = true;

        const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(nombre)}`);
        const data = await response.json();

        if (data.status === 404) {
            btn.innerHTML = originalText;
            btn.disabled = false;
            return alert("Carta no encontrada. Comprueba el nombre exacto o en inglés.");
        }

        const imagenNormal = data.image_uris ? data.image_uris.normal : (data.card_faces && data.card_faces[0].image_uris ? data.card_faces[0].image_uris.normal : '');
        
        // Coger el oracle text. Si es doble cara, unir ambos textos.
        let oracleText = data.oracle_text || "";
        if (!oracleText && data.card_faces) {
            oracleText = data.card_faces.map(f => f.oracle_text).filter(Boolean).join("\n//\n");
        }

        const nuevaCarta = {
            id: data.id,
            nombre: data.name,
            imagen: imagenNormal,
            tipo: data.type_line,
            cmc: data.cmc || 0,
            precio: data.prices.usd || "0.00",
            colores: data.colors || (data.card_faces ? data.card_faces[0].colors : []) || [],
            oracle_text: oracleText,
            power: data.power || null,
            toughness: data.toughness || null,
            set_name: data.set_name || data.set.name,
            rarity: data.rarity || "common"
        };

        const existente = coleccion.find(c => c.id === nuevaCarta.id);
        if (existente) {
            // Si ya existe, solo incrementamos cantidad pero podemos actualizar datos extra
            existente.cantidad++;
            if (!existente.oracle_text) existente.oracle_text = nuevaCarta.oracle_text;
            if (!existente.set_name) existente.set_name = nuevaCarta.set_name;
            if (existente.power === undefined) existente.power = nuevaCarta.power;
            if (existente.toughness === undefined) existente.toughness = nuevaCarta.toughness;
        } else {
            nuevaCarta.cantidad = 1;
            coleccion.push(nuevaCarta);
        }

        guardar();
        aplicarFiltrosYRenderizar();
        
        input.value = "";
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        input.style.borderColor = "var(--primary)";
        setTimeout(() => input.style.borderColor = "var(--border-color)", 1000);
        
    } catch (e) {
        console.error(e);
        alert("Error conectando con Scryfall");
        document.querySelector('.btn-primary').innerHTML = '<i class="ph-bold ph-plus"></i> Añadir';
        document.querySelector('.btn-primary').disabled = false;
    }
}

function borrarDeColeccion(id) {
    const index = coleccion.findIndex(c => c.id === id);
    if (index !== -1) {
        if (coleccion[index].cantidad > 1) {
            coleccion[index].cantidad--;
        } else {
            coleccion.splice(index, 1);
        }
        
        // Debemos quitar 1 copia de los mazos si la cantidad total en colección es menor a las que hay en el mazo.
        const cantidadRestante = coleccion[index] ? coleccion[index].cantidad : 0;
        
        Object.keys(mazos).forEach(nombreMazo => {
            const mazo = mazos[nombreMazo];
            const copiasEnMazo = mazo.filter(mId => mId === id).length;
            if (copiasEnMazo > cantidadRestante) {
                // Borrar el primer id que coincida
                const indexMazo = mazo.indexOf(id);
                if(indexMazo !== -1) mazo.splice(indexMazo, 1);
            }
        });

        guardar();
        aplicarFiltrosYRenderizar();
        renderizarMazo();
    }
}

// --- 2. RENDERIZADO VISUAL ---

function renderizarInventario(cartas = coleccion) {
    const contenedor = document.getElementById('listaInventario');
    contenedor.innerHTML = '';
    
    if (cartas.length === 0) {
        contenedor.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-panel); border-radius: 12px; border: 1px dashed var(--border-color);">No hay cartas que coincidan.</div>';
        return;
    }

    cartas.forEach(c => {
        const typeSnippet = c.tipo.split('—')[0].trim(); 
        
        contenedor.innerHTML += `
            <div class="carta-card">
                <div class="carta-img-container" style="cursor: pointer;" onclick="abrirModalCarta('${c.id}')" title="Haz clic para ver detalles">
                    ${c.cantidad > 1 ? `<div class="carta-qty-badge">${c.cantidad}</div>` : ''}
                    <img src="${c.imagen}" alt="${c.nombre}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x306?text=No+Image'">
                </div>
                <div class="carta-info">
                    <div>
                        <div class="carta-title" title="${c.nombre}">${c.nombre}</div>
                        <div class="carta-type" title="${c.tipo}">${typeSnippet}</div>
                    </div>
                    <div class="carta-actions">
                        <button class="btn-card star ${c.trade ? 'active' : ''}" onclick="toggleTrade('${c.id}')" title="Marcar para cambios (Trade Binder)">
                            <i class="ph-fill ph-star"></i>
                        </button>
                        <button class="btn-card add" onclick="añadirAlMazo('${c.id}')">
                            <i class="ph-bold ph-plus"></i> Al Mazo
                        </button>
                        <button class="btn-card remove" onclick="borrarDeColeccion('${c.id}')" title="Eliminar una copia">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

// --- 2.1 MODAL DE DETALLES ---
function abrirModalCarta(id) {
    const c = coleccion.find(item => item.id === id);
    if (!c) return;

    document.getElementById('modalImg').src = c.imagen;
    document.getElementById('modalNombre').textContent = c.nombre;
    document.getElementById('modalTipo').textContent = c.tipo;
    document.getElementById('modalSet').textContent = c.set_name || "Unknown Set";
    
    const texto = document.getElementById('modalTexto');
    if (c.oracle_text) {
        texto.textContent = c.oracle_text;
        texto.style.display = 'block';
    } else {
        texto.style.display = 'none';
    }

    const pt = document.getElementById('modalPT');
    if (c.power !== null && c.power !== undefined) {
        pt.textContent = `${c.power} / ${c.toughness}`;
    } else {
        pt.textContent = "N/A";
    }

    document.getElementById('modalPrecio').textContent = `$${c.precio}`;

    document.getElementById('cartaModal').classList.add('active');
}

function cerrarModalCarta() {
    document.getElementById('cartaModal').classList.remove('active');
}

// Cerrar modal con la tecla ESC
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        cerrarModalCarta();
    }
});

// --- 3. GESTIÓN DE MAZOS ---
function crearNuevoMazo() {
    const input = document.getElementById('nombreNuevoMazo');
    const nombre = input.value.trim();
    if (nombre && !mazos[nombre]) {
        mazos[nombre] = [];
        mazoActivo = nombre;
        guardar();
        actualizarSelectores();
        renderizarMazo();
        input.value = '';
    }
}

function actualizarSelectores() {
    const sel = document.getElementById('selectorMazos');
    sel.innerHTML = '';
    Object.keys(mazos).forEach(m => {
        sel.innerHTML += `<option value="${m}" ${m === mazoActivo ? 'selected' : ''}>${m}</option>`;
    });
    document.getElementById('nombreMazoActivo').textContent = mazoActivo;
}

function cambiarMazoActivo() {
    mazoActivo = document.getElementById('selectorMazos').value;
    guardar();
    actualizarSelectores();
    renderizarMazo();
    if (vistaMazoVisual) aplicarFiltrosYRenderizar();
}

function alternarVistaMazo() {
    vistaMazoVisual = !vistaMazoVisual;
    const btn = document.getElementById('btnToggleVista');
    if (btn) {
        btn.innerHTML = vistaMazoVisual ? '<i class="ph-bold ph-list"></i>' : '<i class="ph-bold ph-grid-four"></i>';
        btn.style.color = vistaMazoVisual ? 'var(--primary)' : 'var(--text-main)';
    }
    aplicarFiltrosYRenderizar();
}

function añadirAlMazo(id) {
    const cartaEnCol = coleccion.find(c => c.id === id);
    if (!cartaEnCol) return;
    
    const copiasMaximas = cartaEnCol.cantidad;
    const enMazo = mazos[mazoActivo].filter(mId => mId === id).length;

    if (enMazo >= copiasMaximas) {
        alert("No tienes más copias de esta carta en tu colección.");
        return;
    }

    mazos[mazoActivo].push(id);
    guardar();
    renderizarMazo();
    
    const mazoPanel = document.querySelector('.deck-list-container');
    mazoPanel.style.transform = "scale(1.01)";
    mazoPanel.style.borderColor = "var(--primary)";
    setTimeout(() => {
        mazoPanel.style.transform = "scale(1)";
        mazoPanel.style.borderColor = "var(--border-color)";
    }, 200);
}

function quitarDelMazo(id) {
    const index = mazos[mazoActivo].indexOf(id);
    if(index > -1){
        mazos[mazoActivo].splice(index, 1);
        guardar();
        renderizarMazo();
    }
}

function renderizarMazo() {
    const lista = document.getElementById('listaMazo');
    const statsDiv = document.getElementById('stats-mazo');
    const contador = document.getElementById('contadorCartasMazo');
    lista.innerHTML = '';
    
    let costeTotal = 0;
    let cmcMedio = 0;
    let validCardsForCmc = 0;
    const curvaMana = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, '6+':0 };

    const mazoIds = mazos[mazoActivo];
    const mazoAgrupado = {};
    
    contador.textContent = mazoIds.length;

    let typeCounts = { Creature: 0, Instant: 0, Sorcery: 0, Artifact: 0, Enchantment: 0, Planeswalker: 0, Land: 0 };
    let colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    let rarityCounts = { mythic: 0, rare: 0, uncommon: 0, common: 0 };
    let totalPower = 0;
    let totalToughness = 0;

    mazoIds.forEach(id => {
        if(!mazoAgrupado[id]) mazoAgrupado[id] = 0;
        mazoAgrupado[id]++;
        
        const c = coleccion.find(item => item.id === id);
        if (c) {
            costeTotal += parseFloat(c.precio || 0);
            
            if (c.rarity) rarityCounts[c.rarity]++;
            else rarityCounts['common']++; // Fallback para cartas viejas
            
            if (c.power && !isNaN(parseInt(c.power))) totalPower += parseInt(c.power);
            if (c.toughness && !isNaN(parseInt(c.toughness))) totalToughness += parseInt(c.toughness);
            
            const t = c.tipo.toLowerCase();
            if(t.includes("creature")) typeCounts.Creature += 1;
            else if(t.includes("instant")) typeCounts.Instant += 1;
            else if(t.includes("sorcery")) typeCounts.Sorcery += 1;
            else if(t.includes("artifact")) typeCounts.Artifact += 1;
            else if(t.includes("enchantment")) typeCounts.Enchantment += 1;
            else if(t.includes("planeswalker")) typeCounts.Planeswalker += 1;
            else if(t.includes("land")) typeCounts.Land += 1;

            if (!t.includes("land")) {
                cmcMedio += c.cmc;
                validCardsForCmc++;
                
                if(c.cmc >= 6) curvaMana['6+']++;
                else curvaMana[Math.floor(c.cmc)]++;
            }
        }
    });

    // Render badges de tipos
    const typeDistDiv = document.getElementById('typeDistribution');
    if (typeDistDiv) {
        typeDistDiv.innerHTML = '';
        const icons = { Creature: '⚔️', Instant: '⚡', Sorcery: '🔮', Artifact: '⚙️', Enchantment: '✨', Planeswalker: '👑', Land: '⛰️' };
        Object.keys(typeCounts).forEach(k => {
            if (typeCounts[k] > 0) {
                typeDistDiv.innerHTML += `<div class="type-badge" title="${k}"><span>${typeCounts[k]}</span> ${icons[k]}</div>`;
            }
        });
    }
    
    // Commander Validator
    let isSingleton = true;
    const basicLands = ["plains", "island", "swamp", "mountain", "forest", "wastes", "snow-covered plains", "snow-covered island", "snow-covered swamp", "snow-covered mountain", "snow-covered forest"];
    
    Object.keys(mazoAgrupado).forEach(id => {
        const qty = mazoAgrupado[id];
        const c = coleccion.find(item => item.id === id);
        if (c) {
            const isBasic = basicLands.includes(c.nombre.toLowerCase());
            if (qty > 1 && !isBasic) {
                isSingleton = false;
            }
        }
    });

    const validatorDiv = document.getElementById('commanderValidator');
    if (validatorDiv) {
        if (mazoIds.length === 100 && isSingleton) {
            validatorDiv.innerHTML = `<div class="validator-badge valid"><i class="ph-bold ph-shield-check"></i> Formato Commander: Legal</div>`;
        } else {
            let reason = "";
            if (mazoIds.length !== 100) reason += `${mazoIds.length}/100 cartas. `;
            if (!isSingleton) reason += `Incumple regla Singleton.`;
            validatorDiv.innerHTML = `<div class="validator-badge invalid"><i class="ph-bold ph-warning"></i> Commander: ${reason}</div>`;
        }
    }
    
    // Contar colores basados en cantidad real agrupada
    Object.keys(mazoAgrupado).forEach(id => {
        const qty = mazoAgrupado[id];
        const c = coleccion.find(item => item.id === id);
        if (c) {
            if (c.colores && c.colores.length > 0) {
                c.colores.forEach(color => {
                    if (colorCounts[color] !== undefined) colorCounts[color] += qty;
                });
            } else {
                if (!c.tipo.toLowerCase().includes("land")) colorCounts.C += qty;
            }
        }
    });

    const colorBarDiv = document.getElementById('colorBarContainer');
    if (colorBarDiv) {
        colorBarDiv.innerHTML = '';
        const totalColors = Object.values(colorCounts).reduce((a,b) => a + b, 0);
        if (totalColors > 0) {
            Object.keys(colorCounts).forEach(color => {
                if (colorCounts[color] > 0) {
                    const pct = (colorCounts[color] / totalColors) * 100;
                    colorBarDiv.innerHTML += `<div class="color-bar-segment color-${color}" style="width: ${pct}%" title="${color}: ${pct.toFixed(1)}%"></div>`;
                }
            });
        } else {
            colorBarDiv.innerHTML = `<div style="width:100%; text-align:center; color:var(--text-muted); font-size:0.7rem; line-height:12px;">Sin color</div>`;
        }
    }

    Object.keys(mazoAgrupado).forEach(id => {
        const qty = mazoAgrupado[id];
        const c = coleccion.find(item => item.id === id);
        
        if (c) {
            lista.innerHTML += `
                <li class="deck-item">
                    <div class="item-left" style="cursor: pointer;" onclick="abrirModalCarta('${id}')" title="Ver detalles">
                        <span class="item-qty">${qty}x</span>
                        <span class="item-name">${c.nombre}</span>
                    </div>
                    <div class="card-footer">
                <button class="btn-icon" onclick="añadirAMazo('${c.id}')" title="Añadir al mazo actual"><i class="ph-bold ph-plus"></i></button>
                <button class="btn-icon" onclick="abrirShowcase('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')" title="Cambiar Arte (Showcase)"><i class="ph-bold ph-palette"></i></button>
                <button class="btn-icon" style="color: var(--accent);" onclick="borrarCarta('${c.id}')" title="Eliminar de colección"><i class="ph-bold ph-trash"></i></button>
            </div>        </div>
                </li>
            `;
        }
    });

    const avg = validCardsForCmc ? (cmcMedio / validCardsForCmc).toFixed(2) : "0.00";
    
    statsDiv.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Valor Estimado</span>
            <span class="stat-value" style="color: #10b981;">$${costeTotal.toFixed(2)}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">CMC Medio</span>
            <span class="stat-value">${avg}</span>
        </div>
        <div class="stat-item" style="grid-column: 1 / -1;">
            <span class="stat-label">Fuerza Militar (Total)</span>
            <span class="stat-value" style="color: #ef4444;">⚔️ ${totalPower} / 🛡️ ${totalToughness}</span>
        </div>
    `;

    const rarityDiv = document.getElementById('rarityStats');
    if (rarityDiv) {
        rarityDiv.innerHTML = `
            <div class="rarity-badge"><span class="rarity-val rarity-M">${rarityCounts.mythic}</span> Míticas</div>
            <div class="rarity-badge"><span class="rarity-val rarity-R">${rarityCounts.rare}</span> Raras</div>
            <div class="rarity-badge"><span class="rarity-val rarity-U">${rarityCounts.uncommon}</span> Infr.</div>
            <div class="rarity-badge"><span class="rarity-val rarity-C">${rarityCounts.common}</span> Comunes</div>
        `;
    }

    renderizarCurvaMana(curvaMana, validCardsForCmc);
}

function renderizarCurvaMana(curva, totalSpells) {
    const container = document.getElementById('manaCurveChart');
    container.innerHTML = '';
    
    if (totalSpells === 0) {
        container.innerHTML = '<div style="width:100%; text-align:center; color:var(--text-muted); font-size:0.8rem; padding-bottom: 20px;">Añade hechizos para ver la curva</div>';
        return;
    }

    const maxVal = Math.max(...Object.values(curva));
    
    Object.keys(curva).forEach(coste => {
        const count = curva[coste];
        const height = maxVal > 0 ? (count / maxVal) * 100 : 0; 
        
        container.innerHTML += `
            <div class="mana-bar-container">
                <div class="mana-bar" style="height: ${height}%" title="${count} cartas de coste ${coste}"></div>
                <span class="mana-label">${coste}</span>
            </div>
        `;
    });
}

// --- 4. FILTROS Y UTILIDADES ---
function guardar() {
    localStorage.setItem('mtg_nexus_col', JSON.stringify(coleccion));
    localStorage.setItem('mtg_nexus_mazos', JSON.stringify(mazos));
    localStorage.setItem('mtg_nexus_actual', mazoActivo);
}

function filtrarPorColor(color) {
    document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
    
    if (colorFiltro === color || color === "") {
        colorFiltro = "";
    } else {
        colorFiltro = color;
        const btns = Array.from(document.querySelectorAll('.btn-filter'));
        const index = ['W','U','B','R','G'].indexOf(color);
        if(index !== -1) btns[index].classList.add('active');
    }
    
    aplicarFiltrosYRenderizar();
}

function filtrarCartas() {
    aplicarFiltrosYRenderizar();
}

function aplicarFiltrosYRenderizar() {
    let baseColeccion = coleccion;
    
    // Si estamos en "Vista Visual del Mazo", usar solo las cartas del mazo actual
    if (vistaMazoVisual) {
        baseColeccion = [];
        const mazoIds = mazos[mazoActivo];
        const mazoAgrupado = {};
        mazoIds.forEach(id => {
            if(!mazoAgrupado[id]) mazoAgrupado[id] = 0;
            mazoAgrupado[id]++;
        });
        Object.keys(mazoAgrupado).forEach(id => {
            const c = coleccion.find(item => item.id === id);
            if (c) {
                baseColeccion.push({...c, cantidad: mazoAgrupado[id]});
            }
        });
    }

    const term = document.getElementById('buscador').value.toLowerCase();
    
    let filtradas = baseColeccion.filter(c => 
        (c.nombre.toLowerCase().includes(term) || c.tipo.toLowerCase().includes(term))
    );

    if (colorFiltro) {
        filtradas = filtradas.filter(c => c.colores && c.colores.includes(colorFiltro));
    }
    
    if (filtroTrade) {
        filtradas = filtradas.filter(c => c.trade === true);
    }
    
    // Filtro por Tipo Avanzado
    const selectorTipo = document.getElementById('selectorTipo');
    const tipoFiltro = selectorTipo ? selectorTipo.value : '';
    if (tipoFiltro) {
        filtradas = filtradas.filter(c => c.tipo.toLowerCase().includes(tipoFiltro));
    }

    // Ordenación
    const selector = document.getElementById('selectorOrden');
    const sortBy = selector ? selector.value : 'name';
    
    filtradas.sort((a, b) => {
        if (sortBy === 'cmc') {
            return (a.cmc || 0) - (b.cmc || 0);
        } else if (sortBy === 'price') {
            return parseFloat(b.precio || 0) - parseFloat(a.precio || 0);
        } else {
            return a.nombre.localeCompare(b.nombre);
        }
    });

    renderizarInventario(filtradas);
}

// --- 5. IMPORTAR Y EXPORTAR ---
function exportarColeccion() {
    const backup = {
        coleccion: coleccion,
        mazos: mazos,
        mazoActivo: mazoActivo
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `osiris_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
}

function importarColeccion(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.coleccion && data.mazos) {
                coleccion = data.coleccion;
                mazos = data.mazos;
                mazoActivo = data.mazoActivo || Object.keys(mazos)[0];
                guardar();
                actualizarSelectores();
                aplicarFiltrosYRenderizar();
                renderizarMazo();
                alert("Colección importada correctamente.");
            } else {
                alert("El archivo no tiene el formato correcto.");
            }
        } catch (error) {
            alert("Error al leer el archivo JSON.");
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset
}

// --- 6. IMPORTACIÓN MASIVA ---
function abrirModalImportacionMasiva() {
    document.getElementById('massImportText').value = '';
    document.getElementById('massImportStatus').innerHTML = '';
    document.getElementById('massImportModal').classList.add('active');
}

function cerrarModalImportacionMasiva() {
    document.getElementById('massImportModal').classList.remove('active');
}

async function procesarImportacionMasiva() {
    const text = document.getElementById('massImportText').value;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const status = document.getElementById('massImportStatus');
    const btn = document.getElementById('btnProcesarImportacion');
    
    if (lines.length === 0) return;
    
    btn.disabled = true;
    let cartasAProcesar = [];
    
    // Parsear "4x Sol Ring" o "4 Sol Ring" o "Sol Ring"
    // Soportar formato "1 Accursed Duneyard (DRC) 20" eliminando el set
    const regex = /^(\d+)x?\s+(.+)$/i;
    lines.forEach(line => {
        const match = line.match(regex);
        let qty = 1;
        let rawName = line;
        
        if (match) {
            qty = parseInt(match[1]);
            rawName = match[2].trim();
        }
        
        // Elimina el código del set y todo lo que vaya detrás: " (DRC) 20"
        let cleanName = rawName.replace(/\s+\([a-zA-Z0-9_]+\)\s*.*$/, '').trim();
        
        cartasAProcesar.push({ qty: qty, name: cleanName });
    });
    
    let identificadores = cartasAProcesar.map(c => ({ name: c.name }));
    
    try {
        status.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Solicitando a Scryfall...`;
        
        let fetchedCards = [];
        for (let i = 0; i < identificadores.length; i += 75) {
            const chunk = identificadores.slice(i, i + 75);
            const response = await fetch('https://api.scryfall.com/cards/collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifiers: chunk })
            });
            const data = await response.json();
            if (data.data) {
                fetchedCards = fetchedCards.concat(data.data);
            }
        }
        
        let agregadas = 0;
        fetchedCards.forEach((data) => {
            const requestInfo = cartasAProcesar.find(c => 
                c.name.toLowerCase() === data.name.toLowerCase() || 
                (data.printed_name && c.name.toLowerCase() === data.printed_name.toLowerCase())
            );
            const qtyToAdd = requestInfo ? requestInfo.qty : 1;
            
            const imagenNormal = data.image_uris ? data.image_uris.normal : (data.card_faces && data.card_faces[0].image_uris ? data.card_faces[0].image_uris.normal : '');
            let oracleText = data.oracle_text || "";
            if (!oracleText && data.card_faces) {
                oracleText = data.card_faces.map(f => f.oracle_text).filter(Boolean).join("\n//\n");
            }

            const nuevaCarta = {
                id: data.id,
                nombre: data.name,
                imagen: imagenNormal,
                tipo: data.type_line,
                cmc: data.cmc || 0,
                precio: data.prices?.usd || data.prices?.usd_foil || "0.00",
                colores: data.colors || (data.card_faces ? data.card_faces[0].colors : []) || [],
                oracle_text: oracleText,
                power: data.power || null,
                toughness: data.toughness || null,
                set_name: data.set_name || data.set.name,
                rarity: data.rarity || "common"
            };

            const existente = coleccion.find(c => c.id === nuevaCarta.id);
            if (existente) {
                existente.cantidad += qtyToAdd;
                if (!existente.oracle_text) existente.oracle_text = nuevaCarta.oracle_text;
            } else {
                nuevaCarta.cantidad = qtyToAdd;
                coleccion.push(nuevaCarta);
            }
            agregadas += qtyToAdd;
        });
        
        guardar();
        aplicarFiltrosYRenderizar();
        status.innerHTML = `<span style="color: #10b981"><i class="ph-bold ph-check-circle"></i> ¡Importación exitosa! (${agregadas} cartas añadidas)</span>`;
        
        setTimeout(() => {
            cerrarModalImportacionMasiva();
        }, 2000);
        
    } catch (e) {
        console.error(e);
        status.innerHTML = `<span style="color: var(--danger)"><i class="ph-bold ph-warning"></i> Error al importar</span>`;
    } finally {
        btn.disabled = false;
    }
}

// --- 7. SIMULADOR DE MANO ---
function simularMano() {
    const mazoIds = mazos[mazoActivo];
    if (mazoIds.length < 7) {
        alert("Necesitas al menos 7 cartas en el mazo para probar una mano inicial.");
        return;
    }
    
    let mazoBarajado = [...mazoIds];
    // Fisher-Yates shuffle
    for (let i = mazoBarajado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mazoBarajado[i], mazoBarajado[j]] = [mazoBarajado[j], mazoBarajado[i]];
    }
    
    const mano = mazoBarajado.slice(0, 7);
    const container = document.getElementById('handContainer');
    container.innerHTML = '';
    
    mano.forEach((id, index) => {
        const c = coleccion.find(item => item.id === id);
        if (c) {
            container.innerHTML += `
                <img src="${c.imagen}" alt="${c.nombre}" class="hand-card" style="animation-delay: ${index * 0.1}s">
            `;
        }
    });
    
    document.getElementById('handModal').classList.add('active');
}

function cerrarModalMano() {
    document.getElementById('handModal').classList.remove('active');
}

// Cerrar también con Escape
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        cerrarModalMano();
    }
});

// --- 8. RADIO OSIRIS ---
function toggleRadio() {
    const audio = document.getElementById('osirisAudio');
    const btn = document.getElementById('btnRadio');
    
    if (audio.paused) {
        audio.play();
        btn.classList.add('playing');
        btn.innerHTML = '<i class="ph-bold ph-speaker-high"></i>';
    } else {
        audio.pause();
        btn.classList.remove('playing');
        btn.innerHTML = '<i class="ph-bold ph-music-notes"></i>';
    }
}

// --- 9. COPIAR MAZO TEXTO ---
function copiarMazoTexto() {
    const mazoIds = mazos[mazoActivo];
    if (mazoIds.length === 0) {
        alert("El mazo está vacío.");
        return;
    }
    
    const mazoAgrupado = {};
    mazoIds.forEach(id => {
        if(!mazoAgrupado[id]) mazoAgrupado[id] = 0;
        mazoAgrupado[id]++;
    });
    
    let texto = "";
    Object.keys(mazoAgrupado).forEach(id => {
        const c = coleccion.find(item => item.id === id);
        if (c) {
            texto += `${mazoAgrupado[id]} ${c.nombre}\n`;
        }
    });
    
    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.querySelector('button[title="Copiar mazo como texto (Moxfield/Arena)"]');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-check" style="color:#10b981;"></i>';
            setTimeout(() => btn.innerHTML = originalHTML, 2000);
        }
    }).catch(err => {
        alert("No se pudo copiar: " + err);
    });
}

// --- 10. SPLASH SCREEN (VÓRTICE 3D) ---
function generarVorticeCartas() {
    const vortex = document.getElementById('cardsVortex');
    if (!vortex) return;
    
    // Generar 20 cartas
    for (let i = 0; i < 20; i++) {
        const card = document.createElement('div');
        card.className = 'flying-card';
        
        // Matemáticas para vuelo aleatorio en 3D
        const startX = (Math.random() * 100 - 50) + 'vw';
        const startY = (Math.random() * 100 - 50) + 'vh';
        const endX = (Math.random() * 200 - 100) + 'vw';
        const endY = (Math.random() * 200 - 100) + 'vh';
        
        const rotX = Math.random() * 360 + 'deg';
        const rotY = Math.random() * 360 + 'deg';
        const rotZ = Math.random() * 360 + 'deg';
        
        const duration = (Math.random() * 3 + 4) + 's'; // 4s a 7s
        const delay = (Math.random() * 2) + 's';
        
        card.style.setProperty('--startX', startX);
        card.style.setProperty('--startY', startY);
        card.style.setProperty('--endX', endX);
        card.style.setProperty('--endY', endY);
        card.style.setProperty('--rotX', rotX);
        card.style.setProperty('--rotY', rotY);
        card.style.setProperty('--rotZ', rotZ);
        card.style.setProperty('--duration', duration);
        card.style.setProperty('--delay', delay);
        
        vortex.appendChild(card);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    generarVorticeCartas();
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => splash.style.display = 'none', 1500);
        }
    }, 4500); // 4.5 segundos de intro épica 3D
});

// --- 11. TRADE BINDER ---
function toggleTrade(id) {
    const c = coleccion.find(item => item.id === id);
    if (c) {
        c.trade = !c.trade;
        guardar();
        aplicarFiltrosYRenderizar();
    }
}

function alternarFiltroTrade() {
    filtroTrade = !filtroTrade;
    const btn = document.getElementById('btnFiltroTrade');
    if (btn) {
        btn.style.color = filtroTrade ? '#fbbf24' : 'var(--text-main)';
        btn.style.textShadow = filtroTrade ? '0 0 10px rgba(251, 191, 36, 0.8)' : 'none';
    }
    aplicarFiltrosYRenderizar();
}

// --- 12. IMPRIMIR PROXIES ---
function imprimirMazo() {
    const mazoIds = mazos[mazoActivo];
    if (mazoIds.length === 0) {
        alert("El mazo está vacío.");
        return;
    }
    
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = '';
    
    // Para imprimir proxies, necesitamos cada copia individualmente
    mazoIds.forEach(id => {
        const c = coleccion.find(item => item.id === id);
        if (c) {
            printArea.innerHTML += `<img src="${c.imagen}" class="print-proxy">`;
        }
    });
    
    // Esperar un momento a que las imágenes se inserten en el DOM antes de imprimir
    setTimeout(() => {
        window.print();
        // Limpiar para no saturar memoria
        setTimeout(() => {
            printArea.innerHTML = '';
        }, 1000);
    }, 500);
}

// --- 13. NIVEL 8: CALCULADORA DE PROBABILIDADES ---
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

function combinacion(n, k) {
    if (k < 0 || k > n) return 0;
    return factorial(n) / (factorial(k) * factorial(n - k));
}

function hipergeometrica(N, K, n, k) {
    return (combinacion(K, k) * combinacion(N - K, n - k)) / combinacion(N, n);
}

function abrirModalProbabilidades() {
    document.getElementById('probResult').style.display = 'none';
    document.getElementById('probModal').classList.add('active');
}

function cerrarModalProb() {
    document.getElementById('probModal').classList.remove('active');
}

function calcularProbabilidad() {
    const N = parseInt(document.getElementById('probN').value) || 99;
    const K = parseInt(document.getElementById('probK').value) || 1;
    const n = parseInt(document.getElementById('probn').value) || 7;
    const k = parseInt(document.getElementById('probk_target').value) || 1;
    
    // Calcular "Al menos k copias" (1 - prob(robar menos de k))
    let prob = 0;
    for (let i = k; i <= Math.min(n, K); i++) {
        prob += hipergeometrica(N, K, n, i);
    }
    
    const div = document.getElementById('probResult');
    div.style.display = 'block';
    div.innerHTML = `Probabilidad: ${(prob * 100).toFixed(2)}%`;
}

// --- 14. NIVEL 8: COMPANION APP (VIDAS) ---
let vidasActuales = 40;

function abrirModalVidas() {
    const lbl = document.getElementById('lifeCounter');
    if (lbl) lbl.innerText = vidasActuales;
    document.getElementById('lifeModal').classList.add('active');
}

function cerrarModalVidas() {
    document.getElementById('lifeModal').classList.remove('active');
}

function modificarVida(cantidad) {
    vidasActuales += cantidad;
    document.getElementById('lifeCounter').innerText = vidasActuales;
}

function resetVidas(valor) {
    vidasActuales = valor;
    document.getElementById('lifeCounter').innerText = vidasActuales;
    cmdrDamage = { 1: 0, 2: 0, 3: 0 };
    for(let i=1; i<=3; i++) {
        const el = document.getElementById(`cmdrDmg${i}`);
        if(el) { el.innerText = '0'; el.style.color = 'var(--accent)'; }
    }
}

let cmdrDamage = { 1: 0, 2: 0, 3: 0 };

function modificarCmdr(player, qty) {
    cmdrDamage[player] += qty;
    if (cmdrDamage[player] < 0) cmdrDamage[player] = 0;
    document.getElementById(`cmdrDmg${player}`).innerText = cmdrDamage[player];
    
    if (cmdrDamage[player] >= 21) {
        document.getElementById(`cmdrDmg${player}`).style.color = '#ef4444';
        document.getElementById(`cmdrDmg${player}`).innerText += ' 💀';
    } else {
        document.getElementById(`cmdrDmg${player}`).style.color = 'var(--accent)';
    }
}

// --- 16. NIVEL 9: SIMULADOR DE MULLIGAN ---
function abrirModalMulligan() {
    document.getElementById('mulliganModal').classList.add('active');
    simularMulligan();
}

function cerrarModalMulligan() {
    document.getElementById('mulliganModal').classList.remove('active');
}

function simularMulligan() {
    const mano = document.getElementById('mulliganHand');
    mano.innerHTML = '<div style="color:var(--text-muted);"><i class="ph-bold ph-spinner ph-spin"></i> Barajando...</div>';
    
    let mazoFisico = [];
    if (mazos[mazoActivo]) {
        mazos[mazoActivo].forEach(id => {
            const c = coleccion.find(item => item.id === id);
            if (c) mazoFisico.push(c);
        });
    }
    
    if (mazoFisico.length < 7) {
        mano.innerHTML = '<div style="color:#ef4444;">Necesitas al menos 7 cartas en tu mazo.</div>';
        return;
    }
    
    // Fisher-Yates Shuffle
    for (let i = mazoFisico.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [mazoFisico[i], mazoFisico[j]] = [mazoFisico[j], mazoFisico[i]];
    }
    
    const manoInicial = mazoFisico.slice(0, 7);
    
    setTimeout(() => {
        mano.innerHTML = '';
        manoInicial.forEach(carta => {
            const div = document.createElement('div');
            div.className = 'carta'; // Hover holo
            div.style.width = '120px';
            div.style.height = '168px';
            div.innerHTML = `<img src="${carta.imagen}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;" title="${carta.nombre}">`;
            mano.appendChild(div);
        });
    }, 400);
}

// --- 17. NIVEL 9: SHOWCASE (ARTE ALTERNATIVO) ---
async function abrirShowcase(idOriginal, nombreCarta) {
    document.getElementById('showcaseModal').classList.add('active');
    const grid = document.getElementById('showcaseGrid');
    grid.innerHTML = '<div style="color:var(--text-muted); grid-column:1/-1; text-align:center; padding:2rem;"><i class="ph-bold ph-spinner ph-spin" style="font-size:2rem;"></i><p>Buscando impresiones mágicas en el Multiverso...</p></div>';
    
    try {
        const response = await fetch(`https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(nombreCarta)}"&unique=prints`);
        const data = await response.json();
        
        grid.innerHTML = '';
        if (data.data && data.data.length > 0) {
            data.data.forEach(print => {
                const imgUrl = print.image_uris ? print.image_uris.normal : (print.card_faces ? print.card_faces[0].image_uris.normal : '');
                if (!imgUrl) return;
                
                const div = document.createElement('div');
                div.style.cursor = 'pointer';
                div.style.transition = 'transform 0.2s';
                div.innerHTML = `<img src="${imgUrl}" style="width:100%; border-radius:8px; border: 2px solid ${print.id === idOriginal ? 'var(--primary)' : 'transparent'}; box-shadow:0 4px 6px rgba(0,0,0,0.3);">
                                 <div style="font-size:0.7rem; text-align:center; margin-top:0.3rem; color:var(--text-muted);">${print.set_name}</div>`;
                
                div.onclick = () => cambiarArteCarta(idOriginal, print.id, imgUrl, print.set_name);
                div.onmouseover = () => div.style.transform = 'scale(1.05)';
                div.onmouseout = () => div.style.transform = 'scale(1)';
                
                grid.appendChild(div);
            });
        }
    } catch (e) {
        grid.innerHTML = '<div style="color:#ef4444; grid-column:1/-1; text-align:center;">Error al buscar artes alternativos.</div>';
    }
}

function cerrarModalShowcase() {
    document.getElementById('showcaseModal').classList.remove('active');
}

function cambiarArteCarta(idOriginal, nuevoIdScryfall, nuevaImg, nuevoSet) {
    const carta = coleccion.find(c => c.id === idOriginal);
    if (carta) {
        carta.imagen = nuevaImg;
        carta.set_name = nuevoSet;
        carta.scryfall_id = nuevoIdScryfall; 
        
        guardar();
        aplicarFiltrosYRenderizar();
        renderizarMazo();
        cerrarModalShowcase();
    }
}

// --- 18. NIVEL 10: SIMULADOR DE SOBRES ---
function abrirModalBooster() {
    document.getElementById('boosterModal').classList.add('active');
    document.getElementById('boosterPacksGrid').innerHTML = '';
    document.getElementById('boosterStatus').innerHTML = '';
}

function cerrarModalBooster() {
    document.getElementById('boosterModal').classList.remove('active');
}

async function abrirSobreVirtual() {
    const setCode = document.getElementById('boosterSetCode').value.trim().toLowerCase();
    if (!setCode) return;
    
    const grid = document.getElementById('boosterPacksGrid');
    const status = document.getElementById('boosterStatus');
    grid.innerHTML = '';
    status.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Abriendo sobre de ' + setCode.toUpperCase() + '...';
    
    try {
        const response = await fetch(`https://api.scryfall.com/cards/search?q=set:${setCode}+is:booster`);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            status.innerHTML = 'No se encontraron cartas para esa colección.';
            return;
        }
        
        // Simular un sobre: 1 R/M, 3 U, 10 C, 1 Land
        const rares = data.data.filter(c => c.rarity === 'rare' || c.rarity === 'mythic');
        const uncommons = data.data.filter(c => c.rarity === 'uncommon');
        const commons = data.data.filter(c => c.rarity === 'common' && !c.type_line.includes('Land'));
        const lands = data.data.filter(c => c.type_line.includes('Basic Land') || (c.rarity === 'common' && c.type_line.includes('Land')));
        
        let pack = [];
        const randomCard = (arr) => arr[Math.floor(Math.random() * arr.length)];
        
        if (rares.length) pack.push(randomCard(rares));
        for(let i=0; i<3; i++) if (uncommons.length) pack.push(randomCard(uncommons));
        for(let i=0; i<10; i++) if (commons.length) pack.push(randomCard(commons));
        if (lands.length) pack.push(randomCard(lands));
        
        status.innerHTML = '';
        pack.forEach((card, index) => {
            if (!card) return;
            const imgUrl = card.image_uris ? card.image_uris.normal : (card.card_faces ? card.card_faces[0].image_uris.normal : '');
            
            const div = document.createElement('div');
            div.className = 'carta';
            div.style.width = '150px';
            div.style.height = '210px';
            div.style.opacity = '0';
            div.style.transform = 'scale(0.8) translateY(50px)';
            div.style.transition = 'all 0.5s ease';
            
            div.innerHTML = `
                <img src="${imgUrl}" style="width:100%; height:100%; border-radius:12px;">
                <button class="btn-icon" style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.8); border:1px solid var(--primary);" title="Añadir a mi colección" onclick="añadirDesdeSobre('${card.id}', '${card.name.replace(/'/g, "\\'")}', '${imgUrl}')"><i class="ph-bold ph-plus"></i></button>
            `;
            
            grid.appendChild(div);
            
            setTimeout(() => {
                div.style.opacity = '1';
                div.style.transform = 'scale(1) translateY(0)';
                if (card.rarity === 'rare' || card.rarity === 'mythic') {
                    div.style.boxShadow = '0 0 20px #eab308';
                }
            }, index * 150);
        });
        
    } catch (e) {
        status.innerHTML = 'Error de conexión o colección no válida.';
    }
}

function añadirDesdeSobre(id, nombre, imagen) {
    const existente = coleccion.find(c => c.id === id);
    if (existente) {
        existente.cantidad++;
    } else {
        coleccion.push({
            id: id,
            nombre: nombre,
            imagen: imagen,
            cantidad: 1,
            precio: "0.00",
            cmc: 0,
            rarity: "common"
        });
    }
    guardar();
    aplicarFiltrosYRenderizar();
}

// --- 16. LÓGICA DE NUEVAS PÁGINAS (STATS Y TRADE) ---
function renderStatsPage() {
    let totalCards = 0;
    let uniqueCards = coleccion.length;
    let totalValue = 0;
    
    let rarityCounts = { mythic: 0, rare: 0, uncommon: 0, common: 0 };
    let colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

    coleccion.forEach(c => {
        totalCards += c.cantidad;
        totalValue += parseFloat(c.precio || 0) * c.cantidad;
        
        // Rarezas
        if (c.rarity) {
            rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + c.cantidad;
        } else {
            rarityCounts['common'] = (rarityCounts['common'] || 0) + c.cantidad;
        }

        // Colores
        if (c.colores && c.colores.length > 0) {
            c.colores.forEach(color => {
                if (colorCounts[color] !== undefined) colorCounts[color] += c.cantidad;
            });
        } else if (!c.tipo.toLowerCase().includes("land")) {
            colorCounts.C += c.cantidad;
        }
    });

    document.getElementById('globalTotalValue').textContent = '$' + totalValue.toFixed(2);
    document.getElementById('globalTotalCards').textContent = totalCards;
    document.getElementById('globalUniqueCards').textContent = uniqueCards;
    document.getElementById('globalAvgPrice').textContent = '$' + (totalCards > 0 ? (totalValue / totalCards) : 0).toFixed(2);

    // Top 10 más valiosas
    const topExpensive = [...coleccion].sort((a, b) => parseFloat(b.precio || 0) - parseFloat(a.precio || 0)).slice(0, 10);
    const topContainer = document.getElementById('topExpensiveCards');
    topContainer.innerHTML = '';
    topExpensive.forEach((c, index) => {
        topContainer.innerHTML += `
            <li class="deck-item" style="padding: 1rem; margin-bottom: 0.5rem; background: rgba(0,0,0,0.4);">
                <div class="item-left" style="cursor: pointer; display: flex; align-items: center; gap: 1rem;" onclick="abrirModalCarta('${c.id}')">
                    <span style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">#${index + 1}</span>
                    <img src="${c.imagen}" style="width: 40px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                    <div style="display: flex; flex-direction: column;">
                        <span class="item-name" style="font-size: 1.1rem;">${c.nombre}</span>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">${c.set_name || 'Set Desconocido'}</span>
                    </div>
                </div>
                <div style="font-size: 1.2rem; font-weight: bold; color: #10b981;">
                    $${c.precio}
                </div>
            </li>
        `;
    });

    // Rarezas
    const rarityDiv = document.getElementById('globalRarityStats');
    rarityDiv.innerHTML = `
        <div class="rarity-badge" style="font-size:1.1rem; padding:0.5rem 1rem;"><span class="rarity-val rarity-M">${rarityCounts.mythic}</span> Míticas</div>
        <div class="rarity-badge" style="font-size:1.1rem; padding:0.5rem 1rem;"><span class="rarity-val rarity-R">${rarityCounts.rare}</span> Raras</div>
        <div class="rarity-badge" style="font-size:1.1rem; padding:0.5rem 1rem;"><span class="rarity-val rarity-U">${rarityCounts.uncommon}</span> Infr.</div>
        <div class="rarity-badge" style="font-size:1.1rem; padding:0.5rem 1rem;"><span class="rarity-val rarity-C">${rarityCounts.common}</span> Comunes</div>
    `;

    // Colores
    const colorBarDiv = document.getElementById('globalColorBar');
    colorBarDiv.innerHTML = '';
    const totalColors = Object.values(colorCounts).reduce((a,b) => a + b, 0);
    if (totalColors > 0) {
        Object.keys(colorCounts).forEach(color => {
            if (colorCounts[color] > 0) {
                const pct = (colorCounts[color] / totalColors) * 100;
                colorBarDiv.innerHTML += `<div class="color-bar-segment color-${color}" style="width: ${pct}%" title="${color}: ${pct.toFixed(1)}%"></div>`;
            }
        });
    }
}

function renderTradeBinderPage() {
    const tradeCards = coleccion.filter(c => c.trade === true);
    const container = document.getElementById('binderPagesContainer');
    container.innerHTML = '';

    if (tradeCards.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 3rem;">No tienes cartas marcadas para intercambio. Marca algunas con la estrella en la pestaña Colección.</div>';
        return;
    }

    // Dividir en páginas de 9 cartas
    for (let i = 0; i < tradeCards.length; i += 9) {
        const pageCards = tradeCards.slice(i, i + 9);
        const pageDiv = document.createElement('div');
        pageDiv.className = 'binder-grid';
        
        pageCards.forEach(c => {
            pageDiv.innerHTML += `
                <div class="binder-slot">
                    <div class="binder-qty-badge">${c.cantidad}</div>
                    <img src="${c.imagen}" alt="${c.nombre}" onclick="abrirModalCarta('${c.id}')">
                </div>
            `;
        });
        
        // Rellenar huecos vacíos si la página no llega a 9
        const emptySlots = 9 - pageCards.length;
        for (let j = 0; j < emptySlots; j++) {
            pageDiv.innerHTML += `<div class="binder-slot" style="background: rgba(0,0,0,0.2);"></div>`;
        }

        container.appendChild(pageDiv);
    }
}

function copiarListaTrade() {
    const tradeCards = coleccion.filter(c => c.trade === true);
    if (tradeCards.length === 0) {
        alert("No hay cartas para cambiar.");
        return;
    }

    let texto = "🔥 MIS CAMBIOS (OSIRIS) 🔥\n\n";
    let totalValue = 0;
    
    tradeCards.forEach(c => {
        texto += `${c.cantidad}x ${c.nombre} ($${c.precio})\n`;
        totalValue += parseFloat(c.precio || 0) * c.cantidad;
    });

    texto += `\nTotal Estimado: $${totalValue.toFixed(2)}`;

    navigator.clipboard.writeText(texto).then(() => {
        alert("Lista de cambios copiada al portapapeles.");
    });
}

// --- INICIO ---
document.addEventListener('DOMContentLoaded', () => {
    // Evitar splash screen en otras páginas (opcional, o mantenerlo pero ocultarlo más rápido)
    const splash = document.getElementById('splashScreen');
    if (splash && (window.location.pathname.includes('stats.html') || window.location.pathname.includes('trade.html'))) {
        splash.style.display = 'none'; // Sin splash para las páginas secundarias
    }

    if (document.getElementById('listaInventario')) {
        actualizarSelectores();
        aplicarFiltrosYRenderizar();
        renderizarMazo();
    }
    
    if (window.location.pathname.includes('stats.html')) {
        renderStatsPage();
    }
    
    if (window.location.pathname.includes('trade.html')) {
        renderTradeBinderPage();
    }
});