import glob
import re

for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    
    # Bump app.js
    c = re.sub(r'app\.js\?v=\d+_\d+', 'app.js?v=20260805_162', c)
    # Bump firebase-init.js
    c = re.sub(r'firebase-init\.js\?v=\d+_\d+', 'firebase-init.js?v=20260805_162', c)
    # Bump version display
    c = re.sub(r'v2\.2\.\d+ \(Firebase\)', 'v2.2.162 (Firebase)', c)
    # Bump APP_VERSION
    c = re.sub(r'APP_VERSION = "\d+_\d+"', 'APP_VERSION = "20260805_162"', c)
    
    with open(f, 'w') as file:
        file.write(c)

print("Bumped version to 162")
