# -*- coding: utf-8 -*-
import json
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
keep=json.load(open(SP+"/v2/work/cuts.json"))["keep"]
def m(t):
    acc=0.0
    for a,b in keep:
        if t<a: return acc
        if t<=b: return acc+(t-a)
        acc+=b-a
    return acc
ws=json.load(open(SP+"/v2/work/words_final.json"))
COVER_END=3.30
chunks=[];cur=[]
def flush():
    global cur
    if cur: chunks.append(cur); cur=[]
for x in ws:
    prosp=cur+[x]; txt=" ".join(y['w'] for y in prosp)
    if cur and (len(txt)>19 or len(prosp)>3):
        flush(); cur=[x]
    else: cur=prosp
    if x['w'].endswith(('.','?','!')): flush()
flush()
COL={"w":r"\c&H00FFFFFF&","key":r"\c&H00FFFFFF&","de":r"\c&H00FFB66F&","num":r"\c&H005CC6FF&"}
ACT=r"\c&H00C0E03F&"
BASE=78; AVAIL=952; RATIO=0.605
def ts(t):
    cs=int(round(t*100)); h=cs//360000; cs%=360000; mm=cs//6000; cs%=6000; s=cs//100; c=cs%100
    return f"{h}:{mm:02d}:{s:02d}.{c:02d}"
ev=[]
for ch in chunks:
    plain=" ".join(y['w'] for y in ch)
    fs=min(BASE, int(AVAIL/(RATIO*max(len(plain),1))))
    fs=max(fs,44)
    fstag = "" if fs>=BASE else "\\fs%d"%fs
    for j,wd in enumerate(ch):
        parts=[("{"+(ACT if i2==j else COL[w2['k']])+"}"+w2['w']) for i2,w2 in enumerate(ch)]
        text="{\\blur1.4"+fstag+"}"+" ".join(parts)
        st=m(wd['s']); en=m(wd['e'])
        tags=""
        if j==0: tags=r"{\fad(80,0)\t(0,110,\fscx106\fscy106)\t(110,220,\fscx100\fscy100)}"
        if j==len(ch)-1: tags+=r"{\fad(0,70)}"
        if en-st<0.05: en=st+0.05
        cov=m(COVER_END)
        if en<=cov: continue
        if st<cov: st=cov
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
Style: Sub,MontserratX800,78,&H00FFFFFF,&H00FFFFFF,&H00060A12,&H96000000,0,0,0,0,100,100,0,0,1,7,5,2,60,60,320,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
open(SP+"/v2/work/subs.ass","w").write(head+"\n".join(f"Dialogue: 0,{ts(a)},{ts(b)},Sub,,0,0,0,,{t}" for a,b,t in ev)+"\n")
print("chunks",len(chunks),"events",len(ev))
long=[(" ".join(y['w'] for y in c)) for c in chunks if len(" ".join(y['w'] for y in c))>19]
print("long chunks:",long)
