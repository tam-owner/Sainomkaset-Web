import glob
for f in glob.glob('*.html'):
    with open(f, 'r') as file:
        c = file.read()
    c = c.replace('app.js?v=20260703_06', 'app.js?v=20260703_07')
    c = c.replace('v2.2.18 (Firebase)', 'v2.2.19 (Firebase)')
    with open(f, 'w') as file:
        file.write(c)
