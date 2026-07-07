import glob
import re

for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    
    # We want to remove the orphaned HTML between </div> of loading-overlay and <!-- ====
    
    target = """    </div>
            </div>
            <div class="w-16 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
        <!-- IN/OUT Skeleton -->
        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="h-[60px] bg-slate-200 rounded-xl animate-pulse"></div>
            <div class="h-[60px] bg-slate-200 rounded-xl animate-pulse"></div>
        </div>
        <!-- Grid Skeleton -->
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-white p-5 rounded-[24px] border border-slate-100 flex flex-col items-center gap-3 animate-pulse">
                <div class="w-12 h-12 rounded-full bg-slate-200"></div>
                <div class="w-20 h-3 bg-slate-200 rounded mt-1"></div>
            </div>
            <div class="bg-white p-5 rounded-[24px] border border-slate-100 flex flex-col items-center gap-3 animate-pulse">
                <div class="w-12 h-12 rounded-full bg-slate-200"></div>
                <div class="w-20 h-3 bg-slate-200 rounded mt-1"></div>
            </div>
            <div class="bg-white p-5 rounded-[24px] border border-slate-100 flex flex-col items-center gap-3 animate-pulse">
                <div class="w-12 h-12 rounded-full bg-slate-200"></div>
                <div class="w-20 h-3 bg-slate-200 rounded mt-1"></div>
            </div>
            <div class="bg-white p-5 rounded-[24px] border border-slate-100 flex flex-col items-center gap-3 animate-pulse">
                <div class="w-12 h-12 rounded-full bg-slate-200"></div>
                <div class="w-20 h-3 bg-slate-200 rounded mt-1"></div>
            </div>
        </div>
    </div>"""

    replacement = "    </div>"
    
    if target in c:
        c = c.replace(target, replacement)
        with open(f, 'w') as file:
            file.write(c)
        print(f"Fixed {f}")
