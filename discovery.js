/* Local recommendations and user-initiated sharing. No analytics, identifiers or requests. */
(() => {
  'use strict';
  const routes = ['business', 'creator', 'lab'];
  const sources = ['instagram', 'youtube', 'tiktok', 'x', 'whatsapp', 'telegram', 'linkedin', 'compartir'];
  const resources = [
    {id:'estimate', icon:'code', href:'cotizador.html', weights:[6,2,1], kind:'plan',
      es:['Ponle números a tu idea','Calcula una referencia para tu web o automatización, sin dejar datos personales.','Armar mi estimación →'],
      en:['Put numbers to your idea','Estimate a website or automation project without providing personal details.','Build my estimate →']},
    {id:'organizer', icon:'automation', href:'https://github.com/sergioh-devsec/csv-task-organizer', weights:[5,4,5], kind:'tool',
      es:['Del archivo al orden','Un programa de Python que organiza tareas desde una hoja CSV. Código y ejemplo en GitHub.','Ver la herramienta ↗'],
      en:['From files to order','A Python program that organizes tasks from a CSV sheet. Code and example on GitHub.','View the tool ↗']},
    {id:'analyzer', icon:'shield', href:'https://github.com/sergioh-devsec/auth-log-analyzer', weights:[3,1,6], kind:'tool',
      es:['Entiende las señales de acceso','Un analizador de registros de autenticación, con ejemplos para explorar cómo funciona.','Explorar el analizador ↗'],
      en:['Understand sign-in signals','An authentication log analyzer with examples to explore how it works.','Explore the analyzer ↗']},
    {id:'studio', icon:'core', href:'#content', weights:[2,6,4], kind:'explore',
      es:['Una idea, varios formatos','Explora el proceso creativo de imagen, video y voz que está en desarrollo.','Explorar el estudio →'],
      en:['One idea, several formats','Explore the image, video and voice creative process currently in development.','Explore the studio →']},
    {id:'channels', icon:'youtube', href:'#social', weights:[1,5,2], kind:'follow',
      es:['Quédate cerca de las próximas ideas','Encuentra los canales oficiales de CyberSerchMX y elige dónde seguir el laboratorio.','Elegir mi canal →'],
      en:['Stay close to the next ideas','Find the official CyberSerchMX channels and choose where to follow the lab.','Choose my channel →']},
    {id:'cases', icon:'code', href:'#cases', weights:[4,3,5], kind:'evidence',
      es:['Mira lo que ya funciona','Conoce dos casos propios: el analizador de eventos y esta web interactiva.','Ver los casos →'],
      en:['See what already works','Explore two independent projects: the event analyzer and this interactive website.','View the projects →']}
  ];
  function validRoute(value) { return routes.includes(value) ? value : 'lab'; }
  function routeFromSearch(search) { return validRoute(new URLSearchParams(String(search).slice(0,2048)).get('ruta')); }
  function bounded(value, max) { return Number.isFinite(value) ? Math.max(0,Math.min(max,value)) : 0; }
  function rankResources(route, history={}) {
    const column=routes.indexOf(validRoute(route));
    const ranked=resources.map((item,index)=>({item,index,score:item.weights[column]*10
      - bounded(history[item.id]?.opened,3)*24 - bounded(history[item.id]?.shown,12)*18}));
    ranked.sort((a,b)=>b.score-a.score||a.index-b.index);
    const first=ranked[0], second=ranked.find(r=>r.item.kind!==first.item.kind&&r!==first)||ranked[1];
    return [first.item,second.item];
  }
  function buildCampaignLink(base, route, source='compartir') {
    const url=new URL(base);
    if(url.protocol!=='https:'||url.username||url.password) throw new Error('A public HTTPS canonical URL is required.');
    url.search='';url.hash='descubrir';
    url.searchParams.set('ruta',validRoute(route));
    url.searchParams.set('utm_source',sources.includes(source)?source:'compartir');
    url.searchParams.set('utm_medium',sources.includes(source)&&source!=='compartir'?'organic_social':'referral');
    url.searchParams.set('utm_campaign','explora-laboratorio');
    return url.href;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={resources,routes,sources,validRoute,routeFromSearch,rankResources,buildCampaignLink};
  if(typeof document==='undefined')return;
  const root=document.getElementById('descubrir');if(!root)return;
  const S=window.Site,I=window.I18N,history=Object.create(null);
  let route=routeFromSearch(location.search),current=[],shareUrl='',shareText='',busy=false;
  const copy={
    es:{labels:['Hacer crecer mi negocio','Crear contenido','Explorar tecnología'], note:'Dos ideas elegidas para tu recorrido. Puedes cambiarlo cuando quieras.',
      share:['Encontré un cotizador para aterrizar una idea web y un laboratorio de automatización.','Un laboratorio creativo con Axiom, ideas de producción y canales para seguir el proyecto.','Código abierto, herramientas de Python y un ciberasistente: date una vuelta por CyberSerchMX.'],
      copied:'Enlace copiado. Tú eliges a quién enviárselo.',manual:'Selecciona y copia el enlace de abajo.',ready:'Se abrió el menú para compartir.',cancel:'No se compartió nada.',
      hint:'Sin registros ni cuentas. Estas sugerencias se ajustan a tus clics durante esta visita y se reinician al recargar.'},
    en:{labels:['Grow my business','Create content','Explore technology'],note:'Two ideas selected for your route. You can change it anytime.',
      share:['I found an estimator to plan a website idea and an automation lab.','A creative lab with Axiom, production ideas and channels to follow the project.','Open-source code, Python tools and a cyber assistant: explore CyberSerchMX.'],
      copied:'Link copied. You choose who to send it to.',manual:'Select and copy the link below.',ready:'The sharing menu opened.',cancel:'Nothing was shared.',
      hint:'No sign-up or account. Suggestions adapt to your clicks during this visit and reset when you reload.'}
  };
  const words=()=>copy[I.language==='en'?'en':'es'];
  const status=document.getElementById('share-status'),field=document.getElementById('share-url');
  function record(id,fieldName) { const item=history[id]||(history[id]={shown:0,opened:0});item[fieldName]=Math.min(12,item[fieldName]+1); }
  function render() {
    current=rankResources(route,history);
    const fragment=document.createDocumentFragment();
    current.forEach((item,index)=>{
      const [title,description,action]=item[I.language==='en'?'en':'es'];
      const card=S.el('article','discovery-card');card.append(S.icon(item.icon));
      card.append(S.el('span','discovery-step',String(index+1).padStart(2,'0')),S.el('h3','',title),S.el('p','',description));
      const link=S.link(action,item.href,'text-link');link.dataset.discoveryResource=item.id;card.append(link);fragment.append(card);
    });
    document.getElementById('discovery-results').replaceChildren(fragment);
    root.querySelectorAll('[data-discovery-route]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.discoveryRoute===route));b.textContent=words().labels[routes.indexOf(b.dataset.discoveryRoute)];});
    document.getElementById('discovery-note').textContent=words().note;
    document.getElementById('discovery-privacy').textContent=words().hint;
  }
  function setRoute(next) { route=validRoute(next);render(); }
  root.addEventListener('click',event=>{
    const intent=event.target.closest('[data-discovery-route]');if(intent)setRoute(intent.dataset.discoveryRoute);
    const link=event.target.closest('[data-discovery-resource]');if(link)record(link.dataset.discoveryResource,'opened');
  });
  document.getElementById('discovery-more').addEventListener('click',()=>{current.forEach(item=>record(item.id,'shown'));render();});
  document.addEventListener('portfolio:intent',event=>{if(routes.includes(event.detail?.route))setRoute(event.detail.route);});
  function prepareShare() {
    const canonical=document.querySelector('link[rel="canonical"]')?.href;
    // The release builder sets the canonical origin; URL queries never become share content.
    shareUrl=buildCampaignLink(canonical||'https://sergioh-devsec.github.io/',route);
    shareText=words().share[routes.indexOf(route)];field.value=shareUrl;
    document.getElementById('share-preview').textContent=shareText;
    status.textContent='';document.getElementById('share-native').hidden=typeof navigator.share!=='function';
  }
  document.querySelectorAll('[data-open-dialog="share-dialog"]').forEach(button=>button.addEventListener('click',prepareShare));
  document.getElementById('share-copy').addEventListener('click',async()=>{
    try { if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(shareUrl);status.textContent=words().copied; }
    catch { status.textContent=words().manual;field.focus();field.select(); }
  });
  document.getElementById('share-native').addEventListener('click',async()=>{
    if(busy)return;busy=true;
    try { await navigator.share({title:'CyberSerchMX · Laboratorio',text:shareText,url:shareUrl});status.textContent=words().ready; }
    catch(error) { status.textContent=error.name==='AbortError'?words().cancel:words().manual; }
    finally {busy=false;}
  });
  document.addEventListener('portfolio:language',()=>{render();if(document.getElementById('share-dialog').open)prepareShare();});
  root.hidden=false;render();
})();
