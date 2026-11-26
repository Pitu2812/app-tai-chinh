# Sinh app-thong-bao/script/mau-data.js tu thu muc app-thong-bao/mau/ (mau Word, Excel, danh muc 96 xa phuong).
# Chay lai moi khi doi mau:  python3 app-thong-bao/build-mau.py
import base64, json, os, datetime
D = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(D, 'mau')
files = {}
for n in sorted(os.listdir(M)):
    if n.endswith(('.docx', '.xlsx')):
        files[n] = base64.b64encode(open(os.path.join(M, n), 'rb').read()).decode()
dm = json.load(open(os.path.join(M, 'danh-muc.json'), encoding='utf8'))
data = {'files': files, 'danhMuc': dm, 'ngay': datetime.date.today().isoformat()}
js = '// Tep sinh tu dong boi app-thong-bao/build-mau.py, khong sua tay.\nvar MAU_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n'
open(os.path.join(D, 'script', 'mau-data.js'), 'w', encoding='utf8').write(js)
print('mau-data.js', len(js), 'ky tu,', len(files), 'mau,', len(dm), 'xa phuong')
