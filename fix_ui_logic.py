import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target = """        let effectiveIn = row.manualIn || row.inTime;
        let effectiveOut = row.manualOut || row.outTime;
        const isPartialScan = (effectiveIn && !effectiveOut) || (!effectiveIn && effectiveOut);"""

replacement = """        let effectiveIn = row.actualIn || row.inTime;
        let effectiveOut = row.actualOut || row.outTime;
        const isPartialScan = (effectiveIn && !effectiveOut) || (!effectiveIn && effectiveOut);"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced target 1")
else:
    print("Could not find target 1")

target_2 = """        let inStr = formatTime(row.inTime);
        if (inStr === '-') inStr = '';
        let outStr = formatTime(row.outTime);
        if (outStr === '-') outStr = '';
        
        let schedInStr = row.scheduledIn && row.scheduledIn !== '-' ? row.scheduledIn : '';
        let schedOutStr = row.scheduledOut && row.scheduledOut !== '-' ? row.scheduledOut : '';
        
        if (row.manualIn) schedInStr = row.manualIn;
        if (row.manualOut) schedOutStr = row.manualOut;
        
        let inDisplay = row.manualIn ? '-' : inStr;
        let outDisplay = row.manualOut ? '-' : outStr;"""

replacement_2 = """        let inStr = formatTime(row.inTime);
        if (inStr === '-') inStr = '';
        let outStr = formatTime(row.outTime);
        if (outStr === '-') outStr = '';
        
        let schedInStr = row.scheduledIn && row.scheduledIn !== '-' ? row.scheduledIn : '';
        let schedOutStr = row.scheduledOut && row.scheduledOut !== '-' ? row.scheduledOut : '';
        
        if (row.manualIn) schedInStr = row.manualIn;
        if (row.manualOut) schedOutStr = row.manualOut;
        
        let inDisplay = row.actualIn ? row.actualIn : (inStr || '-');
        let outDisplay = row.actualOut ? row.actualOut : (outStr || '-');"""

if target_2 in content:
    content = content.replace(target_2, replacement_2)
    print("Replaced target 2")
else:
    print("Could not find target 2")

with open('js/app.js', 'w') as f:
    f.write(content)
