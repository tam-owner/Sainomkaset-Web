const fs = require('fs');
const html = fs.readFileSync('live.html', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const document = dom.window.document;

const dashboard = document.getElementById('view-dashboard');
const emp = document.getElementById('view-employee');
const period = document.getElementById('period-selector-card');

console.log("Period Selector Parent:", period.parentNode.parentNode.id);
console.log("Is period selector inside view-employee?", emp.contains(period));
console.log("Is period selector inside view-dashboard?", dashboard.contains(period));
