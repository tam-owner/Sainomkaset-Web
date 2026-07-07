import sys
with open('new_google_apps_script.js', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "function getAllLogsData" in line:
        start = max(0, i - 2)
        end = min(len(lines), i + 25)
        print("".join(lines[start:end]))
        break
