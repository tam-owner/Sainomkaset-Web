async function run() {
    const res = await fetch('https://script.google.com/macros/s/AKfycby0yyvtWVwLA2GN8vyLIvA3JDMHdXonDNbn3w_ZDlnLz1v_HwmOP2xFemNDYrsI07c/exec', {
        method: 'POST',
        body: JSON.stringify({ action: "getInitPayrollData" }),
        headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
    const prData = await res.json();
    console.log(prData.data.settings);
}
run();
