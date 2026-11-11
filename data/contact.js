/* Public switches only. Activate the Worker after real delivery and Turnstile tests. */
window.CONTACT_CONFIG = Object.freeze({
  provider: 'worker',
  endpoint: 'https://contact.cyberserch.com/contact',
  turnstileSiteKey: '0x4AAAAAAFyFqhFkEgS0Kv7g'
});
