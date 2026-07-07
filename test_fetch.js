const fs = require('fs');
global.window = {};

async function run() {
    const res = await fetch("https://script.google.com/macros/s/AKfycbxCQlUS3NNQTRxqGfpZsliDTAO3oRL6u7sKQJx-OjA5a-8w-FFn9afqpjkWkElx5dQ/exec?action=init");
    const json = await res.json();
    console.log("Fetched data successfully. Attendance records:", json.attendance.length);
    console.log("Logs:", json.logs.slice(-2));
    
    // Now mock DOM and try applyInitData
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
        <div id="loading-overlay"></div>
        <div id="login-view"></div>
        <div id="admin-view"></div>
        <div id="employee-view"></div>
        <div id="employee-list-container"></div>
        <select id="period-selector"></select>
        <select id="live-period-selector"></select>
        <div id="table-container"></div>
        <div id="salary-summary-container"></div>
        <div id="time-edit-requests-container"></div>
        <div id="time-edit-requests-badge"></div>
        <div id="live-time-edit-requests-badge"></div>
    </body></html>`);
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = { getItem: () => null, setItem: () => {} };
    
    // Load app.js
    eval(fs.readFileSync('js/app.js', 'utf8'));
    
    try {
        applyInitData(json, true);
        console.log("applyInitData ran successfully");
    } catch (e) {
        console.error("Error in applyInitData:", e);
    }
}
run();
