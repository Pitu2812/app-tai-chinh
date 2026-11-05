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
  KEYS: /^pcr:(PA|B2)$/
};

function doGet() {
  const f = htmlFile_();
  if (!f) return HtmlService.createHtmlOutput('<p style="font:16px system-ui,sans-serif;padding:24px">Chưa có tệp ' + CFG.HTML + ' trong thư mục APP TY LE PHAN CAP trên Drive.</p>');
  return HtmlService.createHtmlOutput(f.getBlob().getDataAsString('UTF-8'))
    .setTitle('App tỷ lệ phân cấp')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* Mọi yêu cầu từ trang đi qua đây: nhận chuỗi JSON, trả chuỗi JSON. */
function api(q) {
  let o;
  try { o = JSON.parse(q); } catch (e) { return out_({ ok: false, msg: 'Yêu cầu không đọc được.' }); }
  const email = (Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (email && email !== CFG.OWNER) return out_({ ok: false, err: 'auth', msg: 'Tài khoản ' + email + ' không được vào app này. Đăng nhập Google bằng ' + CFG.OWNER + '.' });
  try {
    switch (o.a) {
      case 'me': return out_({ ok: true, user: { email: email || CFG.OWNER, username: email || CFG.OWNER, role: 'admin' }, ver: ver_(), info: info_(), kk: kkMeta_() });
      case 'push': return out_(push_(o.items || []));
      case 'pull': return out_(pull_(+o.since || 0));
      case 'kk01': return out_(kk01_(o));
      case 'save': return out_(save_(o));
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
  const f = htmlFile_(), nv = f ? String(f.getLastUpdated().getTime()) : '0';
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
