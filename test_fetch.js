const fetch = require('node-fetch');

async function test() {
    const url = "https://script.google.com/macros/s/AKfycbzTebuB8WbyVI7KVbzBJ5SRVDxT6Pi6wHuAcy8lMnOPQ0Tt0MAdkfyI2VVdPMxqm08/exec?action=saveChecklist";
    const payload = {
        action: "saveChecklist",
        category: "Test",
        period: "Test",
        items: [],
        employeeName: "Test",
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'text/plain' }
        });
        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Response text:", text.substring(0, 500));
    } catch(e) {
        console.error(e);
    }
}

test();
