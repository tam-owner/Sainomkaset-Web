const url = "https://script.google.com/macros/s/AKfycbxFH8YavPxZMJBeSX-zmTqQQu2dVGPpHrDeNoXD-rvjV1VV4ZVi4w6pFz1uM3TyNt0/exec?action=getScheduleData";

fetch(url)
  .then(res => {
    console.log("Status:", res.status);
    return res.text();
  })
  .then(text => {
    console.log("Response length:", text.length);
    console.log("Response text:", text.substring(0, 500));
  })
  .catch(err => {
    console.error("Error:", err);
  });
