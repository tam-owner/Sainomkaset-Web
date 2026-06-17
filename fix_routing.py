import re

with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'''    if \(\!isSilent\) \{\s*if \(isAdmin\) \{\s*showAdminDashboard\(\);\s*\} else if \(loggedInEmployee\) \{\s*const updatedEmp = employees\.find\(e => e\.name === loggedInEmployee\.name\);\s*if \(updatedEmp\) \{\s*loggedInEmployee = updatedEmp;\s*showEmployeeDashboard\(\);\s*\} else \{\s*logout\(\);\s*\}\s*\} else \{\s*overlay\.classList\.add\('hidden'\);\s*\}\s*\}''')

replacement = '''    if (!isSilent) {
        let hash = window.location.hash;
        if (hash) {
            hash = hash.substring(1); // remove #
        }
        
        if (isAdmin) {
            showAdminDashboard();
            if (hash && hash !== 'view-admin-dashboard' && document.getElementById(hash)) {
                if (hash === 'view-admin-employees') {
                    showAdminEmployees();
                } else {
                    showView(hash, false);
                }
            }
        } else if (loggedInEmployee) {
            const updatedEmp = employees.find(e => e.name === loggedInEmployee.name);
            if (updatedEmp) {
                loggedInEmployee = updatedEmp;
                showEmployeeDashboard();
                if (hash && hash !== 'view-dashboard' && document.getElementById(hash)) {
                    if (hash === 'view-profile') openProfile(false);
                    else if (hash === 'view-leave') openLeave(false);
                    else showView(hash, false);
                }
            } else {
                logout();
            }
        } else {
            overlay.classList.add('hidden');
            if (hash && document.getElementById(hash)) {
                showView(hash, false);
            }
        }
    }'''

new_content = pattern.sub(replacement, content)

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print("Replaced routing in app.js")
