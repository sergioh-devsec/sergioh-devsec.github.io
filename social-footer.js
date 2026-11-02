// Public profiles only. This footer never loads a social SDK, image or tracker.
export const SOCIALS = Object.freeze([
  { id: 'tiktok', name: 'TikTok', href: 'https://www.tiktok.com/@cyberserch.mx' },
  { id: 'facebook', name: 'Facebook', href: null },
  { id: 'instagram', name: 'Instagram', href: 'https://www.instagram.com/cyberserch.mx/' },
  { id: 'youtube', name: 'YouTube', href: 'https://www.youtube.com/@cyberserchmx' },
  { id: 'x', name: 'X', href: 'https://x.com/CyberSerchsMX' },
  { id: 'linkedin', name: 'LinkedIn', href: 'https://www.linkedin.com/in/jose-sergio-hernandez-hernandez-a355a3227' },
  { id: 'github', name: 'GitHub', href: 'https://github.com/sergioh-devsec' },
].map(Object.freeze));
const HOSTS = Object.freeze({
  tiktok: ['tiktok.com', 'www.tiktok.com'], facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  instagram: ['instagram.com', 'www.instagram.com'], youtube: ['youtube.com', 'www.youtube.com'],
  x: ['x.com', 'www.x.com'], linkedin: ['linkedin.com', 'www.linkedin.com'], github: ['github.com', 'www.github.com'],
});
export function validateSocialUrl(provider, value) {
  if (!Object.hasOwn(HOSTS, provider) || typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && HOSTS[provider].includes(url.hostname) && !url.username && !url.password
      && !url.port && !url.hash && url.pathname !== '/' ? url.href : null;
  } catch { return null; }
}
export function socialEntries(links = globalThis.window?.PORTFOLIO?.socialLinks) {
  const configured = links && typeof links === 'object' && !Array.isArray(links) ? links : {};
  return SOCIALS.map(profile => ({ ...profile,
    href: validateSocialUrl(profile.id, Object.hasOwn(configured, profile.id) ? configured[profile.id] : profile.href),
  }));
}

// Geometry follows the site's existing icon set; only Facebook is new.
const TIKTOK = 'M13 2h3.5c.3 2.7 1.7 4.3 4.5 4.5V10a10 10 0 0 1-4.5-1.5V16a6 6 0 1 1-6.5-6v3.6a2.5 2.5 0 1 0 3 2.4Z';
function icon(doc, id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = doc.createElementNS(ns, 'svg');
  for (const [key, value] of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'})) svg.setAttribute(key, value);
  const add = (tag, attrs) => { const node = doc.createElementNS(ns, tag); for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value); svg.append(node); return node; };
  const path = (d, attrs = {}) => add('path', {d,...attrs});
  if (id === 'tiktok') {
    path(TIKTOK, {fill:'#25f4ee',stroke:'none',transform:'translate(-.8 .5)'});
    path(TIKTOK, {fill:'#fe2c55',stroke:'none',transform:'translate(.8 -.3)'});
    path(TIKTOK, {fill:'currentColor',stroke:'none'});
  } else if (id === 'facebook') {
    path('M14.2 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.8V2.4a24 24 0 0 0-2.7-.2c-2.7 0-4.6 1.6-4.6 4.7v2.6H7.4V13h3.1v9Z', {fill:'currentColor',stroke:'none'});
  } else if (id === 'instagram') {
    add('rect',{x:'3',y:'3',width:'18',height:'18',rx:'5'}); add('circle',{cx:'12',cy:'12',r:'4'});
    add('circle',{cx:'17.5',cy:'6.5',r:'.8',fill:'currentColor',stroke:'none'});
  } else if (id === 'youtube') {
    path('M5 4h14c3 0 4 2 4 8s-1 8-4 8H5c-3 0-4-2-4-8s1-8 4-8Zm5 4v8l7-4Z', {fill:'currentColor',stroke:'none','fill-rule':'evenodd'});
  } else if (id === 'x') {
    path('M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L1 2h6.5l5.8 7.7L18.9 2ZM17.8 20h1.7L6.6 3.9H4.8L17.8 20Z', {fill:'currentColor',stroke:'none'});
  } else if (id === 'linkedin') {
    add('circle',{cx:'5',cy:'5',r:'2',fill:'currentColor',stroke:'none'});
    path('M3 9h4v12H3zm7 0h4v1.6c1-1.4 2.3-2 4-2 3.2 0 4 2.2 4 5.3V21h-4v-6.4c0-1.6-.3-2.6-1.8-2.6-1.7 0-2.2 1.2-2.2 2.8V21h-4Z', {fill:'currentColor',stroke:'none'});
  } else if (id === 'github') {
    path('M12 .8a11.2 11.2 0 0 0-3.54 21.83c.56.1.77-.24.77-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.5-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.64 1.22 3.28.93.1-.72.4-1.22.71-1.5-2.49-.28-5.11-1.25-5.11-5.54 0-1.23.44-2.23 1.15-3.02-.11-.28-.5-1.43.11-2.97 0 0 .94-.3 3.08 1.15a10.74 10.74 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.69.11 2.97.72.79 1.15 1.79 1.15 3.02 0 4.3-2.62 5.25-5.12 5.53.4.35.76 1.03.76 2.08v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z', {fill:'currentColor',stroke:'none'});
  }
  return svg;
}

const mounted = new WeakMap();
export function mountSocialFooter({document:doc = globalThis.document, links} = {}) {
  const footer = doc?.querySelector?.('footer'); if (!footer || mounted.has(footer)) return mounted.get(footer) || null;
  const nav = doc.createElement('nav'); nav.className = 'cs-social-footer';
  const profiles = socialEntries(links), labels = [];
  for (const profile of profiles) {
    const node = doc.createElement(profile.href ? 'a' : 'span'); node.className = `cs-social-item cs-social-${profile.id}`;
    node.dataset.social = profile.id;
    if (profile.href) { node.href = profile.href; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    else { node.classList.add('cs-social-pending'); node.setAttribute('role','img'); node.setAttribute('aria-disabled','true'); }
    const text = doc.createElement('span'); text.className = 'cs-social-sr';
    node.append(icon(doc,profile.id),text); nav.append(node); labels.push({profile,node,text});
  }
  function render() {
    const lang = String(doc.documentElement.lang || '').startsWith('en') ? 'en' : 'es';
    const dictionary = doc.defaultView?.TRANSLATIONS?.[lang] || {};
    const pending = dictionary.socialFooterPending || 'Próximamente / Coming soon';
    nav.setAttribute('aria-label', dictionary.socialFooterLabel || 'Redes sociales / Social profiles');
    for (const {profile,node,text} of labels) {
      const label = profile.href ? profile.name : `${profile.name} · ${pending}`;
      text.textContent = label; node.title = label; node.setAttribute('aria-label',label);
    }
  }
  footer.classList.add('cs-has-social-footer'); footer.append(nav);
  doc.addEventListener('portfolio:language',render); doc.addEventListener('site:mode',render);
  const observer = doc.defaultView?.MutationObserver ? new doc.defaultView.MutationObserver(render) : null;
  observer?.observe(doc.documentElement,{attributes:true,attributeFilter:['lang']}); render();
  const api = {nav,destroy(){doc.removeEventListener('portfolio:language',render);doc.removeEventListener('site:mode',render);observer?.disconnect();nav.remove();footer.classList.remove('cs-has-social-footer');mounted.delete(footer);}};
  mounted.set(footer,api); return api;
}
if (typeof document !== 'undefined') mountSocialFooter();
