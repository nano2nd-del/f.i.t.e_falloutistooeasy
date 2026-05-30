"""
F.I.T.E. LINEART PIPELINE — GUI
================================
Tkinter front-end for the tunable pipeline.
Styled to match the amber-CRT output aesthetic.

Requirements: pip install pillow scipy
Run: python fite_gui.py
"""

import tkinter as tk
from tkinter import filedialog, messagebox
import threading
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageTk
import numpy as np
from scipy.ndimage import convolve
import os

# ── Palette (mirrors the pipeline's locked colours) ──────────────────
AMBER_B = (255, 180,  60)
AMBER_M = (210, 130,   0)
AMBER_D = (140,  80,   0)
BG      = ( 13,  11,   7)

# Hex versions for Tkinter
C_BG       = "#0d0b07"
C_PANEL    = "#1a1510"
C_AMBER_B  = "#ffb43c"
C_AMBER_M  = "#d28200"
C_AMBER_D  = "#8c5000"
C_TEXT     = "#e8a030"
C_DIM      = "#7a5010"
C_BORDER   = "#3a2800"

FONT_TITLE  = ("Courier", 13, "bold")
FONT_LABEL  = ("Courier", 9)
FONT_VALUE  = ("Courier", 9, "bold")
FONT_BTN    = ("Courier", 10, "bold")
FONT_SMALL  = ("Courier", 8)

PREVIEW_W = 464
PREVIEW_H = 580


# ── Core pipeline (extracted from your script) ────────────────────────

def run_pipeline(src_image: Image.Image, params: dict, has_alpha=False):
    TARGET_W = PREVIEW_W
    TARGET_H = PREVIEW_H

    src = src_image.convert("RGBA" if has_alpha else "RGB")
    W0, H0 = src.size

    scale = min(TARGET_W / W0, TARGET_H / H0)
    rw, rh = int(W0 * scale), int(H0 * scale)
    resized = src.resize((rw, rh), Image.LANCZOS)

    canvas_src = Image.new("RGB", (TARGET_W, TARGET_H), BG)
    ox = (TARGET_W - rw) // 2
    oy = (TARGET_H - rh) // 2
    canvas_src.paste(resized.convert("RGB"), (ox, oy))

    rgb_src  = canvas_src.convert("RGB")
    arr_rgb  = np.array(rgb_src, dtype=np.float32)

    BG_THRESHOLD = params["BG_THRESHOLD"]

    if has_alpha:
        obj_alpha = np.zeros((TARGET_H, TARGET_W), dtype=np.float32)
        ra = np.array(resized.split()[3], dtype=np.float32)
        obj_alpha[oy:oy+rh, ox:ox+rw] = ra
        bg_mask = obj_alpha < 10
    else:
        dark_mask   = np.all(arr_rgb < BG_THRESHOLD, axis=-1)
        bright_mask = np.all(arr_rgb > 230, axis=-1)
        bg_mask     = dark_mask | bright_mask

    pre = rgb_src.filter(ImageFilter.GaussianBlur(params["PRE_BLUR"]))
    pre = ImageEnhance.Contrast(pre).enhance(params["PRE_CONTRAST"])
    arr = np.array(pre.convert("L"), dtype=np.float32)

    kx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]], dtype=np.float32)
    ky = np.array([[-1,-2,-1],[0,0,0],[1,2,1]], dtype=np.float32)
    edges = np.sqrt(convolve(arr, kx)**2 + convolve(arr, ky)**2)
    mx = edges.max()
    if mx > 0:
        edges = np.clip(edges / mx * 255, 0, 255)

    if params["SUPPRESS_BG"]:
        edges[bg_mask] = 0

    THRESHOLD = params["THRESHOLD"]
    GAMMA     = params["GAMMA"]
    edges = np.where(edges < THRESHOLD,
                     0,
                     (edges - THRESHOLD) / max(255 - THRESHOLD, 1) * 255)
    edges = np.clip(edges ** GAMMA, 0, 255)

    edge_img = Image.fromarray(edges.astype(np.uint8), "L")
    edge_img = edge_img.filter(ImageFilter.GaussianBlur(0.5))
    edge_img = ImageEnhance.Sharpness(edge_img).enhance(2.0)
    edges    = np.array(edge_img, dtype=np.float32)

    BM = params["BRIGHTNESS_MULT"]
    BL = params["BRIGHTNESS_LIFT"]
    e_n = np.where(edges > 0,
                   np.clip(edges / 255.0 * BM + BL, 0, 1),
                   0.0)

    def ch(a, b, c, d):
        return (a
                + (b-a) * np.clip(e_n*3,   0, 1)
                + (c-b) * np.clip(e_n*3-1, 0, 1)
                + (d-c) * np.clip(e_n*3-2, 0, 1))

    r = ch(BG[0], AMBER_D[0], AMBER_M[0], AMBER_B[0])
    g = ch(BG[1], AMBER_D[1], AMBER_M[1], AMBER_B[1])
    b = ch(BG[2], AMBER_D[2], AMBER_M[2], AMBER_B[2])
    rgb   = np.stack([r,g,b], axis=-1).clip(0,255).astype(np.uint8)
    alpha = np.clip(edges * params["ALPHA_MULT"], 0, 255).astype(np.uint8)

    sharp = Image.fromarray(rgb).convert("RGBA")
    sharp.putalpha(Image.fromarray(alpha, "L"))

    GS = params["GLOW_STRENGTH"]
    glow_layer = Image.fromarray(rgb).convert("RGBA")
    glow_layer.putalpha(Image.fromarray(
        np.clip(alpha.astype(np.float32) * GS, 0, 255).astype(np.uint8)))

    out = Image.new("RGBA", (TARGET_W, TARGET_H), (*BG, 255))
    out.alpha_composite(glow_layer.filter(ImageFilter.GaussianBlur(params["GLOW_WIDE_R"])))
    out.alpha_composite(glow_layer.filter(ImageFilter.GaussianBlur(params["GLOW_TIGHT_R"])))
    out.alpha_composite(sharp)

    # CRT scanlines
    content_mask = Image.fromarray(
        np.clip(alpha.astype(np.float32)*1.2, 0, 255).astype(np.uint8), "L")
    scan = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    sd   = ImageDraw.Draw(scan)
    for y in range(0, TARGET_H, 3):
        sd.line([(0,y),(TARGET_W,y)], fill=(0,0,0,130))
    scan_m = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    scan_m.paste(scan, mask=content_mask)
    out.alpha_composite(scan_m)

    # Noise
    rng       = np.random.default_rng(7)
    noise_arr = np.zeros((TARGET_H, TARGET_W, 4), dtype=np.uint8)
    nm = rng.random((TARGET_H, TARGET_W)) < 0.018
    iv = rng.integers(40, 120, (TARGET_H, TARGET_W)).astype(np.uint8)
    noise_arr[nm, 0] = iv[nm]
    noise_arr[nm, 1] = (iv[nm] * 0.5).astype(np.uint8)
    noise_arr[nm, 3] = iv[nm]
    noise_m = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    noise_m.paste(Image.fromarray(noise_arr, "RGBA"), mask=content_mask)
    out.alpha_composite(noise_m)

    # Diagonal hatch
    hatch = Image.new("RGBA", (TARGET_W, TARGET_H), (0,0,0,0))
    hd    = ImageDraw.Draw(hatch)
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
    vig_arr       = np.zeros((TARGET_H, TARGET_W, 4), dtype=np.uint8)
    vig_arr[...,3]= ((1-vig)*200).clip(0,200).astype(np.uint8)
    out.alpha_composite(Image.fromarray(vig_arr, "RGBA"))

    # Border
    fd = ImageDraw.Draw(out)
    fd.rectangle([0,0,TARGET_W-1,TARGET_H-1], outline=(*AMBER_B,255), width=2)
    fd.rectangle([4,4,TARGET_W-5,TARGET_H-5],  outline=(*AMBER_M,200), width=1)
    for cx2,cy2 in [(0,0),(TARGET_W-1,0),(0,TARGET_H-1),(TARGET_W-1,TARGET_H-1)]:
        sx = 1 if cx2==0 else -1
        sy = 1 if cy2==0 else -1
        fd.line([(cx2,cy2),(cx2+sx*10,cy2)], fill=(*AMBER_D,255), width=1)
        fd.line([(cx2,cy2),(cx2,cy2+sy*10)], fill=(*AMBER_D,255), width=1)
    for x in range(24, TARGET_W, 24):
        fd.line([(x,0),(x,4)],              fill=(*AMBER_M,180), width=1)
        fd.line([(x,TARGET_H-1),(x,TARGET_H-5)], fill=(*AMBER_M,180), width=1)
    for side_x in [1, TARGET_W-7]:
        for bi in range(4):
            y0 = 80 + bi*20
            fd.rectangle([side_x, y0, side_x+5, y0+9], fill=(*AMBER_D,180))

    return out


# ── GUI ───────────────────────────────────────────────────────────────

class FiteGUI:
    DEFAULTS = dict(
        PRE_BLUR        = 1.8,
        PRE_CONTRAST    = 1.4,
        THRESHOLD       = 55.0,
        GAMMA           = 0.65,
        BRIGHTNESS_MULT = 1.8,
        BRIGHTNESS_LIFT = 0.35,
        ALPHA_MULT      = 4.0,
        GLOW_STRENGTH   = 0.30,
        GLOW_WIDE_R     = 14.0,
        GLOW_TIGHT_R    = 4.0,
        BG_THRESHOLD    = 20.0,
    )

    SLIDERS = [
        # (key, label, min, max, resolution)
        ("PRE_BLUR",        "PRE BLUR",        0.5,  3.0,  0.05),
        ("PRE_CONTRAST",    "PRE CONTRAST",    1.0,  2.0,  0.05),
        ("THRESHOLD",       "THRESHOLD",       20,   120,  1.0),
        ("GAMMA",           "GAMMA",           0.4,  1.0,  0.01),
        ("BRIGHTNESS_MULT", "BRIGHT MULT",     1.0,  2.5,  0.05),
        ("BRIGHTNESS_LIFT", "BRIGHT LIFT",     0.0,  0.6,  0.01),
        ("ALPHA_MULT",      "ALPHA MULT",      2.0,  6.0,  0.1),
        ("GLOW_STRENGTH",   "GLOW STRENGTH",   0.0,  0.6,  0.01),
        ("GLOW_WIDE_R",     "GLOW WIDE R",     8,    25,   1.0),
        ("GLOW_TIGHT_R",    "GLOW TIGHT R",    2,    8,    0.5),
        ("BG_THRESHOLD",    "BG THRESHOLD",    0,    60,   1.0),
    ]

    def __init__(self, root: tk.Tk):
        self.root       = root
        self.src_image  = None
        self.result_img = None
        self._pending   = False
        self._running   = False

        root.title("F.I.T.E. LINEART PIPELINE")
        root.configure(bg=C_BG)
        root.resizable(False, False)

        self._build_ui()
        self._show_placeholder()

    # ── UI construction ───────────────────────────────────────────────

    def _build_ui(self):
        # ── top bar ──────────────────────────────────────────────────
        top = tk.Frame(self.root, bg=C_BG)
        top.pack(fill="x", padx=10, pady=(10,4))

        tk.Label(top, text="▣ F.I.T.E. LINEART PIPELINE",
                 font=FONT_TITLE, bg=C_BG, fg=C_AMBER_B).pack(side="left")

        tk.Button(top, text="LOAD IMAGE",
                  font=FONT_BTN, bg=C_AMBER_D, fg=C_AMBER_B,
                  activebackground=C_AMBER_M, activeforeground=C_BG,
                  relief="flat", bd=0, padx=12, pady=4,
                  cursor="hand2", command=self._load_image
                  ).pack(side="right", padx=(6,0))

        tk.Button(top, text="SAVE OUTPUT",
                  font=FONT_BTN, bg=C_PANEL, fg=C_AMBER_M,
                  activebackground=C_AMBER_D, activeforeground=C_AMBER_B,
                  relief="flat", bd=0, padx=12, pady=4,
                  cursor="hand2", command=self._save_output
                  ).pack(side="right")

        tk.Button(top, text="RESET",
                  font=FONT_BTN, bg=C_PANEL, fg=C_DIM,
                  activebackground=C_BORDER, activeforeground=C_AMBER_M,
                  relief="flat", bd=0, padx=10, pady=4,
                  cursor="hand2", command=self._reset_sliders
                  ).pack(side="right", padx=6)

        # ── separator ────────────────────────────────────────────────
        tk.Frame(self.root, bg=C_BORDER, height=1).pack(fill="x", padx=10)

        # ── main area: preview + controls ────────────────────────────
        body = tk.Frame(self.root, bg=C_BG)
        body.pack(fill="both", expand=True, padx=10, pady=6)

        # Preview canvas
        pf = tk.Frame(body, bg=C_BORDER, bd=1, relief="flat")
        pf.pack(side="left", anchor="n")

        self.canvas = tk.Canvas(pf, width=PREVIEW_W, height=PREVIEW_H,
                                bg=C_BG, highlightthickness=0)
        self.canvas.pack()

        # Status bar under preview
        self.status_var = tk.StringVar(value="No image loaded")
        tk.Label(body, textvariable=self.status_var,
                 font=FONT_SMALL, bg=C_BG, fg=C_DIM,
                 anchor="w").pack(side="bottom", fill="x", padx=6, pady=(0,4))

        # Controls panel
        ctrl = tk.Frame(body, bg=C_PANEL, bd=0)
        ctrl.pack(side="left", fill="y", padx=(8,0))

        tk.Label(ctrl, text="PARAMETERS", font=FONT_TITLE,
                 bg=C_PANEL, fg=C_AMBER_D, pady=6).pack(fill="x", padx=10)
        tk.Frame(ctrl, bg=C_BORDER, height=1).pack(fill="x", padx=6)

        self.vars = {}
        for key, label, lo, hi, res in self.SLIDERS:
            self._add_slider(ctrl, key, label, lo, hi, res)

        # SUPPRESS_BG toggle
        tk.Frame(ctrl, bg=C_BORDER, height=1).pack(fill="x", padx=6, pady=(8,0))
        row = tk.Frame(ctrl, bg=C_PANEL)
        row.pack(fill="x", padx=12, pady=6)
        tk.Label(row, text="SUPPRESS BG", font=FONT_LABEL,
                 bg=C_PANEL, fg=C_TEXT, width=14, anchor="w").pack(side="left")
        self.suppress_var = tk.BooleanVar(value=True)
        chk = tk.Checkbutton(row, variable=self.suppress_var,
                              bg=C_PANEL, fg=C_AMBER_B,
                              selectcolor=C_AMBER_D,
                              activebackground=C_PANEL,
                              relief="flat", bd=0,
                              command=self._on_change)
        chk.pack(side="left")

    def _add_slider(self, parent, key, label, lo, hi, res):
        var = tk.DoubleVar(value=self.DEFAULTS[key])
        self.vars[key] = var

        row = tk.Frame(parent, bg=C_PANEL)
        row.pack(fill="x", padx=10, pady=3)

        tk.Label(row, text=label, font=FONT_LABEL,
                 bg=C_PANEL, fg=C_TEXT, width=14, anchor="w").pack(side="left")

        val_lbl = tk.Label(row, textvariable=var, font=FONT_VALUE,
                           bg=C_PANEL, fg=C_AMBER_B, width=5, anchor="e")
        val_lbl.pack(side="right")

        # Format display to 2 decimal places
        def _fmt(v, lbl=val_lbl, k=key):
            lbl.config(text=f"{float(v):.2f}")

        sl = tk.Scale(row, variable=var, from_=lo, to=hi, resolution=res,
                      orient="horizontal", length=180,
                      bg=C_PANEL, fg=C_AMBER_M,
                      troughcolor=C_BORDER,
                      activebackground=C_AMBER_D,
                      highlightthickness=0, showvalue=False, bd=0,
                      command=lambda v, k=key: self._on_change())
        sl.pack(side="left", padx=(4,4))
        # keep value label updated
        var.trace_add("write", lambda *a, lbl=val_lbl, v=var: lbl.config(
            text=f"{v.get():.2f}"))

    # ── actions ──────────────────────────────────────────────────────

    def _load_image(self):
        path = filedialog.askopenfilename(
            title="Select source image",
            filetypes=[("Images", "*.png *.jpg *.jpeg *.bmp *.tif *.tiff *.webp"),
                       ("All files", "*.*")])
        if not path:
            return
        try:
            self.src_image = Image.open(path)
            self.status_var.set(f"{os.path.basename(path)}  "
                                f"({self.src_image.width}×{self.src_image.height})")
            self._trigger_render()
        except Exception as e:
            messagebox.showerror("Load error", str(e))

    def _save_output(self):
        if self.result_img is None:
            messagebox.showinfo("Nothing to save", "Run the pipeline first.")
            return
        path = filedialog.asksaveasfilename(
            defaultextension=".png",
            filetypes=[("PNG", "*.png")],
            title="Save output")
        if path:
            self.result_img.save(path)
            self.status_var.set(f"Saved → {os.path.basename(path)}")

    def _reset_sliders(self):
        for key, var in self.vars.items():
            var.set(self.DEFAULTS[key])
        self.suppress_var.set(True)
        self._trigger_render()

    def _on_change(self):
        self._trigger_render()

    # ── render logic (debounced, threaded) ───────────────────────────

    def _trigger_render(self):
        if self.src_image is None:
            return
        self._pending = True
        if not self._running:
            self.root.after(120, self._maybe_render)

    def _maybe_render(self):
        if not self._pending:
            return
        self._pending = False
        self._running = True
        params = {k: v.get() for k, v in self.vars.items()}
        params["SUPPRESS_BG"] = self.suppress_var.get()
        self.status_var.set("Rendering…")
        threading.Thread(target=self._render_thread,
                         args=(params,), daemon=True).start()

    def _render_thread(self, params):
        try:
            result = run_pipeline(self.src_image.copy(), params)
            self.result_img = result
            self.root.after(0, self._update_preview, result)
        except Exception as e:
            self.root.after(0, lambda: self.status_var.set(f"Error: {e}"))
        finally:
            self._running = False
            if self._pending:
                self.root.after(0, self._maybe_render)

    def _update_preview(self, img: Image.Image):
        # Composite onto black for canvas (canvas doesn't handle RGBA natively)
        flat = Image.new("RGB", img.size, BG)
        flat.paste(img, mask=img.split()[3])
        self._tk_img = ImageTk.PhotoImage(flat)
        self.canvas.create_image(0, 0, anchor="nw", image=self._tk_img)
        self.status_var.set("Ready  ·  "
                            + "  ".join(f"{k}={v:.2f}"
                                        for k,v in list(self.vars.items())[:4]))

    # ── placeholder ──────────────────────────────────────────────────

    def _show_placeholder(self):
        self.canvas.delete("all")
        self.canvas.create_rectangle(0, 0, PREVIEW_W, PREVIEW_H,
                                     fill=C_BG, outline="")
        # Amber border echo
        self.canvas.create_rectangle(2, 2, PREVIEW_W-3, PREVIEW_H-3,
                                     outline=C_AMBER_D, width=1)
        self.canvas.create_rectangle(6, 6, PREVIEW_W-7, PREVIEW_H-7,
                                     outline=C_BORDER, width=1)
        # Centre text
        cx, cy = PREVIEW_W//2, PREVIEW_H//2
        self.canvas.create_text(cx, cy-16,
                                text="▣ LOAD AN IMAGE",
                                font=("Courier", 14, "bold"),
                                fill=C_AMBER_D)
        self.canvas.create_text(cx, cy+10,
                                text="to begin processing",
                                font=FONT_LABEL, fill=C_DIM)
        # Tick marks (mirror the border art)
        for x in range(24, PREVIEW_W, 24):
            self.canvas.create_line(x, 0, x, 4, fill=C_BORDER)
            self.canvas.create_line(x, PREVIEW_H-1, x, PREVIEW_H-5, fill=C_BORDER)


# ── Entry ─────────────────────────────────────────────────────────────

def main():
    root = tk.Tk()
    app  = FiteGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
