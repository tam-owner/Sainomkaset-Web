const fs = require('fs');
const html = fs.readFileSync('live.html', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const document = dom.window.document;

const labels = Array.from(document.querySelectorAll('label')).filter(l => l.textContent.includes('เลือกรอบเวลา'));
console.log("Found", labels.length, "labels with 'เลือกรอบเวลา'");
labels.forEach((l, i) => {
    let p = l.parentElement;
    while (p && p.id === '') p = p.parentElement;
    console.log(`Label ${i+1} is inside element with ID:`, p ? p.id : 'No ID parent');
});
