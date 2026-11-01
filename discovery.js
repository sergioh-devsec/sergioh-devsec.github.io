/* Local recommendations and user-initiated sharing. Optional site analytics lives in analytics.js. */
(() => {
  'use strict';
  const routes = ['business', 'creator', 'lab'];
  const sources = ['instagram', 'youtube', 'tiktok', 'x', 'whatsapp', 'telegram', 'linkedin', 'compartir'];
  const resources = [
    {id:'estimate', icon:'chart', href:'cotizador.html', weights:[6,2,1], kind:'plan',
      es:['Ponle números a tu idea','Calcula una referencia para tu web o automatización, sin dejar datos personales.','Armar mi estimación →'],
      en:['Put numbers to your idea','Estimate a website or automation project without providing personal details.','Build my estimate →']},
    {id:'organizer', icon:'automation', href:'herramientas.html#csv', weights:[5,4,5], kind:'tool',
      es:['Del archivo al orden','Ordena tareas desde un CSV en tu navegador. Prueba una muestra o usa tu archivo, sin subirlo.','Probar la herramienta'],
      en:['From files to order','Organize CSV tasks in your browser. Try the sample or use your file without uploading it.','Try the tool']},
    {id:'analyzer', icon:'shield', href:'herramientas.html#logs', weights:[3,1,6], kind:'tool',
      es:['Entiende las señales de acceso','Pega eventos SSH, ajusta el umbral y revisa los resultados. Procesamiento local, sin instalar nada.','Probar el analizador'],
      en:['Understand sign-in signals','Paste SSH events, adjust the threshold and review the results. Local processing, no installation.','Try the analyzer']},
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
  let route=new URLSearchParams(location.search).has('ruta')?routeFromSearch(location.search):'business',current=[],shareUrl='',shareText='',busy=false;
  const copy={
    es:{labels:['Impulsa tu negocio','Crear contenido','Explorar tecnología'],
      descriptions:['Web, procesos y nuevas posibilidades.','Imagen, video y voz para tus ideas.','Herramientas y proyectos para probar.'],
      note:'Dos ideas para empezar. Elige otra ruta o descubre más cuando quieras.',
      quick:'Ir directo',quickLabel:'Accesos directos',
      shortcuts:[[['Ver servicios','#services'],['Explorar muestras','#web-samples'],['Estimar mi proyecto','cotizador.html']],[['Estudio creativo','#content'],['Creadoras (+18)','#creadoras'],['Ver canales','#social']],[['Probar herramientas','herramientas.html#csv'],['Ver proyectos','#technical'],['Ver casos','#cases']]],
      kinds:{plan:'Planea tu proyecto',tool:'Pruébalo en tu navegador',explore:'Explora una idea',follow:'Sigue el proyecto',evidence:'Conoce un caso'},
      share:['Encontré un cotizador para aterrizar una idea web y un laboratorio de automatización.','Un laboratorio creativo con Axiom, ideas de producción y canales para seguir el proyecto.','Código abierto, herramientas de Python y un ciberasistente: date una vuelta por CyberSerchMX.'],
      copied:'Enlace copiado. Tú eliges a quién enviárselo.',manual:'Selecciona y copia el enlace de abajo.',ready:'Se abrió el menú para compartir.',cancel:'No se compartió nada.',
      hint:'Sin registros ni cuentas. Estas sugerencias se ajustan a tus clics durante esta visita y se reinician al recargar.'},
    en:{labels:['Boost your business','Create content','Explore technology'],
      descriptions:['Websites, processes and new possibilities.','Image, video and voice for your ideas.','Tools and projects to try.'],
      note:'Two ideas to get started. Choose another route or discover more whenever you like.',
      quick:'Jump to',quickLabel:'Quick links',
      shortcuts:[[['View services','#services'],['Explore examples','#web-samples'],['Estimate my project','cotizador.html']],[['Creative studio','#content'],['Creators (18+)','#creadoras'],['View channels','#social']],[['Try the tools','herramientas.html#csv'],['View projects','#technical'],['View cases','#cases']]],
      kinds:{plan:'Plan your project',tool:'Try it in your browser',explore:'Explore an idea',follow:'Follow the project',evidence:'See a project'},
      share:['I found an estimator to plan a website idea and an automation lab.','A creative lab with Axiom, production ideas and channels to follow the project.','Open-source code, Python tools and a cyber assistant: explore CyberSerchMX.'],
      copied:'Link copied. You choose who to send it to.',manual:'Select and copy the link below.',ready:'The sharing menu opened.',cancel:'Nothing was shared.',
      hint:'No sign-up or account. Suggestions adapt to your clicks during this visit and reset when you reload.'}
  };
  const words=()=>copy[I.language==='en'?'en':'es'];
  const status=document.getElementById('share-status'),field=document.getElementById('share-url');
  const shortcuts=S.el('nav','discovery-shortcuts');
  root.querySelector('.discovery-routes').after(shortcuts);
  function record(id,fieldName) { const item=history[id]||(history[id]={shown:0,opened:0});item[fieldName]=Math.min(12,item[fieldName]+1); }
  function render() {
    const text=words(),routeIndex=routes.indexOf(route);
    current=rankResources(route,history);
    const fragment=document.createDocumentFragment();
    current.forEach(item=>{
      const [title,description,action]=item[I.language==='en'?'en':'es'];
      const card=S.el('article','discovery-card');
      if(item.id==='estimate')card.classList.add('discovery-card-estimate');
      card.append(S.icon(item.icon),S.el('span','discovery-kind',text.kinds[item.kind]),S.el('h3','',title),S.el('p','',description));
      const link=S.link(action,item.href,'discovery-action');link.dataset.discoveryResource=item.id;card.append(link);fragment.append(card);
    });
    document.getElementById('discovery-results').replaceChildren(fragment);
    root.querySelectorAll('[data-discovery-route]').forEach(b=>{
      const index=routes.indexOf(b.dataset.discoveryRoute);
      b.setAttribute('aria-pressed',String(b.dataset.discoveryRoute===route));
      b.replaceChildren(S.el('span','discovery-route-label',text.labels[index]),S.el('span','discovery-route-description',text.descriptions[index]));
    });
    shortcuts.setAttribute('aria-label',text.quickLabel+': '+text.labels[routeIndex]);
    shortcuts.replaceChildren(S.el('span','discovery-shortcuts-label',text.quick));
    text.shortcuts[routeIndex].forEach(([label,href])=>shortcuts.append(S.link(label,href,'discovery-shortcut')));
    document.getElementById('discovery-note').textContent=text.note;
    document.getElementById('discovery-privacy').textContent=text.hint;
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
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{root.dataset.visible=String(e.isIntersecting);}),{threshold:.2});observer.observe(root);}
})();
