const fs = require('fs');
const html = fs.readFileSync('live.html', 'utf8');
const { JSDOM } = require('jsdom');
const dom = new JSDOM(html);
const document = dom.window.document;

const body = document.body;
console.log("Direct children of body:");
Array.from(body.children).forEach(c => {
    if (c.tagName === 'DIV') console.log(`DIV id=${c.id} class=${c.className}`);
    else console.log(c.tagName);
});
