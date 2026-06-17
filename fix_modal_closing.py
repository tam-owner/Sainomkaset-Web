import re

for filename in ['index.html', 'admin.html']:
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find where <!-- Admin Time Logs Modal --> is and make sure it has </div></div> before it.
    
    # Let's check if </div></div> is missing
    pattern = re.compile(r'(\s*)<!-- Admin Time Logs Modal -->')
    
    # We will just replace it with \n        </div>\n    </div>\n\n    <!-- Admin Time Logs Modal -->
    # BUT we need to make sure we don't double add it if it's already there!
    
    # Check if the 100 chars before <!-- Admin Time Logs Modal --> contain </div></div>
    match = pattern.search(content)
    if match:
        before_text = content[match.start()-30:match.start()]
        if '</div>' not in before_text:
            new_text = r'\n        </div>\n    </div>\n\n    <!-- Admin Time Logs Modal -->'
            content = content[:match.start()] + new_text + content[match.end(1) + len('<!-- Admin Time Logs Modal -->'):]
            
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Fixed missing closing divs in {filename}")
        else:
            print(f"{filename} already has closing divs")

