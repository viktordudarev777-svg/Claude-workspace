import numpy as np, wave
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
SR=48000; BPM=84.0; BEAT=60/BPM; BAR=4*BEAT; DUR=46.5
n=int(SR*DUR); t=np.arange(n)/SR
rng=np.random.default_rng(7)
def midi(m): return 440.0*2**((m-69)/12)
# Am7 Fmaj7 Cmaj7 G6  (roots A2 F2 C3 G2)
prog=[ (45,[57,60,64,67]), (41,[57,60,65,69]), (48,[55,59,64,67]), (43,[curr:=59,62,curr+curr*0][0] if False else 59,62,67,71) ]
prog=[ (45,[57,60,64,67]), (41,[53,57,60,64]), (48,[52,55,59,64]), (43,[50,55,59,62]) ]
def adsr(L,a,d,s,r):
    e=np.zeros(L); A=int(a*SR); D=int(d*SR); R=int(r*SR)
    tot=A+D+R
    if tot>L and tot>0:
        k=L/tot; A=int(A*k); D=int(D*k); R=L-A-D
    S=max(L-A-D-R,0)
    if A: e[:A]=np.linspace(0,1,A)
    if D: e[A:A+D]=np.linspace(1,s,D)
    e[A+D:A+D+S]=s
    if R: e[A+D+S:A+D+S+R]=np.linspace(s,0,R)
    return e[:L]
def lp(x,fc):
    # simple one-pole lowpass, applied twice
    a=np.exp(-2*np.pi*fc/SR)
    y=np.zeros_like(x); acc=0.0
    for _ in range(2):
        acc=0.0
        for i in range(0,len(x),1):
            pass
    return x
def lowpass(x,fc,order=2):
    a=np.exp(-2*np.pi*fc/SR); b=1-a
    y=x.copy()
    for _ in range(order):
        out=np.empty_like(y); acc=0.0
        # vectorised IIR via lfilter
        from scipy.signal import lfilter
        out=lfilter([b],[1,-a],y)
        y=out
    return y
try:
    from scipy.signal import lfilter, butter, sosfilt
    HAVE=True
except Exception:
    HAVE=False
def flt(x,fc,btype='low',order=2):
    if not HAVE: return x
    sos=butter(order,fc/(SR/2),btype=btype,output='sos'); return sosfilt(sos,x)

pad=np.zeros(n); bass=np.zeros(n); pluck=np.zeros(n)
bars=int(np.ceil(DUR/BAR))
for b in range(bars):
    t0=b*BAR; i0=int(t0*SR)
    root,notes=prog[b%4]
    L=int(BAR*SR)+int(0.6*SR)
    if i0>=n: break
    L=min(L,n-i0)
    env=adsr(L,0.55,0.5,0.72,1.0)
    seg=np.zeros(L); tt=np.arange(L)/SR
    for nn in notes:
        f=midi(nn)
        for det,amp in ((0,1.0),(1.004,.55),(0.996,.55),(2.0,.16)):
            seg+=amp*np.sin(2*np.pi*f*det*tt+rng.uniform(0,6.28))
    seg/=len(notes)*2.3
    pad[i0:i0+L]+=seg*env
    # bass
    Lb=int(BAR*SR*0.92); Lb=min(Lb,n-i0)
    tb=np.arange(Lb)/SR; fb=midi(root-12)
    bass[i0:i0+Lb]+= (np.sin(2*np.pi*fb*tb)*0.9+0.12*np.sin(4*np.pi*fb*tb))*adsr(Lb,0.06,0.4,0.55,0.5)
    # plucks: arpeggio on offbeats
    for k,step in enumerate([0.0,1.5,2.5,3.5]):
        ip=i0+int(step*BEAT*SR); Lp=int(0.55*SR)
        if ip+Lp>=n: break
        f=midi(notes[k%len(notes)]+12); tp=np.arange(Lp)/SR
        pluck[ip:ip+Lp]+= (np.sin(2*np.pi*f*tp)+0.3*np.sin(4*np.pi*f*tp))*np.exp(-tp*7)*0.5
# shaker
shk=np.zeros(n)
for i in range(int(DUR/(BEAT/2))):
    ip=int(i*(BEAT/2)*SR); L=int(0.06*SR)
    if ip+L>=n: break
    amp=0.5 if i%2 else 0.85
    shk[ip:ip+L]+=rng.normal(0,1,L)*np.exp(-np.arange(L)/SR*90)*amp
shk=flt(shk,6500,'high')
# soft kick
kck=np.zeros(n)
for i in range(int(DUR/BEAT)):
    if i%4 not in (0,2): continue
    ip=int(i*BEAT*SR); L=int(0.32*SR)
    if ip+L>=n: break
    tk=np.arange(L)/SR
    kck[ip:ip+L]+=np.sin(2*np.pi*(52+70*np.exp(-tk*28))*tk)*np.exp(-tk*9)*0.9
pad=flt(pad,2200,'low'); pluck=flt(pluck,4200,'low'); bass=flt(bass,180,'low')
mix = 0.42*pad + 0.20*bass + 0.14*pluck + 0.045*shk + 0.16*kck
# simple reverb
ir_len=int(1.1*SR); ir=rng.normal(0,1,ir_len)*np.exp(-np.arange(ir_len)/SR*4.2); ir[0]=1.0
if HAVE:
    from scipy.signal import fftconvolve
    wet=fftconvolve(mix,ir)[:n]; wet/=np.abs(wet).max()+1e-9
    mix=0.80*mix+0.30*wet
# fades
fi=int(1.6*SR); fo=int(2.2*SR)
mix[:fi]*=np.linspace(0,1,fi); mix[-fo:]*=np.linspace(1,0,fo)
mix/= (np.abs(mix).max()+1e-9); mix*=0.85
st=np.stack([mix*0.98, np.roll(mix,int(0.008*SR))*0.98],axis=1)
w=wave.open(SP+"/work/music.wav","w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.clip(st,-1,1)*32767).astype(np.int16).tobytes()); w.close()
print("music ok", DUR)
