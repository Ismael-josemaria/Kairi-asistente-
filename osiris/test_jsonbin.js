const fetch = require('node-fetch');

async function test() {
    try {
        const response = await fetch("https://api.jsonbin.io/v3/b/69e797e610716a4d5de5d8dd/latest", {
            headers: { "X-Master-Key": "$2a$10$l0IlDLo34EMMpKteqxypgulO9qBW/KXpmtz9wyLSAgPNe.CJvuHTC" }
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response:", text.substring(0, 200));
    } catch (e) {
        console.error(e);
    }
}

test();
