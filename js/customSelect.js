// Add Custom Select UI Logic
function initCustomSelect(select) {
    if (select.dataset.customized === "true") {
        renderCustomSelectOptions(select);
        return;
    }

    select.style.display = 'none';
    select.dataset.customized = "true";

    const wrapper = document.createElement('div');
    wrapper.className = "relative custom-select-wrapper w-full";
    if (select.id === 'login-name') {
        wrapper.classList.remove('w-full');
        wrapper.classList.add('group');
    }

    const display = document.createElement('div');
    display.className = select.className + " cursor-pointer flex items-center justify-between";
    if (select.id === 'login-name') {
        display.classList.remove('modern-select');
    }
    
    const displaySpan = document.createElement('span');
    displaySpan.className = "truncate pointer-events-none";
    
    const chevron = document.createElement('div');
    chevron.className = "pointer-events-none transition-transform duration-200 shrink-0 ml-2";
    chevron.innerHTML = '<svg class="w-4 h-4 text-slate-400 group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
    
    display.appendChild(displaySpan);
    display.appendChild(chevron);
    
    const menu = document.createElement('div');
    menu.className = "custom-select-menu absolute top-[calc(100%+4px)] left-0 w-full bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden z-[100] max-h-[55vh] overflow-y-auto transform origin-top transition-all scale-95 opacity-0 hidden";
    
    const listContainer = document.createElement('div');
    listContainer.className = "py-1 flex flex-col";
    menu.appendChild(listContainer);
    
    wrapper.appendChild(display);
    wrapper.appendChild(menu);
    
    select.parentNode.insertBefore(wrapper, select.nextSibling);

    wrapper.dataset.selectId = select.id;

    display.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !menu.classList.contains('hidden');
        
        document.querySelectorAll('.custom-select-menu').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('scale-100', 'opacity-100');
            m.previousElementSibling.querySelector('.transition-transform').classList.remove('rotate-180');
        });

        if (!isOpen) {
            menu.classList.remove('hidden');
            setTimeout(() => {
                menu.classList.add('scale-100', 'opacity-100');
                menu.classList.remove('scale-95', 'opacity-0');
            }, 10);
            chevron.classList.add('rotate-180');
        }
    });

    renderCustomSelectOptions(select);
}

function renderCustomSelectOptions(select) {
    const wrapper = select.nextElementSibling;
    if (!wrapper || !wrapper.classList.contains('custom-select-wrapper')) return;
    
    const displaySpan = wrapper.querySelector('span.truncate');
    const menu = wrapper.querySelector('.custom-select-menu');
    const listContainer = menu.querySelector('div');
    const chevron = wrapper.querySelector('.transition-transform');
    
    listContainer.innerHTML = '';
    
    Array.from(select.options).forEach(opt => {
        const item = document.createElement('div');
        
        if (opt.disabled) {
            item.className = "px-4 py-2.5 text-slate-400 text-[13px] font-bold bg-slate-50 border-b border-slate-100/50";
            item.innerHTML = `<span class="opacity-80">${opt.text}</span>`;
            listContainer.appendChild(item);
            return;
        }

        item.className = "px-4 py-3 cursor-pointer hover:bg-blue-50/80 active:bg-blue-100 transition-all flex items-center text-sm";
        
        if (select.id === 'login-name' && opt.value && opt.value !== 'ADMIN') {
            const emp = employees.find(e => e.name === opt.value);
            if (emp && emp.fullName) {
                const firstName = emp.fullName.trim().split(/\s+/)[0];
                item.innerHTML = `<span class="font-bold text-slate-700">${opt.text}</span> <span class="text-[12px] text-slate-400 font-medium ml-2 truncate">${firstName}</span>`;
            } else {
                item.innerHTML = `<span class="font-bold text-slate-700">${opt.text}</span>`;
            }
        } else if (opt.value === "ADMIN") {
            item.innerHTML = `<span class="font-bold text-indigo-600">${opt.text}</span>`;
        } else {
            item.innerHTML = `<span class="text-slate-700 font-medium">${opt.text}</span>`;
        }
        
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            
            item.classList.add('bg-blue-100');
            
            setTimeout(() => {
                select.value = opt.value;
                select.dispatchEvent(new Event('change'));
                
                displaySpan.innerText = opt.text;
                
                menu.classList.add('scale-95', 'opacity-0');
                menu.classList.remove('scale-100', 'opacity-100');
                
                setTimeout(() => {
                    menu.classList.add('hidden');
                    item.classList.remove('bg-blue-100');
                }, 200);
                
                chevron.classList.remove('rotate-180');
            }, 120);
        });
        
        listContainer.appendChild(item);
    });

    if (select.selectedIndex >= 0) {
        displaySpan.innerText = select.options[select.selectedIndex].text;
    } else {
        displaySpan.innerText = select.options[0] ? select.options[0].text : '';
    }
}

document.addEventListener('click', (e) => {
    document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
        if (!wrapper.contains(e.target)) {
            const menu = wrapper.querySelector('.custom-select-menu');
            const chevron = wrapper.querySelector('.transition-transform');
            if (menu && !menu.classList.contains('hidden')) {
                menu.classList.add('scale-95', 'opacity-0');
                menu.classList.remove('scale-100', 'opacity-100');
                setTimeout(() => menu.classList.add('hidden'), 200);
                chevron.classList.remove('rotate-180');
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all DOM elements are parsed
    setTimeout(() => {
        document.querySelectorAll('select').forEach(sel => {
            if (typeof initCustomSelect === 'function') {
                initCustomSelect(sel);
            }
        });
    }, 50);
});
