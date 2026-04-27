import { timeSlots } from '../data/timeSlots.js';

const STORAGE_KEYS = {
  bookings: 'obsidian_bookings',
  members: 'obsidian_members',
  blockedSlots: 'obsidian_blocked_slots',
  adminSession: 'obsidian_admin_session',
};

export { STORAGE_KEYS };

const readBookings = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.bookings) || '[]');
  } catch {
    return [];
  }
};

const readBlocked = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.blockedSlots) || '[]'
    );
  } catch {
    return [];
  }
};

/**
 * Map a service "duration" string (e.g. "4–5 hrs", "1–2 days") to the number
 * of consecutive 1-hour slots it occupies. The shop runs 1 service at a time
 * so anything > 4 hrs blocks the next consecutive slot.
 */
export const getSlotsConsumed = (duration = '') => {
  const d = duration.toLowerCase();
  if (d.includes('day')) return timeSlots.length; // entire day
  // grab the upper bound number from "X–Y hrs"
  const match = d.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (match) {
    const upper = parseInt(match[2], 10);
    if (upper > 4) return 2;
    return 1;
  }
  const single = d.match(/(\d+)/);
  if (single && parseInt(single[1], 10) > 4) return 2;
  return 1;
};

const slotIndex = (time) => timeSlots.indexOf(time);

/**
 * Returns the array of slot strings occupied if a booking starts at `time`.
 */
const occupiedRange = (time, slotsConsumed) => {
  const i = slotIndex(time);
  if (i === -1) return [];
  return timeSlots.slice(i, i + slotsConsumed);
};

/**
 * isSlotAvailable — given a date + start time + service duration, true if
 * the booking can fit without overlapping existing bookings or blocks.
 */
export const isSlotAvailable = (date, time, serviceDuration, opts = {}) => {
  const { ignoreBookingId = null } = opts;
  const slotsConsumed = getSlotsConsumed(serviceDuration);
  const want = occupiedRange(time, slotsConsumed);
  if (want.length < slotsConsumed) return false; // would overflow the day

  const bookings = readBookings().filter(
    (b) => b.status !== 'cancelled' && b.id !== ignoreBookingId
  );
  const blocked = readBlocked();

  // For each existing booking on this date, compute its occupied range and
  // check overlap.
  for (const b of bookings) {
    if (b.date !== date) continue;
    const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
    const range = occupiedRange(b.time, consumed);
    if (range.some((t) => want.includes(t))) return false;
  }

  for (const blk of blocked) {
    if (blk.date !== date) continue;
    if (want.includes(blk.time)) return false;
  }

  return true;
};

/**
 * getAvailableSlots — slot strings that can host a booking of this duration
 * starting at that slot, on the given date.
 */
export const getAvailableSlots = (date, serviceDuration) => {
  if (!date) return [];
  return timeSlots.filter((t) => isSlotAvailable(date, t, serviceDuration));
};

/**
 * Returns slot status for the UI — useful when rendering all slots,
 * not just the available ones.
 *   { time, available, reason: 'booked' | 'blocked' | 'overflow' | null }
 */
export const getSlotStatuses = (date, serviceDuration) => {
  if (!date) return [];
  const slotsConsumed = getSlotsConsumed(serviceDuration);
  const bookings = readBookings().filter(
    (b) => b.status !== 'cancelled' && b.date === date
  );
  const blocked = readBlocked().filter((b) => b.date === date);

  // Build a set of occupied slot strings on this date (any source).
  const occupied = new Set();
  for (const b of bookings) {
    const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
    occupiedRange(b.time, consumed).forEach((t) => occupied.add(t));
  }
  for (const blk of blocked) occupied.add(blk.time);

  return timeSlots.map((t) => {
    if (occupied.has(t)) {
      const isBlocked = blocked.some((b) => b.time === t);
      return {
        time: t,
        available: false,
        reason: isBlocked ? 'blocked' : 'booked',
      };
    }
    // Check downstream overflow for multi-slot services
    const range = occupiedRange(t, slotsConsumed);
    if (range.length < slotsConsumed) {
      return { time: t, available: false, reason: 'overflow' };
    }
    if (range.some((rt) => occupied.has(rt))) {
      return { time: t, available: false, reason: 'booked' };
    }
    return { time: t, available: true, reason: null };
  });
};

/** Format YYYYMMDD for booking IDs */
const ymd = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

/** generateBookingId → "OBS-YYYYMMDD-XXXX" with a random 4-digit suffix. */
export const generateBookingId = () => {
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return `OBS-${ymd()}-${suffix}`;
};

/** ISO YYYY-MM-DD without timezone shenanigans (uses local date parts). */
export const toIsoDate = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const isPastDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

export const isSunday = (date) => new Date(date).getDay() === 0;

export const isDateSelectable = (date) =>
  !isPastDate(date) && !isSunday(date);

/** Formatters used across the app */
export const formatDateLong = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateShort = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
