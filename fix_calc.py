import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target = """        Object.values(dayObj).forEach(rec => {
            if ((rec.inTime && rec.outTime) || (rec.manualIn && rec.manualOut) || (rec.inTime && rec.manualOut) || (rec.manualIn && rec.outTime)) {"""

replacement = """        Object.values(dayObj).forEach(rec => {
            let effInTime = rec.actualIn ? (new Date(`2000-01-01T${rec.actualIn}:00`)) : rec.inTime;
            let effOutTime = rec.actualOut ? (new Date(`2000-01-01T${rec.actualOut}:00`)) : rec.outTime;
            if ((effInTime && effOutTime) || (rec.manualIn && rec.manualOut) || (effInTime && rec.manualOut) || (rec.manualIn && effOutTime)) {"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced target 1")
else:
    print("Could not find target 1")

target_2 = """                let calcInStr = (rec.manualIn) ? rec.manualIn : ((rec.scheduledIn && rec.scheduledIn !== '-') ? rec.scheduledIn : (rec.inTime ? `${String(rec.inTime.getHours()).padStart(2, '0')}:${String(rec.inTime.getMinutes()).padStart(2, '0')}` : null));
                let calcOutStr = (rec.manualOut) ? rec.manualOut : ((rec.scheduledOut && rec.scheduledOut !== '-') ? rec.scheduledOut : (rec.outTime ? `${String(rec.outTime.getHours()).padStart(2, '0')}:${String(rec.outTime.getMinutes()).padStart(2, '0')}` : null));"""

replacement_2 = """                let calcInStr = (rec.manualIn) ? rec.manualIn : ((rec.scheduledIn && rec.scheduledIn !== '-') ? rec.scheduledIn : (effInTime ? `${String(effInTime.getHours()).padStart(2, '0')}:${String(effInTime.getMinutes()).padStart(2, '0')}` : null));
                let calcOutStr = (rec.manualOut) ? rec.manualOut : ((rec.scheduledOut && rec.scheduledOut !== '-') ? rec.scheduledOut : (effOutTime ? `${String(effOutTime.getHours()).padStart(2, '0')}:${String(effOutTime.getMinutes()).padStart(2, '0')}` : null));"""

if target_2 in content:
    content = content.replace(target_2, replacement_2)
    print("Replaced target 2")
else:
    print("Could not find target 2")

target_3 = """                if (rec.scheduledIn && rec.scheduledIn !== '-') {
                    let sch = rec.scheduledIn.split(':');
                    let act = null;
                    if (rec.manualIn) {
                        let parts = rec.manualIn.split(':');
                        if (parts.length > 1) {
                            act = [parseInt(parts[0], 10), parseInt(parts[1], 10)];
                        }
                    } else if (rec.inTime) {
                        act = [rec.inTime.getHours(), rec.inTime.getMinutes()];
                    }"""

replacement_3 = """                if (rec.scheduledIn && rec.scheduledIn !== '-') {
                    let sch = rec.scheduledIn.split(':');
                    let act = null;
                    if (rec.actualIn) {
                        let parts = rec.actualIn.split(':');
                        if (parts.length > 1) {
                            act = [parseInt(parts[0], 10), parseInt(parts[1], 10)];
                        }
                    } else if (effInTime) {
                        act = [effInTime.getHours(), effInTime.getMinutes()];
                    }"""

if target_3 in content:
    content = content.replace(target_3, replacement_3)
    print("Replaced target 3")
else:
    print("Could not find target 3")

with open('js/app.js', 'w') as f:
    f.write(content)
