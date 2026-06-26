// native fetch
const fs = require('fs');

async function check() {
    const res = await fetch("https://script.google.com/macros/s/AKfycbxFH8YavPxZMJBeSX-zmTqQQu2dVGPpHrDeNoXD-rvjV1VV4ZVi4w6pFz1uM3TyNt0/exec?action=getScheduleData");
    const json = await res.json();
    fs.writeFileSync('api_response.json', JSON.stringify(json, null, 2));
    console.log("Saved to api_response.json");
    if(json.data && json.data.employees) {
        const tk = json.data.employees.find(e => e.name.includes("ต้นกล้า"));
        console.log("Tonkla:", tk);
    }
}
check();
