const fetch = require('node-fetch');
(async () => {
    const res = await fetch("https://script.google.com/macros/s/AKfycbxbuZV2BW_oLpsuIVoV9oQ_bt4yWiCr1XNTBAqXP0wCwDhtc0HnooihL5hJxG-FRLQ/exec", {
        method: "POST",
        body: JSON.stringify({action: "getInitPayrollData"})
    });
    const json = await res.json();
    console.log("Logs in response:", json.data ? (json.data.logs ? json.data.logs.length : "undefined") : "no data");
})();
