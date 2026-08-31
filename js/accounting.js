// js/accounting.js

document.addEventListener('DOMContentLoaded', () => {
    // Check if firebase is initialized
    if (!window.firebase || !firebase.database) {
        console.error("Firebase not initialized");
        return;
    }

    const db = firebase.database();
    const TRANSACTIONS_REF = 'accounting/transactions';
    const SETTINGS_REF = 'accounting/settings';

    // State
    let transactions = [];
    let targetCategories = [];
    let expenseCategories = [];
    let incomeCategories = [];
    
    let currentTab = 'dashboard';
    let chartInstance = null;

    // --- Default Seed Data ---
    const defaultTargetCats = [
        { id: 'tc_food', name: '1. Food cost ต้นทุนจริง', target: 47, order: 1 },
        { id: 'tc_labor', name: '2. ต้นทุนแรงงาน', target: 20, order: 2 },
        { id: 'tc_variable', name: '3. ค่าดำเนินการ (ค่าน้ำ/ไฟ/เน็ต/ขนส่ง/Ads)', target: 7, order: 3 },
        { id: 'tc_fixed', name: '4. ต้นทุนคงที่ (ค่าเช่า/ภาษีที่ดิน)', target: 7, order: 4 },
        { id: 'tc_marketing', name: '5. Loyalty+Marketing', target: 3, order: 5 }
    ];

    const defaultExpenseCats = [
        { id: 'ec_1', name: 'ค่าวัตถุดิบ', targetId: 'tc_food', order: 1 },
        { id: 'ec_2', name: 'ค่าแรง', targetId: 'tc_labor', order: 2 },
        { id: 'ec_3', name: 'ค่าน้ำ', targetId: 'tc_variable', order: 3 },
        { id: 'ec_4', name: 'ค่าไฟ', targetId: 'tc_variable', order: 4 },
        { id: 'ec_5', name: 'ค่า Loyalty', targetId: 'tc_marketing', order: 5 },
        { id: 'ec_6', name: 'ค่าเช่า', targetId: 'tc_fixed', order: 6 }
    ];

    const defaultIncomeCats = [
        { id: 'ic_1', name: 'ยอดขายหน้าร้าน', order: 1 }
    ];

    // --- UI Elements ---
    
    // Sidebar
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const pageTitleText = document.getElementById('page-title-text');

    // Modals
    const modalIncome = document.getElementById('modal-income');
    const modalExpense = document.getElementById('modal-expense');
    const btnAddIncome = document.getElementById('btn-add-income');
    const btnAddExpense = document.getElementById('btn-add-expense');
    const closeBtns = document.querySelectorAll('.close-modal, .close-modal-btn');

    // Forms
    const formIncome = document.getElementById('form-income');
    const formExpense = document.getElementById('form-expense');

    // Filters
    const timeframeSelect = document.getElementById('timeframe-select');
    const monthSelect = document.getElementById('month-select');
    const dateSelect = document.getElementById('date-select');

    // Defaults for dates
    const today = new Date();
    document.getElementById('inc-date').valueAsDate = today;
    document.getElementById('exp-date').valueAsDate = today;
    
    const currentMonth = today.toISOString().slice(0, 7);
    monthSelect.value = currentMonth;
    dateSelect.valueAsDate = today;

    // --- Sidebar & Tabs Logic ---
    openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            if(tabId) switchTab(tabId);
        });
    });

    function switchTab(tabId) {
        currentTab = tabId;
        
        navItems.forEach(n => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
        if(activeNav) activeNav.classList.add('active');
        
        tabPanes.forEach(p => p.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');

        if(tabId === 'dashboard') pageTitleText.textContent = 'Dashboard';
        if(tabId === 'transactions') pageTitleText.textContent = 'ประวัติรายการ (Transactions)';
        if(tabId === 'settings') pageTitleText.textContent = 'ตั้งค่า (Settings)';

        sidebar.classList.remove('open');
        updateUI();
    }

    // --- Modals Logic ---
    btnAddIncome.addEventListener('click', () => modalIncome.classList.remove('hidden'));
    btnAddExpense.addEventListener('click', () => modalExpense.classList.remove('hidden'));

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalIncome.classList.add('hidden');
            modalExpense.classList.add('hidden');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === modalIncome) modalIncome.classList.add('hidden');
        if (e.target === modalExpense) modalExpense.classList.add('hidden');
    });

    // --- Filters Logic ---
    timeframeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if(val === 'monthly') {
            monthSelect.classList.remove('hidden');
            dateSelect.classList.add('hidden');
        } else if (val === 'daily') {
            monthSelect.classList.add('hidden');
            dateSelect.classList.remove('hidden');
        } else {
            monthSelect.classList.add('hidden');
            dateSelect.classList.add('hidden');
        }
        updateUI();
    });

    monthSelect.addEventListener('change', updateUI);
    dateSelect.addEventListener('change', updateUI);

    // --- Firebase Logic ---

    // Load Settings
    db.ref(SETTINGS_REF).on('value', (snapshot) => {
        const data = snapshot.val() || {};
        // Convert obj/array to array
        targetCategories = Object.values(data.targetCategories || {}).sort((a, b) => a.order - b.order);
        expenseCategories = Object.values(data.expenseCategories || {}).sort((a, b) => a.order - b.order);
        incomeCategories = Object.values(data.incomeCategories || {}).sort((a, b) => a.order - b.order);

        // Force seed if empty
        if (targetCategories.length === 0 || expenseCategories.length === 0) {
            targetCategories = JSON.parse(JSON.stringify(defaultTargetCats));
            expenseCategories = JSON.parse(JSON.stringify(defaultExpenseCats));
            incomeCategories = JSON.parse(JSON.stringify(defaultIncomeCats));
            
            db.ref(SETTINGS_REF).set({
                targetCategories: targetCategories,
                expenseCategories: expenseCategories,
                incomeCategories: incomeCategories
            }).catch(error => {
                alert("Firebase Set Error: " + error.message);
            });
        }

        renderSettingsLists();
        populateModalDropdowns();
        updateUI();
    }, (error) => {
        alert("Firebase Read Error (Settings): " + error.message);
    });

    // Load Transactions
    db.ref(TRANSACTIONS_REF).on('value', (snapshot) => {
        transactions = [];
        snapshot.forEach(child => {
            transactions.push({ id: child.key, ...child.val() });
        });
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        updateUI();
    });

    // Add Income
    formIncome.addEventListener('submit', (e) => {
        e.preventDefault();
        const t = {
            type: 'income',
            amount: parseFloat(document.getElementById('inc-amount').value),
            categoryId: document.getElementById('inc-category').value,
            account: document.getElementById('inc-account').value,
            date: document.getElementById('inc-date').value,
            note: document.getElementById('inc-note').value,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        db.ref(TRANSACTIONS_REF).push(t).then(() => {
            formIncome.reset();
            document.getElementById('inc-date').valueAsDate = new Date();
            modalIncome.classList.add('hidden');
        });
    });

    // Add Expense
    formExpense.addEventListener('submit', (e) => {
        e.preventDefault();
        const t = {
            type: 'expense',
            amount: parseFloat(document.getElementById('exp-amount').value),
            categoryId: document.getElementById('exp-category').value,
            account: document.getElementById('exp-account').value,
            date: document.getElementById('exp-date').value,
            note: document.getElementById('exp-note').value,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        db.ref(TRANSACTIONS_REF).push(t).then(() => {
            formExpense.reset();
            document.getElementById('exp-date').valueAsDate = new Date();
            modalExpense.classList.add('hidden');
        });
    });

    // --- Setting Management Helpers ---
    function saveSettingList(listName, dataArray) {
        let obj = {};
        dataArray.forEach(item => { obj[item.id] = item; });
        db.ref(`${SETTINGS_REF}/${listName}`).set(obj);
    }

    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // --- Render Settings UI ---
    function renderSettingsLists() {
        // Target Categories
        const targetList = document.getElementById('target-cats-list');
        targetList.innerHTML = '';
        targetCategories.forEach(cat => {
            let li = document.createElement('li');
            li.className = 'settings-list-item';
            li.innerHTML = `
                <div class="item-info">
                    <input type="text" value="${cat.name}" style="flex:1;" class="target-name" data-id="${cat.id}">
                    <input type="number" value="${cat.target}" step="0.1" style="width: 80px;" class="target-val" data-id="${cat.id}">
                    <span class="text-muted">%</span>
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-move-up" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
                    <button class="btn-icon btn-move-down" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></button>
                    <button class="btn-icon danger btn-del-target" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            `;
            targetList.appendChild(li);
        });

        // Event listeners for changing target category inputs
        document.querySelectorAll('.target-name, .target-val').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const catIndex = targetCategories.findIndex(c => c.id === id);
                if (catIndex > -1) {
                    if (e.target.classList.contains('target-name')) {
                        targetCategories[catIndex].name = e.target.value;
                    } else {
                        targetCategories[catIndex].target = parseFloat(e.target.value) || 0;
                    }
                    saveSettingList('targetCategories', targetCategories);
                }
            });
        });

        document.querySelectorAll('.btn-del-target').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('คุณต้องการลบกลุ่มเป้าหมายนี้หรือไม่?')) {
                    targetCategories = targetCategories.filter(c => c.id !== id);
                    saveSettingList('targetCategories', targetCategories);
                }
            });
        });

        // Expense Categories
        const expList = document.getElementById('exp-cats-list');
        expList.innerHTML = '';
        expenseCategories.forEach(cat => {
            let li = document.createElement('li');
            li.className = 'settings-list-item';
            
            // Build target options
            let targetOpts = targetCategories.map(t => 
                `<option value="${t.id}" ${cat.targetId === t.id ? 'selected' : ''}>ผูกกับ: ${t.name}</option>`
            ).join('');

            li.innerHTML = `
                <div class="item-info">
                    <input type="text" value="${cat.name}" style="flex:1;" class="exp-name" data-id="${cat.id}">
                    <select class="exp-target" data-id="${cat.id}" style="flex:1;">
                        <option value="">-- ไม่ผูก --</option>
                        ${targetOpts}
                    </select>
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-move-up" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
                    <button class="btn-icon btn-move-down" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></button>
                    <button class="btn-icon danger btn-del-exp" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            `;
            expList.appendChild(li);
        });

        document.querySelectorAll('.exp-name, .exp-target').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const catIndex = expenseCategories.findIndex(c => c.id === id);
                if (catIndex > -1) {
                    if (e.target.classList.contains('exp-name')) {
                        expenseCategories[catIndex].name = e.target.value;
                    } else {
                        expenseCategories[catIndex].targetId = e.target.value;
                    }
                    saveSettingList('expenseCategories', expenseCategories);
                }
            });
        });

        document.querySelectorAll('.btn-del-exp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('คุณต้องการลบประเภทรายจ่ายนี้หรือไม่?')) {
                    expenseCategories = expenseCategories.filter(c => c.id !== id);
                    saveSettingList('expenseCategories', expenseCategories);
                }
            });
        });

        // Income Categories
        const incList = document.getElementById('inc-cats-list');
        incList.innerHTML = '';
        incomeCategories.forEach(cat => {
            let li = document.createElement('li');
            li.className = 'settings-list-item';
            li.innerHTML = `
                <div class="item-info">
                    <input type="text" value="${cat.name}" style="flex:1;" class="inc-name" data-id="${cat.id}">
                </div>
                <div class="item-actions">
                    <button class="btn-icon btn-move-up" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg></button>
                    <button class="btn-icon btn-move-down" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></button>
                    <button class="btn-icon danger btn-del-inc" data-id="${cat.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            `;
            incList.appendChild(li);
        });

        document.querySelectorAll('.inc-name').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const catIndex = incomeCategories.findIndex(c => c.id === id);
                if (catIndex > -1) {
                    incomeCategories[catIndex].name = e.target.value;
                    saveSettingList('incomeCategories', incomeCategories);
                }
            });
        });

        document.querySelectorAll('.btn-del-inc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('คุณต้องการลบประเภทรายรับนี้หรือไม่?')) {
                    incomeCategories = incomeCategories.filter(c => c.id !== id);
                    saveSettingList('incomeCategories', incomeCategories);
                }
            });
        });

        // Reordering logic
        document.querySelectorAll('.btn-move-up, .btn-move-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const isUp = e.currentTarget.classList.contains('btn-move-up');
                
                let arr, listName;
                if (id.startsWith('tc_')) { arr = targetCategories; listName = 'targetCategories'; }
                else if (id.startsWith('ec_')) { arr = expenseCategories; listName = 'expenseCategories'; }
                else { arr = incomeCategories; listName = 'incomeCategories'; }

                const idx = arr.findIndex(c => c.id === id);
                if (isUp && idx > 0) {
                    [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
                } else if (!isUp && idx < arr.length - 1) {
                    [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]];
                } else {
                    return; // No change
                }
                
                arr.forEach((item, i) => item.order = i + 1);
                saveSettingList(listName, arr);
            });
        });
    }

    // Settings Add Buttons
    document.getElementById('btn-add-target-cat').addEventListener('click', () => {
        targetCategories.push({ id: 'tc_' + generateId(), name: 'รายการใหม่', target: 0, order: targetCategories.length + 1 });
        saveSettingList('targetCategories', targetCategories);
    });

    document.getElementById('btn-add-exp-cat').addEventListener('click', () => {
        expenseCategories.push({ id: 'ec_' + generateId(), name: 'รายจ่ายใหม่', targetId: '', order: expenseCategories.length + 1 });
        saveSettingList('expenseCategories', expenseCategories);
    });

    document.getElementById('btn-add-inc-cat').addEventListener('click', () => {
        incomeCategories.push({ id: 'ic_' + generateId(), name: 'รายรับใหม่', order: incomeCategories.length + 1 });
        saveSettingList('incomeCategories', incomeCategories);
    });

    // Populate Modals
    function populateModalDropdowns() {
        const incSelect = document.getElementById('inc-category');
        incSelect.innerHTML = incomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        const expSelect = document.getElementById('exp-category');
        expSelect.innerHTML = expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    // --- Utilities ---
    function formatCurrency(num) {
        return '฿' + (num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getAccountName(key) {
        const map = { 'cash': 'เงินสด', 'bank1': 'Bank 1', 'bank2': 'Bank 2' };
        return map[key] || key;
    }

    function getExpCategoryName(id) {
        const cat = expenseCategories.find(c => c.id === id);
        return cat ? cat.name : 'ไม่ระบุ';
    }

    function getIncCategoryName(id) {
        const cat = incomeCategories.find(c => c.id === id);
        return cat ? cat.name : 'ไม่ระบุ';
    }

    // --- Edit Transaction Logic ---
    const modalEdit = document.getElementById('modal-edit-transaction');
    const formEdit = document.getElementById('form-edit-transaction');
    const editType = document.getElementById('edit-type');
    const editCategory = document.getElementById('edit-category');

    function populateEditCategoryDropdown(type) {
        editCategory.innerHTML = '';
        if (type === 'income') {
            editCategory.innerHTML = incomeCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        } else {
            editCategory.innerHTML = expenseCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    }

    editType.addEventListener('change', (e) => {
        populateEditCategoryDropdown(e.target.value);
    });

    window.openEditModal = function(t) {
        document.getElementById('edit-id').value = t.id;
        editType.value = t.type;
        populateEditCategoryDropdown(t.type);
        document.getElementById('edit-amount').value = t.amount;
        editCategory.value = t.categoryId;
        document.getElementById('edit-account').value = t.account;
        document.getElementById('edit-date').value = t.date;
        document.getElementById('edit-note').value = t.note || '';
        
        modalEdit.classList.remove('hidden');
    };

    formEdit.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const t = {
            type: editType.value,
            amount: parseFloat(document.getElementById('edit-amount').value),
            categoryId: editCategory.value,
            account: document.getElementById('edit-account').value,
            date: document.getElementById('edit-date').value,
            note: document.getElementById('edit-note').value
        };
        db.ref(TRANSACTIONS_REF).child(id).update(t).then(() => {
            modalEdit.classList.add('hidden');
        });
    });

    // Handle closing edit modal
    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modalIncome.classList.add('hidden');
            modalExpense.classList.add('hidden');
            if (modalEdit) modalEdit.classList.add('hidden');
        });
    });

    // --- Update UI ---
    function updateUI() {
        renderBalances();
        if (currentTab === 'dashboard') {
            renderDashboard();
        } else if (currentTab === 'transactions') {
            renderTransactionsList();
        }
    }

    function renderBalances() {
        let cash = 0, bank1 = 0, bank2 = 0;
        transactions.forEach(t => {
            let val = t.type === 'income' ? t.amount : -t.amount;
            if (t.account === 'cash') cash += val;
            if (t.account === 'bank1') bank1 += val;
            if (t.account === 'bank2') bank2 += val;
        });

        document.getElementById('bal-cash').textContent = formatCurrency(cash);
        document.getElementById('bal-bank1').textContent = formatCurrency(bank1);
        document.getElementById('bal-bank2').textContent = formatCurrency(bank2);
        document.getElementById('bal-total').textContent = formatCurrency(cash + bank1 + bank2);
    }

    function renderDashboard() {
        const timeframe = timeframeSelect.value;
        const monthVal = monthSelect.value; // YYYY-MM
        const dateVal = dateSelect.value; // YYYY-MM-DD
        
        let filtered = transactions.filter(t => {
            if (timeframe === 'monthly') {
                return t.date.startsWith(monthVal);
            } else if (timeframe === 'daily') {
                return t.date === dateVal;
            } else if (timeframe === 'weekly') {
                const refDate = new Date();
                const firstDay = new Date(refDate.setDate(refDate.getDate() - refDate.getDay()));
                const lastDay = new Date(firstDay);
                lastDay.setDate(lastDay.getDate() + 6);
                const tDate = new Date(t.date);
                return tDate >= firstDay && tDate <= lastDay;
            }
            return true;
        });

        let totalIncome = 0;
        let totalExpense = 0;
        
        // Sum expenses by TargetCategory Id
        let expByTargetGroup = {};
        targetCategories.forEach(tc => expByTargetGroup[tc.id] = 0);
        let unmappedExpense = 0;

        filtered.forEach(t => {
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else {
                totalExpense += t.amount;
                // Find which target category this expense maps to
                const ec = expenseCategories.find(c => c.id === t.categoryId);
                if (ec && ec.targetId && expByTargetGroup[ec.targetId] !== undefined) {
                    expByTargetGroup[ec.targetId] += t.amount;
                } else {
                    unmappedExpense += t.amount;
                }
            }
        });

        // Summary Stats
        document.getElementById('summary-income').textContent = formatCurrency(totalIncome);
        document.getElementById('summary-expense').textContent = formatCurrency(totalExpense);
        
        const profit = totalIncome - totalExpense;
        const profitEl = document.getElementById('summary-profit');
        profitEl.textContent = formatCurrency(profit);
        profitEl.className = 'value ' + (profit >= 0 ? 'text-success' : 'text-danger');

        // Break Even (Rough calculation based on current month fixed/labor costs if mapped correctly)
        // Since custom categories exist, we try to guess or just use total expenses / 30 for now.
        // Usually, Break Even needs specific tag. To simplify, we'll calculate Monthly Target Fixed + Labor.
        // We look for targets with 'fixed' or 'labor' in id.
        let monthlyFixedAndLaborCost = 0;
        const currentMonthData = transactions.filter(t => t.date.startsWith(monthSelect.value));
        currentMonthData.forEach(t => {
            if (t.type === 'expense') {
                const ec = expenseCategories.find(c => c.id === t.categoryId);
                if (ec && ec.targetId && (ec.targetId.includes('fixed') || ec.targetId.includes('labor'))) {
                    monthlyFixedAndLaborCost += t.amount;
                }
            }
        });
        document.getElementById('daily-break-even').textContent = formatCurrency(monthlyFixedAndLaborCost / 30);

        // Cost Structure Table
        const tbody = document.getElementById('cost-structure-body');
        tbody.innerHTML = '';
        
        let chartData = [];
        let chartLabels = [];

        targetCategories.forEach(tc => {
            let actAmt = expByTargetGroup[tc.id];
            let targetPct = tc.target || 0;
            let actPct = totalIncome > 0 ? (actAmt / totalIncome) * 100 : 0;
            
            // Calculate over/under
            let targetAmt = (targetPct / 100) * totalIncome;
            let diffAmt = actAmt - targetAmt;
            
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${tc.name}</td>
                <td class="text-right">${formatCurrency(actAmt)}</td>
                <td class="text-right">${actPct.toFixed(1)}%</td>
                <td class="text-right">${targetPct}%</td>
                <td class="text-right ${diffAmt > 0 ? 'text-danger' : 'text-success'}">${diffAmt > 0 ? '+' : ''}${formatCurrency(diffAmt)}</td>
            `;
            tbody.appendChild(tr);

            if (actAmt > 0) {
                chartData.push(actAmt);
                chartLabels.push(tc.name);
            }
        });

        if (unmappedExpense > 0) {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>อื่นๆ (ไม่ได้ผูกกลุ่ม)</td>
                <td class="text-right">${formatCurrency(unmappedExpense)}</td>
                <td class="text-right">-</td>
                <td class="text-right">-</td>
                <td class="text-right">-</td>
            `;
            tbody.appendChild(tr);
            chartData.push(unmappedExpense);
            chartLabels.push('อื่นๆ (Unmapped)');
        }

        if(profit > 0) {
            chartData.push(profit);
            chartLabels.push('กำไร (Profit)');
        }

        renderChart(chartLabels, chartData);
    }

    // Render Chart
    function renderChart(labels, data) {
        const ctx = document.getElementById('costChart');
        if(!ctx) return;
        
        if(chartInstance) {
            chartInstance.destroy();
        }

        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const textColor = isDarkMode ? '#F8FAFC' : '#0F172A';

        // Vibrant palette
        const palette = [
            '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', 
            '#14B8A6', '#F97316', '#6366F1', '#D946EF', '#10B981'
        ];
        
        // ensure profit is green if it's the last item
        let bgColors = data.map((_, i) => palette[i % palette.length]);
        if(labels[labels.length-1] === 'กำไร (Profit)') {
            bgColors[bgColors.length-1] = '#10B981'; // Green for profit
        }

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: textColor, font: { family: 'Prompt' } }
                    }
                }
            }
        });
    }

    // Render Transactions
    function renderTransactionsList() {
        const tbody = document.getElementById('transactions-body');
        tbody.innerHTML = '';
        
        if (transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">ไม่มีรายการ</td></tr>`;
            return;
        }

        transactions.forEach(t => {
            let tr = document.createElement('tr');
            let typeBadge = t.type === 'income' 
                ? '<span class="badge badge-good">รายรับ</span>'
                : '<span class="badge badge-bad">รายจ่าย</span>';
                
            let catName = t.type === 'income' ? getIncCategoryName(t.categoryId) : getExpCategoryName(t.categoryId);

            tr.innerHTML = `
                <td>${t.date}</td>
                <td>${typeBadge}</td>
                <td>${catName}</td>
                <td>${getAccountName(t.account)}</td>
                <td>${t.note || '-'}</td>
                <td class="text-right ${t.type === 'income' ? 'text-success' : 'text-danger'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </td>
                <td>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn-edit" data-id="${t.id}" style="color:var(--text-secondary); background:none; border:none; cursor:pointer;" title="แก้ไข">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-delete" data-id="${t.id}" style="color:var(--color-danger); background:none; border:none; cursor:pointer;" title="ลบ">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
                    db.ref(TRANSACTIONS_REF).child(id).remove();
                }
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const t = transactions.find(x => x.id === id);
                if (t) {
                    openEditModal(t);
                }
            });
        });
    }
});
