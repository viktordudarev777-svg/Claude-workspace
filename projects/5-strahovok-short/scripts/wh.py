import sherpa_onnx, wave, numpy as np, json
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
M=SP+"/models/sherpa-onnx-whisper-medium"
r=sherpa_onnx.OfflineRecognizer.from_whisper(encoder=M+"/medium-encoder.onnx",decoder=M+"/medium-decoder.int8.onnx",
    tokens=M+"/medium-tokens.txt",language="ru",task="transcribe",num_threads=4)
w=wave.open(SP+"/v2/work/audio16k.wav"); a=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768.
chunks=[(0,9.0),(0,6.5),(13.0,23.5),(43.0,50.0),(94.5,104.0)]
out=[]
for s0,e0 in chunks:
    st=r.create_stream(); st.accept_waveform(16000,a[int(s0*16000):int(e0*16000)]); r.decode_stream(st)
    out.append(dict(s=s0,e=e0,text=st.result.text)); print(f"[{s0}-{e0}] {st.result.text}",flush=True)
json.dump(out,open(SP+"/v2/work/whisper_chunks2.json","w"),ensure_ascii=False,indent=1)
print("DONE")
