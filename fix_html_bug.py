import re

for filename in ['index.html', 'admin.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the broken view-admin-leaves block:
    # </div>
    # </div>
    # <main class="px-4">
    pattern = re.compile(r'<h1 class="text-xl font-black text-slate-800">อนุมัติลางาน</h1>\s*</div>\s*</div>\s*<main class="px-4">')
    
    # Replace with:
    # <h1 class="text-xl font-black text-slate-800">อนุมัติลางาน</h1>
    # </div>
    # <main class="px-4">
    replacement = r'<h1 class="text-xl font-black text-slate-800">อนุมัติลางาน</h1>\n        </div>\n        <main class="px-4">'
    
    content = pattern.sub(replacement, content)
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed {filename}")

