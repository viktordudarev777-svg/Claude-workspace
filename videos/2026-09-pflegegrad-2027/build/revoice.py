"""Пересобрать ролик со студийной озвучкой.
Положите в build/pro/ файлы s01.wav ... s12.wav (по строке из SCRIPT.md, любой sample rate, моно/стерео).
Запуск: python3 build/revoice.py
"""
import json, wave, os, numpy as np
SRC="build/pro"; TARGET_SR=22050; GAP=0.14
d=json.load(open("script.json"))
segs=[]
for l in d["lines"]:
    p=os.path.join(SRC, l["id"]+".wav")
    if not os.path.exists(p): raise SystemExit(f"нет файла {p}")
    with wave.open(p,"rb") as w:
        sr, ch, sw = w.getframerate(), w.getnchannels(), w.getsampwidth()
        if sw!=2: raise SystemExit(f"{p}: нужен 16-bit PCM WAV")
        a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
    if ch>1: a=a.reshape(-1,ch).mean(1)
    if sr!=TARGET_SR: a=np.interp(np.arange(0,len(a),sr/TARGET_SR), np.arange(len(a)), a)
    idx=np.where(np.abs(a)>0.006)[0]
    if len(idx): a=a[max(0,idx[0]-int(.03*TARGET_SR)):min(len(a),idx[-1]+int(.05*TARGET_SR))]
    segs.append(a); print(l["id"], round(len(a)/TARGET_SR,2),"s")
out=[]; tl=[]; t=0.0
for l,a in zip(d["lines"],segs):
    dur=len(a)/TARGET_SR
    tl.append({"id":l["id"],"scene":l["scene"],"sub":l["sub"],"hl":l["hl"],
               "start":round(t,3),"end":round(t+dur,3)})
    out.append(a); out.append(np.zeros(int(GAP*TARGET_SR),np.float32)); t+=dur+GAP
v=np.concatenate(out); v=v/(np.max(np.abs(v))+1e-9)*0.84
np.save("build/voice.npy", v)
json.dump({"sr":TARGET_SR,"total":round(len(v)/TARGET_SR,3),"lines":tl},
          open("build/timeline.json","w"), ensure_ascii=False, indent=1)
open("build/timeline.js","w").write("window.TL="+json.dumps({"sr":TARGET_SR,"total":round(len(v)/TARGET_SR,3),"lines":tl},ensure_ascii=False)+";")
print("TOTAL", round(len(v)/TARGET_SR,2),"s — дальше: python3 build/render_video.py && python3 build/audio.py && ./build/mux.sh")
