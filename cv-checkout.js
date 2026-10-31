// Public product configuration only. Gumroad license verification needs no API key.
// https://gumroad.com/help/article/76-license-keys
export const CV_CHECKOUT = Object.freeze({
  enabled: true,
  products: Object.freeze({
    pro: Object.freeze({ productId: 'CeMiQF0t7OZAGZlhlN1mFg==', url: 'https://cyberserch.gumroad.com/l/cv-profesional-axiom' }),
    plus: Object.freeze({ productId: '5Ad443h0uNsxTe6po6SdPQ==', url: 'https://cyberserch.gumroad.com/l/cv-multi-vacante-axiom' }),
  }),
});
export const CV_PLANS = Object.freeze({
  pro: Object.freeze({ amount: 5, currency: 'USD' }),
  plus: Object.freeze({ amount: 9, currency: 'USD' }),
});
export const CONVERSION_COPY = 'Listo. Acabo de ahorrarte horas de pelea con el formato y la redacción. Tu perfil ya tiene estructura de alto impacto. Puedes llevarte el texto en bruto gratis para maquetarlo por tu cuenta, o desbloquear los archivos maestros listos para enviar por US$5. ¿Cómo te quieres presentar?';
export const SUPPORT_COPY = 'Archivo .txt descargado. Si el diagnóstico de Axiom te salvó de mandar un CV con puntos ciegos, impulsa el laboratorio para mantener los servidores activos:';
export function supportUrl(amount) {
  if (![2,5].includes(amount)) throw new TypeError('Importe de apoyo inválido');
  const url = new URL('https://www.paypal.com/donate/');
  url.searchParams.set('hosted_button_id','D587QCAYURRYG');
  // Hosted donations let the visitor confirm the final amount in PayPal.
  url.searchParams.set('currency_code','USD'); url.searchParams.set('amount',String(amount));
  return url.href;
}
export function checkoutUrl(value) {
  if (typeof value !== 'string' || value.length > 512 || value !== value.trim() || /[\\\u0000-\u0020\u007F]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash
      || url.hostname !== 'cyberserch.gumroad.com' || !/^\/l\/[A-Za-z0-9_-]+$/u.test(url.pathname)) return null;
    const entries = [...url.searchParams];
    if (entries.length > 1 || entries.some(([key, value]) => key !== 'wanted' || value !== 'true')) return null;
    url.searchParams.set('wanted', 'true');
    return url.href;
  } catch { return null; }
}

function knownPlan(plan) { return typeof plan === 'string' && Object.hasOwn(CV_PLANS, plan); }
function validSession(session) { return typeof session === 'string' && session.length >= 16 && session.length <= 200 && !/[^A-Za-z0-9_-]/u.test(session); }
function record(data) { return Boolean(data && typeof data === 'object' && !Array.isArray(data)); }
function validLicense(key) { return typeof key === 'string' && key.length >= 16 && key.length <= 128 && !/[^A-Za-z0-9-]/u.test(key); }
function configuredProduct(config, plan) {
  if (!knownPlan(plan) || !record(config?.products) || !Object.hasOwn(config.products, plan)) return null;
  const product = config.products[plan];
  if (!record(product) || typeof product.productId !== 'string' || product.productId.length < 8 || product.productId.length > 128
    || /[^A-Za-z0-9_+/=-]/u.test(product.productId)) return null;
  const url = checkoutUrl(product.url);
  return url ? { productId: product.productId, url } : null;
}

let activeCheckout = null, verificationRevision = 0;
const PENDING_COPY = 'El pago de este paquete aún no está conectado. Puedes seguir editando o descargar tu texto gratis; no se realizó ningún cobro.';
const VERIFY_ERROR = 'No se pudo comprobar la licencia con Gumroad. Intenta de nuevo.';

export async function beginCheckout(plan, { config = CV_CHECKOUT } = {}) {
  if (!knownPlan(plan)) throw new Error('Plan desconocido.');
  const product = configuredProduct(config, plan);
  if (config?.enabled !== true || !product) throw new Error(PENDING_COPY);
  if (typeof globalThis.crypto?.randomUUID !== 'function') throw new Error('Abre el editor con HTTPS para iniciar la compra.');
  verificationRevision++;
  activeCheckout = { ...product, session: globalThis.crypto.randomUUID(), plan };
  return { url: activeCheckout.url, session: activeCheckout.session, plan };
}

export async function verifyCheckout(session, { licenseKey, plan, config = CV_CHECKOUT, request = globalThis.fetch } = {}) {
  const revision = ++verificationRevision, attempt = activeCheckout;
  if (config?.enabled !== true || !validSession(session) || !validLicense(licenseKey) || !knownPlan(plan)) return null;
  const product = configuredProduct(config, plan);
  if (!product || !attempt || session !== attempt.session || plan !== attempt.plan
    || product.productId !== attempt.productId || product.url !== attempt.url) return null;
  if (typeof request !== 'function') throw new Error('El servicio de pago no está disponible.');
  const body = new URLSearchParams({ product_id: product.productId, license_key: licenseKey, increment_uses_count: 'false' });
  let response, data;
  try {
    response = await request('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' }, body: body.toString(), signal: AbortSignal.timeout(12000),
    });
    if (revision !== verificationRevision || attempt !== activeCheckout) return null;
    if (response?.status === 404) return null;
    if (response?.ok !== true || typeof response.json !== 'function') throw new Error(VERIFY_ERROR);
    data = await response.json();
  } catch {
    if (revision !== verificationRevision || attempt !== activeCheckout) return null;
    throw new Error(VERIFY_ERROR);
  }
  const currentProduct = configuredProduct(config, plan);
  if (revision !== verificationRevision || attempt !== activeCheckout || config?.enabled !== true
    || currentProduct?.productId !== product.productId || currentProduct?.url !== product.url) return null;
  const purchase = record(data) && record(data.purchase) ? data.purchase : null;
  // Return no personal purchase fields. Neither a URL flag nor a donation grants access.
  return data?.success === true && purchase?.product_id === product.productId && purchase.license_key === licenseKey
    && purchase.refunded === false && purchase.disputed === false && purchase.chargebacked === false
    && purchase.currency === 'usd' && purchase.price === CV_PLANS[plan].amount * 100
    && purchase.subscription_id === null && purchase.test !== true ? { plan } : null;
}
