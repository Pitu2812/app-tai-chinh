// Chay MOT LAN trong trinh soan script (tai khoan takikj02) de cap quyen cho app O Heo:
// Bang tinh, Drive (tep gui kem, avatar), goi ra ngoai (tai tep lon tung phan len Drive).
function capQuyen() {
  SpreadsheetApp.getActive;                       // quyen Bang tinh
  DriveApp.getRootFolder().getName();             // quyen Drive
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true }); // quyen goi ra ngoai
  ScriptApp.getOAuthToken();                      // ma dang nhap de tai tep lon len Drive
  Logger.log('Da cap quyen xong cho O Heo');
}
