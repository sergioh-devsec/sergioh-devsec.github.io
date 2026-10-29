/* Local explanations and visit memory. No query leaves the browser. */
(() => {
  'use strict';
  const normalize=value=>String(value).slice(0,240).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  function distance(a,b){
    const rows=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=0;j<=b.length;j++)rows[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
      rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
    }return rows[a.length][b.length];
  }
  const stop=new Set('que es son como un una el la los las de del para por me mi quiero necesito tengo puedes explicar explicame significa diferencia entre what is are how the a an of to and my explain between'.split(' '));
  function search(query,entries){
    const text=normalize(query);if(!text)return[];
    const words=text.split(' ').filter(w=>!stop.has(w));if(!words.length)return[];
    return entries.map(entry=>{
      let score=0,exact=false;
      for(const raw of entry.aliases){const alias=normalize(raw),parts=alias.split(' ');
        if((' '+text+' ').includes(' '+alias+' ')){score=Math.max(score,100+parts.length*5);exact=true;continue;}
        if(parts.length!==1||alias.length<4)continue;
        for(const word of words){if(word.length<4||Math.abs(word.length-alias.length)>1)continue;const d=distance(word,alias);if(d===1)score=Math.max(score,65);}
      }
      return {entry,score,exact};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.entry.id.localeCompare(b.entry.id)).slice(0,6);
  }
  function createVisit({now=()=>performance.now(),duration=600000,random=Math.random,onReset=()=>{}}={}){
    let elapsed=0,last=now(),started=false,visible=true,round=1;const seen=new Set();
    function tick(){const at=now();if(started&&visible)elapsed+=Math.max(0,at-last);last=at;let reset=false;if(elapsed>=duration){elapsed%=duration;seen.clear();round++;reset=true;onReset();}return {elapsed,remaining:duration-elapsed,count:seen.size,round,reset};}
    function start(){tick();started=true;}
    function mark(key){start();if(seen.has(key))return false;seen.add(key);return true;}
    function pick(keys){start();const fresh=[...new Set(keys)].filter(k=>!seen.has(k));if(!fresh.length)return null;const key=fresh[Math.min(fresh.length-1,Math.max(0,Math.floor(random()*fresh.length)))];seen.add(key);return key;}
    return {tick,start,mark,pick,has(key){tick();return seen.has(key);},setVisible(value){tick();visible=Boolean(value);},get count(){return tick().count;}};
  }
  const api={normalize,distance,search,createVisit};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.AxiomKnowledge=api;
})();
