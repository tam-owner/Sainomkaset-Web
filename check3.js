const fs = require('fs');
const html = fs.readFileSync('live.html', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const document = dom.window.document;

const periodCard = document.getElementById('period-selector-card');
let p = periodCard.parentElement;
while (p) {
    if (p.id) console.log("Parent ID:", p.id);
    p = p.parentElement;
}
