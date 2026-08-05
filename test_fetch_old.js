const fetch = require('node-fetch');
const url = 'https://script.google.com/macros/s/AKfycbwXGe8xGVhb8JPszuIfGG0G6vp1zDyT8JSvp3yuE6yGsiwDVW_SDcXv6iVcrube8fM/exec';
const payload = { action: 'saveChecklistSettings', data: { "Service": { "เปิดร้าน": ["1", "2"] } } };
fetch(url, { method: 'POST', body: JSON.stringify(payload) })
  .then(res => res.text())
  .then(text => console.log(text.substring(0, 200)))
  .catch(err => console.error(err));
