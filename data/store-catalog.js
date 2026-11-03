/* Public catalogue only. Paid files and account credentials never belong here. */
(() => {
  'use strict';
  const products = [
    {id:'entrevista',slug:'entrevista-express',category:'career',price:7,status:'available',checkout:'https://cyberserch.gumroad.com/l/entrevista-express',sample:'muestras/entrevista/index.html',
      name:{es:'Entrevista exprés',en:'Interview ready'},
      lead:{es:'Ordena lo que sabes hacer antes de entrar a la entrevista.',en:'Put your experience into words before the interview.'},
      contents:{es:['Cuaderno de historias STAR y logros','Banco de preguntas y práctica cronometrada','Seguimiento de postulaciones en CSV'],en:['STAR stories and achievements workbook','Question bank and timed practice','Application tracker in CSV']},
      requirements:{es:'Navegador moderno. Los CSV se abren en Excel, LibreOffice o Google Sheets. No incluye revisión humana ni promesa de contratación.',en:'Modern browser. CSV files open in Excel, LibreOffice or Google Sheets. No human review or hiring promise included.'}},
    {id:'negocio',slug:'ordena-tu-negocio',category:'business',price:12,status:'available',checkout:'https://cyberserch.gumroad.com/l/ordena-tu-negocio',sample:'muestras/negocio/index.html',
      name:{es:'Ordena tu negocio',en:'Get your business organized'},
      lead:{es:'Tareas, presupuestos y pendientes de cobro, en un mismo punto de partida.',en:'A practical starting point for tasks, quotes and payment follow-ups.'},
      contents:{es:['Cuaderno de operación y rutina semanal','Plantillas CSV vacías y ejemplos ficticios','Guía para adaptar el sistema a tu negocio'],en:['Operations workbook and weekly routine','Blank CSV templates and fictional examples','Guide to adapting the system to your business']},
      requirements:{es:'Navegador y una aplicación compatible con CSV. Control administrativo; no sustituye contabilidad, facturación ni asesoría fiscal.',en:'Browser and a CSV-compatible application. Administrative tracking; not accounting, invoicing or tax advice.'}},
    {id:'ia-local',slug:'ia-local-privacidad',category:'technology',price:9,status:'validation',checkout:null,sample:'muestras/ia-local/index.html',
      name:{es:'IA local y privacidad',en:'Local AI and privacy'},
      lead:{es:'Explora un flujo local con scripts legibles y pasos que puedes revisar.',en:'Explore a local workflow with readable scripts and inspectable steps.'},
      contents:{es:['Cliente Python y tres ejercicios guiados','Guías en español e inglés','Comprobaciones de configuración y privacidad'],en:['Python client and three guided exercises','Spanish and English guides','Configuration and privacy checks']},
      requirements:{es:'Python 3.11+, Ollama y un modelo compatible, instalados por tu cuenta. No incluye modelos ni la voz de Axiom. Venta pendiente de una prueba real con modelo.',en:'Python 3.11+, Ollama and a compatible model installed separately. Models and Axiom’s voice are not included. Sale awaits real-model acceptance.'}},
    {id:'soc',slug:'laboratorio-soc-inicial',category:'technology',price:12,status:'available',checkout:'https://cyberserch.gumroad.com/l/laboratorio-soc-inicial',sample:'muestras/soc/index.html',
      name:{es:'Tu primer turno SOC',en:'Your first SOC shift'},
      lead:{es:'Practica cómo revisar eventos y explicar lo que encontraste.',en:'Practice reviewing events and explaining your findings.'},
      contents:{es:['Tres escenarios con logs ficticios','Analizador local y pruebas reproducibles','Ejercicios y soluciones razonadas'],en:['Three scenarios with fictional logs','Local analyzer and reproducible checks','Exercises and explained solutions']},
      requirements:{es:'Python 3.11+ para el analizador. Solo archivos de práctica locales. No es una certificación ni una auditoría de sistemas reales.',en:'Python 3.11+ for the analyzer. Local practice files only. Not a certification or an audit of live systems.'}},
    {id:'plantillas',slug:'paginas-para-tres-negocios',category:'business',price:29,status:'available',checkout:'https://cyberserch.gumroad.com/l/paginas-para-tres-negocios',sample:'muestras/plantillas/index.html',
      name:{es:'Una web para empezar',en:'A website to start with'},
      lead:{es:'Tres diseños independientes para odontología, psicología y uñas.',en:'Three distinct designs for dental care, psychology and nails.'},
      contents:{es:['Tres plantillas HTML, CSS y JavaScript','Configuración de marca y contacto','Guía de personalización y publicación'],en:['Three HTML, CSS and JavaScript templates','Brand and contact configuration','Customization and publishing guide']},
      requirements:{es:'Edición básica de archivos y navegador. Dominio, alojamiento, formularios, instalación y personalización por encargo no incluidos. Marcas de muestra ficticias.',en:'Basic file editing and a browser. Domain, hosting, forms, installation and custom design services are not included. Sample brands are fictional.'}}
  ];
  const api={products:Object.freeze(products.map(p=>Object.freeze(p)))};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.STORE_CATALOG=api;
})();
