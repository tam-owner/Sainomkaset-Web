const fs = require('fs');
let code = fs.readFileSync('js/app.js', 'utf8');

let newCode = code.replace(/const overlay = document\.getElementById\('loading-overlay'\);\s*if \(overlay\) \{\s*document\.getElementById\('loading-text'\)\.innerText = (.*?);\s*overlay\.classList\.remove\('hidden'\);\s*\}/g, 'showLoading($1);');

newCode = newCode.replace(/const overlay = document\.getElementById\('loading-overlay'\);\s*if \(overlay\) overlay\.classList\.add\('hidden'\);/g, 'hideLoading();');

newCode = newCode.replace(/document\.getElementById\('loading-overlay'\)\.classList\.add\('hidden'\);/g, 'hideLoading();');

fs.writeFileSync('js/app.js', newCode);
console.log("Replaced!");
