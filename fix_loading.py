import sys
with open('js/app.js', 'r') as f:
    content = f.read()

import re

# Match patterns like:
# const overlay = document.getElementById('loading-overlay');
# document.getElementById('loading-text').innerText = "กำลังบันทึก...";
# overlay.classList.remove('hidden');
#
# Replace with:
# showLoading("กำลังบันทึก...");

pattern_show = re.compile(
    r"const overlay = document.getElementById\('loading-overlay'\);\s*document.getElementById\('loading-text'\)\.innerText = \"(.*?)\";\s*overlay.classList.remove\('hidden'\);"
)
content = pattern_show.sub(r'showLoading("\1");', content)

# Also there might be cases where they do:
# overlay.classList.add('hidden');
# Replace with:
# hideLoading();

pattern_hide = re.compile(r"overlay.classList.add\('hidden'\);")
content = pattern_hide.sub(r'hideLoading();', content)

with open('js/app.js', 'w') as f:
    f.write(content)

print("Fixed loading overlays")
