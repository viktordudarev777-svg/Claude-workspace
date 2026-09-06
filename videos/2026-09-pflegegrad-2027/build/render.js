(function(){
const TL = window.TL, LINES = TL.lines, TOTAL = TL.total;
const clamp=(x,a,b)=>x<a?a:(x>b?b:x);
const ease=t=>1-Math.pow(1-clamp(t,0,1),3);
const scenes={}; document.querySelectorAll('.scene').forEach(e=>scenes[e.dataset.s]=e);

// scene windows
const win={}; LINES.forEach(l=>{ const w=win[l.scene]=win[l.scene]||{a:l.start,b:l.end}; w.a=Math.min(w.a,l.start); w.b=Math.max(w.b,l.end); });
const at=id=>LINES.find(l=>l.id===id);

// --- subtitle tokenisation ---
const LAT=/[A-Za-zÄÖÜäöüß]/;
function build(line){
  const rows=line.sub.split('\n');
  const hlTok=new Set(); (line.hl||[]).forEach(h=>h.split(/\s+/).forEach(t=>hlTok.add(t.replace(/[.,!?»«"]+$/,''))));
  let n=0; rows.forEach(r=>n+=r.trim().split(/\s+/).length);
  let i=0; const html=rows.map(r=>{
    const L=r.trim().length; const fs = L<=24?62 : L<=32?55 : L<=42?47 : 41;
    return '<div class="subline" style="font-size:'+fs+'px">'+r.trim().split(/\s+/).map(w=>{
      const bare=w.replace(/[.,!?»«"]+$/,'');
      let cls='w'; if(hlTok.has(bare)) cls+= LAT.test(bare)?' g':' k';
      return '<span class="'+cls+'" data-i="'+(i++)+'">'+w+'</span>';
    }).join('')+'</div>';
  }).join('');
  return {html:html,n:n};
}
const cache={}; LINES.forEach(l=>cache[l.id]=build(l));
const subs=document.getElementById('subs');
let curId=null;

window.render=function(t){
  document.getElementById('pg').style.width=(100*clamp(t/TOTAL,0,1))+'%';

  // active line (hold last one during gaps)
  let cur=LINES[0];
  for(const l of LINES){ if(t>=l.start-0.10) cur=l; }

  // subtitles
  if(cur.id!==curId){ curId=cur.id; subs.innerHTML=cache[cur.id].html; }
  const d=Math.max(cur.end-cur.start,.3), n=cache[cur.id].n;
  const p=clamp((t-cur.start)/d,0,2);
  const blockIn=ease((t-cur.start+0.10)/0.28);
  subs.querySelectorAll('.w').forEach(el=>{
    const i=+el.dataset.i, tw=(i/n)*0.90;
    const k=ease((p-tw)/0.10);
    el.style.opacity=(0.16+0.84*k)*blockIn;
    el.style.transform='translateY('+(9*(1-k))+'px)';
  });

  // scenes
  for(const key in scenes){
    const w=win[key], el=scenes[key];
    const a=w.a-0.30, b=w.b+0.18;
    let o=0, sc=1, ty=0;
    if(t>a-0.35 && t<b+0.35){
      const fi=ease((t-a)/0.34), fo=1-ease((t-b)/0.30);
      o=clamp(Math.min(fi,fo),0,1);
      const lt=t-a, dur=Math.max(b-a,1);
      sc=1.055-0.055*ease(lt/0.85)+0.022*(lt/dur);
      ty=26*(1-ease(lt/0.55));
    }
    el.style.opacity=o.toFixed(3);
    el.style.transform='translateY('+ty.toFixed(2)+'px) scale('+sc.toFixed(4)+')';
    el.style.visibility=o>0.001?'visible':'hidden';
  }

  // points: reveal "по проекту" column at s05
  const s05=at('s05');
  document.querySelectorAll('#art .scene[data-s="points"] .nc').forEach((el,idx)=>{
    const k=ease((t-(s05.start-0.15)-idx*0.16)/0.42);
    el.style.opacity=k; el.style.transform='translateX('+(34*(1-k))+'px) scale('+(0.86+0.14*k)+')';
  });
  const hn=ease((t-(s05.start-0.25))/0.4);
  document.getElementById('hdnew').style.opacity=hn;

  // date scene: chain then calendar
  const s08=at('s08'), s09=at('s09');
  const ch=ease((t-s08.start)/0.5);
  document.getElementById('chain').style.opacity=ch;
  document.getElementById('chain').style.transform='translateY('+(18*(1-ch))+'px)';
  const cl=ease((t-(s09.start-0.30))/0.5);
  const calEl=document.getElementById('cal');
  calEl.style.opacity=cl;
  calEl.style.transform='scale('+(0.88+0.12*cl)+')';
  const pulse=1+0.012*Math.sin((t-s09.start)*3.4);
  if(t>s09.start) calEl.style.transform='scale('+((0.88+0.12*cl)*pulse)+')';
};
window.render(0);
})();
