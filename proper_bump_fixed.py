import glob
import re

for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    
    # Bump app.js
    c = re.sub(r'app\.js\?v=[\w]+', 'app.js?v=20260829_002', c)
    # Bump firebase-init.js
    c = re.sub(r'firebase-init\.js\?v=[\w]+', 'firebase-init.js?v=20260829_002', c)
    
    with open(f, 'w') as file:
        file.write(c)

print("Bumped version to 165")
