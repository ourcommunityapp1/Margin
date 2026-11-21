"""Small copies of each window for the course list: glass-mini.webp and ids-mini.png, 256px square.

usage: python3 scripts/heir-glass/mini.py public/heir/glass

The piece ids are kept exact by shrinking ids.png with nearest-neighbour sampling, so a miniature lights the
same panes as the full window.
"""
import os, sys
from PIL import Image

SIZE = 256
root = sys.argv[1]
for name in sorted(os.listdir(root)):
    d = os.path.join(root, name)
    if not os.path.exists(os.path.join(d, 'pieces.json')):
        continue
    glass = Image.open(os.path.join(d, 'glass.webp')).convert('RGB')
    ids = Image.open(os.path.join(d, 'ids.png')).convert('RGBA')
    if glass.size[0] != glass.size[1]:
        print('skip (not square)', name, glass.size); continue
    glass.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(d, 'glass-mini.webp'), quality=80)
    ids.resize((SIZE, SIZE), Image.NEAREST).save(os.path.join(d, 'ids-mini.png'), optimize=True)
    print('ok', name)
