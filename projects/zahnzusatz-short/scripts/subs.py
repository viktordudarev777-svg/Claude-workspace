# -*- coding: utf-8 -*-
import json
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
keep=json.load(open(SP+"/work/cuts.json"))["keep"]
def m(t):
    acc=0.0
    for a,b in keep:
        if t< a: return acc
        if t<=b: return acc+(t-a)
        acc+=b-a
    return acc
K,DE,NUM,W = "key","de","num","w"
WORDS=[
(0.00,"Внимание!",K),(0.72,"Если",W),(1.04,"у",W),(1.16,"вас",W),(1.36,"до",W),(1.52,"сих",W),(1.80,"пор",W),
(2.12,"ещё",W),(2.40,"нет",W),(2.72,"дополнительной",K),(3.44,"зубной",K),(3.88,"страховки,",K),
(4.92,"досмотрите",W),(5.68,"это",W),(5.92,"видео",W),(6.36,"до",W),(6.56,"конца.",W),
(7.00,"Gesetzliche",DE),(7.96,"Krankenkassen",DE),(8.92,"урезают",W),(9.64,"расходы",W),(10.36,"именно",W),
(10.84,"на",W),(11.12,"стоматологию.",K),
(12.12,"На",W),(12.32,"данный",W),(12.76,"момент",W),(13.16,"простое",W),(13.60,"лечение",W),(14.12,"одного",W),
(14.60,"зуба",W),(15.24,"хорошим",W),(15.80,"материалом",W),(16.64,"стоит",W),(17.08,"примерно",W),(17.60,"от",W),
(17.84,"500",NUM),(18.40,"до",W),(18.64,"1000",NUM),(19.04,"евро.",NUM),
(19.52,"Как",W),(19.72,"же",W),(19.84,"быть",W),(20.08,"дальше?",W),
(20.52,"Дополнительная",K),(21.32,"зубная",K),(21.76,"страховка",K),(22.52,"закрывает",W),(23.32,"именно",W),
(23.92,"эти",W),(24.28,"пробелы.",K),
(24.88,"Она",W),(25.08,"покрывает",W),(25.68,"именно",W),(26.08,"то,",W),(26.40,"что",W),(26.80,"ваша",W),
(27.16,"gesetzliche",DE),(28.00,"Krankenkasse",DE),(28.88,"отказывается",W),(29.64,"выплачивать.",K),
(30.48,"И",W),(30.68,"чем",W),(30.96,"раньше",K),(31.40,"вы",W),(31.60,"задумаетесь",W),(32.32,"о",W),
(32.48,"данной",W),(32.88,"страховке,",W),(33.52,"тем",W),(33.84,"быстрее",K),(34.24,"начнёт",W),
(34.72,"действовать",W),(35.28,"ваше",W),(35.68,"полное",K),(36.16,"покрытие",K),(36.80,"данной",W),(37.20,"страховки.",W),
(37.84,"Очень",W),(38.08,"важно",W),(38.52,"не",W),(38.68,"ждать,",K),(39.08,"когда",W),(39.32,"уже",W),
(39.52,"начнут",W),(40.00,"болеть",W),(40.36,"зубы",W),(40.80,"и",W),(40.96,"наступают",W),(41.72,"серьёзные",W),
(42.32,"проблемы,",W),
(42.92,"а",W),(43.12,"стоит",W),(43.48,"задуматься",W),(44.08,"уже",W),(44.40,"сейчас,",K),(44.88,"когда",W),
(45.20,"у",W),(45.32,"вас",W),(45.60,"всё",W),(45.84,"в",W),(46.00,"порядке",W),(46.56,"с зубами.",W),
]
END=47.02
ws=[]
for i,(s,w,k) in enumerate(WORDS):
    e = WORDS[i+1][0] if i+1<len(WORDS) else END
    ws.append(dict(s=s,e=e,w=w,k=k))

# group into chunks
chunks=[]; cur=[]
def flush():
    global cur
    if cur: chunks.append(cur); cur=[]
for x in ws:
    prospective = cur+[x]
    txt=" ".join(y['w'] for y in prospective)
    if cur and (len(txt)>19 or len(prospective)>3):
        flush(); cur=[x]
    else:
        cur=prospective
    if x['w'].endswith(('.','?','!')): flush()
flush()

COL={"w":r"\c&H00FFFFFF&","key":r"\c&H00FFFFFF&","de":r"\c&H00FFB66F&","num":r"\c&H005CC6FF&"}
ACT=r"\c&H00C0E03F&"
def ts(t):
    cs=int(round(t*100)); h=cs//360000; cs%=360000; mm=cs//6000; cs%=6000; s=cs//100; c=cs%100
    return f"{h}:{mm:02d}:{s:02d}.{c:02d}"
ev=[]
for ci,ch in enumerate(chunks):
    for j,wd in enumerate(ch):
        parts=[]
        for i2,w2 in enumerate(ch):
            col = ACT if i2==j else COL[w2['k']]
            parts.append("{"+col+"}"+w2['w'])
        text="{\\blur1.4}"+" ".join(parts)
        st=m(wd['s']); en=m(wd['e'])
        tags=""
        if j==0: tags=r"{\fad(80,0)\t(0,110,\fscx106\fscy106)\t(110,220,\fscx100\fscy100)}"
        if j==len(ch)-1: tags+=r"{\fad(0,70)}" if j==0 else r"{\fad(0,70)}"
        if en-st<0.05: en=st+0.05
        if en<=2.36: continue
        if st<2.36: st=2.36
        ev.append((st,en,tags+text))
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,MontserratX800,78,&H00FFFFFF,&H00FFFFFF,&H00060A12,&H96000000,0,0,0,0,100,100,0,0,1,7,5,2,64,64,400,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
lines=[head]
for st,en,tx in ev:
    lines.append(f"Dialogue: 0,{ts(st)},{ts(en)},Sub,,0,0,0,,{tx}")
open(SP+"/work/subs.ass","w").write("\n".join(lines)+"\n")
print("chunks",len(chunks),"events",len(ev))
for c in chunks[:14]: print(" ".join(x['w'] for x in c))
