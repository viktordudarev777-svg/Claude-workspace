import json
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
DUR=47.205
CUTS=[(4.55,5.05),(11.82,12.25),(16.50,16.70),(24.70,24.92),(30.22,30.52),(42.80,43.00),(47.02,DUR)]
keep=[]; prev=0.0
for a,b in CUTS:
    if a>prev: keep.append((round(prev,3),round(a,3)))
    prev=b
if prev<DUR: keep.append((round(prev,3),round(DUR,3)))
newdur=sum(b-a for a,b in keep)
def m(t):
    acc=0.0
    for a,b in keep:
        if t< a: return round(acc,3)
        if t<=b: return round(acc+(t-a),3)
        acc+=b-a
    return round(acc,3)
if __name__=="__main__":
    print("keep",keep); print("newdur",round(newdur,3))
    json.dump(dict(keep=keep,newdur=newdur), open(SP+"/work/cuts.json","w"))
