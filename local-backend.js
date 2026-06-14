const GAS_URL = "https://script.google.com/macros/s/AKfycbwEvxyAvgimf7xq_gobDUh4UPytAQDTzAhGtcxoP1kof5RzTWguik-srWNLSA0-CDw/exec";

function callGasAPI(action, reqObj) {
    let body = { action: action, _ts: new Date().getTime() }; // ใส่ _ts ป้องกันการจำแคชของ Browser
    if (reqObj) { Object.assign(body, reqObj); }
    
    return fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        cache: "no-store" // สั่ง Browser ว่าห้ามเอาของเก่ามาแสดงซ้ำเด็ดขาด
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'success') return typeof res.data !== 'undefined' ? res.data : res;
        throw new Error(res.message || JSON.stringify(res));
    });
}

window.google = window.google || {};
window.google.script = window.google.script || {};

window.google.script.run = {
    processData: function() {},
    getInitPayrollData: function() {},
    withFailureHandler: function(errCallback) { 
        this._errCallback = errCallback; 
        return this; // chaining support
    },
    withSuccessHandler: function(successCallback) {
        let self = this;
        function callAndHandle(action, reqObj) {
            callGasAPI(action, reqObj)
                .then(data => { if(successCallback) successCallback(data); })
                .catch(e => { console.error("GAS API Error:", e); if(self._errCallback) self._errCallback(e); });
        }
        
        return {
            getInitPayrollData: () => callAndHandle("getInitPayrollData"),
            getHistoryData: () => callAndHandle("getHistoryData"),
            getSavedVersions: () => callAndHandle("getSavedVersions"),
            
            processData: (payload) => callAndHandle("processData", { payload: payload }),
            saveEmployeeMasterData: (payload) => callAndHandle("saveEmployeeMasterData", { payload: payload }),
            savePayrollRecord: (payload) => callAndHandle("savePayrollRecord", { payload: payload }),
            
            loadSavedVersionData: (period, timestamp) => callAndHandle("loadSavedVersionData", { period: period, timestamp: timestamp }),
            deletePayrollPeriod: (period) => callAndHandle("deletePayrollPeriod", { period: period }),
            checkSlipLogin: (name, pin) => callAndHandle("checkSlipLogin", { name: name, pin: pin }),
            getEmployeeSlip: (name) => callAndHandle("getEmployeeSlip", { name: name })
        };
    }
};

// เคลียร์ข้อมูลเก่าทั้งหมดใน LocalStorage ให้สะอาดหมดจด เพื่อบังคับใช้ผ่าน Google Sheets ร้อยเปอร์เซ็นต์
localStorage.removeItem('employeeMasterDB');
localStorage.removeItem('savedVersionsGlobal');
localStorage.removeItem('att_v27_final');
localStorage.removeItem('att_saved_users');
localStorage.removeItem('timeSyncLogs');
