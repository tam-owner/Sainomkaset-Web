function cleanTimeStr(str) {
    if (!str || str === '-' || str === 'undefined') return '-';
    // If it's already HH:mm or HH:mm:ss, return HH:mm
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str.trim())) {
        return str.trim().substring(0, 5);
    }
    // Check if it's a date string like "Sat Dec 30 1899 16:30:00 GMT+0642 (Indochina Time)"
    let d = new Date(str);
    if (!isNaN(d.getTime())) {
        let h = String(d.getHours()).padStart(2, '0');
        let m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }
    return str;
}

console.log(cleanTimeStr("Sat Dec 30 1899 16:30:00 GMT+0642 (Indochina Time)"));
console.log(cleanTimeStr("16:30"));
console.log(cleanTimeStr("08:00:00"));
console.log(cleanTimeStr("-"));
console.log(cleanTimeStr(""));
