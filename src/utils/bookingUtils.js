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
  // Day-based services use timeSlots.length as a sentinel meaning "rest of day from start".
  if (d.includes('day')) return timeSlots.length;
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

/**
 * Parse the upper-bound number of calendar days from a duration string.
 * Returns 0 for hour-based durations, N for day-based ones.
 * "1–2 days" → 2, "2 days" → 2, "4–5 hrs" → 0.
 */
export const getDaysConsumed = (duration = '') => {
  const d = duration.toLowerCase();
  if (!d.includes('day')) return 0;
  const range = d.match(/(\d+)\s*[–-]\s*(\d+)\s*day/);
  if (range) return parseInt(range[2], 10);
  const single = d.match(/(\d+)\s*day/);
  if (single) return parseInt(single[1], 10);
  return 1;
};

const _fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Returns ISO date strings for days 2, 3, … of a multi-day booking.
 * Day 1 (the start date) is not included — only the additional blocked dates.
 * e.g. startDate="2026-05-06", daysConsumed=2 → ["2026-05-07"]
 */
export const getMultiDayBlockedDates = (startDate, daysConsumed) => {
  if (daysConsumed <= 1) return [];
  const [y, m, d] = startDate.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const result = [];
  for (let i = 1; i < daysConsumed; i++) {
    const next = new Date(base);
    next.setDate(base.getDate() + i);
    result.push(_fmtDate(next));
  }
  return result;
};

const slotIndex = (time) => timeSlots.indexOf(time);

/**
 * Returns the array of slot strings occupied if a booking starts at `time`.
 * For day-length services (slotsConsumed === timeSlots.length), the booking
 * runs from the chosen start time through the end of the day — any start time
 * is valid, and the range is "rest of day" rather than a fixed count ahead.
 */
const occupiedRange = (time, slotsConsumed) => {
  const i = slotIndex(time);
  if (i === -1) return [];
  if (slotsConsumed >= timeSlots.length) return timeSlots.slice(i);
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
    if (b.date === date) {
      // Same day: check which slots this booking occupies.
      const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
      const range = occupiedRange(b.time, consumed);
      if (range.includes(time)) used += detailersFor(b);
    } else {
      // Multi-day: if this booking's subsequent dates cover `date`,
      // its detailers are committed for every slot that day.
      const days = getDaysConsumed(b.serviceDuration || '');
      if (days > 1 && getMultiDayBlockedDates(b.date, days).includes(date)) {
        used += detailersFor(b);
      }
    }
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
  // For hour-based services: reject if there aren't enough slots left in the day.
  // For day-based services (slotsConsumed === timeSlots.length): any non-empty
  // range is valid — the booking simply runs to end of day from the chosen start.
  if (range.length === 0) return -1;
  if (slotsConsumed < timeSlots.length && range.length < slotsConsumed) return -1;

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
  if (range.length === 0) return false;
  if (slotsConsumed < timeSlots.length && range.length < slotsConsumed) return false;

  // If this date is itself a subsequent day of an existing multi-day booking,
  // it is fully committed and cannot host a new booking start.
  const isSubsequentDay = bookings.some((b) => {
    if (!isActiveBooking(b) || b.id === excludeBookingId) return false;
    const days = getDaysConsumed(b.serviceDuration || '');
    return days > 1 && getMultiDayBlockedDates(b.date, days).includes(date);
  });
  if (isSubsequentDay) return false;

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
  const isDayService = slotsConsumed >= timeSlots.length;
  const pool = settings.detailerPoolSize ?? DEFAULT_SETTINGS.detailerPoolSize;
  const list = bookings;
  const blocked = blockedSlots.filter((b) => b.date === date);

  // Subsequent days of an existing multi-day booking are fully committed —
  // no new bookings can start on those dates.
  const isSubsequentDay = list.some((b) => {
    if (!isActiveBooking(b)) return false;
    const days = getDaysConsumed(b.serviceDuration || '');
    return days > 1 && getMultiDayBlockedDates(b.date, days).includes(date);
  });

  return timeSlots.map((t) => {
    const range = occupiedRange(t, slotsConsumed);
    // Day-based services never overflow: any start time consumes "rest of day".
    // Hour-based services overflow when there aren't enough slots remaining.
    const overflow = isDayService ? range.length === 0 : range.length < slotsConsumed;
    if (overflow || isSubsequentDay) {
      const used = computeDetailersUsedAt(date, t, list);
      return {
        time: t,
        available: false,
        reason: isSubsequentDay ? 'multiday' : 'overflow',
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
