#!/usr/bin/env python3
"""Gör 3D-modeller av fotona som inramade tavlor, till "Se den på din vägg" på startsidan.

Kör efter att ett nytt foto lagts i public/img/:   python3 tools/ar-modeller.py
Kräver Pillow (pip install pillow). Skapar public/ar/enhet.bin (en enhetskub och en enhetsruta som alla
tavlor delar) och public/ar/<namn>-<långsida i cm>.gltf för varje foto och storlek. Filerna är små:
själva fotot ligger inte i modellen, den pekar på originalet i public/img/.
Storlekarna ska stämma med PRINT_SIZES i public/index.html.
"""
import json, os, struct
from PIL import Image

ROT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
STORLEKAR = (40, 60, 90)       # fotots långsida i cm
RAM, DJUP = 0.02, 0.022        # ramens bredd och djup i meter

def enhet():
    """Enhetskub (24 hörn, 36 index) och enhetsruta (4 hörn med uv, 6 index), i en gemensam binärfil."""
    kp, kn, ki = [], [], []
    for axel in range(3):
        for tecken in (1, -1):
            n = [0, 0, 0]; n[axel] = tecken
            u, v = (axel + 1) % 3, (axel + 2) % 3
            start = len(kp)
            for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                p = [0, 0, 0]; p[axel] = .5 * tecken; p[u] = .5 * a; p[v] = .5 * b
                kp.append(p); kn.append(n)
            ki += [start, start + 1, start + 2, start, start + 2, start + 3] if tecken > 0 else [start, start + 2, start + 1, start, start + 3, start + 2]
    rp = [[-.5, -.5, 0], [.5, -.5, 0], [.5, .5, 0], [-.5, .5, 0]]
    rn = [[0, 0, 1]] * 4
    ruv = [[0, 1], [1, 1], [1, 0], [0, 0]]
    ri = [0, 1, 2, 0, 2, 3]
    delar = [("kp", kp, "f"), ("kn", kn, "f"), ("ki", ki, "H"), ("rp", rp, "f"), ("rn", rn, "f"), ("ruv", ruv, "f"), ("ri", ri, "H")]
    data, vyer = b"", {}
    for namn, varden, typ in delar:
        platt = [x for rad in varden for x in rad] if typ == "f" else varden
        bitar = struct.pack("<%d%s" % (len(platt), typ), *platt)
        vyer[namn] = (len(data), len(bitar)); data += bitar + b"\0" * (-len(bitar) % 4)
    return data, vyer

DATA, VYER = enhet()

def gltf(bildfil, bredd, hojd):
    """En tavla: foto (bredd × hojd meter), passepartout, svart ram och bakstycke. Framsidan pekar åt +Z, baksidan ligger mot väggen."""
    pp = min(.08, max(.04, .12 * min(bredd, hojd)))          # passepartoutens bredd
    W, H = bredd + 2 * pp, hojd + 2 * pp                      # innanför ramen
    OW, OH = W + 2 * RAM, H + 2 * RAM                         # hela tavlan
    vy = lambda n, mal=None: dict({"buffer": 0, "byteOffset": VYER[n][0], "byteLength": VYER[n][1]}, **({"target": mal} if mal else {}))
    nod = lambda mesh, skala, plats: {"mesh": mesh, "scale": skala, "translation": plats}
    return {
        "asset": {"version": "2.0", "generator": "En bättre bild, tools/ar-modeller.py"},
        "scene": 0, "scenes": [{"nodes": [0]}],
        "nodes": [
            {"name": "tavla", "children": [1, 2, 3, 4, 5, 6, 7]},
            nod(0, [bredd, hojd, 1], [0, 0, .0155]),                    # fotot
            nod(1, [W, H, 1], [0, 0, .014]),                             # passepartout
            nod(2, [OW, RAM, DJUP], [0, (H + RAM) / 2, DJUP / 2]),       # ramen: uppe, nere, vänster, höger
            nod(2, [OW, RAM, DJUP], [0, -(H + RAM) / 2, DJUP / 2]),
            nod(2, [RAM, H, DJUP], [-(W + RAM) / 2, 0, DJUP / 2]),
            nod(2, [RAM, H, DJUP], [(W + RAM) / 2, 0, DJUP / 2]),
            nod(2, [OW, OH, .004], [0, 0, .002]),                        # bakstycke
        ],
        "meshes": [
            {"primitives": [{"attributes": {"POSITION": 3, "NORMAL": 4, "TEXCOORD_0": 5}, "indices": 6, "material": 0}]},
            {"primitives": [{"attributes": {"POSITION": 3, "NORMAL": 4, "TEXCOORD_0": 5}, "indices": 6, "material": 1}]},
            {"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "material": 2}]},
        ],
        "materials": [
            {"name": "foto", "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "metallicFactor": 0, "roughnessFactor": 1}},
            {"name": "passepartout", "pbrMetallicRoughness": {"baseColorFactor": [.93, .92, .89, 1], "metallicFactor": 0, "roughnessFactor": 1}},
            {"name": "ram", "pbrMetallicRoughness": {"baseColorFactor": [.03, .03, .03, 1], "metallicFactor": 0, "roughnessFactor": .55}},
        ],
        "textures": [{"source": 0, "sampler": 0}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "images": [{"uri": "../img/" + bildfil}],
        "buffers": [{"uri": "enhet.bin", "byteLength": len(DATA)}],
        "bufferViews": [vy("kp", 34962), vy("kn", 34962), vy("ki", 34963), vy("rp", 34962), vy("rn", 34962), vy("ruv", 34962), vy("ri", 34963)],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": 24, "type": "VEC3", "min": [-.5, -.5, -.5], "max": [.5, .5, .5]},
            {"bufferView": 1, "componentType": 5126, "count": 24, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5123, "count": 36, "type": "SCALAR"},
            {"bufferView": 3, "componentType": 5126, "count": 4, "type": "VEC3", "min": [-.5, -.5, 0], "max": [.5, .5, 0]},
            {"bufferView": 4, "componentType": 5126, "count": 4, "type": "VEC3"},
            {"bufferView": 5, "componentType": 5126, "count": 4, "type": "VEC2"},
            {"bufferView": 6, "componentType": 5123, "count": 6, "type": "SCALAR"},
        ],
    }

mapp = os.path.join(ROT, "ar"); os.makedirs(mapp, exist_ok=True)
open(os.path.join(mapp, "enhet.bin"), "wb").write(DATA)
antal = 0
for namn in sorted(os.listdir(os.path.join(ROT, "img"))):
    kalla = os.path.join(ROT, "img", namn)
    if not os.path.isfile(kalla) or not namn.lower().endswith((".jpg", ".jpeg", ".png")):
        continue
    b, h = Image.open(kalla).size
    for cm in STORLEKAR:
        lang = cm / 100
        bredd, hojd = (lang, lang * h / b) if b >= h else (lang * b / h, lang)
        with open(os.path.join(mapp, "%s-%d.gltf" % (os.path.splitext(namn)[0], cm)), "w") as f:
            json.dump(gltf(namn, round(bredd, 4), round(hojd, 4)), f, separators=(",", ":"))
        antal += 1
print(antal, "tavlor skapade")
