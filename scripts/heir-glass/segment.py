"""Cut a stained-glass photo into its pieces of glass, for the living window.

usage: python3 segment.py photo.jpg out_dir --questions 107 --title "..." [--width 1024]

Writes to out_dir:
  glass.webp   the photo, resized, with everything outside the window blacked out
  ids.png      per pixel: R,G = piece id (0 = not glass), B = closeness to the lead (255 on it), A = 255 inside the window
  pieces.json  piece count, and for each question the piece ids it lights, in reveal order
  debug.jpg    each piece in a random colour, to check the cut by eye

How it works: lead lines are the dark, connected lines in a backlit photo. Everything between them is a
piece. Specks too small to be glass merge into their neighbours, pieces that are too large are split, and
every lead pixel belongs to its nearest piece (so light can bleed over the lead). Pieces are revealed from
bottom left to top right, and handed out to questions so each question lights about the same area of glass.
"""
import argparse, json, os
import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("photo"); ap.add_argument("out")
ap.add_argument("--questions", type=int, required=True)
ap.add_argument("--width", type=int, default=1024)
ap.add_argument("--title", default="")
ap.add_argument("--credit", default="{}")
ap.add_argument("--seed", type=int, default=3)
ap.add_argument("--mask", help="optional .npy (or image) marking the glass at the photo's resolution; otherwise found automatically")
ap.add_argument("--crop", help="x0,y0,x1,y1 in photo pixels, applied to the photo and the mask")
ap.add_argument("--surround", action="store_true", help="keep the real wall around the glass (the app fills the screen with it)")
ap.add_argument("--peaks", type=float, default=20, help="how bright a core must be to start its own piece; higher = fewer, bigger pieces")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
rng = np.random.default_rng(a.seed)

full_img = cv2.imread(a.photo, cv2.IMREAD_COLOR)
given = None
if a.mask:
    given = np.load(a.mask) if a.mask.endswith(".npy") else (cv2.imread(a.mask, cv2.IMREAD_GRAYSCALE) > 127)
    given = given.astype(np.uint8)
if a.crop:
    x0, y0, x1, y1 = map(int, a.crop.split(","))
    full_img = full_img[y0:y1, x0:x1].copy()
    if given is not None: given = given[y0:y1, x0:x1].copy()
h0, w0 = full_img.shape[:2]
W = a.width; H = round(h0 * W / w0)
img = cv2.resize(full_img, (W, H), interpolation=cv2.INTER_AREA)
# Cut at the photo's own resolution (lead is only a few pixels wide), then shrink the result.
SW, SH = w0, h0
# Brightness that ignores hue: deep blue glass is dark in plain grey but bright in its own channel.
peak = full_img.max(axis=2).astype(np.float32)
s = SW / 1024  # scale kernel sizes to the cutting resolution

# 1. The window: given, or everything that isn't the dark surround. Close the lead gaps, fill holes, keep the biggest part.
on = (cv2.GaussianBlur(peak, (0, 0), 3 * s) > 28).astype(np.uint8)
k = int(31 * s) | 1
on = cv2.morphologyEx(on, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
n, lab, stats, _ = cv2.connectedComponentsWithStats(on, 8)
window = (lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
ff = window.copy(); mask = np.zeros((SH + 2, SW + 2), np.uint8); cv2.floodFill(ff, mask, (0, 0), 1)
window = window | (1 - ff)
window = cv2.erode(window, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(5 * s) | 1,) * 2))
if given is not None:
    window = given

# 2. Pieces by watershed. Treat brightness as terrain: each piece of glass is a bright basin and the lead
# between pieces is the dark valley floor, so flooding from the bright cores puts the borders on the lead.
# Painted lines are dark too and sometimes split a piece; in dark areas the split is invisible anyway.
from skimage.segmentation import watershed, find_boundaries
from skimage.morphology import h_maxima
smooth = cv2.GaussianBlur(peak, (0, 0), 1.6 * s)
cores = h_maxima(smooth, a.peaks) & window.astype(bool)
n, markers = cv2.connectedComponents(cores.astype(np.uint8))
full = watershed(-smooth, markers, mask=window.astype(bool), compactness=0.001).astype(np.int32)
count = n - 1

# Closeness to the lead, for the warm edge glow: strongest on dark pixels at a piece's border.
border = find_boundaries(full, mode="inner")
d = cv2.distanceTransform((~border).astype(np.uint8), cv2.DIST_L2, 3)
dark = np.clip(1 - smooth / 90.0, 0, 1)
edge = np.clip(1 - d / (3.0 * s), 0, 1) * (0.4 + 0.6 * dark) * window
# Shrink everything to the output size.
full = cv2.resize(full.astype(np.int32).astype(np.float32), (W, H), interpolation=cv2.INTER_NEAREST).astype(np.int32)
edge = cv2.resize(edge.astype(np.float32), (W, H), interpolation=cv2.INTER_AREA)
window = cv2.resize(window, (W, H), interpolation=cv2.INTER_NEAREST)
# Pieces too small to survive the shrink are dropped; renumber so ids stay compact.
present = np.unique(full); present = present[present > 0]
remap = np.zeros(int(full.max()) + 1, np.int32); remap[present] = np.arange(1, len(present) + 1)
full = remap[full]; count = len(present)

# 5. Reveal order: bottom left first, top right last, with a little wobble so the front of light is organic.
ys, xs = np.nonzero(full)
ids = full[ys, xs]
cx = np.bincount(ids, xs, count + 1)[1:]; cy = np.bincount(ids, ys, count + 1)[1:]
ar = np.bincount(ids, minlength=count + 1)[1:].astype(np.float64)
cx /= np.maximum(ar, 1); cy /= np.maximum(ar, 1)
# The front of light isn't a ruled line: a slow, smooth wobble (a few bumps across the window) bends it,
# so it climbs through one scene and then the next.
def field(x, y, seed):
    r = np.random.default_rng(seed); v = np.zeros_like(x)
    for f in (2.0, 3.7, 6.1):
        ph = r.uniform(0, 2 * np.pi, 2); v += np.sin(x * f * 2 * np.pi / 3 + ph[0]) * np.cos(y * f * 2 * np.pi / 3 + ph[1]) / f
    return v
xn, yn = cx / W, cy / H
score = 0.3 * xn + (1 - yn) + 0.05 * field(xn, yn * H / W, a.seed) + rng.normal(0, 0.002, count)
order = np.argsort(score)
cum = np.cumsum(ar[order]); cum /= cum[-1]
q_of = np.minimum((cum * a.questions - 1e-9).astype(int), a.questions - 1)
questions = [[] for _ in range(a.questions)]
for rank, p in enumerate(order):
    questions[q_of[rank]].append(int(p + 1))
# Within a question, light blooms outward from where it starts instead of sweeping.
for q in questions:
    if not q: continue
    i0 = np.array(q) - 1
    sx, sy = cx[i0[0]], cy[i0[0]]
    q.sort(key=lambda pid: (cx[pid - 1] - sx) ** 2 + (cy[pid - 1] - sy) ** 2)

# 6. Write.
out = np.zeros((H, W, 4), np.uint8)
out[..., 2] = (full & 255).astype(np.uint8)        # R (OpenCV is BGRA)
out[..., 1] = (full >> 8).astype(np.uint8)         # G
out[..., 0] = (edge * 255).astype(np.uint8)        # B
out[..., 3] = window * 255
cv2.imwrite(os.path.join(a.out, "ids.png"), out, [cv2.IMWRITE_PNG_COMPRESSION, 9])
cv2.imwrite(os.path.join(a.out, "glass.webp"), img if a.surround else img * window[..., None], [cv2.IMWRITE_WEBP_QUALITY, 90])
palette = rng.integers(40, 255, (count + 1, 3), dtype=np.uint8); palette[0] = 0
cv2.imwrite(os.path.join(a.out, "debug.jpg"), palette[full], [cv2.IMWRITE_JPEG_QUALITY, 85])
json.dump({"count": count, "width": W, "height": H, "title": a.title, "fit": "cover" if a.surround else "contain", "credit": json.loads(a.credit),
           "questions": questions,
           # Each piece's centre (x, y as fractions of the image), so the app can frame or crop any pane.
           "centres": [[round(float(cx[i]) / W, 4), round(float(cy[i]) / H, 4)] for i in range(count)]}, open(os.path.join(a.out, "pieces.json"), "w"), separators=(",", ":"))
print(f"{W}x{H}  pieces={count}  per question ~{count / a.questions:.1f}")
