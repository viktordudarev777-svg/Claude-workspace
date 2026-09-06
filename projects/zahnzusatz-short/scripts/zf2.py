import sherpa_onnx, wave, numpy as np, json
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
M=SP+"/models/sherpa-onnx-zipformer-ru-2024-09-18"
r=sherpa_onnx.OfflineRecognizer.from_transducer(encoder=M+"/encoder.onnx",decoder=M+"/decoder.onnx",joiner=M+"/joiner.onnx",tokens=M+"/tokens.txt",num_threads=4)
w=wave.open(SP+"/work/audio16k.wav"); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
dur=len(a)/16000; print("dur",dur)
WIN=10.0; HOP=8.0
segs=[]
t=0.0
while t < dur:
    e=min(t+WIN,dur)
    s=r.create_stream(); s.accept_waveform(16000,a[int(t*16000):int(e*16000)]); r.decode_stream(s)
    res=s.result
    segs.append(dict(off=t, tokens=list(res.tokens), ts=[round(x+t,3) for x in res.timestamps], text=res.text))
    print(f"--- {t:.1f}-{e:.1f}: {res.text}")
    if e>=dur: break
    t+=HOP
json.dump(segs, open(SP+"/work/zf_windows.json","w"), ensure_ascii=False, indent=1)
