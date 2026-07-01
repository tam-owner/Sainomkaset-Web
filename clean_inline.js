    
        const APP_VERSION = "20260701_18";
        const currentVersion = localStorage.getItem('APP_VERSION');
        if (currentVersion !== APP_VERSION) {
            console.log("New version detected, clearing cache...");
            localStorage.setItem('APP_VERSION', APP_VERSION);
            
            async function clearAllAndReload() {
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for(let registration of registrations) {
                        await registration.unregister();
                    }
                }
                const names = await caches.keys();
                for (let name of names) {
                    await caches.delete(name);
                }
                if (window.location.href.indexOf('cleared=') === -1) {
                    let newUrl = window.location.href.split('?')[0] + '?cleared=' + Date.now();
                    window.location.replace(newUrl);
                }
            }
            clearAllAndReload();
        }

    
    
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('ServiceWorker registration successful');
          }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
          });
        });
      }
    
    
      function forceClearCache() {
          // Do not clear all localStorage so the user stays logged in
          sessionStorage.clear();
          if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                      registration.unregister();
                  }
              });
          }
          if (window.caches) {
              caches.keys().then(function(names) {
                  for (let name of names) caches.delete(name);
              });
          }
          // Change button text to indicate loading
          const btn = document.getElementById("btn-clear-cache");
          if(btn) btn.innerHTML = "กำลังรีเฟรช...";
          
          setTimeout(() => {
              var newUrl = window.location.href.split('?')[0] + '?cleared=' + Date.now();
              window.location.replace(newUrl);
          }, 1000);
      }
    
