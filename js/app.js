const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzJFpGK_K-d8jkce0gacRlwCG8xWHKwXGtPgS5Rfh8lss_1iCzFxlyDFSLTAWqzkvQ/exec';

let rawAttendance = [];
let employees = [];
let deductions = [];

let processedAttendance = [];
let availablePeriods = [];
let currentPeriodVal = '';
let loggedInEmployee = null; // Object if employee, or string "ADMIN"
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    // Check session storage first
    const savedUser = sessionStorage.getItem('snk_payroll_user');
    if (savedUser) {
        if (savedUser === "ADMIN") {
            isAdmin = true;
            loggedInEmployee = "ADMIN";
        } else {
            loggedInEmployee = JSON.parse(savedUser);
            isAdmin = false;
        }
    }
    initData();
});

async function initData() {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    // Check local storage for cached data
    const cachedStr = localStorage.getItem('snk_payroll_data');
    if (cachedStr) {
        try {
            const cachedJson = JSON.parse(cachedStr);
            if (cachedJson.status === "success") {
                applyInitData(cachedJson.data);
                // Hide overlay immediately since we have cached data
                if (!isAdmin && !loggedInEmployee) {
                    overlay.classList.add('hidden');
                }
                // Fetch fresh data in the background silently
                fetchFreshDataSilently();
                return;
            }
        } catch(e) {
            console.error("Cache parsing error", e);
        }
    }
    
    // No cache or cache error, do a normal fetch with loading screen
    overlay.classList.remove('hidden');
    loadingText.innerText = "กำลังเชื่อมต่อระบบ...";
    try {
        const res = await fetch(`${WEB_APP_URL}?action=getInitPayrollData`);
        const json = await res.json();
        if (json.status === "success") {
            localStorage.setItem('snk_payroll_data', JSON.stringify(json));
            applyInitData(json.data);
        } else {
            overlay.classList.add('hidden');
        }
    } catch (e) {
        console.error(e);
        alert("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
        overlay.classList.add('hidden');
    }
}

async function fetchFreshDataSilently() {
    try {
        const res = await fetch(`${WEB_APP_URL}?action=getInitPayrollData`);
        const json = await res.json();
        if (json.status === "success") {
            localStorage.setItem('snk_payroll_data', JSON.stringify(json));
            applyInitData(json.data); // Update with fresh data
        }
    } catch (e) {
        console.error("Silent fetch error", e);
    }
}

function applyInitData(data) {
    const overlay = document.getElementById('loading-overlay');
    rawAttendance = data.attendance;
    employees = data.employees.map(emp => {
        if (String(emp.employeeType).trim().toLowerCase() === "part time") {
            let dailyRate = Number(emp.dailyRate) || 0;
            emp.normalRate = dailyRate / 8;
            emp.otRate = emp.normalRate * 1.5;
        }
        return emp;
    });
    deductions = data.deductions;

    // Auto-register missing names
    let attendanceNames = new Set(rawAttendance.map(r => r.name).filter(n => n));
    let employeeNames = new Set(employees.map(e => e.name));
    let missingNames = [...attendanceNames].filter(n => !employeeNames.has(n));

    if (missingNames.length > 0) {
        missingNames.forEach(name => {
            employees.push({ name: name, pin: "1234", normalRate: 46.88, otRate: 8.79, deductionType: "3%" });
        });
        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "autoRegister", names: missingNames })
        }).catch(e => console.error("Auto register error", e));
    }

    processData();
    
    // Remember current selection if any
    const select = document.getElementById('login-name');
    const currentSelection = select ? select.value : "";
    populateLoginNames();
    if (currentSelection && select) select.value = currentSelection;
    
    if (isAdmin) {
        showAdminDashboard();
    } else if (loggedInEmployee) {
        const updatedEmp = employees.find(e => e.name === loggedInEmployee.name);
        if (updatedEmp) {
            loggedInEmployee = updatedEmp;
            showEmployeeDashboard();
        } else {
            logout();
        }
    } else {
        overlay.classList.add('hidden');
    }
}

function processData() {
    const recordsByDayAndName = {};

    rawAttendance.forEach(r => {
        if (!r.timestamp || !r.name || !r.type) return;
        
        let timestampStr = String(r.timestamp).trim();
        let d;
        const dtMatch = timestampStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/);
        if (dtMatch) {
            let day = dtMatch[1].padStart(2, '0');
            let month = dtMatch[2].padStart(2, '0');
            let year = dtMatch[3];
            let time = dtMatch[4] || '00:00:00';
            d = new Date(`${year}-${month}-${day}T${time}`);
        } else {
            d = new Date(timestampStr);
        }
        if (isNaN(d.getTime())) return;
        
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        if (!recordsByDayAndName[dateStr]) recordsByDayAndName[dateStr] = {};
        if (!recordsByDayAndName[dateStr][r.name]) recordsByDayAndName[dateStr][r.name] = { name: r.name, date: dateStr, dateObj: d };
        
        const rec = recordsByDayAndName[dateStr][r.name];
        if (r.type === 'เข้า') {
            rec.inTime = d;
            rec.scheduledIn = r.scheduledTime;
            rec.noteIn = r.note;
        } else if (r.type === 'ออก') {
            rec.outTime = d;
            rec.scheduledOut = r.scheduledTime;
            rec.noteOut = r.note;
        }
    });

    const result = [];
    Object.values(recordsByDayAndName).forEach(dayObj => {
        Object.values(dayObj).forEach(rec => {
            if (rec.inTime && rec.outTime) {
                let breakTime = 1;
                if (rec.scheduledIn && rec.scheduledIn.includes('18:00')) breakTime = 0;
                
                let regularHours = 0;
                let otHours = 0;
                
                if (rec.scheduledIn && rec.scheduledIn !== '-' && rec.scheduledOut && rec.scheduledOut !== '-') {
                    let inParts = rec.scheduledIn.split(':');
                    let outParts = rec.scheduledOut.split(':');
                    if (inParts.length > 1 && outParts.length > 1) {
                        let inMins = parseInt(inParts[0], 10) * 60 + parseInt(inParts[1], 10);
                        let outMins = parseInt(outParts[0], 10) * 60 + parseInt(outParts[1], 10);
                        if (outMins < inMins) outMins += 24 * 60;
                        let workHours = (outMins - inMins) / 60 - breakTime;
                        if (workHours < 0) workHours = 0;
                        regularHours = Math.min(workHours, 8);
                        otHours = Math.max(0, workHours - 8);
                    }
                }
                
                rec.regularHours = regularHours;
                rec.otHours = otHours;
                rec.breakTime = breakTime;
                
                rec.isLate = false;
                rec.lateMins = 0;
                rec.lateDeduction = 0;
                
                if (rec.scheduledIn && rec.scheduledIn !== '-') {
                    let sch = rec.scheduledIn.split(':');
                    let act = [rec.inTime.getHours(), rec.inTime.getMinutes()];
                    if (sch.length > 1) {
                        let schMins = parseInt(sch[0], 10)*60 + parseInt(sch[1], 10);
                        let actMins = act[0]*60 + act[1];
                        if (actMins - schMins > 0) {
                            let lateMins = actMins - schMins;
                            let threshold = (rec.scheduledIn === '11:30') ? 10 : 30;
                            if (lateMins > threshold) {
                                rec.isLate = true;
                                rec.lateMins = lateMins;
                                rec.lateDeduction = 1.0 + Math.floor(lateMins / 30) * 0.5;
                                rec.regularHours -= rec.lateDeduction;
                                if (rec.regularHours < 0) rec.regularHours = 0;
                            }
                        }
                    }
                }
            } else {
                rec.regularHours = 0;
                rec.otHours = 0;
            }
            result.push(rec);
        });
    });

    processedAttendance = result.sort((a,b) => a.dateObj - b.dateObj);
}

function populateLoginNames() {
    const select = document.getElementById('login-name');
    select.innerHTML = '<option value="" selected disabled>- กรุณาเลือกชื่อ -</option>';
    
    const activeEmployees = employees; // Simplified, show all employees

    const sortedEmp = activeEmployees.sort((a, b) => a.name.localeCompare(b.name, 'th'));
    sortedEmp.forEach(emp => {
        let opt = document.createElement('option');
        opt.value = emp.name;
        opt.text = emp.name;
        select.appendChild(opt);
    });

    let adminOpt = document.createElement('option');
    adminOpt.value = "ADMIN";
    adminOpt.text = "--- ผู้ดูแลระบบ (Admin) ---";
    adminOpt.className = "font-bold text-indigo-600";
    select.appendChild(adminOpt);
}

// ----------------------------------------------------
// Authentication Logic
// ----------------------------------------------------
function handleLogin() {
    const name = document.getElementById('login-name').value;
    const pin = document.getElementById('login-pin').value;
    
    if (!name || !pin) {
        alert("กรุณาเลือกชื่อและใส่รหัสผ่าน");
        return;
    }

    if (name === "ADMIN") {
        if (pin === "9999") { // Default Admin PIN
            isAdmin = true;
            loggedInEmployee = "ADMIN";
            sessionStorage.setItem('snk_payroll_user', "ADMIN");
            document.getElementById('login-pin').value = '';
            showAdminDashboard();
        } else {
            alert("รหัสผ่านแอดมินไม่ถูกต้อง");
            document.getElementById('login-pin').value = '';
        }
        return;
    }

    const emp = employees.find(e => e.name === name);
    if (!emp) {
        alert("ไม่พบข้อมูลพนักงานในระบบ");
        return;
    }

    if (emp.pin === pin) {
        isAdmin = false;
        loggedInEmployee = emp;
        sessionStorage.setItem('snk_payroll_user', JSON.stringify(emp));
        document.getElementById('login-pin').value = '';
        showEmployeeDashboard();
    } else {
        alert("รหัสผ่านไม่ถูกต้อง");
        document.getElementById('login-pin').value = '';
    }
}

function logout() {
    loggedInEmployee = null;
    isAdmin = false;
    sessionStorage.removeItem('snk_payroll_user');
    
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-employee').classList.add('hidden');
    document.getElementById('view-admin-dashboard').classList.add('hidden');
    document.getElementById('view-admin-employees').classList.add('hidden');
}

// ----------------------------------------------------
// Views Routing
// ----------------------------------------------------
function showEmployeeDashboard() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-employee').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('hidden');
    
    document.getElementById('emp-user-name').innerHTML = `${loggedInEmployee.name} ${loggedInEmployee.fullName ? `<span class="text-xs font-semibold text-slate-500 ml-1 truncate">${loggedInEmployee.fullName}</span>` : ''}`;
    document.getElementById('emp-user-initial').innerText = loggedInEmployee.name.charAt(0);
    
    setupPeriods();
    
    if (availablePeriods.length > 0) {
        selectPeriod(availablePeriods[0].value, availablePeriods[0].text);
    } else {
        document.getElementById('period-btn-text').innerText = '- ไม่พบข้อมูล -';
        document.getElementById('salary-summary-container').innerHTML = '';
        document.getElementById('table-container').innerHTML = '<div class="text-center py-8 text-slate-400 font-bold text-sm">ไม่พบข้อมูลเวลาเข้า-ออกงาน</div>';
    }
}

function showAdminDashboard() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-admin-dashboard').classList.remove('hidden');
    document.getElementById('view-admin-employees').classList.add('hidden');
    document.getElementById('loading-overlay').classList.add('hidden');

    setupPeriods();

    if (availablePeriods.length > 0) {
        selectPeriod(availablePeriods[0].value, availablePeriods[0].text);
    } else {
        document.getElementById('admin-period-btn-text').innerText = "- ไม่พบข้อมูล -";
    }
}

function showAdminEmployees() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-admin-dashboard').classList.add('hidden');
    document.getElementById('view-admin-employees').classList.remove('hidden');
    
    document.getElementById('emp-setup-count').innerText = employees.length;
    renderAdminEmployees();
}

// ----------------------------------------------------
// Period Selection & Rendering (Shared)
// ----------------------------------------------------
function setupPeriods() {
    const periodsSet = new Set();
    const monthsSet = new Set();
    processedAttendance.forEach(r => {
        // Admin sees all periods, Employee sees only theirs
        if (!isAdmin && r.name !== loggedInEmployee.name) return;
        
        const d = r.dateObj;
        const mStr = `${d.getFullYear()}-${d.getMonth()}`;
        monthsSet.add(mStr);
        if (d.getDate() <= 15) {
            periodsSet.add(`h1_${mStr}`);
        } else {
            periodsSet.add(`h2_${mStr}`);
        }
    });
    
    const sortedMonths = Array.from(monthsSet).sort().reverse();
    const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    
    availablePeriods = [];
    sortedMonths.forEach(mStr => {
        let [y, m] = mStr.split('-').map(Number);
        let mName = monthNames[m];
        let yThai = y + 543;
        let lastDay = new Date(y, m + 1, 0).getDate();
        
        availablePeriods.push({ value: `all_${mStr}`, text: `1-${lastDay} ${mName} ${yThai}` });
        if (periodsSet.has(`h1_${mStr}`)) {
            availablePeriods.push({ value: `h1_${mStr}`, text: `1-15 ${mName} ${yThai}` });
        }
        if (periodsSet.has(`h2_${mStr}`)) {
            availablePeriods.push({ value: `h2_${mStr}`, text: `16-${lastDay} ${mName} ${yThai}` });
        }
    });

    renderPeriodDropdown();
}

function renderPeriodDropdown() {
    const list = document.getElementById('period-dropdown-list');
    let html = '';
    if (availablePeriods.length === 0) {
        html = '<div class="text-center py-4 text-slate-500 font-bold text-sm">ไม่พบข้อมูลในระบบ</div>';
    } else {
        availablePeriods.forEach(p => {
            let isSel = (p.value === currentPeriodVal);
            let bg = isSel ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100';
            let txt = isSel ? 'text-indigo-700 font-bold' : 'text-slate-700 font-semibold';
            
            html += `<div onclick="selectPeriod('${p.value}', '${p.text}')" class="cursor-pointer ${bg} ${txt} p-4 mb-2 rounded-xl border flex items-center justify-between active:scale-95 transition-all">
                        <span>${p.text}</span>
                        ${isSel ? '<svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
                     </div>`;
        });
    }
    list.innerHTML = html;
}

function togglePeriodDropdown() {
    const overlay = document.getElementById('period-dropdown-overlay');
    const sheet = document.getElementById('period-dropdown');
    if (overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
    } else {
        sheet.classList.add('translate-y-full');
        setTimeout(() => overlay.classList.add('opacity-0', 'pointer-events-none', 'hidden'), 300);
    }
}

function selectPeriod(val, text) {
    currentPeriodVal = val;
    document.getElementById('period-select').value = val;
    
    if (isAdmin) {
        document.getElementById('admin-period-btn-text').innerText = text;
        renderAdminSummary();
    } else {
        document.getElementById('period-btn-text').innerText = text;
        renderEmployeeDashboard();
    }
    renderPeriodDropdown();
    togglePeriodDropdown();
}

// ----------------------------------------------------
// Employee Dashboard Logic
// ----------------------------------------------------
function renderEmployeeDashboard() {
    if (!loggedInEmployee || !currentPeriodVal) return;

    let parts = currentPeriodVal.split('_');
    let type = parts[0];
    let mStr = parts[1];

    let myRecords = [];
    let totalNormalHours = 0;
    let totalOTHours = 0;

    processedAttendance.forEach(r => {
        if (r.name !== loggedInEmployee.name) return;

        const d = r.dateObj;
        const rMstr = `${d.getFullYear()}-${d.getMonth()}`;
        if (rMstr !== mStr) return;
        if (type === 'h1' && d.getDate() > 15) return;
        if (type === 'h2' && d.getDate() < 16) return;

        myRecords.push(r);
        totalNormalHours += r.regularHours || 0;
        totalOTHours += r.otHours || 0;
    });

    let normalPay = totalNormalHours * loggedInEmployee.normalRate;
    let otPay = totalOTHours * loggedInEmployee.otRate;
    let grossPay = normalPay + otPay;
    
    let myDeductions = deductions.filter(d => d.period === currentPeriodVal && d.name === loggedInEmployee.name);
    let customDeductTotal = myDeductions.reduce((sum, d) => sum + d.amount, 0);

    let payBeforeTax = grossPay - customDeductTotal;

    let standardDeduct = 0;
    let deductLabel = '';
    let dedType = String(loggedInEmployee.deductionType).trim();
    if (dedType === "3%" || dedType === "0.03") {
        standardDeduct = payBeforeTax * 0.03;
        deductLabel = "หัก ณ ที่จ่าย 3%";
    } else if (dedType === "5%" || dedType === "0.05") {
        standardDeduct = payBeforeTax * 0.05;
        deductLabel = "ประกันสังคม 5%";
    }

    let netPay = payBeforeTax - standardDeduct;

    let formatCurrency = (val) => Number(val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    let summaryHtml = `
    <div class="relative">
        <!-- Header -->
        <div class="bg-[#0fa981] text-white px-5 py-4 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span class="font-bold text-sm tracking-widest">สลิปเงินเดือน (PAYSLIP)</span>
            </div>
        </div>

        <div class="p-5">
            <!-- Summary Top -->
            <div class="flex justify-between items-end border-b-2 border-dashed border-emerald-100 pb-4 mb-4">
                <div>
                    <p class="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-1">ชื่อพนักงาน</p>
                    <p class="text-2xl font-black text-slate-800 leading-none drop-shadow-sm">${loggedInEmployee.name} ${loggedInEmployee.fullName ? `<span class="text-sm font-semibold text-slate-400 ml-1 tracking-tight">${loggedInEmployee.fullName}</span>` : ''}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">เรตรายวัน</p>
                    <p class="text-lg font-black text-emerald-600 leading-none bg-emerald-50 px-2 py-1 rounded-md">฿${formatCurrency(loggedInEmployee.dailyRate)}</p>
                </div>
            </div>

            <!-- Detailed Breakdown -->
            <div class="space-y-3">
                
                <!-- Normal Pay -->
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-white rounded-xl border border-emerald-100/50 shadow-sm transition-all hover:shadow-md">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-700">ค่าแรงชั่วโมงปกติ</p>
                            <p class="text-xs font-medium text-emerald-600/80">${totalNormalHours.toFixed(1)} ชม. x ฿${formatCurrency(loggedInEmployee.normalRate)}</p>
                        </div>
                    </div>
                    <div class="text-right font-black text-slate-800 text-lg">
                        <span class="text-emerald-500 mr-1">+</span>฿${formatCurrency(normalPay)}
                    </div>
                </div>

                <!-- OT Pay -->
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-white rounded-xl border border-orange-100/50 shadow-sm transition-all hover:shadow-md">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 shadow-inner">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-700">ค่าแรงชั่วโมง OT</p>
                            <p class="text-xs font-medium text-orange-500/80">${totalOTHours.toFixed(1)} ชม. x ฿${formatCurrency(loggedInEmployee.otRate)}</p>
                        </div>
                    </div>
                    <div class="text-right font-black text-slate-800 text-lg">
                        <span class="text-orange-500 mr-1">+</span>฿${formatCurrency(otPay)}
                    </div>
                </div>

                <!-- Deductions -->
                ${customDeductTotal > 0 ? `
                <div class="flex justify-between items-start p-3 bg-gradient-to-r from-rose-50 to-white rounded-xl border border-rose-100 shadow-sm">
                    <div class="flex items-start gap-3">
                        <div class="w-9 h-9 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 shadow-inner mt-0.5">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                        </div>
                        <div>
                            <p class="text-sm font-bold text-rose-700">รายการหักออก</p>
                            <div class="text-xs font-medium text-rose-500/80 mt-1 space-y-0.5">
                                ${myDeductions.map(d => `<p class="flex items-center gap-1"><span class="w-1 h-1 rounded-full bg-rose-300"></span> ${d.reason} (฿${formatCurrency(d.amount)})</p>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="text-right font-black text-rose-600 pt-1 shrink-0 text-lg">
                        <span class="mr-1">-</span>฿${formatCurrency(customDeductTotal)}
                    </div>
                </div>
                ` : ''}

            </div>

            <!-- Totals Divider -->
            <div class="my-6 relative">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t-2 border-dashed border-emerald-100"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-white text-emerald-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                    </span>
                </div>
            </div>

            <!-- Subtotal -->
            <div class="flex justify-between items-center px-2 mb-2">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">รวมค่าแรงปกติ + OT - หักออก</span>
                <span class="text-sm font-black text-slate-700">฿${formatCurrency(payBeforeTax)}</span>
            </div>

            <!-- Tax / Social Security -->
            ${standardDeduct > 0 ? `
            <div class="flex justify-between items-center px-2 mb-4 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/50">
                <span class="text-[11px] font-bold text-rose-500">${deductLabel} (ยอด ฿${formatCurrency(payBeforeTax)})</span>
                <span class="text-sm font-black text-rose-600">- ฿${formatCurrency(standardDeduct)}</span>
            </div>
            ` : ''}

            <!-- Net Pay (Grand Total) -->
            <div class="bg-[#0fa981] rounded-[20px] p-5 flex justify-between items-center shadow-lg shadow-emerald-600/30 mt-4 relative overflow-hidden">
                <div class="relative z-10">
                    <p class="text-[11px] font-black text-emerald-50 uppercase tracking-widest">รวมรายได้สุทธิ</p>
                    <p class="text-[10px] text-emerald-100 mt-1 font-medium">รับจริงหลังหักทั้งหมด (Net Pay)</p>
                </div>
                <div class="text-3xl font-black text-white tracking-tight relative z-10 flex items-baseline">
                    <span class="text-lg text-emerald-200 mr-1.5 font-bold">฿</span>${formatCurrency(netPay)}
                </div>
            </div>
            
            ${loggedInEmployee.bankAccount ? `
            <div class="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-100/50 py-2.5 rounded-xl">
                <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                โอนเข้าบัญชี: <span class="text-emerald-800 text-xs">${loggedInEmployee.bankAccount}</span>
            </div>
            ` : ''}

        </div>
    </div>`;

    document.getElementById('salary-summary-container').innerHTML = summaryHtml;

    function formatTime(dateObj) {
        if (!dateObj) return '-';
        const h = String(dateObj.getHours()).padStart(2, '0');
        const m = String(dateObj.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }

    let tableHtml = '';
    myRecords.forEach((row, i) => {
        let bgColor = (i % 2 === 0) ? 'bg-white' : 'bg-slate-50';
        
        let schedInTextColor = row.noteIn ? 'text-amber-500' : 'text-slate-800';
        let schedInClass = `font-black text-[13px] ${schedInTextColor} ${row.noteIn ? 'cursor-pointer active:scale-90 inline-block transition-transform' : ''}`.trim();
        let inClick = row.noteIn ? `data-note="${(row.noteIn||'').replace(/"/g, '&quot;')}" onclick="showNoteTooltip(event)"` : '';

        let schedOutTextColor = row.noteOut ? 'text-amber-500' : 'text-slate-800';
        let schedOutClass = `font-black text-[13px] ${schedOutTextColor} ${row.noteOut ? 'cursor-pointer active:scale-90 inline-block transition-transform' : ''}`.trim();
        let outClick = row.noteOut ? `data-note="${(row.noteOut||'').replace(/"/g, '&quot;')}" onclick="showNoteTooltip(event)"` : '';

        let inClass = `scan-time-text text-[11px] font-medium mt-1 ${row.isLate ? 'text-red-500' : 'text-slate-500'}`;
        let outClass = `scan-time-text text-[11px] font-medium mt-1 text-slate-500`;
        
        const d = row.dateObj;
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth()+1).padStart(2, '0');
        const yearNum = d.getFullYear().toString().substr(-2);
        const shortDateStr = `${dayNum}/${monthNum}/${yearNum}`;
        const dayStr = d.toLocaleDateString('th-TH', { weekday: 'long' });

        let inStr = formatTime(row.inTime);
        if (inStr === '-') inStr = '';
        let outStr = formatTime(row.outTime);
        if (outStr === '-') outStr = '';
        const schedInStr = row.scheduledIn && row.scheduledIn !== '-' ? row.scheduledIn : '';
        const schedOutStr = row.scheduledOut && row.scheduledOut !== '-' ? row.scheduledOut : '';

        const hasMissing = (!row.inTime || !row.outTime);

        tableHtml += `
        <div class="data-row px-1 py-3 ${bgColor} ${hasMissing ? 'border-l-4 border-red-500' : ''}">
            <div class="table-grid text-[13px]">
                <div class="flex flex-col text-left pl-1 justify-start">
                    <span class="font-black text-[13px] text-indigo-900 leading-tight date-text">${shortDateStr}</span>
                    <span class="text-[11px] text-slate-500 font-medium leading-tight day-text mt-1">${dayStr}</span>
                    ${row.isLate ? `<span class="text-[10px] font-normal text-red-500 leading-tight late-text mt-0.5">สาย ${row.lateMins} น. ${row.lateDeduction > 0 ? `(-${row.lateDeduction} ชม)` : ''}</span>` : ''}
                </div>
                
                <div class="text-center flex flex-col items-center justify-start">
                    <span class="${schedInClass}" ${inClick}>${schedInStr}</span>
                    <span class="${inClass}">${inStr}</span>
                </div>
                
                <div class="text-center flex flex-col items-center justify-start">
                    <span class="${schedOutClass}" ${outClick}>${schedOutStr}</span>
                    <span class="${outClass}">${outStr}</span>
                </div>
                
                <div class="text-center flex flex-col items-center justify-start pt-[2px]">
                    <span class="text-slate-600 font-medium">${row.breakTime || ''}</span>
                </div>
                
                <div class="text-center flex flex-col items-center justify-start font-black pt-[1px] ${row.regularHours > 0 ? 'text-blue-600' : 'text-slate-400'}">${row.regularHours > 0 ? row.regularHours.toFixed(1) : ''}</div>
                
                <div class="text-center flex flex-col items-center justify-start font-black pt-[1px] ${row.otHours > 0 ? 'text-orange-500' : 'text-slate-400'}">${row.otHours > 0 ? row.otHours.toFixed(1) : ''}</div>
            </div>
            ${(row.noteIn || row.noteOut) ? `
            <div class="remark-box mt-2 text-[11px] text-yellow-800 bg-yellow-50 p-2.5 rounded-lg border border-yellow-200 mx-1 shadow-sm">
                ${row.noteIn ? `<div><b class="text-yellow-600">หมายเหตุเข้า:</b> ${row.noteIn}</div>` : ''}
                ${row.noteOut ? `<div class="${row.noteIn?'mt-1':''}"><b class="text-yellow-600">หมายเหตุออก:</b> ${row.noteOut}</div>` : ''}
            </div>` : ''}
        </div>`;
    });

    if (myRecords.length === 0) {
        tableHtml = `<div class="text-center py-8 text-slate-400 font-bold text-sm">ไม่พบข้อมูลเวลาเข้า-ออกในรอบนี้</div>`;
    }

    document.getElementById('table-container').innerHTML = tableHtml;
}

// Tooltips
function showNoteTooltip(event) {
    event.stopPropagation();
    const text = event.currentTarget.getAttribute('data-note');
    const tooltip = document.getElementById('note-tooltip');
    if (!tooltip) return;
    
    tooltip.innerText = text;
    tooltip.classList.remove('hidden');
    tooltip.classList.add('opacity-0', 'scale-95');
    
    tooltip.offsetHeight; 
    
    const rect = event.currentTarget.getBoundingClientRect();
    let top = rect.bottom + window.scrollY + 8;
    
    if (rect.bottom + 50 > window.innerHeight && rect.top > 50) {
        top = rect.top + window.scrollY - tooltip.offsetHeight - 8;
    }
    
    let left = rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2);
    if (left < 10) left = 10;
    if (left + tooltip.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - tooltip.offsetWidth - 10;
    }
    
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
    
    requestAnimationFrame(() => {
        tooltip.classList.remove('opacity-0', 'scale-95');
        tooltip.classList.add('opacity-100', 'scale-100');
    });
}

document.addEventListener('click', function(event) {
    const tooltip = document.getElementById('note-tooltip');
    if (tooltip && !tooltip.classList.contains('hidden')) {
        tooltip.classList.remove('opacity-100', 'scale-100');
        tooltip.classList.add('opacity-0', 'scale-95');
        setTimeout(() => tooltip.classList.add('hidden'), 150);
    }
});

function openChangePinModal() {
    document.getElementById('old-pin').value = '';
    document.getElementById('new-pin').value = '';
    document.getElementById('confirm-pin').value = '';
    
    const overlay = document.getElementById('pin-modal');
    const box = document.getElementById('pin-modal-box');
    overlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    setTimeout(() => box.classList.remove('scale-95'), 10);
}

function closeChangePinModal() {
    const overlay = document.getElementById('pin-modal');
    const box = document.getElementById('pin-modal-box');
    box.classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        overlay.classList.add('hidden');
    }, 300);
}

async function changePin() {
    const oldPin = document.getElementById('old-pin').value;
    const newPin = document.getElementById('new-pin').value;
    const confirmPin = document.getElementById('confirm-pin').value;

    if (!oldPin || !newPin || !confirmPin) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }
    if (newPin !== confirmPin) {
        alert("รหัสผ่านใหม่ไม่ตรงกัน");
        return;
    }

    const payload = {
        action: "updatePin",
        name: loggedInEmployee.name,
        oldPin: oldPin,
        newPin: newPin
    };

    closeChangePinModal();
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังเปลี่ยนรหัสผ่าน...";
    overlay.classList.remove('hidden');

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.status === "success") {
            alert("เปลี่ยนรหัสผ่านสำเร็จ!");
            loggedInEmployee.pin = newPin; 
            sessionStorage.setItem('snk_payroll_user', JSON.stringify(loggedInEmployee));
            let idx = employees.findIndex(e => e.name === loggedInEmployee.name);
            if (idx > -1) employees[idx].pin = newPin;
        } else {
            alert("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
        overlay.classList.add('hidden');
    }
}

// ----------------------------------------------------
// Admin Dashboard Logic
// ----------------------------------------------------
function renderAdminSummary() {
    if (!currentPeriodVal) return;

    let parts = currentPeriodVal.split('_');
    let type = parts[0];
    let mStr = parts[1];
    
    let empStats = {};
    employees.forEach(e => {
        empStats[e.name] = {
            ...e,
            totalNormalHours: 0,
            totalOTHours: 0
        };
    });

    processedAttendance.forEach(r => {
        const d = r.dateObj;
        const rMstr = `${d.getFullYear()}-${d.getMonth()}`;
        if (rMstr !== mStr) return;
        if (type === 'h1' && d.getDate() > 15) return;
        if (type === 'h2' && d.getDate() < 16) return;
        
        if (empStats[r.name]) {
            empStats[r.name].totalNormalHours += r.regularHours || 0;
            empStats[r.name].totalOTHours += r.otHours || 0;
        }
    });

    let totalPayroll = 0;
    let activeEmployeesCount = 0;
    
    let html = '';
    let formatCurrency = (val) => Number(val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    Object.values(empStats).forEach(emp => {
        if (emp.totalNormalHours === 0 && emp.totalOTHours === 0 && (!emp.normalRate || emp.normalRate === 0)) return; 
        
        activeEmployeesCount++;
        
        let normalPay = emp.totalNormalHours * emp.normalRate;
        let otPay = emp.totalOTHours * emp.otRate;
        let grossPay = normalPay + otPay;
        
        let empDeductions = deductions.filter(d => d.period === currentPeriodVal && d.name === emp.name);
        let customDeductTotal = empDeductions.reduce((sum, d) => sum + d.amount, 0);

        let payBeforeTax = grossPay - customDeductTotal;

        let standardDeduct = 0;
        let deductLabel = '';
        let empDedType = String(emp.deductionType).trim();
        if (empDedType === "3%" || empDedType === "0.03") {
            standardDeduct = payBeforeTax * 0.03;
            deductLabel = "หักภาษี 3%";
        } else if (empDedType === "5%" || empDedType === "0.05") {
            standardDeduct = payBeforeTax * 0.05;
            deductLabel = "หักประกันสังคม 5%";
        }

        let netPay = payBeforeTax - standardDeduct;
        totalPayroll += netPay;

        html += `
        <div class="card p-4 bg-white rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition">
            <div class="flex justify-between items-center border-b border-emerald-50 pb-3 mb-3">
                <div class="font-black text-lg text-emerald-900">${emp.name} ${emp.fullName ? `<span class="text-xs font-semibold text-emerald-600/60 ml-1">${emp.fullName}</span>` : ''}</div>
                <div class="text-right">
                    <div class="text-[10px] font-bold text-emerald-500/70 uppercase">ยอดสุทธิ</div>
                    <div class="font-black text-xl text-emerald-600 leading-none">฿${formatCurrency(netPay)}</div>
                </div>
            </div>
            
            <div class="space-y-2 text-sm font-semibold text-slate-600">
                <div class="flex justify-between">
                    <span class="text-slate-500">ค่าจ้างปกติ (${emp.totalNormalHours.toFixed(1)} ชม. x ฿${emp.normalRate})</span>
                    <span>฿${normalPay.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                ${emp.totalOTHours > 0 ? `
                <div class="flex justify-between text-orange-600">
                    <span>OT (${emp.totalOTHours.toFixed(1)} ชม. x ฿${emp.otRate})</span>
                    <span>฿${otPay.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>` : ''}
                
                ${standardDeduct > 0 ? `
                <div class="flex justify-between text-red-500">
                    <span>${deductLabel}</span>
                    <span>-฿${standardDeduct.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>` : ''}
            </div>

            <div class="mt-3 pt-3 border-t border-dashed border-slate-200">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[11px] font-bold text-slate-500 uppercase">รายการหักอื่นๆ</span>
                    <button onclick="openDeductionModal('${emp.name}')" class="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded active:scale-95 transition">+ เพิ่มรายการหัก</button>
                </div>
                ${empDeductions.length > 0 ? `<div class="space-y-1">
                    ${empDeductions.map(d => `
                        <div class="flex justify-between items-center bg-red-50 px-2 py-1.5 rounded-lg text-xs">
                            <div class="flex flex-col">
                                <span class="font-bold text-red-700">${d.reason}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-black text-red-600">-฿${d.amount.toLocaleString()}</span>
                                <button onclick="openDeductionModal('${emp.name}', '${d.id}')" class="text-slate-400 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            </div>
                        </div>
                    `).join('')}
                </div>` : '<div class="text-xs text-slate-400 italic">ไม่มีรายการหัก</div>'}
            </div>
        </div>`;
    });

    if (html === '') {
        html = `<div class="text-center py-10 text-slate-400 font-bold text-sm">ไม่พบข้อมูลในรอบนี้</div>`;
    }

    document.getElementById('admin-summary-list').innerHTML = html;
    document.getElementById('overall-summary').style.display = 'grid';
    document.getElementById('total-employees').innerText = activeEmployeesCount;
    document.getElementById('total-payroll').innerText = totalPayroll.toLocaleString('en-US', {minimumFractionDigits: 0});
}

function openDeductionModal(empName, deductionId = null) {
    document.getElementById('deduction-emp-name').value = empName;
    document.getElementById('deduction-period').value = currentPeriodVal;
    document.getElementById('deduction-emp-display').innerText = empName;
    
    const title = document.getElementById('deduction-modal-title');
    const btnDel = document.getElementById('btn-delete-deduction');

    if (deductionId) {
        title.innerText = "แก้ไขรายการหักเงิน";
        const d = deductions.find(x => x.id === deductionId);
        document.getElementById('deduction-id').value = d.id;
        document.getElementById('deduction-reason').value = d.reason;
        document.getElementById('deduction-amount').value = d.amount;
        btnDel.classList.remove('hidden');
    } else {
        title.innerText = "เพิ่มรายการหักเงินใหม่";
        document.getElementById('deduction-id').value = '';
        document.getElementById('deduction-reason').value = '';
        document.getElementById('deduction-amount').value = '';
        btnDel.classList.add('hidden');
    }

    const overlay = document.getElementById('deduction-modal');
    const box = document.getElementById('deduction-modal-box');
    overlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    setTimeout(() => box.classList.remove('scale-95'), 10);
}

function closeDeductionModal() {
    const overlay = document.getElementById('deduction-modal');
    const box = document.getElementById('deduction-modal-box');
    box.classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('opacity-0', 'pointer-events-none');
        overlay.classList.add('hidden');
    }, 300);
}

async function saveDeduction() {
    const id = document.getElementById('deduction-id').value;
    const name = document.getElementById('deduction-emp-name').value;
    const period = document.getElementById('deduction-period').value;
    const reason = document.getElementById('deduction-reason').value.trim();
    const amount = parseFloat(document.getElementById('deduction-amount').value);

    if (!reason || isNaN(amount) || amount <= 0) {
        alert("กรุณากรอกเหตุผลและจำนวนเงินให้ถูกต้อง");
        return;
    }

    const payload = {
        action: "saveDeduction",
        deduction: { id: id || null, name, period, reason, amount }
    };

    closeDeductionModal();
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังบันทึกข้อมูล...";
    overlay.classList.remove('hidden');

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.status === "success") {
            if (id) {
                let idx = deductions.findIndex(d => d.id === id);
                if (idx > -1) {
                    deductions[idx].reason = reason;
                    deductions[idx].amount = amount;
                }
            } else {
                deductions.push({ id: json.id, period, name, amount, reason });
            }
            renderAdminSummary();
        } else {
            alert("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        alert("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
        overlay.classList.add('hidden');
    }
}

async function deleteDeduction() {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?")) return;

    const id = document.getElementById('deduction-id').value;
    const payload = { action: "deleteDeduction", id };

    closeDeductionModal();
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังลบข้อมูล...";
    overlay.classList.remove('hidden');

    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.status === "success") {
            deductions = deductions.filter(d => d.id !== id);
            renderAdminSummary();
        } else {
            alert("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        alert("ไม่สามารถลบข้อมูลได้");
    } finally {
        overlay.classList.add('hidden');
    }
}

// ----------------------------------------------------
// Admin Employees Setup Logic
// ----------------------------------------------------
function renderAdminEmployees() {
    const container = document.getElementById('employee-setup-list');
    const search = document.getElementById('emp-search-input').value.toLowerCase();
    container.innerHTML = '';

    const filtered = employees.filter(e => 
        (e.name && e.name.toLowerCase().includes(search)) || 
        (e.fullName && e.fullName.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-8 text-sm font-medium">ไม่พบข้อมูลพนักงาน</div>';
        return;
    }

    filtered.forEach(emp => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 border border-slate-200 shadow-sm relative transition-all hover:shadow-md';
        
        let typeBadge = '';
        if (emp.employeeType === 'Full Time') {
            typeBadge = `<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Full Time</span>`;
        } else if (emp.employeeType === 'Part Time') {
            typeBadge = `<span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Part Time</span>`;
        }

        div.innerHTML = `
            <div class="flex justify-between items-center md:w-[250px] shrink-0">
                <div class="flex flex-col justify-center">
                    <div class="flex items-center gap-2 flex-wrap">
                        <div class="text-[15px] font-black text-slate-900 flex items-baseline gap-1.5">
                            ${emp.name || '-'} 
                            ${emp.fullName ? `<span class="text-[11px] text-slate-500 font-medium">${emp.fullName}</span>` : ''}
                        </div>
                        ${typeBadge}
                    </div>
                </div>
                <div class="flex gap-1 md:hidden">
                    <button onclick='editEmployee(${JSON.stringify(emp).replace(/'/g, "&#39;")})' class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="openDeleteModal('${emp.name}', '${emp.fullName || ''}')" class="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>
            
            <div class="flex-1 grid grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-1.5 text-[11px] bg-slate-50 md:bg-transparent p-2 md:p-0 rounded-lg border border-slate-100 md:border-none items-center">
                <div class="flex flex-col"><span class="text-slate-400 font-bold">PIN</span><span class="font-black text-slate-800 text-[13px]">${emp.pin || '-'}</span></div>
                <div class="flex flex-col"><span class="text-slate-400 font-bold">รายวัน</span><span class="font-black text-slate-800 text-[13px]">${emp.dailyRate ? emp.dailyRate + '฿' : '-'}</span></div>
                <div class="flex flex-col"><span class="text-slate-400 font-bold">รายชั่วโมง</span><span class="font-black text-slate-800 text-[13px]">${emp.normalRate ? emp.normalRate + '฿' : '-'}</span></div>
                <div class="flex flex-col"><span class="text-slate-400 font-bold">OT</span><span class="font-black text-slate-800 text-[13px]">${emp.otRate ? emp.otRate + '฿' : '-'}</span></div>
                <div class="flex flex-col"><span class="text-slate-400 font-bold">หักเงิน</span><span class="font-black text-red-600 text-[13px]">${emp.deductionType || '-'}</span></div>
                <div class="flex flex-col"><span class="text-slate-400 font-bold">เลขบัญชี</span><span class="font-black text-slate-800 text-[13px] truncate w-full">${emp.bankAccount || '-'}</span></div>
            </div>

            <div class="hidden md:flex gap-1 shrink-0 ml-4">
                <button onclick='editEmployee(${JSON.stringify(emp).replace(/'/g, "&#39;")})' class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition" title="แก้ไข">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                </button>
                <button onclick="openDeleteModal('${emp.name}', '${emp.fullName || ''}')" class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition" title="ลบ">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

function openEmployeeModal() {
    document.getElementById('employee-modal-title').innerText = "เพิ่มพนักงานใหม่";
    document.getElementById('old-nickname').value = "";
    document.getElementById('old-fullname').value = "";
    
    document.getElementById('emp-nickname').value = "";
    document.getElementById('emp-fullname').value = "";
    document.getElementById('emp-pin').value = "1234";
    document.getElementById('emp-dailyrate').value = "";
    document.getElementById('emp-hourlyrate').value = "";
    document.getElementById('emp-otrate').value = "";
    document.getElementById('emp-deductiontype').value = "None";
    document.getElementById('emp-bank').value = "";
    document.getElementById('emp-type').value = "Full Time";

    const modal = document.getElementById('employee-modal');
    const modalBox = document.getElementById('employee-modal-box');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modalBox.classList.remove('scale-95');
    }, 10);
}

function editEmployee(emp) {
    document.getElementById('employee-modal-title').innerText = "แก้ไขข้อมูลพนักงาน";
    document.getElementById('old-nickname').value = emp.name || "";
    document.getElementById('old-fullname').value = emp.fullName || "";
    
    document.getElementById('emp-nickname').value = emp.name || "";
    document.getElementById('emp-fullname').value = emp.fullName || "";
    document.getElementById('emp-pin').value = emp.pin || "";
    document.getElementById('emp-dailyrate').value = emp.dailyRate || "";
    document.getElementById('emp-hourlyrate').value = emp.normalRate || "";
    document.getElementById('emp-otrate').value = emp.otRate || "";
    document.getElementById('emp-deductiontype').value = emp.deductionType || "None";
    document.getElementById('emp-bank').value = emp.bankAccount || "";
    document.getElementById('emp-type').value = emp.employeeType || "Full Time";

    const modal = document.getElementById('employee-modal');
    const modalBox = document.getElementById('employee-modal-box');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modalBox.classList.remove('scale-95');
    }, 10);
}

function closeEmployeeModal() {
    const modal = document.getElementById('employee-modal');
    const modalBox = document.getElementById('employee-modal-box');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modalBox.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function saveEmployee() {
    const oldNickname = document.getElementById('old-nickname').value;
    const oldFullName = document.getElementById('old-fullname').value;

    const nickname = document.getElementById('emp-nickname').value.trim();
    if (!nickname) return alert("กรุณากรอกชื่อเล่น");

    const empObj = {
        name: nickname, // 'name' corresponds to nickname in data structure
        nickname: nickname,
        fullName: document.getElementById('emp-fullname').value.trim(),
        pin: document.getElementById('emp-pin').value.trim(),
        dailyRate: parseFloat(document.getElementById('emp-dailyrate').value) || 0,
        normalRate: parseFloat(document.getElementById('emp-hourlyrate').value) || 0,
        otRate: parseFloat(document.getElementById('emp-otrate').value) || 0,
        deductionType: document.getElementById('emp-deductiontype').value,
        bankAccount: document.getElementById('emp-bank').value.trim(),
        employeeType: document.getElementById('emp-type').value
    };

    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังบันทึกข้อมูล...";
    overlay.classList.remove('hidden');

    try {
        let res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "saveEmployee",
                oldNickname: oldNickname,
                oldFullName: oldFullName,
                employee: {
                    ...empObj,
                    hourlyRate: empObj.normalRate // mapping for the backend
                }
            })
        });
        let json = await res.json();
        if (json.status === "success") {
            closeEmployeeModal();
            // Refetch or update local
            if (oldNickname) {
                let idx = employees.findIndex(e => e.name === oldNickname);
                if (idx > -1) employees[idx] = empObj;
            } else {
                employees.push(empObj);
            }
            document.getElementById('emp-setup-count').innerText = employees.length;
            renderAdminEmployees();
        } else {
            alert("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to connect to server.");
    } finally {
        overlay.classList.add('hidden');
    }
}

function openDeleteModal(nickname, fullName) {
    document.getElementById('delete-emp-name').innerText = nickname;
    document.getElementById('delete-nickname').value = nickname;
    document.getElementById('delete-fullname').value = fullName;

    const delModal = document.getElementById('delete-modal');
    const delModalBox = document.getElementById('delete-modal-box');
    delModal.classList.remove('hidden');
    setTimeout(() => {
        delModal.classList.remove('opacity-0', 'pointer-events-none');
        delModalBox.classList.remove('scale-95');
    }, 10);
}

function closeDeleteModal() {
    const delModal = document.getElementById('delete-modal');
    const delModalBox = document.getElementById('delete-modal-box');
    delModal.classList.add('opacity-0', 'pointer-events-none');
    delModalBox.classList.add('scale-95');
    setTimeout(() => {
        delModal.classList.add('hidden');
    }, 300);
}

async function confirmDeleteEmployee() {
    const nickname = document.getElementById('delete-nickname').value;
    const fullName = document.getElementById('delete-fullname').value;

    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังลบข้อมูล...";
    overlay.classList.remove('hidden');
    closeDeleteModal();

    try {
        let res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "deleteEmployee",
                nickname: nickname,
                fullName: fullName
            })
        });
        let json = await res.json();
        if (json.status === "success") {
            employees = employees.filter(e => e.name !== nickname);
            document.getElementById('emp-setup-count').innerText = employees.length;
            renderAdminEmployees();
        } else {
            alert("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to connect to server.");
    } finally {
        overlay.classList.add('hidden');
    }
}
