import { timeSlots, SLOT_MINUTES } from '../data/timeSlots.js';

/**
 * Admin session is the only piece of state still in localStorage — auth
 * stays hardcoded for Phase 1. Bookings, members, blocked slots, and
 * settings are now sourced from Supabase via AppContext.
 */
const STORAGE_KEYS = {
  adminSession: 'obsidian_admin_session',
};

export { STORAGE_KEYS };

export const DEFAULT_SETTINGS = {
  detailerPoolSize: 5,
  defaultDetailersPerBooking: 1,
};

/** A booking is "active" (consumes detailer capacity) unless cancelled / no_show. */
export const isActiveBooking = (b) =>
  b && b.status !== 'cancelled' && b.status !== 'no_show';

/**
 * Map a service "duration" string (e.g. "1.5 hrs", "4–5 hrs", "1–2 days") to
 * the number of 30-minute slots it occupies.
 *   - Range strings use the upper bound (conservative, no double-booking).
 *   - Day strings consume the full slot grid.
 *   - Fractional hours are rounded up to the next slot boundary.
 */
export const getSlotsConsumed = (duration = '') => {
  const d = duration.toLowerCase();
  if (d.includes('day')) return timeSlots.length; // entire day
  const slotsPerHour = 60 / SLOT_MINUTES;
  // Range: "1.5–2 hrs" or "4-5 hrs" — take upper bound
  const range = d.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const upper = parseFloat(range[2]);
    return Math.max(1, Math.ceil(upper * slotsPerHour));
  }
  // Single value: "1.5 hrs", "2 hrs"
  const single = d.match(/(\d+(?:\.\d+)?)/);
  if (single) {
    const hours = parseFloat(single[1]);
    return Math.max(1, Math.ceil(hours * slotsPerHour));
  }
  return 1;
};

const slotIndex = (time) => timeSlots.indexOf(time);

/** Returns the array of slot strings occupied if a booking starts at `time`. */
const occupiedRange = (time, slotsConsumed) => {
  const i = slotIndex(time);
  if (i === -1) return [];
  return timeSlots.slice(i, i + slotsConsumed);
};

const detailersFor = (b) => {
  const n = Number(b.detailersAssigned);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/**
 * Sum the detailers consumed at (date, time) across all active bookings.
 * Pure: callers pass the current `bookings` array (now sourced from Supabase
 * via AppContext, no localStorage fallback).
 */
export const computeDetailersUsedAt = (date, time, bookings = []) => {
  let used = 0;
  for (const b of bookings) {
    if (!isActiveBooking(b)) continue;
    if (b.date !== date) continue;
    const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
    const range = occupiedRange(b.time, consumed);
    if (range.includes(time)) used += detailersFor(b);
  }
  return used;
};

/**
 * Across the slots that a booking starting at `time` would occupy, return
 * the smallest remaining-detailer capacity. That is the binding constraint.
 *
 * `excludeBookingId` is used when re-validating an existing booking (its own
 * detailers should not be counted against itself).
 */
export const getMinRemainingForRange = (
  date,
  time,
  serviceDuration,
  opts = {}
) => {
  const {
    bookings = [],
    settings = DEFAULT_SETTINGS,
    excludeBookingId = null,
  } = opts;
  const pool = settings.detailerPoolSize ?? DEFAULT_SETTINGS.detailerPoolSize;
  const slotsConsumed = getSlotsConsumed(serviceDuration);
  const range = occupiedRange(time, slotsConsumed);
  if (range.length < slotsConsumed) return -1; // overflows the day

  const list = bookings.filter((b) => b.id !== excludeBookingId);

  let minRemaining = pool;
  for (const t of range) {
    const used = computeDetailersUsedAt(date, t, list);
    minRemaining = Math.min(minRemaining, pool - used);
  }
  return minRemaining;
};

/**
 * isSlotAvailable — given a date + start time + service duration, true if
 * a booking can fit without overflowing the day, hitting a block, or
 * exceeding detailer capacity for the service's minimum.
 */
export const isSlotAvailable = (date, time, serviceDuration, opts = {}) => {
  const {
    minDetailers = 1,
    bookings = [],
    blockedSlots = [],
    settings = DEFAULT_SETTINGS,
    excludeBookingId = null,
  } = opts;

  const slotsConsumed = getSlotsConsumed(serviceDuration);
  const range = occupiedRange(time, slotsConsumed);
  if (range.length < slotsConsumed) return false;

  for (const blk of blockedSlots) {
    if (blk.date !== date) continue;
    if (range.includes(blk.time)) return false;
  }

  const remaining = getMinRemainingForRange(date, time, serviceDuration, {
    bookings,
    settings,
    excludeBookingId,
  });
  return remaining >= minDetailers;
};

/**
 * Returns slot-status objects for the UI:
 *   { time, available, reason, remaining, slotsConsumed }
 * `reason` is one of 'blocked' | 'overflow' | 'capacity' | null.
 */
export const getSlotStatuses = (date, serviceDuration, opts = {}) => {
  if (!date) return [];
  const {
    minDetailers = 1,
    bookings = [],
    blockedSlots = [],
    settings = DEFAULT_SETTINGS,
  } = opts;
  const slotsConsumed = getSlotsConsumed(serviceDuration);
  const pool = settings.detailerPoolSize ?? DEFAULT_SETTINGS.detailerPoolSize;
  const list = bookings;
  const blocked = blockedSlots.filter((b) => b.date === date);

  return timeSlots.map((t) => {
    const range = occupiedRange(t, slotsConsumed);
    if (range.length < slotsConsumed) {
      const used = computeDetailersUsedAt(date, t, list);
      return {
        time: t,
        available: false,
        reason: 'overflow',
        remaining: Math.max(0, pool - used),
        slotsConsumed,
      };
    }
    if (range.some((rt) => blocked.some((blk) => blk.time === rt))) {
      const used = computeDetailersUsedAt(date, t, list);
      return {
        time: t,
        available: false,
        reason: 'blocked',
        remaining: Math.max(0, pool - used),
        slotsConsumed,
      };
    }

    let minRemaining = pool;
    for (const rt of range) {
      const used = computeDetailersUsedAt(date, rt, list);
      minRemaining = Math.min(minRemaining, pool - used);
    }
    if (minRemaining < minDetailers) {
      return {
        time: t,
        available: false,
        reason: 'capacity',
        remaining: Math.max(0, minRemaining),
        slotsConsumed,
      };
    }
    return {
      time: t,
      available: true,
      reason: null,
      remaining: minRemaining,
      slotsConsumed,
    };
  });
};

/**
 * getAvailableSlots — slot strings that can host a booking of this duration
 * starting at that slot, on the given date.
 */
export const getAvailableSlots = (date, serviceDuration, opts = {}) => {
  if (!date) return [];
  return getSlotStatuses(date, serviceDuration, opts)
    .filter((s) => s.available)
    .map((s) => s.time);
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
