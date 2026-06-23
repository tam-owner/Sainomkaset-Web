var OLD_SHEET_ID = "1rS2XH04BgcY_bRRHIFiyb4M1utvDnNsfzsSd11dUbbk";
var LINE_CHANNEL_ACCESS_TOKEN = "NyKxRhVKq1RjT2NQ7ZiG1JYtmoX7q5H+IkkHJNZb4Gfm5LrZA1A1oIKF2CS/+pf6dohA3OjCqwRjdmC80BZjJ7uvFWbWou43NknbBVauzU1VPR+7AxfZmpmCRkcIUSC29OCSsYQfSJ7/98Mq0pN7nQdB04t89/1O/w1cDnyilFU=";
var LINE_ADMIN_USER_ID = "U207c7336fdbe39c28cb725f298f4d212";

function doGet(e) {
  var action = e.parameter.action;
  
  if (action == "getAttendance") return createJsonResponse({status: "success", data: getMergedAttendanceData()});
  if (action == "getEmployees") return createJsonResponse({status: "success", data: getEmployeesData()});
  if (action == "getDeductions") return createJsonResponse({status: "success", data: getDeductionsData()});
  if (action == "getLeaves") return createJsonResponse({status: "success", data: getLeavesData()});
  if (action == "getInitPayrollData") return createJsonResponse(handleGetInitPayrollData());
  
  if (action == "testLine") {
    var errMessage = sendLineNotify("🔥 ทดสอบการเชื่อมต่อ LINE จาก Google Apps Script สำเร็จ!");
    if (errMessage) {
      return HtmlService.createHtmlOutput('<h1 style="color:red; font-family:sans-serif; text-align:center; margin-top:50px;">❌ Error: ' + errMessage + '</h1>');
    }
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
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_ADMIN_USER_ID) return "Token is missing";
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
    return null; // Success
  } catch (err) {
    Logger.log("LINE Error: " + err);
    return err.toString();
  }
}

function sendLineFlexMessage(messages) {
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_ADMIN_USER_ID) return "Token is missing";
  try {
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": "Bearer " + LINE_CHANNEL_ACCESS_TOKEN 
      },
      payload: JSON.stringify({
        "to": LINE_ADMIN_USER_ID,
        "messages": messages
      })
    });
    return null; // Success
  } catch (err) {
    Logger.log("LINE Error: " + err);
    return err.toString();
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
function isDateValid(dateStr) {
  if (!dateStr) return false;
  var str = String(dateStr).trim();
  var d = new Date(str);
  var dtMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dtMatch) {
    var p1 = parseInt(dtMatch[1], 10);
    var p2 = parseInt(dtMatch[2], 10);
    var p3 = parseInt(dtMatch[3], 10);
    if (p3 > 1000) { 
      if (p1 > 31) { d = new Date(p1, p2 - 1, p3); } 
      else { d = new Date(p3, p2 - 1, p1); }
    }
  }
  if (isNaN(d.getTime())) return true; // Let it pass if unparseable
  var cutoff = new Date(2026, 5, 1); // June 1, 2026
  return d >= cutoff;
}

function getMergedAttendanceData() {
  var result = [];

  // 1. Read Old Sheet
  try {
    var ssOld = getOldSpreadsheet();
    var sheetOld = null;
    var targetGid = 1244384131;
    var sheets = ssOld.getSheets();
    for (var j = 0; j < sheets.length; j++) {
      var name = sheets[j].getName();
      if (sheets[j].getSheetId() == targetGid || name === "Form_Responses" || name.indexOf("การตอบกลับ") > -1) {
        sheetOld = sheets[j];
        break;
      }
    }
    if (!sheetOld && sheets.length > 0) sheetOld = sheets[0];

    if (sheetOld) {
      var dataOld = sheetOld.getDataRange().getDisplayValues();
      for (var i = 1; i < dataOld.length; i++) {
        var row = dataOld[i];
        if (!row[0] || row[0] == "") continue;
        if (!isDateValid(row[0])) continue;
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



  return result;
}

function syncAttendanceToNewSheet() {
  try {
    var attendance = getMergedAttendanceData();
    var sheetNew = getSheetByNameOrCreateNew("Attendance");
    
    // Clear existing data
    sheetNew.clearContents();
    
    // Write headers
    var headers = ["ประทับเวลา", "ชื่อ-สกุล", "ประเภท", "เวลาเข้างานตามตาราง", "หมายเหตุ"];
    
    if (attendance.length === 0) {
      sheetNew.getRange(1, 1, 1, headers.length).setValues([headers]);
      return;
    }
    
    // Parse date for sorting
    function parseDate(str) {
      var d = new Date(str);
      var m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (m) {
        var p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10), p3 = parseInt(m[3], 10);
        if (p3 > 1000) d = (p1 > 31) ? new Date(p1, p2 - 1, p3) : new Date(p3, p2 - 1, p1);
      }
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    
    // Sort descending (latest first)
    attendance.sort(function(a, b) {
      return parseDate(b.timestamp) - parseDate(a.timestamp);
    });
    
    var rows = [headers];
    for (var i = 0; i < attendance.length; i++) {
      var r = attendance[i];
      rows.push([r.timestamp, r.name, r.type, r.scheduledTime, r.note]);
    }
    
    sheetNew.getRange(1, 1, rows.length, headers.length).setValues(rows);
  } catch (e) {
    // Silently fail if there's an issue writing to the sheet
  }
}


function autoDeactivateAndSortEmployees() {
  try {
    var empSheet = getSheetByNameOrCreateNew("Employees");
    var empData = empSheet.getDataRange().getValues();
    if (empData.length <= 1) return; 
    
    var attendance = getMergedAttendanceData();
    var lastAttMap = {};
    for (var i = 0; i < attendance.length; i++) {
      var name = attendance[i].name;
      var dStr = attendance[i].timestamp;
      var dtMatch = String(dStr).match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      var d = new Date(dStr);
      if (dtMatch) {
        var p1 = parseInt(dtMatch[1], 10);
        var p2 = parseInt(dtMatch[2], 10);
        var p3 = parseInt(dtMatch[3], 10);
        if (p3 > 1000) { 
          if (p1 > 31) d = new Date(p1, p2 - 1, p3);
          else d = new Date(p3, p2 - 1, p1);
        }
      }
      if (!isNaN(d.getTime())) {
        if (!lastAttMap[name] || d > lastAttMap[name]) {
          lastAttMap[name] = d;
        }
      }
    }
    
    var now = new Date();
    var oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    var rows = [];
    var headers = empData[0];
    var changed = false;
    
    for (var i = 1; i < empData.length; i++) {
      var row = empData[i];
      if (!row[0] || String(row[0]).trim() === "") continue;
      
      var empName = String(row[0]).trim();
      var originalStatus = String(row[12] || "Active").trim();
      var currentStatus = originalStatus;
      
      if (currentStatus !== "Inactive") {
        var lastAtt = lastAttMap[empName];
        if (lastAtt && lastAtt < oneMonthAgo) {
          currentStatus = "Inactive";
          row[12] = "Inactive";
          changed = true;
        } else if (!lastAtt) {
          var startDStr = String(row[8]).trim();
          var startD = startDStr ? new Date(startDStr) : null;
          if (startD && !isNaN(startD.getTime())) {
             if (startD < oneMonthAgo) {
                currentStatus = "Inactive";
                row[12] = "Inactive";
                changed = true;
             }
          } else {
             currentStatus = "Inactive";
             row[12] = "Inactive";
             changed = true;
          }
        }
      }
      rows.push(row);
    }
    
    function getSortRank(r) {
      var st = String(r[12] || "Active").trim();
      if (st === "Inactive") return 999;
      var t = String(r[7] || "").trim().toLowerCase();
      if (t === "active") return 1;
      if (t === "full time") return 2;
      if (t === "full time ประกันสังคม") return 3;
      if (t === "full time ภาษี") return 4;
      if (t === "part time ประกันสังคม") return 5;
      if (t === "part time ภาษี") return 6;
      return 7;
    }
    
    var originalOrder = rows.map(function(r) { return r[0]; }).join(",");
    rows.sort(function(a, b) {
      var rankDiff = getSortRank(a) - getSortRank(b);
      if (rankDiff !== 0) return rankDiff;
      
      var dedA = String(a[6] || "").trim();
      var dedB = String(b[6] || "").trim();
      if (dedA !== dedB) {
        if (dedA === "5%") return -1;
        if (dedB === "5%") return 1;
        return dedB.localeCompare(dedA);
      }
      
      // If same type and deduction, sort by dailyRate (row[3]) or monthlyRate (row[2]) descending
      var rateA = Math.max(Number(a[3]) || 0, Number(a[2]) || 0);
      var rateB = Math.max(Number(b[3]) || 0, Number(b[2]) || 0);
      return rateB - rateA;
    });
    var newOrder = rows.map(function(r) { return r[0]; }).join(",");
    
    if (originalOrder !== newOrder) {
      changed = true;
    }
    
    if (changed) {
      empSheet.getRange(2, 1, empSheet.getMaxRows() - 1, empSheet.getMaxColumns()).clearContent();
      empSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    var backgrounds = [];
    for (var i = 0; i < rows.length; i++) {
       var rowBg = [];
       var st = String(rows[i][12] || "Active").trim();
       var dailyRateStr = String(rows[i][3] || "").trim();
       var isInactive = (st === "Inactive");
       
       for (var j = 0; j < headers.length; j++) {
         var color = null;
         if (isInactive) {
           color = "#d9d9d9";
         } else if (j === 3 && dailyRateStr !== "" && dailyRateStr !== "375" && dailyRateStr !== "0") {
           color = "#ffff00";
         }
         rowBg.push(color);
       }
       backgrounds.push(rowBg);
    }
    if (rows.length > 0) {
      empSheet.getRange(2, 1, rows.length, headers.length).setBackgrounds(backgrounds);
    }
  } catch(e) {}
}

function getEmployeesData() {
  autoDeactivateAndSortEmployees();
  
  function convertDriveUrlToImg(url) {
    if (!url) return "";
    var u = String(url).trim();
    if (u.indexOf("drive.google.com") > -1) {
      var idMatch = u.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch) return "https://drive.google.com/thumbnail?id=" + idMatch[1] + "&sz=w1000";
      var fileMatch = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) return "https://drive.google.com/thumbnail?id=" + fileMatch[1] + "&sz=w1000";
    }
    return u;
  }
  
  try {
    var sheet = getSheetByNameOrCreateNew("Employees");
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || String(row[0]).trim() === "") continue;
      result.push({
        name: String(row[0]).trim(),
        fullName: String(row[1] || "").trim(),
        monthlyRate: Number(row[2]) || 0,
        dailyRate: Number(row[3]) || 0,
        normalRate: Number(row[4]) || 0,
        otRate: Number(row[5]) || 0,
        deductionType: String(row[6] || "3%").trim(),
        employeeType: String(row[7] || "").trim(),
        startDate: String(row[8] || "").trim(),
        pin: String(row[9] || "").trim(),
        bankAccount: String(row[10] || "").trim(),
        photo: convertDriveUrlToImg(row[11]),
        status: String(row[12] || "Active").trim(),
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
      if (!isDateValid(row[1])) continue;
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
      if (!isDateValid(row[2])) continue;
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
      if (!isDateValid(row[3])) continue;
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
    p.dailyRate,
    p.hourlyRate,
    p.otRate,
    p.deductionType,
    p.employeeType,
    p.startDate || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd"),
    p.pin,
    p.bankAccount,
    p.photo || "",
    p.monthlyRate || 0,
    p.status || "Active",
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
  syncAttendanceToNewSheet();
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
  
  var flexMessage = {
    "type": "flex",
    "altText": "📌 มีคำขอลางานใหม่จาก " + leave.name,
    "sender": {
      "name": "[HR] พี่ใจดี💖",
      "iconUrl": "https://cdn3.iconfinder.com/data/icons/business-avatar-1/512/2_avatar-512.png"
    },
    "contents": {
      "type": "bubble",
      "size": "mega",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "📌 คำขอลางานใหม่",
            "weight": "bold",
            "color": "#ffffff",
            "size": "lg"
          }
        ],
        "backgroundColor": "#ff7b54",
        "paddingAll": "15px"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "พนักงาน", "color": "#aaaaaa", "size": "sm", "flex": 3 },
              { "type": "text", "text": leave.name, "wrap": true, "color": "#333333", "size": "sm", "weight": "bold", "flex": 7 }
            ],
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "ประเภท", "color": "#aaaaaa", "size": "sm", "flex": 3 },
              { "type": "text", "text": leave.leaveType, "wrap": true, "color": "#333333", "size": "sm", "weight": "bold", "flex": 7 }
            ],
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "วันที่", "color": "#aaaaaa", "size": "sm", "flex": 3 },
              { "type": "text", "text": leave.startDate + " ถึง " + leave.endDate, "wrap": true, "color": "#333333", "size": "sm", "weight": "bold", "flex": 7 }
            ],
            "margin": "md"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              { "type": "text", "text": "เหตุผล", "color": "#aaaaaa", "size": "sm", "flex": 3 },
              { "type": "text", "text": leave.reason, "wrap": true, "color": "#333333", "size": "sm", "weight": "bold", "flex": 7 }
            ],
            "margin": "md"
          }
        ],
        "paddingAll": "20px"
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#4caf50",
            "action": {
              "type": "uri",
              "label": "เปิดดูในระบบ",
              "uri": ScriptApp.getService().getUrl() || "https://script.google.com"
            }
          }
        ],
        "paddingAll": "15px"
      }
    }
  };
  
  sendLineFlexMessage([flexMessage]);
  
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
