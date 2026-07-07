import sys

with open('new_google_apps_script.js', 'r') as f:
    content = f.read()

# Update handleUpdateEmployeeLog
target_1 = """    var timeIn = p.in ? targetDateStr + "T" + p.in + ":00" : "";
    var timeOut = p.out ? targetDateStr + "T" + p.out + ":00" : "";
    var recordType = p.type || "Work"; // Work, Leave_Paid, Leave_Unpaid
    
    if (foundIdx !== -1) {
      sheet.getRange(foundIdx + 1, 3).setValue(recordType);
      sheet.getRange(foundIdx + 1, 4).setValue(timeIn);
      sheet.getRange(foundIdx + 1, 5).setValue(timeOut);
      return {status: "success", message: "Updated log successfully"};
    } else {
      sheet.appendRow([
        targetDateStr,
        nickname,
        recordType,
        timeIn,
        timeOut
      ]);"""

replacement_1 = """    var timeIn = p.in ? targetDateStr + "T" + p.in + ":00" : "";
    var timeOut = p.out ? targetDateStr + "T" + p.out + ":00" : "";
    var actualIn = p.actualIn ? targetDateStr + "T" + p.actualIn + ":00" : "";
    var actualOut = p.actualOut ? targetDateStr + "T" + p.actualOut + ":00" : "";
    var recordType = p.type || "Work"; // Work, Leave_Paid, Leave_Unpaid
    
    if (foundIdx !== -1) {
      sheet.getRange(foundIdx + 1, 3).setValue(recordType);
      sheet.getRange(foundIdx + 1, 4).setValue(timeIn);
      sheet.getRange(foundIdx + 1, 5).setValue(timeOut);
      sheet.getRange(foundIdx + 1, 6).setValue(actualIn);
      sheet.getRange(foundIdx + 1, 7).setValue(actualOut);
      return {status: "success", message: "Updated log successfully"};
    } else {
      sheet.appendRow([
        targetDateStr,
        nickname,
        recordType,
        timeIn,
        timeOut,
        actualIn,
        actualOut
      ]);"""

# Update getAllLogsData
target_2 = """          in: row[3] ? Utilities.formatDate(new Date(row[3]), "Asia/Bangkok", "HH:mm") : "",
          out: row[4] ? Utilities.formatDate(new Date(row[4]), "Asia/Bangkok", "HH:mm") : ""
        });"""

replacement_2 = """          in: row[3] ? Utilities.formatDate(new Date(row[3]), "Asia/Bangkok", "HH:mm") : "",
          out: row[4] ? Utilities.formatDate(new Date(row[4]), "Asia/Bangkok", "HH:mm") : "",
          actualIn: row[5] ? Utilities.formatDate(new Date(row[5]), "Asia/Bangkok", "HH:mm") : "",
          actualOut: row[6] ? Utilities.formatDate(new Date(row[6]), "Asia/Bangkok", "HH:mm") : ""
        });"""

if target_1 in content:
    content = content.replace(target_1, replacement_1)
    print("Replaced target_1")
else:
    print("Could not find target_1")

if target_2 in content:
    content = content.replace(target_2, replacement_2)
    print("Replaced target_2")
else:
    print("Could not find target_2")

with open('new_google_apps_script.js', 'w') as f:
    f.write(content)
