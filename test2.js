const fs = require('fs');
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw4QuPW52ewb-04vE2E97FUKCijO959hL9cN5X7kLcyhRerPx5nVztyKQxiqSF1ZFQ/exec';

async function test() {
    const res = await fetch(`${WEB_APP_URL}?action=getInitPayrollData`);
    const json = await res.json();
    const data = json.data;
    try {
        let rawAttendance = data.attendance;
        let employees = data.employees.map(emp => {
            if (String(emp.employeeType).trim().toLowerCase() === "part time") {
                let dailyRate = Number(emp.dailyRate) || 0;
                emp.normalRate = dailyRate / 8;
                emp.otRate = emp.normalRate * 1.5;
            }
            return emp;
        });
        let deductions = data.deductions || [];
        let leaves = data.leaves || [];

        // Auto-register missing names
        let attendanceNames = new Set(rawAttendance.map(r => r.name).filter(n => n));
        let employeeNames = new Set(employees.map(e => e.name));
        let missingNames = [...attendanceNames].filter(n => !employeeNames.has(n));
        console.log("Missing:", missingNames.length);

        console.log("Success applyInitData");
    } catch(e) {
        console.error("Error inside applyInitData:", e);
    }
}
test();
