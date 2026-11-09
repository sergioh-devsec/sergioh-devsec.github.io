/* Small DOM helpers for the estimate page; external integrations have separate consent gates. */
(() => {
  'use strict';
  function el(tag,cls='',text){const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;}
  function link(text,value,cls='text-link'){
    try{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password)return null;
      const node=el('a',cls,text);node.href=url.href;node.target='_blank';node.rel='noopener noreferrer';return node;
    }catch{return null;}
  }
  const copy = {
    es: {
      delivery: 'Tu entrega, en claro',
      includes: 'Qué recibes',
      materials: 'Qué necesito de ti',
      next: 'Qué pasa después',
      consult: 'Preparar una consulta gratuita',
      sample: 'Ver un ejemplo en otra pestaña',
      creatorLabel: '¿En qué te gustaría enfocarte? (opcional)',
      creatorHint: 'La opción solo prepara un mensaje que puedes editar. El simulador se queda en tu navegador. Evita datos de terceros o enlaces privados.',
      goals: {
        '': 'Selecciona un objetivo',
        automatizacion: 'Automatizar tareas',
        oferta: 'Mejorar mi oferta',
        datos: 'Entender mis números',
      },
      creatorMessages: {
        '': 'Quiero organizar mejor mi negocio de contenido. Me gustaría revisar qué tarea conviene resolver primero.',
        automatizacion: 'Me gustaría automatizar tareas repetitivas de mi negocio de contenido, como organizar archivos, calendario o reportes.',
        oferta: 'Me gustaría ordenar mis paquetes y explicar mejor mi oferta de contenido.',
        datos: 'Me gustaría entender mejor mis ingresos, costos y conversiones con un tablero sencillo.',
      },
      attach: 'Adjuntar la estimación actual (opcional)',
      attachHelp: 'Si la adjuntas, se incluye el desglose y plazo orientativo que ves aquí.',
      privacy: 'Usaré tu nombre, correo, objetivo y la estimación si decides adjuntarla para responder a tu consulta. Web3Forms procesa y almacena el envío según su política de privacidad. Evita contraseñas, documentos personales e información de terceros.',
      accepted: 'Web3Forms aceptó el envío. La entrega al buzón aún no está confirmada. Si puedo atender tu proyecto, te responderé al correo indicado con preguntas o una propuesta. La consulta es gratuita.',
      offers: {
        landing: ['Tu oferta, logotipo, textos e imágenes que puedas usar.', 'Quiero una página para presentar una oferta y recibir consultas.'],
        information: ['Tu catálogo de servicios, textos, imágenes y una persona que apruebe los cambios.', 'Quiero un sitio para explicar mis servicios, mi proceso y cómo contactarme.'],
        custom: ['El objetivo de la función, un ejemplo del flujo y qué debe pasar cuando se usa.', 'Quiero una web a medida con una función específica para mi negocio.'],
        automation: ['La tarea que repites, las herramientas actuales y un ejemplo sin datos personales.', 'Quiero automatizar una tarea repetitiva y revisar qué herramientas pueden conectarse.'],
        security: ['La dirección pública, la prioridad de la revisión y autorización escrita de la persona titular.', 'Quiero revisar la seguridad de un sitio público y recibir recomendaciones priorizadas.'],
      },
      nextCopy: 'Cuéntame qué necesitas. Confirmaremos alcance, costo y fechas antes de contratar.',
    },
    en: {
      delivery: 'Know what you will receive',
      includes: 'What you receive',
      materials: 'What I need from you',
      next: 'What happens next',
      consult: 'Prepare a free enquiry',
      sample: 'View an example in a new tab',
      creatorLabel: 'What would you like to focus on? (optional)',
      creatorHint: 'Your choice prepares a message you can edit. The simulator stays in your browser. Leave out private links and other people’s information.',
      goals: {
        '': 'Choose a goal',
        automatizacion: 'Automate tasks',
        oferta: 'Improve my offer',
        datos: 'Understand my numbers',
      },
      creatorMessages: {
        '': 'I want to organize my content business and decide which task to tackle first.',
        automatizacion: 'I would like to automate repetitive tasks in my content business, such as organizing files, a calendar or reports.',
        oferta: 'I would like to structure my content packages and explain my offer more clearly.',
        datos: 'I would like a simple dashboard to understand my revenue, costs and conversion rates.',
      },
      attach: 'Attach the current estimate (optional)',
      attachHelp: 'If attached, this includes the breakdown and indicative timeline shown here.',
      privacy: 'I use your name, email, goal and the estimate if you attach it to answer your enquiry. Web3Forms processes and stores the submission according to its privacy policy. Leave out passwords, personal documents and other people’s information.',
      accepted: 'Web3Forms accepted the submission. Delivery to the inbox is still unconfirmed. If I can help with your project, I will reply to the email you supplied with questions or a proposal. The enquiry is free.',
      offers: {
        landing: ['Your offer, logo, copy and images you can use.', 'I want a page to present an offer and receive enquiries.'],
        information: ['Your service list, copy, images and someone who can approve revisions.', 'I want a site that explains my services, process and how to get in touch.'],
        custom: ['The goal for the feature, an example workflow and what should happen when someone uses it.', 'I want a custom site with a specific feature for my business.'],
        automation: ['The task you repeat, your current tools and an example without personal data.', 'I want to automate a recurring task and see which tools can work together.'],
        security: ['The public address, the review priority and written authorization from the owner.', 'I want a security review of a public site with prioritized recommendations.'],
      },
      nextCopy: 'Tell me what you need. We will confirm the scope, cost and dates before you hire me.',
    },
  };
  const quoteCopy = language => copy[language === 'en' ? 'en' : 'es'];
  window.Site = {el, link, quoteCopy};
})();
