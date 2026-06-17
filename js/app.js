const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzFUKSmGgJI0N66zDJMCLeryob1Y0PTl3oVMS-VCR80_P2sZ5R7BJ7HpwW53VmTBJM/exec';

let rawAttendance = [];
let employees = [];
let deductions = [];
let leaves = [];

let processedAttendance = [];
let availablePeriods = [];
let currentPeriodVal = '';
let loggedInEmployee = null; // Object if employee, or string "ADMIN"
let isAdmin = false;
let currentEmpTab = 'active';

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
        Swal.fire("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
        overlay.classList.add('hidden');
    }
}

async function fetchFreshDataSilently() {
    try {
        const res = await fetch(`${WEB_APP_URL}?action=getInitPayrollData`);
        const json = await res.json();
        if (json.status === "success") {
            localStorage.setItem('snk_payroll_data', JSON.stringify(json));
            applyInitData(json.data, true); // Update with fresh data, isSilent=true
            
            // Re-render UI if already logged in
            if (loggedInEmployee) {
                setupPeriods();
                if (isAdmin) {
                    if (currentPeriodVal) renderAdminSummary();
                    if (!document.getElementById('view-admin-employees').classList.contains('hidden')) {
                        const countEl = document.getElementById('emp-setup-count');
                        if (countEl) countEl.innerText = employees.length;
                        renderAdminEmployees();
                    }
                } else {
                    const freshEmp = employees.find(e => e.name === loggedInEmployee.name);
                    if (freshEmp) {
                        loggedInEmployee = freshEmp;
                        sessionStorage.setItem('snk_payroll_user', JSON.stringify(freshEmp));
                        document.getElementById('emp-user-name').innerText = loggedInEmployee.name;
                        const photoImg = document.getElementById('emp-user-photo');
                        const initialSpan = document.getElementById('emp-user-initial');
                        if (loggedInEmployee.photo) {
                            photoImg.src = loggedInEmployee.photo;
                            photoImg.classList.remove('hidden');
                            initialSpan.classList.add('hidden');
                        } else {
                            photoImg.src = "";
                            photoImg.classList.add('hidden');
                            initialSpan.classList.remove('hidden');
                            initialSpan.innerText = loggedInEmployee.name.charAt(0);
                        }
                    }
                    if (currentPeriodVal) renderEmployeeDashboard();
                }
            }
        }
    } catch (e) {
        console.error("Silent fetch error", e);
    }
}

function applyInitData(data, isSilent = false) {
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
    deductions = data.deductions || [];
    leaves = data.leaves || [];

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
    
    if (!isSilent) {
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
                                rec.lateDeduction = 1.0 + Math.floor(lateMins / 15) * 0.25;
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
    
    const lastAttendanceMap = {};
    processedAttendance.forEach(rec => {
        if (!lastAttendanceMap[rec.name] || rec.dateObj > lastAttendanceMap[rec.name]) {
            lastAttendanceMap[rec.name] = rec.dateObj;
        }
    });

    const activeEmployees = employees.filter(emp => emp.status !== "Inactive");

    const sortedEmp = activeEmployees.sort((a, b) => {
        const lastA = lastAttendanceMap[a.name] ? lastAttendanceMap[a.name].getTime() : Infinity;
        const lastB = lastAttendanceMap[b.name] ? lastAttendanceMap[b.name].getTime() : Infinity;
        if (lastA === lastB) return a.name.localeCompare(b.name, 'th');
        return lastB - lastA; // Descending order
    });
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

    if (typeof initCustomSelect === 'function') {
        initCustomSelect(select);
    }
}

// ----------------------------------------------------
// Authentication Logic
// ----------------------------------------------------
function handleLogin() {
    const name = document.getElementById('login-name').value;
    const pin = document.getElementById('login-pin').value;
    
    if (!name || !pin) {
        Swal.fire("กรุณาเลือกชื่อและใส่รหัสผ่าน");
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
            Swal.fire("รหัสผ่านแอดมินไม่ถูกต้อง");
            document.getElementById('login-pin').value = '';
        }
        return;
    }

    const emp = employees.find(e => e.name === name);
    if (!emp) {
        Swal.fire("ไม่พบข้อมูลพนักงานในระบบ");
        return;
    }

    if (emp.pin === pin) {
        isAdmin = false;
        loggedInEmployee = emp;
        sessionStorage.setItem('snk_payroll_user', JSON.stringify(emp));
        document.getElementById('login-pin').value = '';
        showEmployeeDashboard();
    } else {
        Swal.fire("รหัสผ่านไม่ถูกต้อง");
        document.getElementById('login-pin').value = '';
    }
}

function logout() {
    loggedInEmployee = null;
    isAdmin = false;
    sessionStorage.removeItem('snk_payroll_user');
    
    const loginNameSelect = document.getElementById('login-name');
    if (loginNameSelect) {
        loginNameSelect.value = "";
        if (loginNameSelect.dataset.customized === "true") {
            const wrapper = loginNameSelect.nextElementSibling;
            if (wrapper && wrapper.classList.contains('custom-select-wrapper')) {
                const displaySpan = wrapper.querySelector('span.truncate');
                if (displaySpan && loginNameSelect.options[0]) {
                    displaySpan.innerText = loginNameSelect.options[0].text;
                }
            }
        }
    }
    document.getElementById('login-pin').value = '';
    
    showView('view-login', true);
}

// ----------------------------------------------------
// Views Routing
// ----------------------------------------------------
function showView(viewId, pushToHistory = true) {
    const views = ['view-login', 'view-dashboard', 'view-employee', 'view-profile', 'view-leave', 'view-stock', 'view-checklist', 'view-qa', 'view-admin-dashboard', 'view-admin-employees', 'view-admin-overview', 'view-admin-leaves'];
    views.forEach(v => {
        let el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });
    
    let target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');
    
    document.getElementById('loading-overlay').classList.add('hidden');
    
    if (pushToHistory) {
        history.pushState({ view: viewId }, '', `#${viewId}`);
    }
}

window.addEventListener('popstate', function(event) {
    if (event.state && event.state.view) {
        const viewId = event.state.view;
        if (viewId === 'view-dashboard') showEmployeeDashboard(false);
        else if (viewId === 'view-employee') openTimesheet(false);
        else if (viewId === 'view-profile') openProfile(false);
        else if (viewId === 'view-leave') openLeave(false);
        else showView(viewId, false);
    } else {
        if (loggedInEmployee) {
            showEmployeeDashboard(false);
        } else {
            showView('view-login', false);
        }
    }
});

function showEmployeeDashboard(pushToHistory = true) {
    showView('view-dashboard', pushToHistory);
    
    // Update header info in dashboard
    const initialSpan = document.getElementById('dash-user-initial');
    const photoImg = document.getElementById('dash-user-photo');
    if (loggedInEmployee && loggedInEmployee.photo) {
        if(photoImg) { photoImg.src = loggedInEmployee.photo; photoImg.classList.remove('hidden'); }
        if(initialSpan) initialSpan.classList.add('hidden');
    } else if (loggedInEmployee) {
        if(photoImg) { photoImg.src = ""; photoImg.classList.add('hidden'); }
        if(initialSpan) { initialSpan.classList.remove('hidden'); initialSpan.innerText = loggedInEmployee.name.charAt(0); }
    }
    if (document.getElementById('dash-user-name') && loggedInEmployee) {
        document.getElementById('dash-user-name').innerText = loggedInEmployee.name;
    }
}

function openTimesheet(pushToHistory = true) {
    showView('view-employee', pushToHistory);
    
    const initialSpan = document.getElementById('emp-user-initial');
    const photoImg = document.getElementById('emp-user-photo');
    if (loggedInEmployee.photo) {
        photoImg.src = loggedInEmployee.photo;
        photoImg.classList.remove('hidden');
        initialSpan.classList.add('hidden');
    } else {
        photoImg.src = "";
        photoImg.classList.add('hidden');
        initialSpan.classList.remove('hidden');
        initialSpan.innerText = loggedInEmployee.name.charAt(0);
    }

    document.getElementById('emp-user-name').innerText = loggedInEmployee.name;

    setupPeriods();
    currentPeriodVal = '';
    
    if (availablePeriods.length > 0) {
        document.getElementById('period-btn-text').innerText = '- กรุณาเลือกรอบเวลา -';
        document.getElementById('salary-summary-container').innerHTML = '';
        document.getElementById('table-container').innerHTML = '<div class="text-center py-8 text-slate-400 font-bold text-sm">กรุณาเลือกรอบเวลาเพื่อดูข้อมูล</div>';
    } else {
        document.getElementById('period-btn-text').innerText = '- ไม่พบข้อมูล -';
        document.getElementById('salary-summary-container').innerHTML = '';
        document.getElementById('table-container').innerHTML = '<div class="text-center py-8 text-slate-400 font-bold text-sm">ไม่พบข้อมูลเวลาเข้า-ออกงาน</div>';
    }
}

function showAdminDashboard() {
    showView('view-admin-dashboard');

    setupPeriods();
    currentPeriodVal = '';

    if (availablePeriods.length > 0) {
        document.getElementById('admin-period-btn-text').innerText = '- กรุณาเลือกรอบเวลา -';
        document.getElementById('admin-summary-list').innerHTML = '<div class="text-center py-8 text-slate-400 font-bold text-sm">กรุณาเลือกรอบเวลาเพื่อดูสรุปข้อมูล</div>';
        document.getElementById('admin-chart-container').classList.add('hidden');
    } else {
        document.getElementById('admin-period-btn-text').innerText = "- ไม่พบข้อมูล -";
        document.getElementById('admin-summary-list').innerHTML = '';
        document.getElementById('admin-chart-container').classList.add('hidden');
    }
    
    renderAdminLeaves();
}

function showAdminEmployees() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-admin-dashboard').classList.add('hidden');
    document.getElementById('view-admin-employees').classList.remove('hidden');
    switchEmpTab('active');
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
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
        let mName = monthNames[m - 1];
        let yThai = y + 543;
        let lastDay = new Date(y, m, 0).getDate();
        
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
        closePeriodDropdown();
    }
}

function closePeriodDropdown() {
    const overlay = document.getElementById('period-dropdown-overlay');
    const sheet = document.getElementById('period-dropdown');
    if (!overlay.classList.contains('hidden')) {
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
    closePeriodDropdown();
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
        const rMstr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
    
    let customDeductTotal = 0;
    let customBonusTotal = 0;
    let customDeductHtml = '';

    let empDeductions = deductions.filter(d => d.period === currentPeriodVal && d.name === loggedInEmployee.name);
    empDeductions.forEach(d => {
        if (d.type === 'Bonus') {
            customBonusTotal += d.amount;
            customDeductHtml += `<div class="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-emerald-100 last:border-0">
                <span><span class="text-emerald-500 font-bold">[บวกเงิน]</span> <span class="text-slate-700 font-medium">${d.reason}</span></span>
                <span class="font-black text-emerald-500">+฿${d.amount.toLocaleString()}</span>
            </div>`;
        } else {
            customDeductTotal += d.amount;
            customDeductHtml += `<div class="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-red-100 last:border-0">
                <span><span class="text-red-500 font-bold">[${d.type === 'Advance' ? 'เบิกล่วงหน้า' : (d.type === 'Damage' ? 'หักค่าเสียหาย' : 'หักค่าอื่นๆ')}]</span> <span class="text-slate-700 font-medium">${d.reason}</span></span>
                <span class="font-black text-red-600">-฿${d.amount.toLocaleString()}</span>
            </div>`;
        }
    });

    let payBeforeTax = grossPay + customBonusTotal - customDeductTotal;

    let standardDeduct = 0;
    let deductLabel = '';
    let empDedType = String(loggedInEmployee.deductionType).trim();
    if (empDedType === "3%" || empDedType === "0.03" || empDedType.includes("3%") || empDedType === "" || empDedType === "None") {
        standardDeduct = payBeforeTax * 0.03;
        deductLabel = "หัก ณ ที่จ่าย 3%";
    } else if (empDedType === "5%" || empDedType === "0.05" || empDedType.includes("5%")) {
        standardDeduct = payBeforeTax * 0.05;
        deductLabel = "ประกันสังคม 5%";
    }

    let netPay = payBeforeTax - standardDeduct;

    let formatCurrency = (val) => Number(val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    let periodText = availablePeriods.find(p => p.value === currentPeriodVal)?.text || '';

    let summaryHtml = `
    <div class="bg-white rounded-[20px] shadow-lg shadow-emerald-900/5 border border-emerald-50 mb-6 flex flex-col relative overflow-hidden">
        <div class="relative">
        <!-- Header -->
        <div class="bg-[#0fa981] text-white px-5 py-4 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <div class="flex flex-col">
                    <span class="font-bold text-sm tracking-widest leading-tight">ค่าแรงร้านใส่นม สาขาเกษตร</span>
                    <span class="text-[11px] font-medium text-emerald-100/90 mt-0.5 tracking-wider">${periodText}</span>
                </div>
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
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">เรตรายวัน (8 ชม.)</p>
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
                            <p class="text-xs font-medium text-emerald-600/80">${totalNormalHours.toFixed(1)} ชม. <span class="text-slate-500">x ฿${formatCurrency(loggedInEmployee.normalRate)}</span></p>
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
                            <p class="text-xs font-medium text-orange-500/80">${totalOTHours.toFixed(1)} ชม. <span class="text-slate-500">x ฿${formatCurrency(loggedInEmployee.otRate)}</span></p>
                        </div>
                    </div>
                    <div class="text-right font-black text-slate-800 text-lg">
                        <span class="text-orange-500 mr-1">+</span>฿${formatCurrency(otPay)}
                    </div>
                </div>

                ${customDeductHtml}
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
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">รวมค่าแรงปกติ + OT + พิเศษ - หักออก</span>
                <span class="text-sm font-black text-slate-700">฿${formatCurrency(payBeforeTax)}</span>
            </div>

            ${standardDeduct > 0 ? `
            <div class="flex justify-between items-center px-2 mb-2">
                <span class="text-xs font-bold text-red-500 uppercase tracking-wide">${deductLabel}</span>
                <span class="text-sm font-black text-red-600">-฿${formatCurrency(standardDeduct)}</span>
            </div>
            ` : ''}

            <!-- Net Pay (Grand Total) -->
            <div onclick="downloadPayslipPdf()" class="bg-[#0fa981] rounded-[20px] p-5 flex justify-between items-center shadow-lg shadow-[#0fa981]/40 mt-4 relative overflow-hidden cursor-pointer active:scale-95 transition-transform duration-200 group">
                <div class="relative z-10 flex flex-col">
                    <p class="text-[11px] font-black text-emerald-50 uppercase tracking-widest">รวมรายได้สุทธิ</p>
                    <div class="mt-2 flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full w-max opacity-90 group-hover:opacity-100 transition-opacity">
                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span class="text-[10px] font-bold text-white">แตะเพื่อโหลดสลิป</span>
                    </div>
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
                    ${row.isLate ? `<span class="text-[10px] font-normal text-red-500 leading-tight late-text mt-0.5">สาย ${row.lateMins} น.${row.lateDeduction > 0 ? `<br>(-${row.lateDeduction} ชม)` : ''}</span>` : ''}
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
            <div class="remark-box text-left mt-2 text-[11px] text-yellow-800 bg-yellow-50 p-2.5 rounded-lg border border-yellow-200 mx-1 shadow-sm">
                ${row.noteIn ? `<div><b class="text-yellow-600">Note เข้า:</b> ${row.noteIn}</div>` : ''}
                ${row.noteOut ? `<div class="${row.noteIn?'mt-1':''}"><b class="text-yellow-600">Note ออก:</b> ${row.noteOut}</div>` : ''}
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
    let top = rect.bottom + 8;
    
    if (rect.bottom + 50 > window.innerHeight && rect.top > 50) {
        top = rect.top - tooltip.offsetHeight - 8;
    }
    
    let left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
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
        Swal.fire("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }
    if (newPin !== confirmPin) {
        Swal.fire("รหัสผ่านใหม่ไม่ตรงกัน");
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
            Swal.fire("เปลี่ยนรหัสผ่านสำเร็จ!");
            loggedInEmployee.pin = newPin; 
            sessionStorage.setItem('snk_payroll_user', JSON.stringify(loggedInEmployee));
            let idx = employees.findIndex(e => e.name === loggedInEmployee.name);
            if (idx > -1) employees[idx].pin = newPin;
        } else {
            Swal.fire("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        Swal.fire("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
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
        const rMstr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
    
    let chartLabels = [];
    let chartNormalPay = [];
    let chartOTPay = [];
    let chartBonus = [];
    let chartDeduct = [];
    
    let html = '';
    let formatCurrency = (val) => Number(val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    Object.values(empStats).forEach(emp => {
        if (emp.totalNormalHours === 0 && emp.totalOTHours === 0 && (!emp.normalRate || emp.normalRate === 0)) return; 
        
        let normalPay = emp.totalNormalHours * emp.normalRate;
        let otPay = emp.totalOTHours * emp.otRate;
        let grossPay = normalPay + otPay;
        
        let empDeductions = deductions.filter(d => d.period === currentPeriodVal && d.name === emp.name);
        let customDeductTotal = 0;
        let customBonusTotal = 0;
        
        empDeductions.forEach(d => {
            if (d.type === 'Bonus') customBonusTotal += d.amount;
            else customDeductTotal += d.amount;
        });

        let payBeforeTax = grossPay + customBonusTotal - customDeductTotal;

        let standardDeduct = 0;
        let deductLabel = '';
        let empDedType = String(emp.deductionType).trim();
        if (empDedType === "3%" || empDedType === "0.03" || empDedType.includes("3%") || empDedType === "" || empDedType === "None") {
            standardDeduct = payBeforeTax * 0.03;
            deductLabel = "หักภาษี 3%";
        } else if (empDedType === "5%" || empDedType === "0.05" || empDedType.includes("5%")) {
            standardDeduct = payBeforeTax * 0.05;
            deductLabel = "หักประกันสังคม 5%";
        }

        let netPay = payBeforeTax - standardDeduct;
        if (netPay === 0) return;

        activeEmployeesCount++;
        totalPayroll += netPay;
        
        chartLabels.push(emp.name);
        chartNormalPay.push(normalPay);
        chartOTPay.push(otPay);
        chartBonus.push(customBonusTotal);
        chartDeduct.push(customDeductTotal + standardDeduct);

        html += `
        <div class="card p-4 bg-white rounded-2xl shadow-sm border border-emerald-100 hover:shadow-md transition">
            <div class="flex justify-between items-center border-b border-emerald-50 pb-3 mb-3">
                <div class="flex flex-col">
                    <div class="font-black text-lg text-emerald-900 flex items-center gap-2">
                        ${emp.name}
                        <button onclick="openTimeLogsModal('${emp.name}')" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            ประวัติเวลา
                        </button>
                    </div>
                    ${emp.fullName ? `<div class="text-xs font-semibold text-emerald-600/60 mt-0.5">${emp.fullName}</div>` : ''}
                </div>
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
                        <div class="flex justify-between items-center ${d.type === 'Bonus' ? 'bg-emerald-50' : 'bg-red-50'} px-2 py-1.5 rounded-lg text-xs">
                            <div class="flex flex-col">
                                <span><span class="font-bold ${d.type === 'Bonus' ? 'text-emerald-500' : 'text-red-700'}">[${d.type === 'Bonus' ? 'บวกเงิน' : (d.type === 'Advance' ? 'เบิกล่วงหน้า' : (d.type === 'Damage' ? 'หักค่าเสียหาย' : 'หักค่าอื่นๆ'))}]</span> <span class="text-slate-700 font-medium">${d.reason}</span></span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-black ${d.type === 'Bonus' ? 'text-emerald-500' : 'text-red-600'}">${d.type === 'Bonus' ? '+' : '-'}฿${d.amount.toLocaleString()}</span>
                                <button onclick="openDeductionModal('${emp.name}', '${d.id}')" class="text-slate-400 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                            </div>
                        </div>
                    `).join('')}
                </div>` : '<div class="text-xs text-slate-400 italic">ไม่มีรายการ</div>'}
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
    
    // Render Chart (Hidden for now as requested)
    // document.getElementById('admin-chart-container').classList.remove('hidden');
    // renderAdminChart(chartLabels, chartNormalPay, chartOTPay, chartBonus, chartDeduct);
}

let payrollChartInstance = null;
function renderAdminChart(labels, normalData, otData, bonusData, deductData) {
    const ctx = document.getElementById('payrollChart').getContext('2d');
    if (payrollChartInstance) payrollChartInstance.destroy();
    
    payrollChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'ค่าจ้างปกติ', data: normalData, backgroundColor: '#34d399', stack: 'Stack 0' },
                { label: 'OT', data: otData, backgroundColor: '#fbbf24', stack: 'Stack 0' },
                { label: 'โบนัส', data: bonusData, backgroundColor: '#818cf8', stack: 'Stack 0' },
                { label: 'หักเงิน', data: deductData, backgroundColor: '#f87171', stack: 'Stack 1' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
            scales: {
                x: { stacked: true, ticks: { font: { size: 10 } } },
                y: { stacked: true, ticks: { font: { size: 10 }, callback: value => '฿' + value } }
            }
        }
    });
}

function openDeductionModal(empName, deductionId = null) {
    document.getElementById('deduction-emp-name').value = empName;
    document.getElementById('deduction-period').value = currentPeriodVal;
    document.getElementById('deduction-emp-display').innerText = empName;
    
    const title = document.getElementById('deduction-modal-title');
    const btnDel = document.getElementById('btn-delete-deduction');

    if (deductionId) {
        title.innerText = "แก้ไขรายการ";
        const d = deductions.find(x => x.id === deductionId);
        document.getElementById('deduction-id').value = d.id;
        document.getElementById('deduction-type').value = d.type || 'Advance';
        document.getElementById('deduction-reason').value = d.reason;
        document.getElementById('deduction-amount').value = d.amount;
        btnDel.classList.remove('hidden');
    } else {
        title.innerText = "รายการปรับเพิ่ม/ลดเงิน";
        document.getElementById('deduction-id').value = '';
        document.getElementById('deduction-type').value = 'Advance';
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
    const type = document.getElementById('deduction-type').value;
    const reason = document.getElementById('deduction-reason').value.trim();
    const amount = parseFloat(document.getElementById('deduction-amount').value);

    if (!reason || isNaN(amount) || amount <= 0) {
        Swal.fire("กรุณากรอกเหตุผลและจำนวนเงินให้ถูกต้อง");
        return;
    }

    const payload = {
        action: "saveDeduction",
        deduction: { id: id || null, name, period, reason, amount, type }
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
                    deductions[idx].type = type;
                }
            } else {
                deductions.push({ id: json.id, period, name, amount, reason, type });
            }
            renderAdminSummary();
        } else {
            Swal.fire("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        Swal.fire("ไม่สามารถบันทึกข้อมูลได้");
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
            Swal.fire("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        Swal.fire("ไม่สามารถลบข้อมูลได้");
    } finally {
        overlay.classList.add('hidden');
    }
}

// Admin Leaves
function renderAdminLeaves() {
    const container = document.getElementById('admin-leave-approvals');
    const list = document.getElementById('admin-leave-list');
    const badge = document.getElementById('admin-dash-leave-badge');
    const pending = leaves.filter(l => l.status === "Pending");
    
    if (pending.length === 0) {
        container.classList.remove('hidden');
        list.innerHTML = `<div class="text-center text-slate-400 py-6 text-sm">ไม่มีคำขอลางานที่รออนุมัติ</div>`;
        if (badge) badge.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    if (badge) {
        badge.innerText = pending.length;
        badge.classList.remove('hidden');
    }
    list.innerHTML = pending.map(l => `
        <div class="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-100">
            <div>
                <div class="font-black text-amber-900">${l.name} <span class="text-xs text-amber-700 font-bold ml-1">(${l.leaveType})</span></div>
                <div class="text-xs font-semibold text-amber-600 mt-0.5">${new Date(l.startDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'})} ถึง ${new Date(l.endDate).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'})}</div>
                <div class="text-[10px] text-amber-500 mt-1">เหตุผล: ${l.reason}</div>
            </div>
            <div class="flex flex-col gap-1">
                <button onclick="updateLeaveStatus('${l.id}', 'Approved')" class="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-3 py-1.5 rounded active:scale-95 transition">อนุมัติ</button>
                <button onclick="updateLeaveStatus('${l.id}', 'Rejected')" class="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1.5 rounded active:scale-95 transition">ปฏิเสธ</button>
            </div>
        </div>
    `).join('');
}

async function updateLeaveStatus(id, status) {
    const payload = { action: "updateLeaveStatus", id, status };
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังอัปเดต...";
    overlay.classList.remove('hidden');

    try {
        const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        const json = await res.json();
        if (json.status === "success") {
            let idx = leaves.findIndex(l => l.id === id);
            if (idx > -1) leaves[idx].status = status;
            renderAdminLeaves();
        } else Swal.fire("Error: " + json.message);
    } catch(e) { console.error(e); Swal.fire("เชื่อมต่อไม่สำเร็จ"); }
    finally { overlay.classList.add('hidden'); }
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

    const activeEmployees = [];
    const inactiveEmployees = [];

    employees.forEach(emp => {
        if (!emp.name.toLowerCase().includes(search) && !(emp.fullName && emp.fullName.toLowerCase().includes(search))) {
            return;
        }
        if (emp.status === "Inactive") {
            inactiveEmployees.push(emp);
        } else {
            activeEmployees.push(emp);
        }
    });

    const listToRender = currentEmpTab === 'active' ? activeEmployees : inactiveEmployees;
    
    document.getElementById('tab-emp-active').innerText = `พนักงานปัจจุบัน (${activeEmployees.length})`;
    document.getElementById('tab-emp-inactive').innerText = `พนักงานเก่า (${inactiveEmployees.length})`;

    const getSortPriority = (emp) => {
        const type = emp.employeeType || '';
        const ded = String(emp.deductionType || "").trim();
        const isSoc = (ded === "5%" || ded === "0.05" || ded.includes("5%"));
        const isTax = (ded === "3%" || ded === "0.03" || ded.includes("3%") || ded === "" || ded === "None");

        if (type === 'Full Time' && isSoc) return 1;
        if (type === 'Full Time' && isTax) return 2;
        if (type === 'Part Time' && isSoc) return 3;
        if (type === 'Part Time' && isTax) return 4;
        return 5;
    };

    const getSafeTime = (dStr) => {
        if (!dStr) return Infinity;
        const ms = new Date(dStr).getTime();
        return isNaN(ms) ? Infinity : ms;
    };

    listToRender.sort((a, b) => {
        const pA = getSortPriority(a);
        const pB = getSortPriority(b);
        if (pA !== pB) return pA - pB;
        
        const dateA = getSafeTime(a.startDate);
        const dateB = getSafeTime(b.startDate);
        if (dateA !== dateB) return dateA - dateB;
        
        return (a.name || "").localeCompare(b.name || "");
    });

    if (listToRender.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 py-8 text-sm font-medium">ไม่พบข้อมูลพนักงาน</div>';
        return;
    }

    const renderGroup = (list, isInactive) => {
        if (list.length === 0) return;
        
        list.forEach(emp => {
            const div = document.createElement('div');
            // Simplified card: only one row
            div.className = `bg-white rounded-xl p-3 flex items-center justify-between gap-3 border ${isInactive ? 'border-red-100 opacity-70' : 'border-slate-200'} shadow-sm relative transition-all hover:shadow-md cursor-pointer`;
            div.onclick = () => editEmployee(emp);
            
            let typeBadge = '';
            if (emp.employeeType === 'Full Time') {
                typeBadge = `<span class="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Full Time</span>`;
            } else if (emp.employeeType === 'Part Time') {
                typeBadge = `<span class="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Part Time</span>`;
            }

            let deductBadge = '';
            let empDedType = String(emp.deductionType || "").trim();
            if (empDedType === "5%" || empDedType === "0.05" || empDedType.includes("5%")) {
                deductBadge = `<span class="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded">ประกันสังคม</span>`;
            } else if (empDedType === "3%" || empDedType === "0.03" || empDedType.includes("3%") || empDedType === "" || empDedType === "None") {
                deductBadge = `<span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded">หักภาษี 3%</span>`;
            }

            let avatarHtml = emp.photo ? 
                `<img src="${emp.photo}" class="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-slate-100">` : 
                `<div class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold shrink-0 border-2 border-slate-100 text-lg">${(emp.name || '?').charAt(0)}</div>`;

            div.innerHTML = `
                <div class="flex items-center gap-3 overflow-hidden">
                    ${avatarHtml}
                    <div class="flex flex-col justify-center min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <div class="text-[15px] font-black text-slate-900 truncate">
                                ${emp.name || '-'}
                            </div>
                            <div class="flex items-center gap-1">
                                ${typeBadge}
                                ${deductBadge}
                            </div>
                        </div>
                        ${emp.fullName ? `<div class="text-[12px] text-slate-500 font-medium truncate mt-0.5">${emp.fullName}</div>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <div class="text-right">
                        <div class="text-[10px] font-bold text-slate-400 uppercase">รายวัน</div>
                        <div class="font-black text-slate-800 text-[13px]">${emp.dailyRate ? emp.dailyRate + '฿' : '-'}</div>
                    </div>
                    <div class="text-slate-400">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    };
    
    renderGroup(listToRender, currentEmpTab === 'inactive');
}

function switchEmpTab(tab) {
    currentEmpTab = tab;
    const btnActive = document.getElementById('tab-emp-active');
    const btnInactive = document.getElementById('tab-emp-inactive');
    
    if (tab === 'active') {
        btnActive.classList.add('bg-slate-700', 'shadow-sm', 'text-white');
        btnActive.classList.remove('text-slate-400');
        btnInactive.classList.remove('bg-slate-700', 'shadow-sm', 'text-white');
        btnInactive.classList.add('text-slate-400');
    } else {
        btnInactive.classList.add('bg-slate-700', 'shadow-sm', 'text-white');
        btnInactive.classList.remove('text-slate-400');
        btnActive.classList.remove('bg-slate-700', 'shadow-sm', 'text-white');
        btnActive.classList.add('text-slate-400');
    }
    
    renderAdminEmployees();
}

function toggleEmpSearch() {
    const container = document.getElementById('emp-search-container');
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        container.classList.add('flex');
        document.getElementById('emp-search-input').focus();
    } else {
        container.classList.add('hidden');
        container.classList.remove('flex');
        document.getElementById('emp-search-input').value = '';
        renderAdminEmployees();
    }
}

let currentEmployeePhotoBase64 = "";

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const max_size = 150;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > max_size) {
                    height *= max_size / width;
                    width = max_size;
                }
            } else {
                if (height > max_size) {
                    width *= max_size / height;
                    height = max_size;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            currentEmployeePhotoBase64 = canvas.toDataURL('image/jpeg', 0.6);
            document.getElementById('emp-photo-preview').src = currentEmployeePhotoBase64;
            document.getElementById('emp-photo-preview').classList.remove('hidden');
            document.getElementById('emp-photo-placeholder').classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function openEmployeeModal() {
    document.getElementById('employee-modal-title').innerText = "เพิ่มพนักงานใหม่";
    document.getElementById('old-nickname').value = "";
    document.getElementById('old-fullname').value = "";
    
    document.getElementById('emp-nickname').value = "";
    document.getElementById('emp-fullname').value = "";
    document.getElementById('emp-pin').value = "1234";
    document.getElementById('emp-monthlyrate').value = "";
    document.getElementById('emp-dailyrate').value = "";
    document.getElementById('emp-hourlyrate').value = "";
    document.getElementById('emp-otrate').value = "";
    document.getElementById('emp-deductiontype').value = "3%";
    document.getElementById('emp-bank').value = "";
    document.getElementById('emp-type').value = "Full Time";
    document.getElementById('emp-status').value = "Active";
    
    updateEmployeeFormLayout();
    
    document.getElementById('btn-delete-employee').classList.add('hidden');

    currentEmployeePhotoBase64 = "";
    document.getElementById('emp-photo-preview').src = "";
    document.getElementById('emp-photo-preview').classList.add('hidden');
    document.getElementById('emp-photo-placeholder').classList.remove('hidden');
    document.getElementById('emp-photo-upload').value = "";

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
    document.getElementById('emp-monthlyrate').value = emp.monthlyRate || "";
    document.getElementById('emp-dailyrate').value = emp.dailyRate || "";
    document.getElementById('emp-hourlyrate').value = emp.normalRate || "";
    document.getElementById('emp-otrate').value = emp.otRate || "";
    document.getElementById('emp-deductiontype').value = emp.deductionType || "3%";
    document.getElementById('emp-bank').value = emp.bankAccount || "";
    document.getElementById('emp-type').value = emp.employeeType || "Full Time";
    document.getElementById('emp-status').value = emp.status || "Active";
    
    updateEmployeeFormLayout();
    
    const delBtn = document.getElementById('btn-delete-employee');
    delBtn.classList.remove('hidden');
    delBtn.setAttribute('onclick', `openDeleteModal('${emp.name}', '${emp.fullName || ''}')`);

    currentEmployeePhotoBase64 = emp.photo || "";
    if (currentEmployeePhotoBase64) {
        document.getElementById('emp-photo-preview').src = currentEmployeePhotoBase64;
        document.getElementById('emp-photo-preview').classList.remove('hidden');
        document.getElementById('emp-photo-placeholder').classList.add('hidden');
    } else {
        document.getElementById('emp-photo-preview').src = "";
        document.getElementById('emp-photo-preview').classList.add('hidden');
        document.getElementById('emp-photo-placeholder').classList.remove('hidden');
    }
    document.getElementById('emp-photo-upload').value = "";

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
    if (!nickname) return Swal.fire("กรุณากรอกชื่อเล่น");

    const empObj = {
        name: nickname, // 'name' corresponds to nickname in data structure
        nickname: nickname,
        fullName: document.getElementById('emp-fullname').value.trim(),
        pin: document.getElementById('emp-pin').value.trim(),
        monthlyRate: parseFloat(document.getElementById('emp-monthlyrate').value) || 0,
        dailyRate: parseFloat(document.getElementById('emp-dailyrate').value) || 0,
        normalRate: parseFloat(document.getElementById('emp-hourlyrate').value) || 0,
        otRate: parseFloat(document.getElementById('emp-otrate').value) || 0,
        deductionType: document.getElementById('emp-deductiontype').value,
        bankAccount: document.getElementById('emp-bank').value.trim(),
        employeeType: document.getElementById('emp-type').value,
        status: document.getElementById('emp-status').value,
        advancePayment: 0,
        photo: currentEmployeePhotoBase64
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
                nickname: empObj.nickname,
                fullName: empObj.fullName,
                pin: empObj.pin,
                monthlyRate: empObj.monthlyRate,
                dailyRate: empObj.dailyRate,
                hourlyRate: empObj.normalRate,
                otRate: empObj.otRate,
                deductionType: empObj.deductionType,
                bankAccount: empObj.bankAccount,
                employeeType: empObj.employeeType,
                status: empObj.status,
                advancePayment: empObj.advancePayment,
                photo: empObj.photo
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
            const countEl = document.getElementById('emp-setup-count');
            if (countEl) countEl.innerText = employees.length;
            renderAdminEmployees();
        } else {
            Swal.fire("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        Swal.fire("Failed to connect to server. Details: " + e.message);
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
            const countEl = document.getElementById('emp-setup-count');
            if (countEl) countEl.innerText = employees.length;
            renderAdminEmployees();
        } else {
            Swal.fire("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        Swal.fire("Failed to connect to server. Details: " + e.message);
    } finally {
        overlay.classList.add('hidden');
    }
}

// ----------------------------------------------------
// Employee Leave System
// ----------------------------------------------------
// Employee Profile & Slip System
// ----------------------------------------------------
let monthlySlips = [];

function openProfile(pushToHistory = true) {
    showView('view-profile', pushToHistory);
    
    // Setup Profile Header
    const initialSpan = document.getElementById('profile-user-initial');
    const photoImg = document.getElementById('profile-user-photo');
    if (loggedInEmployee.photo) {
        photoImg.src = loggedInEmployee.photo;
        photoImg.classList.remove('hidden');
        initialSpan.classList.add('hidden');
    } else {
        photoImg.src = "";
        photoImg.classList.add('hidden');
        initialSpan.classList.remove('hidden');
        initialSpan.innerText = loggedInEmployee.name.charAt(0);
    }

    if (loggedInEmployee.fullName) {
        document.getElementById('profile-user-fullname').innerText = `${loggedInEmployee.name} (${loggedInEmployee.fullName})`;
    } else {
        document.getElementById('profile-user-fullname').innerText = loggedInEmployee.name;
    }
    document.getElementById('profile-user-type').innerText = loggedInEmployee.employeeType || 'พนักงาน';
    document.getElementById('profile-user-bank').innerText = loggedInEmployee.bankAccount || 'ยังไม่ระบุเลขบัญชี';

    calculateMonthlySlips();
    renderSlips();

    // Work History calculation
    let totalHours = 0;
    let totalIncome = 0;
    monthlySlips.forEach(s => {
        totalHours += (s.regularHours + s.otHours);
        totalIncome += s.netPay;
    });

    document.getElementById('profile-total-hours').innerText = formatMoney(totalHours);
    document.getElementById('profile-total-income').innerText = formatMoney(totalIncome);

    // Calculate tenure
    const startDateStr = loggedInEmployee.startDate || '';
    const startDateEl = document.getElementById('profile-start-date');
    const tenureEl = document.getElementById('profile-tenure');
    
    if (startDateStr) {
        // Try parsing assuming ISO format or Google Sheets standard date string
        const startDateObj = new Date(startDateStr);
        if (!isNaN(startDateObj.getTime())) {
            startDateEl.innerText = startDateObj.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
            
            const now = new Date();
            
            if (startDateObj > now) {
                tenureEl.innerText = '-';
            } else {
                let years = now.getFullYear() - startDateObj.getFullYear();
                let months = now.getMonth() - startDateObj.getMonth();
                let days = now.getDate() - startDateObj.getDate();

                if (days < 0) {
                    months--;
                    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    days += prevMonth.getDate();
                }
                
                if (months < 0) {
                    years--;
                    months += 12;
                }

                let totalMonths = (years * 12) + months;
                
                if (totalMonths === 0 && days === 0) {
                    tenureEl.innerText = 'เริ่มงานวันนี้';
                } else {
                    let parts = [];
                    if (totalMonths > 0) parts.push(`${totalMonths} เดือน`);
                    parts.push(`${days} วัน`);
                    tenureEl.innerText = parts.join(' ');
                }
            }
        } else {
            startDateEl.innerText = startDateStr;
            tenureEl.innerText = '-';
        }
    } else {
        startDateEl.innerText = 'ยังไม่ระบุ';
        tenureEl.innerText = 'ยังไม่ระบุ';
    }
}

function formatMoney(num) {
    if (!num) return "0.00";
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calculateMonthlySlips() {
    if (!loggedInEmployee) return;
    
    const slipsMap = {}; // Key: "YYYY-MM"
    
    // Process Attendance
    const myAttendance = processedAttendance.filter(a => a.name === loggedInEmployee.name);
    myAttendance.forEach(a => {
        if (!a.dateObj) return;
        let yyyy = a.dateObj.getFullYear();
        let mm = String(a.dateObj.getMonth() + 1).padStart(2, '0');
        let key = `${yyyy}-${mm}`;
        
        if (!slipsMap[key]) {
            slipsMap[key] = {
                monthStr: key,
                monthName: a.dateObj.toLocaleString('th-TH', { month: 'long', year: 'numeric' }),
                regularHours: 0,
                otHours: 0,
                lateDeduction: 0,
                otherDeductions: 0
            };
        }
        
        slipsMap[key].regularHours += (a.regularHours || 0);
        slipsMap[key].otHours += (a.otHours || 0);
        slipsMap[key].lateDeduction += (a.lateDeduction || 0);
    });

    // Add explicit deductions from deductions array
    if (typeof deductions !== 'undefined') {
        const myDeductions = deductions.filter(d => d.name === loggedInEmployee.name);
        myDeductions.forEach(d => {
            // d.period looks like "2026-06-1" or "2026-06-2"
            let parts = d.period.split('-');
            if (parts.length >= 2) {
                let key = `${parts[0]}-${parts[1].padStart(2, '0')}`;
                if (!slipsMap[key]) {
                    // Create empty if no attendance exists
                    let dObj = new Date(parseInt(parts[0]), parseInt(parts[1])-1, 1);
                    slipsMap[key] = {
                        monthStr: key,
                        monthName: dObj.toLocaleString('th-TH', { month: 'long', year: 'numeric' }),
                        regularHours: 0,
                        otHours: 0,
                        lateDeduction: 0,
                        otherDeductions: 0
                    };
                }
                slipsMap[key].otherDeductions += d.amount;
            }
        });
    }

    monthlySlips = Object.values(slipsMap).sort((a, b) => b.monthStr.localeCompare(a.monthStr));
    
    // Calculate final pay
    const rate = loggedInEmployee.normalRate || 0;
    const otRate = loggedInEmployee.otRate || 0;
    
    monthlySlips.forEach(s => {
        s.grossPay = (s.regularHours * rate) + (s.otHours * otRate);
        s.totalDeductions = s.lateDeduction + s.otherDeductions;
        s.netPay = s.grossPay - s.totalDeductions;
        s.rate = rate;
        s.otRate = otRate;
    });
}

function renderSlips() {
    const list = document.getElementById('profile-slips-list');
    if (!list) return;
    
    if (monthlySlips.length === 0) {
        list.innerHTML = `<div class="text-center py-8 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl border border-slate-100">ไม่พบประวัติสลิปเงินเดือน</div>`;
        return;
    }
    
    let html = '';
    monthlySlips.forEach((s, idx) => {
        html += `<div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between shadow-sm">
            <div>
                <div class="font-bold text-slate-800 text-sm">${s.monthName}</div>
                <div class="text-xs text-slate-500 mt-1">รับสุทธิ: <span class="font-bold text-emerald-600">${formatMoney(s.netPay)}</span> ฿</div>
            </div>
            <button onclick="printSlip(${idx})" class="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 active:scale-95 transition-transform">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </button>
        </div>`;
    });
    list.innerHTML = html;
}

function printSlip(idx) {
    const s = monthlySlips[idx];
    if (!s) return;
    
    // Create print iframe or popup window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        Swal.fire("กรุณาอนุญาต Pop-up เพื่อเปิดสลิปเงินเดือน");
        return;
    }

    const html = `
    <html>
    <head>
        <title>สลิปเงินเดือน ${s.monthName}</title>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Sarabun', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .slip-container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .header h1 { margin: 0 0 5px 0; font-size: 24px; color: #111; }
            .header p { margin: 0; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .info-item { font-size: 14px; }
            .info-label { font-weight: bold; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; font-size: 14px; }
            th { background-color: #f8f9fa; font-weight: bold; text-align: center; }
            td:first-child, th:first-child { text-align: left; }
            .total-row { font-weight: bold; background-color: #f1f5f9; }
            .net-row { font-weight: bold; background-color: #e2e8f0; font-size: 16px; color: #0f172a; }
            .footer { text-align: center; font-size: 12px; color: #888; margin-top: 40px; }
            
            @media print {
                body { padding: 0; }
                .slip-container { border: none; box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="slip-container">
            <div class="header">
                <h1>ใบรับรองเงินเดือน (Payslip)</h1>
                <p>ประจำเดือน ${s.monthName}</p>
            </div>
            
            <div class="info-grid">
                <div class="info-item"><span class="info-label">ชื่อพนักงาน:</span> ${loggedInEmployee.fullName || loggedInEmployee.name}</div>
                <div class="info-item"><span class="info-label">ตำแหน่ง/ประเภท:</span> ${loggedInEmployee.type || 'พนักงานทั่วไป'}</div>
                <div class="info-item"><span class="info-label">เลขที่บัญชี:</span> ${loggedInEmployee.bankAccount || '-'}</div>
                <div class="info-item"><span class="info-label">วันที่ออกเอกสาร:</span> ${new Date().toLocaleDateString('th-TH')}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>รายการ (Description)</th>
                        <th>จำนวน (Qty)</th>
                        <th>จำนวนเงิน (Amount)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>ค่าจ้างปกติ (เรท ${s.rate} ฿/ชม.)</td>
                        <td>${s.regularHours.toFixed(2)} ชม.</td>
                        <td>${formatMoney(s.regularHours * s.rate)} ฿</td>
                    </tr>
                    <tr>
                        <td>ค่าล่วงเวลา OT (เรท ${s.otRate} ฿/ชม.)</td>
                        <td>${s.otHours.toFixed(2)} ชม.</td>
                        <td>${formatMoney(s.otHours * s.otRate)} ฿</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="2" style="text-align: right;">รวมรายได้ (Gross Pay)</td>
                        <td>${formatMoney(s.grossPay)} ฿</td>
                    </tr>
                    <tr>
                        <td>หักสาย/ขาดงาน</td>
                        <td>-</td>
                        <td>-${formatMoney(s.lateDeduction)} ฿</td>
                    </tr>
                    <tr>
                        <td>หักอื่นๆ</td>
                        <td>-</td>
                        <td>-${formatMoney(s.otherDeductions)} ฿</td>
                    </tr>
                    <tr class="total-row">
                        <td colspan="2" style="text-align: right;">รวมรายการหัก (Total Deductions)</td>
                        <td style="color: #dc2626;">-${formatMoney(s.totalDeductions)} ฿</td>
                    </tr>
                    <tr class="net-row">
                        <td colspan="2" style="text-align: right;">รายได้สุทธิ (Net Pay)</td>
                        <td style="color: #16a34a;">${formatMoney(s.netPay)} ฿</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="footer">
                เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติ (Sainomkaset Web App)
            </div>
        </div>
        <script>
            window.onload = function() { window.print(); };
        </script>
    </body>
    </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
}

function openLeave(pushToHistory = true) {
    showView('view-leave', pushToHistory);
    renderEmployeeLeaves();
}

// ----------------------------------------------------
function renderEmployeeLeaves() {
    const list = document.getElementById('leave-history-list');
    
    if (!loggedInEmployee || !list) return;

    let myLeaves = leaves.filter(l => l.name === loggedInEmployee.name);
    
    if (myLeaves.length === 0) {
        list.innerHTML = `<div class="text-center py-6 text-slate-400 text-sm">ไม่พบประวัติการลางาน</div>`;
        return;
    }
    
    let html = '';
    myLeaves.forEach(l => {
        let statusBadge = '';
        if (l.status === 'Pending') statusBadge = '<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">รออนุมัติ</span>';
        else if (l.status === 'Approved') statusBadge = '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">อนุมัติ</span>';
        else statusBadge = '<span class="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">ปฏิเสธ</span>';

        html += `<div class="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50 mb-2">
            <div class="text-left">
                <div class="font-bold text-slate-800 text-sm">${l.leaveType || l.type} <span class="font-normal text-slate-500 text-xs ml-1">(${new Date(l.startDate || l.start).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'})} ถึง ${new Date(l.endDate || l.end).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: 'numeric'})})</span></div>
                <div class="text-xs text-slate-500 mt-1">เหตุผล: ${l.reason}</div>
            </div>
            <div>${statusBadge}</div>
        </div>`;
    });
    list.innerHTML = html;
}

function openRequestLeaveModal() {
    const overlay = document.getElementById('leave-modal');
    const box = document.getElementById('leave-modal-box');
    if (!overlay) return;
    overlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
    setTimeout(() => box.classList.remove('scale-95'), 10);
}

function closeRequestLeaveModal() {
    const overlay = document.getElementById('leave-modal');
    const box = document.getElementById('leave-modal-box');
    if (!overlay) return;
    box.classList.add('scale-95');
    setTimeout(() => overlay.classList.add('hidden', 'opacity-0', 'pointer-events-none'), 300);
}

async function submitLeaveRequest() {
    const type = document.getElementById('leave-type').value;
    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value;

    if (!start || !end || !reason) {
        Swal.fire("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    const payload = {
        action: "requestLeave",
        leave: {
            id: crypto.randomUUID(),
            name: loggedInEmployee.name,
            leaveType: type,
            startDate: start,
            endDate: end,
            reason: reason,
            status: "Pending",
            timestamp: new Date().toISOString()
        }
    };

    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังส่งคำขอ...";
    overlay.classList.remove('hidden');

    try {
        let res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        let json = await res.json();
        if (json.status === "success") {
            // Update local leaves array
            leaves.push(payload.leave);
            
            // Clear form
            document.getElementById('leave-type').value = 'ลาป่วย';
            document.getElementById('leave-start').value = '';
            document.getElementById('leave-end').value = '';
            document.getElementById('leave-reason').value = '';
            
            renderEmployeeLeaves();
            
            overlay.classList.add('hidden');
            Swal.fire("ส่งคำขอลางานเรียบร้อยแล้ว");
        } else {
            overlay.classList.add('hidden');
            Swal.fire("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        Swal.fire("เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว");
    } finally {
        overlay.classList.add('hidden');
    }
}

// ----------------------------------------------------
// PDF Generation
// ----------------------------------------------------
function downloadPayslipPdf() {
    if (!loggedInEmployee || !currentPeriodVal) return;
    
    const element = document.getElementById('salary-summary-container');
    if (!element) return;

    const opt = {
        margin:       10,
        filename:     `Payslip_${loggedInEmployee.name}_${currentPeriodVal}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังสร้าง PDF...";
    overlay.classList.remove('hidden');

    html2pdf().set(opt).from(element).save().then(() => {
        overlay.classList.add('hidden');
    }).catch(e => {
        console.error(e);
        Swal.fire("เกิดข้อผิดพลาดในการสร้าง PDF");
        overlay.classList.add('hidden');
    });
}

// ----------------------------------------------------
// Scroll Effects
// ----------------------------------------------------

function updateEmployeeFormLayout() {
    const type = document.getElementById('emp-type').value;
    const monthlyWrapper = document.getElementById('emp-monthly-wrapper');
    const hintContainer = document.getElementById('emp-hint-container');
    
    if (type === 'Full Time') {
        if(monthlyWrapper) {
            monthlyWrapper.classList.remove('hidden');
            monthlyWrapper.classList.add('grid');
        }
        if(hintContainer) hintContainer.classList.remove('hidden');
    } else {
        if(monthlyWrapper) {
            monthlyWrapper.classList.add('hidden');
            monthlyWrapper.classList.remove('grid');
        }
        if(hintContainer) hintContainer.classList.remove('hidden');
    }
    calculateRates();
}

function calculateRates() {
    // Calculate Half Month (for Full Time)
    const monthlyRate = parseFloat(document.getElementById('emp-monthlyrate').value) || 0;
    const halfMonth = (monthlyRate / 2).toFixed(2);
    const hintHalfmonth = document.getElementById('hint-halfmonth');
    if (hintHalfmonth) hintHalfmonth.innerText = halfMonth;

    // Calculate Hourly and OT (for both Full Time and Part Time)
    const dailyRate = parseFloat(document.getElementById('emp-dailyrate').value) || 0;
    const hourlyRate = dailyRate / 8; // Assuming 8 hours
    const otRate = hourlyRate * 1.5;
    
    const hintHourly = document.getElementById('hint-hourly');
    const hintOt = document.getElementById('hint-ot');
    if(hintHourly) hintHourly.innerText = hourlyRate ? hourlyRate.toFixed(2) : '0';
    if(hintOt) hintOt.innerText = otRate ? otRate.toFixed(2) : '0';
    
    // Update hidden inputs for saving
    const empHourlyRate = document.getElementById('emp-hourlyrate');
    const empOtRate = document.getElementById('emp-otrate');
    if (empHourlyRate) empHourlyRate.value = hourlyRate ? hourlyRate.toFixed(2) : '';
    if (empOtRate) empOtRate.value = otRate ? otRate.toFixed(2) : '';
}

window.addEventListener('scroll', () => {
    const tableHeader = document.getElementById('employee-table-header');
    const periodCard = document.getElementById('period-selector-card');
    
    if (tableHeader && periodCard) {
        const rect = tableHeader.getBoundingClientRect();
        // The table header is sticky at top: 76px. When rect.top is <= 77, they touch.
        if (rect.top <= 77) {
            periodCard.classList.remove('rounded-[20px]');
            periodCard.classList.add('rounded-t-[20px]', 'rounded-b-none');
            tableHeader.classList.remove('rounded-t-lg');
        } else {
            periodCard.classList.remove('rounded-t-[20px]', 'rounded-b-none');
            periodCard.classList.add('rounded-[20px]');
            tableHeader.classList.add('rounded-t-lg');
        }
    }
});
// Time Logs Module
let currentLogsEmp = null;
let currentLogsData = [];

async function openTimeLogsModal(nickname) {
    currentLogsEmp = employees.find(e => e.name === nickname);
    if (!currentLogsEmp) return;
    
    let firstName = currentLogsEmp.fullName ? currentLogsEmp.fullName.trim().split(' ')[0] : '';
    let periodText = availablePeriods.find(p => p.value === currentPeriodVal)?.text || '';
    document.getElementById('timelogs-title').innerHTML = `<span class="ml-2">${currentLogsEmp.name}</span> <span class="text-base font-medium text-slate-500 ml-1 font-normal">${firstName} (${periodText})</span>`;
    
    const modal = document.getElementById('timelogs-modal');
    const modalBox = document.getElementById('timelogs-modal-box');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        modalBox.classList.remove('translate-y-full', 'sm:scale-95');
        modalBox.classList.add('sm:scale-100');
    }, 10);
    
    await fetchTimeLogs(currentLogsEmp.name);
}

function closeTimeLogsModal() {
    const modal = document.getElementById('timelogs-modal');
    const modalBox = document.getElementById('timelogs-modal-box');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modalBox.classList.remove('sm:scale-100');
    modalBox.classList.add('translate-y-full', 'sm:scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function fetchTimeLogs(nickname) {
    if (!currentPeriodVal) return;
    const parts = currentPeriodVal.split('_');
    const mStr = parts[1]; // e.g. "2026-06"
    const [year, month] = mStr.split('-');
    
    document.getElementById('timelogs-content').innerHTML = `
        <div class="flex justify-center items-center py-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    `;
    
    currentLogsData = [];
    const targetMonth = parseInt(month, 10);
    const targetYear = parseInt(year, 10);
    
    // Group from processedAttendance
    processedAttendance.forEach(rec => {
        if (rec.name === nickname && rec.dateObj.getMonth() + 1 === targetMonth && rec.dateObj.getFullYear() === targetYear) {
            let inStr = rec.inTime ? `${String(rec.inTime.getHours()).padStart(2, '0')}:${String(rec.inTime.getMinutes()).padStart(2, '0')}` : '';
            let outStr = rec.outTime ? `${String(rec.outTime.getHours()).padStart(2, '0')}:${String(rec.outTime.getMinutes()).padStart(2, '0')}` : '';
            
            let existing = currentLogsData.find(x => x.date === rec.date);
            if (!existing) {
                currentLogsData.push({
                    date: rec.date,
                    in: inStr,
                    out: outStr,
                    scheduledIn: rec.scheduledIn && rec.scheduledIn !== '-' ? rec.scheduledIn : '',
                    scheduledOut: rec.scheduledOut && rec.scheduledOut !== '-' ? rec.scheduledOut : '',
                    type: 'Work'
                });
            } else {
                if (inStr) existing.in = inStr;
                if (outStr) existing.out = outStr;
            }
        }
    });

    // Add leaves
    leaves.forEach(l => {
        if (l.name === nickname && l.status === 'Approved') {
            let sDate = new Date(l.startDate);
            let eDate = new Date(l.endDate);
            for (let d = new Date(sDate); d <= eDate; d.setDate(d.getDate() + 1)) {
                if (d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear) {
                    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    let existing = currentLogsData.find(x => x.date === dateStr);
                    if (!existing) {
                        currentLogsData.push({
                            date: dateStr,
                            in: '',
                            out: '',
                            type: l.leaveType === 'ลาป่วย' ? 'Leave_Paid' : (l.leaveType === 'ลากิจ (ได้ค่าแรง)' ? 'Leave_Paid' : 'Leave_Unpaid')
                        });
                    } else {
                        existing.type = l.leaveType === 'ลาป่วย' ? 'Leave_Paid' : (l.leaveType === 'ลากิจ (ได้ค่าแรง)' ? 'Leave_Paid' : 'Leave_Unpaid');
                    }
                }
            }
        }
    });

    currentLogsData = currentLogsData.filter(log => log.in || log.out);
    currentLogsData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    setTimeout(() => {
        renderTimeLogs();
    }, 100);
}

function renderTimeLogs() {
    const container = document.getElementById('timelogs-content');
    
    let html = ``;
    
    if (currentLogsData.length === 0) {
        html += `<div class="text-center py-10 text-slate-400 font-bold text-sm bg-white rounded-xl border border-slate-200">ไม่พบประวัติในเดือนนี้</div>`;
    } else {
        html += `
        <div class="border border-slate-200 rounded-xl bg-white shadow-sm">
            <div id="employee-table-header" class="table-grid font-bold text-white bg-slate-800/95 backdrop-blur-md text-[12px] py-2.5 px-1 text-center shadow-md sticky top-0 z-40 border-b border-slate-700 rounded-t-xl">
                <div class="text-left pl-2">วันที่</div>
                <div>เข้างาน</div>
                <div>ออกงาน</div>
                <div class="leading-tight">พัก<br>ชม.</div>
                <div class="leading-tight">ปกติ<br>ชม.</div>
                <div class="leading-tight">OT<br>ชม.</div>
            </div>
            <div class="bg-white">
        `;
        
        function formatTime(tStr) {
            if (!tStr || tStr === '-') return '';
            return tStr;
        }

        currentLogsData.forEach((log, i) => {
            const isLeave = log.type && log.type.includes("Leave");
            const dateObj = new Date(log.date);
            const dayNum = String(dateObj.getDate()).padStart(2, '0');
            const monthNum = String(dateObj.getMonth()+1).padStart(2, '0');
            const yearNum = dateObj.getFullYear().toString().substr(-2);
            const shortDateStr = `${dayNum}/${monthNum}/${yearNum}`;
            const dayStr = dateObj.toLocaleDateString('th-TH', { weekday: 'long' });
            
            let breakHrs = '';
            let normalHrs = '';
            let otHrs = '';
            let bgColor = (i % 2 === 0) ? 'bg-white' : 'bg-slate-50';
            
            if (dateObj.getDay() === 0) {
                bgColor = 'bg-rose-50/30';
            }
            
            if (log.in && log.out && !isLeave) {
                let t1 = new Date(`2000-01-01T${log.in}:00`);
                let t2 = new Date(`2000-01-01T${log.out}:00`);
                if (t2 < t1) t2.setDate(t2.getDate() + 1);
                let diffMs = t2 - t1;
                let diffHrs = diffMs / (1000 * 60 * 60);

                if (diffHrs >= 9) {
                    breakHrs = 1;
                    normalHrs = 8.0;
                    otHrs = diffHrs - 9;
                } else if (diffHrs > 5) {
                    breakHrs = 1;
                    normalHrs = diffHrs - 1;
                } else {
                    normalHrs = diffHrs;
                }
                
                if (otHrs === 0) otHrs = '';
            }

            let leaveBadge = '';
            let rowClass = 'data-row px-1 py-3 cursor-pointer hover:bg-slate-100 transition relative ';
            if (isLeave) {
                leaveBadge = `<span class="text-[10px] ${log.type === 'Leave_Paid' ? 'text-emerald-600 bg-emerald-50' : 'text-orange-600 bg-orange-50'} px-2 py-0.5 rounded mt-1 inline-block">ลา</span>`;
                rowClass += log.type === 'Leave_Paid' ? 'border-l-4 border-emerald-500' : 'border-l-4 border-orange-500';
            }

            let inStr = formatTime(log.in);
            let outStr = formatTime(log.out);
            const schedInStr = log.scheduledIn && log.scheduledIn !== '-' ? log.scheduledIn : '';
            const schedOutStr = log.scheduledOut && log.scheduledOut !== '-' ? log.scheduledOut : '';
            
            let schedInClass = `font-black text-[13px] text-slate-800`;
            let schedOutClass = `font-black text-[13px] text-slate-800`;
            let inClass = `scan-time-text text-[11px] font-medium mt-1 text-slate-500`;
            let outClass = `scan-time-text text-[11px] font-medium mt-1 text-slate-500`;

            html += `
            <div onclick="openEditLogModal('${log.date}', '${log.scheduledIn || ''}', '${log.scheduledOut || ''}', '${log.type || 'Work'}')" class="${rowClass} ${bgColor}">
                <div class="table-grid text-[13px]">
                    <div class="flex flex-col text-left pl-2 justify-start">
                        <span class="font-black text-[13px] text-indigo-900 leading-tight date-text">${shortDateStr}</span>
                        <span class="text-[11px] text-slate-500 font-medium leading-tight day-text mt-1">${dayStr}</span>
                        ${leaveBadge}
                    </div>
                    
                    <div class="text-center flex flex-col items-center justify-start">
                        <span class="${schedInClass}">${schedInStr || inStr || '-'}</span>
                        <span class="${inClass}">${schedInStr && inStr ? inStr : ''}</span>
                    </div>
                    
                    <div class="text-center flex flex-col items-center justify-start">
                        <span class="${schedOutClass}">${schedOutStr || outStr || '-'}</span>
                        <span class="${outClass}">${schedOutStr && outStr ? outStr : ''}</span>
                    </div>
                    
                    <div class="text-center flex flex-col items-center justify-start pt-[2px]">
                        <span class="text-slate-600 font-medium">${breakHrs || ''}</span>
                    </div>
                    
                    <div class="text-center flex flex-col items-center justify-start font-black pt-[1px] ${normalHrs > 0 ? 'text-blue-600' : 'text-slate-400'}">${normalHrs > 0 ? Number(normalHrs).toFixed(1) : ''}</div>
                    
                    <div class="text-center flex flex-col items-center justify-start font-black pt-[1px] ${otHrs > 0 ? 'text-orange-500' : 'text-slate-400'}">${otHrs > 0 ? Number(otHrs).toFixed(1) : ''}</div>
                </div>
            </div>`;
        });
        
        html += `
            </div>
        </div>
        `;
    }
    
    container.innerHTML = html;
}
// Time Logs Modals and Logic
window.submitEditLogModal = function() {
    const data = {
        date: document.getElementById('swal-log-date').value,
        type: document.getElementById('swal-log-type').value,
        in: document.getElementById('swal-log-in').value,
        out: document.getElementById('swal-log-out').value
    };
    if (!data.date) return Swal.fire("กรุณาเลือกวันที่");
    Swal.close();
    saveEmployeeLog(data, "update");
};

window.submitDeleteLogModal = function(dateStr) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "ลบประวัติของวันนี้ใช่หรือไม่?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'ใช่, ลบเลย'
    }).then((del) => {
        if (del.isConfirmed) saveEmployeeLog({date: dateStr}, "delete");
    });
};

function openEditLogModal(dateStr = '', timeIn = '', timeOut = '', type = 'Work') {
    Swal.fire({
        showConfirmButton: false,
        showCancelButton: false,
        customClass: {
            popup: 'rounded-[24px]',
            htmlContainer: '!m-0 !p-2'
        },
        html: `
            <div class="text-center mb-6 mt-2">
                <h3 class="text-xl font-bold text-slate-800">${dateStr ? 'แก้ไขเวลาเข้าออก' : 'เพิ่มเวลา / ลา'}</h3>
            </div>
            <div class="space-y-4 text-left px-2 pb-2">
                <div>
                    <label class="block text-[13px] font-bold text-slate-700 mb-1.5">วันที่ (YYYY-MM-DD)</label>
                    <div class="relative">
                        <input type="date" id="swal-log-date" class="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" value="${dateStr}">
                    </div>
                </div>
                <div>
                    <label class="block text-[13px] font-bold text-slate-700 mb-1.5">ประเภท</label>
                    <div class="relative">
                        <select id="swal-log-type" class="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition appearance-none" onchange="document.getElementById('swal-time-inputs').style.display = this.value === 'Work' ? 'block' : 'none'">
                            <option value="Work" ${type === 'Work' ? 'selected' : ''}>มาทำงาน</option>
                            <option value="Leave_Paid" ${type === 'Leave_Paid' ? 'selected' : ''}>ลา (ได้ค่าแรง)</option>
                            <option value="Leave_Unpaid" ${type === 'Leave_Unpaid' ? 'selected' : ''}>ลา (หักค่าแรง)</option>
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
                <div id="swal-time-inputs" style="display: ${type === 'Work' ? 'block' : 'none'};">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[13px] font-bold text-slate-700 mb-1.5">เวลาเข้า (HH:mm)</label>
                            <input type="time" id="swal-log-in" class="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" value="${timeIn}">
                        </div>
                        <div>
                            <label class="block text-[13px] font-bold text-slate-700 mb-1.5">เวลาออก (HH:mm)</label>
                            <input type="time" id="swal-log-out" class="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" value="${timeOut}">
                        </div>
                    </div>
                </div>
                
                <div class="pt-5 pb-2">
                    ${dateStr ? `
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="submitEditLogModal()" class="w-full bg-[#5b52f6] hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition active:scale-95 text-base tracking-wide">บันทึก</button>
                        <button onclick="submitDeleteLogModal('${dateStr}')" class="w-full bg-[#ef4444] hover:bg-rose-600 text-white font-bold py-3 rounded-xl shadow-sm transition active:scale-95 text-base tracking-wide">ลบรายการ</button>
                    </div>
                    <div class="mt-4 flex justify-center">
                        <button onclick="Swal.close()" class="w-32 bg-[#6b7280] hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-sm transition active:scale-95 text-base tracking-wide">ยกเลิก</button>
                    </div>
                    ` : `
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="submitEditLogModal()" class="w-full bg-[#5b52f6] hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-sm transition active:scale-95 text-base tracking-wide">บันทึก</button>
                        <button onclick="Swal.close()" class="w-full bg-[#6b7280] hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-sm transition active:scale-95 text-base tracking-wide">ยกเลิก</button>
                    </div>
                    `}
                </div>
            </div>
        `
    });
}

async function saveEmployeeLog(data, actionType) {
    if (!currentLogsEmp) return;
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').innerText = "กำลังบันทึก...";
    overlay.classList.remove('hidden');
    
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "updateEmployeeLog",
                nickname: currentLogsEmp.name,
                date: data.date,
                type: data.type,
                in: data.in,
                out: data.out,
                actionType: actionType
            })
        });
        const json = await res.json();
        if (json.status === "success") {
            // Need to reload attendance data
            // We can just call init() to refresh everything or just fetchTimeLogs again
            await fetchTimeLogs(currentLogsEmp.name);
            fetchSummaryData(); // Re-trigger the whole admin refresh in background
            Swal.fire({title: 'สำเร็จ', text: 'อัพเดตข้อมูลเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false});
        } else {
            Swal.fire("Error: " + json.message);
        }
    } catch(e) {
        console.error(e);
        Swal.fire("ไม่สามารถบันทึกได้");
    } finally {
        overlay.classList.add('hidden');
    }
}
