import json, wave, sys, numpy as np
TITLE=sys.argv[1] if len(sys.argv)>1 else "Сценарий"
TL=json.load(open("build/timeline.json"))
def ts(x):
    h=int(x//3600); m=int(x%3600//60); s=int(x%60); ms=int(round((x-int(x))*1000))
    if ms==1000: s+=1; ms=0
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
open("out/subtitles_ru.srt","w").write("\n".join(
    f"{i}\n{ts(l['start'])} --> {ts(l['end'])}\n{l['sub']}\n" for i,l in enumerate(TL["lines"],1)))
v=np.load("build/voice.npy"); SR=44100
v=np.interp(np.arange(0,len(v),22050/SR), np.arange(len(v)), v)
with wave.open("out/voiceover_ru.wav","wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((v/np.max(np.abs(v))*0.95*32767).astype(np.int16).tobytes())
d=json.load(open("script.json")); tm={l["id"]:l for l in TL["lines"]}
rows=["# "+TITLE, "", f"Хронометраж {TL['total']:.1f} с · 1080×1920", "",
      "Знаки ударения (◌́) в колонке «озвучка» — управляющие символы для синтезатора,",
      "они задают правильное ударение в немецких терминах и не произносятся отдельно.", ""]
for l in d["lines"]:
    t=tm[l["id"]]
    rows.append(f"`{t['start']:05.2f}–{t['end']:05.2f}` **{l['tts']}**  \n<sub>титр: {l['sub'].replace(chr(10),' / ')} · сцена: {l['scene']}</sub>\n")
open("SCRIPT.md","w").write("\n".join(rows))
print("artifacts ok", TL["total"])
