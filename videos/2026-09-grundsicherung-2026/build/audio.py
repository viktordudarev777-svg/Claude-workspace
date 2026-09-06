import json, numpy as np, wave
from scipy.signal import lfilter
SR=44100
TL=json.load(open("build/timeline.json")); TOTAL=TL["total"]; DUR=TOTAL+0.35
n=int(DUR*SR); t=np.arange(n)/SR

def onepole(x, cut):
    a=float(np.exp(-2*np.pi*cut/SR))
    return lfilter([1-a],[1,-a],x)

def pad(f0, start, dur, gain, detune=(0,-0.12,0.15,7.02,-11.95)):
    """soft stacked-sine pad voice with slow attack/release"""
    s=int(start*SR); L=int(dur*SR); L=min(L, n-s)
    if L<=0: return
    tt=np.arange(L)/SR
    env=np.minimum(tt/0.9,1.0)*np.minimum((dur-tt)/1.1,1.0)
    env=np.clip(env,0,1)**1.6
    w=np.zeros(L)
    for k,c in enumerate(detune):
        f=f0*(2**(c/12.0))
        w+=np.sin(2*np.pi*f*tt+k*1.7)*(0.62**k)
        w+=0.14*np.sin(2*np.pi*2*f*tt+k)*(0.5**k)
    w*= env*gain*(1+0.03*np.sin(2*np.pi*0.17*tt))
    music[s:s+L]+=w

def pluck(f0, start, gain=0.05, dec=0.55):
    s=int(start*SR); L=int(dec*2.2*SR); L=min(L,n-s)
    if L<=0: return
    tt=np.arange(L)/SR
    e=np.exp(-tt/dec)
    w=(np.sin(2*np.pi*f0*tt)+0.35*np.sin(2*np.pi*2*f0*tt)+0.12*np.sin(2*np.pi*3*f0*tt))*e
    music[s:s+L]+=w*gain

def whoosh(start, gain=0.05, dur=0.6):
    s=int((start-dur*0.55)*SR)
    if s<0: s=0
    L=min(int(dur*SR), n-s)
    if L<=0: return
    tt=np.arange(L)/SR
    nz=np.random.RandomState(int(start*1000)%9999).randn(L)
    nz=onepole(nz, 1800.0)
    e=np.sin(np.pi*np.clip(tt/dur,0,1))**2
    music[s:s+L]+=nz*e*gain*6

music=np.zeros(n)
NOTE=lambda s: 440.0*2**((s)/12.0)
# Am - F - C - G  (bar = 4 s)
prog=[(-12,-9,-5),( -16,-9,-4),(-21,-9,-5),(-14,-10,-5)]
bar=4.0
i=0; tt=0.0
while tt<DUR:
    ch=prog[i%4]
    for sdeg in ch: pad(NOTE(sdeg-12), tt, bar+1.2, 0.030)
    pad(NOTE(ch[0]-24), tt, bar+1.0, 0.035)          # sub
    for k,off in enumerate([0.0,1.0,2.0,3.0,3.5]):    # sparse arpeggio
        pluck(NOTE(ch[k%3]+12), tt+off, 0.030, 0.5)
    tt+=bar; i+=1
music=music[:n]
# transitions
scenes=[]; last=None
for l in TL["lines"]:
    if l["scene"]!=last: scenes.append(l["start"]); last=l["scene"]
for s in scenes[1:]: whoosh(s, 0.035)

music=onepole(music, 5200)                    # soften highs
music/= (np.max(np.abs(music))+1e-9); music*=0.30

# --- voice (22050 -> 44100) ---
v=np.load("build/voice.npy")
v=np.interp(np.arange(0,len(v),22050/SR), np.arange(len(v)), v)
if len(v)<n: v=np.concatenate([v,np.zeros(n-len(v))])
else: v=v[:n]
# gentle high-pass + presence lift for clarity
lo=onepole(v,110.0); v=v-lo
pres=v-onepole(v,3000.0); v=v+0.28*pres
# soft limiter
def limit(x, ceil=0.92):
    a=np.abs(x); over=a>ceil
    x=np.where(over, np.sign(x)*(ceil+(a-ceil)*0.15), x)
    return x
v=limit(v/ (np.max(np.abs(v))+1e-9) * 0.95)

# ducking: music -9 dB while voice active
duck=np.ones(n)
for l in TL["lines"]:
    a=max(0,int((l["start"]-0.25)*SR)); b=min(n,int((l["end"]+0.30)*SR))
    duck[a:b]=0.36
duck=onepole(duck, 3.0)
mix=v*0.94 + music*duck*0.85
mix=limit(mix,0.94)
mix=mix/(np.max(np.abs(mix))+1e-9)*0.93
st=np.stack([mix,mix],1)
with wave.open("build/audio.wav","wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st*32767).astype(np.int16).tobytes())
print("audio.wav", round(n/SR,2),"s")
