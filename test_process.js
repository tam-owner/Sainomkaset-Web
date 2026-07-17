const recordsByDayAndName = {};
const rawAttendance = [
    {"timestamp":"16/07/2026 11:38:32","name":"อาย","type":"เข้า","scheduledTime":"11:30"},
    {"timestamp":"16/07/2026 20:32:30","name":"อาย","type":"ออก","scheduledTime":"20:30"},
    {"timestamp":"16/07/2026 11:37:16","name":"มิว","type":"เข้า","scheduledTime":"11:30"},
    {"timestamp":"16/07/2026 20:39:59","name":"มิว","type":"ออก","scheduledTime":"20:30"}
];

rawAttendance.forEach(r => {
    let timestampStr = String(r.timestamp).trim();
    let d;
    const dtMatch = timestampStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/);
    if (dtMatch) {
        let day = dtMatch[1].padStart(2, '0');
        let month = dtMatch[2].padStart(2, '0');
        let year = dtMatch[3];
        let time = dtMatch[4] || '00:00:00';
        d = new Date(`${year}-${month}-${day}T${time}`);
    } else {
        d = new Date(timestampStr);
    }
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    if (!recordsByDayAndName[dateStr]) recordsByDayAndName[dateStr] = {};
    if (!recordsByDayAndName[dateStr][r.name]) recordsByDayAndName[dateStr][r.name] = { name: r.name, date: dateStr, dateObj: d };
    
    const rec = recordsByDayAndName[dateStr][r.name];
    if (r.type === 'เข้า') {
        rec.inTime = d;
    } else if (r.type === 'ออก') {
        rec.outTime = d;
    }
});

console.log(JSON.stringify(recordsByDayAndName, null, 2));
