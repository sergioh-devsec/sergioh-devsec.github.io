/* No overlapping idle prompts; cancelled timers cannot revive themselves. */
(() => {
  'use strict';
  function createIdle({now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,allowed=()=>true,present,delay=10000}){
    let enabled=true,visible=true,last=now(),timer=null,busy=false,generation=0;
    function clear(){if(timer!==null)cancel(timer);timer=null;}
    function arm(){clear();if(enabled&&visible&&!busy)timer=schedule(tick,Math.max(1,delay-(now()-last)));}
    async function tick(){timer=null;if(!enabled||!visible)return;if(!allowed()){last=now();arm();return;}const token=generation;busy=true;try{await present();}finally{busy=false;if(token===generation)last=now();arm();}}
    return {activity(){last=now();arm();},setEnabled(value){enabled=Boolean(value);generation++;last=now();arm();},setVisible(value){visible=Boolean(value);generation++;last=now();arm();},start:arm,get enabled(){return enabled;},get busy(){return busy;}};
  }
  // One return per idle presentation. Cancellation invalidates every pending await.
  function createReturnSequence({allowed=()=>true,fade,show,speak,finish=()=>{}}){
    let generation=0,armed=false,busy=false;
    function cancel(){generation++;armed=false;busy=false;}
    return {
      begin(){cancel();armed=true;},cancel,
      async resume(){
        if(!armed||busy||!allowed())return false;
        armed=false;busy=true;const token=++generation;
        const current=()=>token===generation;
        try{await fade();if(!current()||!allowed())return false;show();await speak(current);return current();}
        finally{if(current()){busy=false;finish();}}
      },
      get busy(){return busy;}
    };
  }
  // Observe actual downward travel, not wheel noise, anchor jumps or slow reading.
  function createScrollRadar({now=()=>performance.now(),windowMs=850,cooldown=90000}={}){
    let previous=null,samples=[],lastShown=-Infinity;
    return {observe(y,{intent=false,allowed=true,viewport=800}={}){
      const time=now();if(!Number.isFinite(y))return false;
      if(previous===null){previous={y,time};return false;}
      const before=previous;previous={y,time};const delta=y-before.y;
      if(!intent||!allowed||delta<=0||time-lastShown<cooldown){samples=[];return false;}
      samples.push({from:before.time,to:time,delta});samples=samples.filter(s=>time-s.from<=windowMs);
      if(!samples.length)return false;
      const distance=samples.reduce((sum,s)=>sum+s.delta,0),duration=Math.max(40,time-samples[0].from);
      if(distance<Math.max(900,viewport*1.2)||distance/duration<1.6)return false;
      lastShown=time;samples=[];return true;
    },reset(){previous=null;samples=[];}};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={createIdle,createReturnSequence,createScrollRadar};
  if(typeof window!=='undefined')window.AxiomIdle={createIdle,createReturnSequence,createScrollRadar};
})();
