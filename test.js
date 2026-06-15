const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw4QuPW52ewb-04vE2E97FUKCijO959hL9cN5X7kLcyhRerPx5nVztyKQxiqSF1ZFQ/exec';

async function test() {
    const res = await fetch(`${WEB_APP_URL}?action=getInitPayrollData`);
    const json = await res.json();
    console.log(Object.keys(json.data));
    console.log('Attendance:', json.data.attendance ? json.data.attendance.length : 'undefined');
    console.log('Employees:', json.data.employees ? json.data.employees.length : 'undefined');
    console.log('Deductions:', json.data.deductions ? json.data.deductions.length : 'undefined');
    console.log('Leaves:', json.data.leaves ? json.data.leaves.length : 'undefined');
}
test();
