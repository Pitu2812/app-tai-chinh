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
    NguoiDung: ['ten_dn', 'ho_ten', 'vai_tro', 'muoi', 'bam', 'avatar', 'trang_thai', 'doi_mk', 'tao_luc', 'dang_nhap_cuoi', 'hoat_dong', 'quyen', 'ghi_chu'],
    Phien: ['bam_token', 'ten_dn', 'het_han', 'tao_luc'],
    HoiThoai: ['id', 'loai', 'ten', 'thanh_vien', 'tao_boi', 'tao_luc', 'thu_muc_id'],
    TinNhan: ['id', 'hoi_thoai', 'nguoi_gui', 'noi_dung', 'loai', 'tep_id', 'luc'],
    Viec: ['id', 'tieu_de', 'nguoi_giao', 'nguoi_nhan', 'hoi_thoai', 'tin_id', 'han', 'uu_tien', 'cot', 'tao_luc', 'xong_luc', 'sua_luc', 'nac', 'tep_chot', 'theo_doi', 'nguoi_chot'],
    Tep: ['id', 'hoi_thoai', 'ten', 'mime', 'kich_thuoc', 'drive_id', 'nguoi_gui', 'luc', 'link', 'viec_id', 'ghi_chu'],
    DaDoc: ['ten_dn', 'hoi_thoai', 'tin_id', 'an_den'],
    CaiDat: ['khoa', 'gia_tri'],
    /* thông báo trong thẻ việc: ai gửi, gửi ai, câu, giờ gửi, giờ người nhận mở thẻ việc */
    ThongBaoViec: ['id', 'viec_id', 'nguoi_gui', 'nguoi_nhan', 'noi_dung', 'luc', 'xem_luc']
  },
  SO: { het_han: 1, tao_luc: 1, dang_nhap_cuoi: 1, hoat_dong: 1, luc: 1, xong_luc: 1, sua_luc: 1, id: 1, tin_id: 1, han: 1, kich_thuoc: 1, an_den: 1, viec_id: 1, nac: 1, tep_chot: 1, xem_luc: 1 },
  UU_TIEN: ['hi', 'imp', 'mid', 'lo'],
  COT_VIEC: ['todo', 'doing', 'done'],
  AVATAR: ['none', 'bow', 'hat', 'bunny', 'bee', 'scarf'],
  /* phân quyền: cột quyen trống = Đầy đủ (tài khoản cũ); phu_qt luôn bật riêng */
  QUYEN: ['nhan_rieng', 'tao_nhom', 'sua_nhom', 'gui_tep', 'giao_viec', 'thu_hoi', 'thong_ke', 'xuat_excel', 'xem_het', 'tb_het', 'phu_qt'],
  MAU: {
    du: ['nhan_rieng', 'tao_nhom', 'sua_nhom', 'gui_tep', 'giao_viec', 'thu_hoi', 'thong_ke', 'xuat_excel', 'xem_het', 'tb_het'],
    co_ban: ['nhan_rieng', 'gui_tep', 'giao_viec', 'thu_hoi', 'thong_ke'],
    chi_nhan: ['nhan_rieng', 'gui_tep', 'thu_hoi']
  },
  /* liên kết App tài chính: link chính, tên tệp khóa bí mật ở gốc Drive takikj02 (không nằm trong thư mục chia sẻ), vé hết hạn sau 2 phút */
  APP_TC: 'https://script.google.com/macros/s/AKfycbxoUmOzXZFN1EXGTfe7SsriHl2zpQfXVndLwqQeZKBmjMS28BYe2GsVS9sdklrcG6P5/exec',
  KHOA_LK: 'o-heo-khoa-lien-ket.txt', VE_HAN: 2 * 60 * 1000,
  DK_CHO_TOI_DA: 20, DK_MOI_MAY_GIO: 3, DK_HET_HAN: 7 * 864e5
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
    if (fn.quanTri && me.vai_tro !== 'quan_tri' && !(fn.phuQt && coQuyen_(me, 'phu_qt'))) return JSON.stringify({ ok: false, msg: 'Chỉ quản trị làm được việc này.' });
    if (me && me.doi_mk === '1' && !fn.choDoiMk) return JSON.stringify({ ok: false, phai_doi_mk: true, msg: 'Bạn cần đổi mật khẩu trước.' });
    const kq = fn(o.du_lieu || {}, me) || {};
    doiBan_();
    kq.ok = kq.ok !== false;
    return JSON.stringify(kq);
  } catch (e) {
    try { doiBan_(); } catch (e2) {}
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
  if (u.trang_thai === 'cho_duyet' && !hetHanDk_(u)) loi_('Tài khoản đang chờ quản trị duyệt, bạn đợi chút nha.');
  if (u.trang_thai === 'cho_duyet') loi_('Yêu cầu đăng ký quá 7 ngày chưa được duyệt nên đã tự hủy, bạn đăng ký lại nha.');
  if (u.trang_thai === 'tu_choi') loi_('Yêu cầu đăng ký chưa được duyệt. Bạn nhắn quản trị hoặc đăng ký lại nha.');
  if (u.trang_thai !== 'dang_dung') loi_('Tên đăng nhập hoặc mật khẩu chưa đúng.');
  cache.remove(kSai);
  const token = Utilities.getUuid() + Utilities.getUuid(), now = Date.now();
  khoa_(function () {
    them_('Phien', { bam_token: bam_('', token), ten_dn: ten, het_han: now + (d.nho ? OH.PHIEN_NHO : OH.PHIEN_NGAN), tao_luc: now });
    const T = bang_('NguoiDung'), x = T.rows.filter(function (r) { return r.ten_dn === ten; })[0];
    x.dang_nhap_cuoi = now; ghiDong_(T, x);
  });
  const toi = congKhai_(u); toi.quyen = quyenCua_(u);
  return { token: token, toi: toi, phai_doi_mk: u.doi_mk === '1' };
};
API_.dangNhap.moPhien = true;
/* người mới tự đăng ký: chờ quản trị (hoặc phụ quản trị) duyệt; mật khẩu băm ngay, không ai đọc được */
API_.dangKy = function (d) {
  const ten = String(d.ten_dn || '').trim().toLowerCase(), hoTen = String(d.ho_ten || '').trim().slice(0, 60), mk = String(d.mat_khau || '');
  const ghiChu = String(d.ghi_chu || '').trim().slice(0, 300), may = String(d.may || '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'khong_ro';
  if (!hoTen) loi_('Bạn nhập họ tên nha.');
  if (!/^[a-z0-9._-]{3,30}$/.test(ten)) loi_('Tên đăng nhập 3 đến 30 ký tự, chỉ chữ thường không dấu, số, dấu chấm, gạch.');
  if (mk.length < 8) loi_('Mật khẩu cần ít nhất 8 ký tự.');
  const cache = CacheService.getScriptCache(), kMay = 'dk:' + may, lan = Number(cache.get(kMay) || 0);
  if (lan >= OH.DK_MOI_MAY_GIO) loi_('Máy này đã gửi ' + OH.DK_MOI_MAY_GIO + ' yêu cầu trong một giờ, bạn chờ một lát rồi gửi lại nha.');
  const u0 = taoNguoi_(ten, hoTen, 'thanh_vien', mk);
  khoa_(function () {
    cotQuyen_(); const T = bang_('NguoiDung');
    if (T.rows.filter(function (r) { return r.trang_thai === 'cho_duyet' && !hetHanDk_(r); }).length >= OH.DK_CHO_TOI_DA) loi_('Đang có nhiều yêu cầu chờ duyệt, bạn nhắn quản trị hoặc thử lại sau nha.');
    const cu = T.rows.filter(function (r) { return r.ten_dn === ten; })[0];
    if (cu && cu.trang_thai === 'cho_duyet' && !hetHanDk_(cu)) loi_('Tên đăng nhập này đang chờ duyệt rồi.');
    if (cu && !dungLaiDuoc_(cu)) loi_('Tên đăng nhập này đã có người dùng, bạn chọn tên khác nha.');
    u0.trang_thai = 'cho_duyet'; u0.doi_mk = ''; u0.quyen = OH.MAU.co_ban.join(','); u0.ghi_chu = ghiChu;
    if (cu) { Object.assign(cu, u0, { _r: cu._r, hoat_dong: '' }); ghiDong_(T, cu); } else them_('NguoiDung', u0);
  });
  cache.put(kMay, String(lan + 1), 3600);
  return {};
};
API_.dangKy.moPhien = true;
API_.dangXuat = function (d, me) {
  khoa_(function () { const T = bang_('Phien'); xoaPhien_(T.rows.filter(function (r) { return r.bam_token === me._bam; })); });
  return {};
};
API_.dangXuat.choDoiMk = true;
API_.doiMatKhau = function (d, me) {
  const cu = String(d.cu || ''), moi = String(d.moi || '');
  if (moi.length < 8) loi_('Mật khẩu mới cần ít nhất 8 ký tự.');
  const goc = bang_('NguoiDung').rows.filter(function (r) { return r.ten_dn === me.ten_dn; })[0];
  if (!goc || bam_(goc.muoi, cu) !== goc.bam) loi_('Mật khẩu hiện tại chưa đúng.');
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
API_.dsNguoiDung = function () {
  const rows = bang_('NguoiDung').rows;
  return {
    nguoi: rows.filter(function (u) { return u.trang_thai === 'dang_dung' || u.trang_thai === 'khoa'; }).map(function (u) { const c = congKhai_(u); c.trang_thai = u.trang_thai; c.doi_mk = u.doi_mk === '1'; c.dang_nhap_cuoi = u.dang_nhap_cuoi; c.hoat_dong = u.hoat_dong; c.quyen = quyenCua_(u); return c; }),
    cho: rows.filter(function (u) { return u.trang_thai === 'cho_duyet' && !hetHanDk_(u); }).map(function (u) { return { ten_dn: u.ten_dn, ho_ten: u.ho_ten, ghi_chu: u.ghi_chu, tao_luc: u.tao_luc }; })
  };
};
API_.dsNguoiDung.quanTri = true; API_.dsNguoiDung.phuQt = true;
API_.duyetDangKy = function (d, me) {
  const q = quyenChon_(d, me);
  let u;
  khoa_(function () {
    const T = bang_('NguoiDung'); u = T.rows.filter(function (r) { return r.ten_dn === d.ten_dn; })[0];
    if (!u || u.trang_thai !== 'cho_duyet' || hetHanDk_(u)) loi_('Yêu cầu này không còn chờ duyệt (đã có người duyệt, từ chối hoặc quá hạn).');
    u.trang_thai = 'dang_dung'; u.quyen = q; ghiDong_(T, u);
  });
  return { ten_dn: u.ten_dn };
};
API_.duyetDangKy.quanTri = true; API_.duyetDangKy.phuQt = true;
API_.tuChoiDangKy = function (d) {
  khoa_(function () {
    const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === d.ten_dn; })[0];
    if (!u || u.trang_thai !== 'cho_duyet') loi_('Yêu cầu này không còn chờ duyệt.');
    u.trang_thai = 'tu_choi'; ghiDong_(T, u);
  });
  return {};
};
API_.tuChoiDangKy.quanTri = true; API_.tuChoiDangKy.phuQt = true;
/* phân quyền: chỉ quản trị chính */
API_.datQuyen = function (d, me) {
  const q = quyenChon_(d, me);
  khoa_(function () {
    cotQuyen_(); const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === d.ten_dn; })[0];
    if (!u || (u.trang_thai !== 'dang_dung' && u.trang_thai !== 'khoa')) loi_('Không thấy tài khoản.');
    if (u.vai_tro === 'quan_tri') loi_('Quản trị luôn có đủ quyền.');
    u.quyen = q; ghiDong_(T, u);
  });
  danhDau_('v_viec');
  return { quyen: q.split(',').filter(function (k) { return OH.QUYEN.indexOf(k) >= 0; }) };
};
API_.datQuyen.quanTri = true;
API_.capTaiKhoan = function (d, me) {
  const ten = String(d.ten_dn || '').trim().toLowerCase(), hoTen = String(d.ho_ten || '').trim();
  if (!/^[a-z0-9._-]{3,30}$/.test(ten)) loi_('Tên đăng nhập 3 đến 30 ký tự, chỉ chữ thường không dấu, số, dấu chấm, gạch.');
  if (!hoTen) loi_('Bạn nhập họ tên nha.');
  const mk = matKhauTam_(), q = quyenChon_(d, me);
  khoa_(function () {
    cotQuyen_(); const T = bang_('NguoiDung'), cu = T.rows.filter(function (r) { return r.ten_dn === ten; })[0];
    if (cu && cu.trang_thai === 'cho_duyet' && !hetHanDk_(cu)) loi_('Tên này đang chờ duyệt, bạn duyệt ở mục Chờ duyệt nha.');
    if (cu && !dungLaiDuoc_(cu)) loi_(cu.trang_thai === 'da_xoa' ? 'Tên này thuộc một tài khoản đã xóa (để giữ đúng tin nhắn cũ), bạn chọn tên khác nha.' : 'Tên đăng nhập này đã có.');
    const n = taoNguoi_(ten, hoTen.slice(0, 60), 'thanh_vien', mk); n.quyen = q;
    if (cu) { Object.assign(cu, n, { _r: cu._r, hoat_dong: '', ghi_chu: '' }); ghiDong_(T, cu); } else them_('NguoiDung', n);
  });
  danhDau_('v_nguoi');
  return { ten_dn: ten, mat_khau_tam: mk };
};
API_.capTaiKhoan.quanTri = true;
API_.datLaiMatKhau = function (d, me) {
  const mk = matKhauTam_();
  khoa_(function () {
    const T = bang_('NguoiDung'), u = T.rows.filter(function (r) { return r.ten_dn === d.ten_dn; })[0];
    if (!u || (u.trang_thai !== 'dang_dung' && u.trang_thai !== 'khoa')) loi_('Không thấy tài khoản.');
    chanPhuQt_(u, me);
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
    if (!u || (u.trang_thai !== 'dang_dung' && u.trang_thai !== 'khoa')) loi_('Không thấy tài khoản.');
    chanPhuQt_(u, me);
    u.trang_thai = d.khoa ? 'khoa' : 'dang_dung'; ghiDong_(T, u);
    if (d.khoa) xoaPhienCua_(u.ten_dn);
  });
  danhDau_('v_nguoi');
  return {};
};
API_.khoaTaiKhoan.quanTri = true; API_.khoaTaiKhoan.phuQt = true;
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
  nangCapV8_();
  const v = phienBan_(), kq = { v: v, online: hoatDong_(), bay_gio: Date.now() };
  const can = d.v || {};
  const dau = !d.v;
  if (dau || can.v_nguoi !== v.v_nguoi) {
    const ds = nguoi_();
    kq.nguoi = ds.filter(function (u) { return u.trang_thai === 'dang_dung' || u.trang_thai === 'khoa' || u.trang_thai === 'da_xoa'; }).map(congKhai_);
    kq.quyen = quyenCua_(me);
    if (me.vai_tro === 'quan_tri' || coQuyen_(me, 'phu_qt')) kq.cho_duyet = ds.filter(function (u) { return u.trang_thai === 'cho_duyet' && !hetHanDk_(u); }).length;
  }
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
    // quyền Thông báo tất cả các việc cũng cần cả danh sách việc cho tab Thông báo (Bảng việc vẫn lọc ở trang)
    const het = xemHet_(me) || coQuyen_(me, 'tb_het');
    kq.viec = bang_('Viec').rows.filter(function (t) { return het || t.nguoi_nhan === me.ten_dn || t.nguoi_giao === me.ten_dn || theoDoi_(t, me.ten_dn) || (t.hoi_thoai && ids2[t.hoi_thoai] && t.hoi_thoai.indexOf('g') === 0); });
    const vIds = {}; kq.viec.forEach(function (t) { vIds[t.id] = 1; });
    kq.sp = bang_('Tep').rows.filter(function (t) { return t.viec_id && vIds[t.viec_id]; }).map(tepCongKhai_);
    kq.thu_tu = thuTu_();
    kq.tbv = bangTBV_().rows.filter(function (r) { return vIds[r.viec_id] || r.nguoi_nhan === me.ten_dn; }).map(function (r) { return { id: r.id, viec_id: r.viec_id, nguoi_gui: r.nguoi_gui, nguoi_nhan: r.nguoi_nhan, noi_dung: r.noi_dung, luc: r.luc, xem_luc: r.xem_luc }; });
  }
  bienNhan_(d, me, v, kq, ht);
  return kq;
};
/* thứ tự dòng việc ở tab Thông báo: CHUNG cho mọi tài khoản, chỉ quản trị kéo xếp; lưu ở Script Properties (khóa TT_CHUNG) */
function thuTu_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('TT_CHUNG') || '[]'); } catch (e) { return []; } }
API_.luuThuTu = function (d, me) {
  if (me.vai_tro !== 'quan_tri') loi_('Chỉ quản trị sắp xếp thứ tự việc được.');
  const ids = (Array.isArray(d.ids) ? d.ids : []).map(Number).filter(function (x, i, a) { return x > 0 && a.indexOf(x) === i; }).slice(0, 1500);
  PropertiesService.getScriptProperties().setProperty('TT_CHUNG', JSON.stringify(ids));
  danhDau_('v_viec');
  return { thu_tu: ids };
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
  if (!bangNhanh_('HoiThoai').some(function (r) { return r.id === id; })) canQuyen_(me, 'nhan_rieng', 'nhắn riêng với người mới');
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
  canQuyen_(me, 'tao_nhom', 'tạo nhóm');
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
  canQuyen_(me, 'sua_nhom', 'sửa nhóm');
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
  danhDau_('v_doc');
  return {};
};

API_.dangGo = function (d, me) { ghiDangGo_(hoiThoai_(d.hoi_thoai, me).id, me); return {}; };

/* ---------- tin nhắn ---------- */
API_.guiTin = function (d, me) {
  const h = hoiThoai_(d.hoi_thoai, me);
  const nd = String(d.noi_dung || '').trim();
  if (!nd) loi_('Tin nhắn trống.');
  if (nd.length > 20000) loi_('Tin nhắn dài quá 20.000 ký tự, bạn chia nhỏ giúp mình nha.');
  CacheService.getScriptCache().remove('go:' + h.id + ':' + me.ten_dn);
  return { tin: themTin_(h.id, me.ten_dn, nd, 'chu', '') };
};

/* ---------- xóa tin, xóa cuộc trò chuyện, rời nhóm, xóa nhóm ---------- */
/* thu hồi tin: người gửi (hoặc quản trị) xóa với mọi người; thêm 1 dòng 'xoa_tin' để máy khác biết mà ẩn */
API_.xoaTin = function (d, me) {
  const id = Number(d.id || 0);
  let hId = '', goSp = false;
  khoa_(function () {
    const T = bang_('TinNhan'), t = T.rows.filter(function (r) { return r.id === id; })[0];
    if (!t) loi_('Không thấy tin này, có thể đã cất vào lưu trữ.');
    hId = hoiThoai_(t.hoi_thoai, me).id;
    if (t.loai === 'he_thong' || t.loai === 'xoa_tin') loi_('Tin thông báo của app không xóa được.');
    if (t.loai === 'da_xoa') return;
    if (t.nguoi_gui !== me.ten_dn && me.vai_tro !== 'quan_tri') loi_('Bạn chỉ xóa được tin của mình.');
    canQuyen_(me, 'thu_hoi', 'thu hồi tin');
    if (t.loai === 'tep' && t.tep_id !== '') {
      const f = bang_('Tep').rows.filter(function (x) { return x.id === Number(t.tep_id); })[0];
      if (f && f.drive_id) { try { DriveApp.getFileById(f.drive_id).setTrashed(true); } catch (e) {} }
      if (f && f.viec_id) { boSpKhoiViec_(f); goSp = true; }
    }
    t.loai = 'da_xoa'; t.noi_dung = ''; t.tep_id = '';
    ghiDong_(T, t);
  });
  themTin_(hId, me.ten_dn, String(id), 'xoa_tin', '');
  if (goSp) danhDau_('v_viec');
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
  if (nhan !== me.ten_dn) canQuyen_(me, 'giao_viec', 'giao việc cho người khác');
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
    v = { id: soMoi_('viec'), tieu_de: tieuDe, nguoi_giao: giao, nguoi_nhan: nhan, hoi_thoai: h ? h.id : '', tin_id: Number(d.tin_id || 0) || '', han: han, uu_tien: uu, cot: 'todo', tao_luc: Date.now(), xong_luc: '', sua_luc: Date.now(), nac: 1, tep_chot: '', theo_doi: '' };
    them_('Viec', v);
  });
  danhDau_('v_viec');
  // giao ở Bảng việc (chưa có khung chat): dùng khung nhắn riêng với người nhận để tin giao việc hiện ở đó
  if (!h && nhan !== me.ten_dn) {
    h = hoiThoaiViec_(v, me);
    khoa_(function () { damBaoCot_('Viec', 'nac'); const V = bang_('Viec'), x = V.rows.filter(function (r) { return r.id === v.id; })[0]; x.hoi_thoai = h.id; x.nac = 1; ghiDong_(V, x); v = x; });
  }
  if (h) tinHeThong_(h.id, me.ten_dn, nhan === me.ten_dn ? ten_(me) + ' nhận việc: ' + tieuDe : ten_(me) + ' giao việc cho ' + tenCua_(nhan) + ' thực hiện: ' + tieuDe, v.id);
  return { viec: v };
};
API_.suaViec = function (d, me) {
  let v;
  khoa_(function () {
    const T = bang_('Viec'); v = T.rows.filter(function (r) { return r.id === Number(d.id); })[0];
    if (!v) loi_('Không thấy việc này.');
    const duocSua = v.nguoi_nhan === me.ten_dn || v.nguoi_giao === me.ten_dn || xemHet_(me);
    if (!duocSua) loi_('Bạn không sửa được việc này.');
    if (d.cot && OH.COT_VIEC.indexOf(d.cot) >= 0 && d.cot !== v.cot) {
      if ((d.cot === 'done' || v.cot === 'done') && !chotDuoc_(v, me)) loi_('Chỉ người giao việc hoặc quản trị phê duyệt việc sang Xong. Bạn bấm “Báo đã xong” để người giao duyệt nha.');
      damBaoCot_('Viec', 'nac'); damBaoCot_('Viec', 'tep_chot');
      const sp = spCua_(v.id);
      v.cot = d.cot; v.xong_luc = d.cot === 'done' ? Date.now() : '';
      damBaoCot_('Viec', 'nguoi_chot');
      // Hoàn thành: chưa duyệt bản nào thì duyệt bản mới nhất; mở lại thì giữ bản đã duyệt
      if (d.cot === 'done') { if (sp.length && !v.tep_chot) { v.tep_chot = sp[sp.length - 1].id; v.nguoi_chot = me.ten_dn; } v.nac = 4; }
      else v.nac = sp.length ? 2 : 1;
    }
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
    if (v.nguoi_giao !== me.ten_dn && !xemHet_(me)) loi_('Chỉ người giao việc mới xóa được.');
    xoaDong_(T, [v]);
  });
  danhDau_('v_viec');
  return {};
};

/* ---------- sản phẩm của việc: nộp từ thẻ việc, tệp vào khung chat của việc ---------- */
function viecNop_(id, me) {
  const v = bang_('Viec').rows.filter(function (r) { return r.id === Number(id); })[0];
  if (!v) loi_('Không thấy việc này.');
  if (v.nguoi_nhan !== me.ten_dn && v.nguoi_giao !== me.ten_dn && !xemHet_(me)) loi_('Chỉ người nhận việc, người giao hoặc quản trị nộp được sản phẩm.');
  return v;
}
/* việc ghi ở nhóm hay tin riêng thì dùng chỗ đó; việc giao ở Bảng việc thì dùng tin riêng hai người; tự ghi cho mình thì không gửi vào chat */
function hoiThoaiViec_(v, me) {
  if (v.hoi_thoai) { const h = bangNhanh_('HoiThoai').filter(function (r) { return r.id === v.hoi_thoai && r.loai !== 'nhom_da_xoa'; })[0]; if (h) return h; }
  if (v.nguoi_giao === v.nguoi_nhan) return null;
  const tv = [v.nguoi_giao, v.nguoi_nhan].sort(), id = 'd:' + tv.join(':');
  let moi = false, h = bangNhanh_('HoiThoai').filter(function (r) { return r.id === id; })[0];
  if (!h) {
    khoa_(function () {
      h = bang_('HoiThoai').rows.filter(function (r) { return r.id === id; })[0];
      if (!h) { h = them_('HoiThoai', { id: id, loai: 'rieng', ten: '', thanh_vien: tv.join(','), tao_boi: me.ten_dn, tao_luc: Date.now(), thu_muc_id: '' }); moi = true; }
    });
    if (moi) danhDau_('v_ht');
  }
  return h;
}
function xemTep_(t, me) {
  if (t.viec_id) {
    const v = bang_('Viec').rows.filter(function (r) { return r.id === t.viec_id; })[0];
    if (v && thayViec_(v, me)) return;
  }
  hoiThoai_(t.hoi_thoai, me);
}
/* bỏ tệp khỏi danh sách sản phẩm; tệp đang là bản chốt thì bỏ chốt; hết sản phẩm thì về nấc 1 */
function boSpKhoiViec_(f) {
  const vid = f.viec_id; f.viec_id = ''; ghiDong_(bang_('Tep'), f);
  const V = bang_('Viec'), v = V.rows.filter(function (r) { return r.id === vid; })[0];
  if (!v) return;
  let doi = false;
  if (v.tep_chot === f.id) { v.tep_chot = ''; doi = true; }
  if (v.cot !== 'done' && !spCua_(vid).length && v.nac !== 1) { v.nac = 1; doi = true; }
  if (doi) ghiDong_(V, v);
}
/* xóa sản phẩm nộp nhầm khỏi danh sách sản phẩm: tệp vẫn ở khung chat */
API_.goSanPham = function (d, me) {
  khoa_(function () {
    const T = bang_('Tep'), t = T.rows.filter(function (r) { return r.id === Number(d.id); })[0];
    if (!t || !t.viec_id) loi_('Sản phẩm này đã được xóa rồi.');
    if (t.nguoi_gui !== me.ten_dn && !xemHet_(me)) loi_('Chỉ người nộp hoặc quản trị xóa được.');
    boSpKhoiViec_(t);
  });
  danhDau_('v_viec');
  return {};
};

/* ---------- vòng 8: xem hết việc, thông báo trong thẻ việc, trao đổi, chốt ---------- */
function xemHet_(me) { return me.vai_tro === 'quan_tri' || coQuyen_(me, 'xem_het'); }
function benViec_(v, u) { return v.nguoi_giao === u || v.nguoi_nhan === u; }
function theoDoi_(v, u) { return !!v.theo_doi && String(v.theo_doi).split(',').indexOf(u) >= 0; }
function trongNhom_(v, u) {
  if (!v.hoi_thoai || String(v.hoi_thoai).indexOf('g') !== 0) return false;
  const h = bangNhanh_('HoiThoai').filter(function (r) { return r.id === v.hoi_thoai; })[0];
  return !!h && h.loai !== 'nhom_da_xoa' && h.thanh_vien.split(',').indexOf(u) >= 0;
}
/* ai thấy được việc: người giao, người nhận, người được nhắc tới, nhóm của việc, quản trị, người có quyền xem tất cả */
function thayViec_(v, me) { return benViec_(v, me.ten_dn) || xemHet_(me) || theoDoi_(v, me.ten_dn) || trongNhom_(v, me.ten_dn); }
/* phê duyệt (chốt), mở lại: người giao việc, quản trị, người có quyền Xem tất cả các việc (như quản trị); việc tự ghi thì chính người đó */
function chotDuoc_(v, me) { return me.vai_tro === 'quan_tri' || v.nguoi_giao === me.ten_dn || coQuyen_(me, 'xem_het'); }
/* người xét sản phẩm (người giao hoặc quản trị, không phải người làm) */
function nguoiXet_(v, me) { return me.ten_dn !== v.nguoi_nhan && chotDuoc_(v, me); }
function spCua_(vid) { return bang_('Tep').rows.filter(function (r) { return r.viec_id === Number(vid); }).sort(function (a, b) { return a.luc - b.luc || a.id - b.id; }); }
function viec_(id) { const v = bang_('Viec').rows.filter(function (r) { return r.id === Number(id); })[0]; if (!v) loi_('Không thấy việc này.'); return v; }
/* khung chat của việc; việc chưa ghi khung chat thì ghi vào */
function khungViec_(v, me) {
  const h = hoiThoaiViec_(v, me);
  if (h && v.hoi_thoai !== h.id) khoa_(function () { const V = bang_('Viec'), x = V.rows.filter(function (r) { return r.id === v.id; })[0]; if (x && !x.hoi_thoai) { x.hoi_thoai = h.id; ghiDong_(V, x); } });
  return h;
}
function taoBangTBV_() {
  const ss = ss_();
  if (ss.getSheetByName('ThongBaoViec')) return;
  const sh = ss.insertSheet('ThongBaoViec');
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setNumberFormat('@');
  sh.getRange(1, 1, 1, OH.COT.ThongBaoViec.length).setValues([OH.COT.ThongBaoViec]).setFontWeight('bold');
  sh.setFrozenRows(1);
}
function bangTBV_() { nangCapV8_(); return bang_('ThongBaoViec'); }
function themTBV_(v, gui, nhan, nd) { return them_('ThongBaoViec', { id: soMoi_('tbv'), viec_id: v.id, nguoi_gui: gui, nguoi_nhan: nhan, noi_dung: nd, luc: Date.now(), xem_luc: '' }); }
/* nâng cấp một lần khi có bản vòng 8: tạo sheet ThongBaoViec, cột mới, quyền mới cho tài khoản Đầy đủ, tin giao việc cho việc giao ở Bảng việc */
function nangCapV8_() {
  const P = PropertiesService.getScriptProperties();
  if (P.getProperty('MIG_V8')) return;
  let bu = [];
  khoa_(function () {
    if (P.getProperty('MIG_V8')) return;
    taoBangTBV_();
    ['nac', 'tep_chot', 'theo_doi'].forEach(function (c) { damBaoCot_('Viec', c); });
    cotQuyen_();
    const cu = ['nhan_rieng', 'tao_nhom', 'sua_nhom', 'gui_tep', 'giao_viec', 'thu_hoi', 'thong_ke', 'xuat_excel'], N = bang_('NguoiDung');
    N.rows.forEach(function (u) {
      if (u.vai_tro === 'quan_tri' || !u.quyen || u.quyen === 'khong') return;
      const q = String(u.quyen).split(',');
      if (!cu.every(function (k) { return q.indexOf(k) >= 0; })) return;
      let doi = false;
      ['xem_het', 'tb_het'].forEach(function (k) { if (q.indexOf(k) < 0) { q.splice(q.indexOf('phu_qt') >= 0 ? q.indexOf('phu_qt') : q.length, 0, k); doi = true; } });
      if (doi) { u.quyen = q.join(','); ghiDong_(N, u); }
    });
    const daCo = {};
    bang_('TinNhan').rows.forEach(function (t) { if (String(t.tep_id).charAt(0) === 'v') daCo[String(t.tep_id).slice(1)] = 1; });
    bu = bang_('Viec').rows.filter(function (v) { return v.cot !== 'done' && !v.hoi_thoai && v.nguoi_giao !== v.nguoi_nhan && !daCo[v.id]; })
      .map(function (v) { return { id: v.id, tieu_de: v.tieu_de, nguoi_giao: v.nguoi_giao, nguoi_nhan: v.nguoi_nhan, hoi_thoai: '' }; });
    P.setProperty('MIG_V8', String(Date.now()));
  });
  bu.forEach(function (v) {
    try {
      const h = khungViec_(v, { ten_dn: v.nguoi_giao });
      if (h) tinHeThong_(h.id, v.nguoi_giao, tenCua_(v.nguoi_giao) + ' giao việc cho ' + tenCua_(v.nguoi_nhan) + ' thực hiện: ' + v.tieu_de, v.id);
    } catch (e) {}
  });
  danhDau_('v_viec'); danhDau_('v_nguoi');
}
/* 🔔 thông báo trong thẻ việc: người giao, người nhận, quản trị gửi cho nhiều người */
API_.thongBaoViec = function (d, me) {
  nangCapV8_();
  const nd = String(d.noi_dung || '').trim().slice(0, 300);
  if (!nd) loi_('Bạn chọn hoặc ghi câu thông báo nha.');
  const dang = {}; nguoi_().forEach(function (u) { if (u.trang_thai === 'dang_dung') dang[u.ten_dn] = 1; });
  const den = (Array.isArray(d.den) ? d.den : []).map(String).filter(function (x, i, a) { return dang[x] && x !== me.ten_dn && a.indexOf(x) === i; }).slice(0, 30);
  if (!den.length) loi_('Bạn chọn người nhận thông báo nha.');
  let v;
  khoa_(function () {
    const V = bang_('Viec'); v = V.rows.filter(function (r) { return r.id === Number(d.viec_id); })[0];
    if (!v) loi_('Không thấy việc này.');
    if (!benViec_(v, me.ten_dn) && !xemHet_(me)) loi_('Chỉ người giao, người nhận việc hoặc quản trị gửi được thông báo.');
    den.forEach(function (x) { themTBV_(v, me.ten_dn, x, nd); });
    const td = v.theo_doi ? String(v.theo_doi).split(',') : [];
    den.forEach(function (x) { if (!benViec_(v, x) && td.indexOf(x) < 0) td.push(x); });
    v.theo_doi = td.join(',');
    if (v.cot !== 'done' && nguoiXet_(v, me) && /sửa|ý kiến/i.test(nd) && spCua_(v.id).length) v.nac = 3;
    ghiDong_(V, v);
  });
  const h = khungViec_(v, me);
  if (h) tinHeThong_(h.id, me.ten_dn, '🔔 ' + ten_(me) + ' thông báo cho ' + den.map(tenCua_).join(', ') + ': ' + nd, v.id);
  danhDau_('v_viec');
  return { viec: v };
};
/* người nhận thông báo mở thẻ việc: ghi đã xem */
API_.xemViecTB = function (d, me) {
  nangCapV8_();
  let n = 0;
  khoa_(function () {
    const T = bang_('ThongBaoViec');
    T.rows.forEach(function (r) { if (r.viec_id === Number(d.viec_id) && r.nguoi_nhan === me.ten_dn && !r.xem_luc) { r.xem_luc = Date.now(); ghiDong_(T, r); n++; } });
  });
  if (n) danhDau_('v_viec');
  return { so: n };
};
/* tin trao đổi của một việc (cả người được nhắc tới, người xem tất cả không ở trong khung chat) */
API_.tinViec = function (d, me) {
  const v = viec_(d.viec_id);
  if (!thayViec_(v, me)) loi_('Bạn không xem được việc này.');
  const k = 'v' + v.id;
  const tin = v.hoi_thoai ? bang_('TinNhan').rows.filter(function (t) { return t.hoi_thoai === v.hoi_thoai && t.tep_id === k; }).map(function (t) { const o = Object.assign({}, t); delete o._r; return chuanTin_(o); }) : [];
  return { tin: tin.slice(-300) };
};
API_.guiTinViec = function (d, me) {
  const nd = String(d.noi_dung || '').trim();
  if (!nd) loi_('Tin nhắn trống.');
  if (nd.length > 5000) loi_('Tin trao đổi dài quá 5.000 ký tự.');
  let v = viec_(d.viec_id);
  if (!thayViec_(v, me)) loi_('Bạn không xem được việc này.');
  const h = khungViec_(v, me);
  if (!h) loi_('Việc tự ghi cho mình chưa có khung trao đổi.');
  const tin = themTin_(h.id, me.ten_dn, nd, 'chu', 'v' + v.id);
  if (v.cot !== 'done' && nguoiXet_(v, me)) khoa_(function () {
    const V = bang_('Viec'); v = V.rows.filter(function (r) { return r.id === Number(d.viec_id); })[0];
    if (v && v.cot !== 'done' && Number(v.nac || 0) !== 3 && spCua_(v.id).length) { damBaoCot_('Viec', 'nac'); v.nac = 3; ghiDong_(V, v); danhDau_('v_viec'); }
  });
  return { tin: tin };
};
/* ✔ chốt bản này: việc sang Xong, chỉ giữ tệp chốt */
API_.chotTep = function (d, me) {
  nangCapV8_();
  let v, t, lan = 0;
  khoa_(function () {
    t = bang_('Tep').rows.filter(function (r) { return r.id === Number(d.tep_id); })[0];
    if (!t || !t.viec_id) loi_('Không thấy sản phẩm này.');
    const V = bang_('Viec'); v = V.rows.filter(function (r) { return r.id === t.viec_id; })[0];
    if (!v) loi_('Không thấy việc này.');
    if (!chotDuoc_(v, me)) loi_('Chỉ người giao việc hoặc quản trị phê duyệt được. Bạn bấm “Báo đã xong” để người giao duyệt nha.');
    lan = spCua_(v.id).map(function (r) { return r.id; }).indexOf(t.id) + 1;
    damBaoCot_('Viec', 'nguoi_chot');
    v.tep_chot = t.id; v.cot = 'done'; v.xong_luc = Date.now(); v.nac = 4; v.sua_luc = Date.now(); v.nguoi_chot = me.ten_dn;
    ghiDong_(V, v);
    if (t.nguoi_gui !== me.ten_dn) themTBV_(v, me.ten_dn, t.nguoi_gui, 'đã duyệt lần ' + lan + ': ' + t.ten);
  });
  const h = khungViec_(v, me);
  if (h) tinHeThong_(h.id, me.ten_dn, '✔ ' + ten_(me) + ' đã duyệt lần ' + lan + ': ' + t.ten, v.id);
  danhDau_('v_viec');
  return { viec: v, lan: lan };
};
/* ✔ Duyệt bản này: chỉ đánh dấu bản được duyệt và ai duyệt, không chuyển cột; bấm lại bản đang duyệt là bỏ duyệt */
API_.duyetTep = function (d, me) {
  nangCapV8_();
  let v, t, lan = 0, bo = false;
  khoa_(function () {
    t = bang_('Tep').rows.filter(function (r) { return r.id === Number(d.tep_id); })[0];
    if (!t || !t.viec_id) loi_('Không thấy sản phẩm này.');
    const V = bang_('Viec'); v = V.rows.filter(function (r) { return r.id === t.viec_id; })[0];
    if (!v) loi_('Không thấy việc này.');
    if (!chotDuoc_(v, me)) loi_('Chỉ người giao việc hoặc quản trị duyệt được. Bạn bấm “Báo đã xong” để người giao duyệt nha.');
    damBaoCot_('Viec', 'tep_chot'); damBaoCot_('Viec', 'nguoi_chot');
    lan = spCua_(v.id).map(function (r) { return r.id; }).indexOf(t.id) + 1;
    bo = v.tep_chot === t.id;
    if (bo) { if (v.cot === 'done') loi_('Việc đã Xong thì bạn duyệt bản khác, hoặc Mở lại việc trước khi bỏ duyệt nha.'); v.tep_chot = ''; v.nguoi_chot = ''; }
    else { v.tep_chot = t.id; v.nguoi_chot = me.ten_dn; }
    v.sua_luc = Date.now(); ghiDong_(V, v);
    if (!bo && t.nguoi_gui !== me.ten_dn) themTBV_(v, me.ten_dn, t.nguoi_gui, 'đã duyệt lần ' + lan + ': ' + t.ten);
  });
  const h = khungViec_(v, me);
  if (h) tinHeThong_(h.id, me.ten_dn, (bo ? '↩ ' + ten_(me) + ' bỏ duyệt lần ' : '✔ ' + ten_(me) + ' đã duyệt lần ') + lan + ': ' + t.ten, v.id);
  danhDau_('v_viec');
  return { viec: v, lan: lan, bo: bo };
};
/* mở lại việc đã Xong (giữ bản đã duyệt); hoàn tác ngay sau Hoàn thành thì bỏ luôn duyệt nếu lần đó tự duyệt (bo_duyet) */
API_.boChot = function (d, me) {
  nangCapV8_();
  let v, cu = '';
  khoa_(function () {
    const V = bang_('Viec'); v = V.rows.filter(function (r) { return r.id === Number(d.viec_id); })[0];
    if (!v) loi_('Không thấy việc này.');
    if (!chotDuoc_(v, me)) loi_('Chỉ người giao việc hoặc quản trị mở lại được.');
    if (v.cot !== 'done') return;
    cu = v.tep_chot;
    const sp = spCua_(v.id).length;
    v.cot = 'doing'; v.xong_luc = ''; v.nac = !sp ? 1 : d.hoan_tac ? 2 : 3; v.sua_luc = Date.now();
    if (d.hoan_tac && d.bo_duyet) { v.tep_chot = ''; v.nguoi_chot = ''; }
    ghiDong_(V, v);
    if (d.hoan_tac && d.bo_duyet && cu) {
      const T = bang_('ThongBaoViec'), bo = T.rows.filter(function (r) { return r.viec_id === v.id && r.nguoi_gui === me.ten_dn && /^đã (chốt|duyệt) lần/.test(r.noi_dung) && !r.xem_luc && Date.now() - r.luc < 120000; });
      if (bo.length) xoaDong_(T, bo.slice(-1));
    }
  });
  const h = khungViec_(v, me);
  if (h) tinHeThong_(h.id, me.ten_dn, ten_(me) + (d.hoan_tac ? ' hoàn tác duyệt' : ' mở lại việc') + ': ' + v.tieu_de, v.id);
  danhDau_('v_viec');
  return { viec: v };
};
/* 📣 người nhận báo đã xong: nhắc người giao kiểm tra và chốt */
API_.baoXong = function (d, me) {
  nangCapV8_();
  let v;
  khoa_(function () {
    v = viec_(d.viec_id);
    if (v.nguoi_nhan !== me.ten_dn) loi_('Chỉ người nhận việc báo đã xong.');
    if (v.nguoi_giao === me.ten_dn) loi_('Việc tự ghi thì bạn bấm Hoàn thành luôn nha.');
    themTBV_(v, me.ten_dn, v.nguoi_giao, 'báo đã xong, đề nghị bạn kiểm tra và phê duyệt');
  });
  const h = khungViec_(v, me);
  if (h) tinHeThong_(h.id, me.ten_dn, '📣 ' + ten_(me) + ' báo đã xong, đề nghị ' + tenCua_(v.nguoi_giao) + ' kiểm tra và phê duyệt: ' + v.tieu_de, v.id);
  danhDau_('v_viec');
  return {};
};

/* ---------- liên kết App tài chính: vé dùng một lần ký HMAC, App tài chính kiểm bằng cùng khóa ---------- */
API_.veAppTaiChinh = function (d, me) {
  const k = khoaLienKet_();
  const tai = b64Url_(Utilities.base64EncodeWebSafe(JSON.stringify({ u: me.ten_dn, n: ten_(me), t: Date.now() + OH.VE_HAN, r: Utilities.getUuid() }), Utilities.Charset.UTF_8));
  const ky = b64Url_(Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(tai, k)));
  return { url: OH.APP_TC + '?oh=' + tai + '.' + ky };
};
function b64Url_(s) { return String(s).replace(/=+$/, ''); }
function docKhoaLienKet_() {
  /* chỉ nhận tệp do chính tài khoản chạy script sở hữu: tệp người khác chia sẻ vào cùng tên bị bỏ qua */
  const me = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  const it = DriveApp.getFilesByName(OH.KHOA_LK); let f = null;
  while (it.hasNext()) {
    const x = it.next();
    if (x.isTrashed()) continue;
    let ow = null; try { ow = x.getOwner(); } catch (e) {}
    if (!me || !ow || String(ow.getEmail() || '').toLowerCase() !== me) continue;
    if (!f || x.getDateCreated() < f.getDateCreated()) f = x;
  }
  return f ? f.getBlob().getDataAsString().trim() : '';
}
/* khóa tạo một lần ở gốc Drive; cả hai app lấy tệp cũ nhất cùng tên do takikj02 sở hữu, dài ít nhất 32 ký tự */
function khoaLienKet_() {
  const c = CacheService.getScriptCache();
  let k = c.get('khoa_lk');
  if (k) return k;
  k = docKhoaLienKet_();
  if (!k) {
    const L = LockService.getScriptLock();
    if (!L.tryLock(20000)) loi_('App đang bận, bạn thử lại sau vài giây nha.');
    try { k = docKhoaLienKet_(); if (!k) { k = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); DriveApp.createFile(OH.KHOA_LK, k); } }
    finally { L.releaseLock(); }
  }
  if (k.length < 32) loi_('Tệp khóa liên kết không hợp lệ, nhờ quản trị kiểm tra tệp ' + OH.KHOA_LK + ' trên Drive.');
  c.put('khoa_lk', k, 21600);
  return k;
}

/* ---------- tệp gửi kèm: gửi từng phần vào Drive ---------- */
API_.batDauGuiTep = function (d, me) {
  let h, viec = null;
  if (d.viec_id) { viec = viecNop_(d.viec_id, me); h = hoiThoaiViec_(viec, me); }
  else { canQuyen_(me, 'gui_tep', 'gửi tệp'); h = hoiThoai_(d.hoi_thoai, me); }
  const co = Number(d.kich_thuoc || 0), ten = String(d.ten || 'tep').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 150), mime = String(d.mime || 'application/octet-stream');
  if (co <= 0) loi_('Tệp trống.');
  if (co > OH.TEP_TOI_DA) loi_('Tệp phải dưới 1 GB.');
  const tm = h ? thuMucTep_(h) : thuMucCon_(thuMucThang_(), 'Việc riêng - ' + ten_(me)).getId();
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
  CacheService.getScriptCache().put('tl:' + ma, JSON.stringify({ url: url, h: h ? h.id : '', ten: ten, mime: mime, co: co, ai: me.ten_dn, v: viec ? viec.id : '', gc: String(d.ghi_chu || '').trim().slice(0, 300), xong: !!d.xong }), 21600);
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
    if (s.v) { damBaoCot_('Tep', 'viec_id'); damBaoCot_('Tep', 'ghi_chu'); }
    tep = { id: soMoi_('tep'), hoi_thoai: s.h, ten: s.ten, mime: s.mime, kich_thuoc: s.co, drive_id: driveId, nguoi_gui: me.ten_dn, luc: Date.now(), link: link || '', viec_id: s.v || '', ghi_chu: s.gc || '' };
    them_('Tep', tep);
  });
  const tin = s.h ? themTin_(s.h, me.ten_dn, s.ten, 'tep', tep.id) : null;
  const kq = { xong: true, tin: tin, tep: tepCongKhai_(tep) };
  if (s.v) {
    let v, lan = 0, chuyen = false;
    khoa_(function () {
      lan = bang_('Tep').rows.filter(function (r) { return r.viec_id === s.v; }).length;
      const V = bang_('Viec'); v = V.rows.filter(function (r) { return r.id === s.v; })[0];
      if (v) {
        damBaoCot_('Viec', 'nac');
        if (v.cot === 'todo') { v.cot = 'doing'; chuyen = true; }
        if (v.cot !== 'done') v.nac = 2;
        v.sua_luc = Date.now(); ghiDong_(V, v);
      }
    });
    if (v && s.h) kq.he_thong = tinHeThong_(s.h, me.ten_dn, ten_(me) + ' nộp sản phẩm lần ' + lan + ' cho việc: ' + v.tieu_de + (s.gc ? ' · ' + s.gc : '') + (chuyen ? ' · việc sang Đang làm' : ''), v.id);
    kq.lan = lan; kq.viec = v || null;
    danhDau_('v_viec');
  }
  return kq;
}
/* ảnh xem trước trong khung chat: ảnh lớn lấy bản thu nhỏ của Drive, ảnh nhỏ gửi nguyên; giữ trong chỗ nhớ tạm 6 giờ */
API_.anhNho = function (d, me) {
  const t = bang_('Tep').rows.filter(function (r) { return r.id === Number(d.id); })[0];
  if (!t) loi_('Không thấy ảnh.');
  xemTep_(t, me);
  if (!/^image\//.test(t.mime)) loi_('Tệp này không phải ảnh.');
  const c = CacheService.getScriptCache(), k = 'an:' + t.id, x = c.get(k);
  if (x) { try { return JSON.parse(x); } catch (e) {} }
  const tk = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  let kq = null;
  if (t.kich_thuoc > 600 * 1024) {
    try {
      const m = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + t.drive_id + '?fields=thumbnailLink', { muteHttpExceptions: true, headers: tk });
      const l = m.getResponseCode() === 200 ? JSON.parse(m.getContentText()).thumbnailLink : '';
      if (l) {
        const r = UrlFetchApp.fetch(String(l).replace(/=s\d+$/, '') + '=s800', { muteHttpExceptions: true, headers: tk });
        if (r.getResponseCode() === 200) kq = { b64: Utilities.base64Encode(r.getContent()), mime: 'image/jpeg', nho: true };
      }
    } catch (e) {}
  }
  if (!kq && t.kich_thuoc <= 4 * 1024 * 1024) {
    const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + t.drive_id + '?alt=media', { muteHttpExceptions: true, headers: Object.assign({ Range: 'bytes=0-' + (t.kich_thuoc - 1) }, tk) });
    if (r.getResponseCode() === 200 || r.getResponseCode() === 206) kq = { b64: Utilities.base64Encode(r.getContent()), mime: t.mime };
  }
  if (!kq) return { chua: true };
  try { const sx = JSON.stringify(kq); if (sx.length < 95000) c.put(k, sx, 21600); } catch (e) {}
  return kq;
};
/* tải tệp dưới 50 MB qua app, từng phần 8 MB */
API_.taiPhanTep = function (d, me) {
  const t = bang_('Tep').rows.filter(function (r) { return r.id === Number(d.id); })[0];
  if (!t) loi_('Không thấy tệp.');
  xemTep_(t, me);
  if (t.kich_thuoc >= OH.TEP_LINK) return { link: t.link || ('https://drive.google.com/file/d/' + t.drive_id + '/view') };
  const bd = Number(d.bat_dau || 0), kt = Math.min(t.kich_thuoc, bd + OH.PHAN_TAI) - 1;
  const r = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + t.drive_id + '?alt=media', { muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), Range: 'bytes=' + bd + '-' + kt } });
  if (r.getResponseCode() !== 200 && r.getResponseCode() !== 206) loi_('Không đọc được tệp (' + r.getResponseCode() + ').');
  return { b64: Utilities.base64Encode(r.getContent()), tiep: kt + 1 < t.kich_thuoc ? kt + 1 : null, tong: t.kich_thuoc, ten: t.ten, mime: t.mime };
};

/* ---------- xuất Excel thống kê việc ---------- */
API_.xuatThongKe = function (d, me) {
  canQuyen_(me, 'xuat_excel', 'xuất Excel thống kê');
  const rows = bang_('Viec').rows.filter(function (t) { return xemHet_(me) || t.nguoi_nhan === me.ten_dn || t.nguoi_giao === me.ten_dn; });
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
  boNho_(ten);
  const T = bang_(ten), r = T.sh.getLastRow() + 1;
  T.sh.getRange(r, 1, 1, T.cot.length).setValues([dong_(ten, o)]);
  o._r = r; T.rows.push(o);
  return o;
}
function ghiDong_(T, o) { boNho_(T.ten); T.sh.getRange(o._r, 1, 1, T.cot.length).setValues([dong_(T.ten, o)]); }
function xoaDong_(T, list) {
  boNho_(T.ten);
  list.map(function (o) { return o._r; }).sort(function (a, b) { return b - a; }).forEach(function (r) { T.sh.deleteRow(r); });
  delete BANG_[T.ten];
}
function khoa_(fn) {
  const L = LockService.getScriptLock();
  if (!L.tryLock(20000)) loi_('App đang bận, bạn thử lại sau vài giây nha.');
  try { BANG_ = {}; return fn(); } finally { SpreadsheetApp.flush(); L.releaseLock(); doiBan_(); }
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
  const c = CacheService.getScriptCache(), ks = ['v_nguoi', 'v_ht', 'v_tin', 'v_viec', 'v_doc'], got = c.getAll(ks), kq = {};
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
function quyenCua_(u) {
  if (u.vai_tro === 'quan_tri') return OH.QUYEN.slice();
  if (!u.quyen) return OH.MAU.du.slice();
  return String(u.quyen).split(',').filter(function (k) { return OH.QUYEN.indexOf(k) >= 0; });
}
function coQuyen_(u, k) { return quyenCua_(u).indexOf(k) >= 0; }
function canQuyen_(u, k, viec) { if (!coQuyen_(u, k)) loi_('Tài khoản của bạn chưa được bật quyền ' + viec + ', bạn nhắn quản trị nha.'); }
/* quyền chọn khi cấp, duyệt, phân quyền: phụ quản trị chỉ chọn 3 mẫu; lưu 'khong' khi tắt hết */
function quyenChon_(d, me) {
  let q;
  if (d.mau) { if (!OH.MAU[d.mau]) loi_('Mẫu quyền không có.'); q = OH.MAU[d.mau].slice(); }
  else if (Array.isArray(d.quyen) && me.vai_tro === 'quan_tri') q = OH.QUYEN.filter(function (k) { return d.quyen.indexOf(k) >= 0; });
  else q = OH.MAU.co_ban.slice();
  if (d.mau && me.vai_tro === 'quan_tri' && d.phu_qt) q.push('phu_qt');
  return q.length ? q.join(',') : 'khong';
}
function cotQuyen_() { damBaoCot_('NguoiDung', 'quyen'); damBaoCot_('NguoiDung', 'ghi_chu'); }
function hetHanDk_(u) { return u.trang_thai === 'cho_duyet' && Date.now() - Number(u.tao_luc || 0) > OH.DK_HET_HAN; }
function dungLaiDuoc_(u) { return u.trang_thai === 'tu_choi' || hetHanDk_(u); }
function chanPhuQt_(u, me) { if (me.vai_tro !== 'quan_tri' && u.vai_tro === 'quan_tri') loi_('Phụ quản trị không làm được việc này với tài khoản quản trị.'); }
function congKhai_(u) { return { ten_dn: u.ten_dn, ho_ten: u.ho_ten, vai_tro: u.vai_tro, avatar: u.avatar || 'none', khoa: u.trang_thai !== 'dang_dung', da_xoa: u.trang_thai === 'da_xoa' }; }
function tepCongKhai_(t) { return { id: t.id, viec_id: t.viec_id || '', ghi_chu: t.ghi_chu || '', ten: t.ten, mime: t.mime, kich_thuoc: t.kich_thuoc, nguoi_gui: t.nguoi_gui, luc: t.luc, link: t.kich_thuoc >= OH.TEP_LINK ? (t.link || ('https://drive.google.com/file/d/' + t.drive_id + '/view')) : '' }; }
function xacThuc_(token) {
  if (!token) return null;
  const b = bam_('', String(token)), c = CacheService.getScriptCache(), k = 'p:' + b.slice(0, 40);
  let ten = c.get(k);
  if (!ten) {
    const p = bang_('Phien').rows.filter(function (r) { return r.bam_token === b; })[0];
    if (!p || p.het_han < Date.now()) return null;
    ten = p.ten_dn; c.put(k, ten, 600);
  }
  const u = nguoi_().filter(function (r) { return r.ten_dn === ten; })[0];
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
function tenCua_(t) { const u = nguoi_().filter(function (r) { return r.ten_dn === t; })[0]; return u ? ten_(u) : t; }
function hoiThoaiCua_(ten) { return bangNhanh_('HoiThoai').filter(function (h) { return h.loai !== 'nhom_da_xoa' && h.thanh_vien.split(',').indexOf(ten) >= 0; }); }
function hoiThoai_(id, me) {
  const h = bangNhanh_('HoiThoai').filter(function (r) { return r.id === String(id); })[0];
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
/* đang nhắn, đã nhận, đã xem */
function bienNhan_(d, me, v, kq, ht) {
  const c = CacheService.getScriptCache(), now = Date.now();
  // máy này đã nhận tới tin số mấy
  let toi = Number(d.sau_tin || 0);
  (kq.tin || []).forEach(function (t) { if (t.id > toi) toi = t.id; });
  if (toi && String(toi) !== c.get('nhan:' + me.ten_dn)) c.put('nhan:' + me.ten_dn, String(toi), 21600);
  if (d.go) { try { ghiDangGo_(hoiThoai_(d.go, me).id, me); } catch (e) {} }
  const H = ht || hoiThoaiCua_(me.ten_dn), ai = {};
  H.forEach(function (h) { h.thanh_vien.split(',').forEach(function (t) { if (t && t !== me.ten_dn) ai[t] = 1; }); });
  const ds = Object.keys(ai);
  if (ds.length) {
    const got = c.getAll(ds.map(function (t) { return 'nhan:' + t; }));
    kq.nhan = {}; ds.forEach(function (t) { const x = Number(got['nhan:' + t] || 0); if (x) kq.nhan[t] = x; });
  }
  if (d.mo) {
    const h = H.filter(function (x) { return x.id === String(d.mo); })[0];
    if (h) {
      const tv = h.thanh_vien.split(',').filter(function (t) { return t && t !== me.ten_dn; }), g = c.getAll(tv.map(function (t) { return 'go:' + h.id + ':' + t; }));
      kq.go = { h: h.id, ai: tv.filter(function (t) { const x = Number(g['go:' + h.id + ':' + t] || 0); return x && now - x < 7000; }) };
    }
  }
  const can = d.v || {};
  if (!d.v || can.v_doc !== v.v_doc) {
    const ids = {}; H.forEach(function (h) { ids[h.id] = 1; });
    kq.xem = {};
    bang_('DaDoc').rows.forEach(function (r) { if (r.ten_dn !== me.ten_dn && ids[r.hoi_thoai]) (kq.xem[r.hoi_thoai] = kq.xem[r.hoi_thoai] || {})[r.ten_dn] = r.tin_id; });
  }
}
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
  const ds = nguoi_().filter(function (u) { return u.trang_thai === 'dang_dung'; });
  const got = CacheService.getScriptCache().getAll(ds.map(function (u) { return 'on:' + u.ten_dn; })), kq = {};
  ds.forEach(function (u) { const x = Number(got['on:' + u.ten_dn] || 0) || u.hoat_dong || u.dang_nhap_cuoi || 0; if (x) kq[u.ten_dn] = x; });
  return kq;
}
/* danh sách người dùng giữ trong chỗ nhớ tạm (không có muối, băm) để mỗi lần đồng bộ khỏi đọc sheet */
function nguoi_() { return bangNhanh_('NguoiDung'); }
function bangNhanh_(ten) {
  if (BANG_[ten]) return BANG_[ten].rows;
  const c = CacheService.getScriptCache(), k = 'bn:' + ten + ':' + phienBan_()[BAN_THEO_[ten]], x = c.get(k);
  if (x) { try { return JSON.parse(x); } catch (e) {} }
  const rows = bang_(ten).rows;
  try { c.put(k, JSON.stringify(rows.map(function (u) { const o = {}; Object.keys(u).forEach(function (k) { if (k !== 'muoi' && k !== 'bam') o[k] = u[k]; }); return o; })), 21600); } catch (e) {}
  return rows;
}
/* bảng nào bị ghi thì sau khi ghi xong đổi số phiên bản, chỗ nhớ tạm theo phiên bản cũ tự bỏ */
const BAN_THEO_ = { NguoiDung: 'v_nguoi', HoiThoai: 'v_ht' };
let BAN_DOI_ = {};
function boNho_(ten) { if (BAN_THEO_[ten]) BAN_DOI_[ten] = 1; }
function doiBan_() { const l = Object.keys(BAN_DOI_); BAN_DOI_ = {}; l.forEach(function (t) { danhDau_(BAN_THEO_[t]); }); }
/* đang nhắn: giữ 8 giây trong chỗ nhớ tạm */
function ghiDangGo_(hId, me) { CacheService.getScriptCache().put('go:' + hId + ':' + me.ten_dn, String(Date.now()), 8); }
function soO_() { let n = 0; ss_().getSheets().forEach(function (s) { n += s.getMaxRows() * s.getMaxColumns(); }); return n; }
