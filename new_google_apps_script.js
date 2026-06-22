var OLD_SHEET_ID = "1rS2XH04BgcY_bRRHIFiyb4M1utvDnNsfzsSd11dUbbk";
var LINE_CHANNEL_ACCESS_TOKEN = "yZtar1FpkznBAe/GebyzlNZMgSfsrVGhF4LHstpdlp2z+GSn8MN7fYbpN1LAZCyKky+GNtqUBJy53VyZP2v5M7bq9Uxt3vFjRQQPcoh+r+ZxXNleJUaG5rNa/8eMeI9JqnFTmngMN9C8R5x80ez3RwdB04t89/1O/w1cDnyilFU=";
var LINE_ADMIN_USER_ID = "U3eae4dc25388348a9b7f4e44120fa23d";

function doGet(e) {
  var action = e.parameter.action;
  
  if (action == "getAttendance") return createJsonResponse({status: "success", data: getMergedAttendanceData()});
  if (action == "getEmployees") return createJsonResponse({status: "success", data: getEmployeesData()});
  if (action == "getDeductions") return createJsonResponse({status: "success", data: getDeductionsData()});
  if (action == "getLeaves") return createJsonResponse({status: "success", data: getLeavesData()});
  if (action == "getInitPayrollData") return createJsonResponse(handleGetInitPayrollData());
  
  if (action == "testLine") {
    sendLineNotify("🔥 ทดสอบการเชื่อมต่อ LINE จาก Google Apps Script สำเร็จ!");
    return HtmlService.createHtmlOutput('<h1 style="color:green; font-family:sans-serif; text-align:center; margin-top:50px;">✅ ส่งข้อความทดสอบเข้า LINE เรียบร้อยแล้ว!<br>กรุณาเช็คในแอป LINE ของคุณครับ</h1>');
  }
  
  return HtmlService.createHtmlOutput('API is running (v2 with Merged Sheets).');
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    var action = p.action;

    if (action === "clockin" || action === "clockout") {
      p.actualTime = p.shift;
      return createJsonResponse(handleProcessData(p));
    }
    if (action === "saveEmployee") return createJsonResponse(handleSaveEmployee(p));
    if (action === "deleteEmployee") return createJsonResponse(handleDeleteEmployee(p.oldNickname, p.oldFullName));
    if (action === "saveDeduction") return createJsonResponse(handleSaveDeduction(p.deduction));
    if (action === "deleteDeduction") return createJsonResponse(handleDeleteDeduction(p.id));
    if (action === "getEmployeeLogs") return createJsonResponse(handleGetEmployeeLogs(p.nickname, p.month, p.year));
    if (action === "updateEmployeeLog") return createJsonResponse(handleUpdateEmployeeLog(p));
    if (action == "requestLeave") return createJsonResponse(handleRequestLeave(p.leave));
    if (action == "updateLeaveStatus") return createJsonResponse(handleUpdateLeaveStatus(p.id, p.status));
    
    // From new attendance system
    if (action == "processData") return createJsonResponse(handleProcessData(p.payload));
    if (action == "getInitPayrollData") return createJsonResponse(handleGetInitPayrollData());
    if (action == "requestTimeEdit") return createJsonResponse(handleRequestTimeEdit(p.timeEditRequest));
    if (action == "updateEditRequestStatus") return createJsonResponse(handleUpdateEditRequestStatus(p.id, p.status));
    if (action == "saveSetting") return createJsonResponse(handleSaveSetting(p.key, p.value));
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

function sendLineNotify(message) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_ADMIN_USER_ID) return;
  try {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN 
      },
      payload: JSON.stringify({
        "to": LINE_ADMIN_USER_ID,
        "messages": [{
          "type": "text",
          "text": message
        }]
      })
    });
  } catch (err) {
    Logger.log("LINE Error: " + err);
  }
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
      sheet.appendRow(["ชื่อเล่น", "ชื่อจริง-นามสกุล", "PIN", "เรตรายวัน", "เรตรายชม.", "เรต OT", "ประเภทการหักเงิน", "เลขบัญชีธนาคาร", "ประเภทพนักงาน", "รูปภาพ", "วันที่เริ่มงาน", "สถานะ", "เงินเดือน", "เงินล่วงหน้า"]);
    } else if (name === "Deductions") {
      sheet.appendRow(["ID", "Period", "Name", "Amount", "Reason", "Timestamp", "Type"]);
    } else if (name === "Leaves") {
      sheet.appendRow(["ID", "Name", "StartDate", "EndDate", "LeaveType", "Reason", "Status", "Timestamp"]);
    } else if (name === "TimeEditRequests") {
      sheet.appendRow(["ID", "Timestamp", "Name", "Date", "OriginalIn", "OriginalOut", "NewIn", "NewOut", "Reason", "Status"]);
    } else if (name === "Settings") {
      sheet.appendRow(["Key", "Value"]);
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
        photo: String(row[9] || "").trim(),
        startDate: String(row[10] || "").trim(),
        status: String(row[11] || "Active").trim(),
        monthlyRate: Number(row[12]) || 0,
        advancePayment: Number(row[13]) || 0
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

function getTimeEditRequestsData() {
  try {
    var sheet = getSheetByNameOrCreateNew("TimeEditRequests");
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || row[0] == "") continue;
      result.push({
        id: String(row[0]), timestamp: String(row[1]), name: String(row[2]), date: String(row[3]),
        originalIn: String(row[4] || ""), originalOut: String(row[5] || ""), newIn: String(row[6] || ""),
        newOut: String(row[7] || ""), reason: String(row[8] || ""), status: String(row[9] || "Pending")
      });
    }
    return result;
  } catch (e) { return []; }
}

function handleSaveEmployee(p) {
  var sheet = getSheetByNameOrCreateNew("Employees");
  var data = sheet.getDataRange().getValues();
  
  var foundIdx = -1;
  if (p.oldNickname) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === p.oldNickname && String(data[i][1] || "").trim() === p.oldFullName) {
        foundIdx = i;
        break;
      }
    }
  }

  var rowData = [
    p.nickname,
    p.fullName,
    p.pin,
    p.dailyRate,
    p.hourlyRate,
    p.otRate,
    p.deductionType,
    p.bankAccount,
    p.employeeType,
    p.photo || "",
    p.startDate || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd"),
    p.status || "Active",
    p.monthlyRate || 0,
    p.advancePayment || 0
  ];

  if (foundIdx !== -1) {
    sheet.getRange(foundIdx + 1, 1, 1, rowData.length).setValues([rowData]);
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
// Time Logs API
// ----------------------------------------------------
function handleGetEmployeeLogs(nickname, monthStr, yearStr) {
  try {
    var sheet = getSheetByNameOrCreateNew("Logs");
    var data = sheet.getDataRange().getValues();
    var results = [];
    var month = parseInt(monthStr, 10);
    var year = parseInt(yearStr, 10);
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[1]).trim() === nickname) {
        var dateObj = new Date(row[0]);
        if (dateObj.getMonth() + 1 === month && dateObj.getFullYear() === year) {
          results.push({
            date: Utilities.formatDate(dateObj, "Asia/Bangkok", "yyyy-MM-dd"),
            in: row[3] ? Utilities.formatDate(new Date(row[3]), "Asia/Bangkok", "HH:mm") : "",
            out: row[4] ? Utilities.formatDate(new Date(row[4]), "Asia/Bangkok", "HH:mm") : "",
            type: String(row[2] || "").trim()
          });
        }
      }
    }
    
    // Sort by date
    results.sort(function(a, b) {
      return new Date(a.date) - new Date(b.date);
    });
    
    return {status: "success", logs: results};
  } catch(e) {
    return {status: "error", message: e.toString()};
  }
}

function handleUpdateEmployeeLog(p) {
  try {
    var sheet = getSheetByNameOrCreateNew("Logs");
    var data = sheet.getDataRange().getValues();
    var nickname = p.nickname;
    var targetDateStr = p.date; // yyyy-MM-dd
    
    var foundIdx = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === nickname) {
        var dStr = Utilities.formatDate(new Date(data[i][0]), "Asia/Bangkok", "yyyy-MM-dd");
        if (dStr === targetDateStr) {
          foundIdx = i;
          break;
        }
      }
    }
    
    if (p.actionType === "delete") {
      if (foundIdx !== -1) {
        sheet.deleteRow(foundIdx + 1);
        return {status: "success", message: "Deleted log successfully"};
      }
      return {status: "error", message: "Log not found for deletion"};
    }
    
    var timeIn = p.in ? targetDateStr + "T" + p.in + ":00" : "";
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
      ]);
      return {status: "success", message: "Added log successfully"};
    }
  } catch(e) {
    return {status: "error", message: e.toString()};
  }
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
      leaves: getLeavesData(),
      timeEditRequests: getTimeEditRequestsData(),
      settings: getSettingsData()
    }
  };
}

function getSettingsData() {
  try {
    var sheet = getSheetByNameOrCreateNew("Settings");
    var data = sheet.getDataRange().getValues();
    var result = {};
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) result[String(data[i][0])] = String(data[i][1]);
    }
    return result;
  } catch (e) { return {}; }
}

function handleSaveSetting(key, value) {
  var sheet = getSheetByNameOrCreateNew("Settings");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return {status: "success"};
    }
  }
  sheet.appendRow([key, value]);
  return {status: "success"};
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
  sheet.appendRow([newId, leave.name, leave.startDate, leave.endDate, leave.leaveType, leave.reason, "Pending", timestamp]);
  
  var msg = "\n📌 มีคำขอลางานใหม่\nพนักงาน: " + leave.name + "\nประเภท: " + leave.leaveType + "\nวันที่: " + leave.startDate + " ถึง " + leave.endDate + "\nเหตุผล: " + leave.reason;
  sendLineNotify(msg);
  
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

function handleRequestTimeEdit(req) {
  var sheet = getSheetByNameOrCreateNew("TimeEditRequests");
  var newId = Utilities.getUuid();
  var timestamp = new Date().toISOString();
  sheet.appendRow([newId, timestamp, req.name, req.date, req.originalIn, req.originalOut, req.newIn, req.newOut, req.reason, "Pending"]);
  
  var msg = "\n⏳ มีคำขอแก้ไขเวลาเข้าออกงาน\nพนักงาน: " + req.name + "\nวันที่: " + req.date + "\nเดิม: " + req.originalIn + " - " + req.originalOut + "\nใหม่: " + req.newIn + " - " + req.newOut + "\nเหตุผล: " + req.reason;
  sendLineNotify(msg);
  
  return {status: "success", message: "Requested successfully", id: newId};
}

function handleUpdateEditRequestStatus(id, newStatus) {
  var sheet = getSheetByNameOrCreateNew("TimeEditRequests");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 10).setValue(newStatus);
      
      // If approved, update the actual log
      if (newStatus === "Approved") {
        var req = {
          nickname: String(data[i][2]),
          date: String(data[i][3]),
          in: String(data[i][6]),
          out: String(data[i][7]),
          type: "Work",
          actionType: "update"
        };
        handleUpdateEmployeeLog(req);
      }
      
      return {status: "success"};
    }
  }
  return {status: "error", message: "Not found"};
}
