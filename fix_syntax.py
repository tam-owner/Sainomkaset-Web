import sys
with open('js/app.js', 'r') as f:
    content = f.read()

bad_try_catch_end = """    } catch (e) {
        console.error("Error in applyInitData:", e);
        hideLoading();
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + e.message, 'error');
    }"""

if bad_try_catch_end in content:
    content = content.replace(bad_try_catch_end, "")
    print("Removed bad catch block")

bad_try_start = """function applyInitData(data, isSilent = false) {
    try {
        if (!data) {
            console.error("Firebase data is null!");
            hideLoading();
            Swal.fire('Error', 'ไม่พบข้อมูลในฐานข้อมูล (Firebase return null)', 'error');
            return;
        }
        const overlay = document.getElementById('loading-overlay');
        rawAttendance = data.attendance || [];"""

good_start = """function applyInitData(data, isSilent = false) {
    const overlay = document.getElementById('loading-overlay');
    rawAttendance = data.attendance || [];"""

if bad_try_start in content:
    content = content.replace(bad_try_start, good_start)
    print("Removed bad try start")

with open('js/app.js', 'w') as f:
    f.write(content)
