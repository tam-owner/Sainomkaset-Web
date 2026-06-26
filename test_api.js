const https = require('https');

const API_URL = "https://script.google.com/macros/s/AKfycbxFH8YavPxZMJBeSX-zmTqQQu2dVGPpHrDeNoXD-rvjV1VV4ZVi4w6pFz1uM3TyNt0/exec?action=getScheduleData";

https.get(API_URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            if(parsed.data && parsed.data.employees) {
                const tk = parsed.data.employees.find(e => e.name.includes("ต้นกล้า"));
                console.log("Tonkla API data:", tk);
            } else {
                console.log("No employees array found");
            }
        } catch(e) {
            console.log("Error parsing JSON:", e.message);
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
