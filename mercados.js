document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById('markets-container');
    const loading = document.getElementById('markets-loading');
    
    const fiatContainer = document.getElementById('fiat-container');
    const fiatLoading = document.getElementById('fiat-loading');

    const ASSETS = [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
        { id: 'tether', symbol: 'USDT', name: 'Tether' },
        { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
        { id: 'solana', symbol: 'SOL', name: 'Solana' },
        { id: 'ripple', symbol: 'XRP', name: 'XRP' },
        { id: 'usd-coin', symbol: 'USDC', name: 'USDC' },
        { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
        { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
        { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' }
    ];

    const ids = ASSETS.map(a => a.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,eur&include_24hr_change=true`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('CoinGecko Rate Limit excedido.');
            }
            throw new Error('Red desconectada o error de API.');
        }
        
        const data = await response.json();
        
        loading.style.display = 'none';

        ASSETS.forEach(asset => {
            if (data[asset.id]) {
                const priceEur = data[asset.id].eur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
                const priceUsd = data[asset.id].usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                const change24h = data[asset.id].eur_24h_change;
                
                const isPositive = change24h >= 0;
                // Intensity logic for trend indicator
                const intensity = Math.abs(change24h) > 5 ? 'font-weight: 800; text-shadow: 0 0 15px currentColor;' : '';
                const changeClass = isPositive ? 'positive' : 'negative';
                const changeSymbol = isPositive ? '▲' : '▼';
                const changeText = `${changeSymbol} ${Math.abs(change24h).toFixed(2)}%`;

                const card = document.createElement('div');
                card.className = 'asset-card';
                card.innerHTML = `
                    <div class="asset-name">${asset.name} (${asset.symbol})</div>
                    <div class="asset-price">${priceEur}</div>
                    <div style="color: rgba(255,255,255,0.5); margin-bottom: 15px; font-family: monospace;">${priceUsd}</div>
                    <div class="asset-change ${changeClass}" style="${intensity}">${changeText} (24h)</div>
                `;
                container.appendChild(card);
            }
        });
    } catch (e) {
        console.error("Error sincronizando mercados cripto:", e);
        if (e.message.includes('Rate Limit')) {
            loading.innerHTML = '<span style="color:#eab308;">Advertencia: Límite de peticiones de CoinGecko excedido. Reintentando más tarde...</span>';
        } else {
            loading.innerHTML = '<span style="color:#ff3333;">Error de conexión con el satélite financiero. Red bloqueada o desconectada.</span>';
        }
        loading.style.animation = 'none';
    }

    // -- FIAT CURRENCIES --
    const FIAT_ASSETS = [
        { id: 'EUR', name: 'Euro', symbol: '€' },
        { id: 'GBP', name: 'Libra Esterlina', symbol: '£' },
        { id: 'JPY', name: 'Yen Japonés', symbol: '¥' },
        { id: 'CHF', name: 'Franco Suizo', symbol: 'Fr' },
        { id: 'AUD', name: 'Dólar Australiano', symbol: 'A$' },
        { id: 'CAD', name: 'Dólar Canadiense', symbol: 'C$' },
        { id: 'CNY', name: 'Yuan Chino', symbol: '¥' }
    ];

    try {
        const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!fiatRes.ok) throw new Error('Error al obtener datos FIAT');
        const fiatData = await fiatRes.json();
        
        fiatLoading.style.display = 'none';

        FIAT_ASSETS.forEach(fiat => {
            if (fiatData.rates[fiat.id]) {
                const rate = fiatData.rates[fiat.id];
                // Mostramos cuánto vale 1 USD en la moneda correspondiente
                // O mejor, cuánto vale 1 unidad de la moneda en USD
                const valueInUsd = (1 / rate).toFixed(4);

                const card = document.createElement('div');
                card.className = 'asset-card';
                card.innerHTML = `
                    <div class="asset-name">${fiat.name} (${fiat.id})</div>
                    <div class="asset-price" style="font-size: 2rem;">$${valueInUsd}</div>
                    <div style="color: rgba(255,255,255,0.5); margin-bottom: 15px; font-family: monospace;">1 USD = ${rate.toFixed(4)} ${fiat.symbol}</div>
                    <div class="asset-change positive">Base: USD</div>
                `;
                fiatContainer.appendChild(card);
            }
        });

    } catch (e) {
        console.error("Error sincronizando mercados FIAT:", e);
        fiatLoading.innerHTML = '<span style="color:#ff3333;">Error al obtener divisas. Red desconectada.</span>';
        fiatLoading.style.animation = 'none';
    }
});
