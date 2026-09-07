# -*- coding: utf-8 -*-
import json
SP="/tmp/claude-0/-home-user-Claude-workspace/c063b236-bfa3-5f1c-a7d1-6100b3fd1d3d/scratchpad"
W=json.load(open(SP+"/v2/work/zf_words.json"))
K,DE,NUM,PL="key","de","num","w"
def at(t):
    for i,x in enumerate(W):
        if abs(x['s']-t)<0.005: return i
    raise KeyError(t)
# --- merges: (start_time, count, new_text)
MERGES=[(11.76,2,"Handyversicherung"),(26.20,4,"Reiserücktrittsversicherung"),
        (54.00,4,"Haftpflichtversicherung"),(60.28,3,"Zahnzusatzversicherung"),
        (62.04,2,"эконом-пакете"),(67.04,2,"20–30"),(115.60,1,"в шапке"),(120.32,1,"в Германии")]
for t,n,txt in sorted(MERGES,key=lambda z:-z[0]):
    i=at(t); W[i]['w']=txt; W[i]['e']=W[i+n-1]['e']
    del W[i+1:i+n]
# --- single-word replacements
REPL={9.44:"Страховка",36.28:"Gebühren",44.28:"страховка",80.04:"Angebot",
      104.16:"комментариях",110.68:"ни",112.24:"За",113.04:"консультацией",
      117.28:"Анастасия",68.52:"процентов",74.12:"бесполезны"}
for t,txt in REPL.items(): W[at(t)]['w']=txt
# --- insertions (time, text, end)
INS=[(17.00,"ограниченный",17.84),(44.75,"Insassenunfallversicherung",47.20),(77.10,"Unfallversicherung",78.76)]
for t,txt,e in INS:
    W.append(dict(w=txt,s=t,e=e))
W.sort(key=lambda z:z['s'])
# --- recompute ends = next start (cap by own e)
for i,x in enumerate(W):
    nxt = W[i+1]['s'] if i+1<len(W) else 120.90
    x['e']=round(min(max(x['e'],x['s']+0.12), nxt),3)
    if i+1<len(W): x['e']=round(nxt,3)
# --- punctuation appended to the word at the given start time
PUNCT={3.48:".",5.52:" —",8.72:".",11.00:"",13.04:".",14.36:",",15.80:",",18.48:".",23.20:".",
       25.48:"",28.08:"",29.68:".",36.28:".",39.16:"",43.32:".",44.28:" —",47.20:",",49.48:".",
       53.16:"",55.32:"",56.04:",",58.32:".",59.96:"",62.04:".",68.52:"",70.36:".",74.12:".",
       76.72:"",78.76:",",83.12:".",89.04:",",91.00:"",95.48:".",99.72:".",103.04:" —",105.20:".",
       108.60:",",110.96:".",116.16:".",120.32:"."}
for t,p in PUNCT.items():
    if p:
        i=at(t); W[i]['w']=W[i]['w'].rstrip(",.—")+p
# --- capitalisation after sentence end
for i,x in enumerate(W):
    if i==0 or W[i-1]['w'].endswith(('.','?','!')):
        w=x['w']
        if w[:1].islower(): x['w']=w[0].upper()+w[1:]
# --- style classes
DEW={"Handyversicherung","Reiserücktrittsversicherung","Insassenunfallversicherung",
     "Haftpflichtversicherung","Zahnzusatzversicherung","Unfallversicherung","Gebühren","Angebot"}
KEYW={"5","страховок","зря.","франшиза,","ограниченный","рассрочку.","отдельности.","годовую",
      "дублирует","бесполезны.","консультации.","консультацией","Анастасия","нюансы","получаете.",
      "жёсткие,","скидке"}
for x in W:
    base=x['w'].rstrip(",.—")
    if base in DEW or base.replace("Handyversicherung","")=="" : x['k']=DE
    elif base in DEW: x['k']=DE
    elif base in {"20–30","процентов","365"}: x['k']=NUM
    elif x['w'] in KEYW or base in KEYW: x['k']=K
    else: x['k']=PL
for x in W:
    if x['w'].rstrip(",.—") in DEW: x['k']=DE
json.dump(W,open(SP+"/v2/work/words_final.json","w"),ensure_ascii=False,indent=1)
print(len(W),"words")
print(" ".join(x['w'] for x in W))
