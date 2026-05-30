"""
F.I.T.E. LINEART PIPELINE — Tunable version
============================================
Locked: colour palette, CRT treatment, border, vignette
Exposed: all edge detection and brightness parameters

Usage:
    Edit the TUNING block below, then run.
    Output → /mnt/user-data/outputs/

TUNING GUIDE:
    PRE_BLUR        higher = smoother input, fewer noisy edges (range: 0.5–3.0)
    PRE_CONTRAST    higher = more edge pop before detection (range: 1.0–2.0)
    THRESHOLD       higher = fewer, bolder edges only (range: 20–120)
    GAMMA           lower = brighter mid-edges survive (range: 0.4–1.0)
    BRIGHTNESS_MULT multiplies edge value before remap, pushes toward AMBER_B (range: 1.0–2.5)
    BRIGHTNESS_LIFT adds flat lift to surviving edges (range: 0.0–0.6)
    ALPHA_MULT      how opaque lines are (range: 2.0–6.0)
    GLOW_STRENGTH   glow opacity as fraction of line alpha (range: 0.0–0.6)
    GLOW_WIDE_R     wide glow blur radius (range: 8–25)
    GLOW_TIGHT_R    tight glow blur radius (range: 2–8)
    SUPPRESS_BG     True = suppress edges on black/white background pixels
    BG_THRESHOLD    how dark/light counts as background (0–255, dark end)
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
from scipy.ndimage import convolve

# ══════════════════════════════════════════════════════════════════════
# INPUT / OUTPUT — edit these
# ══════════════════════════════════════════════════════════════════════
INPUT_PATH   = "C:/Users/micfl/Desktop/FITE_lineart_pipline python script/Fallout_4_perk_poster.jpg"
OUTPUT_PATH  = "C:/Users/micfl/Desktop/FITE_lineart_pipline python script/output.png"
CROP         = None          # (x0, y0, x1, y1) or None for full image
TARGET_W     = 464           # output width  (Nexus tile 4:5 ratio)
TARGET_H     = 580           # output height
HAS_ALPHA    = False          # True if source PNG has transparency (use alpha as object mask)

# ══════════════════════════════════════════════════════════════════════
# LOCKED — DO NOT CHANGE (visual identity)
# ══════════════════════════════════════════════════════════════════════
AMBER_B = (255, 180,  60)
AMBER_M = (210, 130,   0)
AMBER_D = (140,  80,   0)
BG      = ( 13,  11,   7)

# ══════════════════════════════════════════════════════════════════════
# TUNING — adjust freely
# ══════════════════════════════════════════════════════════════════════
PRE_BLUR        = 1.8    # gaussian blur before edge detect
PRE_CONTRAST    = 1.4    # contrast boost before edge detect
THRESHOLD       = 55     # edge strength cutoff (lower = more detail)
GAMMA           = 0.65   # edge brightness curve (lower = brighter edges)
BRIGHTNESS_MULT = 1.8    # push surviving edges toward bright amber
BRIGHTNESS_LIFT = 0.35   # minimum brightness lift on any surviving edge
ALPHA_MULT      = 4.0    # line opacity multiplier
GLOW_STRENGTH   = 0.30   # glow as fraction of line alpha
GLOW_WIDE_R     = 14     # wide glow radius
GLOW_TIGHT_R    = 4      # tight glow radius
SUPPRESS_BG     = True   # suppress edges on background pixels
BG_THRESHOLD    = 20     # pixels darker than this on all channels = background

# ══════════════════════════════════════════════════════════════════════
# PIPELINE
# ══════════════════════════════════════════════════════════════════════

def run():
    src = Image.open(INPUT_PATH).convert("RGBA" if HAS_ALPHA else "RGB")
    if CROP:
        src = src.crop(CROP)
    W0, H0 = src.size

    # Fit inside target, maintaining aspect, centred on BG
    scale = min(TARGET_W / W0, TARGET_H / H0)
    rw, rh = int(W0 * scale), int(H0 * scale)
    resized = src.resize((rw, rh), Image.LANCZOS)

    canvas_src = Image.new("RGB", (TARGET_W, TARGET_H), BG)
    ox = (TARGET_W - rw) // 2
    oy = (TARGET_H - rh) // 2
    canvas_src.paste(resized.convert("RGB"), (ox, oy))

    rgb_src = canvas_src.convert("RGB")
    arr_rgb = np.array(rgb_src, dtype=np.float32)

    # Object mask — from alpha channel or bg colour detection
    if HAS_ALPHA:
        obj_alpha = np.zeros((TARGET_H, TARGET_W), dtype=np.float32)
        ra = np.array(resized.split()[3], dtype=np.float32)
        obj_alpha[oy:oy+rh, ox:ox+rw] = ra
        bg_mask = obj_alpha < 10
    else:
        # Detect background by darkness
        dark_mask = np.all(arr_rgb < BG_THRESHOLD, axis=-1)
        bright_mask = np.all(arr_rgb > 230, axis=-1)
        bg_mask = dark_mask | bright_mask

    # Pre-process
    pre = rgb_src.filter(ImageFilter.GaussianBlur(PRE_BLUR))
    pre = ImageEnhance.Contrast(pre).enhance(PRE_CONTRAST)
    arr = np.array(pre.convert("L"), dtype=np.float32)

    # Sobel
    kx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]], dtype=np.float32)
    ky = np.array([[-1,-2,-1],[0,0,0],[1,2,1]], dtype=np.float32)
    edges = np.sqrt(convolve(arr, kx)**2 + convolve(arr, ky)**2)
    edges = np.clip(edges / edges.max() * 255, 0, 255)

    if SUPPRESS_BG:
        edges[bg_mask] = 0

    # Threshold + gamma
    edges = np.where(edges < THRESHOLD,
                     0,
                     (edges - THRESHOLD) / (255 - THRESHOLD) * 255)
    edges = np.clip(edges ** GAMMA, 0, 255)

    # Smooth + sharpen
    edge_img = Image.fromarray(edges.astype(np.uint8), "L")
    edge_img = edge_img.filter(ImageFilter.GaussianBlur(0.5))
    edge_img = ImageEnhance.Sharpness(edge_img).enhance(2.0)
    edges = np.array(edge_img, dtype=np.float32)

    # Colour remap → locked amber palette
    e_n = np.where(edges > 0,
                   np.clip(edges / 255.0 * BRIGHTNESS_MULT + BRIGHTNESS_LIFT, 0, 1),
                   0.0)
    r = (BG[0]
         + (AMBER_D[0]-BG[0])     * np.clip(e_n*3,   0, 1)
         + (AMBER_M[0]-AMBER_D[0])* np.clip(e_n*3-1, 0, 1)
         + (AMBER_B[0]-AMBER_M[0])* np.clip(e_n*3-2, 0, 1))
    g = (BG[1]
         + (AMBER_D[1]-BG[1])     * np.clip(e_n*3,   0, 1)
         + (AMBER_M[1]-AMBER_D[1])* np.clip(e_n*3-1, 0, 1)
         + (AMBER_B[1]-AMBER_M[1])* np.clip(e_n*3-2, 0, 1))
    b = (BG[2]
         + (AMBER_D[2]-BG[2])     * np.clip(e_n*3,   0, 1)
         + (AMBER_M[2]-AMBER_D[2])* np.clip(e_n*3-1, 0, 1)
         + (AMBER_B[2]-AMBER_M[2])* np.clip(e_n*3-2, 0, 1))
    rgb = np.stack([r,g,b], axis=-1).clip(0,255).astype(np.uint8)

    alpha = np.clip(edges * ALPHA_MULT, 0, 255).astype(np.uint8)
    sharp = Image.fromarray(rgb).convert("RGBA")
    sharp.putalpha(Image.fromarray(alpha, "L"))

    # Glow
    glow_layer = Image.fromarray(rgb).convert("RGBA")
    glow_layer.putalpha(Image.fromarray(
        np.clip(alpha.astype(np.float32) * GLOW_STRENGTH, 0, 255).astype(np.uint8)))
    out = Image.new("RGBA", (TARGET_W, TARGET_H), (*BG, 255))
    out.alpha_composite(glow_layer.filter(ImageFilter.GaussianBlur(GLOW_WIDE_R)))
    out.alpha_composite(glow_layer.filter(ImageFilter.GaussianBlur(GLOW_TIGHT_R)))
    out.alpha_composite(sharp)

    # CRT: scanlines masked to content
    content_mask = Image.fromarray(
        np.clip(alpha.astype(np.float32)*1.2, 0, 255).astype(np.uint8), "L")
    scan = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    sd = ImageDraw.Draw(scan)
    for y in range(0, TARGET_H, 3):
        sd.line([(0,y),(TARGET_W,y)], fill=(0,0,0,130))
    scan_m = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    scan_m.paste(scan, mask=content_mask)
    out.alpha_composite(scan_m)

    # CRT: noise masked
    rng = np.random.default_rng(7)
    noise_arr = np.zeros((TARGET_H, TARGET_W, 4), dtype=np.uint8)
    nm = rng.random((TARGET_H, TARGET_W)) < 0.018
    iv = rng.integers(40, 120, (TARGET_H, TARGET_W)).astype(np.uint8)
    noise_arr[nm, 0] = iv[nm]
    noise_arr[nm, 1] = (iv[nm] * 0.5).astype(np.uint8)
    noise_arr[nm, 3] = iv[nm]
    noise_m = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    noise_m.paste(Image.fromarray(noise_arr, "RGBA"), mask=content_mask)
    out.alpha_composite(noise_m)

    # CRT: diagonal hatch masked
    hatch = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    hd = ImageDraw.Draw(hatch)
    for offset in range(-TARGET_H, TARGET_W+TARGET_H, 5):
        hd.line([(offset,0),(offset+TARGET_H,TARGET_H)], fill=(*AMBER_D,14))
    hatch_m = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    hatch_m.paste(hatch, mask=content_mask)
    out.alpha_composite(hatch_m)

    # Vignette
    yy, xx = np.mgrid[0:TARGET_H, 0:TARGET_W].astype(np.float32)
    vig = np.minimum(
        np.minimum(np.clip(xx/60,0,1)**2, np.clip((TARGET_W-xx)/60,0,1)**2),
        np.minimum(np.clip(yy/40,0,1)**2, np.clip((TARGET_H-yy)/40,0,1)**2))
    vig_arr = np.zeros((TARGET_H, TARGET_W, 4), dtype=np.uint8)
    vig_arr[..., 3] = ((1-vig)*200).clip(0,200).astype(np.uint8)
    out.alpha_composite(Image.fromarray(vig_arr, "RGBA"))

    # Border
    fd = ImageDraw.Draw(out)
    fd.rectangle([0,0,TARGET_W-1,TARGET_H-1], outline=(*AMBER_B,255), width=2)
    fd.rectangle([4,4,TARGET_W-5,TARGET_H-5], outline=(*AMBER_M,200), width=1)
    for cx2,cy2 in [(0,0),(TARGET_W-1,0),(0,TARGET_H-1),(TARGET_W-1,TARGET_H-1)]:
        sx = 1 if cx2==0 else -1
        sy = 1 if cy2==0 else -1
        fd.line([(cx2,cy2),(cx2+sx*10,cy2)], fill=(*AMBER_D,255), width=1)
        fd.line([(cx2,cy2),(cx2,cy2+sy*10)], fill=(*AMBER_D,255), width=1)
    for x in range(24, TARGET_W, 24):
        fd.line([(x,0),(x,4)], fill=(*AMBER_M,180), width=1)
        fd.line([(x,TARGET_H-1),(x,TARGET_H-5)], fill=(*AMBER_M,180), width=1)
    for side_x in [1, TARGET_W-7]:
        for bi in range(4):
            y0 = 80 + bi*20
            fd.rectangle([side_x, y0, side_x+5, y0+9], fill=(*AMBER_D,180))

    out.save(OUTPUT_PATH)
    print(f"Saved → {OUTPUT_PATH}  {out.size}")
    print(f"Settings: threshold={THRESHOLD} gamma={GAMMA} "
          f"brightness=×{BRIGHTNESS_MULT}+{BRIGHTNESS_LIFT} "
          f"alpha=×{ALPHA_MULT} glow={GLOW_STRENGTH}")

run()
