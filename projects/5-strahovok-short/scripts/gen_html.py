# -*- coding: utf-8 -*-
import os
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
H=SP+"/v2/html"
BG = """<div class="bg"></div><div class="grid"></div>
<div class="glow g1"></div><div class="glow g2"></div>
<div class="noise"></div><div class="vig"></div>"""
def page(body, transparent=False):
    bg = "" if transparent else (BG + '<div class="scrim"></div>')
    tb = "background:transparent" if transparent else ""
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="base.css"><style>body{{{tb}}}</style></head>
<body><div class="stage">{bg}{body}</div></body></html>"""

G = '<defs><linearGradient id="{i}" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient></defs>'
MINT,BLUE,GOLD,ORANGE = "#3FE0C0","#2E7BE0","#FFC65C","#FF8A5B"

PHONE = f'''<svg viewBox="0 0 240 340" width="290" height="410">{G.format(i="pg",a=MINT,b=BLUE)}
 <rect x="30" y="14" width="180" height="312" rx="34" fill="rgba(255,255,255,.07)" stroke="url(#pg)" stroke-width="6"/>
 <rect x="52" y="52" width="136" height="216" rx="14" fill="url(#pg)" opacity=".22"/>
 <rect x="96" y="28" width="48" height="10" rx="5" fill="url(#pg)"/>
 <circle cx="120" cy="296" r="16" fill="none" stroke="url(#pg)" stroke-width="6"/>
 <path d="M78 118 l84 84 M162 118 l-84 84" stroke="#FF9B6A" stroke-width="12" stroke-linecap="round" opacity=".95"/></svg>'''

PLANE = f'''<svg viewBox="0 0 360 340" width="360" height="340">{G.format(i="ag",a=MINT,b=BLUE)}
 <path d="M180 18 c17 0 27 30 27 62 v44 l128 74 v40 l-128 -38 v66 l40 32 v26 l-67 -18 -67 18 v-26 l40 -32 v-66 l-128 38 v-40 l128 -74 v-44 c0-32 10-62 27-62 Z"
   fill="url(#ag)" opacity=".30" stroke="url(#ag)" stroke-width="6" stroke-linejoin="round"/></svg>'''

CAR = f'''<svg viewBox="0 0 400 280" width="440" height="308">{G.format(i="cg",a=MINT,b=BLUE)}
 <path d="M26 214 v-30 c0-16 10-29 26-33 l34-8 36-56 c11-17 29-27 49-27 h82 c20 0 38 10 49 27 l36 56 34 8 c16 4 26 17 26 33 v30 Z"
   fill="url(#cg)" opacity=".26" stroke="url(#cg)" stroke-width="6" stroke-linejoin="round"/>
 <path d="M122 140 l28 -44 c4-6 10-9 17-9 h27 v53 Z" fill="url(#cg)" opacity=".55"/>
 <path d="M212 140 v-53 h27 c7 0 13 3 17 9 l28 44 Z" fill="url(#cg)" opacity=".55"/>
 <circle cx="112" cy="214" r="34" fill="#0A1424" stroke="url(#cg)" stroke-width="8"/>
 <circle cx="288" cy="214" r="34" fill="#0A1424" stroke="url(#cg)" stroke-width="8"/>
 <circle cx="112" cy="214" r="12" fill="url(#cg)"/><circle cx="288" cy="214" r="12" fill="url(#cg)"/></svg>'''

TOOTH = f'''<svg viewBox="0 0 200 280" width="250" height="350">
 <defs><linearGradient id="tg" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#E6F1FF"/><stop offset="1" stop-color="#AFC6E4"/></linearGradient></defs>
 <path d="M100,16 C58,16 26,48 26,94 C26,140 42,170 50,206 C57,238 61,266 72,266 C85,266 87,238 93,216 C97,200 103,200 107,216 C113,238 115,266 128,266 C139,266 143,238 150,206 C158,170 174,140 174,94 C174,48 142,16 100,16 Z"
  fill="url(#tg)" stroke="rgba(255,255,255,.5)" stroke-width="3"/></svg>'''

FIRSTAID = f'''<svg viewBox="0 0 300 300" width="330" height="330">{G.format(i="fg",a=GOLD,b=ORANGE)}
 <path d="M150 26 L266 74 V152 C266 224 214 268 150 288 C86 268 34 224 34 152 V74 Z"
   fill="url(#fg)" opacity=".18" stroke="url(#fg)" stroke-width="7"/>
 <path d="M126 96 h48 v40 h40 v48 h-40 v40 h-48 v-40 h-40 v-48 h40 Z" fill="url(#fg)"/></svg>'''

COINS = f'''<svg viewBox="0 0 340 260" width="380" height="290">{G.format(i="mg",a=GOLD,b=ORANGE)}
 <ellipse cx="110" cy="196" rx="86" ry="30" fill="url(#mg)" opacity=".30"/>
 <ellipse cx="110" cy="166" rx="86" ry="30" fill="url(#mg)" opacity=".45"/>
 <ellipse cx="110" cy="136" rx="86" ry="30" fill="url(#mg)" opacity=".65"/>
 <circle cx="252" cy="120" r="62" fill="none" stroke="url(#mg)" stroke-width="8"/>
 <text x="252" y="150" font-family="MontserratX800" font-size="76" fill="{GOLD}" text-anchor="middle">€</text>
</svg>'''
COINS_X = COINS.replace("</svg>", '<path d="M300 208 l24 24 M324 208 l-24 24" stroke="#FF9B6A" stroke-width="9" stroke-linecap="round"/></svg>')

DOC = f'''<svg viewBox="0 0 260 320" width="290" height="356">{G.format(i="dg",a=MINT,b=BLUE)}
 <path d="M42 18 h124 l56 56 v228 a14 14 0 0 1-14 14 H42 a14 14 0 0 1-14-14 V32 a14 14 0 0 1 14-14 Z"
   fill="rgba(255,255,255,.06)" stroke="url(#dg)" stroke-width="6"/>
 <path d="M166 18 v56 h56" fill="none" stroke="url(#dg)" stroke-width="6"/>
 <path d="M66 132 h128 M66 176 h128 M66 220 h84" stroke="url(#dg)" stroke-width="9" stroke-linecap="round" opacity=".8"/>
 <circle cx="196" cy="248" r="46" fill="#0A1424"/>
 <circle cx="196" cy="248" r="42" fill="none" stroke="{MINT}" stroke-width="7"/>
 <path d="M176 248 l14 16 l26 -32" fill="none" stroke="{MINT}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>'''

CAL = f'''<svg viewBox="0 0 300 280" width="330" height="308">{G.format(i="kg",a=MINT,b=BLUE)}
 <rect x="26" y="46" width="248" height="212" rx="26" fill="rgba(255,255,255,.06)" stroke="url(#kg)" stroke-width="6"/>
 <path d="M26 106 h248" stroke="url(#kg)" stroke-width="6"/>
 <rect x="80" y="22" width="16" height="48" rx="8" fill="url(#kg)"/><rect x="204" y="22" width="16" height="48" rx="8" fill="url(#kg)"/>
 <text x="150" y="212" font-family="MontserratX800" font-size="78" fill="{MINT}" text-anchor="middle">365</text></svg>'''

PERSON = f'''<svg viewBox="0 0 260 260" width="270" height="270">{G.format(i="hg",a=MINT,b=BLUE)}
 <circle cx="130" cy="92" r="48" fill="none" stroke="url(#hg)" stroke-width="8"/>
 <path d="M40 234 c0-52 40-84 90-84 s90 32 90 84" fill="none" stroke="url(#hg)" stroke-width="8" stroke-linecap="round"/></svg>'''

def card(num, term, ru, icon):
    return page(f"""
<div class="wrap" style="gap:34px">
  <div class="num">{num}</div>
  <div style="filter:drop-shadow(0 26px 60px rgba(0,0,0,.5))">{icon}</div>
  <div><div class="term">{term}</div><div class="ru" style="margin-top:14px">{ru}</div></div>
</div>""")

S={}
S["v2_s1"]=card("01","Handyversicherung","страховка телефона",PHONE)
S["v2_s2"]=card("02","Reiserücktritts&shy;versicherung","страховка отмены поездки",PLANE)
S["v2_s3"]=card("03","Insassenunfall&shy;versicherung","страховка пассажиров в машине",CAR)
S["v2_s4"]=card("04","Zahnzusatz&shy;versicherung","дополнительная зубная страховка",TOOTH)
S["v2_s5"]=card("05","Unfallversicherung","страховка от несчастного случая",FIRSTAID)

S["v2_s1b"]=page(f"""
<div class="wrap" style="gap:40px">
  <div class="kicker">на что смотреть</div>
  <div class="pill bad"><span class="xmark">✕</span> большая франшиза</div>
  <div class="pill bad"><span class="xmark">✕</span> ограниченный список случаев</div>
  <div class="pill bad"><span class="xmark">✕</span> жёсткие условия</div>
</div>""")

S["v2_s1c"]=page(f"""
<div class="wrap" style="gap:42px">
  <div>{COINS}</div>
  <div class="h1 sm" style="font-size:64px;line-height:1.12">ДЕШЕВЛЕ ОТЛОЖИТЬ<br><span class="accent">ИЛИ В РАССРОЧКУ</span></div>
</div>""")

S["v2_s2b"]=page(f"""
<div class="wrap" style="gap:44px">
  <div>{COINS_X}</div>
  <div class="de" style="font-size:66px">Gebühren</div>
  <div class="sub" style="font-size:40px;margin-top:-18px">сборы за каждое оформление</div>
</div>""")

S["v2_s2c"]=page(f"""
<div class="wrap" style="gap:44px">
  <div>{CAL}</div>
  <div class="h1 sm" style="font-size:70px;line-height:1.12">ЛУЧШЕ СРАЗУ<br><span class="accent">ГОДОВАЯ</span></div>
</div>""")

S["v2_s3b"]=page(f"""
<div class="wrap" style="gap:40px">
  <div class="kicker">уже покрывает</div>
  <div class="de" style="font-size:62px">Haftpflicht&shy;versicherung</div>
  <div class="sub" style="font-size:38px;margin-top:-14px">страхование ответственности<br>виновника ДТП</div>
  <div class="pill good" style="margin-top:8px"><span class="check">+</span> ваша больничная касса</div>
</div>""")

S["v2_s4b"]=page(f"""
<div class="wrap" style="gap:40px">
  <div class="kicker">эконом-тарифы</div>
  <div class="card" style="padding:56px 66px">
    <div class="big" style="font-size:150px;white-space:nowrap">20&#8202;–&#8202;30&#8201;%</div>
  </div>
  <div class="sub" style="font-size:40px">от стоимости лечения</div>
</div>""")

S["v2_s5b"]=page(f"""
<div class="wrap" style="gap:40px">
  <div class="kicker">пакет из интернета</div>
  <div class="pill bad"><span class="xmark">✕</span> не спрашивают ваши данные</div>
  <div class="pill bad"><span class="xmark">✕</span> не учитывают ваши нюансы</div>
</div>""")

S["v2_s5c"]=page(f"""
<div class="wrap" style="gap:44px">
  <div>{DOC}</div>
  <div class="h1 sm" style="font-size:66px;line-height:1.12">ТОЛЬКО ПОСЛЕ<br><span class="accent">КОНСУЛЬТАЦИИ</span></div>
</div>""")

S["v2_outro"]=page(f"""
<div class="wrap" style="gap:36px">
  <div>{PERSON}</div>
  <div class="h1" style="font-size:104px">Анастасия</div>
  <div class="sub" style="font-size:40px;line-height:1.35">страховой и финансовый<br>консультант в Германии</div>
  <div class="pill good" style="margin-top:10px">телефон — в шапке профиля</div>
</div>""")


BUBBLE = f'''<svg viewBox="0 0 320 280" width="360" height="315">{G.format(i="bg9",a=MINT,b=BLUE)}
 <path d="M40 30 h240 a26 26 0 0 1 26 26 v122 a26 26 0 0 1 -26 26 h-128 l-72 60 v-60 h-40 a26 26 0 0 1 -26 -26 V56 a26 26 0 0 1 26 -26 Z"
  fill="rgba(255,255,255,.06)" stroke="url(#bg9)" stroke-width="6" stroke-linejoin="round"/>
 <path d="M76 90 h168 M76 132 h112" stroke="url(#bg9)" stroke-width="10" stroke-linecap="round" opacity=".85"/></svg>'''

S["v2_s5d"]=page(f"""
<div class="wrap" style="gap:44px">
  <div class="kicker">небольшие происшествия</div>
  <div class="h1 sm" style="font-size:72px;line-height:1.12">КАК ПРАВИЛО,<br><span class="gold">НИЧЕГО НЕ ПЛАТЯТ</span></div>
</div>""")

S["v2_cta"]=page(f"""
<div class="wrap" style="gap:44px">
  <div>{BUBBLE}</div>
  <div class="h1 sm" style="font-size:70px;line-height:1.12">ПИШИТЕ<br><span class="accent">В КОММЕНТАРИЯХ</span></div>
  <div class="sub" style="font-size:38px">делитесь вашим опытом</div>
</div>""")

# ---- transparent overlays ----
S["v2_cover"]=page("""
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,10,20,.66) 0%,rgba(4,10,20,.10) 16%,rgba(4,10,20,0) 34%,rgba(4,10,20,.34) 58%,rgba(3,8,16,.90) 80%,rgba(3,8,16,.97) 100%)"></div>
<div class="chipwrap" style="top:40px">
  <div class="chip" style="padding:18px 32px"><span class="dot"></span>
    <span class="de2" style="font-size:34px;letter-spacing:.14em">ГЕРМАНИЯ · СТРАХОВАНИЕ</span></div>
</div>
<div style="position:absolute;left:0;right:0;bottom:270px;padding:0 70px;text-align:center">
  <div style="font-family:'MontserratX800';font-size:96px;line-height:1.02;color:#fff;text-shadow:0 18px 60px rgba(0,0,0,.6)">
    5 СТРАХОВОК,<br>КОТОРЫЕ ТЕБЕ<br><span style="color:#3FE0C0">ПРОДАЛИ ЗРЯ</span></div>
</div>""", transparent=True)

def chip(de,ru):
    return page(f"""<div class="chipwrap" style="top:34px"><div class="chip" style="padding:18px 32px">
      <span class="dot"></span>
      <div style="text-align:left"><div class="de2" style="font-size:38px">{de}</div><div class="ru2" style="font-size:27px">{ru}</div></div>
    </div></div>""", transparent=True)
S["v2_chip1"]=chip("Handyversicherung","страховка телефона")
S["v2_chip2"]=chip("Reiserücktrittsversicherung","страховка отмены поездки")
S["v2_chip3"]=chip("Insassenunfallversicherung","страховка пассажиров в машине")
S["v2_chip4"]=chip("Zahnzusatzversicherung","дополнительная зубная страховка")
S["v2_chip5"]=chip("Angebot","пакетное предложение со скидкой")

for k,v in S.items(): open(f"{H}/{k}.html","w").write(v)
print("wrote",len(S))
