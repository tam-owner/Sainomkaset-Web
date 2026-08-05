const fetch = require('node-fetch');
const url = 'https://script.google.com/macros/s/AKfycbzghYLwBjFef955IZOkPgS4uUcAy5bN9R3bsB0bI5rGZoXwoFPyeUR2zRtVjUBEtPc/exec?action=getInitPayrollData';
fetch(url).then(res => res.text()).then(text => console.log(text.substring(0, 500))).catch(err => console.error(err));
