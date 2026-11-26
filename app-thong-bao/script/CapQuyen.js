// Chay MOT LAN trong trinh soan script (tai khoan takikj02) de cap quyen cho App Thong bao:
// Drive (doc quyet dinh, OCR, Luu vao Drive), Google Docs, Bang tinh (danh muc xa), goi ra ngoai (Drive API chuyen doi tep).
function capQuyen() {
  DriveApp.getRootFolder().getName();             // quyen Drive
  DocumentApp.getActiveDocument;                  // quyen Google Docs
  SpreadsheetApp.getActive;                       // quyen Bang tinh
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true }); // quyen goi ra ngoai
  ScriptApp.getOAuthToken();                      // ma dang nhap goi Drive API
  Logger.log('Da cap quyen xong cho App Thong bao');
}
