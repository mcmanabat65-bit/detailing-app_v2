/**
 * Booking-grid slots are 30-minute increments. The shop is open 8:00 AM – 5:00 PM
 * with a 12:00 – 1:00 PM lunch break, so the lunch slots are intentionally
 * absent from the array. Slot duration in minutes is `SLOT_MINUTES`.
 */
export const SLOT_MINUTES = 30;

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
];

export const coffeeOptions = [
  'Macchiato',
  'Brewed Coffee',
  'Cappuccino',
  'Americano',
  'Latte',
];
