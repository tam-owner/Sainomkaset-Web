import re

with open('admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

with open('index.html', 'r', encoding='utf-8') as f:
    index_content = f.read()

# Copy view-admin-dashboard from index.html to admin.html
dashboard_pattern = re.compile(r'<!-- VIEW: ADMIN DASHBOARD \(NEW\)           -->.*?(?=<!-- VIEW: ADMIN OVERVIEW                -->)', re.DOTALL)
dashboard_match = dashboard_pattern.search(index_content)
if dashboard_match:
    content = dashboard_pattern.sub(dashboard_match.group(0), content)

# Copy view-admin-employees from index.html to admin.html
emp_pattern = re.compile(r'<!-- VIEW: ADMIN EMPLOYEES SETUP           -->.*?(?=<!-- VIEW: ADMIN LEAVES                    -->)', re.DOTALL)
emp_match = emp_pattern.search(index_content)
if emp_match:
    content = emp_pattern.sub(emp_match.group(0), content)

# Copy view-admin-leaves and view-admin-time-edits
leaves_pattern = re.compile(r'<!-- VIEW: ADMIN LEAVES                    -->.*?(?=<script src="js/app.js)', re.DOTALL)
leaves_match = leaves_pattern.search(index_content)
if leaves_match:
    content = leaves_pattern.sub(leaves_match.group(0), content)

# Also fix the back buttons for other views in admin.html if needed
# view-admin-overview
overview_pattern = re.compile(r'<!-- VIEW: ADMIN OVERVIEW                -->.*?(?=<!-- VIEW: ADMIN EMPLOYEES SETUP           -->)', re.DOTALL)
overview_match = overview_pattern.search(index_content)
if overview_match:
    content = overview_pattern.sub(overview_match.group(0), content)

# view-stock
stock_pattern = re.compile(r'<!-- VIEW: STOCK                         -->.*?(?=<!-- VIEW: ADMIN DASHBOARD \(NEW\)           -->)', re.DOTALL)
stock_match = stock_pattern.search(index_content)
if stock_match:
    content = stock_pattern.sub(stock_match.group(0), content)


with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated admin.html with views from index.html")
