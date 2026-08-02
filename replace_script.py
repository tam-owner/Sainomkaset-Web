import re

with open('js/app.js', 'r') as f:
    content = f.read()

# Define the start and end of the block we want to replace
start_marker = r'<div class="space-y-3">'
end_marker = r'}\)\(\)}'

pattern = start_marker + r'.*?' + end_marker

replacement = """${(function() {
                const statusObj = getPeriodStatus(currentPeriodVal);
                if (statusObj.state === 'normal' || statusObj.state === 'manager_review') {
                    return `
                    <div class="flex gap-3 mb-4 mt-2">
                        <div class="flex-1 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center shadow-sm">
                            <span class="text-[11px] font-bold text-emerald-600 mb-1 tracking-wide">เวลาทำงานปกติ</span>
                            <span class="text-xl font-black text-emerald-700">${totalNormalHours.toFixed(1)} <span class="text-sm font-bold text-emerald-600/80">ชม.</span></span>
                        </div>
                        <div class="flex-1 p-3 bg-orange-50 rounded-xl border border-orange-100 flex flex-col items-center justify-center shadow-sm">
                            <span class="text-[11px] font-bold text-orange-600 mb-1 tracking-wide">ล่วงเวลา (OT)</span>
                            <span class="text-xl font-black text-orange-700">${totalOTHours.toFixed(1)} <span class="text-sm font-bold text-orange-600/80">ชม.</span></span>
                        </div>
                    </div>
                    <div class="bg-amber-50 rounded-[20px] p-5 flex flex-col justify-center items-center shadow-md border border-amber-200">
                        <div class="bg-amber-100 p-3 rounded-full mb-2">
                            <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h3 class="text-[15px] font-black text-amber-800 text-center">กำลังดำเนินการ / ยังไม่สรุปยอด</h3>
                        <p class="text-[11px] font-medium text-amber-700 text-center mt-1 leading-relaxed">ยอดเงินจะแสดงเมื่อผู้จัดการ<br>เปิดให้ตรวจสอบข้อมูลในรอบถัดไป</p>
                    </div>
                    `;
                } else {
                    let html = `
            <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-white rounded-xl border border-emerald-100/50 shadow-sm transition-all hover:shadow-md">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-sm font-bold text-slate-700">${isFullTime ? 'ค่าแรงครึ่งเดือน' : 'ค่าแรงปกติ'}</span>
                            <div class="mt-1 flex items-center gap-1.5 text-[11.5px] text-slate-500 font-medium tracking-wide">
                                ${isFullTime 
                                    ? `<span class="text-[12.5px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-[1px] rounded-md shadow-sm border border-emerald-200 tracking-wide">฿${formatCurrencyNoDecimals(empObj.monthlyRate)} ÷ 2</span>`
                                    : `<span class="text-[12.5px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-[1px] rounded-md shadow-sm border border-emerald-200 tracking-wide">${totalNormalHours.toFixed(1)} ชม.</span>
                                       <span>× ฿${formatCurrency(empObj.normalRate)}/ชม.</span>`
                                }
                            </div>
                        </div>
                    </div>
                    <span class="text-lg font-black text-slate-800">฿${formatCurrencySmallDecimals(normalPay)}</span>
                </div>

                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-white rounded-xl border border-orange-100/50 shadow-sm transition-all hover:shadow-md">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shadow-inner">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-sm font-bold text-slate-700">ค่าล่วงเวลา (OT)</span>
                            <div class="mt-1 flex items-center gap-1.5 text-[11.5px] text-slate-500 font-medium tracking-wide">
                                <span class="text-[12.5px] font-bold text-orange-600 bg-orange-100/80 px-1.5 py-[1px] rounded-md shadow-sm border border-orange-200 tracking-wide">${totalOTHours.toFixed(1)} ชม.</span>
                                <span>× ฿${formatCurrency(empObj.otRate)}/ชม.</span>
                            </div>
                        </div>
                    </div>
                    <span class="text-lg font-black text-slate-800">฿${formatCurrencySmallDecimals(otPay)}</span>
                </div>
            </div>
            `;
                    if (customDeductHtml) {
                        html += `
            <div class="mt-3 pt-2 border-t border-slate-100">
                <div class="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 space-y-1">
                    ${customDeductHtml}
                </div>
            </div>
                        `;
                    }
                    html += `
            <div class="flex justify-between items-center px-2 mt-4 mb-2">
                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">${beforeDeductLabel}</span>
                <span class="text-sm font-black text-slate-700">฿${formatCurrency(payBeforeTax)}</span>
            </div>
                    `;
                    if (standardDeduct > 0) {
                        html += `
            <div class="flex justify-between items-center px-2 mb-2">
                <span class="text-xs font-bold text-red-500 uppercase tracking-wide">${deductLabel}</span>
                <span class="text-sm font-black text-red-600">-฿${formatCurrency(standardDeduct)}</span>
            </div>
                        `;
                    }

                    if (statusObj.state === 'locked') {
                        html += `
                        <div class="bg-slate-100 rounded-[20px] p-5 flex flex-col justify-center items-center shadow-lg mt-4 border border-slate-200">
                            <div class="bg-slate-200 p-3 rounded-full mb-2">
                                <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z"></path></svg>
                            </div>
                            <h3 class="text-[15px] font-black text-slate-700 text-center">ปิดยอดเงินแล้ว</h3>
                            <p class="text-[11px] font-medium text-slate-500 text-center mt-1 leading-relaxed">ยอดเงินรอบนี้ถูกโอนเรียบร้อย<br>ไม่สามารถแก้ไขข้อมูลได้อีก</p>
                        </div>
                        `;
                    } else if (statusObj.state === 'employee_review') {
                        let employeeReviewBanner = '';
                        const passed = isDeadlinePassed(statusObj.deadline);
                        if (!passed) {
                            const dl = new Date(statusObj.deadline);
                            const dlStr = `${dl.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][dl.getMonth()]} ${dl.getFullYear() + 543} เวลา ${String(dl.getHours()).padStart(2,'0')}:${String(dl.getMinutes()).padStart(2,'0')} น.`;
                            employeeReviewBanner = `
                                <div class="bg-blue-50 border border-blue-200 rounded-[16px] p-4 mt-4 shadow-sm flex items-start gap-3">
                                    <svg class="w-6 h-6 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <div>
                                        <h4 class="text-[13px] font-black text-blue-800">กรุณาตรวจสอบยอดเงิน</h4>
                                        <p class="text-[11px] font-medium text-blue-700 mt-0.5 leading-relaxed">หากต้องการขอแก้ไขให้แจ้งภายใน <span class="font-bold underline">${dlStr}</span> หากพ้นกำหนดจะถือว่ายืนยันยอดนี้</p>
                                    </div>
                                </div>
                            `;
                        } else {
                            employeeReviewBanner = `
                                <div class="bg-rose-50 border border-rose-200 rounded-[16px] p-4 mt-4 shadow-sm flex items-start gap-3">
                                    <svg class="w-6 h-6 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    <div>
                                        <h4 class="text-[13px] font-black text-rose-800">หมดเวลาขอแก้ไขแล้ว</h4>
                                        <p class="text-[11px] font-medium text-rose-700 mt-0.5 leading-relaxed">ระบบได้ถือว่ายอดนี้ได้รับการยืนยันแล้ว และไม่สามารถขอแก้ไขได้อีก</p>
                                    </div>
                                </div>
                            `;
                        }
                        html += employeeReviewBanner;
                        html += `
                        <div ${isPayDateReached ? `onclick="downloadPayslipPdf('${empObj.name}')"` : ""} class="${isPayDateReached ? 'bg-[#0fa981] shadow-[#0fa981]/40 cursor-pointer active:scale-95 transition-transform duration-200 group' : 'bg-slate-800 shadow-slate-800/40'} rounded-[20px] p-5 flex justify-between items-center shadow-lg mt-4 relative overflow-hidden">
                            <div class="relative z-10 flex flex-col">
                                <p class="text-[11px] font-black ${isPayDateReached ? 'text-emerald-50' : 'text-slate-300'} uppercase tracking-widest">${isPayDateReached ? 'รวมรายได้สุทธิ' : 'รายได้สะสมรอบปัจจุบัน'}</p>
                                ${!isPayDateReached ? `<p class="text-[9.5px] text-yellow-300 font-bold mb-1">*จะได้รับเมื่อถึงรอบจ่าย${payDateText}*</p>` : ''}
                                ${isPayDateReached ? `
                                <div class="mt-2 flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full w-max opacity-90 group-hover:opacity-100 transition-opacity">
                                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                    <span class="text-[10px] font-bold text-white">แตะเพื่อโหลดสลิป</span>
                                </div>` : ''}
                            </div>
                            <div class="text-3xl font-black text-white tracking-normal relative z-10 flex items-baseline">
                                <span class="text-lg ${isPayDateReached ? 'text-emerald-200' : 'text-slate-400'} mr-1.5 font-bold">฿</span>${formatCurrencySmallDecimals(netPay)}
                            </div>
                        </div>
                        `;
                    }
                    
                    return html;
                }
            })()}"""

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
with open('js/app.js', 'w') as f:
    f.write(new_content)
print("Replaced!")
