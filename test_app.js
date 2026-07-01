const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable" });

const scriptCode = fs.readFileSync('js/app.js', 'utf8');

const scriptEl = dom.window.document.createElement("script");
scriptEl.textContent = scriptCode;

dom.window.document.body.appendChild(scriptEl);

dom.window.addEventListener('error', (event) => {
    console.error("Caught error:", event.error);
});
console.log("Loaded successfully");
