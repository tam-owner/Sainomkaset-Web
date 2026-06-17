import re

block_to_remove = r'''                <div class="grid grid-cols-2 gap-3 mb-3">\s*<div class="col-span-2">\s*<label class="block text-\[11px\] font-bold text-slate-500 uppercase mb-1">เบิกล่วงหน้า \(รอบนี้\)</label>\s*<input type="number" id="emp-advancepayment" class="w-full border border-red-300 bg-red-50 text-red-700 rounded-lg px-2 py-2 text-center font-bold" placeholder="0">\s*<p class="text-\[10px\] text-red-500 mt-1 text-center">หักออกจากค่าแรงในรอบจ่ายที่กำลังจะถึง</p>\s*</div>\s*</div>'''

for filename in ['index.html', 'admin.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = re.sub(block_to_remove, '', content)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Removed block from {filename}")

