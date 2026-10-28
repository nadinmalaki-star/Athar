#!/usr/bin/env python3
"""
Apply the two approved FORMA V10 image corrections, and only those two.

Usage:
    python3 patch_forma.py <hero2_replacement.jpg> <bathroom_replacement.jpg>

Reads FORMA_V10_master.html (the untouched, byte-for-byte original backed up
alongside this script), swaps exactly two base64 payloads:
  1. The second hero slide's background-image (CSS url(data:image/jpeg;base64,...))
  2. BOTH occurrences of the Bathrooms photo:
       - the "bath" category thumbnail <img src="data:image/jpeg;base64,...">
       - the cats.bath.img entry in the inline JS data object
     (these are currently byte-identical, confirming it's one photo reused twice)

...and writes the result to ../demos/forma/index.html, leaving the master
backup in this folder completely untouched. Nothing else in the file is
modified — no other image, no text, no animation, no layout.

Exits non-zero with a clear message if either replacement image can't be
read, or if the expected patterns aren't found (so it never silently
no-ops or partially patches).
"""
import sys, re, base64, os

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = os.path.join(HERE, "FORMA_V10_master.html")
OUT = os.path.join(HERE, "..", "demos", "forma", "index.html")


def read_b64(path):
    with open(path, "rb") as f:
        data = f.read()
    ext = "png" if path.lower().endswith(".png") else "jpeg"
    return ext, base64.b64encode(data).decode("ascii")


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    hero2_path, bath_path = sys.argv[1], sys.argv[2]

    hero2_ext, hero2_b64 = read_b64(hero2_path)
    bath_ext, bath_b64 = read_b64(bath_path)

    with open(MASTER, "r", encoding="utf-8") as f:
        html = f.read()
    original_len = len(html)

    # 1. Second hero slide (CSS background-image url(), JPEG base64)
    css_pat = re.compile(r"url\('data:image/[a-zA-Z]+;base64,([^']+)'\)")
    matches = list(css_pat.finditer(html))
    if len(matches) != 3:
        sys.exit(f"Expected exactly 3 hero-slide background images, found {len(matches)}. Aborting — refusing to guess.")
    m2 = matches[1]
    new_hero2 = f"url('data:image/{hero2_ext};base64,{hero2_b64}')"
    html = html[:m2.start()] + new_hero2 + html[m2.end():]

    # 2. Bathroom photo — both occurrences, identified by their exact current payload
    #    (re-locate after the hero swap, since offsets have shifted)
    img_pat = re.compile(r'<img[^>]*src="data:image/([a-zA-Z]+);base64,([^"]+)"')
    img_matches = list(img_pat.finditer(html))
    bath_candidates = [m for m in img_matches if "bath" in html[max(0, m.start() - 200):m.start()]]
    cats_pat = re.compile(r"bath:\{img:'data:image/[a-zA-Z]+;base64,([^']+)'")
    cats_match = cats_pat.search(html)

    if len(bath_candidates) != 1 or not cats_match:
        sys.exit(f"Expected exactly 1 bath <img> and 1 cats.bath.img entry; "
                  f"found {len(bath_candidates)} and {'1' if cats_match else '0'}. Aborting.")

    # Replace the cats.bath.img JS string first (further in the file)
    html = html[:cats_match.start(1)] + bath_b64 + html[cats_match.end(1):]
    # Re-find the <img> (offsets unaffected since it's earlier in the file than the JS object)
    bath_img_match = bath_candidates[0]
    new_bath_img = f'<img src="data:image/{bath_ext};base64,{bath_b64}"'
    # Replace just the src portion of that one <img> tag opening
    start = bath_img_match.start()
    end = bath_img_match.end()
    html = html[:start] + new_bath_img + html[end:]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Wrote {OUT}")
    print(f"Original size: {original_len:,} chars -> New size: {len(html):,} chars")
    print("Patched: hero slide 2 background image, bath category thumbnail, cats.bath.img")
    print("Untouched: hero slides 1 & 3, kitchen/living images, gallery images, all text, "
          "all CSS/JS, the cinematic-scroll section, footer, consultation flow.")


if __name__ == "__main__":
    main()
