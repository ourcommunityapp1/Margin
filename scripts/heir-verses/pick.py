"""Pick one verse for each item from its connected references, in the KJV (public domain).

Usage: python3 -I scripts/heir-verses/pick.py items.json verses-1769.json > src/heir/content/verses.ts
items.json comes from items.ts; verses-1769.json is from the `kjv` npm package (public domain).

Candidates are single verses, or two verses together, from the item's references, always whole and word for
word: the text is the KJV's exactly, with only its markup removed (the brackets around words the translators
supplied, and paragraph marks). Nothing is trimmed, recased or repunctuated. The earliest gentle verse that is a
whole sentence of 6-30 words wins; then the shortest. OVERRIDES fixes picks that read badly out of context.
"""
import json, re, sys

items = json.load(open(sys.argv[1]))
kjv = json.load(open(sys.argv[2]))
BOOK = {'Psalm': 'Psalms', 'Song of Songs': 'Song of Solomon'}
SKIP = {'1 John 5:7'}  # textually disputed
HARSH = re.compile(r'\b(wrath|curse[ds]?|destr\w+|indignation|damnation|vengeance|perish|tremble|abomina\w+|death|die|kill|fool|lust|adultery|fornication|serpent|infidel|murmur\w*|Satan)\b', re.I)
SUBORDINATE = re.compile(r'^(And |But |For |Now |So )?(if|when|as|that|because|whosoever|whoso|neither|what|which|who|being|where|wherefore|moreover|then)\b', re.I)
# Hand picks where the first choice reads badly on its own: item id -> reference (single verse or a-b).
# None leaves the item without a verse (none of its references reads well on its own).
OVERRIDES = {
    'wsc-2': '2 Timothy 3:16', 'wsc-29': 'Titus 3:5', 'wsc-34': '1 John 3:1', 'wsc-37': 'Philippians 1:23',
    'nic-3': 'Philippians 2:7', 'nic-4': '1 Corinthians 15:3',
    'wsc-7': 'Ephesians 1:4', 'wsc-12': 'Genesis 2:16', 'wsc-15': None, 'wsc-16': '1 Corinthians 15:22',
    'wsc-19': 'Romans 6:23', 'wsc-23': 'Isaiah 9:6', 'wsc-24': 'John 20:31', 'wsc-25': 'Hebrews 7:25',
    'wsc-26': 'Colossians 1:13', 'wsc-28': 'Psalm 110:1', 'wsc-30': 'John 15:5', 'wsc-31': 'Matthew 11:28',
    'wsc-32': '1 Corinthians 1:30', 'wsc-38': 'Psalm 16:11', 'wsc-40': 'Romans 10:5', 'wsc-42': 'Matthew 22:37',
    'wsc-46': 'Matthew 4:10', 'wsc-47': 'Psalm 81:10', 'wsc-49': 'Exodus 20:6', 'wsc-51': 'Deuteronomy 4:15',
    'wsc-52': 'Psalm 96:9', 'wsc-56': None, 'wsc-58': 'Exodus 31:13', 'wsc-60': 'Isaiah 58:14',
    'wsc-61': None, 'wsc-62': 'Genesis 2:3', 'wsc-69': None, 'wsc-71': '1 Thessalonians 4:3', 'wsc-74': 'Philippians 2:4',
    'wsc-75': 'Ephesians 4:28', 'wsc-77': 'Zechariah 8:16', 'wsc-78': 'Psalm 15:3', 'wsc-81': 'Galatians 5:26',
    'wsc-82': 'Romans 3:23', 'wsc-83': 'John 19:11', 'wsc-85': 'Mark 1:15', 'wsc-86': 'Ephesians 2:8',
    'wsc-91': '1 Corinthians 3:7', 'wsc-92': '1 Corinthians 10:16', 'wsc-97': '1 Corinthians 11:28',
    'wsc-101': 'Psalm 100:4', 'wsc-102': 'Revelation 22:20', 'wsc-103': 'Psalm 19:14', 'wsc-104': 'Philippians 4:19',
    'wsc-105': 'Ephesians 4:32', 'wsc-106': 'Matthew 26:41', 'wsc-107': '1 Timothy 1:17',
    'wlc-3': '2 Timothy 3:16', 'wlc-6': 'Hebrews 11:6', 'wlc-10': 'Galatians 4:6',
    'apc-2': 'John 3:16', 'apc-3': '1 Corinthians 15:4', 'apc-4': 'John 10:28', 'nic-2': 'John 1:1', 'nic-5': 'John 3:8',
}

def lookup(book, ch, v):
    t = kjv.get(f'{BOOK.get(book, book)} {ch}:{v}')
    if t is None: return None
    t = t.replace('[', '').replace(']', '').replace('¶', '').replace('#', '')
    return re.sub(r'\s+', ' ', t).strip()

def parse(ref):
    m = re.match(r'^(?:cf\.\s*)?(.+?) (\d+):(\d+)(?:[–-](\d+))?$', ref.strip())
    if not m: return None
    return m.group(1), m.group(2), int(m.group(3)), int(m.group(4) or m.group(3))

def candidates(ref):
    p = parse(ref)
    if not p: return
    book, ch, a, b = p
    for v in range(a, b + 1):
        t = lookup(book, ch, v)
        if t is None: return
        r1 = f'{book} {ch}:{v}'
        if r1 in SKIP: continue
        yield r1, t, False
        if v < b:
            t2 = lookup(book, ch, v + 1)
            if t2: yield f'{book} {ch}:{v}–{v + 1}', f'{t} {t2}', False

def badness(text, clause):
    w = len(text.split())
    whole = text[0].isupper() and text[-1] in '.?!' and not SUBORDINATE.match(text)
    bad = 0 if whole and 6 <= w <= 30 else 1
    if HARSH.search(text): bad += 2
    if text.startswith('And '): bad += 0.5
    if clause: bad += 0.25
    return bad, w

picked = {}
for iid, refs in items.items():
    if iid in OVERRIDES:
        if OVERRIDES[iid] is None: continue
        book, ch, a, b = parse(OVERRIDES[iid])
        picked[iid] = (OVERRIDES[iid], ' '.join(lookup(book, ch, v) for v in range(a, b + 1)))
        continue
    cands = []
    for k, r in enumerate(refs):
        for ref, text, clause in candidates(r):
            bad, w = badness(text, clause)
            cands.append((bad, k if bad < 1 else w, w, ref, text))
    if not cands: continue
    cands.sort()
    bad, _, w, ref, text = cands[0]
    if w > 45: continue
    picked[iid] = (ref, text)

print('// One verse for each item, chosen from its connected references. King James Version (public domain).')
print('// Generated by scripts/heir-verses/pick.py; edit there, not here.')
print('')
print('export const VERSES: Record<string, { ref: string; text: string }> = {')
for iid, (ref, text) in picked.items():
    print(f'  {json.dumps(iid)}: {{ ref: {json.dumps(ref, ensure_ascii=False)}, text: {json.dumps(text, ensure_ascii=False)} }},')
print('};')
print(f'{len(picked)} of {len(items)} items have a verse', file=sys.stderr)
