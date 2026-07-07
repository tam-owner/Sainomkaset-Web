import sys
with open('js/app.js', 'r') as f:
    content = f.read()

# Fix calcInStr / calcOutStr
target_calc = """                let calcInStr = (rec.scheduledIn && rec.scheduledIn !== '-') ? rec.scheduledIn : (rec.inTime ? `${String(rec.inTime.getHours()).padStart(2, '0')}:${String(rec.inTime.getMinutes()).padStart(2, '0')}` : null);
                let calcOutStr = (rec.scheduledOut && rec.scheduledOut !== '-') ? rec.scheduledOut : (rec.outTime ? `${String(rec.outTime.getHours()).padStart(2, '0')}:${String(rec.outTime.getMinutes()).padStart(2, '0')}` : null);"""

replacement_calc = """                let calcInStr = (rec.manualIn) ? rec.manualIn : ((rec.scheduledIn && rec.scheduledIn !== '-') ? rec.scheduledIn : (rec.inTime ? `${String(rec.inTime.getHours()).padStart(2, '0')}:${String(rec.inTime.getMinutes()).padStart(2, '0')}` : null));
                let calcOutStr = (rec.manualOut) ? rec.manualOut : ((rec.scheduledOut && rec.scheduledOut !== '-') ? rec.scheduledOut : (rec.outTime ? `${String(rec.outTime.getHours()).padStart(2, '0')}:${String(rec.outTime.getMinutes()).padStart(2, '0')}` : null));"""

if target_calc in content:
    content = content.replace(target_calc, replacement_calc)
else:
    print("Could not find target_calc")

# Fix isPartialScan
target_partial = """        const isPartialScan = (row.inTime && !row.outTime) || (!row.inTime && row.outTime);

        let inClass = `${isPartialScan && !row.inTime ? '' : 'scan-time-text'} text-[11px] font-medium mt-1 ${row.isLate ? 'text-red-500' : 'text-slate-500'}`;
        let outClass = `${isPartialScan && !row.outTime ? '' : 'scan-time-text'} text-[11px] font-medium mt-1 text-slate-500`;"""

replacement_partial = """        let effectiveIn = row.manualIn || row.inTime;
        let effectiveOut = row.manualOut || row.outTime;
        const isPartialScan = (effectiveIn && !effectiveOut) || (!effectiveIn && effectiveOut);

        let inClass = `${isPartialScan && !effectiveIn ? '' : 'scan-time-text'} text-[11px] font-medium mt-1 ${row.isLate ? 'text-red-500' : 'text-slate-500'}`;
        let outClass = `${isPartialScan && !effectiveOut ? '' : 'scan-time-text'} text-[11px] font-medium mt-1 text-slate-500`;"""

if target_partial in content:
    content = content.replace(target_partial, replacement_partial)
else:
    print("Could not find target_partial")

# Fix the override of inDisplay and outDisplay
target_override = """        if (isPartialScan && !row.inTime) inDisplay = `<span class="text-red-500 text-[11px] font-bold tracking-tight block leading-tight">ไม่มี<br>เข้างาน</span><div ${onclickStr} class="scan-time-text text-white text-[9.5px] font-bold tracking-tight px-2 py-1 bg-orange-500 rounded-md shadow-sm hover:bg-orange-600 active:scale-95 transition-all cursor-pointer inline-block mt-1">${isAdmin ? 'แก้ไข' : 'ขอแก้ไข'}</div>`;
        
        if (isPartialScan && !row.outTime) outDisplay = `<span class="text-red-500 text-[11px] font-bold tracking-tight block leading-tight">ไม่มี<br>ออกงาน</span><div ${onclickStr} class="scan-time-text text-white text-[9.5px] font-bold tracking-tight px-2 py-1 bg-orange-500 rounded-md shadow-sm hover:bg-orange-600 active:scale-95 transition-all cursor-pointer inline-block mt-1">${isAdmin ? 'แก้ไข' : 'ขอแก้ไข'}</div>`;"""

replacement_override = """        if (isPartialScan && !effectiveIn) inDisplay = `<span class="text-red-500 text-[11px] font-bold tracking-tight block leading-tight">ไม่มี<br>เข้างาน</span><div ${onclickStr} class="scan-time-text text-white text-[9.5px] font-bold tracking-tight px-2 py-1 bg-orange-500 rounded-md shadow-sm hover:bg-orange-600 active:scale-95 transition-all cursor-pointer inline-block mt-1">${isAdmin ? 'แก้ไข' : 'ขอแก้ไข'}</div>`;
        
        if (isPartialScan && !effectiveOut) outDisplay = `<span class="text-red-500 text-[11px] font-bold tracking-tight block leading-tight">ไม่มี<br>ออกงาน</span><div ${onclickStr} class="scan-time-text text-white text-[9.5px] font-bold tracking-tight px-2 py-1 bg-orange-500 rounded-md shadow-sm hover:bg-orange-600 active:scale-95 transition-all cursor-pointer inline-block mt-1">${isAdmin ? 'แก้ไข' : 'ขอแก้ไข'}</div>`;"""

if target_override in content:
    content = content.replace(target_override, replacement_override)
else:
    print("Could not find target_override")

with open('js/app.js', 'w') as f:
    f.write(content)
print("Success fixing isPartialScan and calculation")
