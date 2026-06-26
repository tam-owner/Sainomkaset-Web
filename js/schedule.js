// ==========================================
// API Layer: Handles communication with Google Apps Script
// ==========================================

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby9bYl-C5nsRPDvikNkN4yxUGzNBGNtUVxJoXPavR8C4bGEJRzJnyaPrYqg2oIKUKY/exec";

function getEmployeeColor(name) {
    const PASTEL_COLORS = [
        { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af' }, // Blue
        { bg: '#dcfce7', border: '#bbf7d0', text: '#166534' }, // Green
        { bg: '#fef3c7', border: '#fde68a', text: '#92400e' }, // Amber
        { bg: '#fce7f3', border: '#fbcfe8', text: '#9d174d' }, // Pink
        { bg: '#e0e7ff', border: '#c7d2fe', text: '#3730a3' }, // Indigo
        { bg: '#ffedd5', border: '#fed7aa', text: '#9a3412' }, // Orange
        { bg: '#ccfbf1', border: '#99f6e4', text: '#0f766e' }, // Teal
        { bg: '#f3e8ff', border: '#e9d5ff', text: '#6b21a8' }, // Purple
        { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' }, // Red
        { bg: '#e0f2fe', border: '#bae6fd', text: '#0369a1' }, // Sky
        { bg: '#ecfccb', border: '#d9f99d', text: '#3f6212' }, // Lime
        { bg: '#f5f5f4', border: '#e7e5e4', text: '#44403c' }  // Stone
    ];

    let idx = state.employees.findIndex(e => e.name === name);
    if (idx === -1) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        idx = Math.abs(hash);
    }
    
    return PASTEL_COLORS[idx % PASTEL_COLORS.length];
}

// ==========================================
// LOCAL STORAGE LOGIC
// ==========================================
window.saveLocalState = function(type) {
    if (type === 'schedules') localStorage.setItem('localSchedules', JSON.stringify(state.schedules));
    else if (type === 'employees') localStorage.setItem('localEmployees', JSON.stringify(state.employees));
};
window.clearLocalState = function(type) {
    if (type === 'schedules') localStorage.removeItem('localSchedules');
    else if (type === 'employees') localStorage.removeItem('localEmployees');
};

async function fetchAllData() {
    // Add timestamp to prevent browser from caching the GET request
    const url = `${WEB_APP_URL}?action=getScheduleData&t=${new Date().getTime()}`;
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        
        if (result.status === "success") {
            return result.data;
        } else {
            throw new Error(result.message || 'Unknown error from server');
        }
    } catch (err) {
        console.error("API Fetch Error:", err);
        throw err;
    }
}

async function saveEmployeesToSheet(employees) {
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // We use no-cors to avoid preflight OPTIONS error in GAS
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action: "saveScheduleSettings", data: employees })
        });
        // Since no-cors gives an opaque response, we assume success if no network error thrown
        return true;
    } catch (e) {
        console.error("API Save Employees Error:", e);
        throw e;
    }
}

async function saveSchedulesToSheet(schedules) {
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ action: "saveSchedules", data: schedules })
        });
        return true;
    } catch (e) {
        console.error("API Save Schedules Error:", e);
        throw e;
    }
}

// ==========================================
// State Management
// ==========================================

const state = {
    leaves: [],
    employees: [],
    schedules: [],
    attendance: [],
    
    // Constants
    SHIFTS: [
        { id: "11:30", label: "11:30 - 20:30 (8 ชม.)", is8Hour: true },
        { id: "14:30", label: "14:30 - 23:30 (8 ชม.)", is8Hour: true },
        { id: "16:30", label: "16:30 - 23:30 (7 ชม.)", is8Hour: false },
        { id: "18:00", label: "18:00 - 23:30 (5.5 ชม.)", is8Hour: false }
    ],
    STATIONS: ["Hotmeal", "Drink", "Bread", "Lava", "Service"],
    
    // Navigation
    currentWeekOffset: 1, // 1 = Next week by default
    currentMonthDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    
    // Active UI states
    activeDropdownCell: null,
    currentEmpTab: 'Active'
};

let isHideEmptyShifts = false;

// Utils for data formatting
function formatAsISODate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // fallback if invalid
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateObj(dateObj, short = false) {
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const d = dateObj.getDate();
    const m = months[dateObj.getMonth()];
    const y = dateObj.getFullYear() + 543;
    if (short) return `${d} ${m}`;
    return `${d} ${m} ${y}`;
}

function getNextWeekDate(dayOfWeekIndex, weekOffset = 1) {
    const today = new Date();
    // Start of current week (Monday)
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    today.setDate(today.getDate() + distanceToMonday);
    
    // Add offset weeks
    today.setDate(today.getDate() + (weekOffset * 7));
    
    // Get specific day of that week
    today.setDate(today.getDate() + (dayOfWeekIndex - 1));
    return formatAsISODate(today);
}

// Data processing
function setLeaves(rawLeaves) {
    // Already formatted by backend, just parse if needed
    state.leaves = rawLeaves.map(l => ({
        ...l,
        startDate: formatAsISODate(l.startDate),
        endDate: formatAsISODate(l.endDate)
    }));
}

function normalizeShiftId(shiftStr) {
    if (!shiftStr || typeof shiftStr !== 'string') return shiftStr;
    if (shiftStr.includes('T')) {
        const timePart = shiftStr.split('T')[1];
        if (timePart) {
            let h = parseInt(timePart.substring(0, 2), 10);
            const m = timePart.substring(3, 5);
            h = (h + 7) % 24;
            return h + ':' + m;
        }
    }
    // Auto-correct corrupted cache from the 1899 bug or timezone shifting
    const corrections = {
        '11:12': '11:30', '12:55': '11:30',
        '14:12': '14:30', '15:55': '14:30',
        '16:12': '16:30', '17:55': '16:30',
        '17:42': '18:00', '19:25': '18:00'
    };
    if (corrections[shiftStr]) return corrections[shiftStr];
    return shiftStr;
}

function setEmployees(rawEmployees) {
    state.employees = rawEmployees.map(e => {
        let avail = e.availability || {};
        const normalizedAvail = {};
        Object.keys(avail).forEach(day => {
            normalizedAvail[day] = avail[day].map(normalizeShiftId);
        });
        
        return {
            ...e,
            type: e.type || "Part-time",
            targetDays: parseInt(e.targetDays) || 0,
            availability: normalizedAvail,
            note: e.note || "",
            status: e.status || "Active",
            isAvailableAll: e.isAvailableAll === false ? false : true,
            stations: e.stations || []
        };
    });
}

function setSchedules(rawSchedules) {
    state.schedules = rawSchedules.map(s => {
        return {
            ...s,
            date: formatAsISODate(s.date),
            shift: normalizeShiftId(s.shift)
        };
    });
}

function setAttendance(rawAttendance) {
    state.attendance = rawAttendance;
}

// ==========================================
// UI Rendering Logic
// ==========================================

function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `
        <i data-lucide="${isError ? 'alert-circle' : 'check-circle'}" class="${isError ? 'text-danger' : 'text-success'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons({ root: toast });
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(show = true) {
    const el = document.getElementById('loading-overlay');
    if (el) el.style.display = show ? 'flex' : 'none';
}

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('active');
    });
    const target = document.getElementById(`${viewId}-view`);
    if (target) {
        target.style.display = 'flex';
        // Small delay to trigger animation
        setTimeout(() => target.classList.add('active'), 10);
    }
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
    if (btn) btn.classList.add('active');
    
    // Header actions
    const globalActions = document.getElementById('global-schedule-actions');
    if (viewId === 'schedule' || viewId === 'employees') {
        globalActions.style.display = 'flex';
    } else {
        globalActions.style.display = 'none';
    }

    if (viewId === 'admin') {
        renderAdminCalendar();
        renderAdminLeaveList();
    } else if (viewId === 'calendar') {
        renderMonthlyCalendar();
    } else if (viewId === 'summary') {
        renderSummary();
    } else if (viewId === 'availability-summary') {
        renderAvailabilitySummary();
    } else if (viewId === 'time-tracking') {
        initTimeTracking();
    }
}

function renderWeeklySchedule(onCellClick, onCellDblClick) {
    const grid = document.getElementById('weekly-schedule-grid');
    if (!grid) return;

    const dates = [];
    for (let i = 0; i < 7; i++) dates.push(getNextWeekDate(i + 1, state.currentWeekOffset));

    const isLocked = state.schedules.some(s => s.date === dates[0] && s.shift === 'LOCKED_WEEK');
    const badge = document.getElementById('sched-week-range-badge');
    if (badge) {
        badge.textContent = `${formatDateObj(new Date(dates[0]))} - ${formatDateObj(new Date(dates[6]))}`;
        if (isLocked) {
            badge.innerHTML = `<i data-lucide="lock" style="width:14px;height:14px;margin-right:4px;"></i> ${badge.textContent}`;
            if (window.lucide) window.lucide.createIcons({ root: badge });
        }
    }

    const lockBtn = document.getElementById('lock-week-btn');
    const unlockBtn = document.getElementById('unlock-week-btn');
    if (lockBtn && unlockBtn) {
        lockBtn.style.display = isLocked ? 'none' : 'inline-flex';
        unlockBtn.style.display = isLocked ? 'inline-flex' : 'none';
    }

    renderLeaveWarnings(dates);

    let html = `<div class="schedule-table-container">
        <table class="schedule-table" id="schedule-table-export">
            <thead>`;

    const daysNameEng = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const monthsNameThai = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    html += `<tr class="leave-export-row" style="background: transparent;">
        <th colspan="2" style="background: transparent; border: none;"></th>`;
    dates.forEach(dateStr => {
        const dayLeaves = state.leaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr);
        let leaveHtml = '';
        if (dayLeaves.length > 0) {
            leaveHtml = '<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; justify-content: flex-end; height: 100%;">';
            dayLeaves.forEach(l => {
                leaveHtml += `<div style="font-size: 0.8rem; color: #fee2e2; background: #b91c1c; padding: 2px 6px; border-radius: 4px; line-height: 1.2; font-family: 'Sarabun', 'Thonburi', 'Tahoma', sans-serif;">${l.name}</div>`;
            });
            leaveHtml += '</div>';
        }
        html += `<th style="background: transparent; border: none; padding: 0 0 4px 0; vertical-align: bottom;">${leaveHtml}</th>`;
    });
    html += `</tr>`;

    html += `<tr>
        <th colspan="2" class="table-info-header-shift" style="width: 125px; text-align: center; vertical-align: middle;">
            พัก 1 ชม.<br><span style="font-size: 0.7rem; font-weight: normal; white-space: nowrap;">(เริ่ม 18.00 ไม่มีพัก)</span>
        </th>`;
    
    dates.forEach((dateStr, i) => {
        const d = new Date(dateStr);
        html += `<th style="vertical-align: middle; padding: 0.5rem; width: 70px;">
            <div style="font-size:0.75rem">${d.getDate()} ${monthsNameThai[d.getMonth()]}</div>
            <div style="font-size:0.85rem">${daysNameEng[i]}</div>
        </th>`;
    });
    html += `</tr></thead><tbody>`;

    state.STATIONS.forEach((station, sIdx) => {
        let visibleShifts = state.SHIFTS;
        if (isHideEmptyShifts) {
            visibleShifts = state.SHIFTS.filter(shift => {
                return dates.some(dateStr => {
                    return state.schedules.some(s => s.date === dateStr && s.shift === shift.id && s.station === station);
                });
            });
            if (visibleShifts.length === 0) return; // Hide entire station if all shifts are empty
        }

        html += `<tbody class="station-group" data-station="${station}">`;
        
        visibleShifts.forEach((shift, idx) => {
            html += `<tr class="station-row" data-shift="${shift.id}" data-station="${station}">`;
            
            if (idx === 0) {
                const displayName = station === 'Hotmeal' ? 'Hot' : station;
                html += `<td rowspan="${visibleShifts.length}" class="station-cell" style="background: #1f2937; color: white; border: 1px solid #000; text-align: center; vertical-align: middle;">
                    <div style="transform: rotate(-90deg); display: inline-block; letter-spacing: 1px;">${displayName}</div>
                </td>`;
            }
            
            let shiftColor = '#f8fafc'; // Pastel grey-white (11:30)
            if (shift.id === '14:30') shiftColor = '#fefad5'; // Custom Yellow
            else if (shift.id === '16:30') shiftColor = '#defbed'; // Custom Green
            else if (shift.id === '18:00') shiftColor = '#ffeaec'; // Custom Red/Rose
            
            html += `<td class="shift-cell shift-row-${idx}" style="background-color: ${shiftColor}; color: #000; border: 1px dotted #000; font-weight: 600;">
                ${shift.id}-${shift.id === '11:30' ? '20:30' : '23:30'} 
            </td>`;
            
            dates.forEach((dateStr) => {
                const assignments = state.schedules.filter(s => s.date === dateStr && s.shift === shift.id && s.station === station);
                const isEmpty = assignments.length === 0;
                const cellBg = isEmpty ? '#9ca3af' : shiftColor;
                
                let cellContent = '';
                assignments.forEach(a => {
                    cellContent += `<div class="sched-emp-badge name-text" title="${a.employeeName}" data-emp="${a.employeeName}" style="color: #000; font-weight: 500; font-size: 0.85rem;"><span>${a.employeeName}</span></div>`;
                });
                
                if (isEmpty && state.showGuideNames !== false) {
                    const availableEmps = getAvailableEmployeesForSlot(dateStr, shift.id, station);
                    if (availableEmps.length > 0) {
                        const randomEmp = availableEmps[Math.floor(Math.random() * availableEmps.length)];
                        cellContent = `<div style="color: #000; font-size: 0.85rem; font-weight: 600; user-select: none; pointer-events: none;">${randomEmp.name}</div>`;
                    }
                }

                html += `<td class="shift-data-cell" style="background-color: ${cellBg}; text-align: center; border: 1px dotted #000; vertical-align: middle; min-width: 50px;" 
                    data-date="${dateStr}" data-shift="${shift.id}" data-station="${station}">
                    <div class="cell-flex-wrapper" style="justify-content: center; align-items: center;">${cellContent}</div>
                </td>`;
            });
            html += `</tr>`;
        });
        html += `</tbody>`;
        if (sIdx < state.STATIONS.length - 1) {
            html += `<tr class="station-separator"><td colspan="9" style="border: 1px solid #000; height: 16px; background:#3f3f46; padding:0;"></td></tr>`;
        }
    });

    html += `<tbody class="station-group summary-group">
        <tr class="station-separator"><td colspan="9" style="border: none; height: 16px; background: transparent; padding: 0;"></td></tr>
        <tr class="station-row summary-row">
            <td colspan="2" style="text-align: right; font-weight: 800; background: #f8fafc; color: #334155; font-size: 0.95rem; padding-right: 1rem; border: 1px solid #cbd5e1; border-bottom: none;">รวมจำนวน</td>`;
    
    dates.forEach((dateStr) => {
        const peopleOnDay = new Set();
        state.schedules.forEach(s => {
            const isValidStation = state.STATIONS.includes(s.station);
            const isValidShift = state.SHIFTS.some(shift => shift.id === s.shift);
            if (s.date === dateStr && isValidStation && isValidShift) {
                peopleOnDay.add(s.employeeName);
            }
        });
        const count = peopleOnDay.size;
        
        html += `<td style="text-align: center; vertical-align: middle; padding: 0.4rem 0; background: #f8fafc; border: 1px solid #cbd5e1; border-bottom: none;">
            <div style="font-weight: 800; font-size: 1.3rem; color: #4f46e5;">${count}</div>
        </td>`;
    });
    
    html += `</tr>`;
    
    html += `<tr class="station-row summary-warning-row">
            <td colspan="2" style="text-align: right; font-weight: 700; background: #f8fafc; color: #dc2626; font-size: 0.85rem; padding-right: 1rem; padding-bottom: 0.75rem; border: 1px solid #cbd5e1; border-top: none;">
                <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.25rem;">
                    <i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i> เตือนครัวเย็น
                </div>
            </td>`;
            
    const targetStations = ['Lava', 'Bread', 'Drink'];
    dates.forEach((dateStr) => {
        const daySchedules = state.schedules.filter(s => s.date === dateStr && targetStations.includes(s.station));
        
        const start1130 = daySchedules.filter(s => s.shift === '11:30').length;
        const end2330 = daySchedules.filter(s => state.SHIFTS.some(shift => shift.id === s.shift) && s.shift !== '11:30').length;
        
        let warningHtml = '';
        if (start1130 !== 2) {
            warningHtml += `<div style="background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 0.75rem; font-weight: 700; margin-bottom: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                11.30 ${start1130 < 2 ? 'ขาด '+(2-start1130) : 'เกิน '+(start1130-2)}
            </div><br>`;
        }
        if (end2330 !== 3) {
            warningHtml += `<div style="background: #fee2e2; color: #b91c1c; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 0.75rem; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                เลิก23.30 ${end2330 < 3 ? 'ขาด '+(3-end2330) : 'เกิน '+(end2330-3)}
            </div>`;
        }
        
        if (!warningHtml) {
            warningHtml = `<div style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 0.75rem; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <i data-lucide="check" style="width:12px; height:12px; vertical-align: middle; margin-top:-2px;"></i> ครบ
            </div>`;
        }
        
        html += `<td style="text-align: center; vertical-align: top; padding: 0.25rem 0.1rem 0.5rem 0.1rem; background: #f8fafc; border: 1px solid #cbd5e1; border-top: none;">${warningHtml}</td>`;
    });
    
    html += `</tr></tbody></table></div>`;
    grid.innerHTML = html;
    
    // Attach event listeners
    if (!isLocked) {
        grid.querySelectorAll('.shift-data-cell').forEach(cell => {
            cell.addEventListener('mousedown', onCellClick);
            cell.addEventListener('dblclick', onCellDblClick);
        });
    }

    if (window.lucide) window.lucide.createIcons({ root: grid });

    renderWorkloadWarnings(dates);
    renderEmployeeSummarySchedule(dates);
}

function populateSavedWeeksDropdown() {
    const dropdown = document.getElementById('saved-weeks-dropdown');
    if (!dropdown) return;
    
    const mondays = new Set();
    state.schedules.forEach(s => {
        if (s.shift === 'LOCKED_WEEK') {
            mondays.add(s.date);
        } else {
            const d = new Date(s.date);
            if (!isNaN(d.getTime())) {
                const day = d.getDay();
                const distance = day === 0 ? -6 : 1 - day;
                const mon = new Date(d);
                mon.setDate(mon.getDate() + distance);
                mondays.add(formatAsISODate(mon));
            }
        }
    });
    
    const sortedMondays = Array.from(mondays).sort().reverse();
    
    let html = '<option value="">ตารางที่เซฟไว้...</option>';
    sortedMondays.forEach(mon => {
        const monDate = new Date(mon);
        const sunDate = new Date(mon);
        sunDate.setDate(monDate.getDate() + 6);
        const isLocked = state.schedules.some(s => s.date === mon && s.shift === 'LOCKED_WEEK');
        html += `<option value="${mon}">${isLocked ? '🔒 ' : ''}${formatDateObj(monDate)} - ${formatDateObj(sunDate)}</option>`;
    });
    dropdown.innerHTML = html;
}

function renderLeaveWarnings(dates) {
    const container = document.getElementById('schedule-leave-warnings');
    if (!container) return;
    
    const weekLeaves = state.leaves.filter(l => (l.startDate <= dates[6] && l.endDate >= dates[0]));

    if (weekLeaves.length === 0) {
        container.innerHTML = `<span style="font-size:0.85rem; color: var(--text-muted);">ไม่มีพนักงานลาในสัปดาห์นี้</span>`;
        return;
    }

    let html = '';
    weekLeaves.forEach(l => {
        const s = new Date(Math.max(new Date(l.startDate), new Date(dates[0])));
        html += `<div class="badge" style="background:var(--danger-light); color:var(--danger); border:none; display:block; margin-bottom:0.5rem; white-space:normal; text-align:left;">
            ${l.name} ลา (${formatDateObj(s, true)})
        </div>`;
    });
    container.innerHTML = html;
}

function renderWorkloadWarnings(dates) {
    const container = document.getElementById('schedule-workload-warnings');
    if (!container) return;

    const weeklyWorkload = {};
    const weeklyHours = {};
    state.employees.forEach(e => {
        weeklyWorkload[e.name] = 0;
        weeklyHours[e.name] = 0;
    });

    state.schedules.forEach(s => {
        const isValidStation = state.STATIONS.includes(s.station);
        const isValidShift = state.SHIFTS.some(shift => shift.id === s.shift);

        if (dates.includes(s.date) && weeklyWorkload[s.employeeName] !== undefined && isValidStation && isValidShift) {
            weeklyWorkload[s.employeeName]++;
            
            let hours = 0;
            if (s.shift === '11:30' || s.shift === '14:30') hours = 8;
            else if (s.shift === '16:30') hours = 6;
            else if (s.shift === '18:00') hours = 5.5;
            
            weeklyHours[s.employeeName] += hours;
        }
    });

    container.style.display = 'block';
    
    let html = '<h3 class="section-title mt-4"><i data-lucide="users" class="text-primary"></i> ชั่วโมงงาน</h3><div style="display:flex; flex-direction:column; gap:0.25rem;">';
               
    // Generate array to sort
    const employeeData = state.employees
        .filter(e => !e.status || (!e.status.toLowerCase().includes('inactive') && !e.status.includes('ลาออก') && !e.status.includes('เก่า')))
        .map(emp => ({
            emp,
            load: weeklyWorkload[emp.name],
            totalHrs: weeklyHours[emp.name]
        }));
    
    // Sort by total hours descending
    employeeData.sort((a, b) => b.totalHrs - a.totalHrs);

    employeeData.forEach(data => {
        const { emp, load, totalHrs } = data;
        const c = getEmployeeColor(emp.name);
        
        let nameBadgeStyle = `font-weight: 600; font-size: 0.85rem; color: ${c.text}; background-color: ${c.bg}; padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid ${c.border}; display: inline-block; min-width: 50px; text-align: center;`;
        if (load === 0) {
            nameBadgeStyle = `background-color: #7f1d1d; color: #fecaca; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem; border: 1px solid #991b1b; display: inline-block; min-width: 50px; text-align: center;`;
        }
        let nameHtml = `<span style="${nameBadgeStyle}">${emp.name}</span>`;

        let statusColor = '';
        let statusHtml = '';
        if (load < emp.targetDays) {
            statusColor = 'var(--danger)'; // Red
            statusHtml = `ขาด ${emp.targetDays - load} วัน`;
        } else if (load > emp.targetDays) {
            const diff = load - emp.targetDays;
            if (diff === 1) {
                statusColor = 'var(--success)'; // Green
            } else {
                statusColor = '#f59e0b'; // Orange
            }
            statusHtml = `เกิน ${diff} วัน`;
        } else {
            statusColor = 'var(--text-muted)'; // Gray / original
            statusHtml = `พอดีเป้า`;
        }

        html += `
            <div style="display: grid; grid-template-columns: 80px 80px auto; align-items: center; padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--border);">
                <div>${nameHtml}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">(${totalHrs} ชม.)</div>
                <div style="font-size: 0.75rem; font-weight: 600; color: ${statusColor}; text-align: right;">ทำ ${load}/${emp.targetDays} (${statusHtml})</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons({ root: container });
}

function renderEmployeeSummarySchedule(dates) {
    const container = document.getElementById('employee-summary-grid');
    if (!container) return;
    
    // Sort employees exactly like workload warnings
    const weeklyHours = {};
    const activeEmployees = state.employees.filter(e => !e.status || (!e.status.toLowerCase().includes('inactive') && !e.status.includes('ลาออก') && !e.status.includes('เก่า')));
    activeEmployees.forEach(e => {
        weeklyHours[e.name] = 0;
    });

    state.schedules.forEach(s => {
        if (dates.includes(s.date) && weeklyHours[s.employeeName] !== undefined) {
            let hours = 0;
            if (s.shift === '11:30' || s.shift === '14:30') hours = 8;
            else if (s.shift === '16:30') hours = 6;
            else if (s.shift === '18:00') hours = 5.5;
            weeklyHours[s.employeeName] += hours;
        }
    });

    const employeeData = activeEmployees.map(emp => ({
        emp,
        totalHrs: weeklyHours[emp.name]
    })).sort((a, b) => b.totalHrs - a.totalHrs);

    let html = `<div style="overflow-x: auto; padding-bottom: 1rem;">
        <table class="schedule-table" style="width: max-content; margin: 0; border-collapse: collapse; margin-top: 0;">
        <thead class="schedule-header">
        <tr style="background: transparent;">
            <th style="background: transparent; border: none;"></th>`;
    dates.forEach(dateStr => {
        const dayLeaves = state.leaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr);
        let leaveHtml = '';
        if (dayLeaves.length > 0) {
            leaveHtml = '<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; justify-content: flex-end; height: 100%;">';
            dayLeaves.forEach(l => {
                leaveHtml += `<div style="font-size: 0.8rem; color: #fee2e2; background: #b91c1c; padding: 2px 6px; border-radius: 4px; line-height: 1.2; font-family: 'Sarabun', 'Thonburi', 'Tahoma', sans-serif;">${l.name}</div>`;
            });
            leaveHtml += '</div>';
        }
        html += `<th style="background: transparent; border: none; padding: 0 0 4px 0; vertical-align: bottom;">${leaveHtml}</th>`;
    });
    html += `</tr>`;
        
    html += `<tr>
            <th style="width: 80px; background: #356d70; color: white; border: 1px solid #000;">พนักงาน</th>`;
            
    dates.forEach((dateStr) => {
        const d = new Date(dateStr);
        html += `<th style="background: #356d70; color: white; width: 70px; border: 1px solid #000; text-align: center; vertical-align: middle; padding: 0.5rem;">
            ${d.toLocaleDateString('en-US', {weekday: 'short'})}
        </th>`;
    });
    html += `</tr></thead><tbody>`;
    
    employeeData.forEach(data => {
        const empName = data.emp.name;
        html += `<tr>
            <td style="background: #356d70; color: white; font-weight: 600; text-align: center; border: 1px solid #000; font-family: 'Sarabun', 'Thonburi', 'Tahoma', sans-serif;">${empName}</td>`;
            
        dates.forEach(dateStr => {
            const assignments = state.schedules.filter(s => s.date === dateStr && s.employeeName === empName);
            if (assignments.length > 0) {
                const shiftId = assignments[0].shift;
                let shiftColor = '#f8fafc'; // Pastel grey-white default
                if (shiftId === '14:30') shiftColor = '#fefad5'; // Custom Yellow
                else if (shiftId === '16:30') shiftColor = '#defbed'; // Custom Green
                else if (shiftId === '18:00') shiftColor = '#ffeaec'; // Custom Red
                
                html += `<td style="background-color: ${shiftColor}; color: #000; text-align: center; border: 1px dotted #000; font-weight: 600; font-size: 0.95rem;">${shiftId}</td>`;
            } else {
                html += `<td style="background-color: #9ca3af; border: 1px dotted #000;"></td>`;
            }
        });
        html += `</tr>`;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderEmployeeList(onEdit) {
    const container = document.getElementById('employee-setup-list');
    if (!container) return;

    let filteredEmployees = state.employees;
    if (state.currentEmpTab === 'Inactive') {
        filteredEmployees = state.employees.filter(e => e.status && (e.status.toLowerCase().includes('inactive') || e.status.includes('ลาออก') || e.status.includes('เก่า')));
    } else {
        filteredEmployees = state.employees.filter(e => !e.status || (!e.status.toLowerCase().includes('inactive') && !e.status.includes('ลาออก') && !e.status.includes('เก่า')));
    }

    if (filteredEmployees.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:3rem; background:var(--secondary); border-radius:var(--radius-lg); border: 2px dashed var(--border);">ไม่พบพนักงานในสถานะนี้</div>';
        return;
    }

    let html = '';
    filteredEmployees.forEach(emp => {
        const c = getEmployeeColor(emp.name);
        html += `
            <div class="emp-list-item" style="border-left: 4px solid ${c.border};">
                <div class="emp-list-item-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; width: 100%;">
                        <div style="font-weight:700; color:${c.text}; background-color:${c.bg}; padding: 0.2rem 0.6rem; border-radius: 4px; font-size:1.15rem; min-width: 100px; text-align: center;">${emp.name}</div>
                        <span class="badge ${emp.type === 'Full-time' ? 'primary' : 'secondary'}">${emp.type}</span>
                        <span style="white-space: nowrap; font-size:0.85rem; color:var(--text-muted);">เป้าหมาย: <strong style="color:var(--text-main);">${emp.targetDays}</strong> วัน/สัปดาห์</span>
                        ${emp.note ? `<span style="color:var(--text-muted); font-size: 0.85rem; font-style: italic; display: flex; align-items: center; gap: 0.25rem;"><i data-lucide="info" style="width:14px;height:14px;"></i> ${emp.note}</span>` : ''}
                    </div>
                    <div style="width: 100%; margin-top: 0.75rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${state.STATIONS.map(st => {
                            const isChecked = (emp.stations && emp.stations.length > 0 && emp.stations[0] !== 'NONE') ? emp.stations.includes(st) : (emp.stations && emp.stations[0] === 'NONE' ? false : true);
                            return `
                                <label class="checkbox-label" style="font-size: 0.75rem; background: var(--bg-main); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; gap: 0.3rem;">
                                    <input type="checkbox" class="quick-station-cb" data-emp="${emp.name}" value="${st}" ${isChecked ? 'checked' : ''}>
                                    ${st}
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                <button class="btn btn-secondary edit-emp-btn" data-name="${emp.name}">
                    <i data-lucide="edit-2"></i> แก้ไข
                </button>
            </div>
        `;
    });
    container.innerHTML = html;
    
    container.querySelectorAll('.edit-emp-btn').forEach(btn => {
        btn.addEventListener('click', () => onEdit(btn.getAttribute('data-name')));
    });

    container.querySelectorAll('.quick-station-cb').forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const empName = e.target.getAttribute('data-emp');
            const emp = state.employees.find(e => e.name === empName);
            if (!emp) return;
            
            const checkedStations = [];
            container.querySelectorAll(`.quick-station-cb[data-emp="${empName}"]:checked`).forEach(c => {
                checkedStations.push(c.value);
            });
            
            // If they uncheck everything, we will save an invalid station name to force it not to default to "All"
            emp.stations = checkedStations.length > 0 ? checkedStations : ['NONE'];
            window.saveLocalState('employees');
            
            // Auto-save silently to API
            triggerAutoSaveEmployee();
        });
    });

    if (window.lucide) window.lucide.createIcons({ root: container });
}

function populateAvailabilityGrid(emp) {
    const grid = document.getElementById('emp-availability-grid');
    const days = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
    let html = '';
    
    const shiftIds = [...new Set(state.SHIFTS.map(s => s.id))];
    
    days.forEach((day, dIdx) => {
        const bg = dIdx % 2 === 0 ? 'var(--surface)' : 'var(--bg-main)';
        
        html += `<div class="avail-row" style="background:${bg};">
                    <div class="avail-day">
                        <input type="checkbox" class="day-toggle" data-day="${dIdx}">
                        ${day}
                    </div>
                    <div class="avail-shifts">`;
        
        shiftIds.forEach(shiftId => {
            let isChecked = false;
            if (emp && emp.isAvailableAll === false && emp.availability && emp.availability[dIdx]) {
                isChecked = emp.availability[dIdx].includes(shiftId);
            } else if (emp && emp.isAvailableAll !== false) {
                isChecked = true;
            }
            
            html += `<label class="checkbox-label" style="font-size:0.8rem;">
                        <input type="checkbox" class="emp-avail-shift day-${dIdx}" data-day="${dIdx}" value="${shiftId}" ${isChecked ? 'checked' : ''}>
                        ${shiftId}
                     </label>`;
        });
        html += `   </div>
                 </div>`;
    });
    
    grid.innerHTML = html;
    
    // Add logic for day toggles
    grid.querySelectorAll('.day-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const dayIdx = e.target.getAttribute('data-day');
            document.querySelectorAll(`.emp-avail-shift.day-${dayIdx}`).forEach(cb => cb.checked = e.target.checked);
            if (!e.target.checked) document.getElementById('emp-avail-all').checked = false;
        });
    });

    grid.querySelectorAll('.emp-avail-shift').forEach(cb => {
        cb.addEventListener('change', (e) => {
            if (!e.target.checked) document.getElementById('emp-avail-all').checked = false;
        });
    });

    const isAll = emp ? (emp.isAvailableAll !== false) : false;
    const allCheckbox = document.getElementById('emp-avail-all');
    allCheckbox.checked = isAll;
    grid.style.display = 'block';
}

function getAvailableEmployeesForSlot(date, shiftId, station, excludeNames = []) {
    const shiftInfo = state.SHIFTS.find(s => s.id === shiftId);
    if (!shiftInfo) return [];

    return state.employees.filter(emp => {
        if (emp.status && (emp.status.toLowerCase().includes('inactive') || emp.status.includes('ลาออก') || emp.status.includes('เก่า'))) return false;
        
        if (excludeNames.includes(emp.name)) return false;
        
        if (emp.isAvailableAll === false) {
            const dObj = new Date(date);
            let dayIdx = dObj.getDay() - 1; 
            if (dayIdx === -1) dayIdx = 6;
            
            if (!emp.availability || !emp.availability[dayIdx] || !emp.availability[dayIdx].includes(shiftId)) {
                return false;
            }
        }

        const isOnLeave = state.leaves.some(l => l.name === emp.name && date >= l.startDate && date <= l.endDate);
        if (isOnLeave) return false;

        if (emp.type === 'Full-time' && !shiftInfo.is8Hour) return false;

        const hasShiftToday = state.schedules.some(s => 
            s.date === date && 
            s.employeeName === emp.name &&
            state.STATIONS.includes(s.station) &&
            state.SHIFTS.some(shift => shift.id === s.shift)
        );
        if (hasShiftToday) return false;

        if (emp.stations && emp.stations.length > 0 && !emp.stations.includes(station)) return false;

        return true;
    });
}

function renderCustomDropdown(cell, date, shift, station, onSelect) {
    const currentAssignments = state.schedules.filter(s => s.date === date && s.shift === shift && s.station === station);
    if (currentAssignments.length >= 2) return;

    const currentNames = currentAssignments.map(s => s.employeeName);
    
    // Calculate current week workload
    const dates = [];
    for (let i = 0; i < 7; i++) dates.push(getNextWeekDate(i + 1, state.currentWeekOffset));
    const weeklyWorkload = {};
    state.employees.forEach(e => weeklyWorkload[e.name] = 0);
    state.schedules.forEach(s => {
        const isValidStation = state.STATIONS.includes(s.station);
        const isValidShift = state.SHIFTS.some(shift => shift.id === s.shift);
        if (dates.includes(s.date) && weeklyWorkload[s.employeeName] !== undefined && isValidStation && isValidShift) {
            weeklyWorkload[s.employeeName]++;
        }
    });
    
    let html = '';
    let exceededHtml = '';
    
    const availableEmps = getAvailableEmployeesForSlot(date, shift, station, currentNames);
    
    availableEmps.forEach(emp => {
        const c = getEmployeeColor(emp.name);
        const load = weeklyWorkload[emp.name];
        const isExceeded = load >= emp.targetDays;
            
            if (isExceeded) {
                const textHtml = `${emp.name} <span style="font-size:0.75rem; opacity:0.8;">(ครบ ${emp.targetDays} วันแล้ว)</span>`;
                exceededHtml += `<div class="custom-dropdown-item" data-name="${emp.name}" style="color: #94a3b8; border-left: 4px solid #cbd5e1; font-weight: 500;">${textHtml}</div>`;
            } else {
                const textHtml = `${emp.name} <span style="font-size:0.75rem; opacity:0.8;">(${load}/${emp.targetDays} วัน)</span>`;
                html += `<div class="custom-dropdown-item" data-name="${emp.name}" style="color: ${c.text}; border-left: 4px solid ${c.bg}; font-weight: 600;">${textHtml}</div>`;
            }
    });
    
    html = html + exceededHtml;
    
    if (html === '') {
        html = `<div class="custom-dropdown-item" style="color:var(--danger); cursor:not-allowed;">ไม่มีผู้ว่างงาน</div>`;
    }
    
    const dropdown = document.getElementById('custom-dropdown');
    dropdown.innerHTML = html;
    
    const rect = cell.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.width = `${Math.max(rect.width, 150)}px`;
    dropdown.style.display = 'block';
    
    dropdown.querySelectorAll('.custom-dropdown-item').forEach(item => {
        if (item.hasAttribute('data-name')) {
            item.addEventListener('click', () => {
                onSelect(item.getAttribute('data-name'));
                dropdown.style.display = 'none';
            });
        }
    });
}

// ==========================================
// Initialization
// ==========================================

async function initScheduleApp() {
    if (window.lucide) window.lucide.createIcons();
    setupEventListeners();
    await loadData();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScheduleApp);
} else {
    initScheduleApp();
}

async function loadData() {
    const cachedAPILeaves = localStorage.getItem('cachedAPILeaves');
    const cachedAPIEmployees = localStorage.getItem('cachedAPIEmployees');
    const cachedAPISchedules = localStorage.getItem('cachedAPISchedules');
    const cachedAPIAttendance = localStorage.getItem('cachedAPIAttendance');
    
    let hasCache = false;
    if (cachedAPILeaves && cachedAPIEmployees && cachedAPISchedules) {
        hasCache = true;
        setLeaves(JSON.parse(cachedAPILeaves) || []);
        setAttendance(cachedAPIAttendance ? JSON.parse(cachedAPIAttendance) : []);
        
        const localEmployees = localStorage.getItem('localEmployees');
        const localSchedules = localStorage.getItem('localSchedules');
        
        setEmployees(localEmployees ? JSON.parse(localEmployees) : JSON.parse(cachedAPIEmployees) || []);
        setSchedules(localSchedules ? JSON.parse(localSchedules) : JSON.parse(cachedAPISchedules) || []);
        
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        renderEmployeeList(openEditEmployeeModal);
        populateSavedWeeksDropdown();
    } else {
        showLoading(true);
    }

    try {
        const data = await fetchAllData();
        
        localStorage.setItem('cachedAPILeaves', JSON.stringify(data.leaves || []));
        localStorage.setItem('cachedAPIEmployees', JSON.stringify(data.employees || []));
        localStorage.setItem('cachedAPISchedules', JSON.stringify(data.schedules || []));
        localStorage.setItem('cachedAPIAttendance', JSON.stringify(data.attendance || []));

        setLeaves(data.leaves || []);
        setAttendance(data.attendance || []);
        
        const localEmployees = localStorage.getItem('localEmployees');
        const localSchedules = localStorage.getItem('localSchedules');
        
        let finalEmps = data.employees || [];
        if (localEmployees) {
            const parsedLocal = JSON.parse(localEmployees);
            finalEmps = parsedLocal.map(le => {
                const apiEmp = (data.employees || []).find(e => e.name === le.name);
                if (apiEmp) {
                    le.status = apiEmp.status;
                }
                return le;
            });
            (data.employees || []).forEach(apiEmp => {
                if (!finalEmps.find(e => e.name === apiEmp.name)) {
                    finalEmps.push(apiEmp);
                }
            });
        }
        setEmployees(finalEmps);
        setSchedules(localSchedules ? JSON.parse(localSchedules) : data.schedules || []);
        
        if (!hasCache && (localEmployees || localSchedules)) {
            showToast("โหลดข้อมูลที่ยังไม่ได้บันทึกจากรอบที่แล้ว", false);
        }
        
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        renderEmployeeList(openEditEmployeeModal);
        populateSavedWeeksDropdown();
    } catch (e) {
        if (!hasCache) showToast("ไม่สามารถเชื่อมต่อฐานข้อมูลได้", true);
        // Fallback for demonstration
        if (state.employees.length === 0) {
            state.employees = [
                { name: "Demo User", type: "Full-time", targetDays: 5, availability: {}, note: "", isAvailableAll: true }
            ];
            renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
            renderEmployeeList(openEditEmployeeModal);
            populateSavedWeeksDropdown();
        }
    }
    showLoading(false);
}

// ==========================================
// Event Listeners
// ==========================================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const viewId = e.currentTarget.getAttribute('data-view');
            switchView(viewId);
            if (window.innerWidth < 768) {
                document.querySelector('.sidebar').classList.remove('active');
            }
        });
    });

    // Schedule Navigation
    document.getElementById('sched-prev-week-btn').addEventListener('click', () => {
        state.currentWeekOffset--;
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
    });
    document.getElementById('sched-next-week-btn').addEventListener('click', () => {
        state.currentWeekOffset++;
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
    });
    document.getElementById('sched-today-week-btn').addEventListener('click', () => {
        state.currentWeekOffset = 0;
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
    });

    // Saved Weeks Dropdown
    const savedDropdown = document.getElementById('saved-weeks-dropdown');
    if (savedDropdown) {
        savedDropdown.addEventListener('change', (e) => {
            if (!e.target.value) return;
            const selectedMonday = new Date(e.target.value);
            
            const today = new Date();
            const currentMonday = new Date(today);
            const day = currentMonday.getDay();
            const distance = day === 0 ? -6 : 1 - day;
            currentMonday.setDate(currentMonday.getDate() + distance);
            currentMonday.setHours(0,0,0,0);
            
            selectedMonday.setHours(0,0,0,0);
            const weekDiff = Math.round((selectedMonday - currentMonday) / (7 * 24 * 60 * 60 * 1000));
            
            state.currentWeekOffset = weekDiff;
            renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        });
    }

    // Lock/Unlock Weeks
    const lockBtn = document.getElementById('lock-week-btn');
    if (lockBtn) {
        lockBtn.addEventListener('click', async () => {
            const mondayStr = getNextWeekDate(1, state.currentWeekOffset);
            state.schedules.push({ date: mondayStr, shift: 'LOCKED_WEEK', station: 'SYSTEM', employeeName: 'LOCKED' });
            window.saveLocalState('schedules');
            renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
            populateSavedWeeksDropdown();
            triggerAutoSaveSchedule();
        });
    }

    const unlockBtn = document.getElementById('unlock-week-btn');
    if (unlockBtn) {
        unlockBtn.addEventListener('click', async () => {
            const mondayStr = getNextWeekDate(1, state.currentWeekOffset);
            state.schedules = state.schedules.filter(s => !(s.date === mondayStr && s.shift === 'LOCKED_WEEK'));
            window.saveLocalState('schedules');
            renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
            populateSavedWeeksDropdown();
            triggerAutoSaveSchedule();
        });
    }

    const toggleEmptyBtn = document.getElementById('toggle-empty-shifts-btn');
    if (toggleEmptyBtn) {
        toggleEmptyBtn.addEventListener('click', () => {
            isHideEmptyShifts = !isHideEmptyShifts;
            if (isHideEmptyShifts) {
                toggleEmptyBtn.innerHTML = '<i data-lucide="maximize-2"></i> แสดงกะทั้งหมด';
                toggleEmptyBtn.classList.remove('btn-secondary');
                toggleEmptyBtn.classList.add('btn-primary');
            } else {
                toggleEmptyBtn.innerHTML = '<i data-lucide="minimize-2"></i> ซ่อนกะที่ว่าง';
                toggleEmptyBtn.classList.remove('btn-primary');
                toggleEmptyBtn.classList.add('btn-secondary');
            }
            if (window.lucide) window.lucide.createIcons();
            renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        });
    }

    const toggleGuideBtn = document.getElementById('toggle-guide-names-btn');
    if (toggleGuideBtn) {
        toggleGuideBtn.addEventListener('click', () => {
            state.showGuideNames = state.showGuideNames === false ? true : false;
            if (state.showGuideNames) {
                toggleGuideBtn.innerHTML = '<i data-lucide="eye-off"></i> ปิดชื่อไกด์';
                toggleGuideBtn.classList.remove('btn-primary');
                toggleGuideBtn.classList.add('btn-secondary');
            } else {
                toggleGuideBtn.innerHTML = '<i data-lucide="eye"></i> เปิดชื่อไกด์';
                toggleGuideBtn.classList.remove('btn-secondary');
                toggleGuideBtn.classList.add('btn-primary');
            }
            if (window.lucide) window.lucide.createIcons();
            renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        });
    }

    // Export to JPEG
    const exportBtn = document.getElementById('export-schedule-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const grid = document.getElementById('schedule-table-export');
            if (!grid) return;
            
            const leaveRow = grid.querySelector('.leave-export-row');
            const summaryGroup = grid.querySelector('.summary-group');
            
            if (leaveRow) leaveRow.style.display = 'none';
            if (summaryGroup) summaryGroup.style.display = 'none';
            
            showLoading(true);
            try {
                // To avoid exporting buttons/UI not intended for image, we could add specific classes,
                // but just capturing the grid is usually fine.
                const canvas = await html2canvas(grid, { scale: 2, backgroundColor: '#ffffff' });
                const link = document.createElement('a');
                link.download = `schedule-${getNextWeekDate(1, state.currentWeekOffset)}.jpeg`;
                link.href = canvas.toDataURL('image/jpeg', 0.9);
                link.click();
            } catch(e) {
                console.error(e);
                showToast("ไม่สามารถ Export เป็นรูปภาพได้", true);
            } finally {
                if (leaveRow) leaveRow.style.display = '';
                if (summaryGroup) summaryGroup.style.display = '';
                showLoading(false);
            }
        });
    }

    // Employee Setup
    document.querySelectorAll('.emp-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.emp-tab-btn').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline');
            });
            e.target.classList.remove('btn-outline');
            e.target.classList.add('btn-primary');
            state.currentEmpTab = e.target.getAttribute('data-status');
            renderEmployeeList(openEditEmployeeModal);
        });
    });

    document.getElementById('add-employee-btn').addEventListener('click', () => {
        openEditEmployeeModal();
    });
    document.getElementById('close-emp-modal').addEventListener('click', () => {
        document.getElementById('edit-employee-modal').style.display = 'none';
    });
    document.getElementById('cancel-emp-btn').addEventListener('click', () => {
        document.getElementById('edit-employee-modal').style.display = 'none';
    });
    
    document.getElementById('emp-avail-all').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.emp-avail-shift').forEach(cb => cb.checked = isChecked);
        document.querySelectorAll('.day-toggle').forEach(cb => cb.checked = isChecked);
    });

    document.getElementById('confirm-emp-btn').addEventListener('click', saveEmployeeConfig);
    document.getElementById('delete-emp-btn').addEventListener('click', deleteEmployeeConfig);
    
    // Save to Google Sheets
    // document.getElementById('save-employees-btn').addEventListener('click', handleSaveEmployees);
    // document.getElementById('save-schedule-btn').addEventListener('click', handleSaveSchedules);

    // Leave Admin Navigation
    const prevWeekBtn = document.getElementById('prev-week-btn');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            state.adminWeekOffset = (state.adminWeekOffset || 0) - 1;
            renderAdminCalendar();
        });
    }
    
    const nextWeekBtn = document.getElementById('next-week-btn');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            state.adminWeekOffset = (state.adminWeekOffset || 0) + 1;
            renderAdminCalendar();
        });
    }
    
    const todayWeekBtn = document.getElementById('today-week-btn');
    if (todayWeekBtn) {
        todayWeekBtn.addEventListener('click', () => {
            state.adminWeekOffset = 1;
            renderAdminCalendar();
        });
    }

    // Leave Calendar Navigation
    const prevMonthBtn = document.getElementById('prev-month-btn');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            if (!state.currentMonthDate) state.currentMonthDate = new Date();
            state.currentMonthDate.setMonth(state.currentMonthDate.getMonth() - 1);
            renderMonthlyCalendar();
        });
    }
    
    const nextMonthBtn = document.getElementById('next-month-btn');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            if (!state.currentMonthDate) state.currentMonthDate = new Date();
            state.currentMonthDate.setMonth(state.currentMonthDate.getMonth() + 1);
            renderMonthlyCalendar();
        });
    }

    // Global Click for dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.shift-data-cell') && !e.target.closest('.custom-dropdown')) {
            document.getElementById('custom-dropdown').style.display = 'none';
            state.activeDropdownCell = null;
        }
    });
}

// ==========================================
// Employee Management
// ==========================================

function openEditEmployeeModal(empName = null) {
    const isEdit = !!empName;
    const emp = isEdit ? state.employees.find(e => e.name === empName) : null;
    
    document.getElementById('emp-modal-title').textContent = isEdit ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่';
    document.getElementById('emp-original-name').value = isEdit ? emp.name : '';
    document.getElementById('emp-name').value = isEdit ? emp.name : '';
    document.getElementById('emp-type').value = isEdit ? emp.type : 'Part-time';
    document.getElementById('emp-target-days').value = isEdit ? emp.targetDays : 4;
    document.getElementById('emp-note').value = isEdit ? emp.note : '';
    
    const stationsContainer = document.getElementById('emp-stations-container');
    if (stationsContainer) {
        let stHtml = '';
        state.STATIONS.forEach(st => {
            const isChecked = isEdit ? (emp.stations && emp.stations.length > 0 ? emp.stations.includes(st) : true) : true;
            stHtml += `
                <label class="checkbox-label" style="font-size: 0.8rem;">
                    <input type="checkbox" name="emp-station" value="${st}" ${isChecked ? 'checked' : ''}>
                    ${st}
                </label>
            `;
        });
        stationsContainer.innerHTML = stHtml;
    }

    document.getElementById('delete-emp-btn').style.display = isEdit ? 'block' : 'none';
    
    populateAvailabilityGrid(emp);
    document.getElementById('edit-employee-modal').style.display = 'flex';
}

function saveEmployeeConfig() {
    const originalName = document.getElementById('emp-original-name').value;
    const newName = document.getElementById('emp-name').value.trim();
    const type = document.getElementById('emp-type').value;
    const targetDays = parseInt(document.getElementById('emp-target-days').value) || 4;
    const note = document.getElementById('emp-note').value.trim();
    const isAvailableAll = document.getElementById('emp-avail-all').checked;
    
    if (!newName) {
        showToast('กรุณาระบุชื่อพนักงาน', true);
        return;
    }

    if (!originalName && state.employees.some(e => e.name === newName)) {
        showToast('ชื่อพนักงานนี้มีอยู่แล้ว', true);
        return;
    }

    const existingIdx = state.employees.findIndex(e => e.name === originalName);
    const existingStatus = existingIdx !== -1 ? (state.employees[existingIdx].status || 'Active') : 'Active';

    const availability = {};
    if (!isAvailableAll) {
        for (let i = 0; i < 7; i++) {
            const checks = document.querySelectorAll(`.emp-avail-shift.day-${i}:checked`);
            if (checks.length > 0) {
                availability[i] = Array.from(checks).map(cb => cb.value);
            }
        }
    }

    const checkedStations = [];
    document.querySelectorAll('input[name="emp-station"]:checked').forEach(cb => {
        checkedStations.push(cb.value);
    });

    const newData = { name: newName, type, status: existingStatus, targetDays, availability, note, isAvailableAll, stations: checkedStations };
    
    if (existingIdx !== -1) {
        state.employees[existingIdx] = newData;
        // Update schedules name
        state.schedules.forEach(s => {
            if (s.employeeName === originalName) s.employeeName = newName;
        });
    } else {
        state.employees.push(newData);
    }

    window.saveLocalState('employees');
    window.saveLocalState('schedules'); // In case names updated
    document.getElementById('edit-employee-modal').style.display = 'none';
    renderEmployeeList(openEditEmployeeModal);
    renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
    
    // Hook Auto-Save
    triggerAutoSaveEmployee();
    triggerAutoSaveSchedule();
}

function deleteEmployeeConfig() {
    const originalName = document.getElementById('emp-original-name').value;
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน "${originalName}" ?`)) {
        state.employees = state.employees.filter(e => e.name !== originalName);
        state.schedules = state.schedules.filter(s => s.employeeName !== originalName);
        
        window.saveLocalState('employees');
        window.saveLocalState('schedules');
        
        document.getElementById('edit-employee-modal').style.display = 'none';
        renderEmployeeList(openEditEmployeeModal);
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        
        // Hook Auto-Save
        triggerAutoSaveEmployee();
        triggerAutoSaveSchedule();
    }
}

// ==========================================
// Schedule Interaction
// ==========================================

function handleCellClick(e) {
    const cell = e.currentTarget;
    if (state.activeDropdownCell === cell) {
        document.getElementById('custom-dropdown').style.display = 'none';
        state.activeDropdownCell = null;
        return;
    }
    
    const date = cell.getAttribute('data-date');
    const shift = cell.getAttribute('data-shift');
    const station = cell.getAttribute('data-station');
    
    state.activeDropdownCell = cell;
    renderCustomDropdown(cell, date, shift, station, (selectedName) => {
        state.schedules.push({ date, shift, station, employeeName: selectedName });
        window.saveLocalState('schedules');
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        triggerAutoSaveSchedule();
    });
}

function handleCellDoubleClick(e) {
    const cell = e.currentTarget;
    const date = cell.getAttribute('data-date');
    const shift = cell.getAttribute('data-shift');
    const station = cell.getAttribute('data-station');
    
    // Check if they clicked on a specific badge
    const badge = e.target.closest('.sched-emp-badge');
    let toRemove = null;

    if (badge) {
        const empName = badge.getAttribute('data-emp');
        const cellSchedules = state.schedules.filter(s => s.date === date && s.shift === shift && s.station === station && s.employeeName === empName);
        if (cellSchedules.length > 0) toRemove = cellSchedules[0];
    } else {
        // If not clicked on a badge, don't remove anything
        return;
    }
    
    if (toRemove) {
        state.schedules = state.schedules.filter(s => s !== toRemove);
        window.saveLocalState('schedules');
        renderWeeklySchedule(handleCellClick, handleCellDoubleClick);
        showToast(`นำ ${toRemove.employeeName} ออกจากกะแล้ว`);
        triggerAutoSaveSchedule();
    }
}

// ==========================================
// Leave Management Renderers
// ==========================================

function renderAdminCalendar() {
    const grid = document.getElementById('admin-calendar');
    if (!grid) return;
    
    if (state.adminWeekOffset === undefined) state.adminWeekOffset = 1;
    const dates = [];
    for (let i = 0; i < 7; i++) {
        dates.push(getNextWeekDate(i + 1, state.adminWeekOffset));
    }
    
    const badge = document.getElementById('week-range-badge');
    if (badge) badge.textContent = `${formatDateObj(new Date(dates[0]))} - ${formatDateObj(new Date(dates[6]))}`;
    
    const daysNameThai = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
    
    let html = '';
    dates.forEach((dateStr, i) => {
        const d = new Date(dateStr);
        const isToday = formatAsISODate(new Date()) === dateStr;
        const leavesOnDay = state.leaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr);
        
        html += `<div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="date-header">
                        <span class="day-name">${daysNameThai[i]}</span>
                        <span class="date-num">${d.getDate()}</span>
                    </div>
                    <div class="day-leaves">`;
                    
        leavesOnDay.forEach(l => {
            html += `<div class="leave-item">
                        <i data-lucide="user"></i> ${l.name}
                     </div>`;
        });
        
        if (leavesOnDay.length === 0) {
            html += `<div class="empty-leave">-</div>`;
        }
        
        html += `   </div>
                 </div>`;
    });
    
    grid.innerHTML = html;
    if (window.lucide) window.lucide.createIcons({ root: grid });
}

function renderAdminLeaveList() {
    const container = document.getElementById('admin-leave-list');
    if (!container) return;
    
    const sortedLeaves = [...state.leaves].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    
    let html = '<h3 class="section-title mb-4"><i data-lucide="clock" class="text-primary"></i> ประวัติการลางานทั้งหมด</h3>';
    
    if (sortedLeaves.length === 0) {
        html += '<div style="color:var(--text-muted); text-align:center; padding: 2rem;">ไม่มีข้อมูลการลางาน</div>';
    } else {
        html += '<div class="table-responsive"><table class="data-table" style="width:100%; text-align:left;"><thead><tr><th>พนักงาน</th><th>วันที่ลา</th><th>หมายเหตุ</th></tr></thead><tbody>';
        sortedLeaves.forEach(l => {
            const multiDay = l.startDate !== l.endDate;
            const dateText = multiDay ? `${formatDateObj(new Date(l.startDate))} - ${formatDateObj(new Date(l.endDate))}` : formatDateObj(new Date(l.startDate));
            const c = getEmployeeColor(l.name);
            html += `<tr>
                <td style="font-weight:600; color:${c.text}; background-color:${c.bg}; border-radius: 4px; padding: 0.2rem 0.5rem; display: inline-block; margin-top: 0.5rem; margin-bottom: 0.5rem; border: 1px solid ${c.border};">${l.name}</td>
                <td>${dateText}</td>
                <td style="color:var(--text-muted);">${l.reason || '-'}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }
    
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons({ root: container });
}

function renderMonthlyCalendar() {
    const grid = document.getElementById('monthly-calendar');
    if (!grid) return;
    
    if (!state.currentMonthDate) state.currentMonthDate = new Date();
    const targetDate = state.currentMonthDate;
    
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    const monthsNameThai = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const badge = document.getElementById('month-badge');
    if (badge) badge.textContent = `${monthsNameThai[month]} ${year + 543}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust firstDay (0 = Sunday) to Mon-Sun layout
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    
    let html = '';
    const dayHeaders = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
    dayHeaders.forEach(day => {
        html += `<div class="month-day-header">${day}</div>`;
    });
    
    for (let i = 0; i < offset; i++) {
        html += `<div class="month-day empty"></div>`;
    }
    
    const todayStr = formatAsISODate(new Date());
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = formatAsISODate(new Date(year, month, d));
        const isToday = dateStr === todayStr;
        const leavesOnDay = state.leaves.filter(l => l.startDate <= dateStr && l.endDate >= dateStr);
        
        let cellClass = isToday ? 'month-day today' : 'month-day';
        if (leavesOnDay.length > 0 && !isToday) cellClass += ' has-leave';
        
        html += `<div class="${cellClass}">
                    <div class="date-num">${d}</div>
                    <div class="day-leaves">`;
                    
        leavesOnDay.forEach(l => {
            html += `<div class="leave-badge" style="background:var(--danger-light); color:var(--danger); border-radius:4px; padding:2px 4px; font-size:0.7rem; margin-bottom:2px;" title="${l.name}">${l.name}</div>`;
        });
        
        html += `   </div>
                 </div>`;
    }
    
    grid.innerHTML = html;
}

function renderAvailabilitySummary() {
    const container = document.getElementById('availability-summary-container');
    if (!container) return;

    if (state.employees.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">ไม่มีข้อมูลพนักงาน</div>';
        return;
    }

    const daysNameEng = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Calculate counts: counts[dayIdx][shiftId] = count
    const counts = Array(7).fill(null).map(() => ({}));

    let tableHtml = `
        <table class="schedule-table" style="width: 100%; min-width: 800px; table-layout: auto;">
            <thead>
                <tr>
                    <th style="background: #1e293b; color: white; width: 120px; border-color: #334155; padding: 0.75rem;">พนักงาน</th>
    `;
    daysNameEng.forEach(day => {
        tableHtml += `<th style="background: #334155; color: white; border-color: #1e293b; padding: 0.75rem;">${day}</th>`;
    });
    tableHtml += `</tr></thead><tbody>`;

    state.employees.forEach(emp => {
        if (emp.status && (emp.status.toLowerCase().includes('inactive') || emp.status.includes('ลาออก') || emp.status.includes('เก่า'))) return;
        tableHtml += `<tr><td style="font-weight: 700; background: var(--surface); color: var(--text-main); text-align: left; padding: 0.5rem 1rem;">${emp.name}</td>`;
        
        for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
            let cellText = '';
            let cellClass = '';
            let isAvail = false;
            let targetShiftId = null;

            if (emp.isAvailableAll) {
                isAvail = true;
                targetShiftId = state.SHIFTS[0].id; // Default to first shift if available all
            } else if (emp.availability && emp.availability[dayIdx] && emp.availability[dayIdx].length > 0) {
                const validShifts = emp.availability[dayIdx].filter(sId => state.SHIFTS.some(shift => shift.id === sId));
                if (validShifts.length > 0) {
                    isAvail = true;
                    // Pick the first available shift to display
                    targetShiftId = validShifts[0]; 
                }
            }

            if (isAvail && targetShiftId) {
                cellText = targetShiftId;
                const shiftIdx = state.SHIFTS.findIndex(s => s.id === targetShiftId);
                cellClass = shiftIdx !== -1 ? `shift-row-${shiftIdx}` : '';
                
                // Track count
                counts[dayIdx][targetShiftId] = (counts[dayIdx][targetShiftId] || 0) + 1;
                tableHtml += `<td class="${cellClass}" style="font-weight: 600; text-align: center; padding: 0.5rem; font-size: 0.95rem;">${cellText}</td>`;
            } else {
                cellText = '&nbsp;';
                tableHtml += `<td style="background-color: #64748b; color: white; font-weight: 600; text-align: center; padding: 0.5rem;">${cellText}</td>`;
            }
        }
        tableHtml += `</tr>`;
    });

    tableHtml += `</tbody>`;

    // Add summary row aligned with columns
    tableHtml += `<tbody>
        <tr>
            <td style="font-weight: 700; background: #f8fafc; color: var(--text-main); text-align: right; padding: 0.75rem 1rem; border: 1px solid #cbd5e1;">สรุปจำนวนคนว่าง/กะ:</td>`;
            
    daysNameEng.forEach((day, dayIdx) => {
        let dayContent = '';
        state.SHIFTS.forEach(shift => {
            const c = counts[dayIdx][shift.id] || 0;
            if (c > 0) {
                dayContent += `<div style="font-size:0.8rem; margin-bottom:4px; background:white; padding:2px 6px; border-radius:4px; border:1px solid #e2e8f0; display:inline-block; box-shadow:0 1px 2px rgba(0,0,0,0.05);">${shift.id}: <strong style="color:var(--primary);">${c}</strong></div><br>`;
            }
        });
        if (!dayContent) dayContent = `<span style="font-size:0.8rem; color:var(--text-muted);">ไม่มีคนว่าง</span>`;
        
        tableHtml += `<td style="vertical-align: top; text-align: center; padding: 0.5rem; background: #f8fafc; border: 1px solid #cbd5e1;">${dayContent}</td>`;
    });
    
    tableHtml += `</tr></tbody></table>`;

    container.innerHTML = tableHtml;
    
    // DEBUG: Dump the first few characters of the table HTML to prove if JS is generating 13:12
    const debugDiv = document.createElement('div');
    debugDiv.style.fontSize = '12px';
    debugDiv.style.color = '#0f0';
    debugDiv.style.background = '#000';
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '10px';
    debugDiv.style.right = '10px';
    debugDiv.style.zIndex = '99999';
    debugDiv.style.padding = '10px';
    
    // Extract what JS generated for Mew
    const mew = state.employees.find(e => e.name === 'มิว');
    let mewDebug = "Mew JS output: ";
    if (mew) {
        mewDebug += "availAll=" + mew.isAvailableAll + " | WedAvail=" + (mew.availability?.[2] || 'none') + " | targetShift0=" + state.SHIFTS[0].id;
    }
    debugDiv.innerHTML = "<b>JS is rendering:</b><br>" + mewDebug;
    document.body.appendChild(debugDiv);

    if (window.lucide) window.lucide.createIcons({ root: container });
}

function renderSummary() {
    const container = document.getElementById('employee-summary-container');
    if (!container) return;
    
    let html = '';
    
    if (state.employees.length === 0) {
        html = '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:3rem;">ไม่มีข้อมูลพนักงาน</div>';
    } else {
        state.employees.forEach(emp => {
            const leaves = state.leaves.filter(l => l.name === emp.name);
            let totalDays = 0;
            
            leaves.forEach(l => {
                const s = new Date(l.startDate);
                const e = new Date(l.endDate);
                const diffTime = Math.abs(e - s);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                totalDays += diffDays;
            });
            
            const c = getEmployeeColor(emp.name);
            html += `
                <div class="emp-list-item" style="margin-bottom:1rem; border-left: 4px solid ${c.border};">
                    <div class="emp-list-item-info">
                        <div style="font-weight:700; color:${c.text}; background-color:${c.bg}; padding: 0.2rem 0.6rem; border-radius: 4px; display: inline-block; border: 1px solid ${c.border}; font-size:1.15rem; margin-bottom: 0.25rem;">${emp.name}</div>
                        <div style="font-size:0.85rem; color:var(--danger); display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="alert-circle" style="width:14px; height:14px;"></i>
                            <span>ประวัติการลาทั้งหมด: <strong>${totalDays}</strong> วัน</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons({ root: container });
}

// ==========================================
// Time Tracking Logic
// ==========================================

function processTimeTrackingData() {
    const raw = state.attendance || [];
    const recordsByDayAndName = {};

    raw.forEach(r => {
        if (!r.timestamp || !r.name || !r.type) return;
        
        const d = new Date(r.timestamp);
        if (isNaN(d.getTime())) return;
        
        const dateStr = formatAsISODate(d); 
        
        if (!recordsByDayAndName[dateStr]) recordsByDayAndName[dateStr] = {};
        if (!recordsByDayAndName[dateStr][r.name]) recordsByDayAndName[dateStr][r.name] = { name: r.name, date: dateStr };
        
        const rec = recordsByDayAndName[dateStr][r.name];
        if (r.type === 'เข้า') {
            rec.inTime = d;
            rec.scheduledIn = r.scheduledTime;
            if (r.note) rec.noteIn = r.note;
        } else if (r.type === 'ออก') {
            rec.outTime = d;
            if (r.note) rec.noteOut = r.note;
        }
    });

    const result = [];
    Object.values(recordsByDayAndName).forEach(dayObj => {
        Object.values(dayObj).forEach(rec => {
            if (rec.inTime && rec.outTime) {
                const diffMs = rec.outTime - rec.inTime;
                let diffHours = diffMs / (1000 * 60 * 60);
                
                let breakTime = 1;
                if (rec.scheduledIn && rec.scheduledIn.includes('18:00')) {
                    breakTime = 0;
                }
                
                let workHours = diffHours - breakTime;
                if (workHours < 0) workHours = 0;
                
                let regularHours = Math.min(workHours, 8);
                let otHours = Math.max(0, workHours - 8);
                
                rec.totalHours = workHours;
                rec.regularHours = regularHours;
                rec.otHours = otHours;
                rec.breakTime = breakTime;
            } else {
                rec.totalHours = 0;
                rec.regularHours = 0;
                rec.otHours = 0;
                rec.breakTime = 0;
            }
            result.push(rec);
        });
    });

    return result;
}

function getPeriods() {
    const records = processTimeTrackingData();
    const monthsSet = new Set();
    records.forEach(r => {
        const d = new Date(r.date);
        monthsSet.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    
    // If no data, just add current month
    if (monthsSet.size === 0) {
        const d = new Date();
        monthsSet.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    
    const sortedMonths = Array.from(monthsSet).sort().reverse();
    const periods = [];
    const monthsNameThai = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    
    sortedMonths.forEach(mStr => {
        const [y, m] = mStr.split('-').map(Number);
        const yThai = y + 543;
        const monthName = monthsNameThai[m];
        const lastDay = new Date(y, m + 1, 0).getDate();
        
        periods.push({ id: `${y}-${m}-all`, label: `1-${lastDay} ${monthName} ${yThai}`, start: 1, end: lastDay, month: m, year: y });
        periods.push({ id: `${y}-${m}-2nd`, label: `16-${lastDay} ${monthName} ${yThai}`, start: 16, end: lastDay, month: m, year: y });
        periods.push({ id: `${y}-${m}-1st`, label: `1-15 ${monthName} ${yThai}`, start: 1, end: 15, month: m, year: y });
    });
    
    return periods;
}

let currentTrackingPeriods = [];

function initTimeTracking() {
    const dropdown = document.getElementById('time-tracking-period-dropdown');
    if (!dropdown) return;

    currentTrackingPeriods = getPeriods();
    
    let html = '<option value="">เลือกช่วงเวลา...</option>';
    currentTrackingPeriods.forEach(p => {
        html += `<option value="${p.id}">${p.label}</option>`;
    });
    dropdown.innerHTML = html;
    
    // Select first option by default
    if (currentTrackingPeriods.length > 0) {
        dropdown.value = currentTrackingPeriods[0].id;
        renderTimeTrackingSummary(currentTrackingPeriods[0].id);
    }

    dropdown.onchange = (e) => {
        renderTimeTrackingSummary(e.target.value);
        document.getElementById('time-tracking-details-container').style.display = 'none';
    };
}

function renderTimeTrackingSummary(periodId) {
    const container = document.getElementById('time-tracking-summary-container');
    if (!container || !periodId) return;

    const period = currentTrackingPeriods.find(p => p.id === periodId);
    if (!period) return;

    const allRecords = processTimeTrackingData();
    const periodRecords = allRecords.filter(r => {
        const d = new Date(r.date);
        return d.getFullYear() === period.year && d.getMonth() === period.month && d.getDate() >= period.start && d.getDate() <= period.end;
    });

    const summaryByName = {};
    periodRecords.forEach(r => {
        if (!summaryByName[r.name]) summaryByName[r.name] = { name: r.name, regHrs: 0, otHrs: 0, count: 0 };
        summaryByName[r.name].regHrs += (r.regularHours || 0);
        summaryByName[r.name].otHrs += (r.otHours || 0);
        summaryByName[r.name].count++;
    });

    const summaryList = Object.values(summaryByName).sort((a, b) => b.regHrs - a.regHrs);

    if (summaryList.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:3rem;">ไม่มีข้อมูลในรอบเวลานี้</div>';
        return;
    }

    let html = `
        <table class="schedule-table" style="width: 100%; border-collapse: collapse; margin-top: 0;">
            <thead class="schedule-header">
                <tr>
                    <th style="background: #0f172a; color: white; border: 1px solid #334155; text-align: left; padding: 0.75rem;">ชื่อ</th>
                    <th style="background: #0f172a; color: white; border: 1px solid #334155; text-align: center; padding: 0.75rem;">ชม. ปกติ</th>
                    <th style="background: #0f172a; color: white; border: 1px solid #334155; text-align: center; padding: 0.75rem;">ชม. OT</th>
                </tr>
            </thead>
            <tbody>
    `;

    summaryList.forEach(s => {
        html += `
            <tr style="cursor: pointer;" class="tracking-summary-row" data-name="${s.name}" data-period="${periodId}">
                <td style="border: 1px solid #334155; padding: 0.75rem; color: var(--text-main); font-weight: 600;">${s.name} <span style="color:var(--text-muted); font-size:0.8rem; font-weight:normal; margin-left:0.5rem;">(${s.count} วัน)</span></td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; color: var(--text-main);">${s.regHrs.toFixed(2)}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; color: var(--text-main);">${s.otHrs.toFixed(2)}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;

    container.querySelectorAll('.tracking-summary-row').forEach(row => {
        row.addEventListener('click', (e) => {
            container.querySelectorAll('.tracking-summary-row').forEach(r => r.style.backgroundColor = 'transparent');
            e.currentTarget.style.backgroundColor = 'var(--surface)';
            renderTimeTrackingDetails(e.currentTarget.getAttribute('data-period'), e.currentTarget.getAttribute('data-name'));
        });
    });
}

function renderTimeTrackingDetails(periodId, empName) {
    const container = document.getElementById('time-tracking-details-container');
    if (!container || !periodId || !empName) return;

    const period = currentTrackingPeriods.find(p => p.id === periodId);
    if (!period) return;

    const allRecords = processTimeTrackingData();
    const empRecords = allRecords.filter(r => {
        const d = new Date(r.date);
        return r.name === empName && d.getFullYear() === period.year && d.getMonth() === period.month && d.getDate() >= period.start && d.getDate() <= period.end;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    container.style.display = 'block';

    let totalReg = 0;
    let totalOt = 0;

    let html = `
        <h3 class="section-title mb-4" style="color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">
            <i data-lucide="user"></i> รายละเอียดเวลา: ${empName}
        </h3>
        <div style="overflow-x: auto;">
        <table class="schedule-table" style="width: 100%; border-collapse: collapse; min-width: 800px;">
            <thead class="schedule-header">
                <tr>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">วันที่</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">เข้าตามตาราง</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">เวลาเข้าจริง</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">เวลาออกจริง</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">เวลาพัก</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">รวมเวลา</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">ชม. ปกติ</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">ชม. OT</th>
                    <th style="background: #1e293b; color: white; border: 1px solid #334155; padding: 0.75rem;">หมายเหตุ</th>
                </tr>
            </thead>
            <tbody>
    `;

    empRecords.forEach(r => {
        totalReg += (r.regularHours || 0);
        totalOt += (r.otHours || 0);

        const d = new Date(r.date);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = `${dayStr} ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear().toString().substr(-2)}`;
        
        const formatTime = (dateObj) => {
            if (!dateObj) return '-';
            const h = String(dateObj.getHours()).padStart(2, '0');
            const m = String(dateObj.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        };

        const inStr = formatTime(r.inTime);
        const outStr = formatTime(r.outTime);
        const hasMissing = (!r.inTime || !r.outTime);
        const rowBg = hasMissing ? 'background-color: rgba(220, 38, 38, 0.1);' : '';

        const notes = [r.noteIn, r.noteOut].filter(n => n).join(', ');

        html += `
            <tr style="${rowBg}">
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center;">${dateStr}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; font-weight: 600;">${r.scheduledIn || '-'}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center;">${inStr}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center;">${outStr}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center;">${r.breakTime !== undefined ? r.breakTime + ' ชม.' : '-'}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center;">${r.totalHours ? r.totalHours.toFixed(2) : '-'}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; color: var(--success); font-weight: 600;">${r.regularHours ? r.regularHours.toFixed(2) : '-'}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; color: var(--warning); font-weight: 600;">${r.otHours ? r.otHours.toFixed(2) : '-'}</td>
                <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; font-size: 0.85rem;">${notes}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="6" style="border: 1px solid #334155; padding: 0.75rem; text-align: right; font-weight: 700; background: #0f172a;">รวมเวลาทั้งหมด:</td>
                    <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; font-weight: 700; background: #0f172a; color: var(--success);">${totalReg.toFixed(2)}</td>
                    <td style="border: 1px solid #334155; padding: 0.75rem; text-align: center; font-weight: 700; background: #0f172a; color: var(--warning);">${totalOt.toFixed(2)}</td>
                    <td style="border: 1px solid #334155; background: #0f172a;"></td>
                </tr>
            </tfoot>
        </table>
        </div>
    `;

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons({ root: container });
}

// ==========================================
// Saving to API
// ==========================================

let scheduleSaveTimer = null;
let employeeSaveTimer = null;

function setAutoSaveStatus(type, status) {
    const elId = type === 'schedule' ? 'auto-save-status' : 'emp-auto-save-status';
    const el = document.getElementById(elId);
    if (!el) return;
    
    if (status === 'saving') {
        el.style.color = '#eab308'; // yellow
        el.innerHTML = `<svg class="animate-spin" style="width: 16px; height: 16px; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> กำลังบันทึก...`;
    } else if (status === 'saved') {
        el.style.color = 'var(--text-muted)';
        const text = type === 'schedule' ? 'ซิงค์ข้อมูลล่าสุดแล้ว' : 'ข้อมูลพนักงานซิงค์อัตโนมัติแล้ว';
        el.innerHTML = `<i data-lucide="check-circle" style="width: 16px; height: 16px; margin-right: 4px;"></i> ${text}`;
        if (window.lucide) window.lucide.createIcons({ root: el });
    } else if (status === 'error') {
        el.style.color = '#ef4444'; // red
        el.innerHTML = `<i data-lucide="alert-circle" style="width: 16px; height: 16px; margin-right: 4px;"></i> บันทึกไม่สำเร็จ`;
        if (window.lucide) window.lucide.createIcons({ root: el });
    }
}

function triggerAutoSaveSchedule() {
    // Show saving text but don't block UI
    setAutoSaveStatus('schedule', 'saving');
    
    if (scheduleSaveTimer) clearTimeout(scheduleSaveTimer);
    scheduleSaveTimer = setTimeout(async () => {
        try {
            await saveSchedulesToSheet(state.schedules);
            window.clearLocalState('schedules');
            setAutoSaveStatus('schedule', 'saved');
        } catch (e) {
            setAutoSaveStatus('schedule', 'error');
            showToast("เกิดข้อผิดพลาดในการบันทึกตารางงาน", true);
        }
    }, 2500); // 2.5 seconds debounce
}

function triggerAutoSaveEmployee() {
    setAutoSaveStatus('employee', 'saving');
    
    if (employeeSaveTimer) clearTimeout(employeeSaveTimer);
    employeeSaveTimer = setTimeout(async () => {
        try {
            await saveEmployeesToSheet(state.employees);
            window.clearLocalState('employees');
            setAutoSaveStatus('employee', 'saved');
        } catch (e) {
            setAutoSaveStatus('employee', 'error');
            showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูลพนักงาน", true);
        }
    }, 2500);
}
