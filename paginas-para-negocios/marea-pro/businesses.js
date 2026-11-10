(function (root, createBusinesses) {
  'use strict';

  const businesses = createBusinesses();
  if (typeof module === 'object' && module.exports) module.exports = businesses;
  else root.BookingBusinesses = businesses;
})(globalThis, function () {
  'use strict';

  const marea = {
    id: 'unas',
    label: 'Estudio de uñas',
    brand: 'marea',
    businessName: 'Marea Nail Studio',
    title: 'Marea Pro · App de reservas | CyberSerch',
    description: 'Prueba la experiencia de reservas y el panel de citas de Marea Pro, una app de muestra de CyberSerch para estudios de uñas.',
    bookingTitle: 'Tu próxima manicura',
    intro: 'Elige tu manicura, personalízala y encuentra espacio con tu especialista.',
    studioTitle: 'Agenda del estudio',
    theme: 'marea',
    photo: {
      src: 'assets/marea.webp?v=a368c452b0c1',
      alt: 'Manicura rosa con puntas lila y una flor blanca sobre satén rosa',
      width: 960,
      height: 960,
    },
    storageKey: 'cyberserch-marea-pro-v1',
    folioPrefix: 'MP',
    openDays: [2, 3, 4, 5, 6],
    slotInterval: 30,
    services: [
      { id: 'gel', name: 'Gel semipermanente', description: 'Color uniforme y brillo duradero', minutes: 60, price: 380 },
      { id: 'manicure', name: 'Manicura de estudio', description: 'Forma, cutícula y pulido', minutes: 45, price: 320 },
      { id: 'art', name: 'Nail art de autor', description: 'Diseño a mano sobre gel', minutes: 75, price: 540 },
      { id: 'extensions', name: 'Extensiones soft gel', description: 'Largo y forma a medida', minutes: 90, price: 680 },
    ],
    addons: [
      { id: 'french', name: 'Puntas French', description: 'Acabado clásico o en color', minutes: 15, price: 90 },
      { id: 'removal', name: 'Retiro de gel', description: 'Retiro previo a la aplicación', minutes: 20, price: 100 },
      { id: 'detail', name: 'Detalle a mano', description: 'Acento en dos uñas', minutes: 15, price: 85 },
    ],
    staff: [
      { id: 'iris', name: 'Iris', initials: 'I', role: 'Manicura y gel', serviceIds: ['gel', 'manicure'], shifts: [[600, 810], [900, 1110]] },
      { id: 'alma', name: 'Alma', initials: 'A', role: 'Gel, nail art y extensiones', serviceIds: ['gel', 'art', 'extensions'], shifts: [[630, 840], [930, 1140]] },
      { id: 'violeta', name: 'Violeta', initials: 'V', role: 'Manicura, nail art y extensiones', serviceIds: ['manicure', 'art', 'extensions'], shifts: [[600, 810], [900, 1080]] },
    ],
    aliases: ['Renata de prueba', 'Mía de prueba', 'Valeria de prueba', 'Elena de prueba', 'Inés de prueba'],
    seed: [
      { number: 101, dayIndex: 0, time: '10:00', serviceId: 'gel', addonIds: [], staffId: 'iris', client: 'Renata de prueba', status: 'confirmed' },
      { number: 102, dayIndex: 0, time: '15:30', serviceId: 'art', addonIds: ['detail'], staffId: 'alma', client: 'Mía de prueba', status: 'pending' },
      { number: 103, dayIndex: 1, time: '11:00', serviceId: 'manicure', addonIds: [], staffId: 'violeta', client: 'Elena de prueba', status: 'completed' },
      { number: 104, dayIndex: 2, time: '10:30', serviceId: 'extensions', addonIds: [], staffId: 'alma', client: 'Inés de prueba', status: 'canceled' },
    ],
  };

  const lineaNegra = {
    id: 'tatuajes',
    label: 'Estudio de tatuajes',
    brand: 'Línea Negra',
    businessName: 'Línea Negra Tattoo',
    title: 'Línea Negra · App de reservas | CyberSerch',
    description: 'Prueba la agenda de un estudio de tatuajes con artistas, sesiones personalizadas y un panel de citas.',
    bookingTitle: 'Tu próxima sesión',
    intro: 'Elige el tipo de sesión, encuentra a tu artista y reserva tiempo para tu próximo tatuaje.',
    studioTitle: 'Agenda de Línea Negra',
    theme: 'tinta',
    photo: {
      src: 'assets/linea-negra.webp?v=1538d774eeea',
      alt: 'Tatuaje de línea fina con una rama y un arco sobre el antebrazo',
      width: 960,
      height: 1200,
    },
    artwork: {
      title: 'Línea Negra',
      caption: 'Diseño y tinta sobre piel',
    },
    storageKey: 'cyberserch-linea-negra-v1',
    folioPrefix: 'LN',
    openDays: [0, 2, 3, 4, 5, 6],
    slotInterval: 15,
    services: [
      { id: 'flash', name: 'Flash del estudio', description: 'Elige una pieza del catálogo de diseños', minutes: 60, price: 1100 },
      { id: 'fine-line', name: 'Tatuaje de línea fina', description: 'Trazos delicados para una pieza pequeña', minutes: 90, price: 1600 },
      { id: 'custom', name: 'Sesión personalizada', description: 'Adapta una idea propia con tu artista', minutes: 120, price: 2450 },
      { id: 'retouch', name: 'Retoque', description: 'Revisión y retoque de una pieza del estudio', minutes: 45, price: 650 },
    ],
    addons: [
      { id: 'design-option', name: 'Variante de diseño', description: 'Compara otra versión antes de empezar', minutes: 20, price: 250 },
      { id: 'placement', name: 'Prueba de colocación', description: 'Compara otra ubicación con el esténcil', minutes: 15, price: 180 },
    ],
    staff: [
      { id: 'noa', name: 'Noa', initials: 'N', role: 'Flash y línea fina', serviceIds: ['flash', 'fine-line'], shifts: [[660, 840], [900, 1140]] },
      { id: 'vera', name: 'Vera', initials: 'V', role: 'Línea fina y diseños personalizados', serviceIds: ['fine-line', 'custom', 'retouch'], shifts: [[720, 960], [990, 1200]] },
      { id: 'luz', name: 'Luz', initials: 'L', role: 'Flash, diseños personalizados y retoques', serviceIds: ['flash', 'custom', 'retouch'], shifts: [[690, 900], [960, 1170]] },
    ],
    aliases: ['Luna de prueba', 'Ariel de prueba', 'Teo de prueba', 'Eva de prueba'],
    seed: [
      { number: 101, dayIndex: 0, time: '11:00', serviceId: 'flash', addonIds: [], staffId: 'noa', client: 'Luna de prueba', status: 'confirmed' },
      { number: 102, dayIndex: 0, time: '13:00', serviceId: 'custom', addonIds: ['placement'], staffId: 'vera', client: 'Ariel de prueba', status: 'pending' },
      { number: 103, dayIndex: 1, time: '11:45', serviceId: 'retouch', addonIds: [], staffId: 'luz', client: 'Teo de prueba', status: 'completed' },
      { number: 104, dayIndex: 2, time: '16:00', serviceId: 'fine-line', addonIds: [], staffId: 'noa', client: 'Eva de prueba', status: 'canceled' },
    ],
  };

  return { defaultId: marea.id, profiles: [marea, lineaNegra] };
});
