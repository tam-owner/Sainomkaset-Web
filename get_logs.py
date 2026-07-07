import sys
with open('new_google_apps_script.js', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "function getLogsData" in line or "function handleUpdateEmployeeLog" in line:
        start = max(0, i - 2)
        end = min(len(lines), i + 40)
        print("".join(lines[start:end]))
        print("--------------------")

