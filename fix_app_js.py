import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target = """            if (log.in) {
                rec.manualIn = log.in;
            }
            if (log.out) {
                rec.manualOut = log.out;
            }"""

replacement = """            if (log.in) {
                rec.manualIn = log.in;
            }
            if (log.out) {
                rec.manualOut = log.out;
            }
            if (log.actualIn) {
                rec.actualIn = log.actualIn;
            }
            if (log.actualOut) {
                rec.actualOut = log.actualOut;
            }"""

if target in content:
    content = content.replace(target, replacement)
    with open('js/app.js', 'w') as f:
        f.write(content)
    print("Replaced manualLogs parsing")
else:
    print("Could not find manualLogs parsing target")
