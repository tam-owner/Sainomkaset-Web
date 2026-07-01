const fs = require('fs');
let content = fs.readFileSync('js/app.js', 'utf8');

const regex = /function openRequestTimeEditModal\(date, actualIn, actualOut, schedIn, schedOut\) \{[\s\S]*?\}\)\.then\(\(result\) => \{/;

const replacement = `function openRequestTimeEditModal(date, actualIn, actualOut, schedIn, schedOut) {
    const formatTime = t => (t && t.trim() !== '') ? t : '-';

    Swal.fire({
        title: '<div class="text-xl font-black text-slate-800 mb-2">ขอแก้ไขเวลาเข้า-ออกงาน</div>',
        html: \`
            <div class="text-left">
                <!-- Header / Date -->
                <div class="text-center mb-6">
                    <div class="inline-flex items-center justify-center px-6 py-2 bg-indigo-100 text-indigo-800 rounded-full text-[16px] font-black tracking-wide shadow-sm border border-indigo-200">
                        \${formatDateStr(date)}
                    </div>
                </div>

                <!-- Previous Time -->
                <div class="bg-slate-50/80 rounded-2xl p-4 mb-5 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div class="text-[12px] font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        เวลาเดิมที่บันทึกไว้
                    </div>
                    
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex-1 flex flex-col items-center justify-center bg-white py-3 rounded-xl border border-slate-100 shadow-sm">
                            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">เข้างาน</div>
                            <div class="text-2xl font-black \${(schedIn || actualIn) ? 'text-slate-700' : 'text-slate-300'} leading-none mb-1.5">\${formatTime(schedIn || actualIn)}</div>
                            \${schedIn && schedIn !== actualIn ? \`<div class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md leading-tight">จริง: \${formatTime(actualIn)}</div>\` : ''}
                        </div>
                        <div class="text-slate-300">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                        <div class="flex-1 flex flex-col items-center justify-center bg-white py-3 rounded-xl border border-slate-100 shadow-sm">
                            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">ออกงาน</div>
                            <div class="text-2xl font-black \${(schedOut || actualOut) ? 'text-slate-700' : 'text-slate-300'} leading-none mb-1.5">\${formatTime(schedOut || actualOut)}</div>
                            \${schedOut && schedOut !== actualOut ? \`<div class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md leading-tight">จริง: \${formatTime(actualOut)}</div>\` : ''}
                        </div>
                    </div>
                </div>

                <!-- New Time Selection (Flatpickr) -->
                <div class="bg-indigo-50/50 rounded-2xl p-4 mb-5 border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                    <div class="text-[13px] font-bold text-indigo-700 mb-4 flex items-center gap-1.5 pl-1.5">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        ระบุเวลาใหม่ที่ต้องการแก้ไข
                    </div>
                    
                    <!-- Row 1: IN -->
                    <div class="bg-white rounded-xl p-3 mb-3 border border-indigo-100 shadow-sm flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                            </div>
                            <div class="text-[14px] font-bold text-slate-700">เข้างาน</div>
                        </div>
                        <div class="relative w-32">
                            <input type="text" id="req-time-in" value="\${schedIn || actualIn || ''}" class="flatpickr-time w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-center text-xl font-black text-indigo-700 cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner" placeholder="--:--">
                        </div>
                    </div>

                    <!-- Row 2: OUT -->
                    <div class="bg-white rounded-xl p-3 border border-indigo-100 shadow-sm flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            </div>
                            <div class="text-[14px] font-bold text-slate-700">ออกงาน</div>
                        </div>
                        <div class="relative w-32">
                            <input type="text" id="req-time-out" value="\${schedOut || actualOut || ''}" class="flatpickr-time w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-center text-xl font-black text-indigo-700 cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner" placeholder="--:--">
                        </div>
                    </div>
                </div>

                <!-- Reason -->
                <div class="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 shadow-sm relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-rose-400"></div>
                    <label class="block text-[13px] font-bold text-rose-700 mb-2 flex items-center gap-1.5 pl-1.5">
                        <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        เหตุผลที่ขอแก้ไข <span class="text-rose-500">*</span>
                    </label>
                    <div class="pl-1.5">
                        <textarea id="req-reason" rows="2" class="w-full bg-white border border-rose-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all shadow-inner resize-none placeholder-slate-400" placeholder="โปรดระบุเหตุผลที่ชัดเจน (เช่น ลืมสแกน, สแกนไม่ติด)..."></textarea>
                    </div>
                </div>
            </div>
        \`,
        showCancelButton: true,
        confirmButtonText: 'ส่งคำขอ',
        cancelButtonText: 'ยกเลิก',
        width: '95%',
        customClass: {
            popup: 'rounded-[24px] max-w-2xl w-full',
            confirmButton: 'bg-[#5b52f6] text-white rounded-xl px-6 py-3 font-bold shadow-sm text-[15px]',
            cancelButton: 'bg-slate-100 text-slate-600 rounded-xl px-6 py-3 font-bold text-[15px]'
        },
        didOpen: () => {
            if (typeof flatpickr !== 'undefined') {
                flatpickr(".flatpickr-time", {
                    enableTime: true,
                    noCalendar: true,
                    dateFormat: "H:i",
                    time_24hr: true,
                    disableMobile: true,
                    minuteIncrement: 30
                });
            }
        },
        preConfirm: () => {
            const newIn = document.getElementById('req-time-in').value;
            const newOut = document.getElementById('req-time-out').value;
            const reason = document.getElementById('req-reason').value.trim();

            if (!reason) {
                Swal.showValidationMessage('กรุณาระบุเหตุผลในการแก้ไขเวลา');
                return false;
            }
            if (!newIn && !newOut) {
                Swal.showValidationMessage('กรุณาระบุเวลาใหม่อย่างน้อย 1 อย่าง');
                return false;
            }

            return {
                name: loggedInEmployee.name,
                date: date,
                originalIn: formatTime(actualIn),
                originalOut: formatTime(actualOut),
                newIn: newIn || '-',
                newOut: newOut || '-',
                reason: reason
            };
        }
    }).then((result) => {`;

content = content.replace(regex, replacement);
fs.writeFileSync('js/app.js', content);
