import glob
import re

url = 'https://script.google.com/macros/s/AKfycbwQGRzyn8iQEwotk_6gCSueeEiYNe91-QM4lqBfgZfVcm-Xehi9741Tfl-nehgd9nA/exec'

for f in ['js/app.js', 'js/firebase-init.js']:
    with open(f, 'r') as file:
        c = file.read()
    
    # Replace the old URL
    c = re.sub(r'https://script\.google\.com/macros/s/[A-Za-z0-9_-]+/exec', url, c)
    
    with open(f, 'w') as file:
        file.write(c)

print("Updated URL")
