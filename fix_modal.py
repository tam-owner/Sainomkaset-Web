import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target = """function openEditLogModal(dateStr = '', timeIn = '', timeOut = '', type = 'Work', actualIn = '', actualOut = '') {"""
if target not in content:
    target = """function openEditLogModal(dateStr = '', timeIn = '', timeOut = '', type = 'Work') {"""
    replacement = """function openEditLogModal(dateStr = '', timeIn = '', timeOut = '', type = 'Work', actualInStr = '', actualOutStr = '') {"""
    content = content.replace(target, replacement)
    print("Updated signature")

target_2 = """                <div id="swal-time-inputs" style="display: ${type === 'Work' ? 'block' : 'none'};">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[13px] font-bold text-slate-700 mb-1.5">เวลาเข้า</label>
                            <input type="time" id="swal-log-in" class="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" value="${timeIn}">
                        </div>
                        <div>
                            <label class="block text-[13px] font-bold text-slate-700 mb-1.5">เวลาออก</label>
                            <input type="time" id="swal-log-out" class="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" value="${timeOut}">
                        </div>
                    </div>
                </div>"""

replacement_2 = """                <div id="swal-time-inputs" style="display: ${type === 'Work' ? 'block' : 'none'};">
                    <div class="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 mb-3">
                        <div class="text-[12px] font-black text-indigo-700 mb-2">เวลาตามตาราง (เปลี่ยนกะ)</div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">เวลาเข้าตาราง</label>
                                <input type="time" id="swal-log-in" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" value="${timeIn}">
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">เวลาออกตาราง</label>
                                <input type="time" id="swal-log-out" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition" value="${timeOut}">
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                        <div class="text-[12px] font-black text-slate-700 mb-2">เวลาสแกนจริง (แก้ไขกรณีลืมสแกน)</div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">เวลาเข้าจริง</label>
                                <input type="time" id="swal-actual-in" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition" value="${actualInStr}">
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-600 mb-1">เวลาออกจริง</label>
                                <input type="time" id="swal-actual-out" class="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition" value="${actualOutStr}">
                            </div>
                        </div>
                    </div>
                </div>"""

if target_2 in content:
    content = content.replace(target_2, replacement_2)
    print("Replaced target_2")
else:
    print("Could not find target_2")

with open('js/app.js', 'w') as f:
    f.write(content)
