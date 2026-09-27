# -*- coding: utf-8 -*-
import os, subprocess, json, urllib.request, sys

base = r"D:\MUSI\SHIJU\ui界面图\输出"
crop_root = os.path.join(base, "原始裁剪")
out_root = os.path.join(base, "抠图结果")
os.makedirs(out_root, exist_ok=True)

total = 0
ok = 0
fail = []

for sub in sorted(os.listdir(crop_root)):
    sub_dir = os.path.join(crop_root, sub)
    if not os.path.isdir(sub_dir): continue
    out_dir = os.path.join(out_root, sub)
    os.makedirs(out_dir, exist_ok=True)
    for fname in sorted(os.listdir(sub_dir)):
        if not fname.lower().endswith(".png"): continue
        total += 1
        src = os.path.join(sub_dir, fname)
        dst = os.path.join(out_dir, fname)
        if os.path.exists(dst) and os.path.getsize(dst) > 1000:
            ok += 1
            continue
        try:
            r = subprocess.run(
                ["mediakit-cli", "image", "remove-image-background",
                 "--image-url", src, "--scene", "general", "--output-format", "png"],
                capture_output=True, text=True, timeout=120, encoding="utf-8"
            )
            data = json.loads(r.stdout)
            if data.get("success") and data.get("image_url"):
                urllib.request.urlretrieve(data["image_url"], dst)
                ok += 1
                print(f"[{ok}/{total}] {sub}/{fname}")
            else:
                fail.append(f"{sub}/{fname}: {r.stdout[:200]}")
                print(f"FAIL {sub}/{fname}")
        except Exception as e:
            fail.append(f"{sub}/{fname}: {e}")
            print(f"ERR {sub}/{fname}: {e}")

print(f"\n=== DONE: {ok}/{total} ok, {len(fail)} failed ===")
for f in fail:
    print("  FAIL:", f)
