'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Crown,
  Loader2,
  Users,
  User,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/data/services';
import {
  formatDateLong,
  formatDateShort,
  getDaysConsumed,
  getMultiDayBlockedDates,
  getTimeAvailability,
  isDateSelectable,
  minutesToTimeStr,
  toIsoDate,
} from '@/utils/bookingUtils';
import { useApp } from '@/context/AppContext';
import { sendEmail } from '@/lib/sendEmail';
import { bookingReceivedHtml } from '@/lib/emailTemplates';

// --- Mini calendar (one month) ---
function MiniCalendar({ monthDate, selected, onSelect }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const monthLabel = firstDay.toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-surface/60 rounded-md p-4 border border-white/5">
      <div className="text-cream font-serif text-lg mb-3 text-center">
        {monthLabel}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const iso = toIsoDate(c);
          const disabled = !isDateSelectable(c);
          const isSelected = selected === iso;
          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={`aspect-square text-sm rounded-sm transition-all ${
                isSelected
                  ? 'bg-gold text-obsidian font-semibold'
                  : disabled
                    ? 'text-muted/40 cursor-not-allowed line-through'
                    : 'text-cream hover:bg-gold/15 hover:text-gold'
              }`}
            >
              {c.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDots({ step }) {
  const labels = ['Service', 'Date & Time', 'Your Details'];
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        return (
          <div
            key={label}
            className={`booking-step-indicator ${
              i === labels.length - 1 ? 'is-last' : ''
            } flex-1 max-w-[180px] flex items-center justify-center`}
          >
            <div className="flex flex-col items-center gap-2 relative z-10 bg-obsidian px-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                  active
                    ? 'bg-gold text-obsidian border-gold'
                    : done
                      ? 'bg-gold/20 text-gold border-gold/50'
                      : 'bg-surface text-muted border-white/10'
                }`}
              >
                {done ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-semibold">{idx}</span>
                )}
              </div>
              <div
                className={`text-[10px] uppercase tracking-widest ${
                  active ? 'text-gold' : done ? 'text-cream/60' : 'text-muted'
                }`}
              >
                {label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CarCombobox — searchable dropdown over the shared cars catalog.
// Selecting a catalog entry auto-fills make/model/year. Typing a custom
// value that doesn't match the catalog is still allowed (free-text fallback).
// ---------------------------------------------------------------------------
function CarCombobox({ cars, vehicle, vehicleYear, onChange }) {
  const [query, setQuery] = useState(vehicle || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Keep query in sync if parent clears the value externally
  useEffect(() => { if (!vehicle) setQuery(''); }, [vehicle]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return cars.slice(0, 8);
    const q = query.toLowerCase();
    return cars
      .filter((c) =>
        `${c.make} ${c.model} ${c.year}`.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, cars]);

  const handleSelect = (car) => {
    const label = `${car.make} ${car.model}`;
    setQuery(label);
    setOpen(false);
    onChange({ vehicle: label, vehicleYear: String(car.year) });
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    onChange({ vehicle: val, vehicleYear });
  };

  const handleClear = () => {
    setQuery('');
    setOpen(false);
    onChange({ vehicle: '', vehicleYear: '' });
  };

  return (
    <div ref={ref} className="relative">
      <Car className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        className="w-full bg-[rgba(20,20,22,0.7)] border border-white/[0.08] rounded-[4px] py-[11px] pl-10 pr-8 text-[14px] text-[var(--color-cream)] placeholder-[var(--color-muted)] transition-colors focus:outline-none focus:border-gold/50"
        placeholder="Search or type (e.g. Toyota Fortuner)"
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-cream transition-colors"
          aria-label="Clear"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface border border-white/10 rounded-sm shadow-xl max-h-52 overflow-y-auto">
          {suggestions.map((car) => (
            <li key={car.id}>
              <button
                type="button"
                onMouseDown={() => handleSelect(car)}
                className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-gold/10 hover:text-gold transition-colors flex items-center justify-between gap-3"
              >
                <span>{car.year} {car.make} {car.model}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted shrink-0">{car.size}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BookingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    services,
    getServiceById,
    serviceCategories,
    addBooking,
    showToast,
    hydrated,
    bookings,
    blockedSlots,
    settings,
    cars,
    coffees,
    detailers,
    findApprovedMemberByEmail,
    getCarsForMember,
  } = useApp();

  // Available coffees: only show enabled ones, sorted. Fall back to static list if DB not loaded yet.
  const coffeeOptions = coffees.filter((c) => c.available !== false).map((c) => c.name);

  // Category lookup: slug → { name, color }
  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);

  const preSelectedId = searchParams.get('service');
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(
    preSelectedId ? Number(preSelectedId) : null
  );
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const [details, setDetails] = useState({
    customerName: '',
    email: '',
    phone: '',
    vehicle: '',
    vehicleYear: '',
    notes: '',
    coffeeOrder: '',
  });

  const [selectedDetailerIds, setSelectedDetailerIds] = useState([]);
  // 'extend' = service runs past closing, 'tomorrow' = move booking to next day
  const [overflowMode, setOverflowMode] = useState(null);

  const activeDetailers = useMemo(
    () => detailers.filter((d) => d.isActive !== false),
    [detailers]
  );

  const toggleDetailer = (id) =>
    setSelectedDetailerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const service = useMemo(() => getServiceById(serviceId), [serviceId]);

  // VIP status is derived from email matching an approved member — not a
  // checkbox the customer can self-assign.
  const vipMember = useMemo(
    () => findApprovedMemberByEmail(details.email),
    [details.email, findApprovedMemberByEmail]
  );
  const isVip = Boolean(vipMember);

  // Member's owned cars (only available when an approved VIP is detected).
  const memberOwnedCars = useMemo(
    () => (vipMember ? getCarsForMember(vipMember.id) : []),
    [vipMember, getCarsForMember]
  );

  // Track which car the user picked. `null` = use the manual vehicle field.
  // When VIP is detected and they have cars, default to the first.
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (memberOwnedCars.length > 0) {
      setSelectedCarId((prev) =>
        prev && memberOwnedCars.some((c) => c.id === prev)
          ? prev
          : memberOwnedCars[0].id
      );
    } else {
      setSelectedCarId(null);
    }
  }, [memberOwnedCars]);

  const selectedCar = useMemo(
    () => memberOwnedCars.find((c) => c.id === selectedCarId) || null,
    [memberOwnedCars, selectedCarId]
  );

  // Live availability for the chosen time — recomputes when time, date, or
  // bookings change so the indicator reflects current detailer capacity.
  const timeAvailability = useMemo(
    () =>
      hydrated && date && time && service
        ? getTimeAvailability(date, time, service.duration, {
            minDetailers: service.minDetailers ?? 1,
            bookings,
            blockedSlots,
            settings,
            allowOverflow: overflowMode === 'extend',
          })
        : null,
    [date, time, service, hydrated, bookings, blockedSlots, settings, overflowMode]
  );

  // For multi-day services, compute which additional dates will be occupied
  // so we can show an informational callout in the time slot panel.
  const multiDaySpan = useMemo(() => {
    const days = getDaysConsumed(service?.duration || '');
    if (days <= 1 || !date) return null;
    const extra = getMultiDayBlockedDates(date, days);
    return { days, lastDate: extra[extra.length - 1] };
  }, [service, date]);

  useEffect(() => {
    if (preSelectedId && getServiceById(preSelectedId)) {
      setServiceId(Number(preSelectedId));
    }
  }, [preSelectedId]);

  const nextMonth = useMemo(
    () =>
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    [calendarMonth]
  );

  const canGoPrevMonth = useMemo(() => {
    const today = new Date();
    return calendarMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  }, [calendarMonth]);

  const handlePickTomorrow = () => {
    const [y, m, d] = date.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    setDate(toIsoDate(next));
    setOverflowMode(null);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!serviceId) {
        showToast('Please choose a package first.', 'error');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!date) {
        showToast('Pick a date.', 'error');
        return;
      }
      if (!time) {
        showToast('Pick a time slot.', 'error');
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Resolve vehicle from selected car (VIP) or the manual fields.
    const vehicleStr = selectedCar
      ? `${selectedCar.make} ${selectedCar.model}`
      : details.vehicle;
    const vehicleYearStr = selectedCar
      ? String(selectedCar.year)
      : details.vehicleYear;

    if (
      !details.customerName ||
      !details.email ||
      !details.phone ||
      !vehicleStr ||
      !vehicleYearStr
    ) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    if (isVip && !coffeeOptions.includes(details.coffeeOrder)) {
      showToast("Pick a coffee — it's on us.", 'error');
      return;
    }
    const minDetailers = service.minDetailers ?? 1;
    const requested = Math.max(
      minDetailers,
      settings?.defaultDetailersPerBooking ?? 1
    );
    setSubmitting(true);
    try {
      const booking = await addBooking({
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.duration,
        serviceCategory: service.category,
        date,
        time,
        customerName: details.customerName,
        email: details.email,
        phone: details.phone,
        vehicle: vehicleStr,
        vehicleYear: vehicleYearStr,
        notes: details.notes,
        isVip,
        memberId: vipMember?.id || null,
        coffeeOrder: isVip ? details.coffeeOrder : '',
        detailersAssigned: requested,
        assignedDetailerIds: selectedDetailerIds,
      });
      if (!booking || booking.error) {
        showToast(
          booking?.error || 'Could not confirm booking — please try again.',
          'error'
        );
        setTime('');
        setStep(2);
        return;
      }
      showToast('Booking received — awaiting admin confirmation.', 'success');
      sendEmail(
        details.email,
        `Booking received — ${service.name} on ${date}`,
        bookingReceivedHtml({
          id: booking.id,
          customerName: details.customerName,
          serviceName: service.name,
          servicePrice: service.price,
          date,
          time,
          vehicle: vehicleStr,
          vehicleYear: vehicleYearStr,
          isVip,
          coffeeOrder: isVip ? details.coffeeOrder : '',
        }),
        (err) => showToast(`Confirmation email failed: ${err}`, 'error')
      );
      router.push(`/confirmation/${booking.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-enter pt-28 md:pt-36 pb-20 min-h-screen">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="text-center mb-10">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
            Reservation
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-cream">
            Reserve Your Detail
          </h1>
        </div>

        <StepDots step={step} />

        {/* STEP 1 — SERVICE */}
        {step === 1 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {services.map((s) => {
              const selected = serviceId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  className={`text-left glass-card card-hover rounded-md p-6 animate-fade-in transition-all ${
                    selected
                      ? 'border-gold ring-1 ring-gold shadow-lg shadow-gold/10'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs uppercase tracking-widest px-2 py-0.5 rounded-sm ${catMap[s.category]?.color ?? 'text-gold/80'}`}>
                      {catMap[s.category]?.name ?? s.category}
                    </span>
                    {selected && (
                      <div className="w-6 h-6 rounded-full bg-gold text-obsidian flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-serif text-2xl text-cream mb-1">
                    {s.name}
                  </h3>
                  <div className="flex items-center gap-2 text-muted text-xs mb-4">
                    <Clock className="w-3 h-3" />
                    {s.duration}
                  </div>
                  <div className="text-gold text-2xl font-light">
                    {formatCurrency(s.price)}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 2 — DATE & TIME */}
        {step === 2 && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 lg:items-start">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    canGoPrevMonth &&
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() - 1,
                        1
                      )
                    )
                  }
                  disabled={!canGoPrevMonth}
                  aria-label="Previous month"
                  className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center text-cream/70 hover:text-gold hover:border-gold/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-cream/70 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold" />
                  Select a date
                </div>
                <button
                  onClick={() =>
                    setCalendarMonth(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                        1
                      )
                    )
                  }
                  aria-label="Next month"
                  className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center text-cream/70 hover:text-gold hover:border-gold/50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <MiniCalendar
                  monthDate={calendarMonth}
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setTime('');
                    setOverflowMode(null);
                  }}
                />
                <div className="hidden md:block">
                  <MiniCalendar
                    monthDate={nextMonth}
                    selected={date}
                    onSelect={(d) => {
                      setDate(d);
                      setTime('');
                      setOverflowMode(null);
                    }}
                  />
                </div>
              </div>
            </div>

            <aside className="glass-card rounded-md p-5">
              <div className="text-cream font-serif text-xl mb-1">Start time</div>
              <div className="text-xs text-muted mb-4">
                {date ? formatDateLong(date) : 'Pick a date first'}
              </div>

              {service && service.duration && (
                <div className="text-[11px] text-gold/80 uppercase tracking-widest mb-4 px-2 py-1 bg-gold/10 rounded-sm inline-block">
                  {service.name} &middot; {service.duration}
                </div>
              )}

              {multiDaySpan && (
                <div className="flex items-start gap-2 text-[11px] text-cream/70 bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 mb-4 leading-relaxed">
                  <Clock className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                  <span>
                    Multi-day service — your vehicle will be with us from your chosen start time through{' '}
                    <span className="text-cream">{formatDateShort(multiDaySpan.lastDate)}</span>.
                  </span>
                </div>
              )}

              {!date ? (
                <div className="text-muted text-sm py-6 text-center">
                  Select a date to set a time
                </div>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Clock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="time"
                      value={(() => {
                        if (!time) return '';
                        const m = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
                        if (!m) return '';
                        let h = parseInt(m[1], 10);
                        const min = parseInt(m[2], 10);
                        const p = m[3].toUpperCase();
                        if (p === 'PM' && h !== 12) h += 12;
                        if (p === 'AM' && h === 12) h = 0;
                        return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                      })()}
                      min="08:00"
                      max={overflowMode === 'extend' ? '23:59' : '17:00'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOverflowMode(null);
                        if (!val) { setTime(''); return; }
                        const [hStr, mStr] = val.split(':');
                        const totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
                        setTime(minutesToTimeStr(totalMin));
                      }}
                      className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream text-sm focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
                    />
                  </div>

                  {time && timeAvailability && (
                    <>
                      {timeAvailability.available ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm mb-3 bg-success/10 border border-success/30 text-success">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>
                            <span className="font-medium">{time}</span> is available &mdash;{' '}
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {timeAvailability.remaining} detailer{timeAvailability.remaining === 1 ? '' : 's'} free
                            </span>
                          </span>
                        </div>
                      ) : timeAvailability.reason === 'overflow' && overflowMode === null ? (
                        <div className="rounded-sm border border-gold/30 bg-gold/5 px-4 py-3 mb-3 space-y-3">
                          <p className="text-sm text-cream/80">
                            <span className="font-medium text-cream">{time}</span> doesn't leave enough time to finish the service by closing. How would you like to proceed?
                          </p>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setOverflowMode('extend')}
                              className="w-full text-left px-3 py-2.5 rounded-sm border border-gold/40 bg-gold/10 text-gold text-sm hover:bg-gold/20 transition-colors"
                            >
                              <span className="font-medium">Extend into the evening</span>
                              <span className="block text-xs text-gold/70 mt-0.5">Service will continue past 5:00 PM</span>
                            </button>
                            <button
                              type="button"
                              onClick={handlePickTomorrow}
                              className="w-full text-left px-3 py-2.5 rounded-sm border border-white/10 bg-white/5 text-cream text-sm hover:border-white/20 transition-colors"
                            >
                              <span className="font-medium">Move to tomorrow</span>
                              <span className="block text-xs text-muted mt-0.5">Start the same time on the next day</span>
                            </button>
                          </div>
                        </div>
                      ) : overflowMode === 'extend' && timeAvailability.available ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm mb-3 bg-success/10 border border-success/30 text-success">
                          <Check className="w-4 h-4 shrink-0" />
                          <span>
                            <span className="font-medium">{time}</span> — service will extend past closing &mdash;{' '}
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {timeAvailability.remaining} detailer{timeAvailability.remaining === 1 ? '' : 's'} free
                            </span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm mb-3 bg-danger/10 border border-danger/30 text-danger">
                          <X className="w-4 h-4 shrink-0" />
                          <span>
                            {timeAvailability.reason === 'blocked' && 'This time is blocked by the shop.'}
                            {timeAvailability.reason === 'overflow' && 'Not enough time remaining in the day for this service.'}
                            {timeAvailability.reason === 'multiday' && 'This date is occupied by a multi-day booking.'}
                            {timeAvailability.reason === 'capacity' && `No detailers available — ${timeAvailability.remaining} free, need ${service?.minDetailers ?? 1}.`}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="text-[11px] text-muted leading-relaxed">
                    Operating hours: <span className="text-cream/70">8:00 AM – 5:00 PM</span>.
                    {service?.minDetailers > 1 && (
                      <> {service.name} needs at least <b>{service.minDetailers} detailers</b>.</>
                    )}
                  </div>
                </>
              )}
            </aside>
          </div>
        )}

        {/* STEP 3 — DETAILS */}
        {step === 3 && (
          <form
            onSubmit={handleSubmit}
            className="grid md:grid-cols-[1fr_320px] gap-6"
          >
            <div className="glass-card rounded-md p-6 md:p-8 space-y-5">
              <div className="text-cream font-serif text-2xl">Your details</div>

              <Field label="Full Name *">
                <input
                  type="text"
                  required
                  value={details.customerName}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, customerName: e.target.value }))
                  }
                  className="input"
                  placeholder="Juan dela Cruz"
                />
              </Field>

              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Email *">
                  <input
                    type="email"
                    required
                    value={details.email}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, email: e.target.value }))
                    }
                    className="input"
                    placeholder="you@email.com"
                  />
                </Field>
                <Field label="Phone *">
                  <input
                    type="tel"
                    required
                    value={details.phone}
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, phone: e.target.value }))
                    }
                    className="input"
                    placeholder="0917 123 4567"
                  />
                </Field>
              </div>

              {memberOwnedCars.length > 0 ? (
                <div>
                  <Field label="Pick a car *">
                    <select
                      value={selectedCarId || ''}
                      onChange={(e) => setSelectedCarId(e.target.value || null)}
                      className="input"
                    >
                      {memberOwnedCars.map((c, i) => (
                        <option key={c.id} value={c.id}>
                          {c.year} {c.make} {c.model} ({c.size})
                          {i === 0 ? ' — default' : ''}
                        </option>
                      ))}
                      <option value="">+ Use a different car (manual entry)</option>
                    </select>
                  </Field>
                  {!selectedCarId && (
                    <div className="grid md:grid-cols-[1fr_120px] gap-5 mt-3">
                      <Field label="Vehicle Make & Model *">
                        <CarCombobox
                          cars={cars}
                          vehicle={details.vehicle}
                          vehicleYear={details.vehicleYear}
                          onChange={({ vehicle, vehicleYear }) =>
                            setDetails((d) => ({ ...d, vehicle, vehicleYear }))
                          }
                        />
                      </Field>
                      <Field label="Year *">
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={details.vehicleYear}
                          onChange={(e) =>
                            setDetails((d) => ({ ...d, vehicleYear: e.target.value }))
                          }
                          className="input"
                          placeholder="2022"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-[1fr_120px] gap-5">
                  <Field label="Vehicle Make & Model *">
                    <CarCombobox
                      cars={cars}
                      vehicle={details.vehicle}
                      vehicleYear={details.vehicleYear}
                      onChange={({ vehicle, vehicleYear }) =>
                        setDetails((d) => ({ ...d, vehicle, vehicleYear }))
                      }
                    />
                  </Field>
                  <Field label="Year *">
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={details.vehicleYear}
                      onChange={(e) =>
                        setDetails((d) => ({ ...d, vehicleYear: e.target.value }))
                      }
                      className="input"
                      placeholder="2022"
                    />
                  </Field>
                </div>
              )}

              {activeDetailers.length > 0 && (
                <Field label="Preferred Detailer (optional)">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {activeDetailers.map((d) => {
                      const selected = selectedDetailerIds.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDetailer(d.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                            selected
                              ? 'bg-gold/15 border-gold/60 text-gold'
                              : 'bg-white/[0.04] border-white/10 text-cream/70 hover:border-white/20 hover:text-cream'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {(d.name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('')}
                          </span>
                          {d.nickname ? `"${d.nickname}"` : d.name.split(' ')[0]}
                          {selected && <Check className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted mt-2">
                    We'll do our best to honor your preference. Subject to availability.
                  </p>
                </Field>
              )}

              <Field label="Special Notes">
                <textarea
                  rows={3}
                  value={details.notes}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, notes: e.target.value }))
                  }
                  className="input resize-none"
                  placeholder="Anything we should know about your vehicle?"
                />
              </Field>

              {isVip ? (
                <div className="rounded-md border border-gold/30 bg-gold/10 p-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3 text-gold">
                    <Crown className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-wide">
                      VIP Member detected — perks unlocked
                    </span>
                  </div>
                  <p className="text-xs text-cream/70 mb-4">
                    Welcome back, {vipMember.name.split(' ')[0]}. Your coffee
                    is on us.
                  </p>
                  <Field label="Select your coffee while you wait">
                    <div className="relative">
                      <Coffee className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <select
                        value={details.coffeeOrder}
                        onChange={(e) =>
                          setDetails((d) => ({
                            ...d,
                            coffeeOrder: e.target.value,
                          }))
                        }
                        className="w-full appearance-none bg-[rgba(20,20,22,0.7)] border border-white/[0.08] rounded-[4px] py-[11px] pl-10 pr-4 text-[14px] text-[var(--color-cream)] focus:outline-none focus:border-gold/50 transition-colors"
                      >
                        <option value="">Choose a drink…</option>
                        {coffeeOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>
              ) : (
                <p className="text-[11px] text-muted leading-relaxed">
                  VIP perks are linked to your registered email. Not a member
                  yet?{' '}
                  <a
                    href="/membership"
                    className="text-gold hover:underline"
                  >
                    Apply for VIP membership
                  </a>{' '}
                  — approved members get 10% off and a free coffee on every
                  visit.
                </p>
              )}
            </div>

            <aside className="glass-card rounded-md p-6 md:p-7 h-fit sticky top-24">
              <div className="text-cream font-serif text-xl mb-4">Summary</div>
              <div className="space-y-3 text-sm">
                <Row label="Package" value={service?.name || '—'} />
                <Row label="Duration" value={service?.duration || '—'} />
                <Row label="Date" value={date ? formatDateLong(date) : '—'} />
                <Row label="Time" value={time || '—'} />
                <div className="border-t border-white/10 pt-4 mt-4">
                  <Row
                    label="Total"
                    value={
                      <span className="text-gold text-xl font-light">
                        {service ? formatCurrency(service.price) : '—'}
                      </span>
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 px-5 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming…
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Confirm Booking
                  </>
                )}
              </button>
            </aside>
          </form>
        )}

        {/* Step nav */}
        {step < 3 && (
          <div className="flex items-center justify-between mt-10">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="inline-flex items-center gap-2 px-5 py-3 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-7 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex items-center justify-start mt-6">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-5 py-3 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: var(--color-cream);
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-cream text-right">{value}</span>
    </div>
  );
}

function BookingUnavailable() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-5 py-20">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-7 h-7 text-gold" />
        </div>
        <h1 className="font-serif text-4xl text-cream mb-4">
          Online Booking Unavailable
        </h1>
        <p className="text-muted text-lg leading-relaxed mb-8">
          We're not accepting online bookings at the moment. To schedule an appointment, please visit us at the shop and our team will be happy to assist you.
        </p>
        <div className="glass-card rounded-md p-6 text-left space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <span className="text-cream/80 text-sm">Mon – Sun · 7:00 AM – 5:00 PM</span>
          </div>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </a>
      </div>
    </div>
  );
}

function BookingGate() {
  const { adminSession, hydrated } = useApp();
  if (!hydrated) return null;
  if (!adminSession) return <BookingUnavailable />;
  return (
    <Suspense fallback={null}>
      <BookingFlow />
    </Suspense>
  );
}

export default function BookingPage() {
  return <BookingGate />;
}
