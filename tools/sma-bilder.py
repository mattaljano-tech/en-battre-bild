#!/usr/bin/env python3
"""Gör mindre versioner av fotona i public/img/ till galleriet på startsidan.

Kör efter att ett nytt foto lagts i public/img/:   python3 tools/sma-bilder.py
Kräver Pillow (pip install pillow). Skapar public/img/640/<namn>.webp och public/img/1200/<namn>.webp.
Saknas en liten version används originalet, så sidan fungerar även om skriptet inte körts.
"""
import os, sys
from PIL import Image, ImageOps

ROT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "img")
BREDDER = (640, 1200)

nya = 0
for namn in sorted(os.listdir(ROT)):
    kalla = os.path.join(ROT, namn)
    if not os.path.isfile(kalla) or not namn.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    for bredd in BREDDER:
        mapp = os.path.join(ROT, str(bredd))
        os.makedirs(mapp, exist_ok=True)
        mal = os.path.join(mapp, os.path.splitext(namn)[0] + ".webp")
        if os.path.exists(mal) and os.path.getmtime(mal) >= os.path.getmtime(kalla) and "--alla" not in sys.argv:
            continue
        bild = ImageOps.exif_transpose(Image.open(kalla)).convert("RGB")
        if bild.width > bredd:
            bild = bild.resize((bredd, round(bild.height * bredd / bild.width)), Image.LANCZOS)
        bild.save(mal, "WEBP", quality=78, method=6)
        nya += 1
print(f"{nya} små bilder skapade")
