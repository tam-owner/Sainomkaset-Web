const fetch = require('node-fetch');
const url = 'https://script.google.com/macros/s/AKfycbzghYLwBjFef955IZOkPgS4uUcAy5bN9R3bsB0bI5rGZoXwoFPyeUR2zRtVjUBEtPc/exec';
const payload = { action: 'saveChecklistSettings', data: { "Service": { "เปิดร้าน": ["1", "2"] } } };
fetch(url, { method: 'POST', body: JSON.stringify(payload) })
  .then(res => res.text())
  .then(text => console.log(text.substring(0, 500)))
  .catch(err => console.error(err));
