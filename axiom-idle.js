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
  if(typeof module!=='undefined'&&module.exports)module.exports={createIdle};
  if(typeof window!=='undefined')window.AxiomIdle={createIdle};
})();
