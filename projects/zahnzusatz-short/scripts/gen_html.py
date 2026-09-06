# -*- coding: utf-8 -*-
import os
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
H=SP+"/html"

BG = """<div class="bg"></div><div class="grid"></div>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="noise"></div><div class="vig"></div>"""

def page(body, css_extra="", transparent=False):
    bg = "" if transparent else (BG + '<div class="scrim"></div>')
    tb = "background:transparent" if transparent else ""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="base.css"><style>body{{{tb}}}{css_extra}</style></head>
<body><div class="stage">{bg}{body}</div></body></html>"""

# ---------- SVG bits ----------
TOOTH = """<svg viewBox="0 0 200 280" width="{w}" height="{h}">
 <defs><linearGradient id="tg{i}" x1="0" y1="0" x2="0.4" y2="1">
   <stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#E6F1FF"/><stop offset="1" stop-color="#AFC6E4"/></linearGradient>
  <linearGradient id="tsh{i}" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stop-color="#ffffff" stop-opacity=".85"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>
 <path d="M100,16 C58,16 26,48 26,94 C26,140 42,170 50,206 C57,238 61,266 72,266 C85,266 87,238 93,216 C97,200 103,200 107,216 C113,238 115,266 128,266 C139,266 143,238 150,206 C158,170 174,140 174,94 C174,48 142,16 100,16 Z"
  fill="url(#tg{i})" stroke="rgba(255,255,255,.55)" stroke-width="3"/>
 <path d="M62,50 C78,34 104,30 124,38 C104,40 82,52 70,72 Z" fill="url(#tsh{i})"/></svg>"""

def tooth(w=200,h=280,i=0): return TOOTH.format(w=w,h=h,i=i)

CARD_SVG = """<svg viewBox="0 0 460 300" width="460" height="300">
 <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#2C6FD1"/><stop offset="1" stop-color="#14C0A4"/></linearGradient>
  <linearGradient id="cgl" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffffff" stop-opacity=".30"/><stop offset=".6" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>
 <rect x="10" y="16" width="440" height="272" rx="34" fill="url(#cg)"/>
 <rect x="10" y="16" width="440" height="272" rx="34" fill="url(#cgl)"/>
 <rect x="10" y="16" width="440" height="272" rx="34" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="3"/>
 <rect x="46" y="118" width="86" height="66" rx="12" fill="#FFD98A"/>
 <path d="M46 140 h86 M46 162 h86 M75 118 v66 M103 118 v66" stroke="#B8892E" stroke-width="4" opacity=".7"/>
 <rect x="164" y="122" width="230" height="16" rx="8" fill="#ffffff" opacity=".85"/>
 <rect x="164" y="152" width="170" height="14" rx="7" fill="#ffffff" opacity=".55"/>
 <rect x="46" y="216" width="290" height="14" rx="7" fill="#ffffff" opacity=".45"/>
 <g transform="translate(348,196)"><circle r="42" fill="rgba(255,255,255,.16)"/>
  <path d="M-20 0 h40 M0 -20 v40" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/></g>
</svg>"""

SHIELD = """<svg viewBox="0 0 260 300" width="392" height="452">
 <defs><linearGradient id="sg" x1="0" y1="0" x2="0.6" y2="1">
  <stop offset="0" stop-color="#3FE0C0"/><stop offset="1" stop-color="#1F7FD6"/></linearGradient></defs>
 <path d="M130,8 L246,54 V140 C246,214 196,266 130,292 C64,266 14,214 14,140 V54 Z"
  fill="url(#sg)" opacity=".22" stroke="#3FE0C0" stroke-width="4"/>
 <g transform="translate(66,44) scale(0.46)">""" + tooth(200,280,9) + """</g></svg>"""

CLOCK = """<svg viewBox="0 0 340 300" width="486" height="428">
 <defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="0">
   <stop offset="0" stop-color="#3FE0C0"/><stop offset="1" stop-color="#6FB6FF"/></linearGradient></defs>
 <circle cx="112" cy="150" r="92" fill="rgba(255,255,255,.06)" stroke="#3FE0C0" stroke-width="6"/>
 <path d="M112 92 V150 L154 176" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" fill="none"/>
 <path d="M228 150 H316" stroke="url(#ag)" stroke-width="14" stroke-linecap="round"/>
 <path d="M286 118 L322 150 L286 182" stroke="url(#ag)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>"""

WARN = """<svg viewBox="0 0 300 280" width="418" height="390">
 <defs><linearGradient id="wg" x1="0" y1="0" x2="0.5" y2="1">
   <stop offset="0" stop-color="#FFD37A"/><stop offset="1" stop-color="#FF8A5B"/></linearGradient></defs>
 <path d="M150 22 L286 250 H14 Z" fill="none" stroke="url(#wg)" stroke-width="10" stroke-linejoin="round"/>
 <rect x="138" y="104" width="24" height="80" rx="12" fill="url(#wg)"/>
 <circle cx="150" cy="212" r="15" fill="url(#wg)"/>
 <g opacity=".9"><path d="M60 70 l-30 -26 M240 70 l30 -26" stroke="#FF9B6A" stroke-width="9" stroke-linecap="round"/></g>
</svg>"""

BARS = """<svg viewBox="0 0 420 220" width="420" height="220">
 <defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#6FB6FF"/><stop offset="1" stop-color="#2C6FD1"/></linearGradient>
  <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#FF9B6A"/><stop offset="1" stop-color="#E0563C"/></linearGradient></defs>
 <rect x="10" y="40" width="76" height="170" rx="16" fill="url(#bg1)"/>
 <rect x="110" y="82" width="76" height="128" rx="16" fill="url(#bg1)" opacity=".8"/>
 <rect x="210" y="122" width="76" height="88" rx="16" fill="url(#bg2)" opacity=".9"/>
 <rect x="310" y="158" width="76" height="52" rx="16" fill="url(#bg2)"/>
 <path d="M40 26 C150 26 260 96 360 150" stroke="#FF9B6A" stroke-width="7" fill="none" stroke-dasharray="16 12" opacity=".85"/>
 <path d="M330 128 L366 154 L326 168" fill="none" stroke="#FF9B6A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>"""

EURO = """<svg viewBox="0 0 200 200" width="150" height="150">
 <circle cx="100" cy="100" r="92" fill="none" stroke="#FFC65C" stroke-width="8" opacity=".55"/>
 <text x="100" y="140" font-family="MontserratX800" font-size="130" fill="#FFC65C" text-anchor="middle">€</text></svg>"""

scenes = {}

scenes["s_kasse"] = page(f"""
<div class="wrap" style="gap:50px">
  <div class="kicker">Германия</div>
  <div style="filter:drop-shadow(0 34px 70px rgba(0,0,0,.55))">{CARD_SVG}</div>
  <div>
    <div class="de" style="font-size:66px">Gesetzliche Krankenkasse</div>
    <div class="sub" style="margin-top:16px;font-size:36px">государственная больничная касса</div>
  </div>
  <div style="margin-top:4px">{BARS}</div>
</div>""")

scenes["s_zub"] = page(f"""
<div class="wrap" style="gap:54px">
  <div class="kicker">Стоматология</div>
  <div style="filter:drop-shadow(0 34px 70px rgba(0,0,0,.55))">{tooth(360,504,1)}</div>
  <div class="sub" style="font-size:40px">лечение одного зуба</div>
</div>""")

scenes["s_price"] = page(f"""
<div class="wrap" style="gap:44px">
  <div class="kicker">Стоимость</div>
  <div class="card" style="padding:56px 62px">
    <div class="big" style="font-size:126px;white-space:nowrap">500&#8202;&ndash;&#8202;1000&#8201;&euro;</div>
  </div>
  <div class="sub" style="font-size:40px">за один зуб</div>
</div>""")

scenes["s_zzv"] = page(f"""
<div class="wrap" style="gap:48px">
  <div>{SHIELD}</div>
  <div class="de" style="font-size:62px;line-height:1.08">Zahnzusatz&shy;versicherung</div>
  <div class="sub" style="font-size:40px;margin-top:-16px">дополнительная зубная страховка</div>
</div>""")

scenes["s_time"] = page(f"""
<div class="wrap" style="gap:56px">
  <div class="kicker">Важно</div>
  <div>{CLOCK}</div>
  <div class="h1 sm" style="font-size:78px;line-height:1.1">ЧЕМ РАНЬШЕ&nbsp;&mdash;<br><span class="accent">ТЕМ БЫСТРЕЕ</span></div>
</div>""")

scenes["s_pain"] = page(f"""
<div class="wrap" style="gap:54px">
  <div>{WARN}</div>
  <div class="h1 sm" style="font-size:78px;line-height:1.1">НЕ ЖДАТЬ,<br><span class="gold">ПОКА ЗАБОЛИТ</span></div>
</div>""")

# ---- cover overlay (transparent, over video) ----
scenes["cover"] = page(f"""
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,10,20,.72) 0%,rgba(4,10,20,.18) 22%,rgba(4,10,20,0) 42%,rgba(4,10,20,.30) 62%,rgba(3,8,16,.90) 86%,rgba(3,8,16,.96) 100%)"></div>
<div class="chipwrap" style="top:74px">
  <div class="chip" style="border-color:rgba(63,224,192,.5)"><span class="dot"></span>
    <span class="de2" style="font-size:38px;letter-spacing:.14em">ГЕРМАНИЯ · СТРАХОВАНИЕ</span></div>
</div>
<div style="position:absolute;left:0;right:0;bottom:250px;padding:0 74px;text-align:center">
  <div class="h1" style="font-size:118px;line-height:.98">ЗУБЫ<br>В ГЕРМАНИИ</div>
  <div style="display:inline-flex;align-items:center;gap:26px;margin-top:40px;padding:24px 44px;border-radius:30px;
       background:linear-gradient(120deg,rgba(255,198,92,.16),rgba(255,198,92,.06));border:2px solid rgba(255,198,92,.55)">
    {EURO.replace('width="150" height="150"','width="88" height="88"')}
    <span style="font-family:'MontserratX800';font-size:66px;color:#FFC65C;letter-spacing:-.01em">500&ndash;1000 €</span>
    <span style="font-family:'InterX600';font-size:40px;color:#EAF2FF">за один зуб</span>
  </div>
</div>""", transparent=True)

# ---- chips ----
def chip(de, ru):
    return page(f"""<div class="chipwrap"><div class="chip">
      <span class="dot"></span>
      <div style="text-align:left"><div class="de2">{de}</div><div class="ru2">{ru}</div></div>
    </div></div>""", transparent=True)

scenes["chip_kk"]  = chip("Gesetzliche Krankenkasse","государственная больничная касса")
scenes["chip_zzv"] = chip("Zahnzusatzversicherung","дополнительная зубная страховка")

for k,v in scenes.items():
    open(f"{H}/{k}.html","w").write(v)
print("wrote", len(scenes), "pages")
