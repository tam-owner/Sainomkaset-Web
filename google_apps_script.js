function doGet(e) {
  var action = e.parameter.action;
  
  if (action == "getAttendance") {
    var data = getAttendanceData();
    return createJsonResponse({status: "success", data: data});
  } else if (action == "getEmployees") {
    var data = getEmployeesData();
    return createJsonResponse({status: "success", data: data});
  } else if (action == "getDeductions") {
    var data = getDeductionsData();
    return createJsonResponse({status: "success", data: data});
  }
  
  return HtmlService.createHtmlOutput('API is running.');
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;

    if (action == "updatePin") {
      var result = handleUpdatePin(postData.name, postData.oldPin, postData.newPin);
      return createJsonResponse(result);
    } else if (action == "saveDeduction") {
      var result = handleSaveDeduction(postData.deduction);
      return createJsonResponse(result);
    } else if (action == "deleteDeduction") {
      var result = handleDeleteDeduction(postData.id);
      return createJsonResponse(result);
    } else if (action == "autoRegister") {
      var result = handleAutoRegister(postData.names);
      return createJsonResponse(result);
    }

    return createJsonResponse({status: "error", message: "Unknown action"});
  } catch (error) {
    return createJsonResponse({status: "error", message: error.toString()});
  }
}

function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  // Optional: add headers for CORS if calling from another domain (though GAS web app mostly handles it)
  return output;
}

// ----------------------------------------------------
// Spreadsheet Access Helpers
// ----------------------------------------------------
function getSpreadsheet() {
  return SpreadsheetApp.openById("1rS2XH04BgcY_bRRHIFiyb4M1utvDnNsfzsSd11dUbbk");
}

function getSheetByNameOrCreate(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    // Initialize headers
    if (name === "Employees") {
      sheet.appendRow(["Name", "PIN", "NormalRate", "OTRate", "DeductionType"]);
    } else if (name === "Deductions") {
      sheet.appendRow(["ID", "Period", "Name", "Amount", "Reason", "Timestamp"]);
    }
  }
  return sheet;
}

// ----------------------------------------------------
// Attendance Data (Existing logic slightly refactored)
// ----------------------------------------------------
function getAttendanceData() {
  try {
    var ss = getSpreadsheet();
    var targetGid = 1244384131;
    var sheet = null;
    var sheets = ss.getSheets();
    for (var j = 0; j < sheets.length; j++) {
      if (sheets[j].getSheetId() == targetGid) {
        sheet = sheets[j];
        break;
      }
    }
    
    if (!sheet) {
      sheet = ss.getSheetByName("Form_Responses") || ss.getSheets()[0];
    }
    
    if (!sheet) return [{error: "No sheets found"}];
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [{error: "Sheet is empty"}];
    
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || row[0] == "") continue;
      
      result.push({
        timestamp: row[0],
        name: String(row[1]).trim(),
        type: String(row[2]).trim(), 
        scheduledTime: String(row[3]).trim(), 
        note: String(row[4] || "").trim()
      });
    }
    return result;
  } catch (e) {
    return [{error: e.toString()}];
  }
}

// ----------------------------------------------------
// Employees Data
// ----------------------------------------------------
function getEmployeesData() {
  try {
    var sheet = getSheetByNameOrCreate("Employees");
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || row[0] == "") continue;
      result.push({
        name: String(row[0]).trim(),
        pin: String(row[1] || "").trim(),
        normalRate: Number(row[2]) || 0,
        otRate: Number(row[3]) || 0,
        deductionType: String(row[4] || "None").trim() // "3%", "5%", "None"
      });
    }
    return result;
  } catch (e) {
    return [{error: e.toString()}];
  }
}

function handleUpdatePin(name, oldPin, newPin) {
  var sheet = getSheetByNameOrCreate("Employees");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === name) {
      var currentPin = String(data[i][1] || "").trim();
      if (currentPin === oldPin) {
        sheet.getRange(i + 1, 2).setValue(newPin);
        return {status: "success", message: "PIN updated successfully"};
      } else {
        return {status: "error", message: "รหัสผ่านเดิมไม่ถูกต้อง"};
      }
    }
  }
  return {status: "error", message: "ไม่พบชื่อพนักงาน"};
}

function handleAutoRegister(names) {
  var sheet = getSheetByNameOrCreate("Employees");
  var existingData = sheet.getDataRange().getValues();
  var existingNames = {};
  for (var i = 1; i < existingData.length; i++) {
    var name = String(existingData[i][0]).trim();
    if (name) existingNames[name] = true;
  }
  
  var addedCount = 0;
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (!existingNames[name] && name.trim() !== "") {
      // name, pin, normalRate, otRate, deductionType
      sheet.appendRow([name, "1234", 46.88, 8.79, "3%"]);
      existingNames[name] = true;
      addedCount++;
    }
  }
  return {status: "success", added: addedCount};
}

// ----------------------------------------------------
// Deductions Data
// ----------------------------------------------------
function getDeductionsData() {
  try {
    var sheet = getSheetByNameOrCreate("Deductions");
    var data = sheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] || row[0] == "") continue;
      result.push({
        id: String(row[0]),
        period: String(row[1]),
        name: String(row[2]),
        amount: Number(row[3]) || 0,
        reason: String(row[4] || ""),
        timestamp: row[5]
      });
    }
    return result;
  } catch (e) {
    return [{error: e.toString()}];
  }
}

function handleSaveDeduction(deduction) {
  var sheet = getSheetByNameOrCreate("Deductions");
  var timestamp = new Date().toISOString();

  if (deduction.id) {
    // Update existing
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === deduction.id) {
        sheet.getRange(i + 1, 2).setValue(deduction.period);
        sheet.getRange(i + 1, 3).setValue(deduction.name);
        sheet.getRange(i + 1, 4).setValue(deduction.amount);
        sheet.getRange(i + 1, 5).setValue(deduction.reason);
        sheet.getRange(i + 1, 6).setValue(timestamp);
        return {status: "success", message: "Updated successfully", id: deduction.id};
      }
    }
    return {status: "error", message: "Deduction not found for update"};
  } else {
    // Insert new
    var newId = Utilities.getUuid();
    sheet.appendRow([
      newId,
      deduction.period,
      deduction.name,
      deduction.amount,
      deduction.reason,
      timestamp
    ]);
    return {status: "success", message: "Added successfully", id: newId};
  }
}

function handleDeleteDeduction(id) {
  var sheet = getSheetByNameOrCreate("Deductions");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.deleteRow(i + 1);
      return {status: "success", message: "Deleted successfully"};
    }
  }
  return {status: "error", message: "Deduction not found"};
}
