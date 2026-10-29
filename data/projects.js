window.PORTFOLIO = {
  "supportLinks": {
    "patreon": "https://www.patreon.com/c/CyberserchMX/membership",
    "paypal": "https://www.paypal.com/donate/?hosted_button_id=D587QCAYURRYG"
  },
  "cvCheckoutUrl": null,
  "socialLinks": {
    "x": "https://x.com/CyberSerchsMX",
    "instagram": "https://www.instagram.com/cyberserch.mx/",
    "tiktok": "https://www.tiktok.com/@cyberserch.mx",
    "youtube": "https://www.youtube.com/@cyberserchmx",
    "telegram": null
  },
  "projects": [
    {
      "id": "local-ai-platform",
      "name": "Plataforma de IA local",
      "subtitle": "Local AI Production Platform",
      "icon": "core",
      "categories": [
        "ai",
        "automation",
        "content",
        "python"
      ],
      "categoryLabel": "AI / AUTOMATION / CONTENT",
      "status": "EN DESARROLLO",
      "statusType": "active",
      "featured": false,
      "description": "Una plataforma de inteligencia artificial local para conectar la generación de imagen, video y voz en un mismo flujo de producción.",
      "problem": "Reducir la fragmentación entre herramientas creativas y explorar una producción multimedia automatizada bajo control local.",
      "architecture": "Brief → orquestador Python → modelos locales de imagen, video y voz → revisión humana → exportación",
      "architectureLabel": "Arquitectura propuesta",
      "stack": [
        "Python",
        "ComfyUI",
        "LLM local",
        "TTS"
      ],
      "stackLabel": "Stack propuesto",
      "features": [
        "Generación de imágenes y video.",
        "Síntesis de voz, clonación autorizada, avatar digital y lip sync.",
        "Agentes locales y automatización de procesos multimedia.",
        "Revisión humana y preparación de piezas para distintos canales."
      ],
      "scope": "Visión de producto en desarrollo. El esquema representa una arquitectura conceptual; no acredita módulos terminados. Repositorio, capturas y demo pendientes de publicación.",
      "version": null,
      "progress": null,
      "updated": null,
      "github": null,
      "demo": null,
      "docs": null,
      "screenshots": [],
      "shipped": false,
      "backlog": true
    },
    {
      "id": "python-lab",
      "name": "Organizador CSV · Python",
      "icon": "code",
      "categories": [
        "python",
        "automation"
      ],
      "categoryLabel": "PYTHON / TOOLS",
      "status": "PUBLICADO · PROBADO",
      "statusType": "active",
      "description": "Una herramienta ejecutable convierte archivos CSV en un plan de tareas limpio, con resumen de descartes.",
      "problem": "Evitar la limpieza repetida de listas y saber qué se elimina.",
      "architecture": "CSV local → validación de fechas y columnas → deduplicación → pendientes ordenados → CSV seguro",
      "architectureLabel": "Arquitectura de referencia",
      "stack": [
        "Python",
        "CSV",
        "unittest"
      ],
      "stackLabel": "Tecnologías previstas",
      "features": [
        "CLI sin dependencias, con muestra reproducible.",
        "Admite ES/EN y celdas entrecomilladas.",
        "Neutraliza prefijos de fórmulas al exportar.",
        "No sobrescribe archivos existentes."
      ],
      "scope": "Herramienta local terminada y probada. Máximo 200 registros y 20 KB. No conecta servicios ni modifica el archivo de origen.",
      "version": "1.0.0",
      "progress": null,
      "updated": "2026-10-28",
      "github": "https://github.com/sergioh-devsec/csv-task-organizer",
      "demo": "#automation",
      "docs": null,
      "screenshots": [],
      "shipped": true,
      "backlog": false,
      "featured": false
    },
    {
      "id": "cybersecurity-lab",
      "name": "Analizador de eventos · Python",
      "icon": "shield",
      "categories": [
        "cyber"
      ],
      "categoryLabel": "DEFENSIVE SECURITY",
      "status": "PUBLICADO · PROBADO",
      "statusType": "active",
      "description": "CLI local para validar registros de autenticación, agrupar rechazos por IP y exportar señales de revisión.",
      "problem": "Encontrar orígenes con rechazos repetidos sin revisar cada evento a mano.",
      "architecture": "Archivo local → validación hora/estado/IPv4 → umbral configurable → informe JSON",
      "architectureLabel": "Arquitectura de referencia",
      "stack": [
        "Python",
        "JSON",
        "unittest"
      ],
      "stackLabel": "Tecnologías previstas",
      "features": [
        "Muestra: 5 eventos, 4 rechazos, 1 origen por revisar.",
        "Umbral configurable y descarte explicado por línea.",
        "Informe JSON sin sobrescribir archivos.",
        "Pruebas para horas, IP, límites y entradas malformadas."
      ],
      "scope": "Herramienta terminada de triage local. Cuenta todo el archivo, no aplica ventana temporal y no es un SIEM o Wazuh. Una señal no demuestra un ataque.",
      "version": "1.0.0",
      "progress": null,
      "updated": "2026-10-28",
      "github": "https://github.com/sergioh-devsec/auth-log-analyzer",
      "demo": "#laboratory",
      "docs": null,
      "screenshots": [],
      "shipped": true,
      "backlog": false,
      "featured": false
    },
    {
      "id": "network-lab",
      "name": "Network Lab",
      "icon": "network",
      "categories": [
        "networks",
        "cyber"
      ],
      "categoryLabel": "NETWORKS / ANALYSIS",
      "status": "PLANIFICADO",
      "statusType": "",
      "description": "Visibilidad del tráfico, segmentación y arquitectura para entender mejor una red.",
      "problem": "Identificar flujos, dependencias y superficies de exposición en un entorno controlado.",
      "architecture": "Topología de laboratorio → captura autorizada → análisis → propuesta de segmentación",
      "architectureLabel": "Arquitectura de referencia",
      "stack": [
        "Wireshark",
        "Nmap",
        "Networking"
      ],
      "stackLabel": "Tecnologías previstas",
      "features": [
        "Análisis de tráfico y protocolos.",
        "Monitoreo y documentación de topologías.",
        "Segmentación y revisión de seguridad de red."
      ],
      "scope": "Línea de proyecto; topologías, capturas y resultados pendientes de publicación.",
      "version": null,
      "progress": null,
      "updated": null,
      "github": null,
      "demo": null,
      "docs": null,
      "screenshots": [],
      "shipped": false,
      "backlog": true,
      "featured": false
    },
    {
      "id": "automation-lab",
      "name": "Organizador de tareas",
      "icon": "automation",
      "categories": [
        "automation",
        "web"
      ],
      "categoryLabel": "LOCAL WORKFLOW / CSV",
      "status": "PROTOTIPO FUNCIONAL",
      "statusType": "active",
      "description": "Convierte una lista CSV en un plan descargable: valida registros, elimina duplicados exactos y ordena pendientes.",
      "problem": "Reducir la limpieza repetitiva de listas mostrando de forma clara qué registros se descartan.",
      "architecture": "CSV → validación → deduplicación exacta → tareas pendientes → orden por prioridad y fecha → descarga CSV",
      "architectureLabel": "Arquitectura implementada",
      "stack": [
        "JavaScript",
        "CSV",
        "Local processing"
      ],
      "stackLabel": "Stack implementado",
      "features": [
        "Procesa la lista localmente, sin subidas.",
        "Admite campos CSV entrecomillados y valida fechas reales.",
        "Informa duplicados, tareas completadas y registros inválidos.",
        "Exporta CSV neutralizando prefijos de fórmulas de hoja de cálculo."
      ],
      "scope": "Herramienta funcional en el navegador, implementada en showcase.js. La muestra contiene tareas ficticias. No sincroniza servicios externos ni modifica archivos de origen.",
      "version": "1.0.0",
      "progress": null,
      "updated": "2026-10-28",
      "github": null,
      "demo": "#automation",
      "docs": null,
      "screenshots": [],
      "subtitle": "CSV Task Organizer",
      "shipped": false,
      "backlog": false,
      "featured": false
    },
    {
      "id": "ai-pentesting",
      "name": "Local AI Security",
      "icon": "shield",
      "categories": [
        "ai",
        "cyber",
        "python"
      ],
      "categoryLabel": "AUTHORIZED SECURITY TESTING",
      "status": "RESEARCH",
      "statusType": "research",
      "description": "Investigación sobre IA local aplicada al análisis de resultados de seguridad y a la generación de reportes.",
      "problem": "Ayudar a organizar y explicar hallazgos de pruebas autorizadas manteniendo la información en un laboratorio local.",
      "architecture": "Alcance autorizado → resultados de herramientas → análisis local → revisión humana → reporte",
      "architectureLabel": "Arquitectura conceptual",
      "stack": [
        "LLM local",
        "Python",
        "Reporting"
      ],
      "stackLabel": "Tecnologías en investigación",
      "features": [
        "Reconocimiento y enumeración dentro del alcance autorizado.",
        "Clasificación de resultados y análisis de vulnerabilidades.",
        "Agentes locales para apoyar la elaboración de reportes."
      ],
      "scope": "AUTHORIZED SECURITY TESTING · LAB ENVIRONMENT · DEFENSIVE SECURITY. Proyecto futuro de investigación, únicamente para sistemas propios o con autorización expresa. Sin motor de pruebas implementado en este sitio.",
      "version": null,
      "progress": null,
      "updated": null,
      "github": null,
      "demo": null,
      "docs": null,
      "screenshots": [],
      "shipped": false,
      "backlog": true,
      "featured": false
    },
    {
      "id": "log-analyzer",
      "name": "Auth Log Analyzer",
      "icon": "terminal",
      "categories": [
        "cyber"
      ],
      "categoryLabel": "BROWSER / DETECTION",
      "status": "PROTOTYPE",
      "statusType": "active",
      "description": "Prueba una regla defensiva: agrupa rechazos por IP y detecta patrones en una muestra editable.",
      "problem": "Mostrar de forma transparente cómo un conjunto de eventos se convierte en una señal de atención.",
      "architecture": "Texto local → validación de hora / estado / IPv4 → agrupación por IP → umbral ≥ 3 → hallazgos",
      "architectureLabel": "Arquitectura implementada",
      "stack": [
        "JavaScript",
        "DOM API",
        "Local processing"
      ],
      "stackLabel": "Stack implementado",
      "features": [
        "Entrada editable con datos sintéticos.",
        "Validación de IPv4, hora y estados ACCEPT / DENY.",
        "Resumen de eventos, descartes y fuentes que superan el umbral.",
        "Sin transferencias de datos ni dependencias externas."
      ],
      "scope": "Prototipo educativo implementado en main.js. Cuenta eventos de toda la muestra, no utiliza una ventana temporal y no sustituye un SIEM. La misma IP no demuestra por sí sola un ataque.",
      "version": "1.0.0",
      "progress": null,
      "updated": "2026-10-27",
      "github": null,
      "demo": "#laboratory",
      "docs": null,
      "screenshots": [],
      "shipped": false,
      "backlog": false,
      "featured": false
    },
    {
      "id": "cyberserch",
      "name": "CYBERSERCH Portfolio",
      "icon": "globe",
      "categories": [
        "web"
      ],
      "categoryLabel": "WEB / PERSONAL BRAND",
      "status": "ACTIVE",
      "statusType": "active",
      "description": "Este portafolio: una experiencia estática, accesible y sin frameworks, diseñada para GitHub Pages.",
      "problem": "Reunir perfil técnico, proyectos y servicios en una experiencia mantenible con carga ligera.",
      "architecture": "HTML semántico → CSS adaptable → datos estáticos → JavaScript progresivo → GitHub Pages",
      "architectureLabel": "Arquitectura implementada",
      "stack": [
        "HTML",
        "CSS",
        "JavaScript"
      ],
      "stackLabel": "Stack implementado",
      "features": [
        "Filtros y fichas de proyectos.",
        "Gráficos vectoriales locales y partículas limitadas.",
        "Navegación por teclado y control de movimiento.",
        "Contacto reservado y acceso a la información del CV."
      ],
      "scope": "Portafolio publicado en GitHub Pages. Las opciones de pago se activan solo cuando sus proveedores están configurados.",
      "version": "1.0.0",
      "progress": null,
      "updated": "2026-10-27",
      "github": null,
      "demo": "#home",
      "docs": null,
      "screenshots": [],
      "shipped": true,
      "backlog": false,
      "featured": false
    }
  ],
  "credentials": [
    {
      "name": "SC-100: Microsoft Cybersecurity Architect",
      "issuer": "Microsoft",
      "date": null,
      "displayDate": "EXAMEN APROBADO",
      "type": "Examen oficial aprobado",
      "source": "owner",
      "url": null
    },
    {
      "name": "CyberOps Associate",
      "issuer": "Cisco",
      "date": "2025-01",
      "displayDate": "ENE 2025",
      "type": "Formación publicada en LinkedIn",
      "url": null
    },
    {
      "name": "Introduction to Cybersecurity",
      "issuer": "Cisco",
      "date": "2025-01",
      "displayDate": "ENE 2025",
      "type": "Curso publicado en LinkedIn",
      "url": null
    },
    {
      "name": "CCNA: Enterprise Networking, Security, and Automation",
      "issuer": "Cisco",
      "date": "2024-10",
      "displayDate": "OCT 2024",
      "type": "Formación publicada en LinkedIn",
      "url": null
    },
    {
      "name": "Data Analysis Using Python",
      "issuer": "IBM",
      "date": "2024-04",
      "displayDate": "ABR 2024",
      "type": "Curso publicado en LinkedIn",
      "url": null
    },
    {
      "name": "Data Visualization Using Python",
      "issuer": "IBM",
      "date": "2024-04",
      "displayDate": "ABR 2024",
      "type": "Curso publicado en LinkedIn",
      "url": null
    },
    {
      "name": "Python for Data Science",
      "issuer": "IBM",
      "date": "2024-04",
      "displayDate": "ABR 2024",
      "type": "Curso publicado en LinkedIn",
      "url": null
    },
    {
      "name": "CCNA: Introduction to Networks",
      "issuer": "Cisco",
      "date": "2023-12",
      "displayDate": "DIC 2023",
      "type": "Formación publicada en LinkedIn",
      "url": null
    },
    {
      "name": "Google Cybersecurity Certificate",
      "issuer": "Google",
      "date": "2023-09",
      "displayDate": "SEP 2023",
      "type": "Credencial publicada en LinkedIn",
      "url": null
    }
  ],
  "services": [
    {
      "name": "Tu página web",
      "icon": "globe",
      "description": "Una web para presentar tu negocio y explicar lo que ofreces, pensada también para quien entra desde el celular.",
      "use": "Páginas de presentación · portafolios · rediseño"
    },
    {
      "name": "Menos tareas repetidas",
      "icon": "automation",
      "description": "Conecta tus herramientas para no capturar la misma información varias veces. Primero revisamos qué vale la pena automatizar.",
      "use": "Archivos · avisos · reportes · tareas programadas"
    },
    {
      "name": "IA en tu propio equipo",
      "icon": "core",
      "description": "Revisamos si tu equipo puede ejecutar un modelo de IA y cómo usarlo en una tarea concreta. La viabilidad se evalúa antes.",
      "use": "Modelos locales · asistentes · imagen y voz"
    },
    {
      "name": "Revisar tu seguridad",
      "icon": "shield",
      "description": "Buscamos qué necesita atención y te explico cómo reducir riesgos. Cualquier revisión requiere tu autorización y un alcance definido.",
      "use": "Configuración · recomendaciones · revisión autorizada"
    },
    {
      "name": "Elegir con más claridad",
      "icon": "terminal",
      "description": "Una revisión o conversación para comparar herramientas y decidir qué conviene hacer primero.",
      "use": "Un objetivo · opciones · siguientes pasos"
    },
    {
      "name": "Entender tu red",
      "icon": "network",
      "description": "Documentamos cómo se conectan tus equipos y qué puntos conviene revisar.",
      "use": "Conexiones · tráfico · separación de redes"
    },
    {
      "name": "Crear contenido con IA",
      "icon": "video",
      "description": "Diseñamos un proceso para trabajar imágenes, video o voz según lo que necesitas y los recursos disponibles.",
      "use": "Guiones · edición · flujos de trabajo"
    }
  ],
  "axiomAudio": {
    "es": {
      "thanks": "gracias_es.mp3",
      "welcome": "10_saludo_serch.mp3",
      "businessAnswer": "02_negocio.mp3",
      "creatorAnswer": "03_contenido.mp3",
      "labAnswer": "04_proyectos.mp3",
      "trialJoke1": "05_humor.mp3",
      "trialJoke2": "06_humor.mp3",
      "trialJoke3": "07_humor.mp3",
      "trialInvite": "26_apoyo_serch.mp3",
      "bye": "27_despedida.mp3",
      "supportAnswer": "26_apoyo_serch.mp3",
      "who": "11_quien_serch.mp3",
      "webTerm": "12_web.mp3",
      "automationTerm": "13_automatizacion.mp3",
      "aiTerm": "14_ia_local.mp3",
      "securityTerm": "15_seguridad.mp3",
      "cvAnswer": "16_perfil.mp3",
      "contactAnswer": "17_revision.mp3",
      "trialJoke4": "18_caja.mp3",
      "trialJoke5": "19_web_sencilla.mp3",
      "trialJoke6": "20_modem.mp3",
      "trialJoke7": "21_contrasena.mp3",
      "trialJoke8": "22_rapido.mp3",
      "trialJoke9": "23_cinco_minutos.mp3",
      "trialJoke10": "24_nube.mp3",
      "trialJoke11": "25_celda.mp3",
      "trialJoke12": "28_explotacion.mp3",
      "trialJoke13": "29_sueldo_virtual.mp3",
      "trialJoke14": "30_vacaciones.mp3",
      "welcome2": "31_bienvenida.mp3",
      "welcome3": "32_bienvenida.mp3",
      "businessAnswer2": "33_negocio.mp3",
      "creatorAnswer2": "34_contenido.mp3",
      "labAnswer2": "35_proyectos.mp3",
      "webTerm2": "36_web.mp3",
      "automationTerm2": "37_automatizacion.mp3",
      "aiTerm2": "38_ia.mp3",
      "securityTerm2": "39_seguridad.mp3",
      "consultingTerm": "40_consultoria.mp3",
      "networkTerm": "41_redes.mp3",
      "contentTerm": "42_produccion.mp3",
      "cvAnswer2": "43_perfil.mp3",
      "contactAnswer2": "44_revision.mp3",
      "who2": "45_identidad.mp3",
      "thanks2": "46_gracias.mp3",
      "bye2": "47_despedida.mp3",
      "fallback": "48_alternativas.mp3",
      "fallback2": "49_alternativas.mp3",
      "searchFound": "50_busqueda.mp3",
      "osintTerm": "51_osint.mp3",
      "siemTerm": "52_siem.mp3",
      "hardeningTerm": "53_hardening.mp3",
      "conversionTerm": "54_conversion.mp3",
      "glossaryIntro": "55_glosario.mp3",
      "supportAnswer2": "56_apoyo.mp3",
      "supportAnswer3": "57_apoyo.mp3",
      "businessWrap": "58_cierre_negocio.mp3",
      "creatorWrap": "59_cierre_creador.mp3",
      "labWrap": "60_cierre_lab.mp3",
      "adultWelcome": "61_creadoras.mp3",
      "adultWelcome2": "62_creadoras.mp3",
      "trialJoke15": "63_horario.mp3",
      "trialJoke16": "64_vacaciones.mp3",
      "glossPhishing": "65_phishing.mp3",
      "glossMfa": "66_dos_factores.mp3",
      "glossApi": "67_api.mp3",
      "glossHosting": "68_alojamiento.mp3",
      "glossSeo": "69_seo.mp3",
      "glossBackup": "70_respaldo.mp3",
      "glossHttps": "71_https.mp3",
      "glossMalware": "72_malware.mp3",
      "glossLlm": "73_modelo.mp3",
      "glossAutomation": "74_automatizar.mp3",
      "trialJoke17": "75_familia.mp3",
      "trialJoke18": "76_descanso.mp3",
      "trialJoke19": "77_presupuesto.mp3",
      "trialJoke20": "78_cafe.mp3",
      "trialJoke21": "79_ideas.mp3",
      "trialJoke22": "80_patron.mp3",
      "idleReturn": "81_regreso.mp3",
      "idleReturnNote": "82_cafe_tactico.mp3",
      "axiomStoryVoice": "83_concepto.mp3",
      "scrollBrake": "84_frenos.mp3",
      "scrollRadar": "85_radar.mp3"
    },
    "en": {
      "welcome": "saludo_en.mp3",
      "thanks": "gracias_en.mp3",
      "bye": "adios_en.mp3"
    }
  },
  "axiomJokes": [
    "trialJoke1",
    "trialJoke2",
    "trialJoke3",
    "trialJoke4",
    "trialJoke5",
    "trialJoke6",
    "trialJoke7",
    "trialJoke8",
    "trialJoke9",
    "trialJoke10",
    "trialJoke11",
    "trialJoke12",
    "trialJoke13",
    "trialJoke14",
    "trialJoke15",
    "trialJoke16",
    "trialJoke17",
    "trialJoke18",
    "trialJoke19",
    "trialJoke20",
    "trialJoke21",
    "trialJoke22"
  ],
  "axiomVariants": {
    "businessAnswer": [
      "businessAnswer",
      "businessAnswer2"
    ],
    "creatorAnswer": [
      "creatorAnswer",
      "creatorAnswer2"
    ],
    "labAnswer": [
      "labAnswer",
      "labAnswer2"
    ],
    "webTerm": [
      "webTerm",
      "webTerm2"
    ],
    "automationTerm": [
      "automationTerm",
      "automationTerm2"
    ],
    "aiTerm": [
      "aiTerm",
      "aiTerm2"
    ],
    "securityTerm": [
      "securityTerm",
      "securityTerm2"
    ],
    "cvAnswer": [
      "cvAnswer",
      "cvAnswer2"
    ],
    "contactAnswer": [
      "contactAnswer",
      "contactAnswer2"
    ],
    "who": [
      "who",
      "who2"
    ],
    "thanks": [
      "thanks",
      "thanks2"
    ],
    "bye": [
      "bye",
      "bye2"
    ],
    "fallback": [
      "fallback",
      "fallback2"
    ],
    "adultWelcome": [
      "adultWelcome",
      "adultWelcome2"
    ],
    "welcome": [
      "welcome",
      "welcome2",
      "welcome3"
    ],
    "supportAnswer": [
      "supportAnswer",
      "supportAnswer2",
      "supportAnswer3"
    ]
  }
};
