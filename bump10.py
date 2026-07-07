import glob
for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    c = c.replace('app.js?v=20260703_15', 'app.js?v=20260703_16')
    c = c.replace('v2.2.27 (Firebase)', 'v2.2.28 (Firebase)')
    with open(f, 'w') as file:
        file.write(c)
