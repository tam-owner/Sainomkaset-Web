import glob
for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    c = c.replace('app.js?v=20260703_08', 'app.js?v=20260703_09')
    c = c.replace('v2.2.20 (Firebase)', 'v2.2.21 (Firebase)')
    with open(f, 'w') as file:
        file.write(c)
