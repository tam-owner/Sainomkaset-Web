const fetch = require('node-fetch');

async function test() {
    console.time("Fetch time");
    const url = "https://script.google.com/macros/s/AKfycbzdHLBywL2l8abj8ZcV8eZWI1XQtA4snkrJqXD0YVZcKGK1XIVefO70es5ssNTOPOo/exec?action=getInitPayrollData";
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        console.timeEnd("Fetch time");
        console.log("Status:", response.status);
        console.log("Response starts with:", text.substring(0, 100));
    } catch(e) {
        console.error(e);
    }
}

test();
