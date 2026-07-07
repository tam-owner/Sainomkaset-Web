const row = {
    scheduledIn: '18:00',
    scheduledOut: '-',
    inTime: new Date('2026-06-30T11:30:00'),
    outTime: null,
    manualIn: '11:30',
    manualOut: '20:30'
};

function formatTime(d) {
    if(!d) return '';
    return d.getHours() + ':' + d.getMinutes();
}

let inStr = formatTime(row.inTime);
if (inStr === '-') inStr = '';
let outStr = formatTime(row.outTime);
if (outStr === '-') outStr = '';

let schedInStr = row.scheduledIn && row.scheduledIn !== '-' ? row.scheduledIn : '';
let schedOutStr = row.scheduledOut && row.scheduledOut !== '-' ? row.scheduledOut : '';

if (row.manualIn) schedInStr = row.manualIn;
if (row.manualOut) schedOutStr = row.manualOut;

let inDisplay = inStr || '-';
let outDisplay = outStr || '-';

console.log("schedInStr:", schedInStr);
console.log("inDisplay:", inDisplay);
console.log("schedOutStr:", schedOutStr);
console.log("outDisplay:", outDisplay);
