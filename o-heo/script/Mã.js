/**
 * Ổ HEO · app nhắn tin và theo dõi việc · script riêng của tài khoản takikj02
 * Không dùng chung đăng nhập, không ghi vào dữ liệu của App tài chính hay App tỷ lệ.
 *
 * Cài lần đầu (trong trình soạn script, chạy bằng takikj02):
 *   1. (không bắt buộc) Cài đặt dự án > Thuộc tính tập lệnh: THU_MUC_CHA = ID thư mục cha trên Drive
 *      (thư mục "01 CHUNG - Công việc cơ quan": 18UwO26VS6dFHE8RiMIr_RbmSMnNCETKo). Có thư mục cha thì
 *      thư mục app tên "10 Ổ Heo"; bỏ trống thì tên "Ổ Heo" ở thư mục gốc Drive.
 *   2. Chạy hàm caiDat: tạo thư mục "Ổ Heo", Google Sheet dữ liệu, tài khoản quản trị takikj02.
 *      Mật khẩu tạm của takikj02 hiện ở Nhật ký thực thi; đăng nhập lần đầu phải đổi.
 *   3. Chạy hàm capQuyen (tệp CapQuyen.js) một lần để cấp quyền gửi tệp lớn.
 *   4. Triển khai > Ứng dụng web; Thực thi với tư cách: Tôi; Người có quyền truy cập: Bất kỳ ai.
 *      (Ai cũng mở được link, nhưng phải có tài khoản do quản trị cấp mới vào được.)
 *
 * Thư mục Drive:
 *   Ổ Heo/
 *     Ổ Heo - Dữ liệu chính   Google Sheet: NguoiDung, Phien, HoiThoai, TinNhan, Viec, Tep, DaDoc, CaiDat
 *     01 Tệp gửi kèm/NĂM/THÁNG-NĂM/<Nhóm ... | Riêng - A và B>/  tên tệp: năm-tháng-ngày_giờ_người gửi_tên gốc
 *     02 Lưu trữ tin nhắn/   mỗi tháng một Google Sheet "Tin nhắn MM-YYYY"
 *     03 Avatar/             để dành (avatar hiện là heo dựng sẵn)
 *     04 Sao lưu/            bản sao Google Sheet, mỗi 7 ngày, giữ 8 bản
 *     05 Xuất báo cáo/       Excel thống kê khi bấm Xuất
 */

const OH = {
  TEN_APP: 'Ổ Heo',
  QUAN_TRI: 'takikj02',
  THU_MUC: ['01 Tệp gửi kèm', '02 Lưu trữ tin nhắn', '03 Avatar', '04 Sao lưu', '05 Xuất báo cáo'],
  TEP_TOI_DA: 1024 * 1024 * 1024 - 1,      // dưới 1 GB
  TEP_LINK: 50 * 1024 * 1024,              // từ 50 MB mở bằng link Drive
  PHAN: 4 * 1024 * 1024,                   // mỗi phần gửi lên 4 MB (bội số 256 KB)
  PHAN_TAI: 8 * 1024 * 1024,               // mỗi phần tải về 8 MB
  PHIEN_NHO: 30 * 864e5,                   // ghi nhớ đăng nhập 30 ngày
  PHIEN_NGAN: 12 * 36e5,                   // không ghi nhớ: 12 giờ
  BAM_LAP: 300,
  SAO_LUU_NGAY: 7, SAO_LUU_GIU: 8,
  COT: {
    NguoiDung: ['ten_dn', 'ho_ten', 'vai_tro', 'muoi', 'bam', 'avatar', 'trang_thai', 'doi_mk', 'tao_luc', 'dang_nhap_cuoi', 'hoat_dong'],
    Phien: ['bam_token', 'ten_dn', 'het_han', 'tao_luc'],
    HoiThoai: ['id', 'loai', 'ten', 'thanh_vien', 'tao_boi', 'tao_luc', 'thu_muc_id'],
    TinNhan: ['id', 'hoi_thoai', 'nguoi_gui', 'noi_dung', 'loai', 'tep_id', 'luc'],
    Viec: ['id', 'tieu_de', 'nguoi_giao', 'nguoi_nhan', 'hoi_thoai', 'tin_id', 'han', 'uu_tien', 'cot', 'tao_luc', 'xong_luc', 'sua_luc'],
    Tep: ['id', 'hoi_thoai', 'ten', 'mime', 'kich_thuoc', 'drive_id', 'nguoi_gui', 'luc', 'link'],
    DaDoc: ['ten_dn', 'hoi_thoai', 'tin_id', 'an_den'],
    CaiDat: ['khoa', 'gia_tri']
  },
  SO: { het_han: 1, tao_luc: 1, dang_nhap_cuoi: 1, hoat_dong: 1, luc: 1, xong_luc: 1, sua_luc: 1, id: 1, tin_id: 1, han: 1, kich_thuoc: 1, an_den: 1 },
  UU_TIEN: ['hi', 'imp', 'mid', 'lo'],
  COT_VIEC: ['todo', 'doing', 'done'],
  AVATAR: ['none', 'bow', 'hat', 'bunny', 'bee', 'scarf']
};

/* ---------------- giao diện ---------------- */
/* robot GitHub chép o-heo/web/index.html vào dự án script thành tệp "index" */
function doGet() {
  let out;
  try { out = HtmlService.createHtmlOutputFromFile('index'); }
  catch (e) { out = HtmlService.createHtmlOutput('<p style="font:16px system-ui,sans-serif;padding:24px">Chưa có giao diện. Nhờ robot GitHub đẩy mã lên lại.</p>'); }
  return out.setTitle(OH.TEN_APP)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}

/* ---------------- cài đặt ---------------- */
function caiDat() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SS_ID')) { Logger.log('Đã cài rồi. Sheet dữ liệu: ' + props.getProperty('SS_ID')); return 'da_cai'; }
  const chaId = props.getProperty('THU_MUC_CHA');
  const cha = chaId ? DriveApp.getFolderById(chaId) : DriveApp.getRootFolder();
  // nằm trong thư mục cha của KK19 thì đặt tên "10 Ổ Heo" để xếp đúng thứ tự; có sẵn thư mục cùng tên thì dùng luôn
  const tenGoc = props.getProperty('TEN_THU_MUC') || (chaId ? '10 ' + OH.TEN_APP : OH.TEN_APP);
  const goc = thuMucCon_(cha, tenGoc);
  const ids = {};
  OH.THU_MUC.forEach(function (t) { ids[t] = thuMucCon_(goc, t).getId(); });
  const ss = SpreadsheetApp.create(OH.TEN_APP + ' - Dữ liệu chính');
  DriveApp.getFileById(ss.getId()).moveTo(goc);
  Object.keys(OH.COT).forEach(function (ten, i) {
    const sh = i === 0 ? ss.getSheets()[0].setName(ten) : ss.insertSheet(ten);
    sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setNumberFormat('@');
    sh.getRange(1, 1, 1, OH.COT[ten].length).setValues([OH.COT[ten]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  props.setProperties({ SS_ID: ss.getId(), THU_MUC_GOC: goc.getId(), TM_TEP: ids['01 Tệp gửi kèm'], TM_LUU_TRU: ids['02 Lưu trữ tin nhắn'], TM_AVATAR: ids['03 Avatar'], TM_SAO_LUU: ids['04 Sao lưu'], TM_XUAT: ids['05 Xuất báo cáo'] });
  const mk = matKhauTam_();
  them_('NguoiDung', taoNguoi_(OH.QUAN_TRI, 'Quản trị', 'quan_tri', mk));
  Logger.log('Đã cài xong. Thư mục: ' + goc.getUrl());
  Logger.log('Tài khoản quản trị: ' + OH.QUAN_TRI + ' · mật khẩu tạm: ' + mk + ' (đăng nhập lần đầu phải đổi)');
  return 'xong';
}
/* hàm capQuyen nằm ở tệp CapQuyen.js */
/* quên mật khẩu takikj02: chạy hàm này trong trình soạn script, xem mật khẩu tạm mới ở Nhật ký */
function datLaiMatKhauQuanTri() {
  const mk = matKhauTam_();
  khoa_(function () {
    const T = bang_('NguoiDung');
    const u = T.rows.filter(function (r) { return r.ten_dn === OH.QUAN_TRI; })[0];
    const n = taoNguoi_(OH.QUAN_TRI, u ? u.ho_ten : 'Quản trị', 'quan_tri', mk);
    if (u) { Object.assign(u, { muoi: n.muoi, bam: n.bam, doi_mk: '1', trang_thai: 'dang_dung' }); ghiDong_(T, u); }
    else them_('NguoiDung', n);
    xoaPhienCua_(OH.QUAN_TRI);
  });
  Logger.log('Mật khẩu tạm mới của ' + OH.QUAN_TRI + ': ' + mk);
}

/* ---------------- cửa vào duy nhất từ trang ---------------- */
function api(q) {
  let o;
  try { o = JSON.parse(q); } catch (e) { return JSON.stringify({ ok: false, msg: 'Yêu cầu không đọc được.' }); }
  try {
    if (!PropertiesService.getScriptProperties().getProperty('SS_ID')) return JSON.stringify({ ok: false, msg: 'App chưa cài. Quản trị chạy hàm caiDat trong trình soạn script.' });
    const fn = API_[o.lenh];
    if (!fn) return JSON.stringify({ ok: false, msg: 'Lệnh không có: ' + o.lenh });
    const me = fn.moPhien ? null : xacThuc_(o.token);
    if (!fn.moPhien && !me) return JSON.stringify({ ok: false, het_phien: true, msg: 'Phiên đăng nhập đã hết, bạn đăng nhập lại nha.' });
    if (fn.quanTri && me.vai_tro !== 'quan_tri') return JSON.stringify({ ok: false, msg: 'Chỉ quản trị làm được việc này.' });
    if (me && me.doi_mk === '1' && !fn.choDoiMk) return JSON.stringify({ ok: false, phai_doi_mk: true, msg: 'Bạn cần đổi mật khẩu trước.' });
    const kq = fn(o.du_lieu || {}, me) || {};
    kq.ok = kq.ok !== false;
    return JSON.stringify(kq);
  } catch (e) {
    return JSON.stringify({ ok: false, msg: (e && e.message) || String(e) });
  }
}
function loi_(m) { throw new Error(m); }
const API_ = {};

/* ---------- đăng nhập, phiên ---------- */
API_.dangNhap = function (d) {
  const ten = String(d.ten_dn || '').trim().toLowerCase(), mk = String(d.mat_khau || '');
  if (!ten || !mk) loi_('Bạn nhập tên đăng nhập và mật khẩu nha.');
  const cache = CacheService.getScriptCache(), kSai = 'sai:' + ten, sai = Number(cache.get(kSai) || 0);
  if (sai >= 5) loi_('Sai mật khẩu nhiều lần, bạn chờ 5 phút rồi thử lại nha.');
  const u = bang_('NguoiDung').rows.filter(function (r) { return r.ten_dn === ten; })[0];
  if (!u || u.bam !== bam_(u.muoi, mk)) { cache.put(kSai, String(sai + 1), 300); loi_('Tên đăng nhập hoặc mật khẩu chưa đúng.'); }
  if (u.trang_thai === 'da_xoa') loi_('Tên đăng nhập hoặc mật khẩu chưa đúng.');
  if (u.trang_thai === 'khoa') loi_('Tài khoản đang bị khóa, bạn nhắn quản trị nha.');
  cache.remove(kSai);
  const token = Utilities.getUuid() + Utilities.getUuid(), now = Date.now();
  khoa_(function () {
    them_('Phien', { bam_token: bam_('', token), ten_dn: ten, het_han: now + (d.nho ? OH.PHIEN_NHO : OH.PHIEN_NGAN), tao_luc: now });
    const T = bang_('NguoiDung'), x = T.rows.filter(function (r) { return r.ten_dn === ten; })[0];
    x.dang_nhap_cuoi = now; ghiDong_(T, x);
  });
  return { token: token, toi: congKhai_(u), phai_doi_mk: u.doi_mk === '1' };
};
API_.dangNhap.moPhien = true;
API_.dangXuat = function (d, me) {
  khoa_(function () { const T = bang_('Phien'); xoaPhien_(T.rows.filter(function (r) { return r.bam_token === me._bam; })); });
  return {};
};
API_.dangXuat.choDoiMk = true;
API_.doiMatKhau = function (d, me) {
  const cu = String(d.cu || ''), moi = String(d.moi || '');
  if (moi.length < 8) loi_('Mật khẩu mới cần ít nhất 8 ký tự.');
  if (bam_(me.muoi, cu) !== me.bam) loi_('Mật khẩu hiện tại chưa đúng.');
  if (cu === moi) loi_('Mật khẩu mới phải khác mật khẩu cũ.');
  khoa_(function () {
    const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === me.ten_dn; })[0];
    u.muoi = Utilities.getUuid(); u.bam = bam_(u.muoi, moi); u.doi_mk = ''; ghiDong_(T, u);
    xoaPhien_(bang_('Phien').rows.filter(function (r) { return r.ten_dn === me.ten_dn && r.bam_token !== me._bam; }));
  });
  return {};
};
API_.doiMatKhau.choDoiMk = true;
API_.doiAvatar = function (d, me) {
  if (OH.AVATAR.indexOf(d.avatar) < 0) loi_('Avatar không có.');
  khoa_(function () { const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === me.ten_dn; })[0]; u.avatar = d.avatar; ghiDong_(T, u); });
  danhDau_('v_nguoi');
  return {};
};

/* ---------- quản trị ---------- */
API_.dsNguoiDung = function () { return { nguoi: bang_('NguoiDung').rows.filter(function (u) { return u.trang_thai !== 'da_xoa'; }).map(function (u) { const c = congKhai_(u); c.trang_thai = u.trang_thai; c.doi_mk = u.doi_mk === '1'; c.dang_nhap_cuoi = u.dang_nhap_cuoi; c.hoat_dong = u.hoat_dong; return c; }) }; };
API_.dsNguoiDung.quanTri = true;
API_.capTaiKhoan = function (d) {
  const ten = String(d.ten_dn || '').trim().toLowerCase(), hoTen = String(d.ho_ten || '').trim();
  if (!/^[a-z0-9._-]{3,30}$/.test(ten)) loi_('Tên đăng nhập 3 đến 30 ký tự, chỉ chữ thường không dấu, số, dấu chấm, gạch.');
  if (!hoTen) loi_('Bạn nhập họ tên nha.');
  const mk = matKhauTam_();
  khoa_(function () {
    const cu = bang_('NguoiDung').rows.filter(function (r) { return r.ten_dn === ten; })[0];
    if (cu) loi_(cu.trang_thai === 'da_xoa' ? 'Tên này thuộc một tài khoản đã xóa (để giữ đúng tin nhắn cũ), bạn chọn tên khác nha.' : 'Tên đăng nhập này đã có.');
    them_('NguoiDung', taoNguoi_(ten, hoTen.slice(0, 60), 'thanh_vien', mk));
  });
  danhDau_('v_nguoi');
  return { ten_dn: ten, mat_khau_tam: mk };
};
API_.capTaiKhoan.quanTri = true;
API_.datLaiMatKhau = function (d) {
  const mk = matKhauTam_();
  khoa_(function () {
    const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === d.ten_dn; })[0];
    if (!u) loi_('Không thấy tài khoản.');
    u.muoi = Utilities.getUuid(); u.bam = bam_(u.muoi, mk); u.doi_mk = '1'; ghiDong_(T, u);
    xoaPhienCua_(u.ten_dn);
  });
  return { ten_dn: d.ten_dn, mat_khau_tam: mk };
};
API_.datLaiMatKhau.quanTri = true;
API_.khoaTaiKhoan = function (d, me) {
  if (d.ten_dn === me.ten_dn) loi_('Không tự khóa tài khoản của mình được.');
  khoa_(function () {
    const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === d.ten_dn; })[0];
    if (!u) loi_('Không thấy tài khoản.');
    u.trang_thai = d.khoa ? 'khoa' : 'dang_dung'; ghiDong_(T, u);
    if (d.khoa) xoaPhienCua_(u.ten_dn);
  });
  danhDau_('v_nguoi');
  return {};
};
API_.khoaTaiKhoan.quanTri = true;
/* xóa tài khoản: không xóa dòng (giữ tên cho tin nhắn, việc cũ), chỉ đánh dấu da_xoa, xóa mật khẩu và phiên,
   rút khỏi các nhóm; tin nhắn, tệp, việc vẫn giữ nguyên; tên đăng nhập không cấp lại cho người khác */
API_.xoaTaiKhoan = function (d, me) {
  const ten = String(d.ten_dn || '');
  if (ten === me.ten_dn) loi_('Không tự xóa tài khoản của mình được.');
  if (ten === OH.QUAN_TRI) loi_('Không xóa được tài khoản quản trị ' + OH.QUAN_TRI + '.');
  let hoTen = '', nhom = [];
  khoa_(function () {
    const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === ten; })[0];
    if (!u || u.trang_thai === 'da_xoa') loi_('Không thấy tài khoản.');
    hoTen = u.ho_ten;
    u.trang_thai = 'da_xoa'; u.bam = ''; u.muoi = ''; u.doi_mk = ''; ghiDong_(T, u);
    xoaPhienCua_(ten);
    const H = bang_('HoiThoai');
    H.rows.forEach(function (h) {
      if (h.loai !== 'nhom') return;
      const tv = h.thanh_vien.split(',');
      if (tv.indexOf(ten) < 0) return;
      const con = tv.filter(function (x) { return x !== ten; });
      h.thanh_vien = (con.length ? con : [me.ten_dn]).join(','); ghiDong_(H, h); nhom.push(h.id);
    });
  });
  nhom.forEach(function (id) { tinHeThong_(id, me.ten_dn, hoTen + ' đã rời nhóm (tài khoản đã xóa)'); });
  danhDau_('v_nguoi'); danhDau_('v_ht');
  return { nhom: nhom.length };
};
API_.xoaTaiKhoan.quanTri = true;
API_.doiTen = function (d) {
  const hoTen = String(d.ho_ten || '').trim().slice(0, 60);
  if (!hoTen) loi_('Bạn nhập họ tên nha.');
  khoa_(function () { const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === d.ten_dn; })[0]; if (!u) loi_('Không thấy tài khoản.'); u.ho_ten = hoTen; ghiDong_(T, u); });
  danhDau_('v_nguoi');
  return {};
};
API_.doiTen.quanTri = true;
/* quản trị mở app: cất tin cũ mỗi tháng, sao lưu mỗi 7 ngày, báo dung lượng */
API_.baoTri = function () {
  const kq = { cat_tin: 0, sao_luu: false };
  try { kq.cat_tin = catTinCu_(); } catch (e) { kq.loi_cat = e.message; }
  try { kq.sao_luu = saoLuu_(); } catch (e) { kq.loi_sao_luu = e.message; }
  try { const o = soO_(); kq.o_sheet = o; } catch (e) {}
  try { kq.drive_dung = DriveApp.getStorageUsed(); kq.drive_tong = DriveApp.getStorageLimit(); } catch (e) {}
  return kq;
};
API_.baoTri.quanTri = true;

/* ---------- đồng bộ: trang gọi mỗi vài giây ---------- */
API_.dongBo = function (d, me) {
  ghiHoatDong_(me);
  const v = phienBan_(), kq = { v: v, online: hoatDong_(), bay_gio: Date.now() };
  const can = d.v || {};
  const dau = !d.v;
  if (dau || can.v_nguoi !== v.v_nguoi) kq.nguoi = bang_('NguoiDung').rows.map(congKhai_);
  let ht = null;
  if (dau || can.v_ht !== v.v_ht || can.v_tin !== v.v_tin || can.v_viec !== v.v_viec) ht = hoiThoaiCua_(me.ten_dn);
  if (dau || can.v_ht !== v.v_ht) {
    kq.hoi_thoai = ht.map(function (h) { return { id: h.id, loai: h.loai, ten: h.ten, thanh_vien: h.thanh_vien.split(','), tao_boi: h.tao_boi, tao_luc: h.tao_luc }; });
    kq.da_doc = bang_('DaDoc').rows.filter(function (r) { return r.ten_dn === me.ten_dn; }).map(function (r) { return [r.hoi_thoai, r.tin_id, r.an_den || 0]; });
  }
  if (dau || can.v_tin !== v.v_tin) {
    const sau = Number(d.sau_tin || 0), ids = {};
    ht.forEach(function (h) { ids[h.id] = 1; });
    kq.tin = tinMoi_(sau, ids, dau ? 400 : 200);
    const tepIds = kq.tin.filter(function (t) { return t.tep_id; }).map(function (t) { return t.tep_id; });
    if (tepIds.length) kq.tep = bang_('Tep').rows.filter(function (t) { return tepIds.indexOf(t.id) >= 0; }).map(tepCongKhai_);
  }
  if (dau || can.v_viec !== v.v_viec) {
    const ids2 = {}; (ht || hoiThoaiCua_(me.ten_dn)).forEach(function (h) { ids2[h.id] = 1; });
    kq.viec = bang_('Viec').rows.filter(function (t) { return t.nguoi_nhan === me.ten_dn || t.nguoi_giao === me.ten_dn || (t.hoi_thoai && ids2[t.hoi_thoai] && t.hoi_thoai.indexOf('g') === 0); });
  }
  return kq;
};
/* tin cũ hơn (cuộn lên trên) */
API_.tinCu = function (d, me) {
  const h = hoiThoai_(d.hoi_thoai, me);
  const truoc = Number(d.truoc || Infinity);
  const tin = bang_('TinNhan').rows.filter(function (t) { return t.hoi_thoai === h.id && t.id < truoc; }).slice(-80).map(function (t) { delete t._r; return chuanTin_(t); });
  const tepIds = tin.filter(function (t) { return t.tep_id; }).map(function (t) { return t.tep_id; });
  return { tin: tin, het: tin.length < 80, tep: tepIds.length ? bang_('Tep').rows.filter(function (t) { return tepIds.indexOf(t.id) >= 0; }).map(tepCongKhai_) : [] };
};

/* ---------- hội thoại ---------- */
API_.moRieng = function (d, me) {
  const ban = String(d.voi || '');
  if (ban === me.ten_dn) loi_('Không nhắn riêng cho chính mình được.');
  if (!bang_('NguoiDung').rows.some(function (r) { return r.ten_dn === ban && r.trang_thai === 'dang_dung'; })) loi_('Không thấy người này.');
  const id = 'd:' + [me.ten_dn, ban].sort().join(':');
  let moi = false;
  khoa_(function () {
    if (bang_('HoiThoai').rows.some(function (r) { return r.id === id; })) return;
    them_('HoiThoai', { id: id, loai: 'rieng', ten: '', thanh_vien: [me.ten_dn, ban].sort().join(','), tao_boi: me.ten_dn, tao_luc: Date.now(), thu_muc_id: '' });
    moi = true;
  });
  if (moi) danhDau_('v_ht');
  return { id: id };
};
API_.taoNhom = function (d, me) {
  const ten = String(d.ten || '').trim().slice(0, 60) || 'Nhóm mới';
  const nguoi = bang_('NguoiDung').rows.filter(function (r) { return r.trang_thai === 'dang_dung'; }).map(function (r) { return r.ten_dn; });
  const tv = [me.ten_dn].concat((d.thanh_vien || []).filter(function (x) { return x !== me.ten_dn && nguoi.indexOf(x) >= 0; }));
  let id;
  khoa_(function () {
    id = 'g' + soMoi_('ht');
    them_('HoiThoai', { id: id, loai: 'nhom', ten: ten, thanh_vien: tv.join(','), tao_boi: me.ten_dn, tao_luc: Date.now(), thu_muc_id: '' });
  });
  tinHeThong_(id, me.ten_dn, ten_(me) + ' đã tạo nhóm "' + ten + '" với ' + (tv.length > 1 ? tv.slice(1).map(tenCua_).join(', ') : 'chỉ mình mình'));
  danhDau_('v_ht');
  return { id: id };
};
API_.suaNhom = function (d, me) {
  const h = hoiThoai_(d.id, me);
  if (h.loai !== 'nhom') loi_('Chỉ sửa được nhóm.');
  const nguoi = bang_('NguoiDung').rows.filter(function (r) { return r.trang_thai === 'dang_dung'; }).map(function (r) { return r.ten_dn; });
  let ghi = [];
  khoa_(function () {
    const T = bang_('HoiThoai'), x = T.rows.filter(function (r) { return r.id === h.id; })[0];
    if (d.ten && String(d.ten).trim() && String(d.ten).trim() !== x.ten) {
      const cu = x.ten, tmCu = tenThuMuc_(x); x.ten = String(d.ten).trim().slice(0, 60);
      ghi.push('đổi tên nhóm từ "' + cu + '" thành "' + x.ten + '"');
      try { const f = thuMucThang_().getFoldersByName(tmCu); if (f.hasNext()) f.next().setName(tenThuMuc_(x)); } catch (e) {}
    }
    if (d.thanh_vien) {
      const cu = x.thanh_vien.split(','), moi = d.thanh_vien.filter(function (t) { return nguoi.indexOf(t) >= 0; });
      if (moi.indexOf(me.ten_dn) < 0 && me.vai_tro !== 'quan_tri') moi.unshift(me.ten_dn);
      const them = moi.filter(function (t) { return cu.indexOf(t) < 0; }), bot = cu.filter(function (t) { return moi.indexOf(t) < 0; });
      if (them.length) ghi.push('thêm ' + them.map(tenCua_).join(', '));
      if (bot.length) ghi.push('bỏ ' + bot.map(tenCua_).join(', ') + ' khỏi nhóm');
      if (!moi.length) loi_('Nhóm cần ít nhất 1 người.');
      x.thanh_vien = moi.join(',');
    }
    ghiDong_(T, x);
  });
  ghi.forEach(function (g) { tinHeThong_(h.id, me.ten_dn, ten_(me) + ' ' + g); });
  danhDau_('v_ht');
  return {};
};
API_.daDoc = function (d, me) {
  const h = hoiThoai_(d.hoi_thoai, me), id = Number(d.tin_id || 0);
  khoa_(function () {
    const T = bang_('DaDoc'), r = T.rows.filter(function (x) { return x.ten_dn === me.ten_dn && x.hoi_thoai === h.id; })[0];
    if (r) { if (id > r.tin_id) { r.tin_id = id; ghiDong_(T, r); } }
    else them_('DaDoc', { ten_dn: me.ten_dn, hoi_thoai: h.id, tin_id: id });
  });
  return {};
};

/* ---------- tin nhắn ---------- */
API_.guiTin = function (d, me) {
  const h = hoiThoai_(d.hoi_thoai, me);
  const nd = String(d.noi_dung || '').trim();
  if (!nd) loi_('Tin nhắn trống.');
  if (nd.length > 20000) loi_('Tin nhắn dài quá 20.000 ký tự, bạn chia nhỏ giúp mình nha.');
  return { tin: themTin_(h.id, me.ten_dn, nd, 'chu', '') };
};

/* ---------- xóa tin, xóa cuộc trò chuyện, rời nhóm, xóa nhóm ---------- */
/* thu hồi tin: người gửi (hoặc quản trị) xóa với mọi người; thêm 1 dòng 'xoa_tin' để máy khác biết mà ẩn */
API_.xoaTin = function (d, me) {
  const id = Number(d.id || 0);
  let hId = '';
  khoa_(function () {
    const T = bang_('TinNhan'), t = T.rows.filter(function (r) { return r.id === id; })[0];
    if (!t) loi_('Không thấy tin này, có thể đã cất vào lưu trữ.');
    hId = hoiThoai_(t.hoi_thoai, me).id;
    if (t.loai === 'he_thong' || t.loai === 'xoa_tin') loi_('Tin thông báo của app không xóa được.');
    if (t.loai === 'da_xoa') return;
    if (t.nguoi_gui !== me.ten_dn && me.vai_tro !== 'quan_tri') loi_('Bạn chỉ xóa được tin của mình.');
    if (t.loai === 'tep' && t.tep_id !== '') {
      const f = bang_('Tep').rows.filter(function (x) { return x.id === Number(t.tep_id); })[0];
      if (f && f.drive_id) { try { DriveApp.getFileById(f.drive_id).setTrashed(true); } catch (e) {} }
    }
    t.loai = 'da_xoa'; t.noi_dung = ''; t.tep_id = '';
    ghiDong_(T, t);
  });
  themTin_(hId, me.ten_dn, String(id), 'xoa_tin', '');
  return {};
};
/* xóa cuộc trò chuyện ở phía mình: ẩn tin cũ, ẩn khỏi danh sách tới khi có tin mới */
API_.anHoiThoai = function (d, me) {
  const h = hoiThoai_(d.hoi_thoai, me);
  khoa_(function () {
    const den = Number(caiDatGet_('so_tin') || 0) || 1;
    damBaoCot_('DaDoc', 'an_den');
    const T = bang_('DaDoc'), r = T.rows.filter(function (x) { return x.ten_dn === me.ten_dn && x.hoi_thoai === h.id; })[0];
    if (r) { r.an_den = den; r.tin_id = Math.max(Number(r.tin_id || 0), den); ghiDong_(T, r); }
    else them_('DaDoc', { ten_dn: me.ten_dn, hoi_thoai: h.id, tin_id: den, an_den: den });
  });
  danhDau_('v_ht');
  return {};
};
API_.roiNhom = function (d, me) {
  const h = hoiThoai_(d.id, me);
  if (h.loai !== 'nhom') loi_('Chỉ rời được nhóm.');
  khoa_(function () {
    const T = bang_('HoiThoai'), x = T.rows.filter(function (r) { return r.id === h.id; })[0];
    x.thanh_vien = x.thanh_vien.split(',').filter(function (t) { return t !== me.ten_dn; }).join(',');
    ghiDong_(T, x);
  });
  tinHeThong_(h.id, me.ten_dn, ten_(me) + ' đã rời nhóm');
  danhDau_('v_ht');
  return {};
};
/* xóa nhóm với mọi người: chỉ người tạo nhóm hoặc quản trị; tệp trên Drive vẫn giữ */
API_.xoaNhom = function (d, me) {
  const h = hoiThoai_(d.id, me);
  if (h.loai !== 'nhom') loi_('Chỉ xóa được nhóm.');
  if (h.tao_boi !== me.ten_dn && me.vai_tro !== 'quan_tri') loi_('Chỉ người tạo nhóm hoặc quản trị mới xóa được nhóm.');
  khoa_(function () {
    const T = bang_('HoiThoai'), x = T.rows.filter(function (r) { return r.id === h.id; })[0];
    x.loai = 'nhom_da_xoa';
    ghiDong_(T, x);
  });
  danhDau_('v_ht'); danhDau_('v_viec');
  return {};
};
/* cột mới thêm sau khi đã cài đặt: ghi tiêu đề nếu còn trống */
function damBaoCot_(ten, c) {
  const sh = ss_().getSheetByName(ten), col = OH.COT[ten].indexOf(c) + 1, o = sh.getRange(1, col, 1, 1);
  if (!String(o.getValues()[0][0])) o.setValues([[c]]);
}

/* ---------- việc ---------- */
API_.giaoViec = function (d, me) {
  const tieuDe = String(d.tieu_de || '').trim().slice(0, 500);
  if (!tieuDe) loi_('Bạn ghi tên việc nha.');
  const nhan = String(d.nguoi_nhan || me.ten_dn);
  if (!bang_('NguoiDung').rows.some(function (r) { return r.ten_dn === nhan && r.trang_thai === 'dang_dung'; })) loi_('Người nhận không còn dùng app.');
  let h = null;
  if (d.hoi_thoai) { h = hoiThoai_(d.hoi_thoai, me); if (h.thanh_vien.split(',').indexOf(nhan) < 0) loi_('Người nhận không ở trong cuộc trò chuyện này.'); }
  const uu = OH.UU_TIEN.indexOf(d.uu_tien) >= 0 ? d.uu_tien : 'mid';
  const han = /^\d{8}$/.test(String(d.han || '')) ? Number(d.han) : '';
  // việc nhận từ tin của người khác: người giao là người viết tin đó
  let giao = me.ten_dn;
  if (nhan === me.ten_dn && d.giao_boi && h && h.thanh_vien.split(',').indexOf(d.giao_boi) >= 0) giao = d.giao_boi;
  let v;
  khoa_(function () {
    v = { id: soMoi_('viec'), tieu_de: tieuDe, nguoi_giao: giao, nguoi_nhan: nhan, hoi_thoai: h ? h.id : '', tin_id: Number(d.tin_id || 0) || '', han: han, uu_tien: uu, cot: 'todo', tao_luc: Date.now(), xong_luc: '', sua_luc: Date.now() };
    them_('Viec', v);
  });
  danhDau_('v_viec');
  if (h) tinHeThong_(h.id, me.ten_dn, nhan === me.ten_dn ? ten_(me) + ' nhận việc: ' + tieuDe : ten_(me) + ' giao cho ' + tenCua_(nhan) + ': ' + tieuDe, v.id);
  return { viec: v };
};
API_.suaViec = function (d, me) {
  let v;
  khoa_(function () {
    const T = bang_('Viec'); v = T.rows.filter(function (r) { return r.id === Number(d.id); })[0];
    if (!v) loi_('Không thấy việc này.');
    const duocSua = v.nguoi_nhan === me.ten_dn || v.nguoi_giao === me.ten_dn || me.vai_tro === 'quan_tri';
    if (!duocSua) loi_('Bạn không sửa được việc này.');
    if (d.cot && OH.COT_VIEC.indexOf(d.cot) >= 0 && d.cot !== v.cot) { v.cot = d.cot; v.xong_luc = d.cot === 'done' ? Date.now() : ''; }
    if (d.tieu_de !== undefined && String(d.tieu_de).trim()) v.tieu_de = String(d.tieu_de).trim().slice(0, 500);
    if (d.han !== undefined) v.han = /^\d{8}$/.test(String(d.han)) ? Number(d.han) : '';
    if (d.uu_tien && OH.UU_TIEN.indexOf(d.uu_tien) >= 0) v.uu_tien = d.uu_tien;
    v.sua_luc = Date.now();
    ghiDong_(T, v);
  });
  danhDau_('v_viec');
  return { viec: v };
};
API_.xoaViec = function (d, me) {
  khoa_(function () {
    const T = bang_('Viec'), v = T.rows.filter(function (r) { return r.id === Number(d.id); })[0];
    if (!v) return;
    if (v.nguoi_giao !== me.ten_dn && me.vai_tro !== 'quan_tri') loi_('Chỉ người giao việc mới xóa được.');
    xoaDong_(T, [v]);
  });
  danhDau_('v_viec');
  return {};
};

/* ---------- tệp gửi kèm: gửi từng phần vào Drive ---------- */
API_.batDauGuiTep = function (d, me) {
  const h = hoiThoai_(d.hoi_thoai, me);
  const co = Number(d.kich_thuoc || 0), ten = String(d.ten || 'tep').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 150), mime = String(d.mime || 'application/octet-stream');
  if (co <= 0) loi_('Tệp trống.');
  if (co > OH.TEP_TOI_DA) loi_('Tệp phải dưới 1 GB.');
  const tm = thuMucTep_(h);
  const now = new Date(), tenLuu = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd_HHmm') + '_' + me.ten_dn + '_' + ten;
  const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(co) },
    payload: JSON.stringify({ name: tenLuu, parents: [tm], mimeType: mime })
  });
  if (r.getResponseCode() !== 200) loi_('Drive chưa nhận tệp (' + r.getResponseCode() + '). Bạn thử lại sau nha.');
  const hd = r.getHeaders(), url = hd.Location || hd.location;
  if (!url) loi_('Drive không trả đường gửi tệp.');
  const ma = Utilities.getUuid();
  CacheService.getScriptCache().put('tl:' + ma, JSON.stringify({ url: url, h: h.id, ten: ten, mime: mime, co: co, ai: me.ten_dn }), 21600);
  return { ma: ma, phan: OH.PHAN };
};
API_.guiPhanTep = function (d, me) {
  const s = JSON.parse(CacheService.getScriptCache().get('tl:' + d.ma) || 'null');
  if (!s || s.ai !== me.ten_dn) loi_('Phiên gửi tệp đã hết, bạn gửi lại tệp nha.');
  const bytes = Utilities.base64Decode(String(d.b64 || '')), bd = Number(d.bat_dau || 0), kt = bd + bytes.length - 1;
  if (!bytes.length || kt >= s.co) loi_('Phần tệp không hợp lệ.');
  const r = UrlFetchApp.fetch(s.url, { method: 'put', payload: bytes, contentType: 'application/octet-stream', muteHttpExceptions: true, headers: { 'Content-Range': 'bytes ' + bd + '-' + kt + '/' + s.co } });
  const c = r.getResponseCode();
  if (c === 308) { const rg = r.getHeaders().Range || r.getHeaders().range || ''; const m = /-(\d+)$/.exec(rg); return { tiep: m ? Number(m[1]) + 1 : 0 }; }
  if (c !== 200 && c !== 201) loi_('Drive báo lỗi ' + c + ' khi nhận phần tệp, bạn bấm gửi tiếp nha.');
  const f = JSON.parse(r.getContentText());
  CacheService.getScriptCache().remove('tl:' + d.ma);
  return xongTep_(s, f.id, f.webViewLink, me);
};
/* hỏi Drive đã nhận tới đâu (khi mạng đứt giữa chừng) */
API_.trangThaiTep = function (d, me) {
  const s = JSON.parse(CacheService.getScriptCache().get('tl:' + d.ma) || 'null');
  if (!s || s.ai !== me.ten_dn) loi_('Phiên gửi tệp đã hết, bạn gửi lại tệp nha.');
  const r = UrlFetchApp.fetch(s.url, { method: 'put', muteHttpExceptions: true, headers: { 'Content-Range': 'bytes */' + s.co } });
  if (r.getResponseCode() === 308) { const rg = r.getHeaders().Range || r.getHeaders().range || ''; const m = /-(\d+)$/.exec(rg); return { tiep: m ? Number(m[1]) + 1 : 0 }; }
  if (r.getResponseCode() === 200 || r.getResponseCode() === 201) { const f = JSON.parse(r.getContentText()); CacheService.getScriptCache().remove('tl:' + d.ma); return xongTep_(s, f.id, f.webViewLink, me); }
  loi_('Drive báo lỗi ' + r.getResponseCode());
};
function xongTep_(s, driveId, link, me) {
  let tep;
  if (s.co >= OH.TEP_LINK) {
    try { DriveApp.getFileById(driveId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  } else link = '';
  khoa_(function () {
    tep = { id: soMoi_('tep'), hoi_thoai: s.h, ten: s.ten, mime: s.mime, kich_thuoc: s.co, drive_id: driveId, nguoi_gui: me.ten_dn, luc: Date.now(), link: link || '' };
    them_('Tep', tep);
  });
  const tin = themTin_(s.h, me.ten_dn, s.ten, 'tep', tep.id);
  return { xong: true, tin: tin, tep: tepCongKhai_(tep) };
}
/* tải tệp dưới 50 MB qua app, từng phần 8 MB */
API_.taiPhanTep = function (d, me) {
  const t = bang_('Tep').rows.filter(function (r) { return r.id === Number(d.id); })[0];
  if (!t) loi_('Không thấy tệp.');
  hoiThoai_(t.hoi_thoai, me);
  if (t.kich_thuoc >= OH.TEP_LINK) return { link: t.link || ('https://drive.google.com/file/d/' + t.drive_id + '/view') };
  const bd = Number(d.bat_dau || 0), kt = Math.min(t.kich_thuoc, bd + OH.PHAN_TAI) - 1;
  const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + t.drive_id + '?alt=media', { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + bd + '-' + kt } });
  if (r.getResponseCode() !== 200 && r.getResponseCode() !== 206) loi_('Không đọc được tệp (' + r.getResponseCode() + ').');
  return { b64: Utilities.base64Encode(r.getContent()), tiep: kt + 1 < t.kich_thuoc ? kt + 1 : null, tong: t.kich_thuoc, ten: t.ten, mime: t.mime };
};

/* ---------- xuất Excel thống kê việc ---------- */
API_.xuatThongKe = function (d, me) {
  const rows = bang_('Viec').rows.filter(function (t) { return me.vai_tro === 'quan_tri' || t.nguoi_nhan === me.ten_dn || t.nguoi_giao === me.ten_dn; });
  const now = new Date(), thang = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'MM-yyyy');
  const ss = SpreadsheetApp.create('Thong-ke-viec-' + thang + '-' + me.ten_dn);
  const sh = ss.getSheets()[0].setName('Việc');
  const cot = { todo: 'Cần làm', doing: 'Đang làm', done: 'Xong' }, uu = { hi: 'Gấp', imp: 'Quan trọng', mid: 'Vừa', lo: 'Thong thả' };
  const data = [['Mã', 'Việc', 'Người giao', 'Người nhận', 'Nhóm / trò chuyện', 'Hạn', 'Ưu tiên', 'Trạng thái', 'Ngày giao', 'Ngày xong', 'Trễ hạn']];
  const ht = {}; bang_('HoiThoai').rows.forEach(function (h) { ht[h.id] = h; });
  const homNay = Number(Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyyMMdd'));
  rows.forEach(function (t) {
    const h = ht[t.hoi_thoai];
    const tre = t.han && (t.cot !== 'done' ? t.han < homNay : Number(Utilities.formatDate(new Date(t.xong_luc), 'Asia/Ho_Chi_Minh', 'yyyyMMdd')) > t.han);
    data.push([t.id, t.tieu_de, tenCua_(t.nguoi_giao), tenCua_(t.nguoi_nhan), h ? (h.loai === 'nhom' ? h.ten : 'Nhắn riêng') : '', t.han ? String(t.han).replace(/(\d{4})(\d{2})(\d{2})/, '$3/$2/$1') : 'không hạn', uu[t.uu_tien] || '', cot[t.cot] || '', t.tao_luc ? new Date(t.tao_luc) : '', t.xong_luc ? new Date(t.xong_luc) : '', tre ? 'trễ' : '']);
  });
  sh.getRange(1, 1, data.length, data[0].length).setValues(data);
  sh.getRange(1, 1, 1, data[0].length).setFontWeight('bold'); sh.setFrozenRows(1);
  if (data.length > 1) { sh.getRange(2, 9, data.length - 1, 2).setNumberFormat('dd/MM/yyyy'); }
  const n = data.length;
  const s2 = ss.insertSheet('Tổng hợp');
  s2.getRange(1, 1, 6, 2).setValues([['Chỉ tiêu', 'Số việc'], ['Cần làm', '=COUNTIF(\'Việc\'!H2:H' + n + ',"Cần làm")'], ['Đang làm', '=COUNTIF(\'Việc\'!H2:H' + n + ',"Đang làm")'], ['Xong', '=COUNTIF(\'Việc\'!H2:H' + n + ',"Xong")'], ['Trễ hạn', '=COUNTIF(\'Việc\'!K2:K' + n + ',"trễ")'], ['Cộng', '=SUM(B2:B4)']]);
  s2.getRange(1, 1, 1, 2).setFontWeight('bold');
  SpreadsheetApp.flush();
  const blob = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob().setName('Thong-ke-viec-' + thang + '.xlsx');
  const f = DriveApp.getFolderById(prop_('TM_XUAT')).createFile(blob);
  DriveApp.getFileById(ss.getId()).setTrashed(true);
  return { ten: f.getName(), b64: Utilities.base64Encode(blob.getBytes()) };
};

/* ================= phần dùng chung ================= */
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
let SS_ = null, BANG_ = {};
function ss_() { return SS_ || (SS_ = SpreadsheetApp.openById(prop_('SS_ID'))); }
/* đọc cả bảng, mỗi dòng thành đối tượng; _r là số dòng trên sheet */
function bang_(ten) {
  if (BANG_[ten]) return BANG_[ten];
  const sh = ss_().getSheetByName(ten), cot = OH.COT[ten], n = sh.getLastRow() - 1;
  const vals = n > 0 ? sh.getRange(2, 1, n, cot.length).getValues() : [];
  const rows = vals.map(function (v, i) { const o = { _r: i + 2 }; cot.forEach(function (c, j) { o[c] = docO_(c, v[j], ten); }); return o; });
  return (BANG_[ten] = { ten: ten, sh: sh, cot: cot, rows: rows });
}
function docO_(c, v, ten) { if (OH.SO[c] && !(ten === 'HoiThoai' && c === 'id')) return v === '' || v === null ? '' : Number(v); return v === null || v === undefined ? '' : String(v); }
function ghiO_(v) { if (v === '' || v === null || v === undefined) return ''; if (typeof v === 'number') return String(v); v = String(v); return /^[=+\-@']/.test(v) ? "'" + v : v; }
function dong_(ten, o) { return OH.COT[ten].map(function (c) { return ghiO_(o[c]); }); }
function them_(ten, o) {
  const T = bang_(ten), r = T.sh.getLastRow() + 1;
  T.sh.getRange(r, 1, 1, T.cot.length).setValues([dong_(ten, o)]);
  o._r = r; T.rows.push(o);
  return o;
}
function ghiDong_(T, o) { T.sh.getRange(o._r, 1, 1, T.cot.length).setValues([dong_(T.ten, o)]); }
function xoaDong_(T, list) {
  list.map(function (o) { return o._r; }).sort(function (a, b) { return b - a; }).forEach(function (r) { T.sh.deleteRow(r); });
  delete BANG_[T.ten];
}
function khoa_(fn) {
  const L = LockService.getScriptLock();
  if (!L.tryLock(20000)) loi_('App đang bận, bạn thử lại sau vài giây nha.');
  try { BANG_ = {}; return fn(); } finally { SpreadsheetApp.flush(); L.releaseLock(); }
}
function soMoi_(loai) {
  const T = bang_('CaiDat'), k = 'so_' + loai, r = T.rows.filter(function (x) { return x.khoa === k; })[0];
  const n = (r ? Number(r.gia_tri) : 0) + 1;
  if (r) { r.gia_tri = String(n); ghiDong_(T, r); } else them_('CaiDat', { khoa: k, gia_tri: String(n) });
  return n;
}
function caiDatGet_(k) { const r = bang_('CaiDat').rows.filter(function (x) { return x.khoa === k; })[0]; return r ? r.gia_tri : ''; }
function caiDatSet_(k, v) { const T = bang_('CaiDat'), r = T.rows.filter(function (x) { return x.khoa === k; })[0]; if (r) { r.gia_tri = String(v); ghiDong_(T, r); } else them_('CaiDat', { khoa: k, gia_tri: String(v) }); }
/* số phiên bản để trang biết có gì mới mà không phải đọc cả sheet */
function phienBan_() {
  const c = CacheService.getScriptCache(), ks = ['v_nguoi', 'v_ht', 'v_tin', 'v_viec'], got = c.getAll(ks), kq = {};
  let thieu = false;
  ks.forEach(function (k) { if (got[k] === undefined || got[k] === null) thieu = true; else kq[k] = got[k]; });
  if (!thieu) return kq;
  const p = PropertiesService.getScriptProperties().getProperties();
  ks.forEach(function (k) { kq[k] = p[k] || '0'; });
  c.putAll(kq, 21600);
  return kq;
}
function danhDau_(k) {
  const v = String(Date.now()) + Math.floor(Math.random() * 1000);
  PropertiesService.getScriptProperties().setProperty(k, v);
  CacheService.getScriptCache().put(k, v, 21600);
}
function bam_(muoi, mk) {
  let h = muoi + '|' + mk;
  for (let i = 0; i < OH.BAM_LAP; i++) h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + muoi, Utilities.Charset.UTF_8));
  return h;
}
function matKhauTam_() { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const u = Utilities.getUuid().replace(/-/g, ''); for (let i = 0; i < 10; i++) s += c.charAt(parseInt(u.substr(i * 3, 3), 16) % c.length); return s; }
function taoNguoi_(ten, hoTen, vai, mk) { const m = Utilities.getUuid(); return { ten_dn: ten, ho_ten: hoTen, vai_tro: vai, muoi: m, bam: bam_(m, mk), avatar: 'bow', trang_thai: 'dang_dung', doi_mk: '1', tao_luc: Date.now(), dang_nhap_cuoi: '' }; }
function congKhai_(u) { return { ten_dn: u.ten_dn, ho_ten: u.ho_ten, vai_tro: u.vai_tro, avatar: u.avatar || 'none', khoa: u.trang_thai !== 'dang_dung', da_xoa: u.trang_thai === 'da_xoa' }; }
function tepCongKhai_(t) { return { id: t.id, ten: t.ten, mime: t.mime, kich_thuoc: t.kich_thuoc, nguoi_gui: t.nguoi_gui, luc: t.luc, link: t.kich_thuoc >= OH.TEP_LINK ? (t.link || ('https://drive.google.com/file/d/' + t.drive_id + '/view')) : '' }; }
function xacThuc_(token) {
  if (!token) return null;
  const b = bam_('', String(token)), c = CacheService.getScriptCache(), k = 'p:' + b.slice(0, 40);
  let ten = c.get(k);
  if (!ten) {
    const p = bang_('Phien').rows.filter(function (r) { return r.bam_token === b; })[0];
    if (!p || p.het_han < Date.now()) return null;
    ten = p.ten_dn; c.put(k, ten, 600);
  }
  const u = bang_('NguoiDung').rows.filter(function (r) { return r.ten_dn === ten; })[0];
  if (!u || u.trang_thai !== 'dang_dung') { c.remove(k); return null; }
  u._bam = b;
  return u;
}
function xoaPhienCua_(ten) { xoaPhien_(bang_('Phien').rows.filter(function (r) { return r.ten_dn === ten; })); }
/* xóa phiên: xóa cả dòng trên sheet và chỗ nhớ tạm, để máy kia bị đăng xuất ngay */
function xoaPhien_(list) {
  const c = CacheService.getScriptCache(); list.forEach(function (r) { c.remove('p:' + r.bam_token.slice(0, 40)); });
  // dọn luôn phiên đã hết hạn
  const P = bang_('Phien'), now = Date.now();
  xoaDong_(P, list.concat(P.rows.filter(function (r) { return r.het_han < now && list.indexOf(r) < 0; })));
}
function ten_(u) { return u.ho_ten || u.ten_dn; }
function tenCua_(t) { const u = bang_('NguoiDung').rows.filter(function (r) { return r.ten_dn === t; })[0]; return u ? ten_(u) : t; }
function hoiThoaiCua_(ten) { return bang_('HoiThoai').rows.filter(function (h) { return h.loai !== 'nhom_da_xoa' && h.thanh_vien.split(',').indexOf(ten) >= 0; }); }
function hoiThoai_(id, me) {
  const h = bang_('HoiThoai').rows.filter(function (r) { return r.id === String(id); })[0];
  if (!h || h.loai === 'nhom_da_xoa' || h.thanh_vien.split(',').indexOf(me.ten_dn) < 0) loi_('Bạn không ở trong cuộc trò chuyện này.');
  return h;
}
function themTin_(hId, ai, nd, loai, tepId) {
  let t;
  khoa_(function () { t = { id: soMoi_('tin'), hoi_thoai: hId, nguoi_gui: ai, noi_dung: nd, loai: loai, tep_id: tepId || '', luc: Date.now() }; them_('TinNhan', t); });
  danhDau_('v_tin');
  delete t._r;
  return chuanTin_(t);
}
function tinHeThong_(hId, ai, nd, viecId) { return themTin_(hId, ai, nd, 'he_thong', viecId ? 'v' + viecId : ''); }
/* đọc từ cuối sheet lên: chỉ lấy tin mới sau id "sau" */
function tinMoi_(sau, ids, toiDa) {
  const sh = ss_().getSheetByName('TinNhan'), cot = OH.COT.TinNhan, last = sh.getLastRow();
  const kq = []; let r = last;
  while (r >= 2 && kq.length < toiDa) {
    const tu = Math.max(2, r - 299), vals = sh.getRange(tu, 1, r - tu + 1, cot.length).getValues();
    let dung = false;
    for (let i = vals.length - 1; i >= 0; i--) {
      const o = {}; cot.forEach(function (c, j) { o[c] = docO_(c, vals[i][j]); });
      if (o.id <= sau) { dung = true; break; }
      if (ids[o.hoi_thoai]) kq.push(o);
      if (kq.length >= toiDa) break;
    }
    if (dung) break;
    r = tu - 1;
  }
  return kq.reverse().map(chuanTin_);
}
/* tin hệ thống về việc lưu mã việc ở cột tep_id dạng v12 */
function chuanTin_(t) { if (String(t.tep_id).charAt(0) === 'v') { t.viec_id = Number(String(t.tep_id).slice(1)); t.tep_id = ''; } else t.tep_id = t.tep_id === '' ? '' : Number(t.tep_id); return t; }
function tenThuMuc_(h) {
  if (h.loai === 'nhom') return /^nhóm/i.test(h.ten) ? h.ten : 'Nhóm - ' + h.ten;
  return 'Riêng - ' + h.thanh_vien.split(',').map(tenCua_).join(' và ');
}
function thuMucCon_(cha, ten) { const it = cha.getFoldersByName(ten); return it.hasNext() ? it.next() : cha.createFolder(ten); }
/* thư mục tháng này: 01 Tệp gửi kèm/NĂM/THÁNG-NĂM (đổi tên nhóm thì đổi tên thư mục nhóm của tháng này) */
function thuMucThang_() {
  const now = new Date(), nam = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyy'), thang = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'MM-yyyy');
  return thuMucCon_(thuMucCon_(DriveApp.getFolderById(prop_('TM_TEP')), nam), thang);
}
function thuMucTep_(h) { return thuMucCon_(thuMucThang_(), tenThuMuc_(h)).getId(); }
/* cất tin của các tháng trước tháng liền trước sang "02 Lưu trữ tin nhắn" */
function catTinCu_() {
  const now = new Date(), moc = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const thangNay = Utilities.formatDate(now, 'Asia/Ho_Chi_Minh', 'yyyyMM');
  if (caiDatGet_('cat_tin_thang') === thangNay) return 0;
  let n = 0;
  khoa_(function () {
    const T = bang_('TinNhan'), cu = T.rows.filter(function (t) { return t.luc < moc; });
    if (cu.length) {
      const theoThang = {};
      cu.forEach(function (t) { const k = Utilities.formatDate(new Date(t.luc), 'Asia/Ho_Chi_Minh', 'MM-yyyy'); (theoThang[k] = theoThang[k] || []).push(t); });
      const fLuu = DriveApp.getFolderById(prop_('TM_LUU_TRU'));
      Object.keys(theoThang).forEach(function (k) {
        const ten = 'Tin nhắn ' + k, it = fLuu.getFilesByName(ten);
        let ss;
        if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
        else { ss = SpreadsheetApp.create(ten); DriveApp.getFileById(ss.getId()).moveTo(fLuu); ss.getSheets()[0].getRange(1, 1, 1, OH.COT.TinNhan.length).setValues([OH.COT.TinNhan]); ss.getSheets()[0].getRange('A:G').setNumberFormat('@'); }
        const sh = ss.getSheets()[0], rows = theoThang[k].map(function (t) { return dong_('TinNhan', t); });
        sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      });
      // các tin cũ luôn nằm liền nhau ở đầu sheet (ghi theo thứ tự thời gian)
      const cuoi = Math.max.apply(null, cu.map(function (t) { return t._r; }));
      T.sh.deleteRows(2, cuoi - 1);
      n = cu.length;
      delete BANG_.TinNhan;
    }
    caiDatSet_('cat_tin_thang', thangNay);
  });
  return n;
}
function saoLuu_() {
  const cuoi = Number(caiDatGet_('sao_luu_cuoi') || 0);
  if (Date.now() - cuoi < OH.SAO_LUU_NGAY * 864e5) return false;
  const f = DriveApp.getFolderById(prop_('TM_SAO_LUU'));
  DriveApp.getFileById(prop_('SS_ID')).makeCopy('Sao lưu ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'), f);
  const ds = []; const it = f.getFiles(); while (it.hasNext()) ds.push(it.next());
  ds.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); }).slice(OH.SAO_LUU_GIU).forEach(function (x) { x.setTrashed(true); });
  khoa_(function () { caiDatSet_('sao_luu_cuoi', Date.now()); });
  return true;
}
/* trạng thái online: mỗi lần trang đồng bộ ghi giờ vào chỗ nhớ tạm; 10 phút mới ghi xuống sheet một lần */
function ghiHoatDong_(me) {
  const c = CacheService.getScriptCache(), now = Date.now();
  c.put('on:' + me.ten_dn, String(now), 21600);
  if (c.get('luu:' + me.ten_dn)) return;
  c.put('luu:' + me.ten_dn, '1', 600);
  try {
    damBaoCot_('NguoiDung', 'hoat_dong');
    ss_().getSheetByName('NguoiDung').getRange(me._r, OH.COT.NguoiDung.indexOf('hoat_dong') + 1, 1, 1).setValues([[String(now)]]);
  } catch (e) {}
}
function hoatDong_() {
  const ds = bang_('NguoiDung').rows.filter(function (u) { return u.trang_thai === 'dang_dung'; });
  const got = CacheService.getScriptCache().getAll(ds.map(function (u) { return 'on:' + u.ten_dn; })), kq = {};
  ds.forEach(function (u) { const x = Number(got['on:' + u.ten_dn] || 0) || u.hoat_dong || u.dang_nhap_cuoi || 0; if (x) kq[u.ten_dn] = x; });
  return kq;
}
function soO_() { let n = 0; ss_().getSheets().forEach(function (s) { n += s.getMaxRows() * s.getMaxColumns(); }); return n; }
