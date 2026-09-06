import json, wave, os, numpy as np
from piper import PiperVoice, SynthesisConfig

SP = "/tmp/claude-0/-home-user-Claude-workspace/8065efcb-d7fd-56c0-a510-b91d31e909f0/scratchpad"
voice = PiperVoice.load(f"{SP}/voices/ru-irinia-medium.onnx")
d = json.load(open("script.json"))
os.makedirs("build/seg", exist_ok=True)

segs, sr = [], None
for l in d["lines"]:
    p = f"build/seg/{l['id']}.wav"
    with wave.open(p, "wb") as w:
        voice.synthesize_wav(l["tts"], w, syn_config=SynthesisConfig(length_scale=0.85))
    with wave.open(p, "rb") as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768.0
    # trim leading/trailing silence
    thr = 0.006
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx): a = a[max(0, idx[0]-int(0.03*sr)): min(len(a), idx[-1]+int(0.05*sr))]
    segs.append(a)
    print(l["id"], round(len(a)/sr, 2), "s")

GAP = 0.14
timeline, out, t = [], [], 0.0
for l, a in zip(d["lines"], segs):
    dur = len(a)/sr
    timeline.append({"id": l["id"], "scene": l["scene"], "sub": l["sub"], "hl": l["hl"],
                     "start": round(t, 3), "end": round(t+dur, 3)})
    out.append(a); out.append(np.zeros(int(GAP*sr), np.float32))
    t += dur + GAP

voice_a = np.concatenate(out)
total = len(voice_a)/sr
print("TOTAL", round(total, 2), "s @", sr)

# normalize voice to -1.5 dBFS peak
voice_a = voice_a / (np.max(np.abs(voice_a)) + 1e-9) * 0.84
np.save("build/voice.npy", voice_a)
json.dump({"sr": sr, "total": round(total,3), "lines": timeline}, open("build/timeline.json","w"), ensure_ascii=False, indent=1)
