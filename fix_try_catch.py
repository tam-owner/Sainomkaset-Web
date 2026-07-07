import sys
with open('js/app.js', 'r') as f:
    content = f.read()

target = """function applyInitData(data, isSilent = false) {
    const overlay = document.getElementById('loading-overlay');
    rawAttendance = data.attendance;"""

replacement = """function applyInitData(data, isSilent = false) {
    try {
        if (!data) {
            console.error("Firebase data is null!");
            hideLoading();
            Swal.fire('Error', 'ไม่พบข้อมูลในฐานข้อมูล (Firebase return null)', 'error');
            return;
        }
        const overlay = document.getElementById('loading-overlay');
        rawAttendance = data.attendance || [];"""

if target in content:
    content = content.replace(target, replacement)
    
    # Also need to close the try block
    end_target = """        if (isInitialLoad) {
            hideLoading();
            if (!cachedStr) {
                showView('view-login', false);
            }
        }
    });
}"""

    end_replacement = """        if (isInitialLoad) {
            hideLoading();
            if (!cachedStr) {
                showView('view-login', false);
            }
        }
    });
    } catch (e) {
        console.error("Error in applyInitData:", e);
        hideLoading();
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + e.message, 'error');
    }
}"""
    content = content.replace(end_target, end_replacement)
    
    with open('js/app.js', 'w') as f:
        f.write(content)
    print("Added try-catch to applyInitData")
else:
    print("Could not find target")
