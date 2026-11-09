// Sharing is always an explicit visitor action. Never share editor data or URL parameters.
export const SITE_URL = 'https://cyberserch.com/';
export const CREATORS_URL = 'https://cyberserch.com/portafolio.html#creadoras';

export async function shareSite({navigator:nav, title, text, destination} = {}) {
  const url = destination === 'creadoras' ? CREATORS_URL : SITE_URL;
  const data = {title, text, url};
  if (typeof nav?.share === 'function') {
    try {
      if (typeof nav.canShare !== 'function' || nav.canShare(data)) {
        await nav.share(data);
        return 'shared';
      }
    } catch (error) {
      // Cancelling the phone's share sheet must not trigger a second action.
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  if (typeof nav?.clipboard?.writeText === 'function') {
    try { await nav.clipboard.writeText(url); return 'copied'; }
    catch { /* Keep a selectable URL available when clipboard permission is denied. */ }
  }
  return 'manual';
}

function shareIcon(doc) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(ns,'svg');
  for (const [key,value] of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'})) svg.setAttribute(key,value);
  const path = doc.createElementNS(ns,'path'); path.setAttribute('d','M12 15V3m-4 4 4-4 4 4M7 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2');
  svg.append(path); return svg;
}

const mounted = new WeakMap();
export function mountSiteShare(doc = globalThis.document) {
  if (!doc || mounted.has(doc)) return mounted.get(doc) || null;
  const footer = doc.querySelector('footer');
  const win = doc.defaultView;
  if (!win?.TRANSLATIONS?.es?.shareSiteAction) return null;
  const contextual = doc.querySelectorAll('[data-share-creadoras]');
  const placements = contextual.length ? [...contextual] : [footer, ...doc.querySelectorAll('.cs-menu nav')].filter(Boolean);
  if (!placements.length) return null;
  const controls = [];
  let busy = false;
  const dictionary = () => win.TRANSLATIONS[String(doc.documentElement.lang).startsWith('en')?'en':'es'];
  const copy = key => dictionary()[key] || '';

  for (const parent of placements) {
    const creators = parent.hasAttribute('data-share-creadoras');
    const destination = creators ? 'creadoras' : 'site';
    const keyPrefix = creators ? 'shareCreator' : 'shareSite';
    const region = doc.createElement('div'); region.className = 'cs-site-share';
    const button = doc.createElement('button'); button.type = 'button'; button.className = 'cs-share-trigger';
    const label = doc.createElement('span'); button.append(shareIcon(doc),label);
    const status = doc.createElement('span'); status.className = 'cs-share-status';
    status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    const manual = doc.createElement('input'); manual.type = 'text'; manual.readOnly = true;
    manual.value = creators ? CREATORS_URL : SITE_URL; manual.className = 'cs-share-manual'; manual.hidden = true;
    const control = {region,button,label,status,manual,keyPrefix,statusKey:''};
    button.addEventListener('click', async () => {
      if (busy) return;
      busy = true; manual.hidden = true; control.statusKey = '';
      controls.forEach(item => { item.button.disabled = true; item.button.setAttribute('aria-busy','true'); });
      render();
      const result = await shareSite({
        navigator: win.navigator, destination,
        title: copy(keyPrefix + 'Title'), text: copy(keyPrefix + 'Text')
      });
      control.statusKey = ({shared:'shareSiteShared',copied:'shareSiteCopied',manual:'shareSiteManual'})[result] || '';
      busy = false;
      controls.forEach(item => { item.button.disabled = false; item.button.removeAttribute('aria-busy'); });
      render();
      if (result === 'manual') { manual.hidden = false; manual.focus(); manual.select(); }
    });
    manual.addEventListener('click', () => manual.select());
    region.append(button,status,manual); parent.append(region); controls.push(control);
  }
  function render() {
    for (const control of controls) {
      control.label.textContent = copy(busy ? 'shareSiteBusy' : control.keyPrefix + 'Action');
      control.status.textContent = control.statusKey ? copy(control.statusKey) : '';
      control.manual.setAttribute('aria-label',copy(control.keyPrefix + 'LinkLabel'));
    }
  }
  const observer = win.MutationObserver ? new win.MutationObserver(render) : null;
  observer?.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']});
  doc.addEventListener('portfolio:language',render); render();
  const api = {controls,destroy(){observer?.disconnect();doc.removeEventListener('portfolio:language',render);controls.forEach(item=>item.region.remove());mounted.delete(doc);}};
  mounted.set(doc,api); return api;
}

if (typeof document !== 'undefined') {
  if (document.defaultView?.TRANSLATIONS?.es?.shareSiteAction) mountSiteShare();
  else document.addEventListener('DOMContentLoaded',()=>mountSiteShare(),{once:true});
}
