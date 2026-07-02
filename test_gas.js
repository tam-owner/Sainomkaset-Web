const fetch = require('node-fetch');
(async () => {
    try {
        const res = await fetch("https://script.google.com/macros/s/AKfycbxbuZV2BW_oLpsuIVoV9oQ_bt4yWiCr1XNTBAqXP0wCwDhtc0HnooihL5hJxG-FRLQ/exec", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "getInitPayrollData" })
        });
        const text = await res.text();
        if (text.includes('"logs"')) {
            console.log("LOGS IS PRESENT IN PAYLOAD");
        } else {
            console.log("LOGS IS MISSING FROM PAYLOAD");
        }
    } catch (e) {
        console.error(e);
    }
})();
