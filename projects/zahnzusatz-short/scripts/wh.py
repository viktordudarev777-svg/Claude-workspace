import sherpa_onnx, wave, numpy as np, json, sys
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
M=SP+"/models/sherpa-onnx-whisper-medium"
r=sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M+"/medium-encoder.onnx", decoder=M+"/medium-decoder.int8.onnx",
    tokens=M+"/medium-tokens.txt", language="ru", task="transcribe", num_threads=4)
w=wave.open(SP+"/work/audio16k.wav"); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.0
chunks=[(0.0,24.5),(23.5,47.21),(0.0,10.0),(8.0,18.0),(16.0,26.0),(24.0,34.0),(32.0,42.0),(40.0,47.21)]
out=[]
for (s0,e0) in chunks:
    st=r.create_stream(); st.accept_waveform(16000,a[int(s0*16000):int(e0*16000)]); r.decode_stream(st)
    txt=st.result.text
    out.append(dict(s=s0,e=e0,text=txt)); print(f"[{s0}-{e0}] {txt}", flush=True)
json.dump(out, open(SP+"/work/whisper_chunks.json","w"), ensure_ascii=False, indent=1)
print("DONE")
