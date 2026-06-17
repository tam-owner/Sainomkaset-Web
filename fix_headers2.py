import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern for back button
    btn_pattern = r'\s*<button onclick="showView\(\'(view-dashboard|view-admin-dashboard)\'\)" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\s*<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\s*</button>'
    
    # Remove all back buttons first
    # Wait! If we remove them, we might lose the 'view-dashboard' vs 'view-admin-dashboard' info!
    # Instead, let's find the header block and rewrite it.
    
    # 1. view-profile, view-leave, view-stock, view-checklist, view-qa
    # They have:
    # <div class="mb-6 mt-2 flex items-center gap-3">
    #     <h1 ...>...</h1>
    #     <div class="flex gap-2 ml-auto items-center">
    #         ... (maybe other buttons) ...
    #         <button onclick="showView('view-dashboard')" ...> ... </button>
    #     </div>
    # </div>
    
    # 2. view-admin-overview, view-admin-leaves
    # They have:
    # <div class="px-4 mb-4 flex justify-between items-center">
    #     <h1 class="...">...</h1>
    #     <button onclick="showView('view-admin-dashboard')" ...> ... </button>
    # </div>
    # Or in index.html, they might have:
    # <div class="px-4 mb-4 flex justify-between items-center">
    #     <h1 class="...">...</h1>
    #     <div class="flex gap-2">
    #          <button onclick="showView('view-admin-dashboard')" ...> ... </button>
    #     </div>
    # </div>

    # 3. view-employee
    # <div class="px-4 mb-4 flex items-center gap-3">
    #     <div class="flex items-center gap-3">
    #         ... avatar & name ...
    #     </div>
    #     <div class="flex gap-2 ml-auto items-center">
    #         ... settings & logout ...
    #         <button onclick="showView('view-dashboard')" ...> ... </button>
    #     </div>
    # </div>

    # Let's just do generic replacements:
    # Remove ALL back buttons:
    new_content = re.sub(btn_pattern, '', content)
    
    # Now, add the correct back button to each view.
    views_employee = ['view-profile', 'view-leave', 'view-stock', 'view-checklist', 'view-qa']
    views_admin = ['view-admin-overview', 'view-admin-leaves']
    
    for view in views_employee:
        # Match the start of the header block
        pattern = f'(<div id="{view}"[^>]*>\\s*<div class="[^"]*flex[^"]*items-center[^"]*">\\s*)(<h1 class="text-xl font-black text-slate-800">.*?</h1>)'
        def repl(m):
            return m.group(1) + \
            '''<button onclick="showView('view-dashboard')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>\n            ''' + m.group(2)
        new_content = re.sub(pattern, repl, new_content)

    for view in views_admin:
        # Match the start of the header block
        # Admin header uses justify-between, we should change it to items-center gap-3 like the employee views,
        # OR keep justify-between but wrap the button and h1 in a flex div.
        # Let's change `justify-between` to `items-center gap-3` and add `ml-auto` to the right buttons if any.
        # Wait, admin headers usually don't have right buttons, EXCEPT maybe view-admin-dashboard (which is not a view with a back button).
        pattern = f'(<div id="{view}"[^>]*>\\s*)<div class="px-4 mb-4 flex justify-between items-center">(\\s*<h1 class="text-xl font-black text-slate-800">.*?</h1>\\s*(?:<div class="flex gap-2">\\s*</div>)?)'
        def repl_admin(m):
            return m.group(1) + '<div class="px-4 mb-4 flex items-center gap-3">\n            ' + \
            '''<button onclick="showView('view-admin-dashboard')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>''' + m.group(2).replace('<div class="flex gap-2">\n            </div>', '')
        new_content = re.sub(pattern, repl_admin, new_content)
        
        # Also handle the case where it was already missing the <div class="flex gap-2">
        # The above regex handles both if made properly. Let's make it simpler.

    # Fix view-employee
    pattern_emp = r'(<div id="view-employee" class="hidden">\s*<div class="px-4 mb-4 flex items-center gap-3">\s*)(<div class="flex items-center gap-3">)'
    def repl_emp(m):
        return m.group(1) + \
        '''<button onclick="showView('view-dashboard')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>\n            ''' + m.group(2)
    new_content = re.sub(pattern_emp, repl_emp, new_content)

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
fix_file('index.html')
fix_file('admin.html')
print("Done fixing headers")
