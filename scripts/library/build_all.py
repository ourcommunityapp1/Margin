"""Build per-book JSON data for the Margin prototype.

Usage: build_all.py BSB_DIR KJV_CANON MHCC_KJV TDAVID_KJV CATENA_XML HCF_ROOT OUT_DIR
Writes OUT_DIR/<CODE>[.<part>].json and OUT_DIR/index.json.
"""
import html
import json
import os
import re
import sys
import tomllib
import unicodedata

bsb_dir, canon_path, mhcc_path, tdavid_path, catena_path, hcf_root, out_dir = sys.argv[1:8]
os.makedirs(out_dir, exist_ok=True)

CODES = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
NAMES = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Songs', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation']
GOSPELS = {39, 40, 41, 42}
canon = json.load(open(canon_path))
KJV = [b[2] for b in canon['ot'] + canon['nt']]  # verse counts per chapter


def plain(osis):
    s = re.sub(r'<note\b.*?</note>', '', osis, flags=re.S)
    s = re.sub(r'<div[^>]*type="x-p"[^>]*/>', '\n\n', s)
    s = re.sub(r'<lb\s*/>', '\n', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)
    s = re.sub(r'[ \t\r\f\v]+', ' ', s)
    s = re.sub(r' *\n[\s]*', '\n', s)
    s = re.sub(r'\n{2,}', '\n\n', s)
    s = re.sub(r'(?<!\n)\n(?!\n)', '\n\n', s)
    return s.strip()


def clip(text, limit):
    w = text.split(' ')
    if len(w) <= limit:
        return text, False
    cut = ' '.join(w[:limit])
    end = max(cut.rfind('. '), cut.rfind('? '), cut.rfind('! '))
    if end > len(cut) * 0.5:
        cut = cut[:end + 1]
    return cut, True


def parse_range(s):
    nums = [int(n) for n in re.findall(r'\d+', s)]
    if not nums:
        return None
    return nums[0], max(nums)


# ---------- BSB ----------
have = {}
refs = open(bsb_dir + '/vref.txt', encoding='utf-8').read().split('\n')
txts = open(bsb_dir + '/eng-engbsb.txt', encoding='utf-8').read().split('\n')
for ref, txt in zip(refs, txts):
    if ref.strip() and txt.strip():
        b, cv = ref.split(' ')
        c, v = cv.split(':')
        have[(b, int(c), int(v))] = txt.strip()
# The eBible file follows the original-language verse numbering, so 136 English verses with no
# slot there (Malachi 4, Joel 2:28-32, Numbers 16:36-50 and others) come through empty. An
# English-numbered copy of the same translation (scrollmapper's BSB.json) fills them if present.
fill_path = os.path.join(bsb_dir, 'BSB.json')
if os.path.exists(fill_path):
    for fbi, fbook in enumerate(json.load(open(fill_path, encoding='utf-8'))['books']):
        for fch in fbook['chapters']:
            for fv in fch['verses']:
                key = (CODES[fbi], int(fch['chapter']), int(fv['verse']))
                text = re.sub(r'\s+', ' ', unicodedata.normalize('NFC', fv['text'])).strip()
                if text and key not in have:
                    have[key] = text

# ---------- Henry (MHCC) ----------
mh = json.load(open(mhcc_path, encoding='utf-8'))
HEAD = re.compile(r'<hi type="bold">\s*Verses?\s*([\d\s,\-–]+?)\.?\s*</hi>')


def henry_book(bi):
    book = mh.get(str(bi), {})
    out = {'i': '', 'c': {}}
    for ch in range(1, len(KJV[bi]) + 1):
        nv = KJV[bi][ch - 1]
        entries = book.get(str(ch), [])
        res = {'o': [], 's': '', 'x': []}
        explicit = []
        for a, b, t in entries:
            s = t
            m = re.search(r'<title type="x-ms">.*?</title>', s)
            if m:
                cpos = s.find('<title type="x-s2">', m.end())
                intro = plain(s[m.end():cpos if cpos >= 0 else len(s)])
                if intro:
                    out['i'] = (out['i'] + '\n\n' + intro).strip()
                s = s[cpos:] if cpos >= 0 else ''
            body_start = None
            mt = re.search(r'<title type="x-s2">[^<]*</title>', s)
            if mt:
                rest = s[mt.end():]
                res['o'] += [[plain(x), y.strip()] for x, y in re.findall(r'<cell>(.*?)</cell>\s*<cell>\((.*?)\)</cell>', rest, re.S)]
                rest = re.sub(r'<table>.*?</table>', ' ', rest, flags=re.S)
                rest = re.sub(r'<title type="x-IS">.*?</title>', ' ', rest)
                hm = HEAD.search(rest)
                if hm:
                    pre, s = rest[:hm.start()], rest[hm.start():]
                else:
                    im = re.search(r'<div sID="[^"]+" type="introduction"/>', rest)
                    pre, s = (rest[:im.start()], rest[im.end():]) if im else ('', rest)
                summ = plain(pre)
                if summ:
                    res['s'] = (res['s'] + ' ' + summ).strip()
            elif a == 0 and ch == 1 and not HEAD.search(s):
                intro = plain(s)
                if intro:
                    out['i'] = (out['i'] + '\n\n' + intro).strip()
                continue
            hm = HEAD.search(s[:600])
            rng = None
            if hm:
                rng = parse_range(hm.group(1))
                s = s[hm.end():]
            text = plain(s)
            if not text:
                continue
            if rng:
                A, B = rng
            else:
                A, B = (a if a > 0 else 1), (b if b > 0 else 1)
            A, B = max(1, min(A, nv)), max(1, min(max(A, B), nv))
            res['x'].append([A, B, text])
            explicit.append(bool(rng))
        # sections without a heading run to the next section (or chapter end)
        for k, sec in enumerate(res['x']):
            if not explicit[k]:
                nxt = res['x'][k + 1][0] - 1 if k + 1 < len(res['x']) else nv
                sec[1] = max(sec[0], nxt)
        if res['x'] or res['o'] or res['s']:
            if not res['o']:
                del res['o']
            if not res['s']:
                del res['s']
            out['c'][str(ch)] = res
    return out


# ---------- Spurgeon (Treasury of David, Psalms) ----------
td = json.load(open(tdavid_path, encoding='utf-8'))
VHEAD = re.compile(r'<hi type="bold">\s*Verses?\s*(\d+)(?:\s*(?:-|–|to|and|,)\s*(\d+))?\.?\s*</hi>')


def spurgeon_book():
    out = {'c': {}}
    ps = td.get('18', {})
    for ch in range(1, 151):
        ents = ps.get(str(ch), [])
        t = ' '.join(e[2] for e in ents)
        if not t.strip():
            continue
        titles = [(m.start(), m.end(), plain(m.group(1)).upper()) for m in re.finditer(r'<title[^>]*>(.*?)</title>', t, re.S)]
        over, exp = [], []
        for i, (st, en, name) in enumerate(titles):
            nxt = titles[i + 1][0] if i + 1 < len(titles) else len(t)
            body = t[en:nxt]
            if 'OVERVIEW' in name or name.startswith('TITLE') or name.startswith('DIVISION'):
                p = plain(body)
                if p:
                    over.append(p)
            elif name.startswith('EXPOSITION'):
                exp.append(body)
        secs = []
        for body in exp:
            parts = VHEAD.split(body)
            for j in range(1, len(parts), 3):
                a = int(parts[j])
                b = int(parts[j + 1]) if parts[j + 1] else a
                text = plain(parts[j + 2])
                if not text:
                    continue
                text, cut = clip(text, 650)
                secs.append([a, max(a, b), text + (' […]' if cut else '')])
        if secs or over:
            o, cut = clip('\n\n'.join(over), 420)
            out['c'][str(ch)] = {'o': o + (' […]' if cut else ''), 'x': secs}
    return out


# ---------- Catena Aurea (Gospels) ----------
OSIS = {'Matt': 39, 'Mark': 40, 'Luke': 41, 'John': 42}
CONNECT = re.compile(r'^(it goes on|there follows|wherefore|hence|as follows|and it follows|it follows|then follows|and then|again)', re.I)
WHO_RULES = [
    (r'^pseudo-chrys', 'pseudo_chrysostom', 'Pseudo-Chrysostom'), (r'^pseudo-jer', 'pseudo_jerome', 'Pseudo-Jerome'),
    (r'^pseudo-orig', 'pseudo_origen', 'Pseudo-Origen'), (r'^pseudo-aug', 'pseudo_augustine', 'Pseudo-Augustine'),
    (r'^chrysol', 'chrysologus', 'Peter Chrysologus'), (r'^chrys', 'chrysostom', 'John Chrysostom'), (r'^aug', 'augustine', 'Augustine'),
    (r'^theoph', 'theophylact', 'Theophylact'), (r'^bede', 'bede', 'Bede'), (r'^(jerome|hieron)', 'jerome', 'Jerome'),
    (r'^orig', 'origen', 'Origen'), (r'^ambr', 'ambrose', 'Ambrose'), (r'^hil', 'hilary', 'Hilary of Poitiers'),
    (r'^remig', 'remigius', 'Remigius'), (r'^greg\w*\.? ?(of )?nyss', 'gregory_nyssa', 'Gregory of Nyssa'),
    (r'^greg\w*\.? ?(of )?naz', 'gregory_naz', 'Gregory of Nazianzus'), (r'^greg', 'gregory', 'Gregory the Great'),
    (r'^cyril', 'cyril', 'Cyril of Alexandria'), (r'^raban', 'rabanus', 'Rabanus Maurus'), (r'^alcuin', 'alcuin', 'Alcuin of York'),
    (r'^gloss', 'gloss', 'The Gloss'), (r'^basil', 'basil', 'Basil the Great'), (r'^a greek', 'greek_expositor', 'A Greek expositor'),
    (r'^euseb', 'eusebius', 'Eusebius'), (r'^titus', 'titus_bostra', 'Titus of Bostra'), (r'^athan', 'athanasius', 'Athanasius'),
    (r'^cypr', 'cyprian', 'Cyprian'), (r'^haymo', 'haymo', 'Haymo'), (r'^maxim', 'maximus', 'Maximus'), (r'^didym', 'didymus', 'Didymus'),
    (r'^leo', 'leo', 'Leo the Great'), (r'^isid', 'isidore', 'Isidore'), (r'^dionys', 'dionysius', 'Dionysius'),
    (r'^damasc', 'damascene', 'John Damascene'), (r'^severian', 'severian', 'Severian'), (r'^beda', 'bede', 'Bede'),
]
SPEAKERS = {}


def norm_who(label):
    lab = re.sub(r'\s+', ' ', label).strip().rstrip(':').strip()
    if not lab or CONNECT.match(lab):
        return None
    low = lab.lower()
    for pat, key, name in WHO_RULES:
        if re.match(pat, low):
            SPEAKERS[key] = name
            return key, lab
    return None


def catena_books():
    xml = open(catena_path, encoding='utf-8').read()
    out = {bi: {'c': {}} for bi in GOSPELS}
    pat = re.compile(r'<div annotateRef="([^"]+)" annotateType="commentary" type="section">(.*?)</div>', re.S)
    for m in pat.finditer(xml):
        ref, body = m.group(1), m.group(2)
        parts = ref.split('-')
        b0, c0, v0 = parts[0].split('.')
        bi = OSIS[b0]
        c0, v0 = int(c0), int(v0)
        if len(parts) > 1:
            b1, c1, v1 = parts[1].split('.')
            c1, v1 = int(c1), int(v1)
        else:
            c1, v1 = c0, v0
        if c1 != c0:
            v1 = KJV[bi][c0 - 1]
        items = []
        for p in re.findall(r'<p[^>]*>(.*?)</p>', body, re.S):
            wm = re.match(r'\s*<hi type="bold">(.*?)</hi>', p, re.S)
            if not wm:
                continue
            who = norm_who(plain(wm.group(1)))
            if not who:
                continue
            txt = re.sub(r'<reference[^>]*>(.*?)</reference>', r'\1', p[wm.end():], flags=re.S)
            txt = plain(txt).lstrip(':; ').strip()
            if len(txt.split()) < 6:
                continue
            txt, cut = clip(txt, 420)
            label = who[1] if who[1].lower() not in (who[0].replace('_', ' '), SPEAKERS[who[0]].lower()) else ''
            items.append([who[0], label, txt + (' […]' if cut else '')])
        if items:
            out[bi]['c'].setdefault(str(c0), []).append([v0, max(v0, v1), items])
    return out


# ---------- Church Fathers database (public-domain sources only) ----------
HCF_AUTHORS = {'John Chrysostom': 'chrysostom', 'Augustine of Hippo': 'augustine'}
BOOKNAME = {n: i for i, n in enumerate(NAMES)}
BOOKNAME['Song of Solomon'] = 21
FN = re.compile(r'^(.+?) (\d+)_(\d+)(?:-(\d+)(?:_(\d+))?)?\.toml$')


# The database links each quotation to a public-domain copy of the work, but the quoted text is
# sometimes a modern translation (its Confessions, City of God, sermons, letters and treatises
# read like 20th-century versions). Only these series match the 19th-century NPNF wording.
NPNF_SERIES = {
    'augustine': re.compile(r'^(expositions? (on|of) (the )?psalms?|on the psalms|tractates? on (the gospel of )?john|ten homilies on|(the )?harmony of the gospels)', re.I),
    'chrysostom': re.compile(r'^(homil(y|ies)\b|(homily )?concerning the statues)', re.I),
}


def pd_entry(c, key):
    url = (c.get('source_url') or '').strip()
    title = (c.get('source_title') or '').strip()
    if not url or not ('historicalchristian.faith' in url or 'newadvent.org' in url):
        return False
    if not title or title.upper() == title:
        return False
    if 'catena' in title.lower():
        return False
    return bool(NPNF_SERIES[key].match(title))


def hcf_books():
    out = {}
    for folder, key in HCF_AUTHORS.items():
        d = os.path.join(hcf_root, folder)
        for fn in sorted(os.listdir(d)):
            m = FN.match(fn)
            if not m or m.group(1) not in BOOKNAME:
                continue
            bi = BOOKNAME[m.group(1)]
            # The Gospels also have the Catena, but a persona never speaks from it, so this is
            # where Augustine's Tractates on John and Chrysostom's homilies reach the Gospels.
            c0, v0 = int(m.group(2)), int(m.group(3))
            if c0 > len(KJV[bi]):
                continue
            if m.group(5):
                c1, v1 = int(m.group(4)), int(m.group(5))
            elif m.group(4):
                c1, v1 = c0, int(m.group(4))
            else:
                c1, v1 = c0, v0
            if c1 != c0:
                v1 = KJV[bi][c0 - 1]
            try:
                data = tomllib.load(open(os.path.join(d, fn), 'rb'))
            except Exception:
                continue
            kept, seen = 0, set()
            for c in data.get('commentary', []):
                if kept >= 2 or not pd_entry(c, key):
                    continue
                q = plain(c.get('quote') or '')
                n = len(q.split())
                if n < 25 or n > 320 or q[:80] in seen:
                    continue
                seen.add(q[:80])
                title = re.sub(r'\s+', ' ', c.get('source_title')).strip()
                out.setdefault(bi, {'c': {}})['c'].setdefault(str(c0), []).append([v0, max(v0, min(v1, KJV[bi][c0 - 1])), key, title, q])
                kept += 1
    for bi in out:
        for ch in out[bi]['c']:
            out[bi]['c'][ch].sort(key=lambda r: (r[0], r[1]))
    return out


# ---------- assemble ----------
cat = catena_books()
hcf = hcf_books()
spur = spurgeon_book()
index = []
total = 0
missing = 0
for bi, code in enumerate(CODES):
    chapters = []
    for ch, nv in enumerate(KJV[bi], 1):
        row = []
        for v in range(1, nv + 1):
            t = have.get((code, ch, v), '')
            if not t:
                missing += 1
            row.append(t)
        chapters.append(row)
    book = {'b': bi, 'bsb': chapters, 'h': henry_book(bi)}
    if bi == 18:
        book['sp'] = spur
    if bi in cat:
        book['ca'] = cat[bi]
    if bi in hcf:
        book['f'] = hcf[bi]
    nch = len(chapters)

    def part(c_from, c_to):
        sub = {'b': bi, 'from': c_from, 'to': c_to, 'bsb': {str(c): chapters[c - 1] for c in range(c_from, c_to + 1)}}
        sub['h'] = {'i': book['h']['i'] if c_from == 1 else '', 'c': {k: v for k, v in book['h']['c'].items() if c_from <= int(k) <= c_to}}
        for key in ('sp', 'ca', 'f'):
            if key in book:
                sub[key] = {'c': {k: v for k, v in book[key]['c'].items() if c_from <= int(k) <= c_to}}
        return sub

    whole = json.dumps(part(1, nch), ensure_ascii=False, separators=(',', ':'))
    parts = []
    if len(whole.encode()) <= 1_400_000:
        parts.append((1, nch, whole))
    else:
        n = -(-len(whole.encode()) // 1_100_000)
        size = -(-nch // n)
        for c in range(1, nch + 1, size):
            parts.append((c, min(nch, c + size - 1), json.dumps(part(c, min(nch, c + size - 1)), ensure_ascii=False, separators=(',', ':'))))
    files = []
    for k, (a, b, js) in enumerate(parts):
        name = f'{code}.json' if len(parts) == 1 else f'{code}.{k + 1}.json'
        open(os.path.join(out_dir, name), 'w', encoding='utf-8').write(js)
        files.append([a, b, name])
        total += len(js.encode())
    cov = {}
    if bi in cat:
        cov['ca'] = sorted(int(c) for c in cat[bi]['c'])
    if bi in hcf:
        for key in ('chrysostom', 'augustine'):
            chs = sorted({int(c) for c, rows in hcf[bi]['c'].items() if any(r[2] == key for r in rows)})
            if chs:
                cov[key] = chs
    if bi == 18:
        cov['sp'] = sorted(int(c) for c in spur['c'])
    index.append({'code': code, 'name': NAMES[bi], 'v': KJV[bi], 'files': files, 'cov': cov})
json.dump({'books': index, 'speakers': SPEAKERS}, open(os.path.join(out_dir, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('total bytes', total, 'missing bsb verses', missing)
big = sorted(((sum(1 for _ in b['files']), b['code']) for b in index), reverse=True)[:6]
print('multi-part books', [b for b in big if b[0] > 1])
print('henry chapters', sum(len(json.load(open(os.path.join(out_dir, f[2]), encoding='utf-8'))['h']['c']) for b in index for f in b['files']))
print('catena speakers', len(SPEAKERS))
