import glob
for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    c = c.replace('app.js?v=20260703_18', 'app.js?v=20260703_19')
    c = c.replace('v2.2.30 (Firebase)', 'v2.2.31 (Firebase)')
    with open(f, 'w') as file:
        file.write(c)
