set -e
SP=/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad
VC="highpass=f=80,arnndn=m=$SP/models/rnnn/sh.rnnn:mix=0.82,\
equalizer=f=230:t=q:w=1.1:g=-2.2,equalizer=f=3300:t=q:w=1.3:g=2.6,equalizer=f=9000:t=h:g=1.6,\
deesser=i=0.3:m=0.5:f=0.5,\
acompressor=threshold=-21dB:ratio=3.2:attack=6:release=180:makeup=3,alimiter=limit=0.95"
# pass 1: measure
ffmpeg -hide_banner -v info -i $SP/work/base_hi.mov -af "$VC,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | tail -14 > $SP/work/ln.json
python3 - <<'PY'
import json,re
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
s=open(SP+"/work/ln.json").read()
d=json.loads(s[s.index("{"):s.rindex("}")+1])
open(SP+"/work/ln_params.txt","w").write(
 f"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}")
print(d)
PY
