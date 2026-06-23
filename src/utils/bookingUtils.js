import { timeSlots, SLOT_MINUTES } from '../data/timeSlots.js';

/** Parse any "H:MM AM/PM" string to total minutes since midnight. */
export const parseTimeToMinutes = (time = '') => {
  const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return -1;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + min;
};

/** Convert total minutes since midnight to "H:MM AM/PM". */
export const minutesToTimeStr = (totalMin) => {
  const h24 = Math.floor(totalMin / 60) % 24;
  const min = totalMin % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
};

/**
 * Map any time string to the nearest grid slot at or before it.
 * e.g. "8:15 AM" → "8:00 AM", "8:45 AM" → "8:30 AM"
 * Returns null if no grid slot is at or before the given time.
 */
export const nearestSlotAtOrBefore = (time) => {
  const mins = parseTimeToMinutes(time);
  if (mins < 0) return null;
  // Walk the grid in reverse and find the last slot <= mins
  let best = null;
  for (const s of timeSlots) {
    const sm = parseTimeToMinutes(s);
    if (sm <= mins) best = s;
    else break;
  }
  return best;
};

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

/**
 * True if a booking's scheduled calendar span includes `isoDate` — i.e. the
 * start date, or any continuation day of a multi-day service. Status-agnostic.
 * Used by the Shop Monitor / Live page so a 2–3 day job keeps showing on every
 * day it runs, not only the day it started.
 */
export const bookingCoversDate = (b, isoDate) => {
  if (!b || !isoDate) return false;
  if (b.date === isoDate) return true;
  const days = getDaysConsumed(b.serviceDuration || '');
  return days > 1 && getMultiDayBlockedDates(b.date, days).includes(isoDate);
};

/**
 * Map a time string (exact or arbitrary) to its grid index.
 * For non-grid times (e.g. "8:15 AM"), finds the nearest slot at or before.
 */
const slotIndex = (time) => {
  const exact = timeSlots.indexOf(time);
  if (exact !== -1) return exact;
  // Arbitrary time: find the slot that starts at or before this time
  const mins = parseTimeToMinutes(time);
  if (mins < 0) return -1;
  let best = -1;
  for (let i = 0; i < timeSlots.length; i++) {
    if (parseTimeToMinutes(timeSlots[i]) <= mins) best = i;
    else break;
  }
  return best;
};

/**
 * Returns the array of slot strings occupied if a booking starts at `time`.
 * For day-length services (slotsConsumed === timeSlots.length), the booking
 * runs from the chosen start time through the end of the day — any start time
 * is valid, and the range is "rest of day" rather than a fixed count ahead.
 * For arbitrary (non-grid) start times, capacity is checked from the enclosing slot.
 */
const occupiedRange = (time, slotsConsumed) => {
  const i = slotIndex(time);
  if (i === -1) return [];
  if (slotsConsumed >= timeSlots.length) return timeSlots.slice(i);
  return timeSlots.slice(i, i + slotsConsumed);
};

const detailersFor = (b) => {
  if (Array.isArray(b.detailersAssigned)) return b.detailersAssigned.length || 1;
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
 * Collect the IDs of detailers already committed to another active booking
 * that overlaps the range a booking of `serviceDuration` starting at
 * (date, time) would occupy. Returns a Set of detailer UUIDs.
 *
 * This is the identity-level companion to computeDetailersUsedAt (which only
 * counts heads): use it to prevent assigning a specific detailer to two
 * overlapping bookings.
 */
export const getBusyDetailerIds = (date, time, serviceDuration, opts = {}) => {
  const { bookings = [], excludeBookingId = null } = opts;
  const busy = new Set();
  if (!date || !time) return busy;
  const range = occupiedRange(time, getSlotsConsumed(serviceDuration || '1 hr'));
  if (range.length === 0) return busy;
  for (const b of bookings) {
    if (!isActiveBooking(b) || b.id === excludeBookingId) continue;
    if (!Array.isArray(b.detailersAssigned) || b.detailersAssigned.length === 0) continue;
    let overlaps = false;
    if (b.date === date) {
      const bRange = occupiedRange(b.time, getSlotsConsumed(b.serviceDuration || '1 hr'));
      overlaps = bRange.some((t) => range.includes(t));
    } else {
      const days = getDaysConsumed(b.serviceDuration || '');
      overlaps = days > 1 && getMultiDayBlockedDates(b.date, days).includes(date);
    }
    if (overlaps) for (const id of b.detailersAssigned) busy.add(id);
  }
  return busy;
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
  // For arbitrary start times the range may be shorter if near end of day — still overflow
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
 * Check availability for an arbitrary start time (not just grid slots).
 * Returns { available, reason, remaining } — same shape as a single slot status.
 * Used by the free-time-input UI to give real-time feedback.
 */
export const getTimeAvailability = (date, time, serviceDuration, opts = {}) => {
  const {
    minDetailers = 1,
    bookings = [],
    blockedSlots = [],
    settings = DEFAULT_SETTINGS,
    allowOverflow = false, // user explicitly chose to extend past closing
  } = opts;

  if (!date || !time) return { available: false, reason: null, remaining: 0 };

  const timeMins = parseTimeToMinutes(time);
  if (timeMins < 0) return { available: false, reason: null, remaining: 0 };

  const pool = settings.detailerPoolSize ?? DEFAULT_SETTINGS.detailerPoolSize;
  const slotsConsumed = getSlotsConsumed(serviceDuration);
  const range = occupiedRange(time, slotsConsumed);

  if (!allowOverflow) {
    if (range.length === 0) return { available: false, reason: 'overflow', remaining: 0 };
    if (slotsConsumed < timeSlots.length && range.length < slotsConsumed) {
      return { available: false, reason: 'overflow', remaining: 0 };
    }
  }
  // When allowOverflow, use whatever slots remain in the day; otherwise full range.
  const effectiveRange = (allowOverflow && range.length === 0)
    ? timeSlots.slice(slotIndex(time))
    : range;

  if (effectiveRange.length === 0) return { available: false, reason: 'overflow', remaining: 0 };

  const isSubsequentDay = bookings.some((b) => {
    if (!isActiveBooking(b)) return false;
    const days = getDaysConsumed(b.serviceDuration || '');
    return days > 1 && getMultiDayBlockedDates(b.date, days).includes(date);
  });
  if (isSubsequentDay) return { available: false, reason: 'multiday', remaining: 0 };

  const blocked = blockedSlots.filter((b) => b.date === date);
  if (effectiveRange.some((rt) => blocked.some((blk) => blk.time === rt))) {
    return { available: false, reason: 'blocked', remaining: 0 };
  }

  let minRemaining = pool;
  for (const rt of effectiveRange) {
    const used = computeDetailersUsedAt(date, rt, bookings);
    minRemaining = Math.min(minRemaining, pool - used);
  }
  if (minRemaining < minDetailers) {
    return { available: false, reason: 'capacity', remaining: Math.max(0, minRemaining) };
  }
  return { available: true, reason: null, remaining: minRemaining };
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
  // If already a YYYY-MM-DD string, return as-is to avoid UTC→local shift
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
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
  !isPastDate(date);

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
