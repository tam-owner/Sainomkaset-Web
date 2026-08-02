import urllib.request
import json

url = "https://script.google.com/macros/s/AKfycbwv6I3Sts0LG6KNxzC84wK2o46OfEnGW6fJ4dz-syCt8J3sGpixhWXJU5q0vgwvEC8/exec"
data = json.dumps({"action": "processData", "payload": {"fullDateTime": "31/7/26 13:30:00", "mode": "in", "actualTime": "13:30", "remark": "Test", "name": "Test"}}).encode('utf-8')
req = urllib.request.Request(url, data=data, method='POST')
req.add_header('Content-Type', 'text/plain')
try:
    with urllib.request.urlopen(req) as f:
        print(f.read().decode('utf-8'))
except Exception as e:
    print(e)
