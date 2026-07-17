function parseDate(str) {
  var d = new Date(str);
  var m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) {
    var p1 = parseInt(m[1], 10), p2 = parseInt(m[2], 10), p3 = parseInt(m[3], 10);
    if (p3 > 1000) d = (p1 > 31) ? new Date(p1, p2 - 1, p3) : new Date(p3, p2 - 1, p1);
  }
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
console.log("July 2:", parseDate("02/07/2026 11:32:20"));
console.log("July 3:", parseDate("03/07/2026 12:14:40"));
console.log("June 1:", parseDate("01/06/2026 11:27:54"));

var arr = ["01/06/2026 11:27:54", "02/07/2026 11:32:20", "03/07/2026 12:14:40"];
arr.sort(function(a, b) {
  return parseDate(b) - parseDate(a);
});
console.log(arr);
