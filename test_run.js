global.window = {};
const fs = require('fs');
eval(fs.readFileSync('js/app.js', 'utf8'));
// Mock data and DOM
global.document = {
    getElementById: () => ({ style: {}, innerHTML: '', appendChild: () => {}, classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => []
};
const testData = {
    attendance: {},
    employees: [],
    deductions: [],
    leaves: [],
    timeEditRequests: [],
    settings: {},
    logs: [
        { date: '2026-07-01', nickname: 'Test', type: 'Work', in: '09:00', out: '18:00', actualIn: '09:05', actualOut: '18:05' }
    ]
};
try {
    applyInitData(testData, true);
    console.log("applyInitData ran successfully");
} catch (e) {
    console.error("Error in applyInitData:", e);
}
