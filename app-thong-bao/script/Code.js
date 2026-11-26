/**
 * APP THÔNG BÁO · script riêng của tài khoản takikj02
 * Đưa quyết định UBND tỉnh (PDF hoặc Word) vào, app soạn thông báo của Sở Tài chính theo mẫu,
 * cho xem trước, sửa trực tiếp, xuất Word (tải về máy) và chỉ lưu Drive khi bấm "Lưu vào Drive".
 *
 * Việc đọc quyết định, soạn Word, Excel và kiểm tra số đều chạy trong trình duyệt (không gọi AI, không tốn token).
 * Máy chủ chỉ làm 3 việc: đăng nhập, gửi mẫu Word/Excel và danh mục 96 xã phường, lưu tệp vào Drive khi được bấm.
 *
 * Tài khoản: lần đầu mở link, người mở tạo tài khoản quản trị (tên đăng nhập, mật khẩu).
 * Quản trị thêm, xoá tài khoản khác trong thẻ "Tài khoản". Mật khẩu chỉ lưu dạng băm.
 * Thư mục Drive "APP THONG BAO/thong-bao-luu" tự tạo lần đầu bấm "Lưu vào Drive".
 */
var TB = {
  ROOT_NAME: 'APP THONG BAO',
  SAVE_NAME: 'thong-bao-luu',
  SESSION_DAYS: 30
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('app-thong-bao')
    .setTitle('App Thông báo')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/* Mọi yêu cầu từ trang đi qua đây: nhận chuỗi JSON, trả chuỗi JSON. */
function api(q) {
  var o;
  try { o = JSON.parse(q); } catch (e) { return out_({ ok: false, msg: 'Yêu cầu không đọc được.' }); }
  try {
    switch (o.a) {
      case 'trangThai': return out_({ ok: true, coTaiKhoan: Object.keys(users_()).length > 0, ver: ver_() });
      case 'taoQuanTri': return out_(taoQuanTri_(o));
      case 'dangNhap': return out_(dangNhap_(o));
    }
    var u = authUser_(o.tok);
    if (!u) return out_({ ok: false, err: 'auth', msg: 'Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.' });
    switch (o.a) {
      case 'me': return out_({ ok: true, user: u, ver: ver_() });
      case 'mau': return out_(mau_());
      case 'luu': return out_(luu_(o, u));
      case 'dsTaiKhoan': return out_(dsTaiKhoan_(u));
      case 'themTaiKhoan': return out_(themTaiKhoan_(o, u));
      case 'xoaTaiKhoan': return out_(xoaTaiKhoan_(o, u));
      case 'doiMatKhau': return out_(doiMatKhau_(o, u));
      default: return out_({ ok: false, msg: 'Không rõ yêu cầu: ' + o.a });
    }
  } catch (e) {
    return out_({ ok: false, err: 'server', msg: 'Lỗi máy chủ: ' + (e && e.message ? e.message : e) });
  }
}

/* ---------- mẫu và danh mục ---------- */
function mau_() {
  if (typeof MAU_DATA === 'undefined') return { ok: false, msg: 'Thiếu tệp mẫu trong dự án script (mau-data.js).' };
  return { ok: true, files: MAU_DATA.files, danhMuc: MAU_DATA.danhMuc, ngayMau: MAU_DATA.ngay };
}

/* ---------- lưu vào Drive: chỉ khi người dùng bấm ---------- */
function luu_(o, u) {
  var name = String(o.name || 'thong-bao.docx').replace(/[\\\/:*?"<>|]/g, ' ').slice(0, 150);
  var mime = /\.xlsx$/i.test(name) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var blob = Utilities.newBlob(Utilities.base64Decode(o.b64 || ''), mime, name);
  var folder = saveFolder_(), f = folder.createFile(blob);
  f.setDescription('Lưu từ App Thông báo bởi ' + u.username + ' lúc ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'HH:mm dd/MM/yyyy'));
  return { ok: true, url: f.getUrl(), folder: folder.getUrl(), name: name };
}
function saveFolder_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('SAVE_FOLDER');
  if (id) try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {}
  var root = folderByName_(DriveApp.getRootFolder(), TB.ROOT_NAME), sub = folderByName_(root, TB.SAVE_NAME);
  p.setProperty('SAVE_FOLDER', sub.getId());
  return sub;
}
function folderByName_(parent, name) {
  var it = parent.getFoldersByName(name);
  while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) return f; }
  return parent.createFolder(name);
}

/* ---------- tài khoản ---------- */
function users_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('USERS') || '{}'); } catch (e) { return {}; }
}
function saveUsers_(u) { PropertiesService.getScriptProperties().setProperty('USERS', JSON.stringify(u)); }
function secret_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRET', s); }
  return s;
}
function hash_(pw, salt) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pw, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(b);
}
function normName_(s) { return String(s || '').trim().toLowerCase(); }
function checkPw_(pw) { if (String(pw || '').length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự.'); }
function taoQuanTri_(o) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var us = users_();
    if (Object.keys(us).length) return { ok: false, msg: 'App đã có tài khoản quản trị. Bạn đăng nhập nhé.' };
    var name = normName_(o.username);
    if (!/^[a-z0-9._-]{3,30}$/.test(name)) return { ok: false, msg: 'Tên đăng nhập 3 đến 30 ký tự, chỉ chữ không dấu, số, dấu chấm, gạch.' };
    checkPw_(o.password);
    var salt = Utilities.getUuid();
    us[name] = { salt: salt, hash: hash_(o.password, salt), role: 'admin', ten: String(o.ten || name).slice(0, 60), tao: Date.now() };
    saveUsers_(us);
    return { ok: true, tok: token_(name), user: pub_(name, us[name]) };
  } finally { lock.releaseLock(); }
}
function dangNhap_(o) {
  var us = users_(), name = normName_(o.username), u = us[name];
  if (!u || u.hash !== hash_(String(o.password || ''), u.salt)) {
    Utilities.sleep(600);
    return { ok: false, msg: 'Sai tên đăng nhập hoặc mật khẩu.' };
  }
  return { ok: true, tok: token_(name), user: pub_(name, u) };
}
function token_(name) {
  var exp = Date.now() + TB.SESSION_DAYS * 86400000, body = name + '|' + exp;
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, secret_()));
  return Utilities.base64EncodeWebSafe(body) + '.' + sig;
}
function authUser_(tok) {
  if (!tok) return null;
  var parts = String(tok).split('.');
  if (parts.length !== 2) return null;
  var body;
  try { body = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString(); } catch (e) { return null; }
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(body, secret_()));
  if (sig !== parts[1]) return null;
  var bits = body.split('|');
  if (+bits[1] < Date.now()) return null;
  var us = users_(), u = us[bits[0]];
  return u ? pub_(bits[0], u) : null;
}
function pub_(name, u) { return { username: name, ten: u.ten || name, role: u.role }; }
function dsTaiKhoan_(me) {
  if (me.role !== 'admin') return { ok: false, msg: 'Chỉ quản trị xem được danh sách tài khoản.' };
  var us = users_();
  return { ok: true, ds: Object.keys(us).map(function (k) { return pub_(k, us[k]); }) };
}
function themTaiKhoan_(o, me) {
  if (me.role !== 'admin') return { ok: false, msg: 'Chỉ quản trị thêm được tài khoản.' };
  var name = normName_(o.username);
  if (!/^[a-z0-9._-]{3,30}$/.test(name)) return { ok: false, msg: 'Tên đăng nhập 3 đến 30 ký tự, chỉ chữ không dấu, số, dấu chấm, gạch.' };
  checkPw_(o.password);
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var us = users_();
    if (us[name]) return { ok: false, msg: 'Tên đăng nhập này đã có.' };
    var salt = Utilities.getUuid();
    us[name] = { salt: salt, hash: hash_(o.password, salt), role: o.role === 'admin' ? 'admin' : 'user', ten: String(o.ten || name).slice(0, 60), tao: Date.now() };
    saveUsers_(us);
    return dsTaiKhoan_(me);
  } finally { lock.releaseLock(); }
}
function xoaTaiKhoan_(o, me) {
  if (me.role !== 'admin') return { ok: false, msg: 'Chỉ quản trị xoá được tài khoản.' };
  var name = normName_(o.username);
  if (name === me.username) return { ok: false, msg: 'Không tự xoá tài khoản đang dùng.' };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try { var us = users_(); delete us[name]; saveUsers_(us); return dsTaiKhoan_(me); } finally { lock.releaseLock(); }
}
function doiMatKhau_(o, me) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var us = users_(), u = us[me.username];
    if (!u || u.hash !== hash_(String(o.cu || ''), u.salt)) return { ok: false, msg: 'Mật khẩu cũ chưa đúng.' };
    checkPw_(o.moi);
    u.salt = Utilities.getUuid(); u.hash = hash_(o.moi, u.salt); saveUsers_(us);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ---------- tiện ích ---------- */
function ver_() { return String((typeof BUILD_TS !== 'undefined') ? BUILD_TS : 0); }
function out_(o) { return JSON.stringify(o); }
