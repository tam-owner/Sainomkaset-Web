import re

html = open('live.html').read()
view_emp_start = html.find('id="view-dashboard"')
html = html[view_emp_start:]
depth = 1
pos = html.find('>') + 1

while depth > 0 and pos < len(html):
    open_idx = html.find('<div', pos)
    close_idx = html.find('</div', pos)
    if open_idx == -1 and close_idx == -1:
        break
    if open_idx != -1 and (close_idx == -1 or open_idx < close_idx):
        depth += 1
        pos = html.find('>', open_idx) + 1
    else:
        depth -= 1
        pos = html.find('>', close_idx) + 1

print(f"view-dashboard ends at offset: {pos}")
orig_html = open('live.html').read()
real_pos = view_emp_start + pos
line_num = orig_html[:real_pos].count('\n') + 1
print(f"Line number: {line_num}")
