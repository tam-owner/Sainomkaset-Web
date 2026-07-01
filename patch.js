const fs = require('fs');

let content = fs.readFileSync('js/app.js', 'utf8');

const regex = /function openRequestTimeEditModal\(date, actualIn, actualOut, schedIn, schedOut\) \{[\s\S]*?\}\)\.then\(\(result\) => \{/;

const replacement = `function openRequestTimeEditModal(date, actualIn, actualOut, schedIn, schedOut) {
    const formatTime = t => (t && t.trim() !== '') ? t : '-';
    
    const getHoursStr = (timeStr) => {
        if (!timeStr || timeStr === '-') return '';
        const match = timeStr.match(/^(\\d{2}):/);
        return match ? match[1] : '';
    };
    
    const getMinsStr = (timeStr) => {
        if (!timeStr || timeStr === '-') return '';
        const match = timeStr.match(/:(\\d{2})/);
        return match ? match[1] : '';
    };

    const inH = getHoursStr(schedIn || actualIn);
    const inM = getMinsStr(schedIn || actualIn);
    const outH = getHoursStr(schedOut || actualOut);
    const outM = getMinsStr(schedOut || actualOut);

    const hoursOptions = (selected) => Array.from({length: 24}, (_, i) => {
        const val = i.toString().padStart(2, '0');
        return \`<option value="\${val}" \${selected === val ? 'selected' : ''}>\${val}</option>\`;
    }).join('');

    const minsOptions = (selected) => Array.from({length: 60}, (_, i) => {
        const val = i.toString().padStart(2, '0');
        return \`<option value="\${val}" \${selected === val ? 'selected' : ''}>\${val}</option>\`;
    }).join('');

    Swal.fire({
        title: '<div class="text-xl font-black text-slate-800">ขอแก้ไขเวลาเข้า-ออกงาน</div>',
        html: \`
            <div class="text-left mt-1">
                <!-- Header / Date -->
                <div class="text-center mb-5">
                    <div class="inline-flex items-center justify-center px-5 py-2 bg-indigo-100 text-indigo-800 rounded-full text-[15px] font-black tracking-wide shadow-sm border border-indigo-200/50">
                        \${formatDateStr(date)}
                    </div>
                </div>

                <!-- Previous Time -->
                <div class="bg-slate-50/80 rounded-2xl p-4 mb-4 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div class="text-[11px] font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        เวลาเดิมที่บันทึกไว้
                    </div>
                    
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex-1 flex flex-col items-center justify-center">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">เข้างาน</div>
                            <div class="text-xl font-black \${(schedIn || actualIn) ? 'text-slate-700' : 'text-slate-300'} leading-none mb-1.5">\${formatTime(schedIn || actualIn)}</div>
                            \${schedIn && schedIn !== actualIn ? \`<div class="text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md leading-tight">จริง: \${formatTime(actualIn)}</div>\` : ''}
                        </div>
                        <div class="text-slate-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </div>
                        <div class="flex-1 flex flex-col items-center justify-center">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ออกงาน</div>
                            <div class="text-xl font-black \${(schedOut || actualOut) ? 'text-slate-700' : 'text-slate-300'} leading-none mb-1.5">\${formatTime(schedOut || actualOut)}</div>
                            \${schedOut && schedOut !== actualOut ? \`<div class="text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md leading-tight">จริง: \${formatTime(actualOut)}</div>\` : ''}
                        </div>
                    </div>
                </div>

                <!-- New Time Selection (Dropdowns) -->
                <div class="bg-indigo-50/50 rounded-2xl p-4 mb-4 border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                    <div class="text-[12px] font-bold text-indigo-700 mb-3 flex items-center gap-1.5 pl-1.5">
                        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        ระบุเวลาใหม่ที่ต้องการแก้ไข
                    </div>
                    
                    <!-- Row 1: IN -->
                    <div class="bg-white rounded-xl p-3 mb-3 border border-indigo-100/50 shadow-sm flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                            </div>
                            <div class="text-[13px] font-bold text-slate-700">เข้างาน</div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <select id="req-in-h" class="bg-slate-50 border border-slate-200 text-indigo-700 font-bold text-lg rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none text-center min-w-[55px] cursor-pointer hover:bg-indigo-50 transition-colors">
                                <option value="">--</option>
                                \${hoursOptions(inH)}
                            </select>
                            <span class="text-slate-400 font-bold">:</span>
                            <select id="req-in-m" class="bg-slate-50 border border-slate-200 text-indigo-700 font-bold text-lg rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none text-center min-w-[55px] cursor-pointer hover:bg-indigo-50 transition-colors">
                                <option value="">--</option>
                                \${minsOptions(inM)}
                            </select>
                        </div>
                    </div>

                    <!-- Row 2: OUT -->
                    <div class="bg-white rounded-xl p-3 border border-indigo-100/50 shadow-sm flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                            </div>
                            <div class="text-[13px] font-bold text-slate-700">ออกงาน</div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <select id="req-out-h" class="bg-slate-50 border border-slate-200 text-indigo-700 font-bold text-lg rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none text-center min-w-[55px] cursor-pointer hover:bg-indigo-50 transition-colors">
                                <option value="">--</option>
                                \${hoursOptions(outH)}
                            </select>
                            <span class="text-slate-400 font-bold">:</span>
                            <select id="req-out-m" class="bg-slate-50 border border-slate-200 text-indigo-700 font-bold text-lg rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none text-center min-w-[55px] cursor-pointer hover:bg-indigo-50 transition-colors">
                                <option value="">--</option>
                                \${minsOptions(outM)}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Reason -->
                <div class="bg-rose-50/50 rounded-2xl p-4 border border-rose-100 shadow-sm relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-1.5 h-full bg-rose-400"></div>
                    <label class="block text-[12px] font-bold text-rose-700 mb-2 flex items-center gap-1.5 pl-1.5">
                        <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        เหตุผลที่ขอแก้ไข <span class="text-rose-500">*</span>
                    </label>
                    <div class="pl-1.5">
                        <textarea id="req-reason" rows="2" class="w-full bg-white border border-rose-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-rose-500/20 focus:border-rose-400 transition-all shadow-sm resize-none placeholder-slate-400" placeholder="โปรดระบุเหตุผลที่ชัดเจน (เช่น ลืมสแกน, สแกนไม่ติด)..."></textarea>
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
            confirmButton: 'bg-[#5b52f6] text-white rounded-xl px-6 py-2.5 font-bold shadow-sm',
            cancelButton: 'bg-slate-100 text-slate-600 rounded-xl px-6 py-2.5 font-bold'
        },
        preConfirm: () => {
            const inH = document.getElementById('req-in-h').value;
            const inM = document.getElementById('req-in-m').value;
            const outH = document.getElementById('req-out-h').value;
            const outM = document.getElementById('req-out-m').value;
            const reason = document.getElementById('req-reason').value.trim();

            if (!reason) {
                Swal.showValidationMessage('กรุณาระบุเหตุผลในการแก้ไขเวลา');
                return false;
            }
            if ((inH && !inM) || (!inH && inM)) {
                Swal.showValidationMessage('กรุณาระบุเวลาเข้างานให้ครบถ้วน');
                return false;
            }
            if ((outH && !outM) || (!outH && outM)) {
                Swal.showValidationMessage('กรุณาระบุเวลาออกงานให้ครบถ้วน');
                return false;
            }
            
            const newIn = (inH && inM) ? \`\${inH}:\${inM}\` : '';
            const newOut = (outH && outM) ? \`\${outH}:\${outM}\` : '';

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
