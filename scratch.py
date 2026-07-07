import sys

def add_footer(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'id="app-version-display"' in content:
        return
        
    footer = """    <button id="btn-clear-cache" onclick="forceClearCache()" class="fixed bottom-2 left-2 z-[9999] bg-slate-200/50 hover:bg-slate-300 text-slate-500 text-[10px] font-bold py-1 px-2 rounded-md shadow-sm transition active:scale-95 flex items-center gap-1 backdrop-blur-sm">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        ล้างแคช
    </button>
    <div id="app-version-display" class="fixed bottom-2 right-2 text-[10px] text-slate-400 font-medium z-[9999] pointer-events-none opacity-50">
        v2.2.21 (Firebase)
    </div>
    <script>
      function forceClearCache() {
          if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) { registration.unregister(); }
              });
          }
          if (window.caches) {
              caches.keys().then(function(names) {
                  for (let name of names) caches.delete(name);
              });
          }
          const btn = document.getElementById("btn-clear-cache");
          if(btn) btn.innerHTML = "กำลังรีเฟรช...";
          setTimeout(() => {
              var newUrl = window.location.href.split('?')[0] + '?cleared=' + Date.now();
              window.location.replace(newUrl);
          }, 1000);
      }
    </script>
</body>"""

    content = content.replace("</body>", footer)
    with open(filepath, 'w') as f:
        f.write(content)

add_footer('admin.html')
add_footer('live.html')
print("Success adding footer to admin and live html")
