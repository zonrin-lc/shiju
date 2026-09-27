# -*- coding: utf-8 -*-
import os
from PIL import Image
A = os.path.join(os.path.dirname(__file__), "..")
BG = os.path.join(A, "bg"); MS = os.path.join(A, "misc")
DARK = (0x17,0x14,0x0F,255)

out = Image.new("RGBA", (1400, 900), DARK)
# hero 480x600
h = Image.open(os.path.join(BG,"bg_home_hero.jpg")).convert("RGBA").resize((360,450))
out.alpha_composite(h,(20,20))
# share 480x720 -> 320x480
s = Image.open(os.path.join(BG,"bg_share.jpg")).convert("RGBA").resize((320,480))
out.alpha_composite(s,(410,20))
# hamster 512 -> 300
hs = Image.open(os.path.join(MS,"misc_hamster.png")).resize((300,300))
out.alpha_composite(hs,(780,20))
# scroll 960x240 -> 560x140
sc = Image.open(os.path.join(MS,"misc_scroll.png")).resize((560,140))
out.alpha_composite(sc,(780,340))
out.convert("RGB").save(os.path.join(A,"_gen","b3b5-check.png"))
print("ok")
