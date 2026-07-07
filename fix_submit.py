import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target = """window.submitEditLogModal = function() {
    const data = {
        date: document.getElementById('swal-log-date').value,
        type: document.getElementById('swal-log-type').value,
        in: document.getElementById('swal-log-in').value,
        out: document.getElementById('swal-log-out').value
    };"""

replacement = """window.submitEditLogModal = function() {
    const data = {
        date: document.getElementById('swal-log-date').value,
        type: document.getElementById('swal-log-type').value,
        in: document.getElementById('swal-log-in').value,
        out: document.getElementById('swal-log-out').value,
        actualIn: document.getElementById('swal-actual-in') ? document.getElementById('swal-actual-in').value : '',
        actualOut: document.getElementById('swal-actual-out') ? document.getElementById('swal-actual-out').value : ''
    };"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced target 1")
else:
    print("Could not find target 1")

target_2 = """                action: "updateEmployeeLog",
                nickname: currentLogsEmp.name,
                date: data.date,
                type: data.type,
                in: data.in,
                out: data.out,
                actionType: actionType"""

replacement_2 = """                action: "updateEmployeeLog",
                nickname: currentLogsEmp.name,
                date: data.date,
                type: data.type,
                in: data.in,
                out: data.out,
                actualIn: data.actualIn,
                actualOut: data.actualOut,
                actionType: actionType"""

if target_2 in content:
    content = content.replace(target_2, replacement_2)
    print("Replaced target 2")
else:
    print("Could not find target 2")

with open('js/app.js', 'w') as f:
    f.write(content)
