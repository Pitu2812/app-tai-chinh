/**
 * GSPA: dựng Google Sheet "Chọn phương án phân cấp 2027" từ số app phân cấp.
 * Bố cục 7 sheet H đã duyệt (09/11/2026, trang https://claude.ai/artifact/Bf3rwxUyeUY9p3dH5G8eDd).
 * Chỉ một chiều: app -> Google Sheet.
 *
 * Gồm 2 phần:
 *  - GSPA.layout(data, opt): hàm thuần (không gọi Google), trả bố cục từng sheet. Chạy được trong node để kiểm.
 *  - GSPA.dung(data): chạy trong Apps Script (server). Tạo bảng tính lần đầu, các lần sau ghi đè chính tệp đó
 *    (id lưu ở ScriptProperties 'GSPA_ID'), sao lưu bản cũ tối đa 1 lần mỗi ngày, chia sẻ quyền sửa cho GSPA.CHIA_SE.
 *    opt.folderId: thư mục Drive để đặt bảng tính lần đầu (ví dụ CFG.XUAT của app). Trả {url, id, moi}.
 *
 * data (giống các tệp ở /mnt/project-files/phan-cap-thu/gs-nguon/):
 *  rows:  so-goc.json rows   [{i, ten, nsnn_tinh, nsnn_xa, ...}]  (74 dòng mẫu, thứ tự app)
 *  khoan: so-goc.json khoan  [{ten, dong:[i...]}]                (19 khoản, thứ tự app)
 *  xa:    so-goc.json xa     [{ten, phuong, nsnn:[74]}]          (96 đơn vị)
 *  btc:   btc.json           {w:[NSNN BTC theo dòng], x:[NSĐP BTC theo dòng]}
 *  pa:    ket-qua-5-pa.json  [{ten, tong, theo_dong:[[tinh,xa,tong]...], theo_xa:[{nsdp:[74]}]}]  (đúng thứ tự PA trong app)
 */
var GSPA = (function () {
  var CHIA_SE = 'vohuy051191@gmail.com';
  var NUM = '#,##0;-#,##0;"−"', NUM0 = '#,##0;-#,##0;0', PCT = '0.000000%', PCT2 = '0.00%';
  var GREEN = '#1d6f42', TOT = '#e6f2ea', YEL = '#fff3bf';

  function col(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function a1(r, c) { return col(c) + r; }

  function Sheet(name) {
    this.name = name; this.cells = {}; this.maxR = 1; this.maxC = 1;
    this.merges = []; this.widths = {}; this.freeze = null; this.styles = {}; this.validation = null; this.charts = []; this.tab = null;
  }
  Sheet.prototype.set = function (r, c, v, fmt) {
    var k = r + ',' + c, o = this.cells[k] || (this.cells[k] = {});
    o.v = v; if (fmt) o.f = fmt;
    if (r > this.maxR) this.maxR = r; if (c > this.maxC) this.maxC = c; return this;
  };
  Sheet.prototype.fmt = function (r, c, fmt) { var k = r + ',' + c; (this.cells[k] || (this.cells[k] = {})).f = fmt; if (r > this.maxR) this.maxR = r; if (c > this.maxC) this.maxC = c; };
  Sheet.prototype.style = function (key, rng) { (this.styles[key] || (this.styles[key] = [])).push(rng); };
  Sheet.prototype.head = function (r, c, v, r2, c2) {
    this.set(r, c, v);
    var rng = (r2 ? a1(r, c) + ':' + a1(r2, c2) : a1(r, c));
    if (r2 && (r2 !== r || c2 !== c)) this.merges.push(rng);
    this.style('head', rng);
  };

  function layout(d, opt) {
    opt = opt || {};
    var rows = d.rows, xa = d.xa, PA = d.pa, btc = d.btc, N = rows.length, NX = xa.length, PAN = PA.length;
    var sel = opt.sel || 1;
    var S1 = new Sheet('Tỷ lệ mẫu'), S2 = new Sheet('Dự toán mẫu'), S3 = new Sheet('Chi tiết xã'), S4 = new Sheet('Biểu đồ so sánh');
    var SK = new Sheet('Khoản'), SP = new Sheet('Dữ liệu PA'), SX = new Sheet('Dữ liệu xã');
    var PAS = "'Tỷ lệ mẫu'!$C$3";
    var BL = N + 1; // khoảng cách khối trong Dữ liệu xã
    function blk(b) { return 5 + BL * b; }
    var C0 = 3, LX = col(C0 + NX - 1);

    // ---- Dữ liệu xã
    SX.set(1, 1, 'Dữ liệu xã, phường: NSNN gốc và NSĐP từng PA do app phân cấp tính (triệu đồng). Tự cập nhật từ app.'); SX.style('bold', 'A1');
    SX.set(2, 1, 'Phường = 1'); SX.set(2, 2, 'Phường (1) / Xã (0)'); SX.set(3, 1, 'i'); SX.set(3, 2, 'Khoản thu');
    xa.forEach(function (x, k) { SX.set(3, C0 + k, x.ten); SX.set(2, C0 + k, x.phuong ? 1 : 0); });
    for (var b = 0; b <= PAN; b++) {
      var r0 = blk(b); SX.set(r0 - 1, 1, b === 0 ? 'NSNN gốc' : 'NSĐP PA ' + b); SX.style('bold', a1(r0 - 1, 1));
      for (var i = 0; i < N; i++) {
        SX.set(r0 + i, 1, i); SX.set(r0 + i, 2, rows[i].ten);
        for (var k = 0; k < NX; k++) {
          var arr = b === 0 ? xa[k].nsnn : PA[b - 1].theo_xa[k].nsdp, v = arr[i];
          if (v !== null && v !== undefined) SX.set(r0 + i, C0 + k, v);
        }
      }
    }
    var cF = "'Dữ liệu xã'!$C$2:$" + LX + "$2";
    function xrow(b, i) { var r = blk(b) + i; return "'Dữ liệu xã'!$C$" + r + ':$' + LX + '$' + r; }

    // ---- Dữ liệu PA
    var P0 = 4;
    SP.set(1, 1, 'Dữ liệu PA: số theo dòng mẫu của app phân cấp. Cột Tỉnh lấy từ app, Phường/Xã cộng từ sheet Dữ liệu xã, Tổng là công thức.'); SP.style('bold', 'A1');
    ['i', 'Khoản thu', 'NSNN tỉnh', 'NSNN phường', 'NSNN xã', 'NSNN cấp xã', 'NSNN tổng', 'BTC giao NSNN', 'BTC giao NSĐP'].forEach(function (t, j) { SP.head(3, j + 1, t); });
    function pc(k, j) { return 10 + 5 * k + j; }
    for (var k2 = 0; k2 < PAN; k2++) ['Tỉnh', 'Phường', 'Xã', 'Cấp xã', 'Tổng'].forEach(function (t, j) { SP.head(3, pc(k2, j), 'PA' + (k2 + 1) + ' ' + t); });
    for (i = 0; i < N; i++) {
      var r = P0 + i, rw = rows[i];
      SP.set(r, 1, i); SP.set(r, 2, rw.ten);
      var has = rw.nsnn_tinh != null || rw.nsnn_xa != null;
      if (rw.nsnn_tinh != null) SP.set(r, 3, rw.nsnn_tinh, NUM);
      if (rw.nsnn_xa != null) {
        SP.set(r, 4, '=SUMPRODUCT(' + xrow(0, i) + ',' + cF + ')', NUM);
        SP.set(r, 5, '=SUMPRODUCT(' + xrow(0, i) + ',1-' + cF + ')', NUM);
        SP.set(r, 6, '=D' + r + '+E' + r, NUM);
      }
      if (has) SP.set(r, 7, '=SUM(C' + r + ',F' + r + ')', NUM);
      if (i < btc.w.length && btc.w[i] != null) SP.set(r, 8, btc.w[i], NUM);
      if (i < btc.x.length && btc.x[i] != null) SP.set(r, 9, btc.x[i], NUM);
      for (k = 0; k < PAN; k++) {
        var td = PA[k].theo_dong[i];
        if (td[0] == null && td[1] == null) continue;
        SP.set(r, pc(k, 0), td[0], NUM);
        SP.set(r, pc(k, 1), '=SUMPRODUCT(' + xrow(k + 1, i) + ',' + cF + ')', NUM);
        SP.set(r, pc(k, 2), '=SUMPRODUCT(' + xrow(k + 1, i) + ',1-' + cF + ')', NUM);
        SP.set(r, pc(k, 3), '=' + col(pc(k, 1)) + r + '+' + col(pc(k, 2)) + r, NUM);
        SP.set(r, pc(k, 4), '=' + col(pc(k, 0)) + r + '+' + col(pc(k, 3)) + r, NUM);
      }
    }
    var LPA = col(pc(PAN - 1, 4));

    // ---- Khoản
    SK.set(1, 1, 'Khoản: cộng từ Dữ liệu PA theo các dòng lá của từng khoản (thứ tự app).'); SK.style('bold', 'A1');
    ['i', 'Khoản thu', 'NSNN tỉnh', 'NSNN phường', 'NSNN xã', 'BTC giao NSNN', 'BTC giao NSĐP'].forEach(function (t, j) { SK.head(3, j + 1, t); });
    for (k = 0; k < PAN; k++) ['Tỉnh', 'Phường', 'Xã', 'Cấp xã', 'Tổng'].forEach(function (t, j) { SK.head(3, 8 + 5 * k + j, 'PA' + (k + 1) + ' ' + t); });
    var K0 = 4;
    function sumcells(c, dongs) { return '=SUM(' + dongs.map(function (dd) { return "'Dữ liệu PA'!" + col(c) + (P0 + dd); }).join(',') + ')'; }
    d.khoan.forEach(function (kk, q) {
      var r = K0 + q; SK.set(r, 1, q); SK.set(r, 2, kk.ten);
      [3, 4, 5, 8, 9].forEach(function (c, j) { SK.set(r, 3 + j, sumcells(c, kk.dong), NUM); });
      for (var k = 0; k < PAN; k++) for (var j = 0; j < 5; j++) SK.set(r, 8 + 5 * k + j, sumcells(pc(k, j), kk.dong), NUM);
    });
    var KT = K0 + d.khoan.length, LK = col(7 + 5 * PAN);
    SK.set(KT, 2, 'Tổng cộng các khoản thu'); SK.style('bold', a1(KT, 2));
    for (var c = 3; c <= 7 + 5 * PAN; c++) SK.set(KT, c, '=SUM(' + col(c) + K0 + ':' + col(c) + (KT - 1) + ')', NUM);
    // dòng khu vực (giống app): khoản có 4 dòng khu vực (GTGT, TNDN, TTĐB, tài nguyên); khu vực ngoài quốc doanh tách
    // doanh nghiệp (= dòng khu vực trừ dòng hộ) và hộ, cá nhân (dòng mục VI). Chỉ để hiển thị, không cộng vào tổng.
    var NQD = { 21: 67, 22: 68, 23: 69, 25: 70 };
    var KVN = ['Khu vực doanh nghiệp nhà nước do Trung ương quản lý', 'Khu vực doanh nghiệp nhà nước do địa phương quản lý',
      'Khu vực doanh nghiệp có vốn đầu tư nước ngoài', 'Khu vực kinh tế ngoài quốc doanh'];
    var KV = {}, kvr = KT + 2;
    SK.set(kvr - 1, 2, 'Dòng khu vực (chỉ hiển thị, không cộng vào tổng)'); SK.style('bold', a1(kvr - 1, 2));
    function lincells(c, plus, minus, btcRow) {
      var ref = function (dd) { return "'Dữ liệu PA'!" + col(c) + (P0 + (btcRow != null ? btcRow : dd)); };
      return '=' + ref(plus) + (minus != null && btcRow == null ? '-' + ref(minus) : '');
    }
    d.khoan.forEach(function (kk, q) {
      var dg = kk.dong || [];
      if (dg.length !== 4 || !NQD[dg[3]] || NQD[dg[3]] >= N) return;
      var hr = NQD[dg[3]], items = [];
      dg.forEach(function (r0, j) { items.push({ ten: KVN[j], d: 1, p: r0 }); });
      items.push({ ten: 'Thu từ doanh nghiệp, tổ chức kinh doanh', d: 2, p: dg[3], m: hr, b: dg[3] });
      items.push({ ten: 'Thu từ cá nhân, hộ gia đình, hộ kinh doanh', d: 2, p: hr, b: dg[3] });
      KV[q] = [];
      items.forEach(function (it) {
        var r = kvr++; SK.set(r, 1, q); SK.set(r, 2, (it.d === 2 ? '    + ' : '  - ') + it.ten);
        [3, 4, 5].forEach(function (c, j) { SK.set(r, 3 + j, lincells(c, it.p, it.m), NUM); });
        [8, 9].forEach(function (c, j) { SK.set(r, 6 + j, lincells(c, it.p, null, it.b != null ? it.b : it.p), NUM); });
        for (var k = 0; k < PAN; k++) for (var j = 0; j < 5; j++) SK.set(r, 8 + 5 * k + j, lincells(pc(k, j), it.p, it.m), NUM);
        KV[q].push({ row: r, ten: it.ten, d: it.d });
      });
    });

    // ---- Sheet 1: Tỷ lệ mẫu
    S1.set(1, 1, 'TỶ LỆ PHÂN CHIA VÀ THU NSĐP 2027 THEO PHƯƠNG ÁN'); S1.style('title', 'A1');
    S1.set(3, 1, 'Phương án đang chọn (bấm ô vàng để chọn)'); S1.style('bold', 'A3');
    S1.set(3, 3, sel); S1.style('pick', 'C3');
    var list = []; for (k = 1; k <= PAN; k++) list.push(String(k));
    S1.validation = { cell: 'C3', list: list };
    S1.set(3, 4, '=CHOOSE(C3,' + PA.map(function (p) { return '"' + String(p.ten || '').replace(/"/g, '') + '"'; }).join(',') + ')'); S1.style('italic', 'D3');
    S1.head(5, 1, 'Khoản thu', 6, 1); S1.head(5, 2, 'Tỷ lệ BTC', 5, 3); S1.head(5, 4, 'Đặt tỷ lệ NSĐP hưởng', 5, 7);
    S1.head(5, 8, 'Thu NSĐP 2027', 5, 10); S1.head(5, 11, 'Kiểm tra khớp', 6, 11);
    ['TW', 'ĐP', 'TW', 'Tỉnh', 'Phường', 'Xã', 'Tổng', 'Tỉnh', '96 xã'].forEach(function (t, j) { S1.head(6, 2 + j, t); });
    function selk(row, j) { return 'INDEX(Khoản!$H' + row + ':$' + LK + row + ',1,(' + PAS + '-1)*5+' + j + ')'; }
    function put1(r, row, name, isTot) {
      var t = 'Khoản!$C' + row, p = 'Khoản!$D' + row, x = 'Khoản!$E' + row;
      S1.set(r, 1, name);
      // dòng tổng lấy tỷ lệ BTC của dòng tổng mẫu (dòng 0), giống app; các khoản lấy theo cộng dòng lá
      var bw = isTot ? "'Dữ liệu PA'!$H$" + P0 : 'Khoản!$F' + row, bx = isTot ? "'Dữ liệu PA'!$I$" + P0 : 'Khoản!$G' + row;
      S1.set(r, 2, '=IF(' + bw + '=0,"",1-' + bx + '/' + bw + ')', PCT);
      S1.set(r, 3, '=IF(' + bw + '=0,"",' + bx + '/' + bw + ')', PCT);
      S1.set(r, 4, '=IF((' + t + '+' + p + '+' + x + ')=0,"",1-' + selk(row, 5) + '/(' + t + '+' + p + '+' + x + '))', PCT);
      S1.set(r, 5, '=IF(' + t + '=0,"",' + selk(row, 1) + '/' + t + ')', PCT);
      S1.set(r, 6, '=IF(' + p + '=0,"",' + selk(row, 2) + '/' + p + ')', PCT);
      S1.set(r, 7, '=IF(' + x + '=0,"",' + selk(row, 3) + '/' + x + ')', PCT);
      S1.set(r, 8, '=' + selk(row, 5), NUM); S1.set(r, 9, '=' + selk(row, 1), NUM); S1.set(r, 10, '=' + selk(row, 4), NUM);
      S1.set(r, 11, '=IF(H' + r + '-I' + r + '-J' + r + '=0,"✓","lệch "&TEXT(H' + r + '-I' + r + '-J' + r + ',"#,##0"))');
      S1.style('grid', 'A' + r + ':K' + r); if (isTot) S1.style('tot', 'A' + r + ':K' + r);
    }
    put1(7, KT, 'Tổng cộng các khoản thu', true);
    var r1 = 8;
    d.khoan.forEach(function (kk, q) {
      put1(r1++, K0 + q, (q + 1) + '. ' + kk.ten); S1.style('bold', 'A' + (r1 - 1));
      (KV[q] || []).forEach(function (it) {
        put1(r1, it.row, (it.d === 2 ? '        + ' : '    - ') + it.ten);
        S1.style(it.d === 2 ? 'sub2' : 'sub', 'A' + r1 + ':K' + r1); r1++;
      });
    });
    var nr = r1 + 1;
    S1.set(nr, 1, 'Ghi chú: ô vàng C3 là ô chọn phương án. Tỷ lệ NSĐP hưởng là tỷ lệ thực của PA đang chọn = NSĐP do app tính / thu NSNN; TW = 1 − NSĐP tổng / NSNN tổng. Kiểm tra khớp: Tỉnh + 96 xã = Tổng. Dòng khu vực (chữ nhạt, thụt vào) giống app, chỉ để xem, không cộng vào tổng; khu vực ngoài quốc doanh tách doanh nghiệp và hộ, cá nhân.');
    S1.style('wrap', 'A' + nr); // không hợp nhất ô ghi chú: hợp nhất cắt ngang cột cố định A sẽ làm Google báo lỗi
    S1.widths = { 1: 360 }; for (c = 2; c <= 11; c++) S1.widths[c] = 100; S1.freeze = [6, 1];

    // ---- Sheet 2: Dự toán mẫu
    S2.set(1, 1, 'DỰ TOÁN THU 2027 THEO KHOẢN THU, PHƯƠNG ÁN ĐANG CHỌN'); S2.style('title', 'A1');
    S2.set(2, 1, 'Phương án:'); S2.set(2, 2, '=' + PAS); S2.set(2, 3, "='Tỷ lệ mẫu'!D3"); S2.style('red', 'B2');
    S2.head(4, 1, 'Khoản thu', 5, 1); S2.head(4, 2, 'Bộ Tài chính giao', 4, 3); S2.head(4, 4, 'DT thu NSNN 2027 (ĐP)', 4, 6);
    S2.head(4, 7, 'Thu NSĐP hưởng theo phương án', 4, 11); S2.head(4, 12, 'Chênh NSĐP so với BTC', 4, 13); S2.head(4, 14, 'Tỷ lệ NSĐP / thu NSNN', 4, 16);
    ['Thu NSNN', 'Thu NSĐP', 'Tổng', 'Tỉnh', 'Cấp xã', 'Tổng', 'Tỉnh', 'Cấp xã', 'Phường', 'Xã', 'Tuyệt đối', 'Tương đối', 'BTC', 'PA', 'Chênh (điểm %)'].forEach(function (t, j) { S2.head(5, 2 + j, t); });
    function selp(r, j) { return "INDEX('Dữ liệu PA'!$J" + r + ':$' + LPA + r + ',1,(' + PAS + '-1)*5+' + j + ')'; }
    var BOLD2 = { 3: 1, 14: 1, 20: 1, 31: 1, 33: 1, 35: 1, 37: 1, 39: 1, 42: 1, 45: 1, 49: 1, 50: 1 };
    for (i = 0; i < N; i++) {
      var r2 = 6 + i, pr = P0 + i, rw2 = rows[i];
      S2.set(r2, 1, rw2.ten);
      var hasN = rw2.nsnn_tinh != null || rw2.nsnn_xa != null;
      var hb = i < btc.w.length && btc.w[i] != null, hx = i < btc.x.length && btc.x[i] != null;
      if (hb) S2.set(r2, 2, "='Dữ liệu PA'!H" + pr, NUM);
      if (hx) S2.set(r2, 3, "='Dữ liệu PA'!I" + pr, NUM);
      if (hasN) { S2.set(r2, 4, "='Dữ liệu PA'!G" + pr, NUM); S2.set(r2, 5, "='Dữ liệu PA'!C" + pr, NUM); S2.set(r2, 6, "='Dữ liệu PA'!F" + pr, NUM); }
      if (PA[0].theo_dong[i][0] != null) {
        S2.set(r2, 7, '=' + selp(pr, 5), NUM); S2.set(r2, 8, '=' + selp(pr, 1), NUM); S2.set(r2, 9, '=' + selp(pr, 4), NUM);
        S2.set(r2, 10, '=' + selp(pr, 2), NUM); S2.set(r2, 11, '=' + selp(pr, 3), NUM);
        if (hx) { S2.set(r2, 12, '=G' + r2 + '-C' + r2, NUM); S2.set(r2, 13, '=IF(C' + r2 + '=0,"",L' + r2 + '/C' + r2 + ')', '0.0000%'); }
        if (hb && hx) {
          S2.set(r2, 14, '=IF(B' + r2 + '=0,"",C' + r2 + '/B' + r2 + ')', PCT2); S2.set(r2, 15, '=IF(D' + r2 + '=0,"",G' + r2 + '/D' + r2 + ')', PCT2);
          S2.set(r2, 16, '=IF(OR(N' + r2 + '="",O' + r2 + '=""),"",(O' + r2 + '-N' + r2 + ')*100)', '+0.00;-0.00;0.00');
        }
      }
      S2.style('grid', 'A' + r2 + ':P' + r2);
      if (i <= 2) S2.style('tot', 'A' + r2 + ':P' + r2); else if (BOLD2[i]) S2.style('bold', 'A' + r2 + ':P' + r2);
    }
    var rt = 6 + N + 1;
    S2.set(rt, 1, 'Kiểm tra: Tỉnh + Cấp xã = Tổng (dòng tổng)'); S2.set(rt, 7, '=IF(H6+I6-G6=0,"✓ khớp","lệch "&TEXT(H6+I6-G6,"#,##0"))');
    S2.set(rt + 1, 1, 'Kiểm tra: Phường + Xã = Cấp xã (dòng tổng)'); S2.set(rt + 1, 9, '=IF(J6+K6-I6=0,"✓ khớp","lệch "&TEXT(J6+K6-I6,"#,##0"))');
    S2.widths = { 1: 400 }; for (c = 2; c <= 16; c++) S2.widths[c] = 100; S2.freeze = [5, 1];

    // ---- Sheet 3: Chi tiết xã
    S3.set(1, 1, 'CHI TIẾT TỪNG XÃ, PHƯỜNG THEO PHƯƠNG ÁN ĐANG CHỌN'); S3.style('title', 'A1');
    S3.set(2, 1, 'Phương án:'); S3.set(2, 2, '=' + PAS); S3.set(2, 3, "='Tỷ lệ mẫu'!D3"); S3.style('red', 'B2');
    S3.head(4, 1, 'Khoản thu', 5, 1); S3.head(4, 2, 'Tổng cộng ' + NX + ' xã, phường', 4, 3); S3.head(5, 2, 'DT 2027 NSNN'); S3.head(5, 3, 'DT 2027 NSĐP');
    var LC3 = col(3 + 2 * NX);
    xa.forEach(function (x, k) { var c = 4 + 2 * k; S3.head(4, c, (k + 1) + '. ' + x.ten, 4, c + 1); S3.head(5, c, 'DT 2027 NSNN'); S3.head(5, c + 1, 'DT 2027 NSĐP'); });
    for (i = 0; i < N; i++) {
      var r3 = 6 + i; S3.set(r3, 1, rows[i].ten);
      for (k = 0; k < NX; k++) {
        var cc = 4 + 2 * k, xc = col(C0 + k);
        S3.set(r3, cc, "='Dữ liệu xã'!" + xc + (blk(0) + i), NUM);
        S3.set(r3, cc + 1, "=INDEX('Dữ liệu xã'!" + xc + '$' + blk(1) + ':' + xc + '$' + (blk(PAN) + N - 1) + ',(' + PAS + '-1)*' + BL + '+' + (i + 1) + ')', NUM);
      }
      S3.set(r3, 2, '=SUMPRODUCT(--(MOD(COLUMN($D' + r3 + ':$' + LC3 + r3 + '),2)=0),$D' + r3 + ':$' + LC3 + r3 + ')', NUM);
      S3.set(r3, 3, '=SUMPRODUCT(--(MOD(COLUMN($D' + r3 + ':$' + LC3 + r3 + '),2)=1),$D' + r3 + ':$' + LC3 + r3 + ')', NUM);
      if (i <= 2) S3.style('tot', 'A' + r3 + ':' + LC3 + r3);
    }
    S3.set(6 + N + 1, 1, 'Kiểm tra: tổng NSĐP ' + NX + ' xã so với sheet Dự toán mẫu (dòng tổng)');
    S3.set(6 + N + 1, 3, "=IF(C6-'Dự toán mẫu'!I6=0,\"✓ khớp\",\"lệch \"&TEXT(C6-'Dự toán mẫu'!I6,\"#,##0\"))");
    S3.widths = { 1: 400 }; for (c = 2; c <= 3 + 2 * NX; c++) S3.widths[c] = 100; S3.freeze = [5, 3];

    // ---- Sheet 4: Biểu đồ so sánh
    S4.set(1, 1, 'SO SÁNH TOÀN BỘ CÁC PHƯƠNG ÁN (không đổi theo ô chọn)'); S4.style('title', 'A1');
    ['Phương án', 'Tổng NSĐP', 'Tỉnh', 'Cấp xã', 'Chênh BTC (tuyệt đối)', 'Chênh BTC (%)', 'Chênh so PA 1', 'Tỷ trọng tỉnh', 'Tỷ trọng xã', 'Số app tính', 'Lệch so app', 'Cân đối tỉnh + xã'].forEach(function (t, j) { S4.head(3, 1 + j, t); });
    for (k = 0; k < PAN; k++) {
      var r4 = 4 + k;
      S4.set(r4, 1, 'PA ' + (k + 1));
      S4.set(r4, 2, "='Dữ liệu PA'!" + col(pc(k, 4)) + P0, NUM0); S4.set(r4, 3, "='Dữ liệu PA'!" + col(pc(k, 0)) + P0, NUM0); S4.set(r4, 4, "='Dữ liệu PA'!" + col(pc(k, 3)) + P0, NUM0);
      S4.set(r4, 5, "=B" + r4 + "-'Dữ liệu PA'!$I$" + P0, NUM0); S4.set(r4, 6, '=E' + r4 + "/'Dữ liệu PA'!$I$" + P0, '0.0000%'); S4.set(r4, 7, '=B' + r4 + '-$B$4', NUM0);
      S4.set(r4, 8, '=C' + r4 + '/B' + r4, PCT2); S4.set(r4, 9, '=D' + r4 + '/B' + r4, PCT2); S4.set(r4, 10, PA[k].tong, NUM0); S4.set(r4, 11, '=B' + r4 + '-J' + r4, NUM0);
      S4.set(r4, 12, '=IF(C' + r4 + '+D' + r4 + '=B' + r4 + ',"✓","lệch")'); S4.style('grid', 'A' + r4 + ':L' + r4);
    }
    var rb = 4 + PAN + 1;
    S4.set(rb, 1, 'BTC giao NSĐP:'); S4.set(rb, 2, "='Dữ liệu PA'!I" + P0, NUM0);
    S4.set(rb + 1, 1, 'Chênh so BTC là số tuyệt đối (triệu đồng), dương là cao hơn BTC giao. Cột "Số app tính" là số app phân cấp tính lúc cập nhật, cột Lệch phải bằng 0.');
    var top = rb + 4, H = 22;
    for (k = 0; k < PAN; k++) {
      var rowA = top + H * Math.floor(k / 2), ci = (k % 2) ? 10 : 1;
      S4.set(rowA, ci, 'Phương án ' + (k + 1)); S4.style('h2', a1(rowA, ci));
      S4.set(rowA + 1, ci, 'Tỉnh'); S4.set(rowA + 1, ci + 1, '=C' + (4 + k), NUM0);
      S4.set(rowA + 2, ci, 'Xã, phường'); S4.set(rowA + 2, ci + 1, '=D' + (4 + k), NUM0);
      S4.set(rowA + 3, ci, 'Tổng'); S4.set(rowA + 3, ci + 1, '=B' + (4 + k), NUM0);
      S4.set(rowA + 4, ci, 'Lệch BTC'); S4.set(rowA + 4, ci + 1, '=E' + (4 + k), NUM0);
      S4.set(rowA + 5, ci, 'Lệch PA 1'); S4.set(rowA + 5, ci + 1, '=G' + (4 + k), NUM0);
      S4.charts.push({ title: 'Cơ cấu thu NSĐP 2027 · PA ' + (k + 1), range: a1(rowA + 1, ci) + ':' + a1(rowA + 2, ci + 1), row: rowA + 7, col: ci, colors: ['#2f5fc4', '#3c9d6b'] });
    }
    S4.widths = { 1: 110 }; for (c = 2; c <= 18; c++) S4.widths[c] = 110;

    [S1, S2, S3, S4, SK, SP, SX].forEach(function (S) { if (!S.freeze) return; S.merges.forEach(function (m) {
      var mm = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(m); if (!mm) return;
      function cn(t) { var n = 0; for (var i = 0; i < t.length; i++) n = n * 26 + t.charCodeAt(i) - 64; return n; }
      var c1 = cn(mm[1]), c2 = cn(mm[3]), r1 = +mm[2], r2 = +mm[4], fr = S.freeze[0], fc = S.freeze[1];
      if ((c1 <= fc && c2 > fc) || (r1 <= fr && r2 > fr)) throw new Error('GSPA: ô hợp nhất ' + m + ' cắt ngang vùng cố định ở sheet ' + S.name);
    }); });
    S1.tab = S2.tab = S3.tab = GREEN; S4.tab = '#2f5fc4'; SK.tab = SP.tab = SX.tab = '#999999';
    return [S1, S2, S3, S4, SK, SP, SX];
  }

  // ---------- Apps Script ----------
  function render(ss, sheets) {
    var STY = {
      head: function (r) { r.setBackground(GREEN).setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true); },
      tot: function (r) { r.setBackground(TOT).setFontWeight('bold'); },
      bold: function (r) { r.setFontWeight('bold'); },
      italic: function (r) { r.setFontStyle('italic'); },
      title: function (r) { r.setFontWeight('bold').setFontSize(14); },
      h2: function (r) { r.setFontWeight('bold').setFontSize(12); },
      red: function (r) { r.setFontWeight('bold').setFontSize(12).setFontColor('#b3261e'); },
      pick: function (r) { r.setBackground(YEL).setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center'); },
      wrap: function (r) { r.setWrap(true); },
      sub: function (r) { r.setFontColor('#3d4b5c'); },
      sub2: function (r) { r.setFontColor('#5a6b82').setFontStyle('italic'); },
      grid: function (r) { r.setBorder(true, true, true, true, true, true, '#dfe4de', SpreadsheetApp.BorderStyle.SOLID); }
    };
    sheets.forEach(function (S, idx) {
      var sh = ss.getSheetByName(S.name) || ss.insertSheet(S.name, idx);
      sh.getCharts().forEach(function (c) { sh.removeChart(c); });
      sh.setFrozenRows(0); sh.setFrozenColumns(0);
      sh.clear(); sh.clearConditionalFormatRules();
      try { sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart().clearDataValidations(); } catch (e) {}
      if (sh.getMaxRows() < S.maxR) sh.insertRowsAfter(sh.getMaxRows(), S.maxR - sh.getMaxRows());
      if (sh.getMaxColumns() < S.maxC) sh.insertColumnsAfter(sh.getMaxColumns(), S.maxC - sh.getMaxColumns());
      var vals = [], fmts = [];
      for (var r = 1; r <= S.maxR; r++) {
        var vr = [], fr = [];
        for (var c = 1; c <= S.maxC; c++) { var o = S.cells[r + ',' + c]; vr.push(o && o.v !== undefined && o.v !== null ? o.v : ''); fr.push(o && o.f ? o.f : 'General'); }
        vals.push(vr); fmts.push(fr);
      }
      var rg = sh.getRange(1, 1, S.maxR, S.maxC);
      rg.setNumberFormats(fmts); rg.setValues(vals);
      S.merges.forEach(function (m) { sh.getRange(m).merge(); });
      Object.keys(S.styles).forEach(function (k) { if (STY[k]) STY[k](sh.getRangeList(S.styles[k])); });
      Object.keys(S.widths).forEach(function (c) { sh.setColumnWidth(+c, S.widths[c]); });
      if (S.freeze) { sh.setFrozenRows(S.freeze[0]); sh.setFrozenColumns(S.freeze[1]); }
      if (S.validation) sh.getRange(S.validation.cell).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(S.validation.list, true).setAllowInvalid(false).build());
      if (S.tab) sh.setTabColor(S.tab);
      S.charts.forEach(function (ch) {
        sh.insertChart(sh.newChart().setChartType(Charts.ChartType.PIE).addRange(sh.getRange(ch.range))
          .setOption('title', ch.title).setOption('pieHole', 0.55).setOption('colors', ch.colors).setOption('legend', { position: 'right' })
          .setOption('pieSliceText', 'percentage').setOption('width', 520).setOption('height', 300)
          .setPosition(ch.row, ch.col, 0, 0).build());
      });
    });
    var keep = {}; sheets.forEach(function (S) { keep[S.name] = 1; });
    ss.getSheets().forEach(function (sh) { if (!keep[sh.getName()] && sh.getName() !== 'Ghi chú của bạn' && ss.getSheets().length > 1) ss.deleteSheet(sh); });
    if (!ss.getSheetByName('Ghi chú của bạn')) ss.insertSheet('Ghi chú của bạn').getRange('A1').setValue('Sheet này để bạn ghi chú, không bao giờ bị ghi đè khi app cập nhật.');
    ss.setActiveSheet(ss.getSheetByName(sheets[0].name));
  }

  function dung(data, opt) {
    opt = opt || {};
    var lock = LockService.getScriptLock(); lock.waitLock(60000);
    try {
      var props = PropertiesService.getScriptProperties(), id = props.getProperty('GSPA_ID'), ss = null, moi = false;
      if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
      if (!ss) {
        ss = SpreadsheetApp.create('Chọn phương án phân cấp 2027'); moi = true; props.setProperty('GSPA_ID', ss.getId());
        try { DriveApp.getFileById(ss.getId()).addEditor(CHIA_SE); } catch (e) {}
        if (opt.folderId) { try { DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(opt.folderId)); } catch (e) {} }
      } else {
        var today = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
        if (props.getProperty('GSPA_BACKUP') !== today) {
          DriveApp.getFileById(ss.getId()).makeCopy('Chọn phương án phân cấp 2027 (bản cũ ' + today + ')');
          props.setProperty('GSPA_BACKUP', today);
        }
      }
      var cur = ss.getSheetByName('Tỷ lệ mẫu'), sel = cur ? Number(cur.getRange('C3').getValue()) || 1 : 1;
      if (sel > data.pa.length) sel = 1;
      render(ss, layout(data, { sel: opt.sel || sel }));
      SpreadsheetApp.flush();
      props.setProperty('GSPA_LAST', new Date().toISOString());
      return { url: ss.getUrl(), id: ss.getId(), moi: moi };
    } finally { lock.releaseLock(); }
  }

  return { layout: layout, dung: dung, render: render, CHIA_SE: CHIA_SE };
})();

if (typeof module !== 'undefined') module.exports = GSPA;
