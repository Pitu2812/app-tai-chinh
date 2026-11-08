/**
 * APP TỶ LỆ PHÂN CẤP · script riêng của tài khoản takikj02
 * Tách hẳn khỏi App tài chính: không dùng chung đăng nhập, không ghi vào sheet "APP TAI CHINH - DU LIEU".
 *
 * Thư mục Drive "APP TY LE PHAN CAP":
 *   app-ty-le-phan-cap.html   giao diện app (cập nhật app: tải bản mới lên, cùng tên; link web app không đổi)
 *   du-lieu-dong-bo/          pcr_PA.json (các phương án), pcr_B2.json (biểu thuế nạp thêm). Drive tự giữ lịch sử phiên bản.
 *   gui-KK01/                 so-lieu-gui-KK01-2027.json: số ƯTH 2026, DT 2027 của 96 xã theo PHƯƠNG ÁN MẶC ĐỊNH, tự cập nhật
 *   bao-cao-xuat/             các tệp excel xuất từ app
 *
 * Triển khai: Triển khai > Tùy chọn triển khai mới > Ứng dụng web; Thực thi với tư cách: Tôi; Người có quyền truy cập: Chỉ mình tôi.
 */
const CFG = {
  OWNER: 'takikj02@gmail.com',
  ROOT: '110_oEkHducjVei_t_5mjH8wB6uyOqcfl',
  DATA: '1kSKN1xLQOD-kGd-Zy4crUVisvx85wAIS',
  KK01: '19l_e5Mv3-4e40yOt9d23GXDqsT36UpUN',
  XUAT: '19Pya60GwVGgu8lSTRUpjpyXHjQPwZAqs',
  HTML: 'app-ty-le-phan-cap.html',
  KK_FILE: 'so-lieu-gui-KK01-2027.json',
  KEYS: /^pcr:(PA|B2)$/,
  TC_URL: 'https://script.google.com/macros/s/AKfycbxoUmOzXZFN1EXGTfe7SsriHl2zpQfXVndLwqQeZKBmjMS28BYe2GsVS9sdklrcG6P5/exec',   // app tài chính: nơi cấp tài khoản dùng chung
  ROLES_OK: { admin: 1, pc: 1 }
};

/* web nằm ngay trong dự án script (robot GitHub sinh web-data.js, mã hoá base64): ưu tiên dùng, không có thì đọc tệp trên Drive */
function embedded_() {
  try {
    const raw = HtmlService.createTemplateFromFile('w64_app_ty_le').getRawContent();
    if (raw) return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(raw.trim()), 'application/x-gzip')).getDataAsString('UTF-8');
  } catch (e) {}
  try {
    const p = (typeof WEB_PARTS !== 'undefined') ? WEB_PARTS.app_ty_le : null;
    if (p && p.length) return Utilities.newBlob(Utilities.base64Decode(p.join(''))).getDataAsString('UTF-8');
  } catch (e) {}
  return null;
}
function appHtml_() {
  const emb = embedded_();
  if (emb) return emb;
  const f = htmlFile_();
  if (!f) throw new Error('Chưa có tệp ' + CFG.HTML + ' trong thư mục APP TY LE PHAN CAP trên Drive.');
  return f.getBlob().getDataAsString('UTF-8');
}
/* trang chỉ chứa màn đăng nhập; nội dung app (có số liệu) chỉ được trả sau khi máy chủ xác nhận tài khoản */
function doGet(e) {
  const k = (e && e.parameter && e.parameter.k) || '';
  const t = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui,sans-serif;padding:24px;max-width:420px;margin:0 auto">' +
    '<p id="m">Đang kiểm tra đăng nhập…</p><form id="f" style="display:none"><p><b>Đăng nhập app tỷ lệ phân cấp</b><br><small>Dùng tài khoản app tài chính có quyền Phân cấp hoặc Quản trị.</small></p>' +
    '<p><input id="u" placeholder="Tài khoản" autocomplete="username" style="width:100%;padding:10px;box-sizing:border-box"></p>' +
    '<p><input id="p" type="password" placeholder="Mật khẩu" autocomplete="current-password" style="width:100%;padding:10px;box-sizing:border-box"></p>' +
    '<p><button style="width:100%;padding:12px;font-weight:700">Đăng nhập</button></p><p id="e" style="color:#b3392f"></p></form><script>' +
    'var K=' + JSON.stringify(k) + ',T="";try{T=localStorage.getItem("pcr_tok")||""}catch(x){}' +
    'function go(u,p){var m=document.getElementById("m");m.style.display="block";document.getElementById("f").style.display="none";' +
    'google.script.run.withSuccessHandler(function(r){if(r&&r.ok){try{if(r.token)localStorage.setItem("pcr_tok",r.token)}catch(x){}window.PCR_TOK=r.token||T;document.open();document.write(r.html);document.close()}' +
    'else{try{localStorage.removeItem("pcr_tok")}catch(x){}m.style.display="none";document.getElementById("f").style.display="block";document.getElementById("e").textContent=(u||p||K)&&r&&r.msg?r.msg:""}})' +
    '.withFailureHandler(function(x){m.textContent="Không tải được: "+x.message}).getApp(T,K,u||"",p||"");K=""}' +
    'document.getElementById("f").onsubmit=function(ev){ev.preventDefault();go(document.getElementById("u").value,document.getElementById("p").value)};go("","")<\/script>';
  return HtmlService.createHtmlOutput(t).setTitle('App tỷ lệ phân cấp').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function getApp(t, k, u, p) {
  let tok = t || '', user = null;
  if (isOwner_()) user = { username: CFG.OWNER, name: CFG.OWNER, role: 'admin' };
  else if (k) { const r = tc_({ a: 'sso_redeem', k: k }); if (r.ok) { tok = r.token; user = r.user; } }
  else if (u) {
    const r = tc_({ a: 'sso_login', u: u, p: p });
    if (!r.ok) return { ok: false, msg: r.msg || 'Đăng nhập chưa được.' };
    tok = r.token; user = r.user;
  } else user = who_(tok);
  if (!user) return { ok: false, msg: '' };
  if (!CFG.ROLES_OK[user.role]) return { ok: false, msg: 'Tài khoản này chưa được cấp quyền Phân cấp hoặc Quản trị.' };
  if (!isOwner_()) remember_(tok, user);
  let html = appHtml_();
  /* trang gửi kèm mã phiên ở mỗi lệnh gọi máy chủ */
  html = html.replace('JSON.stringify(Object.assign({a},p||{}))', 'JSON.stringify(Object.assign({a},p||{},{t:pcrTok_()}))');
  const sTok = isOwner_() ? '' : tok;
  const inj = '<script>window.PCR_TOK=' + JSON.stringify(sTok) + ';function pcrTok_(){var t=window.PCR_TOK||"";if(!t){try{t=localStorage.getItem("pcr_tok")||""}catch(e){}}return t}<\/script>';
  html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, function (m) { return m + inj; }) : inj + html;
  return { ok: true, html: html, token: isOwner_() ? '' : tok };
}

/* ---------- đăng nhập: chủ script (takikj02) vào thẳng bằng Google; người khác dùng tài khoản app tài chính (quyền Quản trị hoặc Phân cấp) ---------- */
function tc_(body) {
  const url = PropertiesService.getScriptProperties().getProperty('TC_URL') || CFG.TC_URL;
  const r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true, followRedirects: true });
  try { return JSON.parse(r.getContentText()); } catch (e) { return { ok: false, err: 'net', msg: 'App tài chính không trả lời, thử lại sau.' }; }
}
function isOwner_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  return !!email && email === CFG.OWNER;
}
function tokKey_(t) { return 'a:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t)); }
function remember_(t, user) { if (t && user) CacheService.getScriptCache().put(tokKey_(t), JSON.stringify(user), 300); }
function who_(t) {
  if (isOwner_()) return { username: CFG.OWNER, name: CFG.OWNER, role: 'admin' };
  if (!t) return null;
  const c = CacheService.getScriptCache(), k = tokKey_(t);
  const hit = c.get(k);
  if (hit) return JSON.parse(hit);
  const r = tc_({ a: 'sso_who', t: t });
  if (!r || !r.ok || !r.user || !CFG.ROLES_OK[r.user.role]) return null;
  c.put(k, JSON.stringify(r.user), 300);
  return r.user;
}

/* Mọi yêu cầu từ trang đi qua đây: nhận chuỗi JSON, trả chuỗi JSON. */
function api(q) {
  let o;
  try { o = JSON.parse(q); } catch (e) { return out_({ ok: false, msg: 'Yêu cầu không đọc được.' }); }
  if (o.a === 'login') {
    const r = tc_({ a: 'sso_login', u: o.u, p: o.p });
    if (!r.ok) return out_(r);
    if (!r.user || !CFG.ROLES_OK[r.user.role]) return out_({ ok: false, err: 'perm', msg: 'Tài khoản này chưa được cấp quyền Phân cấp hoặc Quản trị.' });
    remember_(r.token, r.user);
    return out_({ ok: true, token: r.token, user: r.user });
  }
  if (o.a === 'redeem') {
    const r = tc_({ a: 'sso_redeem', k: o.k });
    if (!r.ok || !r.user || !CFG.ROLES_OK[r.user.role]) return out_({ ok: false, err: 'auth', msg: 'Liên kết đã hết hạn, mở lại từ app tài chính.' });
    return out_({ ok: true, token: r.token, user: r.user });
  }
  const me0 = who_(o.t);
  if (!me0) return out_({ ok: false, err: 'auth', msg: 'Cần đăng nhập bằng tài khoản app tài chính (quyền Phân cấp) hoặc Google takikj02.' });
  const email = me0.username;
  try {
    switch (o.a) {
      case 'me': return out_({ ok: true, user: { email: email, username: email, name: me0.name || email, role: me0.role }, ver: ver_(), info: info_(), kk: kkMeta_() });
      case 'push': return out_(push_(o.items || []));
      case 'pull': return out_(pull_(+o.since || 0));
      case 'kk01': return out_(kk01_(o));
      case 'save': return out_(save_(o));
      case 'gspa': {   // H duyệt 01:49 09/11/2026: đẩy số phương án sang Google Sheet (một chiều)
        const r = GSPA.dung(o.data, { folderId: CFG.XUAT });
        return out_({ ok: true, url: r.url, moi: !!r.moi });
      }
      default: return out_({ ok: false, msg: 'Không rõ yêu cầu: ' + o.a });
    }
  } catch (e) {
    return out_({ ok: false, err: 'server', msg: 'Lỗi máy chủ: ' + (e && e.message ? e.message : e) });
  }
}

/* ---------- đồng bộ phương án, biểu nạp thêm ---------- */
function push_(items) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const idx = idx_(), folder = DriveApp.getFolderById(CFG.DATA);
    items.forEach(function (it) {
      if (!it || !CFG.KEYS.test(it.k)) return;
      const ts = Date.now(), cur = idx[it.k] || {};
      if (it.v == null) {
        if (cur.id) try { DriveApp.getFileById(cur.id).setTrashed(true); } catch (e) {}
        idx[it.k] = { id: null, ts: ts, del: true };
        return;
      }
      let f = null;
      if (cur.id) try { f = DriveApp.getFileById(cur.id); if (f.isTrashed()) f = null; } catch (e) { f = null; }
      if (f) f.setContent(String(it.v));
      else f = folder.createFile(it.k.replace(':', '_') + '.json', String(it.v), 'application/json');
      idx[it.k] = { id: f.getId(), ts: ts };
    });
    saveIdx_(idx);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function pull_(since) {
  const now = Date.now(), idx = idx_(), items = [];
  Object.keys(idx).forEach(function (k) {
    const e = idx[k];
    if (!since || e.ts >= since) {
      let v = null;
      if (!e.del && e.id) try { v = DriveApp.getFileById(e.id).getBlob().getDataAsString('UTF-8'); } catch (err) { v = null; }
      if (v != null || e.del) items.push({ k: k, v: v, ts: e.ts });
    }
  });
  return { ok: true, items: items, since: now, more: false, ver: ver_(), kk: kkMeta_() };
}

/* ---------- số gửi KK01: theo phương án mặc định ---------- */
function kk01_(o) {
  if (!o.v) return { ok: false, msg: 'Thiếu số liệu gửi KK01.' };
  JSON.parse(o.v); // kiểm tra đúng JSON trước khi ghi
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const folder = DriveApp.getFolderById(CFG.KK01);
    const it = folder.getFilesByName(CFG.KK_FILE);
    const f = it.hasNext() ? it.next() : null;
    let file;
    if (f) { f.setContent(o.v); file = f; }
    else file = folder.createFile(CFG.KK_FILE, o.v, 'application/json');
    const meta = { pa: o.pa || '', ma: o.ma || '', ts: Date.now(), url: file.getUrl(), id: file.getId() };
    PropertiesService.getScriptProperties().setProperty('kk', JSON.stringify(meta));
    return { ok: true, url: meta.url, id: meta.id };
  } finally { lock.releaseLock(); }
}

/* Hàm mẫu cho App tài chính (KK01) đọc số: dán vào Code.gs của App tài chính, gọi khi mở bảng thảo luận dự toán.
   Cả hai script cùng chủ takikj02 nên đọc được trực tiếp, không cần chia sẻ.
   function docSoPhanCap2027() {
     const it = DriveApp.getFolderById('19l_e5Mv3-4e40yOt9d23GXDqsT36UpUN').getFilesByName('so-lieu-gui-KK01-2027.json');
     return it.hasNext() ? it.next().getBlob().getDataAsString('UTF-8') : null;   // cùng định dạng khóa pc:2027 cũ
   }
*/

/* ---------- lưu tệp excel xuất từ app ---------- */
function save_(o) {
  const name = String(o.name || 'xuat-tu-app.xlsx').replace(/[\\\/:*?"<>|]/g, ' ').slice(0, 150);
  const mime = /\.json$/i.test(name) ? 'application/json' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const blob = Utilities.newBlob(Utilities.base64Decode(o.b64 || ''), mime, name);
  const folder = DriveApp.getFolderById(CFG.XUAT), f = folder.createFile(blob);
  return { ok: true, url: f.getUrl(), folder: folder.getUrl(), name: name };
}

/* ---------- tiện ích ---------- */
function htmlFile_() {
  const it = DriveApp.getFolderById(CFG.ROOT).getFilesByName(CFG.HTML);
  let best = null;
  while (it.hasNext()) { const f = it.next(); if (f.isTrashed()) continue; if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f; }
  return best;
}
function ver_() {
  const c = CacheService.getScriptCache(), v = c.get('ver');
  if (v) return v;
  const f = htmlFile_(), nv = String(Math.max(f ? f.getLastUpdated().getTime() : 0, (typeof BUILD_TS !== 'undefined') ? +BUILD_TS : 0));
  c.put('ver', nv, 60);
  return nv;
}
function info_() { return { root: 'https://drive.google.com/drive/folders/' + CFG.ROOT, xuat: 'https://drive.google.com/drive/folders/' + CFG.XUAT, kk01: 'https://drive.google.com/drive/folders/' + CFG.KK01 }; }
function kkMeta_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('kk') || 'null'); } catch (e) { return null; } }
function idx_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('idx') || '{}'); } catch (e) { return {}; } }
function saveIdx_(idx) { PropertiesService.getScriptProperties().setProperty('idx', JSON.stringify(idx)); }
function out_(o) { return JSON.stringify(o); }

/* Chạy một lần trong trình soạn thảo để cấp quyền và kiểm tra thư mục. */
function kiemTra() {
  const f = htmlFile_();
  Logger.log('Tài khoản: ' + Session.getEffectiveUser().getEmail());
  Logger.log('Thư mục gốc: ' + DriveApp.getFolderById(CFG.ROOT).getName());
  Logger.log('Tệp app: ' + (f ? f.getName() + ' · ' + f.getSize() + ' byte · ' + f.getLastUpdated() : 'CHƯA CÓ'));
  Logger.log('Chỉ mục dữ liệu: ' + JSON.stringify(idx_()));
}

/* chạy MỘT LẦN trong trình soạn thảo bằng takikj02 để cấp quyền kết nối app tài chính (UrlFetchApp); sau đó ai đăng nhập bằng tài khoản app tài chính cũng dùng được */
/* Chạy một lần trong trình soạn script (tài khoản takikj02) để Google hỏi quyền Bảng tính cho nút Google Sheet */
function capQuyenSheet() {
  const id = PropertiesService.getScriptProperties().getProperty('GSPA_ID');
  Logger.log('Quyền Bảng tính: ' + (id ? SpreadsheetApp.openById(id).getName() : SpreadsheetApp.getActiveSpreadsheet() === null ? 'đã có quyền' : 'đã có quyền'));
}
function capQuyen() {
  const r = tc_({ a: 'sso_who', t: 'kiem-tra' });
  Logger.log('Kết nối app tài chính: ' + JSON.stringify(r) + ' (err=auth nghĩa là thông, đã có quyền)');
  return r;
}
