const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="login-name"></div></body></html>', {
  url: "http://localhost/",
  runScripts: "dangerously"
});

// Setup mock browser environment
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = { getItem: () => null, setItem: () => {} };
global.sessionStorage = { getItem: () => null, setItem: () => {} };
global.navigator = dom.window.navigator;
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });

// Mock Swal
global.Swal = { fire: () => Promise.resolve({}) };
global.window.Swal = global.Swal;

try {
  require('./js/app.js');
  console.log("No runtime errors on initial load.");
} catch (e) {
  console.error("Runtime error:", e);
}
