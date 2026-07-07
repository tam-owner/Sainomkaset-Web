import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target_2 = """        if (row.manualIn) schedInStr = row.manualIn;
        if (row.manualOut) schedOutStr = row.manualOut;
        
        let inDisplay = inStr || '-';
        let outDisplay = outStr || '-';
        
        const onclickStr = isAdmin
            ? `onclick="openEditLogModal('${row.date}', '${schedInStr}', '${schedOutStr}', '${row.type || 'Work'}')"`"""

replacement_2 = """        if (row.manualIn) schedInStr = row.manualIn;
        if (row.manualOut) schedOutStr = row.manualOut;
        
        let inDisplay = row.actualIn ? row.actualIn : (inStr || '-');
        let outDisplay = row.actualOut ? row.actualOut : (outStr || '-');
        
        const actualInStr = row.actualIn || '';
        const actualOutStr = row.actualOut || '';
        
        const onclickStr = isAdmin
            ? `onclick="openEditLogModal('${row.date}', '${schedInStr}', '${schedOutStr}', '${row.type || 'Work'}', '${actualInStr}', '${actualOutStr}')"`"""

if target_2 in content:
    content = content.replace(target_2, replacement_2)
    print("Replaced target 2")
else:
    print("Could not find target 2")

with open('js/app.js', 'w') as f:
    f.write(content)
