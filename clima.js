document.addEventListener("DOMContentLoaded", async () => {
    const statusEl = document.getElementById('clima-status');
    const dataEl = document.getElementById('clima-data');
    const locEl = document.getElementById('clima-location');
    const tempEl = document.getElementById('clima-temp');
    const windEl = document.getElementById('clima-wind');
    const humidityEl = document.getElementById('clima-humidity');
    const apparentEl = document.getElementById('clima-apparent');
    const windyIframe = document.getElementById('windy-iframe');

    // Mostrar SIEMPRE la estructura principal del radar para que sea "limpia y sin fallos"
    statusEl.style.display = 'none';
    dataEl.style.display = 'block';

    // Cargar mapa Windy global por defecto por si falla la IP
    const defaultLat = 40.4168; // Madrid
    const defaultLon = -3.7038;
    if (windyIframe) {
        windyIframe.src = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=4&overlay=wind&product=ecmwf&level=surface&lat=${defaultLat}&lon=${defaultLon}`;
    }

    async function loadWeather(lat, lon, locationName) {
        locEl.innerText = locationName;
        if (windyIframe) {
            windyIframe.src = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lon}`;
        }

        try {
            const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m`);
            if (weatherRes.ok) {
                const weatherData = await weatherRes.json();
                if (weatherData.current) {
                    tempEl.innerText = `${weatherData.current.temperature_2m} °C`;
                    windEl.innerText = `${weatherData.current.wind_speed_10m} km/h`;
                    if (humidityEl) humidityEl.innerText = `${weatherData.current.relative_humidity_2m} %`;
                    if (apparentEl) apparentEl.innerText = `${weatherData.current.apparent_temperature} °C`;
                }
            }
        } catch(e) {
            console.error("Error cargando el clima:", e);
        }
    }

    async function tryIPLocation() {
        try {
            const ipRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
            if (!ipRes.ok) throw new Error('API Rate Limit');
            const ipData = await ipRes.json();
            if (ipData.latitude && ipData.longitude) {
                await loadWeather(ipData.latitude, ipData.longitude, `${(ipData.city || 'Desconocido').toUpperCase()}, ${(ipData.country_name || '').toUpperCase()}`);
            } else {
                throw new Error("No IP data");
            }
        } catch (e) {
            console.warn("Fallo satélite local:", e);
            locEl.innerText = "POSICIÓN OCULTA / RADAR MUNDIAL ACTIVO";
            tempEl.innerText = "-- °C";
            windEl.innerText = "-- km/h";
            if (humidityEl) humidityEl.innerText = "-- %";
            if (apparentEl) apparentEl.innerText = "-- °C";
        }
    }

    locEl.innerText = "TRIANGULANDO POSICIÓN GPS...";
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                loadWeather(pos.coords.latitude, pos.coords.longitude, "UBICACIÓN GPS LOCALIZADA");
            },
            (err) => {
                console.warn("GPS denegado o inaccesible, usando IP...", err);
                tryIPLocation();
            },
            { timeout: 5000 }
        );
    } else {
        tryIPLocation();
    }
});
