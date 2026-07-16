/**
 * Booking-grid slots are 30-minute increments. The shop opens at 8:00 AM with a
 * 12:00 – 1:00 PM lunch break, so the lunch slots are intentionally absent from
 * the array. Slot duration in minutes is `SLOT_MINUTES`.
 *
 * The grid runs to 9:00 PM (`GRID_END_MINUTES`) — later than the shop's normal
 * closing — so staff can *explicitly* extend a long job into the evening.
 * `CLOSING_MINUTES` is the default cutoff (5:00 PM), configurable in Settings
 * up to `GRID_END_MINUTES`: a booking whose end time crosses the configured
 * closing counts as "overflow" and prompts the extend-or-tomorrow choice,
 * unless the caller opts in via `allowOverflow`.
 */
export const SLOT_MINUTES = 30;

/** Default closing time as minutes since midnight (5:00 PM). */
export const CLOSING_MINUTES = 17 * 60;

/** Latest slot the grid supports (9:00 PM) — the ceiling for a configured closing time. */
export const GRID_END_MINUTES = 21 * 60;

export const timeSlots = [
  '8:00 AM',
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
];

export const coffeeOptions = [
  'Macchiato',
  'Brewed Coffee',
  'Cappuccino',
  'Americano',
  'Latte',
];
