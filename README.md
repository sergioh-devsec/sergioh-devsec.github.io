# Mi laboratorio en la web · CyberSerchMX

Soy Serch. Quise reunir lo que voy construyendo como ingeniero en diseño de software y redes, investigador y entusiasta de la ciberseguridad. Este sitio es una parte de ese proceso: una forma de mostrar proyectos que se pueden revisar, explicar ideas que sigo desarrollando y abrir una conversación sobre problemas reales.

## Por qué lo hice así
Elegí HTML, CSS y JavaScript sin un framework para entender y controlar las piezas de la experiencia. Separé datos, interfaz, cotización, animación y herramientas. Axiom aporta una guía con grabaciones aprobadas; no simula ser un modelo conversacional conectado.

Desde redes y seguridad trabajé en el despliegue HTTPS, restricciones de carga, validación de entradas y reducción de datos expuestos. El código del navegador es público por naturaleza; las credenciales privadas no forman parte de él.

## Lo que puedes probar
- [Portafolio](https://sergioh-devsec.github.io/): casos, experiencia, muestras y Axiom.
- [Herramientas locales](https://sergioh-devsec.github.io/herramientas.html): CSV y registros de acceso. No suben archivos ni cargan analítica.
- [Cotizador](https://sergioh-devsec.github.io/cotizador.html): referencia de alcance, tiempo e inversión; no es una contratación.
- [Información del sitio](https://sergioh-devsec.github.io/informacion.html): privacidad, condiciones, seguridad y accesibilidad.

## Ejecución local
Este repositorio contiene la versión publicable del sitio. Puedes servir su raíz:

    python -m http.server 8765 --bind 127.0.0.1

Abre http://127.0.0.1:8765. No necesitas instalar paquetes de JavaScript. Clarity solo se habilita en dominios de producción permitidos y después de consentimiento. Web3Forms sí envía el formulario cuando se confirma una consulta; no lo uses para pruebas repetidas.

## Cómo lo fui comprobando
Separé funciones puras para probar cálculos, validación, límites, consentimiento y exportación. Revisé recursos, política de contenido, enlaces y vistas de navegador. Las pruebas y herramientas de publicación se conservan en el espacio de desarrollo; este repositorio de despliegue publica exclusivamente archivos necesarios y documentación.

## Alcance honesto
Las marcas de muestra son ficticias. Los proyectos conceptuales se distinguen de las herramientas terminadas. No publico empleadores reservados, datos de clientes ni testimonios inventados. Una aportación voluntaria no compra un servicio.

La seguridad no es una promesa absoluta: mantengo controles concretos y límites visibles. Las cabeceras que GitHub Pages no permite personalizar requieren otra configuración de alojamiento, no simplemente comprar un dominio.

El siguiente paso es trabajar con casos autorizados, documentar resultados reales y mantener las piezas pequeñas y revisables.

— Serch
