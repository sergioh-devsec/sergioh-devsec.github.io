// Hotspot geometry shares the 1920 × 1080 viewBox of both room illustrations.
// The room's dialog is the first step; href is the destination of its CTA.
export const STATIONS = Object.freeze([
  { id: 'axiom', x: 980, y: 740, polygon: '865,575 1095,575 1110,905 850,905', number: '01', icon: 'bot', href: 'axiom-3d/index.html', kind: 'guide' },
  { id: 'workstation', x: 680, y: 665, polygon: '500,510 720,480 845,610 845,765 670,835 495,755', number: '02', icon: 'monitor', href: 'cotizador.html', kind: 'catalog' },
  { id: 'security', x: 310, y: 580, polygon: '240,440 355,405 405,435 405,650 300,700 240,670', number: '03', icon: 'shield', href: 'herramientas.html#logs', kind: 'tool' },
  { id: 'comms', x: 1385, y: 615, polygon: '1250,500 1450,545 1525,620 1480,745 1280,680', number: '04', icon: 'message', href: 'portafolio.html#contact', kind: 'catalog' },
  { id: 'printer', x: 420, y: 785, polygon: '325,705 440,665 515,715 515,815 420,865 325,815', number: '05', icon: 'printer', href: '#document-tool', kind: 'printer' },
  { id: 'board', x: 1265, y: 320, polygon: '1090,172 1450,318 1450,510 1090,364', number: '06', icon: 'clipboard', href: 'herramientas.html#csv', kind: 'tool' },
  { id: 'clock', x: 795, y: 235, polygon: '747,181 840,145 846,280 750,319', number: '07', icon: 'clock', href: 'portafolio.html#contact', kind: 'catalog' },
  { id: 'register', x: 1330, y: 855, polygon: '1210,785 1355,735 1460,790 1460,880 1315,945 1210,890', number: '08', icon: 'chart', href: 'cotizador.html', kind: 'catalog' },
  { id: 'vault', x: 1630, y: 625, polygon: '1545,510 1660,465 1730,505 1730,710 1620,755 1545,715', number: '09', icon: 'lock', href: 'informacion.html#seguridad', kind: 'information' },
  { id: 'library', x: 565, y: 390, polygon: '435,272 675,173 675,480 435,579', number: '10', icon: 'book', href: 'https://github.com/sergioh-devsec', kind: 'repository' },
  { id: 'showcase', x: 1100, y: 510, polygon: '1040,405 1115,375 1190,405 1190,575 1115,615 1040,575', number: '11', icon: 'sparkles', href: 'portafolio.html#services', kind: 'catalog' },
  { id: 'coffee', x: 1595, y: 805, polygon: '1510,735 1615,690 1715,735 1715,835 1620,885 1510,840', number: '12', icon: 'coffee', href: 'portafolio.html#apoyar', kind: 'support' },
].map(station => Object.freeze(station)));
