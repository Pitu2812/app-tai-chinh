/**
 * APP TÀI CHÍNH - máy chủ Google Apps Script
 * - doGet: trả về trang web (đọc từ tệp trên Google Drive, nên cập nhật chỉ cần thay tệp, địa chỉ web không đổi)
 * - api: đăng nhập bằng tài khoản do Quản trị cấp, lưu và đồng bộ dữ liệu dùng chung trong một Google Sheet
 * Cách dựng xem tệp HUONG-DAN-SCRIPT.md
 */
var CFG = {
  APPS: {                          // ?app=...  ->  tên tệp .html trên Drive của chủ script
    '': 'app-tai-chinh.html',
    'phan-cap': 'phan-cap-thu-rieng.html'
  },
  TITLE: 'APP TÀI CHÍNH',
  TITLES: { 'phan-cap': 'App phân cấp' },   // tiêu đề tab theo từng app
  GATED: { 'phan-cap': true },              // app chỉ trả cho tài khoản Quản trị hoặc quyền Phân cấp (mã pc)
  FAVICONS:{ 'phan-cap': 'https://drive.google.com/uc?export=view&id=1rMah3k5U2bji79jLQwOzakjIaAj0fSid' },                    // ?app=... -> địa chỉ https của icon (điền khi có tệp icon từ KK02)
  SS_NAME: 'APP TAI CHINH - DU LIEU',
  ADMIN_USER: 'takikj02',          // tài khoản quản trị cao nhất, tạo khi chạy setup()
  ADMIN_PASS: '',                  // để trống: setup() tự tạo mật khẩu ngẫu nhiên; takikj02 vào bằng Google, cần thì đổi mật khẩu trong web
  CHUNK: 45000,                    // mỗi ô Google Sheet tối đa 50.000 ký tự
  SESSION_DAYS: 30,
  MAX_FAIL: 5,                     // sai quá số lần này thì khóa tạm
  LOCK_MIN: 15,
  LOG_KEEP: 2000
};

/* ===================== trang web ===================== */
function doGet(e) {
  var app = (e && e.parameter && e.parameter.app) || '';
  var name = CFG.APPS[app];
  if (!name) return HtmlService.createHtmlOutput('Không có ứng dụng này.');
  if (CFG.GATED[app]) return gatePage_(app);
  /* mặc định nạp qua loader (google.script.run) để HtmlService không cắt mã trang; ?mode=direct để nạp thẳng như cũ */
  if (!(e && e.parameter && e.parameter.mode === 'direct')) return loaderPage_(name);
  var html = readApp_(name);
  html = autoLogin_(html);
  html = '<script>window.TC_EXEC=' + JSON.stringify(ScriptApp.getService().getUrl()) + '<\/script>' + html;
  var out = HtmlService.createHtmlOutput(html)
    .setTitle(CFG.TITLES[app] || CFG.TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  try { if (CFG.FAVICONS[app]) out.setFaviconUrl(CFG.FAVICONS[app]); } catch (e) {}
  return out;
}
/* chủ script (takikj02) mở link khi đang đăng nhập Google thì vào thẳng, không cần gõ mật khẩu */
function autoLogin_(html) {
  try {
    var me = Session.getActiveUser().getEmail(), owner = Session.getEffectiveUser().getEmail();
    if (!me || !owner || me.toLowerCase() !== owner.toLowerCase()) return html;
    var ss = ss_(), u = findUser_(ss, CFG.ADMIN_USER);
    if (!u || !u.active) return html;
    var token = startSession_(ss, u.username, true);
    return '<script>try{localStorage.setItem("tc_tok","' + token + '")}catch(e){}<\/script>' + html;
  } catch (e) { return html; }
}
/* web nằm ngay trong dự án script (robot GitHub đẩy lên cùng mã): tên tệp web -> tên tệp html trong script */
var EMB = { 'app-tai-chinh.html': 'app_tai_chinh', 'phan-cap-thu-rieng.html': 'phan_cap_thu_rieng' };
function embedded_(name) {
  var e = EMB[name];
  if (!e) return null;
  /* cách 1: web mã hoá base64 trong tệp .js (robot sinh web_<tên>.js, mỗi mảnh là một chuỗi) để HtmlService không đụng vào nội dung */
  try {
    var parts = (typeof WEB_PARTS !== 'undefined') ? WEB_PARTS[e] : null;
    if (parts && parts.length) return Utilities.newBlob(Utilities.base64Decode(parts.join(''))).getDataAsString('UTF-8');
  } catch (x) {}
  /* cách 2: tệp html nằm trong script */
  try { return HtmlService.createHtmlOutputFromFile(e).getContent(); } catch (x) { return null; }
}
/* ưu tiên web nằm trong script, không có thì lấy tệp mới nhất theo tên trên Drive của chủ script */
function readApp_(name) {
  var emb = embedded_(name);
  if (emb) return emb;
  var it = DriveApp.getFilesByName(name), best = null;
  while (it.hasNext()) { var f = it.next(); if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f; }
  if (!best) throw new Error('Chưa thấy tệp "' + name + '" trên Google Drive của chủ script.');
  return best.getBlob().getDataAsString('UTF-8');
}
/* dự phòng nếu trang quá nặng: tải nội dung qua google.script.run rồi ghi vào trang (mở bằng ?mode=loader) */
function getApp(name) {
  for (var k in CFG.GATED) if (CFG.APPS[k] === name) throw new Error('Cần đăng nhập để mở ứng dụng này.');
  var html = autoLogin_(readApp_(name));
  return '<script>window.TC_EXEC=' + JSON.stringify(ScriptApp.getService().getUrl()) + '<\/script>' + html;
}
/* app cần đăng nhập (admin hoặc quyền Phân cấp): trang chỉ chứa mã kiểm tra, nội dung chỉ được trả sau khi máy chủ xác nhận phiên */
function gatePage_(app) {
  var exec = ScriptApp.getService().getUrl();
  var t = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;padding:24px;text-align:center">' +
    '<p id="m">Đang kiểm tra đăng nhập…</p><script>' +
    'var tok="";try{tok=localStorage.getItem("tc_tok")||""}catch(e){}' +
    'google.script.run.withSuccessHandler(function(r){' +
    'if(r&&r.ok){if(r.token){try{localStorage.setItem("tc_tok",r.token)}catch(e){}}document.open();document.write(r.html);document.close()}' +
    'else{document.getElementById("m").innerHTML=(r&&r.msg||"Cần đăng nhập")+"<br><br><a target=\\"_blank\\" href=\\""+' + JSON.stringify(exec) + '+"\\">Mở app tài chính để đăng nhập</a>"}})' +
    '.withFailureHandler(function(e){document.getElementById("m").textContent="Không tải được: "+e.message}).getGated(' + JSON.stringify(app) + ',tok)<\/script>';
  var out = HtmlService.createHtmlOutput(t).setTitle(CFG.TITLES[app] || CFG.TITLE).addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  try { if (CFG.FAVICONS[app]) out.setFaviconUrl(CFG.FAVICONS[app]); } catch (e) {}
  return out;
}
function getGated(app, token) {
  var name = CFG.APPS[app];
  if (!name || !CFG.GATED[app]) return { ok: false, msg: 'Không có ứng dụng này.' };
  var ss = ss_(), u = authUser_(ss, token), newTok = '';
  if (!u) {
    try {
      var me = Session.getActiveUser().getEmail(), owner = Session.getEffectiveUser().getEmail();
      if (me && owner && me.toLowerCase() === owner.toLowerCase()) {
        var a = findUser_(ss, CFG.ADMIN_USER);
        if (a && a.active) { u = a; newTok = startSession_(ss, a.username, true); }
      }
    } catch (e) {}
  }
  if (!u) return { ok: false, msg: 'Cần đăng nhập app tài chính trước khi mở app này.' };
  if (u.role !== 'admin' && u.role !== 'pc') return { ok: false, msg: 'Tài khoản này chưa được cấp quyền mở app Tỷ lệ phân cấp.' };
  var html = '<script>window.TC_EXEC=' + JSON.stringify(ScriptApp.getService().getUrl()) + '<\/script>' + readApp_(name);
  return { ok: true, html: html, token: newTok };
}
function loaderPage_(name) {
  var t = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;padding:24px">Đang tải ứng dụng…<script>' +
    'google.script.run.withSuccessHandler(function(h){document.open();document.write(h);document.close()})' +
    '.withFailureHandler(function(e){document.body.textContent="Không tải được: "+e.message}).getApp(' + JSON.stringify(name) + ')<\/script>';
  return HtmlService.createHtmlOutput(t).setTitle(CFG.TITLE).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ===================== cài đặt lần đầu (chạy một lần trong trình soạn thảo) ===================== */
function setup() {
  var props = PropertiesService.getScriptProperties(), ss;
  var id = props.getProperty('SS_ID');
  if (id) { ss = SpreadsheetApp.openById(id); }
  else { ss = SpreadsheetApp.create(CFG.SS_NAME); props.setProperty('SS_ID', ss.getId()); }
  sheet_(ss, 'kv', ['key', 'ts', 'chunks']);
  sheet_(ss, 'users', ['username', 'name', 'role', 'salt', 'hash', 'active', 'root', 'must', 'last', 'created']);
  sheet_(ss, 'sessions', ['token', 'username', 'expires']);
  sheet_(ss, 'log', ['t', 'u', 'a', 'd']);
  var us = ss.getSheetByName('users');
  if (us.getLastRow() < 2) {
    var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    us.appendRow([CFG.ADMIN_USER, CFG.ADMIN_USER, 'admin', salt, hash_(salt, CFG.ADMIN_PASS || Utilities.getUuid()), true, true, false, '', new Date().toISOString()]);
  }
  Logger.log('Xong. Bảng dữ liệu: ' + ss.getUrl());
  return ss.getUrl();
}
function sheet_(ss, name, head) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, head.length).setValues([head]); }
  var first = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (first && ss.getSheets().length > 1) { try { ss.deleteSheet(first); } catch (e) {} }
  return sh;
}
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (!id) throw new Error('Chưa chạy setup().');
  return SpreadsheetApp.openById(id);
}
function hash_(salt, pass) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pass, Utilities.Charset.UTF_8);
  return d.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/* ===================== API: một cửa duy nhất cho trang web ===================== */
function api(s) {
  var out;
  try {
    var q = JSON.parse(s), a = q.a, h = ROUTES[a];
    if (!h) out = { ok: false, msg: 'Lệnh không hợp lệ' };
    else out = h(q);
  } catch (e) { out = { ok: false, err: 'server', msg: 'Lỗi máy chủ: ' + e.message }; }
  return JSON.stringify(out);
}

/* ---------- người dùng ---------- */
function users_(ss) {
  var sh = ss.getSheetByName('users'), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, 10).getValues().map(function (r, i) {
    return { row: i + 2, username: r[0], name: r[1], role: r[2], salt: r[3], hash: r[4], active: r[5] === true || r[5] === 'TRUE', root: r[6] === true || r[6] === 'TRUE', must: r[7] === true || r[7] === 'TRUE', last: r[8], created: r[9] };
  });
}
function pub_(u) { return { username: u.username, name: u.name, role: u.role, active: u.active, root: u.root, must: u.must, last: u.last }; }
function findUser_(ss, name) {
  name = String(name || '').trim().toLowerCase();
  var us = users_(ss);
  for (var i = 0; i < us.length; i++) if (us[i].username === name) return us[i];
  return null;
}
function setUserCell_(ss, row, col, val) { ss.getSheetByName('users').getRange(row, col).setValue(val); }

/* ---------- số phiên bản web: Quản trị bấm "Cập nhật phiên bản mới" thì đổi số này, các máy đang mở thấy số khác sẽ tự tải lại ---------- */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function auto_() { return prop_("AUTO_UPDATE") !== "0"; }
/* mốc thời gian của tệp web trên Drive (tệp mới nhất theo tên), nhớ 60 giây cho nhanh */
function fileTs_() {
  var c = CacheService.getScriptCache(), v = c.get('filets');
  if (v) return +v;
  var it = DriveApp.getFilesByName(CFG.APPS['']), t = (typeof BUILD_TS !== 'undefined') ? +BUILD_TS : 0;   // BUILD_TS: robot GitHub ghi lúc đẩy mã
  while (it.hasNext()) { var f = it.next().getLastUpdated().getTime(); if (f > t) t = f; }
  c.put('filets', String(t), 60);
  return t;
}
/* số phiên bản: bật tự động thì lấy mốc tệp trên Drive (thay tệp là các máy tự tải lại), tắt thì chỉ đổi khi Quản trị bấm nút */
function ver_() {
  var m = +(prop_('APP_VER') || 0);
  return String(auto_() ? Math.max(m, fileTs_()) : m);
}
function bump_(q) {
  need_(q, 'admin');
  PropertiesService.getScriptProperties().setProperty('APP_VER', String(Date.now()));
  return { ok: true, ver: ver_(), auto: auto_() };
}
function autoSet_(q) {
  need_(q, 'admin');
  var P = PropertiesService.getScriptProperties();
  // chốt số phiên bản hiện tại trước khi đổi chế độ: tắt thì không làm các máy tải lại; bật mà tệp trên Drive mới hơn thì các máy tải lại một lần
  P.setProperty('APP_VER', ver_());
  P.setProperty('AUTO_UPDATE', q.on ? '1' : '0');
  CacheService.getScriptCache().remove('filets');
  return { ok: true, auto: auto_(), ver: ver_() };
}

/* ---------- phiên đăng nhập ---------- */
function newToken_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function startSession_(ss, username, keep) {
  var token = newToken_(), days = keep ? CFG.SESSION_DAYS : 1, exp = Date.now() + days * 86400000;
  var sh = ss.getSheetByName('sessions');
  sh.appendRow([token, username, exp]);
  // dọn phiên hết hạn (thỉnh thoảng)
  var n = sh.getLastRow();
  if (n > 200) {
    var vals = sh.getRange(2, 1, n - 1, 3).getValues(), keepRows = vals.filter(function (r) { return +r[2] > Date.now(); });
    sh.getRange(2, 1, n - 1, 3).clearContent();
    if (keepRows.length) sh.getRange(2, 1, keepRows.length, 3).setValues(keepRows);
  }
  CacheService.getScriptCache().put('s:' + token, username, 21000);
  return token;
}
function authUser_(ss, token) {
  if (!token) return null;
  var c = CacheService.getScriptCache(), name = c.get('s:' + token);
  if (!name) {
    var sh = ss.getSheetByName('sessions'), n = sh.getLastRow();
    if (n >= 2) {
      var vals = sh.getRange(2, 1, n - 1, 3).getValues();
      for (var i = 0; i < vals.length; i++) if (vals[i][0] === token && +vals[i][2] > Date.now()) { name = vals[i][1]; c.put('s:' + token, name, 21000); break; }
    }
  }
  if (!name) return null;
  var u = findUser_(ss, name);
  return u && u.active ? u : null;
}
function dropSessions_(ss, username) {
  var sh = ss.getSheetByName('sessions'), n = sh.getLastRow();
  if (n < 2) return;
  var vals = sh.getRange(2, 1, n - 1, 3).getValues(), c = CacheService.getScriptCache(), keepRows = [];
  vals.forEach(function (r) { if (r[1] === username) c.remove('s:' + r[0]); else keepRows.push(r); });
  sh.getRange(2, 1, n - 1, 3).clearContent();
  if (keepRows.length) sh.getRange(2, 1, keepRows.length, 3).setValues(keepRows);
}
function need_(q, role) {
  var ss = ss_(), u = authUser_(ss, q.t);
  if (!u) throw new AuthErr_('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  if (role === 'admin' && u.role !== 'admin') throw new AuthErr_('Chỉ Quản trị mới dùng được chức năng này.', true);
  if (role === 'edit' && u.role !== 'admin' && u.role !== 'editor') throw new AuthErr_('Tài khoản này chỉ được xem, không lưu được.', true);
  return { ss: ss, u: u };
}
function AuthErr_(m, perm) { this.message = m; this.auth = true; this.perm = !!perm; }
AuthErr_.prototype = Object.create(Error.prototype);

/* ---------- đăng nhập ---------- */
function login_(q) {
  var ss = ss_(), name = String(q.u || '').trim().toLowerCase(), cache = CacheService.getScriptCache();
  var fails = +(cache.get('f:' + name) || 0);
  if (fails >= CFG.MAX_FAIL) return { ok: false, err: 'locked', msg: 'Đăng nhập sai quá ' + CFG.MAX_FAIL + ' lần, thử lại sau ' + CFG.LOCK_MIN + ' phút hoặc liên hệ Quản trị.' };
  var u = findUser_(ss, name);
  if (!u) return { ok: false, err: 'nouser', msg: 'Tài khoản không tồn tại, vui lòng liên hệ Quản trị.' };
  if (!u.active) return { ok: false, err: 'inactive', msg: 'Tài khoản đã bị khóa, vui lòng liên hệ Quản trị.' };
  if (hash_(u.salt, String(q.p || '')) !== u.hash) {
    cache.put('f:' + name, String(fails + 1), CFG.LOCK_MIN * 60);
    var left = CFG.MAX_FAIL - fails - 1;
    return { ok: false, err: 'badpass', msg: 'Sai mật khẩu' + (left > 0 ? ' (còn ' + left + ' lần thử).' : '. Tài khoản bị khóa tạm ' + CFG.LOCK_MIN + ' phút.') };
  }
  cache.remove('f:' + name);
  var token = startSession_(ss, u.username, !!q.keep);
  setUserCell_(ss, u.row, 9, new Date().toISOString());
  return { ok: true, token: token, user: pub_(u), ver: ver_(), auto: auto_() };
}
function me_(q) {
  var ss = ss_(), u = authUser_(ss, q.t);
  if (u) return { ok: true, user: pub_(u), ver: ver_(), auto: auto_() };
  // chưa có phiên hợp lệ: chủ script đang đăng nhập Google thì cấp phiên takikj02 luôn
  try {
    var me = Session.getActiveUser().getEmail(), owner = Session.getEffectiveUser().getEmail();
    if (me && owner && me.toLowerCase() === owner.toLowerCase()) {
      var a = findUser_(ss, CFG.ADMIN_USER);
      if (a && a.active) return { ok: true, token: startSession_(ss, a.username, true), user: pub_(a), ver: ver_(), auto: auto_() };
    }
  } catch (e) {}
  return { ok: false, err: 'auth', msg: 'Phiên đăng nhập đã hết hạn.' };
}
function logout_(q) {
  var ss = ss_(), sh = ss.getSheetByName('sessions'), n = sh.getLastRow();
  CacheService.getScriptCache().remove('s:' + q.t);
  if (n >= 2) {
    var vals = sh.getRange(2, 1, n - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) if (vals[i][0] === q.t) { sh.deleteRow(i + 2); break; }
  }
  return { ok: true };
}

/* ---------- quản lý người dùng (chỉ Quản trị) ---------- */
function usersList_(q) { var c = need_(q, 'admin'); return { ok: true, users: users_(c.ss).map(pub_) }; }
function adminCount_(ss, except) { return users_(ss).filter(function (x) { return x.role === 'admin' && x.active && x.username !== except; }).length; }
function userAdd_(q) {
  var c = need_(q, 'admin'), ss = c.ss, sh = ss.getSheetByName('users'), added = [];
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    (q.list || []).forEach(function (x) {
      var name = String(x.username || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(name)) throw new Error('Tên đăng nhập "' + name + '" không hợp lệ (3-30 ký tự, chữ thường, số, . _ -).');
      if (findUser_(ss, name)) throw new Error('Tài khoản ' + name + ' đã có.');
      var role = ['admin', 'editor', 'viewer', 'pc'].indexOf(x.role) >= 0 ? x.role : 'viewer';
      var pass = String(q.pass || '');
      if (pass.length < 4) throw new Error('Mật khẩu cần từ 4 ký tự.');
      var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
      sh.appendRow([name, x.name || name.toUpperCase(), role, salt, hash_(salt, pass), true, false, !!q.must, '', new Date().toISOString()]);
      added.push(name);
    });
  } finally { lock.releaseLock(); }
  return { ok: true, added: added };
}
function userSet_(q) {
  var c = need_(q, 'admin'), ss = c.ss, u = findUser_(ss, q.username);
  if (!u) return { ok: false, msg: 'Không thấy tài khoản.' };
  if (u.root && c.u.username !== u.username) return { ok: false, msg: 'Chỉ chính tài khoản cao nhất mới sửa được tài khoản này.' };
  if (q.role !== undefined) {
    if (u.root) return { ok: false, msg: 'Không đổi quyền tài khoản cao nhất.' };
    if (['admin', 'editor', 'viewer', 'pc'].indexOf(q.role) < 0) return { ok: false, msg: 'Quyền không hợp lệ.' };
    if (u.role === 'admin' && q.role !== 'admin' && adminCount_(ss, u.username) < 1) return { ok: false, msg: 'Phải còn ít nhất một quản trị đang dùng.' };
    setUserCell_(ss, u.row, 3, q.role);
  }
  if (q.active !== undefined) {
    if (u.root) return { ok: false, msg: 'Không khóa tài khoản cao nhất.' };
    if (!q.active && u.role === 'admin' && adminCount_(ss, u.username) < 1) return { ok: false, msg: 'Phải còn ít nhất một quản trị đang dùng.' };
    setUserCell_(ss, u.row, 6, !!q.active);
    if (!q.active) dropSessions_(ss, u.username);
  }
  if (q.must !== undefined) setUserCell_(ss, u.row, 8, !!q.must);
  return { ok: true };
}
function userDel_(q) {
  var c = need_(q, 'admin'), ss = c.ss, u = findUser_(ss, q.username);
  if (!u) return { ok: true };
  if (u.root) return { ok: false, msg: 'Không xóa được tài khoản cao nhất.' };
  if (u.username === c.u.username) return { ok: false, msg: 'Không tự xóa tài khoản của mình.' };
  if (u.role === 'admin' && u.active && adminCount_(ss, u.username) < 1) return { ok: false, msg: 'Không xóa được quản trị cuối cùng.' };
  dropSessions_(ss, u.username);
  ss.getSheetByName('users').deleteRow(u.row);
  return { ok: true };
}
function userPass_(q) {
  var c = need_(q, 'admin'), ss = c.ss, u = findUser_(ss, q.username);
  if (!u) return { ok: false, msg: 'Không thấy tài khoản.' };
  if (u.root && c.u.username !== u.username) return { ok: false, msg: 'Chỉ chính tài khoản cao nhất mới đổi được mật khẩu này.' };
  var p = String(q.pass || '');
  if (p.length < 4) return { ok: false, msg: 'Mật khẩu cần từ 4 ký tự.' };
  var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  setUserCell_(ss, u.row, 4, salt); setUserCell_(ss, u.row, 5, hash_(salt, p));
  if (q.must !== undefined) setUserCell_(ss, u.row, 8, !!q.must);
  if (u.username !== c.u.username) dropSessions_(ss, u.username);
  return { ok: true };
}
function chPass_(q) {
  var c = need_(q), ss = c.ss, u = c.u;
  if (hash_(u.salt, String(q.o || '')) !== u.hash) return { ok: false, msg: 'Mật khẩu hiện tại chưa đúng' };
  var p = String(q.n || '');
  if (p.length < 6) return { ok: false, msg: 'Mật khẩu mới cần từ 6 ký tự' };
  var salt = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  setUserCell_(ss, u.row, 4, salt); setUserCell_(ss, u.row, 5, hash_(salt, p)); setUserCell_(ss, u.row, 8, false);
  return { ok: true };
}

/* ---------- kho dữ liệu dùng chung: mỗi khóa một dòng, nội dung cắt thành nhiều ô ---------- */
function kvIndex_(sh) {
  var n = sh.getLastRow(), idx = {}, maxTs = 0;
  if (n >= 2) sh.getRange(2, 1, n - 1, 3).getValues().forEach(function (r, i) {
    idx[r[0]] = { row: i + 2, ts: +r[1], chunks: +r[2] };
    if (+r[1] > maxTs) maxTs = +r[1];
  });
  return { idx: idx, maxTs: maxTs };
}
/* khóa dữ liệu quyền Phân cấp được đọc/ghi: pcr:* (số của app phân cấp) và pc:NĂM (bảng gửi sang báo cáo thảo luận) */
function pcKey_(k) { return k.indexOf('pcr:') === 0 || /^pc:\d{4}$/.test(k); }
function pull_(q) {
  var c = need_(q), ss = c.ss, sh = ss.getSheetByName('kv'), since = +q.since || 0;
  var ix = kvIndex_(sh), items = [], maxTs = since;
  var pre = q.prefix ? String(q.prefix) : '';
  var isPc = c.u.role === 'pc';
  if (isPc) q.nolog = true;   // quyền Phân cấp chỉ đọc số của app phân cấp
  var keys = Object.keys(ix.idx).filter(function (k) { return ix.idx[k].ts > since && (!pre || k.indexOf(pre) === 0) && (!isPc || pcKey_(k)); }).sort(function (a, b) { return ix.idx[a].ts - ix.idx[b].ts; });
  var budget = 6000000; // khoảng 6 triệu ký tự mỗi lần kéo, phần còn lại kéo lần sau
  var more = false;
  for (var i = 0; i < keys.length; i++) {
    var e = ix.idx[keys[i]], v = null;
    if (e.chunks > 0) {
      var cells = sh.getRange(e.row, 4, 1, e.chunks).getValues()[0];
      v = cells.join('');
    }
    items.push({ k: keys[i], v: v, ts: e.ts });
    maxTs = Math.max(maxTs, e.ts);
    budget -= v ? v.length : 10;
    if (budget < 0 && i < keys.length - 1) { more = true; break; }
  }
  var out = { ok: true, items: items, since: maxTs, more: more, ver: ver_() };
  if (!q.nolog) out.log = logTail_(ss, 300);
  return out;
}
function push_(q) {
  var c = need_(q), ss = c.ss, sh = ss.getSheetByName('kv'), res = {};
  if (c.u.role === 'pc') {   // quyền Phân cấp chỉ ghi được khóa pcr:*
    (q.items || []).forEach(function (it) { if (!pcKey_(String(it.k))) throw new AuthErr_('Quyền Phân cấp không ghi được dữ liệu này.', true); });
  } else need_(q, 'edit');
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var ix = kvIndex_(sh), ts = Math.max(Date.now(), ix.maxTs + 1), last = sh.getLastRow();
    (q.items || []).forEach(function (it) {
      var k = String(it.k), v = it.v, e = ix.idx[k], chunks = [];
      if (v !== null && v !== undefined) for (var p = 0; p < v.length; p += CFG.CHUNK) chunks.push(v.slice(p, p + CFG.CHUNK));
      var width = 3 + chunks.length;
      if (sh.getMaxColumns() < width) sh.insertColumnsAfter(sh.getMaxColumns(), width - sh.getMaxColumns());
      var row;
      if (e) row = e.row; else { row = ++last; if (sh.getMaxRows() < row) sh.insertRowsAfter(sh.getMaxRows(), 200); }
      if (e && e.chunks > chunks.length) sh.getRange(row, 4 + chunks.length, 1, e.chunks - chunks.length).clearContent();
      sh.getRange(row, 1, 1, width).setValues([[k, ts, chunks.length].concat(chunks)]);
      ix.idx[k] = { row: row, ts: ts, chunks: chunks.length };
      res[k] = ts; ts++;
    });
  } finally { lock.releaseLock(); }
  return { ok: true, ts: res };
}

/* ---------- nhật ký ---------- */
function logTail_(ss, n) {
  var sh = ss.getSheetByName('log'), last = sh.getLastRow();
  if (last < 2) return [];
  var from = Math.max(2, last - n + 1), vals = sh.getRange(from, 1, last - from + 1, 4).getValues();
  return vals.reverse().map(function (r) { return { t: r[0], u: r[1], a: r[2], d: r[3] }; });
}
function logAdd_(q) {
  var c = need_(q), sh = c.ss.getSheetByName('log'), e = q.e || {};
  sh.appendRow([String(e.t || new Date().toISOString()), c.u.username, String(e.a || ''), String(e.d || '').slice(0, 500)]);
  var n = sh.getLastRow();
  if (n > CFG.LOG_KEEP + 1000) sh.deleteRows(2, 1000);
  return { ok: true };
}
function logClear_(q) {
  var c = need_(q, 'admin'), sh = c.ss.getSheetByName('log'), n = sh.getLastRow();
  if (n >= 2) sh.deleteRows(2, n - 1);
  return { ok: true };
}

var ROUTES = {
  login: login_, me: me_, logout: logout_,
  users: guard_(usersList_), uAdd: guard_(userAdd_), uSet: guard_(userSet_), uDel: guard_(userDel_), uPass: guard_(userPass_), chpass: guard_(chPass_),
  stat: guard_(stat_), fList: guard_(fList_), fPut: guard_(fPut_), fGet: guard_(fGet_), fDel: guard_(fDel_),
  pull: guard_(pull_), push: guard_(push_), log: guard_(logAdd_), logClear: guard_(logClear_), bump: guard_(bump_), autoSet: guard_(autoSet_)
};
function guard_(fn) {
  return function (q) {
    try { return fn(q); }
    catch (e) { if (e && e.auth) return { ok: false, err: e.perm ? 'perm' : 'auth', msg: e.message }; return { ok: false, err: 'server', msg: e.message }; }
  };
}


/* ---------- kho tệp Drive: thư mục "APP TAI CHINH - LUU" (không dành cho quyền pc) ---------- */
function noPc_(q, edit) {
  var c = need_(q, edit ? 'edit' : '');
  if (c.u.role === 'pc') throw new AuthErr_('Tài khoản này không dùng được kho tệp.', true);
  return c;
}
function storeDir_() {
  var PN = 'phiên bản báo cáo', NAME = 'tệp app tài chính';
  var pi = DriveApp.getFoldersByName(PN), par = pi.hasNext() ? pi.next() : DriveApp.createFolder(PN);
  var it = par.getFoldersByName(NAME);
  return it.hasNext() ? it.next() : par.createFolder(NAME);
}
function stat_(q) {
  noPc_(q, false);
  return { ok: true, driveUsed: DriveApp.getStorageUsed(), driveLimit: DriveApp.getStorageLimit() };
}
function fList_(q) {
  noPc_(q, false);
  var it = storeDir_().getFiles(), out = [];
  while (it.hasNext()) { var f = it.next(); out.push({ id: f.getId(), name: f.getName(), size: f.getSize(), mtime: f.getLastUpdated().getTime() }); }
  out.sort(function (a, b) { return b.mtime - a.mtime; });
  return { ok: true, files: out };
}
function fPut_(q) {
  noPc_(q, true);
  var name = String(q.name || '').trim();
  if (!name) return { ok: false, msg: 'Thiếu tên tệp.' };
  if (!q.b64) return { ok: false, msg: 'Tệp trống, không có nội dung để lưu.' };
  if (String(q.b64).length > 7000000) return { ok: false, msg: 'Tệp quá lớn (tối đa khoảng 5 MB mỗi lần lưu).' };
  var mime = q.mime || 'application/octet-stream';
  var blob = Utilities.newBlob(Utilities.base64Decode(q.b64), mime, name);
  var dir = storeDir_(), it = dir.getFilesByName(name), replaced = false, f;
  if (it.hasNext()) { f = Drive_replace_(it.next(), blob); replaced = true; }
  else f = dir.createFile(blob);
  return { ok: true, id: f.getId(), size: f.getSize(), replaced: replaced };
}
function Drive_replace_(f, blob) {
  /* ghi đè: tạo tệp mới cùng tên rồi bỏ tệp cũ vào thùng rác (giữ thư mục, đổi id) */
  var dir = f.getParents().next();
  f.setTrashed(true);
  return dir.createFile(blob);
}
function fGet_(q) {
  noPc_(q, false);
  var f;
  try { f = DriveApp.getFileById(String(q.id || '')); } catch (e) { return { ok: false, msg: 'Không tìm thấy tệp.' }; }
  var dir = storeDir_(), ok = false, ps = f.getParents();
  while (ps.hasNext()) if (ps.next().getId() === dir.getId()) ok = true;
  if (!ok) return { ok: false, msg: 'Tệp không nằm trong kho lưu của ứng dụng.' };
  var b = f.getBlob();
  return { ok: true, name: f.getName(), mime: b.getContentType(), b64: Utilities.base64Encode(b.getBytes()) };
}
function fDel_(q) {
  noPc_(q, true);
  var f;
  try { f = DriveApp.getFileById(String(q.id || '')); } catch (e) { return { ok: false, msg: 'Không tìm thấy tệp.' }; }
  var dir = storeDir_(), ok = false, ps = f.getParents();
  while (ps.hasNext()) if (ps.next().getId() === dir.getId()) ok = true;
  if (!ok) return { ok: false, msg: 'Tệp không nằm trong kho lưu của ứng dụng.' };
  f.setTrashed(true);
  return { ok: true };
}

/* chạy tay trong trình soạn để Google hỏi cấp quyền ghi Drive cho kho tệp (tạo thư mục nếu chưa có) */
function kiemQuyenDrive() {
  var d = storeDir_();
  Logger.log('Thư mục lưu: ' + d.getName() + ' | đã dùng ' + DriveApp.getStorageUsed() + ' byte');
}
