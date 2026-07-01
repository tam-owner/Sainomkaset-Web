const fs = require('fs');

let content = fs.readFileSync('js/app.js', 'utf8');

const regex = /function openRequestTimeEditModal\(date, actualIn, actualOut, schedIn, schedOut\) \{[\s\S]*?\}\)\.then\(\(result\) => \{/;

const replacement = `function openRequestTimeEditModal(date, actualIn, actualOut, schedIn, schedOut) {
    const formatTime = t => (t && t.trim() !== '') ? t : '-';
    const getH = t => {
        if (!t || t === '-') return '';
        const m = t.match(/^(\\d{2}):/);
        return m ? m[1] : '';
    };
    const getM = t => {
        if (!t || t === '-') return '';
        const m = t.match(/:(\\d{2})/);
        return m ? m[1] : '';
    };

    const inH = getH(schedIn || actualIn);
    let inM = getM(schedIn || actualIn);
    const outH = getH(schedOut || actualOut);
    let outM = getM(schedOut || actualOut);

    // Normalize minutes to 00 or 30 for the dropdown
    if (inM && inM !== '00' && inM !== '30') {
        inM = parseInt(inM) < 15 ? '00' : (parseInt(inM) < 45 ? '30' : '00');
    }
    if (outM && outM !== '00' && outM !== '30') {
        outM = parseInt(outM) < 15 ? '00' : (parseInt(outM) < 45 ? '30' : '00');
    }

    const hoursOptions = (selected) => {
        let opts = '';
        for (let i = 0; i <= 23; i++) {
            let v = String(i).padStart(2, '0');
            opts += \`<option value="\${v}" \${selected === v ? 'selected' : ''}>\${v}</option>\`;
        }
        return opts;
    };

    Swal.fire({
        title: '<div class="text-[18px] font-black text-slate-800 mb-1">แก้ไขเวลา</div>',
        html: \`
            <div class="space-y-4 text-left px-1">
                <!-- Header -->
                <div class="text-center">
                    <div class="inline-flex items-center justify-center px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[14px] font-bold border border-indigo-100">
                        \${formatDateStr(date)}
                    </div>
                </div>

                <!-- Combined Time Section -->
                <div class="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <div class="flex flex-col gap-3">
                        
                        <!-- IN ROW -->
                        <div class="flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="text-[13px] font-bold text-slate-700">เข้างาน</span>
                                <span class="text-[11px] text-slate-500 font-medium">เดิม: \${formatTime(schedIn || actualIn)}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <select id="req-in-h" class="bg-white border border-slate-300 text-indigo-700 font-bold text-[16px] rounded-lg px-2 py-1.5 focus:border-indigo-500 outline-none w-[65px] text-center shadow-sm">
                                    <option value="">--</option>
                                    \${hoursOptions(inH)}
                                </select>
                                <span class="font-bold text-slate-400">:</span>
                                <select id="req-in-m" class="bg-white border border-slate-300 text-indigo-700 font-bold text-[16px] rounded-lg px-2 py-1.5 focus:border-indigo-500 outline-none w-[65px] text-center shadow-sm">
                                    <option value="">--</option>
                                    <option value="00" \${inM === '00' ? 'selected' : ''}>00</option>
                                    <option value="30" \${inM === '30' ? 'selected' : ''}>30</option>
                                </select>
                            </div>
                        </div>

                        <hr class="border-slate-200">

                        <!-- OUT ROW -->
                        <div class="flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="text-[13px] font-bold text-slate-700">ออกงาน</span>
                                <span class="text-[11px] text-slate-500 font-medium">เดิม: \${formatTime(schedOut || actualOut)}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <select id="req-out-h" class="bg-white border border-slate-300 text-indigo-700 font-bold text-[16px] rounded-lg px-2 py-1.5 focus:border-indigo-500 outline-none w-[65px] text-center shadow-sm">
                                    <option value="">--</option>
                                    \${hoursOptions(outH)}
                                </select>
                                <span class="font-bold text-slate-400">:</span>
                                <select id="req-out-m" class="bg-white border border-slate-300 text-indigo-700 font-bold text-[16px] rounded-lg px-2 py-1.5 focus:border-indigo-500 outline-none w-[65px] text-center shadow-sm">
                                    <option value="">--</option>
                                    <option value="00" \${outM === '00' ? 'selected' : ''}>00</option>
                                    <option value="30" \${outM === '30' ? 'selected' : ''}>30</option>
                                </select>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Reason -->
                <div>
                    <label class="block text-[13px] font-bold text-slate-700 mb-1.5 pl-1">
                        เหตุผล <span class="text-rose-500">*</span>
                    </label>
                    <textarea id="req-reason" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13.5px] focus:border-indigo-400 outline-none resize-none shadow-inner" placeholder="ระบุเหตุผล..."></textarea>
                </div>
            </div>
        \`,
        showCancelButton: true,
        confirmButtonText: 'ส่งคำขอ',
        cancelButtonText: 'ยกเลิก',
        width: '90%',
        customClass: {
            popup: 'rounded-[20px] max-w-md w-full',
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
console.log("Patched app.js successfully");
