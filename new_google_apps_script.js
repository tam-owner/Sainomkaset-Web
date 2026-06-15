var OLD_SHEET_ID = "1rS2XH04BgcY_bRRHIFiyb4M1utvDnNsfzsSd11dUbbk";

function doGet(e) {
  var action = e.parameter.action;
  
  if (action == "getAttendance") return createJsonResponse({status: "success", data: getMergedAttendanceData()});
  if (action == "getEmployees") return createJsonResponse({status: "success", data: getEmployeesData()});
  if (action == "getDeductions") return createJsonResponse({status: "success", data: getDeductionsData()});
  if (action == "getLeaves") return createJsonResponse({status: "success", data: getLeavesData()});
  if (action == "getInitPayrollData") return createJsonResponse(handleGetInitPayrollData());
  
  return HtmlService.createHtmlOutput('API is running (v2 with Merged Sheets).');
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;

    // From old payroll admin
    if (action == "updatePin") return createJsonResponse(handleUpdatePin(postData.name, postData.oldPin, postData.newPin));
    if (action == "saveDeduction") return createJsonResponse(handleSaveDeduction(postData.deduction));
    if (action == "deleteDeduction") return createJsonResponse(handleDeleteDeduction(postData.id));
    if (action == "autoRegister") return createJsonResponse(handleAutoRegister(postData.names));
    
    // Leaves
    if (action == "requestLeave") return createJsonResponse(handleRequestLeave(postData.leave));
    if (action == "updateLeaveStatus") return createJsonResponse(handleUpdateLeaveStatus(postData.id, postData.status));
    
    // From new attendance system
    if (action == "processData") return createJsonResponse(handleProcessData(postData.payload));
    if (action == "getInitPayrollData") return createJsonResponse(handleGetInitPayrollData());
    
    // From employee management
    if (action == "saveEmployee") return createJsonResponse(handleSaveEmployee(postData.oldNickname, postData.oldFullName, postData.employee));
    if (action == "deleteEmployee") return createJsonResponse(handleDeleteEmployee(postData.nickname, postData.fullName));

    return createJsonResponse({status: "error", message: "Unknown action"});
  } catch (error) {
    return createJsonResponse({status: "error", message: error.toString()});
  }
}

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getOldSpreadsheet() {
  return SpreadsheetApp.openById(OLD_SHEET_ID);
}

function getNewSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetByNameOrCreateOld(name) {
  var ss = getOldSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "Employees") sheet.appendRow(["Name", "PIN", "NormalRate", "OTRate", "DeductionType"]);
    else if (name === "Deductions") sheet.appendRow(["ID", "Period", "Name", "Amount", "Reason", "Timestamp", "Type"]);
    else if (name === "Leaves") sheet.appendRow(["ID", "Name", "StartDate", "EndDate", "LeaveType", "Reason", "Status", "Timestamp"]);
  }
  return sheet;
}

function getSheetByNameOrCreateNew(name) {
  var ss = getNewSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "Attendance") {
      sheet.appendRow(["Timestamp", "Name", "Type", "ScheduledTime", "Note"]);
    } else if (name === "Employees") {
      sheet.appendRow(["ชื่อเล่น", "ชื่อจริง-นามสกุล", "PIN", "เรตรายวัน", "เรตรายชม.", "เรต OT", "ประเภทการหักเงิน", "เลขบัญชีธนาคาร", "ประเภทพนักงาน"]);
    } else if (name === "Deductions") {
      sheet.appendRow(["ID", "Period", "Name", "Amount", "Reason", "Timestamp", "Type"]);
    } else if (name === "Leaves") {
      sheet.appendRow(["ID", "Name", "StartDate", "EndDate", "LeaveType", "Reason", "Status", "Timestamp"]);
    }
  }
  return sheet;
}

// ----------------------------------------------------
// Core Data Logic
// ----------------------------------------------------
function getMergedAttendanceData() {
  var result = [];

  // 1. Read Old Sheet
  try {
    var ssOld = getOldSpreadsheet();
    var sheetOld = null;
    var targetGid = 1244384131;
    var sheets = ssOld.getSheets();
    for (var j = 0; j < sheets.length; j++) {
      if (sheets[j].getSheetId() == targetGid) {
        sheetOld = sheets[j];
        break;
      }
    }
    if (!sheetOld) sheetOld = ssOld.getSheetByName("Form_Responses");

    if (sheetOld) {
      var dataOld = sheetOld.getDataRange().getDisplayValues();
      for (var i = 1; i < dataOld.length; i++) {
        var row = dataOld[i];
        if (!row[0] || row[0] == "") continue;
        result.push({
          timestamp: row[0],
          name: String(row[1]).trim(),
          type: String(row[2]).trim(), 
          scheduledTime: String(row[3]).trim(), 
          note: String(row[4] || "").trim()
        });
      }
    }
  } catch (e) {}

  // 2. Read New Sheet
  try {
    var sheetNew = getSheetByNameOrCreateNew("Attendance");
    var dataNew = sheetNew.getDataRange().getDisplayValues();
    for (var j = 1; j < dataNew.length; j++) {
      var row = dataNew[j];
      if (!row[0] || row[0] == "") continue;
      result.push({
        timestamp: row[0],
        name: String(row[1]).trim(),
        type: String(row[2]).trim(), 
        scheduledTime: String(row[3]).trim(), 
        note: String(row[4] || "").trim()
      });
    }
  } catch (e) {}

  return result;
}

function getEmployeesData() {
  try {
    var sheet = getSheetByNameOrCreateNew("Employees");
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || row[0] == "") continue;
      result.push({
        name: String(row[0]).trim(),
        fullName: String(row[1] || "").trim(),
        pin: String(row[2] || "").trim(),
        dailyRate: Number(row[3]) || 0,
        normalRate: Number(row[4]) || 0,
        otRate: Number(row[5]) || 0,
        deductionType: String(row[6] || "3%").trim(),
        bankAccount: String(row[7] || "").trim(),
        employeeType: String(row[8] || "").trim(),
        photo: String(row[9] || "").trim()
      });
    }
    return result;
  } catch (e) { return []; }
}

function getDeductionsData() {
  try {
    var sheet = getSheetByNameOrCreateNew("Deductions");
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || row[0] == "") continue;
      result.push({
        id: String(row[0]), period: String(row[1]), name: String(row[2]),
        amount: Number(row[3]) || 0, reason: String(row[4] || ""), timestamp: row[5],
        type: String(row[6] || "Deduction") // "Deduction" or "Bonus"
      });
    }
    return result;
  } catch (e) { return []; }
}

function getLeavesData() {
  try {
    var sheet = getSheetByNameOrCreateNew("Leaves");
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || row[0] == "") continue;
      result.push({
        id: String(row[0]), name: String(row[1]), startDate: String(row[2]),
        endDate: String(row[3]), leaveType: String(row[4]), reason: String(row[5] || ""),
        status: String(row[6]), timestamp: row[7]
      });
    }
    return result;
  } catch (e) { return []; }
}

// ----------------------------------------------------
// Post Data Logic
// ----------------------------------------------------
function handleProcessData(payload) {
  var sheet = getSheetByNameOrCreateNew("Attendance");
  
  var ts = payload.fullDateTime; 
  if (ts) {
    ts = ts.replace(" | ", " ");
  } else {
    var now = new Date();
    ts = now.toLocaleString('en-GB'); 
  }

  var type = payload.mode === 'in' ? 'เข้า' : 'ออก';
  var sched = payload.actualTime || '-';
  var note = payload.remark || '-';

  sheet.appendRow([ts, payload.name, type, sched, note]);

  return { status: "success", message: "Recorded to new sheet successfully." };
}

function handleGetInitPayrollData() {
  var emps = getEmployeesData().map(function(e) {
    return { name: e.name, status: 'active' };
  });

  var history = [];
  var allAtt = getMergedAttendanceData();
  allAtt.reverse();
  var limit = Math.min(allAtt.length, 50);
  for (var i = 0; i < limit; i++) {
    var r = allAtt[i];
    history.push({
      name: r.name,
      mode: r.type === 'เข้า' ? 'in' : 'out',
      actualTime: r.scheduledTime,
      fullDateTime: r.timestamp,
      remark: r.note
    });
  }

  return {
    status: "success",
    data: { history: history, master: emps }
  };
}

function handleUpdatePin(name, oldPin, newPin) {
  var sheet = getSheetByNameOrCreateNew("Employees");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === name) {
      if (String(data[i][2] || "").trim() === oldPin) {
        sheet.getRange(i + 1, 3).setValue(newPin);
        return {status: "success", message: "PIN updated successfully"};
      } else return {status: "error", message: "รหัสผ่านเดิมไม่ถูกต้อง"};
    }
  }
  return {status: "error", message: "ไม่พบชื่อพนักงาน"};
}

function handleSaveDeduction(deduction) {
  var sheet = getSheetByNameOrCreateNew("Deductions");
  var timestamp = new Date().toISOString();
  if (deduction.id) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === deduction.id) {
        sheet.getRange(i + 1, 2).setValue(deduction.period);
        sheet.getRange(i + 1, 3).setValue(deduction.name);
        sheet.getRange(i + 1, 4).setValue(deduction.amount);
        sheet.getRange(i + 1, 5).setValue(deduction.reason);
        sheet.getRange(i + 1, 6).setValue(timestamp);
        sheet.getRange(i + 1, 7).setValue(deduction.type || "Deduction");
        return {status: "success", message: "Updated successfully", id: deduction.id};
      }
    }
    return {status: "error", message: "Not found"};
  } else {
    var newId = Utilities.getUuid();
    sheet.appendRow([newId, deduction.period, deduction.name, deduction.amount, deduction.reason, timestamp, deduction.type || "Deduction"]);
    return {status: "success", message: "Added successfully", id: newId};
  }
}

function handleDeleteDeduction(id) {
  var sheet = getSheetByNameOrCreateNew("Deductions");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.deleteRow(i + 1);
      return {status: "success"};
    }
  }
  return {status: "error"};
}

function handleRequestLeave(leave) {
  var sheet = getSheetByNameOrCreateNew("Leaves");
  var newId = Utilities.getUuid();
  var timestamp = new Date().toISOString();
  // ["ID", "Name", "StartDate", "EndDate", "LeaveType", "Reason", "Status", "Timestamp"]
  sheet.appendRow([newId, leave.name, leave.startDate, leave.endDate, leave.leaveType, leave.reason, "Pending", timestamp]);
  return {status: "success", message: "Requested successfully", id: newId};
}

function handleUpdateLeaveStatus(id, newStatus) {
  var sheet = getSheetByNameOrCreateNew("Leaves");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 7).setValue(newStatus);
      return {status: "success"};
    }
  }
  return {status: "error", message: "Not found"};
}

function handleAutoRegister(names) {
  var sheet = getSheetByNameOrCreateNew("Employees");
  var existingData = sheet.getDataRange().getValues();
  var existingNames = {};
  for (var i = 1; i < existingData.length; i++) {
    existingNames[String(existingData[i][0]).trim()] = true;
  }
  var addedCount = 0;
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (!existingNames[name] && name.trim() !== "") {
      // ["ชื่อเล่น", "ชื่อจริง-นามสกุล", "PIN", "เรตรายวัน", "เรตรายชม.", "เรต OT", "ประเภทการหักเงิน", "เลขบัญชีธนาคาร", "ประเภทพนักงาน"]
      sheet.appendRow([name, "", "1234", 0, 46.88, 8.79, "3%", "", ""]);
      existingNames[name] = true;
      addedCount++;
    }
  }
  return {status: "success", added: addedCount};
}

function handleSaveEmployee(oldNickname, oldFullName, emp) {
  var sheet = getSheetByNameOrCreateNew("Employees");
  var data = sheet.getDataRange().getValues();
  
  var foundIdx = -1;
  if (oldNickname) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === oldNickname && String(data[i][1] || "").trim() === oldFullName) {
        foundIdx = i;
        break;
      }
    }
  }

  var rowData = [
    emp.nickname,
    emp.fullName,
    emp.pin,
    emp.dailyRate,
    emp.hourlyRate,
    emp.otRate,
    emp.deductionType,
    emp.bankAccount,
    emp.employeeType,
    emp.photo || ""
  ];

  if (foundIdx !== -1) {
    sheet.getRange(foundIdx + 1, 1, 1, 10).setValues([rowData]);
    return {status: "success", message: "Updated successfully"};
  } else {
    sheet.appendRow(rowData);
    return {status: "success", message: "Added successfully"};
  }
}

function handleDeleteEmployee(nickname, fullName) {
  var sheet = getSheetByNameOrCreateNew("Employees");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === nickname && String(data[i][1] || "").trim() === fullName) {
      sheet.deleteRow(i + 1);
      return {status: "success", message: "Deleted successfully"};
    }
  }
  return {status: "error", message: "Not found"};
}

// ----------------------------------------------------
// Form Integration Logic
// ----------------------------------------------------
function setupEmployeeFormTrigger() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onEmployeeFormSubmit") {
      return "Trigger already exists";
    }
  }
  
  ScriptApp.newTrigger("onEmployeeFormSubmit")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  return "Trigger created successfully";
}

function onEmployeeFormSubmit(e) {
  if (!e || !e.range) return;
  
  var sheet = e.range.getSheet();
  // Check headers to identify if this is an employee registration form
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var isEmployeeForm = false;
  var nicknameIdx = -1, firstNameIdx = -1, lastNameIdx = -1, pinIdx = -1, bankNameIdx = -1, bankIdx = -1, typeIdx = -1;
  
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase();
    if (h.indexOf("ชื่อเล่น") > -1) { isEmployeeForm = true; nicknameIdx = i; }
    else if (h.indexOf("ชื่อจริง") > -1) firstNameIdx = i;
    else if (h.indexOf("นามสกุล") > -1) lastNameIdx = i;
    else if (h.indexOf("pin") > -1 || h.indexOf("รหัส 4 หลัก") > -1 || h.indexOf("ตั้งรหัส") > -1) pinIdx = i;
    else if (h.indexOf("ชื่อธนาคาร") > -1) bankNameIdx = i;
    else if (h.indexOf("เลขบัญชี") > -1) bankIdx = i;
    else if (h.indexOf("ประเภท") > -1) typeIdx = i;
  }
  
  if (isEmployeeForm) {
    var nickname = nicknameIdx > -1 ? String(e.values[nicknameIdx]).trim() : "";
    var firstName = firstNameIdx > -1 ? String(e.values[firstNameIdx]).trim() : "";
    var lastName = lastNameIdx > -1 ? String(e.values[lastNameIdx]).trim() : "";
    var fullName = (firstName + " " + lastName).trim();
    
    var pin = pinIdx > -1 ? String(e.values[pinIdx]).trim() : "1234";
    
    var bankName = bankNameIdx > -1 ? String(e.values[bankNameIdx]).trim() : "";
    var bankAcc = bankIdx > -1 ? String(e.values[bankIdx]).trim() : "";
    var bankFull = bankName ? (bankName + " " + bankAcc).trim() : bankAcc;
    
    var empType = typeIdx > -1 ? String(e.values[typeIdx]).trim() : "Part Time";
    
    if (nickname) {
      var empSheet = getSheetByNameOrCreateNew("Employees");
      var existingData = empSheet.getDataRange().getValues();
      var exists = false;
      for(var j=1; j<existingData.length; j++) {
        if(String(existingData[j][0]).trim() === nickname) {
          exists = true; // Prevent duplicate registration
          break;
        }
      }
      
      if(!exists) {
        // ["ชื่อเล่น", "ชื่อจริง-นามสกุล", "PIN", "เรตรายวัน", "เรตรายชม.", "เรต OT", "ประเภทการหักเงิน", "เลขบัญชีธนาคาร", "ประเภทพนักงาน"]
        empSheet.appendRow([nickname, fullName, pin, 0, 0, 0, "3%", bankFull, empType]);
      }
    }
  }
}

function handleGetInitPayrollData() {
  return {
    status: "success",
    data: {
      attendance: getMergedAttendanceData(),
      employees: getEmployeesData(),
      deductions: getDeductionsData(),
      leaves: getLeavesData()
    }
  };
}
