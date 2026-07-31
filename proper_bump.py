import glob
import re

for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    
    # Bump app.js
    c = re.sub(r'app\.js\?v=\d+_\d+', 'app.js?v=20260801_124', c)
    # Bump firebase-init.js
    c = re.sub(r'firebase-init\.js\?v=\d+_\d+', 'firebase-init.js?v=20260801_124', c)
    # Bump version display
    c = re.sub(r'v2\.2\.\d+ \(Firebase\)', 'v2.2.124 (Firebase)', c)
    
    with open(f, 'w') as file:
        file.write(c)

print("Bumped version to 124")
