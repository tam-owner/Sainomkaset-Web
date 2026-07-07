import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target = """                if (rec.scheduledIn && rec.scheduledIn !== '-') {
                    let sch = rec.scheduledIn.split(':');
                    let act = [rec.inTime.getHours(), rec.inTime.getMinutes()];
                    if (sch.length > 1) {"""

replacement = """                if (rec.scheduledIn && rec.scheduledIn !== '-') {
                    let sch = rec.scheduledIn.split(':');
                    let act = null;
                    if (rec.manualIn) {
                        let parts = rec.manualIn.split(':');
                        if (parts.length > 1) {
                            act = [parseInt(parts[0], 10), parseInt(parts[1], 10)];
                        }
                    } else if (rec.inTime) {
                        act = [rec.inTime.getHours(), rec.inTime.getMinutes()];
                    }
                    if (sch.length > 1 && act) {"""

if target in content:
    content = content.replace(target, replacement)
    with open('js/app.js', 'w') as f:
        f.write(content)
    print("Fixed lateness logic")
else:
    print("Could not find target")
