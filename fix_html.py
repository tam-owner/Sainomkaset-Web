import sys
with open('index.html', 'r') as f:
    c = f.read()

target = '<div id="view-login" class="hidden">'
replacement = '<div id="view-login">'
if target in c:
    c = c.replace(target, replacement)
    with open('index.html', 'w') as f:
        f.write(c)
    print("Fixed HTML")
else:
    print("Could not find target in HTML")
