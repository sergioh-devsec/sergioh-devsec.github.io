/* Copy for the tools directory. Loaded after the site dictionary. */
(() => {
  'use strict';

  Object.assign(window.TRANSLATIONS.es, {
    toolsF_pageTitle: 'Herramientas gratis | CyberSerch',
    toolsF_pageDescription: 'Crea tu CV, practica una entrevista, organiza una rifa y prueba herramientas locales para CSV y logs SSH.',
    toolsF_intro: 'Crea tu CV, practica una entrevista, organiza una rifa o trabaja con archivos CSV y logs SSH.',
    toolsF_directoryTitle: 'Elige una herramienta',
    toolsF_directoryRaffleTitle: 'Ruleta de rifas',
    toolsF_directoryRaffleDescription: 'Personaliza los sectores con folios o premios y haz un sorteo al azar.',
    toolsF_directoryRaffleAction: 'Abrir la ruleta',
    toolsF_directoryInterviewTitle: 'Práctica de entrevista',
    toolsF_directoryInterviewDescription: 'Ensaya una respuesta en 60 segundos y consulta un ejemplo con el método STAR.',
    toolsF_directoryInterviewAction: 'Practicar una entrevista',
    toolsF_directoryCvTitle: 'Generador de CV',
    toolsF_directoryCvDescription: 'Crea tu currículum, compáralo con una vacante y descarga el texto gratis.',
    toolsF_directoryCvAction: 'Crear mi CV',
  });

  Object.assign(window.TRANSLATIONS.en, {
    toolsF_pageTitle: 'Free tools | CyberSerch',
    toolsF_pageDescription: 'Build your résumé, practice for an interview, run a raffle, and try local tools for CSV files and SSH logs.',
    toolsF_intro: 'Build your résumé, practice for an interview, run a raffle, or work with CSV files and SSH logs.',
    toolsF_directoryTitle: 'Choose a tool',
    toolsF_directoryRaffleTitle: 'Raffle wheel',
    toolsF_directoryRaffleDescription: 'Customize the wheel with ticket numbers or prizes and run a random draw.',
    toolsF_directoryRaffleAction: 'Open the raffle wheel',
    toolsF_directoryInterviewTitle: 'Interview practice',
    toolsF_directoryInterviewDescription: 'Practice a 60-second answer and review a sample that uses the STAR method.',
    toolsF_directoryInterviewAction: 'Practice an interview',
    toolsF_directoryCvTitle: 'Résumé builder',
    toolsF_directoryCvDescription: 'Build your résumé, compare it with a job posting, and download the text for free.',
    toolsF_directoryCvAction: 'Build my résumé',
  });

  const links = Array.from(document.querySelectorAll('[data-tool-english-href]'), link => ({
    link,
    spanishHref: link.getAttribute('href'),
    englishHref: link.dataset.toolEnglishHref,
  }));
  document.addEventListener('portfolio:language', ({ detail }) => {
    for (const { link, spanishHref, englishHref } of links) {
      link.setAttribute('href', detail.language === 'en' ? englishHref : spanishHref);
    }
  });
})();
