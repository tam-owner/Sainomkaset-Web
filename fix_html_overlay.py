import glob
import re

new_overlay = """    <div id="loading-overlay" class="fixed inset-0 bg-slate-900/60 z-[9999] flex flex-col items-center justify-center transition-all duration-300 opacity-0 pointer-events-none backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-6 flex flex-col items-center shadow-xl">
            <svg class="animate-spin h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p id="loading-text" class="text-slate-800 font-bold text-lg">กำลังโหลดข้อมูล...</p>
        </div>
    </div>"""

pattern = re.compile(r'<div id="loading-overlay".*?</div>\s*</div>|<div id="loading-overlay".*?</p>\s*</div>', re.DOTALL)

for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        content = file.read()
    
    content = pattern.sub(new_overlay, content)
    
    with open(f, 'w') as file:
        file.write(content)

print("Fixed HTML overlays")
