import re

def process_index():
    with open('index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # Generic function to replace standard headers
    # Find:
    # <div class="mb-6 mt-2 flex items-center gap-3">
    #     <button onclick="showView('view-dashboard')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">
    #         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
    #     </button>
    #     <h1 class="text-xl font-black text-slate-800">TITLE</h1>
    #     <div class="flex gap-2 ml-auto">
    #         INNER_BUTTONS
    #     </div>
    # </div>

    pattern1 = r'(<div class="mb-6 mt-2 flex items-center gap-3">\s*)<button onclick="showView\(\'view-dashboard\'\)" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">\s*<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\s*</button>\s*(<h1 class="text-xl font-black text-slate-800">.*?</h1>)\s*<div class="flex gap-2 ml-auto">(.*?)</div>\s*</div>'
    
    def repl1(match):
        pre = match.group(1)
        h1 = match.group(2)
        inner = match.group(3)
        return f'{pre}{h1}\n            <div class="flex gap-2 ml-auto items-center">{inner}\n                <button onclick="showView(\'view-dashboard\')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\n                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\n                </button>\n            </div>\n        </div>'
    
    content = re.sub(pattern1, repl1, content, flags=re.DOTALL)

    # For view-qa where there is NO ml-auto div
    pattern_qa = r'(<div class="mb-6 mt-2 flex items-center gap-3">\s*)<button onclick="showView\(\'view-dashboard\'\)" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">\s*<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\s*</button>\s*(<h1 class="text-xl font-black text-slate-800">.*?</h1>)\s*</div>'
    
    def repl_qa(match):
        pre = match.group(1)
        h1 = match.group(2)
        return f'{pre}{h1}\n            <div class="flex gap-2 ml-auto items-center">\n                <button onclick="showView(\'view-dashboard\')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\n                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\n                </button>\n            </div>\n        </div>'
    
    content = re.sub(pattern_qa, repl_qa, content, flags=re.DOTALL)

    # For view-employee
    pattern_emp = r'(<div class="px-4 mb-4 flex items-center gap-3">\s*)<button onclick="showView\(\'view-dashboard\'\)" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">\s*<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\s*</button>\s*(<div class="flex items-center gap-3">.*?</div>\s*</div>)\s*<div class="flex gap-2 ml-auto">(.*?)</div>\s*</div>'
    
    def repl_emp(match):
        pre = match.group(1)
        user_info = match.group(2)
        inner = match.group(3)
        return f'{pre}{user_info}\n            <div class="flex gap-2 ml-auto items-center">{inner}\n                <button onclick="showView(\'view-dashboard\')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\n                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\n                </button>\n            </div>\n        </div>'
    
    content = re.sub(pattern_emp, repl_emp, content, flags=re.DOTALL)

    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)

def process_admin():
    with open('admin.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # view-admin-overview and view-admin-leaves have text button
    # Replace:
    # <div class="px-4 mb-4 flex justify-between items-center">
    #     <h1 class="text-xl font-black text-slate-800">TITLE</h1>
    #     <div class="flex gap-2">
    #         <button onclick="showView('view-admin-dashboard')" class="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg active:scale-95 transition-all">กลับ</button>
    #     </div>
    # </div>
    # With the circular button
    
    pattern_text = r'(<div class="px-4 mb-4 flex justify-between items-center">\s*<h1 class="text-xl font-black text-slate-800">.*?</h1>\s*<div class="flex gap-2.*?>)\s*<button onclick="showView\(\'(?:view-admin-dashboard|view-dashboard)\'\)" class="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1\.5 rounded-lg active:scale-95 transition-all">กลับ</button>\s*</div>\s*</div>'
    
    def repl_text(match):
        pre = match.group(1)
        return f'{pre}\n                <button onclick="showView(\'view-admin-dashboard\')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\n                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\n                </button>\n            </div>\n        </div>'
    
    content = re.sub(pattern_text, repl_text, content, flags=re.DOTALL)

    # view-stock in admin.html (has circle on left)
    # <div class="mb-6 mt-2 flex items-center gap-3">
    #     <button onclick="showView('view-dashboard')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">
    #         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
    #     </button>
    #     <h1 class="text-xl font-black text-slate-800">นับ Stock</h1>
    #     <div class="flex gap-2 ml-auto">
    
    pattern1 = r'(<div class="mb-6 mt-2 flex items-center gap-3">\s*)<button onclick="showView\(\'view-admin-dashboard\'\)" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">\s*<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\s*</button>\s*(<h1 class="text-xl font-black text-slate-800">.*?</h1>)\s*<div class="flex gap-2 ml-auto">(.*?)</div>\s*</div>'
    
    def repl1(match):
        pre = match.group(1)
        h1 = match.group(2)
        inner = match.group(3)
        return f'{pre}{h1}\n            <div class="flex gap-2 ml-auto items-center">{inner}\n                <button onclick="showView(\'view-admin-dashboard\')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\n                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\n                </button>\n            </div>\n        </div>'
    
    content = re.sub(pattern1, repl1, content, flags=re.DOTALL)

    # view-admin-employees
    # <div class="px-4 mb-4 mt-2 flex items-center gap-3">
    #     <button onclick="showAdminDashboard()" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">
    
    pattern_emp = r'(<div class="px-4 mb-4 mt-2 flex items-center gap-3">\s*)<button onclick="showAdminDashboard\(\)" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95">\s*<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\s*</button>\s*(<h1 class="text-xl font-black text-slate-800">.*?</h1>)\s*<div class="flex gap-2 ml-auto">(.*?)</div>\s*</div>'
    
    def repl_emp(match):
        pre = match.group(1)
        h1 = match.group(2)
        inner = match.group(3)
        return f'{pre}{h1}\n            <div class="flex gap-2 ml-auto items-center">{inner}\n                <button onclick="showAdminDashboard()" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\n                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\n                </button>\n            </div>\n        </div>'
    
    content = re.sub(pattern_emp, repl_emp, content, flags=re.DOTALL)

    with open('admin.html', 'w', encoding='utf-8') as f:
        f.write(content)

process_index()
process_admin()
