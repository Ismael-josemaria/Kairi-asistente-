document.addEventListener("DOMContentLoaded", () => {
    // Configurar el mapa interactivo (centrado global)
    const map = L.map('iss-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([0, 0], 2);
    
    // Capa de mapa base estilo oscuro (CartoDB Dark Matter) para dar un toque KAIRI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 10,
        noWrap: true,
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a>'
    }).addTo(map);

    // Icono personalizado holográfico
    const issIcon = L.divIcon({
        className: 'custom-iss-icon',
        html: '<div style="width: 20px; height: 20px; background: #00f3ff; border-radius: 50%; box-shadow: 0 0 15px #00f3ff, 0 0 30px #00f3ff; border: 2px solid #fff;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const marker = L.marker([0, 0], {icon: issIcon}).addTo(map);
    let isFirstLoad = true;
    
    // Trayectoria de la ISS
    let trajectoryCoords = [];
    const trajectoryLine = L.polyline([], {
        color: '#00f3ff',
        weight: 2,
        opacity: 0.6,
        dashArray: '5, 10',
        lineCap: 'round'
    }).addTo(map);

    async function updateISS() {
        try {
            const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
            const data = await res.json();
            
            const lat = data.latitude;
            const lon = data.longitude;
            const vel = Math.round(data.velocity);
            const alt = Math.round(data.altitude);

            document.getElementById('iss-lat').innerText = lat.toFixed(4);
            document.getElementById('iss-lon').innerText = lon.toFixed(4);
            document.getElementById('iss-vel').innerText = vel.toLocaleString('es-ES');
            document.getElementById('iss-alt').innerText = alt;

            marker.setLatLng([lat, lon]);
            
            // Actualizar trayectoria
            trajectoryCoords.push([lat, lon]);
            trajectoryLine.setLatLngs(trajectoryCoords);
            
            // Centrar la vista si es la primera vez o hacer pan
            if (isFirstLoad) {
                map.setView([lat, lon], 4);
                isFirstLoad = false;
            } else {
                map.panTo([lat, lon], { animate: true, duration: 1.5 });
            }
        } catch (e) {
            console.error("Error sincronizando con satélite ISS:", e);
        }
    }

    updateISS();
    setInterval(updateISS, 3000); // Actualizar cada 3 segundos
});
