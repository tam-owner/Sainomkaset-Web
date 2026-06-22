const fs = require('fs');
const html = fs.readFileSync('live.html', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const document = dom.window.document;

const dashboard = document.getElementById('view-dashboard');
console.log("view-dashboard html:");
console.log(dashboard.outerHTML.substring(0, 500) + "\n...\n" + dashboard.outerHTML.substring(dashboard.outerHTML.length - 500));
