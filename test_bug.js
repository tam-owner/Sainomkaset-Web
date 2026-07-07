const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="loading-overlay"></div>
    <div id="login-view"></div>
    <div id="admin-view"></div>
    <div id="employee-view"></div>
    <div id="employee-list-container"></div>
    <select id="period-selector"><option value="h1_2026-07"></option></select>
    <select id="live-period-selector"></select>
    <div id="table-container"></div>
    <div id="salary-summary-container"></div>
    <div id="time-edit-requests-container"></div>
    <div id="time-edit-requests-badge"></div>
    <div id="live-time-edit-requests-badge"></div>
    <div id="live-employees-grid"></div>
    <div id="live-absent-grid"></div>
</body></html>`);
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = { getItem: () => "h1_2026-07", setItem: () => {} };
global.console.warn = () => {};

// Mock fetch
global.fetch = async () => ({ json: async () => ({ status: 'success' }) });

// Load app.js
eval(fs.readFileSync('js/app.js', 'utf8'));

// Provide mock data
const testData = {
    attendance: [
        { date: '2026-07-01', name: 'Test', in: '09:00', out: '18:00' }
    ],
    employees: [
        { nickname: 'Test', employeeType: 'Full time', dailyRate: 500 }
    ],
    deductions: [],
    leaves: [],
    timeEditRequests: [],
    settings: {},
    logs: [
        { date: '2026-07-01', nickname: 'Test', type: 'Work', in: '09:00', out: '18:00' }
    ]
};

try {
    applyInitData(testData, true);
    console.log("applyInitData ran successfully");
} catch (e) {
    console.error("Error in applyInitData:", e);
}
