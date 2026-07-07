import glob
for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    c = c.replace('app.js?v=20260703_11', 'app.js?v=20260703_12')
    c = c.replace('v2.2.23 (Firebase)', 'v2.2.24 (Firebase)')
    with open(f, 'w') as file:
        file.write(c)
