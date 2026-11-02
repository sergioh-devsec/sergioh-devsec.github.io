/* No network, tracking, credentials or payment confirmation runs in this file. */
(() => {
  'use strict';
  // A damped height field: movement propagates like water rather than a cursor ring.
  function waveStep(current, previous, width, height) {
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const i=y*width+x;
      previous[i]=((current[i-1]+current[i+1]+current[i-width]+current[i+width])*.5-previous[i])*.975;
    }
  }
  function providerUrl(value, provider) {
    if(typeof value!=='string'||/[\u0000-\u0020\\]/.test(value))return null;
    const hosts={patreon:['patreon.com','www.patreon.com'],paypal:['paypal.com','www.paypal.com','paypal.me','www.paypal.me']};
    try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts[provider]?.includes(u.hostname)&&u.pathname!=='/'?u.href:null;}catch{return null;}
  }
  function waterSize(width,height) {
    const vw=Number.isFinite(width)&&width>0?width:1000,vh=Number.isFinite(height)&&height>0?height:700;
    const w=Math.min(360,Math.max(100,Math.ceil(vw/4)));
    return {width:w,height:Math.min(260,Math.max(80,Math.ceil(w*vh/vw)))};
  }
  function waterMotion({reduced=false,paused=false,hidden=false}={}) {return !reduced&&!paused&&!hidden;}
  function themeForColor(color) {
    const match=String(color).match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)/i);
    if(!match)return 'dark';
    return Number(match[1])*.2126+Number(match[2])*.7152+Number(match[3])*.0722>150?'light':'dark';
  }
  function mountWater(doc,view) {
    if(!doc?.body||!view)return null;
    let canvas=doc.getElementById('water-surface');
    if(canvas?.dataset.waterMounted==='true')return null;
    let owned=false;
    if(!canvas){canvas=doc.createElement('canvas');canvas.id='water-surface';doc.body.append(canvas);owned=true;}
    canvas.setAttribute('aria-hidden','true');canvas.setAttribute('role','presentation');canvas.tabIndex=-1;
    let ctx;try{ctx=canvas.getContext('2d',{alpha:true});}catch{/* A decorative effect never blocks the page. */}
    if(!ctx){if(owned)canvas.remove();return null;}
    canvas.dataset.waterMounted='true';canvas.dataset.waterState='idle';
    const root=doc.documentElement,reduced=view.matchMedia('(prefers-reduced-motion: reduce)');
    const motion=()=>waterMotion({reduced:reduced.matches,paused:root.classList.contains('motion-paused')||root.dataset.motion==='paused',hidden:doc.hidden});
    let w=0,h=0,current,previous,pixels,raf=0,lastFrame=0,lastInput=0,lastPoint=null,lastTouchPointer=-Infinity,destroyed=false;
    const removers=[];
    function listen(target,event,callback,options){target?.addEventListener?.(event,callback,options);removers.push(()=>target?.removeEventListener?.(event,callback,options));}
    function clearWater(){if(raf)view.cancelAnimationFrame(raf);raf=0;lastPoint=null;current?.fill(0);previous?.fill(0);ctx.clearRect(0,0,w,h);canvas.dataset.waterState='idle';}
    function theme(){
      // Mode is authoritative while its 400ms palette crossfade is in flight.
      if(root.dataset.mode==='oficina'||root.dataset.mode==='laboratorio'){
        canvas.dataset.waterTheme=root.dataset.mode==='oficina'?'light':'dark';return;
      }
      let color=view.getComputedStyle(doc.body).backgroundColor;
      if(color==='transparent'||/^rgba\([^)]*,\s*0\s*\)$/.test(color))color=view.getComputedStyle(root).backgroundColor;
      canvas.dataset.waterTheme=themeForColor(color);
    }
    function resize(){clearWater();({width:w,height:h}=waterSize(view.innerWidth,view.innerHeight));canvas.width=w;canvas.height=h;current=new Float32Array(w*h);previous=new Float32Array(w*h);pixels=ctx.createImageData(w,h);theme();}
    function impulse(x,y,strength){
      const cx=Math.round(x/view.innerWidth*w),cy=Math.round(y/view.innerHeight*h);
      for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
        const xx=cx+dx,yy=cy+dy,d=Math.hypot(dx,dy);
        if(xx>0&&xx<w-1&&yy>0&&yy<h-1&&d<3)current[yy*w+xx]=Math.min(200,current[yy*w+xx]+strength*(1-d/3));
      }
    }
    function frame(time){
      raf=0;if(destroyed||!motion()||time-lastInput>2400){clearWater();return;}
      if(time-lastFrame<30){raf=view.requestAnimationFrame(frame);return;}lastFrame=time;
      waveStep(current,previous,w,h);[current,previous]=[previous,current];
      const data=pixels.data;data.fill(0);
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const i=y*w+x,k=i*4,nx=current[i-1]-current[i+1],ny=current[i-w]-current[i+w];
        const light=Math.min(1,Math.abs(nx*.05+ny*.075));
        data[k]=40+light*110;data[k+1]=170+light*70;data[k+2]=200+light*55;
        data[k+3]=Math.min(100,(Math.abs(nx)+Math.abs(ny))*2.4)*Math.min(1,(2400-(time-lastInput))/650);
      }
      ctx.putImageData(pixels,0,0);raf=view.requestAnimationFrame(frame);
    }
    function input(x,y,pressed=false){
      if(destroyed||!motion()||!Number.isFinite(x)||!Number.isFinite(y))return;
      const time=view.performance.now();if(!pressed&&time-lastInput<24)return;
      const point={x,y},distance=lastPoint?Math.hypot(point.x-lastPoint.x,point.y-lastPoint.y):0;
      if(lastPoint&&distance<200){const n=Math.min(8,Math.ceil(distance/12));for(let i=1;i<n;i++)impulse(lastPoint.x+(point.x-lastPoint.x)*i/n,lastPoint.y+(point.y-lastPoint.y)*i/n,22);}
      impulse(x,y,pressed?90:38);lastPoint=point;lastInput=time;canvas.dataset.waterState='active';
      if(!raf)raf=view.requestAnimationFrame(frame);
    }
    function pointer(event){if(event.pointerType==='touch')lastTouchPointer=view.performance.now();input(event.clientX,event.clientY,event.type==='pointerdown');}
    // Touchmove also works after the browser takes over normal page scrolling.
    // Every listener is passive: the effect never captures or blocks a gesture.
    function touch(event){if(view.performance.now()-lastTouchPointer<20)return;const point=event.touches?.[0]||event.changedTouches?.[0];if(point)input(point.clientX,point.clientY,event.type==='touchstart');}
    function sync(){theme();if(!motion())clearWater();}
    function destroy(){if(destroyed)return;destroyed=true;clearWater();removers.forEach(remove=>remove());observer?.disconnect();if(owned)canvas.remove();else delete canvas.dataset.waterMounted;}
    resize();
    listen(view,'resize',resize,{passive:true});listen(view,'blur',clearWater);
    listen(doc,'pointermove',pointer,{passive:true});listen(doc,'pointerdown',pointer,{passive:true});
    listen(doc,'pointerleave',()=>{lastPoint=null;},{passive:true});listen(doc,'pointercancel',()=>{lastPoint=null;},{passive:true});
    listen(doc,'touchmove',touch,{passive:true});if(!('PointerEvent' in view))listen(doc,'touchstart',touch,{passive:true});
    for(const event of ['portfolio:motion','site:motion','site:mode','portfolio:language','visibilitychange'])listen(doc,event,sync);
    listen(reduced,'change',sync);listen(view,'pageshow',resize);
    listen(view,'pagehide',event=>{if(event.persisted)clearWater();else destroy();});
    const observer=view.MutationObserver?new view.MutationObserver(sync):null;
    observer?.observe(root,{attributes:true,attributeFilter:['class','data-motion','data-mode']});
    return {canvas,destroy,resize};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={waveStep,providerUrl,waterSize,waterMotion,themeForColor,mountWater};
  if(typeof document!=='undefined')mountWater(document,window);
})();
