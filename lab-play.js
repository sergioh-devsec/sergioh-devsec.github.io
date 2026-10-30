/* Small defensive exercise. Synthetic evidence only; no keyboard text, scores or files are sent. */
(() => {
  'use strict';
  const CORRECT = ['review', 'correlate', 'minimize'];
  function assess(answers) {
    if (!Array.isArray(answers) || answers.length > CORRECT.length) throw new TypeError('Invalid answers');
    return {answered: answers.length, correct: answers.filter((answer, index) => answer === CORRECT[index]).length, total: CORRECT.length};
  }
  function secretSequence() {
    const sequence = 'axiom'; let position = 0, previous = 0;
    return {reset() {position = 0; previous = 0;}, press(key, time, allowed = true) {
      if (!allowed || typeof key !== 'string' || !Number.isFinite(time)) {this.reset(); return false;}
      if (time - previous > 1800 || time < previous) position = 0;
      previous = time;
      const letter = key.toLowerCase();
      position = letter === sequence[position] ? position + 1 : letter === sequence[0] ? 1 : 0;
      if (position === sequence.length) {this.reset(); return true;} return false;
    }};
  }
  if (typeof module === 'object' && module.exports) module.exports = {assess, secretSequence};
  if (typeof document === 'undefined') return;
  const root = document.getElementById('soc-exercise'); if (!root) return;
  const I = window.I18N, S = window.Site;
  const copy = {
    es: {
      stage: 'TU TURNO / ', start: 'Abrir el caso', next: 'Siguiente decisión', retry: 'Resolver otra vez',
      intro: 'Tres decisiones. Una alerta que todavía no es un incidente.', lead: 'Axiom te entrega una muestra inventada. Lee las señales, elige qué harías y descubre el motivo. Sin cronómetro ni registro.',
      hint: 'Pista: distingue lo que observas de lo que todavía necesitas comprobar.',
      cases: [
        ['Observa antes de bloquear.', 'Hay tres rechazos desde una misma IP en cuatro minutos. ¿Qué priorizas?', '09:00:00 DENY 192.0.2.14\n09:01:00 DENY 192.0.2.14\n09:02:00 ACCEPT 198.51.100.5\n09:03:00 DENY 192.0.2.14', [['block','Bloquear todas las IP de la muestra'],['review','Revisar los rechazos de 192.0.2.14'],['ignore','Cerrar la alerta: también hay un acceso válido']], 'Los rechazos repetidos merecen revisión, pero no prueban un ataque. Valida la cuenta, el servicio, el contexto y el alcance antes de contener.'],
        ['Una señal nueva cambia la pregunta.', 'Aparece un acceso aceptado desde el mismo origen. ¿Cuál es el siguiente paso?', '09:04:00 ACCEPT 192.0.2.14\nContexto: cuenta, dispositivo y MFA aún sin revisar.', [['confirmed','Declarar una intrusión confirmada'],['correlate','Correlacionar cuenta, MFA y actividad posterior'],['safe','Descartar el caso porque el acceso fue aceptado']], 'Un éxito tras varios fallos puede ser un usuario legítimo o algo que investigar. Conserva la cronología, contrasta señales y documenta lo que falta; no inventes una conclusión.'],
        ['La evidencia también necesita cuidado.', 'Quieres compartir el caso para pedir una segunda opinión. ¿Qué envías?', 'Evidencia disponible: eventos, identificadores, nombres de usuarios y tokens de sesión.', [['all','El archivo completo en un chat público'],['delete','Borrar toda la evidencia del equipo'],['minimize','Una copia mínima, sin tokens ni datos personales']], 'Mantén el original bajo acceso autorizado y comparte solo una copia necesaria, seudonimizada y sin secretos. Conserva el contexto que permita revisar el razonamiento.']
      ],
      correct: 'Buen criterio.', consider: 'Hay una opción más prudente.', done: 'Caso cerrado. Criterio abierto.', result: 'decisiones alineadas con el criterio del ejercicio. Es una práctica, no una certificación ni una evaluación de contratación.',
      outcome: 'Observar → Correlacionar → Proteger la evidencia. Ese es el proceso que quiero mostrar en mi trabajo de ingeniería y ciberseguridad.', tools: 'Ahora prueba tus propios logs', code: 'Ver el proceso y el código', coffee: 'Invitar un café al laboratorio', optional: 'Las herramientas y el reto son gratuitos. Apoyar es opcional.',
      secret: 'Señal de Axiom encontrada.', secretLead: 'Cinco letras, cero privilegios de administrador. Así sí me gusta abrir puertas.', secretBody: 'Tu acceso especial es una idea: confiar menos en las suposiciones y más en la evidencia. El siguiente reto está a un clic; ningún sistema real ha sido explorado.', secretAction: 'Ir al reto SOC', secretFoot: 'Sorpresa local · sin cuenta, puntos públicos ni premios de pago.'
    },
    en: {
      stage: 'YOUR TURN / ', start: 'Open the case', next: 'Next decision', retry: 'Try again',
      intro: 'Three decisions. An alert is not yet an incident.', lead: 'Axiom hands you fictional evidence. Read the signals, choose your response and explore the reasoning. No timer or sign-up.', hint: 'Hint: separate what you observe from what still needs verification.',
      cases: [
        ['Observe before you block.', 'One IP has three rejected attempts within four minutes. What do you prioritize?', '09:00:00 DENY 192.0.2.14\n09:01:00 DENY 192.0.2.14\n09:02:00 ACCEPT 198.51.100.5\n09:03:00 DENY 192.0.2.14', [['block','Block every IP in the sample'],['review','Review the rejections from 192.0.2.14'],['ignore','Close the alert: a valid login also exists']], 'Repeated rejections deserve review, but do not prove an attack. Check the account, service, context and authorized scope before containment.'],
        ['New evidence changes the question.', 'A successful login appears from the same source. What comes next?', '09:04:00 ACCEPT 192.0.2.14\nContext: account, device and MFA have not been checked.', [['confirmed','Declare a confirmed intrusion'],['correlate','Correlate account, MFA and subsequent activity'],['safe','Dismiss the case because the login succeeded']], 'Success after failures could be legitimate or worth investigating. Preserve the timeline, correlate evidence and document gaps instead of inventing a conclusion.'],
        ['Evidence needs protection too.', 'You want a second opinion on the case. What do you share?', 'Available evidence: events, identifiers, usernames and session tokens.', [['all','The complete file in a public chat'],['delete','Delete all original evidence'],['minimize','A minimal copy without tokens or personal data']], 'Keep the original under authorized access. Share only a necessary, pseudonymized copy without secrets, retaining enough context to review the reasoning.']
      ],
      correct: 'Sound judgment.', consider: 'There is a more cautious option.', done: 'Case closed. Keep questioning.', result: 'decisions aligned with this exercise. This is practice, not a certification or hiring assessment.', outcome: 'Observe → Correlate → Protect evidence. This is the approach I aim to demonstrate in my software and cybersecurity work.', tools: 'Try your own logs next', code: 'Explore the process and code', coffee: 'Buy the lab a coffee', optional: 'The tools and exercise are free. Support is optional.',
      secret: 'You found Axiom’s signal.', secretLead: 'Five letters. Zero admin privileges. That is how I like opening doors.', secretBody: 'Your special access is an idea: trust assumptions less and evidence more. The next challenge is one click away; no real system has been probed.', secretAction: 'Open the SOC exercise', secretFoot: 'A local surprise · no account, public leaderboard or paid rewards.'
    }
  };
  let started = false, step = 0, answers = [], answered = false;
  const c = () => copy[I.language];
  const node = (tag, text, cls = '') => S.el(tag, cls, text);
  const button = (label, action, cls = 'button secondary') => {const b = node('button', label, cls); b.type = 'button'; b.addEventListener('click', action); return b;};
  function render(focus = false) {
    const text = c(); root.replaceChildren();
    const title = node('h3', started ? step < 3 ? text.cases[step][0] : text.done : text.intro); title.tabIndex = -1;
    root.append(node('p', text.stage + (started ? Math.min(step + 1, 3) + ' / 3' : 'SOC'), 'eyebrow'), title);
    if (!started) {
      root.append(node('p', text.lead), button(text.start, () => {started = true; render(true);}, 'button primary'), node('p', text.hint, 'small muted'));
    } else if (step < 3) {
      const scenario = text.cases[step]; root.append(node('p', scenario[1]));
      const pre = node('pre', scenario[2], 'soc-evidence'); pre.tabIndex = 0; root.append(pre);
      const options = node('div', '', 'soc-choices'); options.setAttribute('role','group'); options.setAttribute('aria-label', scenario[1]);
      scenario[3].forEach(([key, label]) => {
        const b = button(label, () => {if (answered) return; answers.push(key); answered = true; render(); root.querySelector('.soc-feedback').focus();});
        b.disabled = answered; if (answered && key === CORRECT[step]) b.classList.add('soc-correct');
        if (answered && key === answers[step]) b.setAttribute('aria-pressed','true'); options.append(b);
      }); root.append(options);
      if (answered) {const feedback = node('div', '', 'soc-feedback'); feedback.tabIndex = -1; feedback.setAttribute('role','status'); feedback.append(node('strong', answers[step] === CORRECT[step] ? text.correct : text.consider), node('p', scenario[4])); root.append(feedback, button(text.next, () => {step++; answered = false; render(true);}, 'button primary'));}
    } else {
      root.append(node('p', assess(answers).correct + ' / 3 ' + text.result), node('p', text.outcome));
      const actions = node('div', '', 'actions'); actions.append(S.link(text.tools, 'herramientas.html#logs', 'button primary'), S.link(text.code, 'https://github.com/sergioh-devsec/revisa-accesos'), button(text.retry, () => {step = 0; answers = []; answered = false; render(true);}));
      root.append(actions, node('p', text.optional, 'small muted'), S.link(text.coffee, 'https://www.paypal.com/donate/?hosted_button_id=D587QCAYURRYG'));
    }
    if (focus) {title.focus({preventScroll: true}); root.scrollIntoView({block: 'start', behavior: 'instant'});}
  }
  function renderSecret() {
    const text = c(); document.getElementById('axiom-secret-title').textContent = text.secret;
    const content = document.getElementById('axiom-secret-content'); content.replaceChildren(node('p', text.secretLead, 'secret-lead'), node('p', text.secretBody), button(text.secretAction, () => {S.navigate('#soc-play'); started = true; step = 0; answers = []; answered = false; render(true);}, 'button primary'), node('p', text.secretFoot, 'small muted'));
  }
  const sequence = secretSequence();
  document.addEventListener('keydown', event => {
    const allowed = event.isTrusted && !event.ctrlKey && !event.altKey && !event.metaKey && !event.repeat && !event.isComposing && !document.hidden && !document.querySelector('dialog[open], .axiom-panel:not([hidden]), .analytics-consent:not([hidden])') && !event.target.closest?.('input,textarea,select,button,a,summary,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
    if (sequence.press(event.key, performance.now(), allowed)) S.openDialog('axiom-secret', document.activeElement);
  });
  document.addEventListener('visibilitychange', () => sequence.reset());
  document.addEventListener('portfolio:language', () => {render(); renderSecret();});
  render(); renderSecret();
})();
