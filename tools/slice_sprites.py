"""Slice Mole Mayhem sprite sheets into individual transparent PNG frames.

Background (cream / white) is removed via border-connected flood fill so that
interior light colours (nurse uniform, golden highlights, ice) are preserved.
"""
import os
import json
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = os.path.join(os.path.dirname(__file__), "..", "..", "design", "assets")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites")
os.makedirs(OUT, exist_ok=True)

COLS_MOLE = ["peek", "half", "up", "happy", "hit", "burrow"]
COLS_HAMMER = ["idle", "swing", "hit", "shake", "bomb"]

SHEETS = [
    # file, rows(labels), cols(labels), n_cols, n_rows, bg_tolerance
    # (a row label of None is skipped — used to grab only one row from a sheet)
    ("sprite_sheet_mole1.png", ["normal", "stone", "metal", "golden"], COLS_MOLE, 6, 4, 30),
    ("sprite_sheet_mole2.png", ["bomb", "nurse", "ice", None], COLS_MOLE, 6, 4, 30),
    ("sprite_sheet_mole3.png", ["s1", "s2", "s3", "sM", "sO", "sL", "sE"], COLS_MOLE, 6, 7, 30),
    # mole4: row 1 = rainbow mole -> 'rainbow'; row 3 = clock rabbit -> 'rabbit'
    ("sprite_sheet_mole4.png", ["rainbow", None, "rabbit", None], COLS_MOLE, 6, 4, 30),
]

# hammer1 has row/column TEXT LABELS, so its grid is not uniform. Explicit rects
# were measured from transparent gutters + label-column row centers.
# Row 4 is the Golden Hammer (kept named h_chain for internal 'chain' key compat).
HAMMER_ROWS = ["h_normal", "h_bomb", "h_power", "h_chain", "h_ice"]
HAMMER_ROW_CENTERS = [154, 320, 491, 649, 821]
HAMMER_ROW_HALF = 82
HAMMER_COL_BOUNDS = [(291, 421), (507, 672), (735, 960), (1035, 1268), (1319, 1566)]


def make_bg_transparent(rgb, tol):
    """Return RGBA where the border-connected near-background region is alpha 0."""
    h, w, _ = rgb.shape
    # Estimate background colour from the 4 corners (median).
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]], dtype=np.float32)
    bg = np.median(corners, axis=0)
    dist = np.sqrt(((rgb.astype(np.float32) - bg) ** 2).sum(axis=2))
    near_bg = dist < tol
    # Keep only the background region connected to the image border.
    labels, n = ndimage.label(near_bg)
    border_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border_labels.discard(0)
    bg_mask = np.isin(labels, list(border_labels))
    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    # Soften: erode alpha edge by 1px to avoid cream halo fringes.
    solid = alpha > 0
    solid = ndimage.binary_erosion(solid, iterations=1, border_value=1)
    alpha = np.where(solid, 255, 0).astype(np.uint8)
    rgba = np.dstack([rgb, alpha])
    return rgba


def keep_main_blob(rgba):
    """Drop stray disconnected bits (e.g. dirt bleeding in from a neighbouring
    cell). Keeps the largest opaque component plus any component >=25% its size
    (so a mole's separate dirt mound / big sparkles survive, thin strips don't).
    """
    alpha = rgba[:, :, 3] > 0
    labels, n = ndimage.label(alpha)
    if n <= 1:
        return rgba
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    biggest = sizes.max()
    keep = {i + 1 for i, s in enumerate(sizes) if s >= 0.25 * biggest}
    mask = np.isin(labels, list(keep))
    out = rgba.copy()
    out[:, :, 3] = np.where(mask, rgba[:, :, 3], 0)
    return out


def crop_to_content(rgba):
    rgba = keep_main_blob(rgba)
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return None
    pad = 4
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, rgba.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, rgba.shape[1])
    return rgba[y0:y1, x0:x1]


manifest = {}
for fname, rows, cols, ncols, nrows, tol in SHEETS:
    im = Image.open(os.path.join(SRC, fname)).convert("RGB")
    rgb = np.array(im)
    rgba = make_bg_transparent(rgb, tol)
    H, W, _ = rgba.shape
    cw, ch = W / ncols, H / nrows
    for r, rlabel in enumerate(rows):
        if rlabel is None:
            continue
        for c in range(ncols):
            clabel = cols[c] if c < len(cols) else f"c{c}"
            x0, x1 = int(round(c * cw)), int(round((c + 1) * cw))
            y0, y1 = int(round(r * ch)), int(round((r + 1) * ch))
            cell = rgba[y0:y1, x0:x1]
            cropped = crop_to_content(cell)
            if cropped is None:
                continue
            name = f"{rlabel}_{clabel}"
            outpath = os.path.join(OUT, name + ".png")
            Image.fromarray(cropped, "RGBA").save(outpath)
            manifest.setdefault(rlabel, {})[clabel] = f"sprites/{name}.png"

# --- Hammer sheet (explicit rectangles) ---
him = Image.open(os.path.join(SRC, "sprite_sheet_hammer1.png")).convert("RGB")
hrgba = make_bg_transparent(np.array(him), 26)
for r, rlabel in enumerate(HAMMER_ROWS):
    cy = HAMMER_ROW_CENTERS[r]
    y0, y1 = cy - HAMMER_ROW_HALF, cy + HAMMER_ROW_HALF
    for c, (x0, x1) in enumerate(HAMMER_COL_BOUNDS):
        clabel = COLS_HAMMER[c]
        cropped = crop_to_content(hrgba[y0:y1, x0:x1])
        if cropped is None:
            continue
        name = f"{rlabel}_{clabel}"
        Image.fromarray(cropped, "RGBA").save(os.path.join(OUT, name + ".png"))
        manifest.setdefault(rlabel, {})[clabel] = f"sprites/{name}.png"

with open(os.path.join(OUT, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)

print("Sliced", sum(len(v) for v in manifest.values()), "frames across", len(manifest), "types")
print("Types:", ", ".join(manifest.keys()))
