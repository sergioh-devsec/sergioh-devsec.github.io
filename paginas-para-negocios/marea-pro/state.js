(function (root, defineModel) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = defineModel(require('./businesses.js'));
  } else {
    root.MareaProState = defineModel(root.BookingBusinesses);
  }
})(globalThis, function (businesses) {
  'use strict';

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
  const appointmentLimit = 200;
  const catalogId = /^[a-z0-9][a-z0-9_-]{0,39}$/;
  const pad = (number) => String(number).padStart(2, '0');

  function dateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function weekdayOf(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const date = new Date(`${value}T12:00:00`);
    return dateKey(date) === value ? date.getDay() : NaN;
  }

  function timeToMinutes(time) {
    if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN;
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  function minutesToTime(minutes) {
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }

  function validate(condition, field) {
    if (!condition) throw new TypeError(`Invalid booking configuration: ${field}`);
  }

  function uniqueItems(items, field, clone, minimum = 1) {
    validate(Array.isArray(items) && items.length >= minimum, field);
    const ids = new Set();
    return Object.freeze(items.map((item) => {
      validate(item && typeof item.id === 'string' && catalogId.test(item.id) && !ids.has(item.id), `${field} ID`);
      validate(typeof item.name === 'string' && item.name.trim(), `${field} name`);
      ids.add(item.id);
      return Object.freeze(clone(item));
    }));
  }

  function catalogItem(item, minMinutes) {
    validate(Number.isInteger(item.minutes) && item.minutes >= minMinutes && item.minutes <= 1440, 'duration');
    validate(Number.isSafeInteger(item.price) && item.price >= 0, 'price');
    const { id, name, description = '', minutes, price } = item;
    return { id, name, description, minutes, price };
  }

  function normalizeShifts(shifts) {
    validate(Array.isArray(shifts), 'staff shifts');
    let lastClose = 0;
    return Object.freeze(shifts.map((shift) => {
      validate(Array.isArray(shift) && shift.length === 2 && shift.every(Number.isInteger), 'shift bounds');
      const [open, close] = shift;
      validate(open >= lastClose && open < close && close <= 1440, 'ordered non-overlapping shifts');
      lastClose = close;
      return Object.freeze([open, close]);
    }));
  }

  function createBookingModel(config) {
    validate(config && typeof config === 'object', 'profile');
    const { storageKey, folioPrefix, openDays, slotInterval = 30 } = config;
    validate(typeof storageKey === 'string' && storageKey.trim(), 'storageKey');
    validate(typeof folioPrefix === 'string' && /^[A-Z][A-Z0-9]{0,11}$/.test(folioPrefix), 'folioPrefix');
    validate(Array.isArray(openDays) && openDays.length > 0
      && openDays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6), 'openDays');
    validate(Number.isInteger(slotInterval) && slotInterval >= 1 && slotInterval <= 180, 'slotInterval');
    const operatingDays = new Set(openDays);
    const services = uniqueItems(config.services, 'services', (item) => catalogItem(item, 1));
    const addons = uniqueItems(config.addons ?? [], 'addons', (item) => catalogItem(item, 0), 0);
    const serviceById = new Map(services.map((service) => [service.id, service]));
    const addonById = new Map(addons.map((addon) => [addon.id, addon]));
    const staff = uniqueItems(config.staff, 'staff', (member) => {
      const { id, name, initials = '', role = '', serviceIds, shifts, workDays } = member;
      validate(id !== 'any', 'reserved staff ID');
      validate(Array.isArray(serviceIds) && serviceIds.length
        && serviceIds.every((serviceId) => serviceById.has(serviceId)), 'staff services');
      const normalized = {
        id, name, initials, role, serviceIds: Object.freeze([...new Set(serviceIds)]),
        shifts: normalizeShifts(shifts),
      };
      if (workDays !== undefined) {
        validate(Array.isArray(workDays) && workDays.length > 0
          && workDays.every((day) => operatingDays.has(day)), 'staff workDays');
        normalized.workDays = Object.freeze([...new Set(workDays)]);
      }
      return normalized;
    });
    const staffById = new Map(staff.map((member) => [member.id, member]));
    validate(Array.isArray(config.aliases) && config.aliases.length
      && config.aliases.every((alias) => typeof alias === 'string' && alias.trim()), 'aliases');
    const aliases = Object.freeze([...new Set(config.aliases)]);
    const seed = config.seed ?? [];
    validate(Array.isArray(seed) && seed.length <= appointmentLimit, 'seed');
    const prefix = `${folioPrefix}-`;
    const shiftsFor = (member, day) => (!member.workDays || member.workDays.includes(day) ? member.shifts : []);

    function bookingDates(now = new Date(), count = 7) {
      const day = new Date(now);
      day.setHours(12, 0, 0, 0);
      if (!Number.isInteger(count) || count < 1 || count > 31) return [];
      const days = [];
      while (days.length < count && Number.isFinite(day.setDate(day.getDate() + 1))) {
        if (operatingDays.has(day.getDay())) days.push(dateKey(day));
      }
      return days;
    }

    function getTotals(serviceId, addonIds = []) {
      const service = serviceById.get(serviceId);
      if (!service || !Array.isArray(addonIds) || addonIds.length > addons.length
          || new Set(addonIds).size !== addonIds.length || !addonIds.every((id) => addonById.has(id))) return null;
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

    function fitsShift(member, day, start, end) {
      return shiftsFor(member, day).some(([open, close]) => start >= open && end <= close
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
      const day = weekdayOf(date);
      const specialists = eligibleStaff(serviceId).filter((member) => staffId === 'any' || staffId === member.id);
      const slots = new Map();
      for (const member of specialists) {
        for (const [open, close] of shiftsFor(member, day)) {
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

    function validStatus(status) {
      return typeof status === 'string' && Object.hasOwn(statusLabels, status);
    }

    function readAppointment(item, appointments) {
      if (!item || typeof item !== 'object') return null;
      const { id, date, time, serviceId, addonIds, staffId, client, status } = item;
      const total = getTotals(serviceId, addonIds);
      const member = staffById.get(staffId);
      const day = weekdayOf(date);
      const start = timeToMinutes(time);
      if (typeof id !== 'string' || !id.startsWith(prefix) || !/^[1-9]\d{2,5}$/.test(id.slice(prefix.length))
          || !operatingDays.has(day) || !Array.isArray(addonIds) || !total || !member?.serviceIds.includes(serviceId)
          || !aliases.includes(client) || !validStatus(status) || !fitsShift(member, day, start, start + total.minutes)
          || (status !== 'canceled' && collides(appointments, item, start, start + total.minutes))) return null;
      return { id, date, time, serviceId, addonIds: [...addonIds], staffId, client, status, ...total };
    }

    const seedIds = new Set();
    const fixtures = seed.map((item) => {
      validate(item && Number.isInteger(item.number) && item.number >= 100 && item.number <= 999_999
        && !seedIds.has(item.number), 'seed folio');
      validate(Number.isInteger(item.dayIndex) && item.dayIndex >= 0 && item.dayIndex < 7, 'seed dayIndex');
      const addonIds = item.addonIds ?? [];
      validate(getTotals(item.serviceId, addonIds) && staffById.get(item.staffId)?.serviceIds.includes(item.serviceId)
        && aliases.includes(item.client) && validStatus(item.status) && Number.isFinite(timeToMinutes(item.time)), 'seed appointment');
      seedIds.add(item.number);
      return { ...item, addonIds: [...addonIds] };
    });

    function seedAppointments(now = new Date()) {
      const dates = bookingDates(now);
      const appointments = [];
      for (const { number, dayIndex, ...fixture } of fixtures) {
        const date = dates[dayIndex];
        if (!date) continue;
        const item = { ...fixture, id: `${prefix}${number}`, date };
        let appointment = readAppointment(item, appointments);
        if (!appointment) {
          const [first] = getSlots(item, appointments, now);
          if (first) appointment = readAppointment({ ...item, time: first.time }, appointments);
        }
        if (appointment) appointments.push(appointment);
      }
      return appointments;
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
        const appointment = readAppointment(item, appointments);
        if (!appointment || ids.has(appointment.id)) return fallback();
        ids.add(appointment.id);
        appointments.push(appointment);
      }
      return appointments;
    }

    function createBooking(draft, appointments = [], now = new Date()) {
      const { date, time, serviceId, addonIds = [], client } = draft;
      const total = getTotals(serviceId, addonIds);
      if (!aliases.includes(client) || !total) return { appointment: null, error: 'invalid' };
      if (appointments.length >= appointmentLimit) return { appointment: null, error: 'limit' };
      const slot = getSlots(draft, appointments, now).find((candidate) => candidate.time === time);
      if (!slot) return { appointment: null, error: 'unavailable' };
      const largestId = appointments.reduce(
        (largest, appointment) => Math.max(largest, Number(appointment.id.slice(prefix.length))), 100,
      );
      if (largestId >= 999_999) return { appointment: null, error: 'limit' };
      const appointment = {
        id: `${prefix}${largestId + 1}`, date, time, serviceId, addonIds: [...addonIds],
        staffId: slot.staffId, client, status: 'confirmed', ...total,
      };
      return { appointment };
    }

    return Object.freeze({
      SERVICES: services, ADDONS: addons, STAFF: staff, STATUS: statusLabels,
      ALIASES: aliases, STORAGE_KEY: storageKey, FOLIO_PREFIX: folioPrefix,
      dateKey, getTotals, eligibleStaff, bookingDates, getSlots, seedAppointments, decodeAppointments,
      createBooking, updateStatus, summarize,
    });
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

  const defaultProfile = businesses?.profiles?.find(({ id }) => id === businesses.defaultId);
  return Object.freeze({ ...createBookingModel(defaultProfile), createBookingModel });
});
