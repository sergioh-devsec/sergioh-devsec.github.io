(function (root) {
  'use strict';

  const missions = {
    security: {
      es: {
        title: 'Turno de vigilancia',
        intro: 'Axiom te acompaña en tres decisiones de un centro de operaciones de seguridad (SOC). Los registros y las direcciones son ficticios: busca señales, no culpables.',
        steps: [
          {
            title: '01 · Una señal merece atención',
            body: 'Llegan estos intentos de acceso. ¿Qué harías primero?',
            evidence: '09:00 DENEGADO · cuenta demo · 192.0.2.14\n09:01 DENEGADO · cuenta demo · 192.0.2.14\n09:02 DENEGADO · cuenta demo · 192.0.2.14\n09:03 ACEPTADO · cuenta pruebas · 198.51.100.5',
            options: [
              {id: 'block-all', label: 'Bloquear todas las direcciones de inmediato'},
              {id: 'review', label: 'Revisar los intentos repetidos y su contexto'},
              {id: 'ignore', label: 'Ignorarlos porque no consiguieron entrar'}
            ],
            correct: 'review',
            explanation: 'La repetición ayuda a priorizar una revisión. Por sí sola no demuestra un ataque: comprueba la cuenta, el horario y el origen antes de actuar.',
          },
          {
            title: '02 · Conecta las pistas',
            body: 'Aparece un acceso aceptado desde el mismo origen. ¿Qué necesitas para evaluar el caso?',
            evidence: '09:04 ACEPTADO · cuenta demo · 192.0.2.14\nAutenticación adicional: dato pendiente\nActividad posterior: dato pendiente',
            options: [
              {id: 'correlate', label: 'Contrastar el acceso, la autenticación y la actividad posterior'},
              {id: 'declare-breach', label: 'Declarar una intrusión solo por esta dirección'},
              {id: 'close', label: 'Cerrar el caso: un acceso aceptado siempre es legítimo'}
            ],
            correct: 'correlate',
            explanation: 'Un acceso aceptado puede ser legítimo o requerir investigación. Correlacionar evidencias reduce conclusiones apresuradas; si el riesgo lo exige, sigue el procedimiento de respuesta autorizado.',
          },
          {
            title: '03 · Comparte sin exponer',
            body: 'Vas a pedir una segunda opinión. ¿Cómo preparas la evidencia?',
            evidence: 'El archivo original contiene cuentas y datos internos.\nObjetivo: explicar la secuencia a una persona autorizada.',
            options: [
              {id: 'publish', label: 'Publicar el archivo completo para que cualquiera ayude'},
              {id: 'delete', label: 'Borrar el original para evitar que lo lean'},
              {id: 'minimize', label: 'Compartir lo necesario por un canal autorizado y conservar el original'}
            ],
            correct: 'minimize',
            explanation: 'Conserva la evidencia con acceso restringido y comparte una copia con los datos sensibles ocultos. La trazabilidad y la privacidad también forman parte de investigar bien.',
          }
        ],
        finish: 'Turno completado. Observar, contrastar y proteger la evidencia: tres hábitos que valen más que bloquear por intuición. Este ejercicio no sustituye una investigación real.'
      },
      en: {
        title: 'On watch',
        intro: 'Join Axiom for three decisions in a security operations center (SOC). All records and addresses are fictional: look for signals, not culprits.',
        steps: [
          {
            title: '01 · A signal worth reviewing',
            body: 'These sign-in attempts arrive. What would you do first?',
            evidence: '09:00 DENIED · demo account · 192.0.2.14\n09:01 DENIED · demo account · 192.0.2.14\n09:02 DENIED · demo account · 192.0.2.14\n09:03 ACCEPTED · test account · 198.51.100.5',
            options: [
              {id: 'block-all', label: 'Block every address immediately'},
              {id: 'review', label: 'Review the repeated attempts and their context'},
              {id: 'ignore', label: 'Ignore them because they could not sign in'}
            ],
            correct: 'review',
            explanation: 'Repetition helps prioritize a review. It does not prove an attack on its own: check the account, timing and source before acting.',
          },
          {
            title: '02 · Connect the clues',
            body: 'An accepted sign-in appears from the same source. What do you need to assess it?',
            evidence: '09:04 ACCEPTED · demo account · 192.0.2.14\nAdditional authentication: unknown\nSubsequent activity: unknown',
            options: [
              {id: 'correlate', label: 'Correlate the sign-in, authentication and subsequent activity'},
              {id: 'declare-breach', label: 'Declare a breach based on this address alone'},
              {id: 'close', label: 'Close the case: an accepted sign-in is always legitimate'}
            ],
            correct: 'correlate',
            explanation: 'An accepted sign-in may be legitimate or need investigation. Correlating evidence prevents rushed conclusions; if the risk calls for action, follow the authorized response procedure.',
          },
          {
            title: '03 · Share without exposing',
            body: 'You want a second opinion. How do you prepare the evidence?',
            evidence: 'The original file contains account and internal data.\nGoal: explain the sequence to an authorized person.',
            options: [
              {id: 'publish', label: 'Publish the entire file so anyone can help'},
              {id: 'delete', label: 'Delete the original so nobody can read it'},
              {id: 'minimize', label: 'Share only what is needed through an authorized channel and retain the original'}
            ],
            correct: 'minimize',
            explanation: 'Keep the evidence under restricted access and share a copy with sensitive data masked. Traceability and privacy are part of a sound investigation.',
          }
        ],
        finish: 'Shift complete. Observe, correlate and protect evidence: three habits that beat blocking on instinct. This exercise does not replace a real investigation.'
      }
    },
    network: {
      es: {
        title: 'Encuentra la ruta',
        intro: 'Un equipo, una red cableada y tres saltos. Construye con Axiom una ruta simplificada hasta Internet; aquí no modificamos ninguna conexión real.',
        steps: [
          {
            title: '01 · Sal del equipo',
            body: 'El equipo ya está en el punto de partida. En esta red de oficina hay un switch y un router separados. ¿A qué lo conectas primero?',
            evidence: 'EQUIPO → ?\nEl switch reúne los equipos de esta red local.',
            options: [
              {id: 'internet', label: 'Internet'},
              {id: 'switch', label: 'Switch · conecta equipos de la misma red'},
              {id: 'dns', label: 'DNS · traduce nombres a direcciones'}
            ],
            correct: 'switch',
            explanation: 'En esta topología, el switch enlaza los equipos dentro de la red local. Otras redes pueden integrar estas funciones en un solo dispositivo.',
          },
          {
            title: '02 · Busca la salida',
            body: 'Ya llegaste al switch. ¿Qué equipo sirve de puerta de enlace hacia otras redes?',
            evidence: 'EQUIPO → SWITCH → ?\nLa puerta de enlace tiene una conexión hacia el proveedor.',
            options: [
              {id: 'printer', label: 'Impresora · recibe trabajos de impresión'},
              {id: 'device', label: 'Volver al equipo'},
              {id: 'router', label: 'Router · dirige tráfico entre redes'}
            ],
            correct: 'router',
            explanation: 'El router decide hacia qué red enviar el tráfico. En este recorrido es la puerta de enlace; tenerlo conectado no garantiza por sí solo acceso a Internet.',
          },
          {
            title: '03 · Completa el recorrido',
            body: 'El router tiene servicio activo con el proveedor. ¿Cuál es el destino externo de esta ruta?',
            evidence: 'EQUIPO → SWITCH → ROUTER → ?\nSupuesto del ejercicio: enlace y configuración correctos.',
            options: [
              {id: 'internet', label: 'Internet · red externa a través del proveedor'},
              {id: 'switch', label: 'Volver al switch'},
              {id: 'disk', label: 'Disco local · guarda los archivos del equipo'}
            ],
            correct: 'internet',
            explanation: 'Ruta completa: equipo, switch, router e Internet. En un diagnóstico real también revisarías enlace, dirección IP, puerta de enlace y resolución DNS.',
          }
        ],
        finish: 'Ruta encontrada. Ahora cada salto tiene una función. Es un mapa simplificado para entender la conexión, no una prueba de que una red real funcione.'
      },
      en: {
        title: 'Find the route',
        intro: 'One device, one wired network and three hops. Build a simplified route to the Internet with Axiom; no real connections are changed here.',
        steps: [
          {
            title: '01 · Leave the device',
            body: 'The computer is the starting point. This office network has a separate switch and router. What comes first?',
            evidence: 'DEVICE → ?\nThe switch connects devices within this local network.',
            options: [
              {id: 'internet', label: 'Internet'},
              {id: 'switch', label: 'Switch · connects devices on the same network'},
              {id: 'dns', label: 'DNS · resolves names to addresses'}
            ],
            correct: 'switch',
            explanation: 'In this topology, the switch links devices within the local network. Other networks may combine these functions in a single device.',
          },
          {
            title: '02 · Find the gateway',
            body: 'You have reached the switch. Which device is the gateway to other networks?',
            evidence: 'DEVICE → SWITCH → ?\nThe gateway has a connection to the service provider.',
            options: [
              {id: 'printer', label: 'Printer · receives print jobs'},
              {id: 'device', label: 'Back to the device'},
              {id: 'router', label: 'Router · routes traffic between networks'}
            ],
            correct: 'router',
            explanation: 'The router decides which network receives the traffic. It is the gateway in this route; connecting it alone does not guarantee Internet access.',
          },
          {
            title: '03 · Complete the route',
            body: 'The router has an active provider connection. What is the external destination of this route?',
            evidence: 'DEVICE → SWITCH → ROUTER → ?\nExercise assumption: the link and configuration work.',
            options: [
              {id: 'internet', label: 'Internet · external network through the provider'},
              {id: 'switch', label: 'Back to the switch'},
              {id: 'disk', label: 'Local drive · stores files on the device'}
            ],
            correct: 'internet',
            explanation: 'Route complete: device, switch, router and Internet. A real diagnosis would also check the link, IP address, gateway and DNS resolution.',
          }
        ],
        finish: 'Route found. Every hop now has a purpose. This simplified map explains the connection; it does not test whether a real network works.'
      }
    },
    automation: {
      es: {
        title: 'Haz que fluya',
        intro: 'Una solicitud ya llegó al formulario. Ayuda a Axiom a ordenar tres pasos para convertirla en una tarea útil, con cuidado de los datos.',
        steps: [
          {
            title: '01 · Antes de mover datos',
            body: 'El formulario recibió una solicitud. ¿Qué bloque debe ir primero?',
            evidence: 'FORMULARIO → ?\nCampos previstos: nombre, correo y descripción breve.',
            options: [
              {id: 'notify', label: 'Avisar · enviar una notificación al equipo'},
              {id: 'organize', label: 'Organizar · crear la tarea definitiva'},
              {id: 'validate', label: 'Validar · comprobar los campos necesarios'}
            ],
            correct: 'validate',
            explanation: 'Comprueba formato, campos necesarios y límites antes de continuar. Si algo falla, pide corregirlo; no recopiles contraseñas ni información que el proceso no necesita.',
          },
          {
            title: '02 · Dale un lugar',
            body: 'La solicitud pasó la validación. ¿Qué bloque prepara el trabajo antes del aviso?',
            evidence: 'FORMULARIO → VALIDAR → ?\nLa solicitud necesita estado y responsable.',
            options: [
              {id: 'organize', label: 'Organizar · registrar la tarea y asignar su estado'},
              {id: 'publish', label: 'Publicar · mostrar todos los datos en la web'},
              {id: 'form', label: 'Solicitar de nuevo los mismos datos'}
            ],
            correct: 'organize',
            explanation: 'Registra la tarea en el destino acordado, con estado y responsable. Un identificador ayuda a evitar duplicados si se repite el envío.',
          },
          {
            title: '03 · Avisa con sentido',
            body: 'La tarea ya está registrada. ¿Cómo cierras este flujo?',
            evidence: 'FORMULARIO → VALIDAR → ORGANIZAR → ?\nDestino del aviso: la persona responsable de la tarea.',
            options: [
              {id: 'loop', label: 'Reenviar el formulario sin límite'},
              {id: 'notify', label: 'Avisar · enviar un resumen y el enlace autorizado a la tarea'},
              {id: 'secrets', label: 'Adjuntar todos los datos internos y las credenciales'}
            ],
            correct: 'notify',
            explanation: 'Notifica solo lo necesario y permite abrir la tarea con los permisos correctos. En producción también hacen falta manejo de errores, reintentos limitados y seguimiento.',
          }
        ],
        finish: 'Flujo ordenado: formulario, validar, organizar y avisar. Menos copiar y pegar; más tiempo para decidir. Aquí has diseñado una secuencia, no enviado una solicitud real.'
      },
      en: {
        title: 'Make it flow',
        intro: 'A request has arrived through a form. Help Axiom arrange three steps to turn it into useful work while looking after the data.',
        steps: [
          {
            title: '01 · Before moving data',
            body: 'The form received a request. Which block comes first?',
            evidence: 'FORM → ?\nExpected fields: name, email and a short description.',
            options: [
              {id: 'notify', label: 'Notify · send the team a notification'},
              {id: 'organize', label: 'Organize · create the final task'},
              {id: 'validate', label: 'Validate · check the required fields'}
            ],
            correct: 'validate',
            explanation: 'Check format, required fields and limits before proceeding. If something fails, ask for a correction; do not collect passwords or information the process does not need.',
          },
          {
            title: '02 · Give it a place',
            body: 'The request passed validation. Which block prepares the work before sending a notification?',
            evidence: 'FORM → VALIDATE → ?\nThe request needs a status and an owner.',
            options: [
              {id: 'organize', label: 'Organize · record the task and assign its status'},
              {id: 'publish', label: 'Publish · display all data on the website'},
              {id: 'form', label: 'Ask for the same information again'}
            ],
            correct: 'organize',
            explanation: 'Record the task in the agreed destination, with a status and an owner. An identifier helps prevent duplicates if the request is submitted again.',
          },
          {
            title: '03 · Notify with purpose',
            body: 'The task is recorded. How do you complete this flow?',
            evidence: 'FORM → VALIDATE → ORGANIZE → ?\nNotification recipient: the person responsible for the task.',
            options: [
              {id: 'loop', label: 'Resend the form without any limit'},
              {id: 'notify', label: 'Notify · send a summary and the authorized task link'},
              {id: 'secrets', label: 'Attach all internal data and credentials'}
            ],
            correct: 'notify',
            explanation: 'Notify only what is needed and require appropriate permissions to open the task. Production flows also need error handling, limited retries and monitoring.',
          }
        ],
        finish: 'Flow arranged: form, validate, organize and notify. Less copying and pasting; more time for decisions. You designed a sequence here, without sending a real request.'
      }
    }
  };

  function freeze(value) {
    Object.values(value).forEach(item => {
      if (item && typeof item === 'object') freeze(item);
    });
    return Object.freeze(value);
  }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function requireMission(id) {
    if (typeof id !== 'string' || !Object.hasOwn(missions, id)) throw new RangeError('Unknown mission.');
    return missions[id];
  }
  function language(lang) {
    if (lang !== 'es' && lang !== 'en') throw new RangeError('Unsupported language.');
    return lang;
  }
  freeze(missions);

  function getMission(id, lang = 'es') {
    return copy(requireMission(id)[language(lang)]);
  }

  function createRun(id) {
    const steps = requireMission(id).es.steps;
    let step = 0;
    let answers = [];
    let feedback = null;
    let complete = false;
    function snapshot() {
      return {
        step,
        answers: answers.slice(),
        feedback: feedback ? {...feedback} : null,
        complete,
        score: answers.reduce((sum, answer, index) => sum + Number(answer === steps[index].correct), 0),
        total: steps.length
      };
    }
    return Object.freeze({
      choose(optionId) {
        if (complete) throw new Error('This mission is complete. Reset to play again.');
        if (answers.length > step) throw new Error('This step already has an answer.');
        if (typeof optionId !== 'string' || !steps[step].options.some(option => option.id === optionId)) {
          throw new RangeError('Unknown option for the current step.');
        }
        answers.push(optionId);
        feedback = {correct: optionId === steps[step].correct, choice: optionId, expected: steps[step].correct};
        return snapshot();
      },
      next() {
        if (complete) throw new Error('This mission is already complete.');
        if (answers.length <= step) throw new Error('Choose an option before continuing.');
        if (step === steps.length - 1) complete = true;
        else { step += 1; feedback = null; }
        return snapshot();
      },
      reset() {
        step = 0;
        answers = [];
        feedback = null;
        complete = false;
        return snapshot();
      },
      get state() { return snapshot(); }
    });
  }

  function rewardText(lang = 'es') {
    language(lang);
    return lang === 'es' ? [
      'CYBERSERCHMX · BITÁCORA DE AXIOM',
      'Tres hábitos para llevar del laboratorio a tu próximo proyecto.',
      '',
      'SEGURIDAD · Observa antes de concluir',
      '[ ] Identifica qué ocurrió, cuándo y en qué cuenta.',
      '[ ] Contrasta varias señales; una IP o un intento fallido no prueban un ataque.',
      '[ ] Conserva la evidencia original con acceso restringido.',
      '[ ] Comparte solo los datos necesarios por canales autorizados.',
      '',
      'REDES · Recorre el camino',
      '[ ] Comprueba alimentación, cable o conexión inalámbrica.',
      '[ ] Revisa dirección IP y puerta de enlace del equipo.',
      '[ ] Distingue la red local de la salida hacia el proveedor.',
      '[ ] Si hay conexión pero fallan los nombres, revisa DNS.',
      '[ ] Documenta cambios y una forma de volver a la configuración anterior.',
      '',
      'AUTOMATIZACIÓN · Valida, organiza y avisa',
      '[ ] Define qué inicia el flujo y qué resultado esperas.',
      '[ ] Solicita los datos mínimos y valida campos y límites.',
      '[ ] Evita duplicados con un identificador de la solicitud.',
      '[ ] Asigna estado y responsable antes de notificar.',
      '[ ] Limita reintentos y registra errores sin guardar secretos.',
      '[ ] Prueba con datos ficticios antes de usar información real.',
      '',
      'Una guía de práctica, no una certificación ni una auditoría. Actúa solo en sistemas propios o con autorización.',
      'Axiom · El ciberasistente de Serch'
    ].join('\n') : [
      'CYBERSERCHMX · AXIOM FIELD NOTES',
      'Three habits to take from the lab to your next project.',
      '',
      'SECURITY · Observe before concluding',
      '[ ] Identify what happened, when and on which account.',
      '[ ] Correlate signals; an IP or a failed attempt does not prove an attack.',
      '[ ] Retain original evidence under restricted access.',
      '[ ] Share only the necessary data through authorized channels.',
      '',
      'NETWORKS · Follow the route',
      '[ ] Check power, cable or wireless connection.',
      '[ ] Review the device IP address and gateway.',
      '[ ] Distinguish the local network from the provider connection.',
      '[ ] If connectivity works but names fail, check DNS.',
      '[ ] Document changes and a way to restore the previous configuration.',
      '',
      'AUTOMATION · Validate, organize and notify',
      '[ ] Define what starts the flow and the expected outcome.',
      '[ ] Request minimal data and validate fields and limits.',
      '[ ] Prevent duplicates with a request identifier.',
      '[ ] Assign a status and an owner before notifying.',
      '[ ] Limit retries and log errors without recording secrets.',
      '[ ] Test with fictional data before handling real information.',
      '',
      'A practice guide, not a certification or an audit. Work only on your own systems or with authorization.',
      'Axiom · Serch’s cyber assistant'
    ].join('\n');
  }

  const api = Object.freeze({missions, getMission, createRun, rewardText});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LabMissions = api;
})(typeof window === 'undefined' ? null : window);
