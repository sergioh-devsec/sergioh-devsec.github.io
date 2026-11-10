(function (root, createModel) {
  'use strict';

  const model = createModel();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MareaProState = model;
})(globalThis, function () {
  'use strict';

  const services = Object.freeze([
    { id: 'gel', name: 'Gel semipermanente', description: 'Color uniforme y brillo duradero', minutes: 60, price: 380 },
    { id: 'manicure', name: 'Manicura de estudio', description: 'Forma, cutícula y pulido', minutes: 45, price: 320 },
    { id: 'art', name: 'Nail art de autor', description: 'Diseño a mano sobre gel', minutes: 75, price: 540 },
    { id: 'extensions', name: 'Extensiones soft gel', description: 'Largo y forma a medida', minutes: 90, price: 680 },
  ]);
  const addons = Object.freeze([
    { id: 'french', name: 'Puntas French', description: 'Acabado clásico o en color', minutes: 15, price: 90 },
    { id: 'removal', name: 'Retiro de gel', description: 'Retiro previo a la aplicación', minutes: 20, price: 100 },
    { id: 'detail', name: 'Detalle a mano', description: 'Acento en dos uñas', minutes: 15, price: 85 },
  ]);
  const staff = Object.freeze([
    { id: 'iris', name: 'Iris', initials: 'I', role: 'Manicura y gel', serviceIds: ['gel', 'manicure'], shifts: [[600, 810], [900, 1110]] },
    { id: 'alma', name: 'Alma', initials: 'A', role: 'Gel, nail art y extensiones', serviceIds: ['gel', 'art', 'extensions'], shifts: [[630, 840], [930, 1140]] },
    { id: 'violeta', name: 'Violeta', initials: 'V', role: 'Manicura, nail art y extensiones', serviceIds: ['manicure', 'art', 'extensions'], shifts: [[600, 810], [900, 1080]] },
  ]);
  const aliases = Object.freeze(['Renata de prueba', 'Mía de prueba', 'Valeria de prueba', 'Elena de prueba', 'Inés de prueba']);
  const statusLabels = Object.freeze({
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    canceled: 'Cancelada',
    noShow: 'No asistió',
  });
  const transitions = Object.freeze({
    pending: ['confirmed', 'canceled'],
    confirmed: ['completed', 'canceled', 'noShow'],
  });
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const addonById = new Map(addons.map((addon) => [addon.id, addon]));
  const staffById = new Map(staff.map((member) => [member.id, member]));
  const storageKey = 'cyberserch-marea-pro-v1';
  const appointmentLimit = 200;
  const slotInterval = 30;
  const pad = (number) => String(number).padStart(2, '0');

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime()) && dateKey(date) === value;
  }

  function bookingDates(now = new Date(), count = 7) {
    const day = new Date(now);
    day.setHours(12, 0, 0, 0);
    if (!Number.isFinite(day.getTime()) || !Number.isInteger(count) || count < 1 || count > 31) return [];
    const days = [];
    while (days.length < count) {
      day.setDate(day.getDate() + 1);
      if (day.getDay() !== 0 && day.getDay() !== 1) days.push(dateKey(day));
    }
    return days;
  }

  function timeToMinutes(time) {
    if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  function minutesToTime(minutes) {
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }

  function validExtras(addonIds) {
    return Array.isArray(addonIds) && addonIds.length <= addons.length
      && new Set(addonIds).size === addonIds.length && addonIds.every((id) => addonById.has(id));
  }

  function getTotals(serviceId, addonIds = []) {
    const service = serviceById.get(serviceId);
    if (!service || !validExtras(addonIds)) return null;
    const total = { minutes: service.minutes, price: service.price };
    for (const id of addonIds) {
      const addon = addonById.get(id);
      total.minutes += addon.minutes;
      total.price += addon.price;
    }
    return total;
  }

  function eligibleStaff(serviceId) {
    return staff.filter((member) => member.serviceIds.includes(serviceId));
  }

  function fitsShift(member, start, end) {
    return member.shifts.some(([open, close]) => start >= open && end <= close
      && (start - open) % slotInterval === 0);
  }

  function collides(appointments, { date, staffId }, start, end) {
    return appointments.some((appointment) => {
      if (appointment.date !== date || appointment.staffId !== staffId || appointment.status === 'canceled') return false;
      const occupiedStart = timeToMinutes(appointment.time);
      const occupiedEnd = occupiedStart + appointment.minutes;
      return start < occupiedEnd && end > occupiedStart;
    });
  }

  function getSlots({ date, serviceId, addonIds = [], staffId = 'any' }, appointments = [], now = new Date()) {
    const total = getTotals(serviceId, addonIds);
    if (!total || !bookingDates(now).includes(date)) return [];
    const specialists = eligibleStaff(serviceId).filter((member) => staffId === 'any' || staffId === member.id);
    const slots = new Map();
    for (const member of specialists) {
      for (const [open, close] of member.shifts) {
        for (let start = open; start + total.minutes <= close; start += slotInterval) {
          if (!slots.has(start) && !collides(appointments, { date, staffId: member.id }, start, start + total.minutes)) {
            slots.set(start, member.id);
          }
        }
      }
    }
    return [...slots].sort(([first], [second]) => first - second)
      .map(([start, assigned]) => ({ time: minutesToTime(start), staffId: assigned }));
  }

  function seedAppointments(now = new Date()) {
    const [firstDay, secondDay, thirdDay] = bookingDates(now);
    if (!firstDay) return [];
    const fixtures = [
      { id: 'MP-101', date: firstDay, time: '10:00', serviceId: 'gel', addonIds: [], staffId: 'iris', client: 'Renata de prueba', status: 'confirmed' },
      { id: 'MP-102', date: firstDay, time: '15:30', serviceId: 'art', addonIds: ['detail'], staffId: 'alma', client: 'Mía de prueba', status: 'pending' },
      { id: 'MP-103', date: secondDay, time: '11:00', serviceId: 'manicure', addonIds: [], staffId: 'violeta', client: 'Elena de prueba', status: 'completed' },
      { id: 'MP-104', date: thirdDay, time: '10:30', serviceId: 'extensions', addonIds: [], staffId: 'alma', client: 'Inés de prueba', status: 'canceled' },
    ];
    return fixtures.map((item) => ({ ...item, ...getTotals(item.serviceId, item.addonIds) }));
  }

  function decodeAppointments(raw, now = new Date()) {
    const fallback = () => seedAppointments(now);
    if (typeof raw !== 'string' || raw.length > 100_000) return fallback();
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      return fallback();
    }
    if (!Array.isArray(stored) || stored.length > appointmentLimit) return fallback();
    const appointments = [];
    const ids = new Set();
    for (const item of stored) {
      if (!item || typeof item !== 'object') return fallback();
      const { id, date, time, serviceId, addonIds, staffId, client, status } = item;
      const total = getTotals(serviceId, addonIds);
      const member = staffById.get(staffId);
      const start = timeToMinutes(time);
      if (typeof id !== 'string' || !/^MP-[1-9]\d{2,5}$/.test(id) || ids.has(id) || !validDate(date)
          || !validExtras(addonIds) || !total || !member?.serviceIds.includes(serviceId) || !aliases.includes(client)
          || typeof status !== 'string' || !Object.hasOwn(statusLabels, status) || !fitsShift(member, start, start + total.minutes)
          || (status !== 'canceled' && collides(appointments, item, start, start + total.minutes))) return fallback();
      ids.add(id);
      appointments.push({ id, date, time, serviceId, addonIds: [...addonIds], staffId, client, status, ...total });
    }
    return appointments;
  }

  function createBooking(draft, appointments = [], now = new Date()) {
    const { date, time, serviceId, addonIds = [], client } = draft;
    if (!aliases.includes(client) || !validExtras(addonIds)) return { appointment: null, error: 'invalid' };
    if (appointments.length >= appointmentLimit) return { appointment: null, error: 'limit' };
    const slot = getSlots(draft, appointments, now).find((candidate) => candidate.time === time);
    if (!slot) return { appointment: null, error: 'unavailable' };
    const largestId = appointments.reduce((largest, appointment) => Math.max(largest, Number(appointment.id.slice(3))), 100);
    if (largestId >= 999_999) return { appointment: null, error: 'limit' };
    const appointment = {
      id: `MP-${largestId + 1}`, date, time, serviceId, addonIds: [...addonIds],
      staffId: slot.staffId, client, status: 'confirmed', ...getTotals(serviceId, addonIds),
    };
    return { appointment };
  }

  function updateStatus(appointments, id, status) {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment || !transitions[appointment.status]?.includes(status)) return appointments;
    return appointments.map((item) => item.id === id ? { ...item, status } : item);
  }

  function summarize(appointments) {
    const summary = { total: appointments.length, confirmed: 0, pending: 0, completed: 0, canceled: 0, noShow: 0, revenue: 0 };
    for (const { status, price } of appointments) {
      summary[status] += 1;
      if (status === 'confirmed' || status === 'completed') summary.revenue += price;
    }
    return summary;
  }

  return Object.freeze({
    SERVICES: services, ADDONS: addons, STAFF: staff, STATUS: statusLabels, STORAGE_KEY: storageKey,
    dateKey, getTotals, eligibleStaff, bookingDates, getSlots, seedAppointments, decodeAppointments,
    createBooking, updateStatus, summarize,
  });
});
