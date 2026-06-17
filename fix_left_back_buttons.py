import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will find all view containers
    # A view container usually starts with <div id="view-..."
    # Then has a header div.
    
    # Let's just find the back buttons.
    # The back button looks like:
    # <button onclick="showView('view-dashboard')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">
    #     <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
    # </button>
    
    btn_pattern = re.compile(r'\s*<button onclick="showView\(\'(?:view-dashboard|view-admin-dashboard)\'\)" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 ml-1">\s*<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\s*</button>', re.DOTALL)
    
    # 1. Remove ALL back buttons from the file
    buttons_found = btn_pattern.findall(content)
    print(f"Found {len(buttons_found)} back buttons in {filepath}")
    
    content = btn_pattern.sub('', content)
    
    # 2. Now, insert the back button at the correct position.
    # We want it to be BEFORE the <h1> or in the employee view, before the <div class="flex items-center gap-3"> containing the avatar.
    # Actually, for most views, the header is:
    # <div class="mb-6 mt-2 flex items-center gap-3">
    #    <h1 class="...">...</h1>
    # We want it right after the header wrapper div.
    
    # Let's map view IDs to their target insertion point
    views = [
        'view-profile', 'view-leave', 'view-stock', 'view-checklist', 'view-qa', 
        'view-employee', 'view-admin-overview', 'view-admin-leaves'
    ]
    
    for view in views:
        # Find the view start
        idx = content.find(f'id="{view}"')
        if idx == -1:
            continue
            
        # Determine the target view for the back button
        target_view = 'view-admin-dashboard' if 'admin' in view else 'view-dashboard'
        
        btn_html = f'''\n            <button onclick="showView('{target_view}')" class="p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 active:scale-95 shrink-0 mr-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>'''
            
        # The header wrapper is usually the first div with flex inside the view
        # For view-profile:
        # <div class="mb-6 mt-2 flex items-center gap-3">
        #     <h1 class="text-xl font-black text-slate-800">ประวัติ & สลิป</h1>
        
        # Let's find the first <h1 or <div class="flex items-center gap-3"> (for view-employee) after the view starts.
        
        # Search for the header wrapper:
        header_match = re.search(r'<div class="[^"]*flex[^"]*items-center[^"]*">', content[idx:idx+300])
        if header_match:
            insert_pos = idx + header_match.end()
            content = content[:insert_pos] + btn_html + content[insert_pos:]
            print(f"Fixed {view}")
        else:
            # Maybe it's `flex justify-between items-center`
            header_match = re.search(r'<div class="[^"]*flex[^"]*justify-between[^"]*items-center[^"]*">', content[idx:idx+300])
            if header_match:
                insert_pos = idx + header_match.end()
                
                # Wait, if we just insert it there, we should also ensure the header wrapper has gap-3 and justify-start instead of justify-between?
                # Actually justify-between is fine if there are two groups (left and right).
                # The left group could be a new div wrapping the button and h1.
                # Let's just wrap the button and h1!
                
                # But it's easier to just use regex to replace the entire header block!
                print(f"Regex matching needed for {view}")

# Let's use a simpler approach. Just replace the entire header blocks manually or semi-manually since there are only 8 + 3 = 11 views.
