// Chay MOT LAN trong trinh soan script (tai khoan takikj02) de cap quyen cho app O Heo:
// Bang tinh, Drive (tep gui kem, avatar), goi ra ngoai (tai tep lon tung phan len Drive).
function capQuyen() {
  SpreadsheetApp.getActive;                       // quyen Bang tinh
  DriveApp.getRootFolder().getName();             // quyen Drive
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true }); // quyen goi ra ngoai
  ScriptApp.getOAuthToken();                      // ma dang nhap de tai tep lon len Drive
  // Thu muc cha theo cay Drive KK19 (H duyet 07:45 20/11): "01 CHUNG - Cong viec co quan"
  const P = PropertiesService.getScriptProperties();
  if (!P.getProperty('THU_MUC_CHA')) P.setProperty('THU_MUC_CHA', '18UwO26VS6dFHE8RiMIr_RbmSMnNCETKo');
  Logger.log('Da cap quyen xong cho O Heo');
}
