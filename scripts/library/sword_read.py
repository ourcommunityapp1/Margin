"""Read a SWORD zCom/zCom4 (10-byte verse index, BOOK blocks, zlib) commentary module with KJV versification.
Usage: sword_read.py MODULE_DIR KJV_CANON_JSON OUT_JSON
Output: {book_index(0..65): {chapter: [[first_verse, last_verse, osis_text], ...]}} plus chapter intros at verse 0."""
import json, struct, sys, zlib
mod, canon_path, out_path = sys.argv[1:4]
canon = json.load(open(canon_path))
result = {}
book_offset = 0
for t in ('ot', 'nt'):
    import os
    sfx = next(c for c in 'bcv' if os.path.exists(f'{mod}/{t}.{c}zs'))
    bzs = open(f'{mod}/{t}.{sfx}zs', 'rb').read()
    blocks = [struct.unpack('<III', bzs[i:i + 12]) for i in range(0, len(bzs) - len(bzs) % 12, 12)]
    bzz = open(f'{mod}/{t}.{sfx}zz', 'rb').read()
    bzv = open(f'{mod}/{t}.{sfx}zv', 'rb').read()
    expected = 2 + len(canon[t]) + sum(len(b[2]) + sum(b[2]) for b in canon[t])
    if not blocks:
        book_offset += len(canon[t]); continue
    width, fmt = (12, '<III') if len(bzv) == expected * 12 else (10, '<IIH')
    assert len(bzv) == expected * width, (t, len(bzv), expected)
    idx = [struct.unpack(fmt, bzv[i:i + width]) for i in range(0, len(bzv), width)]
    cache = {}
    def text(entry):
        b, start, size = entry
        if size == 0: return ''
        if b not in cache:
            off, csize, _ = blocks[b]
            cache[b] = zlib.decompress(bzz[off:off + csize])
        return cache[b][start:start + size].decode('utf-8', 'replace')
    pos = 2
    for bi, (name, osis, counts) in enumerate(canon[t]):
        gbi = book_offset + bi
        book = {}
        intro = text(idx[pos]); pos += 1
        if intro.strip(): book['0'] = [[0, 0, intro]]
        for ci, n in enumerate(counts, start=1):
            entries = []
            head = text(idx[pos]); pos += 1
            if head.strip(): entries.append([0, 0, head])
            last_key = None
            for v in range(1, n + 1):
                e = idx[pos]; pos += 1
                if e[2] == 0: continue
                key = e
                if entries and last_key == key:
                    entries[-1][1] = v
                else:
                    entries.append([v, v, text(e)])
                    last_key = key
            if entries: book[str(ci)] = entries
        result[str(gbi)] = book
    assert pos == len(idx), (t, pos, len(idx))
    book_offset += len(canon[t])
json.dump(result, open(out_path, 'w', encoding='utf-8'), ensure_ascii=False)
print('books', len(result), 'chapters with entries', sum(len(b) for b in result.values()))
