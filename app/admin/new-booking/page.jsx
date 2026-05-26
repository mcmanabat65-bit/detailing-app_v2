'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Crown,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';
import {
  formatDateLong,
  getDaysConsumed,
  getMultiDayBlockedDates,
  getTimeAvailability,
  isDateSelectable,
  minutesToTimeStr,
  toIsoDate,
} from '@/utils/bookingUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/60 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-cream text-right">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MiniCalendar
// ---------------------------------------------------------------------------
function MiniCalendar({ monthDate, selected, onSelect }) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const monthLabel = firstDay.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-surface/60 rounded-md p-4 border border-white/5">
      <div className="text-cream font-serif text-base mb-3 text-center">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
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

// ---------------------------------------------------------------------------
// CarCombobox — searchable catalog dropdown
// ---------------------------------------------------------------------------
function CarCombobox({ cars, vehicle, vehicleYear, onChange }) {
  const [query, setQuery] = useState(vehicle || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(vehicle || ''); }, [vehicle]);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    if (!query.trim()) return cars.slice(0, 8);
    const q = query.toLowerCase();
    return cars.filter((c) => `${c.make} ${c.model} ${c.year}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query, cars]);

  return (
    <div ref={ref} className="relative">
      <Car className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange({ vehicle: e.target.value, vehicleYear }); }}
        onFocus={() => setOpen(true)}
        className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] pl-10 pr-8 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
        placeholder="Search or type (e.g. Toyota Fortuner)"
        autoComplete="off"
      />
      {query && (
        <button type="button" onClick={() => { setQuery(''); setOpen(false); onChange({ vehicle: '', vehicleYear: '' }); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-cream transition-colors" aria-label="Clear">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface border border-white/10 rounded-sm shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((car) => (
            <li key={car.id}>
              <button type="button"
                onMouseDown={() => { const label = `${car.make} ${car.model}`; setQuery(label); setOpen(false); onChange({ vehicle: label, vehicleYear: String(car.year) }); }}
                className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-gold/10 hover:text-gold transition-colors flex items-center justify-between gap-3">
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

// ---------------------------------------------------------------------------
// VIP Member search combobox
// ---------------------------------------------------------------------------
function MemberSearch({ members, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const approved = useMemo(() => members.filter((m) => m.status === 'approved'), [members]);

  const results = useMemo(() => {
    if (!query.trim()) return approved.slice(0, 6);
    const q = query.toLowerCase();
    return approved.filter((m) =>
      m.name.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q) || (m.nickname || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [query, approved]);

  return (
    <div ref={ref} className="relative">
      <Search className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search VIP member by name or email…"
        className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] pl-10 pr-3 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface border border-white/10 rounded-sm shadow-xl max-h-52 overflow-y-auto">
          {results.map((m) => (
            <li key={m.id}>
              <button type="button"
                onMouseDown={() => { onSelect(m); setQuery(''); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gold/10 transition-colors flex items-center gap-3">
                <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-cream truncate">
                    {m.name}
                    {m.nickname && <span className="text-gold/70 ml-1.5">"{m.nickname}"</span>}
                  </div>
                  <div className="text-xs text-muted truncate">{m.email}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && results.length === 0 && query.trim() && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-surface border border-white/10 rounded-sm shadow-xl px-4 py-3 text-sm text-muted">
          No approved VIP members found.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ServiceDropdown — native select with optgroup per category
// ---------------------------------------------------------------------------
function ServiceDropdown({ services, catMap, value, onChange }) {
  const grouped = useMemo(() => {
    const map = {};
    services.forEach((s) => {
      const key = s.category;
      if (!map[key]) map[key] = { cat: catMap[key], items: [] };
      map[key].items.push(s);
    });
    return Object.values(map);
  }, [services, catMap]);

  const selected = services.find((s) => s.id === value) || null;
  const selectedCat = selected ? catMap[selected.category] : null;
  const textColor = selectedCat?.color?.split(' ').find((c) => c.startsWith('text-')) || 'text-muted';

  return (
    <div className="space-y-1.5">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full appearance-none bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] px-3 text-[13px] text-cream focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
      >
        <option value="" disabled>Choose a service…</option>
        {grouped.map(({ cat, items }) => (
          <optgroup key={cat?.slug ?? items[0].category} label={cat?.name ?? items[0].category}>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatCurrency(s.price)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {/* Selected service pill — shows category + duration below the select */}
      {selected && (
        <div className="flex items-center gap-2 text-xs">
          <span className={`uppercase tracking-widest ${textColor}`}>
            {selectedCat?.name ?? selected.category}
          </span>
          <span className="text-white/20">·</span>
          <span className="text-muted">{selected.duration}</span>
          {selected.minDetailers > 1 && (
            <><span className="text-white/20">·</span><span className="text-muted">Min {selected.minDetailers} detailers</span></>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A single car + service item in the booking
// ---------------------------------------------------------------------------
function BookingItem({ item, index, services, catMap, cars, coffees, onUpdate, onRemove, canRemove }) {
  const coffeeOptions = coffees.filter((c) => c.available !== false).map((c) => c.name);

  return (
    <div className="glass-card rounded-md p-5 space-y-4 relative">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gold/20 text-gold text-xs font-semibold flex items-center justify-center shrink-0">
            {index + 1}
          </div>
          <span className="text-cream font-medium text-sm">
            {item.vehicle || 'Vehicle ' + (index + 1)}
            {item.vehicleYear ? ` · ${item.vehicleYear}` : ''}
          </span>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove} aria-label="Remove"
            className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-sm transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-[1fr_120px] gap-4">
        <Field label="Vehicle Make & Model *">
          <CarCombobox
            cars={cars}
            vehicle={item.vehicle}
            vehicleYear={item.vehicleYear}
            onChange={({ vehicle, vehicleYear }) => onUpdate({ vehicle, vehicleYear })}
          />
        </Field>
        <Field label="Year *">
          <input
            type="text"
            inputMode="numeric"
            value={item.vehicleYear}
            onChange={(e) => onUpdate({ vehicleYear: e.target.value })}
            className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] px-3 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
            placeholder="2022"
          />
        </Field>
      </div>

      <Field label="Service Package *">
        <ServiceDropdown
          services={services}
          catMap={catMap}
          value={item.serviceId}
          onChange={(id) => onUpdate({ serviceId: id })}
        />
      </Field>

      {item.isVip && coffeeOptions.length > 0 && (
        <Field label="Coffee Order (VIP perk)">
          <div className="relative">
            <Coffee className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <select
              value={item.coffeeOrder || ''}
              onChange={(e) => onUpdate({ coffeeOrder: e.target.value })}
              className="w-full appearance-none bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] pl-10 pr-4 text-[13px] text-cream focus:outline-none focus:border-gold/50 transition-colors"
            >
              <option value="">Choose a drink…</option>
              {coffeeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </Field>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function AdminNewBookingForm() {
  const router = useRouter();
  const {
    services, serviceCategories, bookings, blockedSlots, settings,
    cars, coffees, detailers, members, getCarsForMember,
    addBooking, showToast,
  } = useApp();

  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);

  const activeDetailers = useMemo(() => detailers.filter((d) => d.isActive !== false), [detailers]);

  // ---------------------------------------------------------------------------
  // Customer info
  // ---------------------------------------------------------------------------
  const [customer, setCustomer] = useState({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    notes: '',
    isVip: false,
    memberId: null,
  });
  const [selectedDetailerIds, setSelectedDetailerIds] = useState([]);

  // ---------------------------------------------------------------------------
  // Date / time
  // ---------------------------------------------------------------------------
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const nextMonth = useMemo(
    () => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
    [calendarMonth]
  );
  const canGoPrevMonth = useMemo(() => {
    const today = new Date();
    return calendarMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  }, [calendarMonth]);

  // ---------------------------------------------------------------------------
  // Booking items — each is one car + one service
  // ---------------------------------------------------------------------------
  const newItem = () => ({ id: Date.now(), vehicle: '', vehicleYear: '', serviceId: services[0]?.id || null, coffeeOrder: '', isVip: false });
  const [items, setItems] = useState(() => [newItem()]);

  const addItem = () => setItems((prev) => [...prev, newItem()]);
  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));
  const updateItem = (id, patch) => setItems((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it));

  // When VIP status changes, propagate isVip to all items
  useEffect(() => {
    setItems((prev) => prev.map((it) => ({ ...it, isVip: customer.isVip })));
  }, [customer.isVip]);

  // ---------------------------------------------------------------------------
  // VIP member selection
  // ---------------------------------------------------------------------------
  const handleSelectMember = useCallback((member) => {
    const ownedCars = getCarsForMember(member.id);
    setCustomer({
      name: member.name,
      nickname: member.nickname || '',
      email: member.email || '',
      phone: member.phone || '',
      notes: '',
      isVip: true,
      memberId: member.id,
    });
    // Pre-fill each existing item with member's cars (one per car, up to current items length)
    if (ownedCars.length > 0) {
      setItems((prev) => {
        const filled = prev.map((it, i) => {
          const car = ownedCars[i];
          if (!car) return { ...it, isVip: true };
          return { ...it, vehicle: `${car.make} ${car.model}`, vehicleYear: String(car.year), isVip: true };
        });
        // Add extra items for remaining cars
        const extras = ownedCars.slice(prev.length).map((car) => ({
          ...newItem(),
          vehicle: `${car.make} ${car.model}`,
          vehicleYear: String(car.year),
          isVip: true,
        }));
        return [...filled, ...extras];
      });
    }
  }, [getCarsForMember]);

  const clearMember = () => {
    setCustomer({ name: '', nickname: '', email: '', phone: '', notes: '', isVip: false, memberId: null });
    setItems([newItem()]);
  };

  // ---------------------------------------------------------------------------
  // Availability check (based on the most demanding service in items)
  // ---------------------------------------------------------------------------
  const longestService = useMemo(() => {
    let best = null;
    items.forEach((it) => {
      const svc = services.find((s) => s.id === it.serviceId);
      if (!svc) return;
      if (!best || getDaysConsumed(svc.duration) > getDaysConsumed(best.duration)) best = svc;
    });
    return best;
  }, [items, services]);

  const timeAvailability = useMemo(() => {
    if (!date || !time || !longestService) return null;
    return getTimeAvailability(date, time, longestService.duration, {
      minDetailers: longestService.minDetailers ?? 1,
      bookings,
      blockedSlots,
      settings,
    });
  }, [date, time, longestService, bookings, blockedSlots, settings]);

  const multiDaySpan = useMemo(() => {
    if (!longestService || !date) return null;
    const days = getDaysConsumed(longestService.duration);
    if (days <= 1) return null;
    const extra = getMultiDayBlockedDates(date, days);
    return { days, lastDate: extra[extra.length - 1] };
  }, [longestService, date]);

  // ---------------------------------------------------------------------------
  // Submit — creates one booking per item
  // ---------------------------------------------------------------------------
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer.name || !customer.email || !customer.phone) {
      showToast('Customer name, email, and phone are required.', 'error'); return;
    }
    if (!date) { showToast('Pick a date.', 'error'); return; }
    if (!time) { showToast('Pick a time.', 'error'); return; }

    for (const it of items) {
      if (!it.vehicle || !it.vehicleYear) {
        showToast(`Fill in vehicle info for item ${items.indexOf(it) + 1}.`, 'error'); return;
      }
      if (!it.serviceId) {
        showToast(`Choose a service for item ${items.indexOf(it) + 1}.`, 'error'); return;
      }
    }

    setSubmitting(true);
    const results = [];
    try {
      for (const it of items) {
        const svc = services.find((s) => s.id === it.serviceId);
        if (!svc) continue;
        const result = await addBooking({
          serviceId: svc.id,
          serviceName: svc.name,
          servicePrice: svc.price,
          serviceDuration: svc.duration,
          serviceCategory: svc.category,
          date,
          time,
          customerName: customer.name,
          nickname: customer.nickname.trim() || null,
          email: customer.email,
          phone: customer.phone,
          vehicle: it.vehicle,
          vehicleYear: it.vehicleYear,
          notes: customer.notes,
          isVip: customer.isVip,
          memberId: customer.memberId || null,
          coffeeOrder: customer.isVip ? (it.coffeeOrder || '') : '',
          status: 'confirmed',
          assignedDetailerIds: selectedDetailerIds,
          detailersAssigned: selectedDetailerIds.length > 0 ? selectedDetailerIds : Math.max(svc.minDetailers ?? 1, settings?.defaultDetailersPerBooking ?? 1),
        });
        if (result?.error) {
          showToast(`Booking failed for ${it.vehicle}: ${result.error}`, 'error');
          setSubmitting(false);
          return;
        }
        results.push(result);
      }
      showToast(`${results.length} booking${results.length !== 1 ? 's' : ''} created successfully.`, 'success');
      router.push('/admin/bookings');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDetailer = (id) =>
    setSelectedDetailerIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const totalPrice = items.reduce((sum, it) => {
    const svc = services.find((s) => s.id === it.serviceId);
    return sum + (svc?.price || 0);
  }, 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <AdminLayout title="New Booking">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/bookings')}
          className="p-2 border border-white/10 rounded-sm text-muted hover:text-gold hover:border-gold/50 transition-colors"
          aria-label="Back to bookings"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="text-cream font-serif text-xl">New Booking</div>
          <div className="text-muted text-xs mt-0.5">Book one or more vehicles simultaneously</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ---- LEFT COLUMN ---- */}
        <div className="space-y-6">

          {/* SECTION: Customer */}
          <section className="glass-card rounded-md p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-cream font-serif text-lg">Customer</h2>
              {customer.isVip && (
                <div className="flex items-center gap-1.5 text-gold text-xs border border-gold/30 bg-gold/10 rounded-sm px-2.5 py-1">
                  <Crown className="w-3 h-3" />
                  VIP Member
                  <button type="button" onClick={clearMember} className="ml-1 text-muted hover:text-danger transition-colors" aria-label="Clear member">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {!customer.isVip && (
              <Field label="Search VIP Member (optional)">
                <MemberSearch members={members} onSelect={handleSelectMember} />
              </Field>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full Name *">
                <input type="text" required value={customer.name}
                  onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                  className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] px-3 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Juan dela Cruz" />
              </Field>
              <Field label="Nickname / Alias">
                <input type="text" value={customer.nickname}
                  onChange={(e) => setCustomer((c) => ({ ...c, nickname: e.target.value }))}
                  className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] px-3 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="e.g. JC, Boss" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Email *">
                <input type="email" required value={customer.email}
                  onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] px-3 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="you@email.com" />
              </Field>
              <Field label="Phone *">
                <input type="tel" required value={customer.phone}
                  onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                  className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] px-3 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="0917 123 4567" />
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={2} value={customer.notes}
                onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
                className="w-full bg-surface/70 border border-white/[0.08] rounded-[4px] py-[10px] px-3 text-[13px] text-cream placeholder-muted focus:outline-none focus:border-gold/50 transition-colors resize-none"
                placeholder="Special requests, vehicle condition, etc." />
            </Field>
          </section>

          {/* SECTION: Date & Time */}
          <section className="glass-card rounded-md p-6 space-y-4">
            <h2 className="text-cream font-serif text-lg">Date &amp; Time</h2>
            <div className="flex items-center justify-between">
              <button type="button"
                onClick={() => canGoPrevMonth && setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                disabled={!canGoPrevMonth}
                aria-label="Previous month"
                className="w-8 h-8 rounded-sm border border-white/10 flex items-center justify-center text-cream/70 hover:text-gold hover:border-gold/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-muted text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold" />
                Select a date
              </div>
              <button type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                aria-label="Next month"
                className="w-8 h-8 rounded-sm border border-white/10 flex items-center justify-center text-cream/70 hover:text-gold hover:border-gold/50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <MiniCalendar monthDate={calendarMonth} selected={date} onSelect={(d) => { setDate(d); setTime(''); }} />
              <div className="hidden md:block">
                <MiniCalendar monthDate={nextMonth} selected={date} onSelect={(d) => { setDate(d); setTime(''); }} />
              </div>
            </div>

            <Field label="Start Time *">
              <div className="relative">
                <Clock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="time"
                  disabled={!date}
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
                  min="07:00"
                  max="17:00"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) { setTime(''); return; }
                    const [hStr, mStr] = val.split(':');
                    setTime(minutesToTimeStr(parseInt(hStr, 10) * 60 + parseInt(mStr, 10)));
                  }}
                  className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream text-sm focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark] disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            </Field>

            {time && timeAvailability && (
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm ${
                timeAvailability.available
                  ? 'bg-success/10 border border-success/30 text-success'
                  : 'bg-danger/10 border border-danger/30 text-danger'
              }`}>
                {timeAvailability.available
                  ? <><Check className="w-4 h-4 shrink-0" /><span><span className="font-medium">{time}</span> available — {timeAvailability.remaining} detailer{timeAvailability.remaining === 1 ? '' : 's'} free</span></>
                  : <><X className="w-4 h-4 shrink-0" /><span>
                      {timeAvailability.reason === 'blocked' && 'This time is blocked.'}
                      {timeAvailability.reason === 'capacity' && `No detailers available (${timeAvailability.remaining} free, need ${longestService?.minDetailers ?? 1}).`}
                      {timeAvailability.reason === 'overflow' && 'Not enough time to finish before closing.'}
                      {timeAvailability.reason === 'multiday' && 'Date occupied by a multi-day booking.'}
                    </span></>
                }
              </div>
            )}
            {multiDaySpan && (
              <div className="text-[11px] text-cream/60 bg-white/5 border border-white/10 rounded-sm px-3 py-2 leading-relaxed">
                Multi-day service — vehicle stays through <span className="text-cream">{multiDaySpan.lastDate}</span>.
              </div>
            )}
          </section>

          {/* SECTION: Vehicles & Services */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-cream font-serif text-lg">Vehicles &amp; Services</h2>
              <button type="button" onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/10 text-cream/70 rounded-sm hover:border-gold/50 hover:text-gold transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add vehicle
              </button>
            </div>

            {items.map((it, i) => (
              <BookingItem
                key={it.id}
                item={it}
                index={i}
                services={services}
                catMap={catMap}
                cars={cars}
                coffees={coffees}
                onUpdate={(patch) => updateItem(it.id, patch)}
                onRemove={() => removeItem(it.id)}
                canRemove={items.length > 1}
              />
            ))}
          </section>

          {/* SECTION: Detailers */}
          {activeDetailers.length > 0 && (
            <section className="glass-card rounded-md p-6 space-y-3">
              <h2 className="text-cream font-serif text-lg">Assign Detailers</h2>
              <div className="flex flex-wrap gap-2">
                {activeDetailers.map((d) => {
                  const selected = selectedDetailerIds.includes(d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => toggleDetailer(d.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected
                          ? 'bg-gold/15 border-gold/60 text-gold'
                          : 'bg-white/[0.04] border-white/10 text-cream/70 hover:border-white/20 hover:text-cream'
                      }`}>
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {(d.name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('')}
                      </span>
                      {d.nickname ? `"${d.nickname}"` : d.name.split(' ')[0]}
                      {selected && <Check className="w-3 h-3 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {selectedDetailerIds.length === 0 && (
                <p className="text-xs text-muted">No detailer selected — will use default pool size.</p>
              )}
            </section>
          )}
        </div>

        {/* ---- RIGHT COLUMN: SUMMARY ---- */}
        <aside className="glass-card rounded-md p-6 space-y-4 sticky top-6">
          <h2 className="text-cream font-serif text-lg">Summary</h2>

          <div className="space-y-2">
            <Row label="Customer" value={customer.name || '—'} />
            {customer.isVip && (
              <div className="flex items-center gap-1.5 text-gold text-xs">
                <Crown className="w-3 h-3" /> VIP perks applied
              </div>
            )}
            <Row label="Date" value={date ? formatDateLong(date) : '—'} />
            <Row label="Time" value={time || '—'} />
          </div>

          {items.length > 0 && (
            <div className="border-t border-white/8 pt-3 space-y-2">
              {items.map((it, i) => {
                const svc = services.find((s) => s.id === it.serviceId);
                return (
                  <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="text-cream/70 min-w-0 flex-1">
                      <div className="truncate">{it.vehicle || `Vehicle ${i + 1}`} {it.vehicleYear && `· ${it.vehicleYear}`}</div>
                      <div className="text-muted text-xs">{svc?.name || '—'}</div>
                    </div>
                    <div className="text-gold shrink-0 text-xs">{svc ? formatCurrency(svc.price) : '—'}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-white/8 pt-3 flex items-center justify-between">
            <span className="text-muted text-sm">Total</span>
            <span className="text-gold text-xl font-light">{formatCurrency(totalPrice)}</span>
          </div>

          {selectedDetailerIds.length > 0 && (
            <div className="border-t border-white/8 pt-3">
              <div className="text-[11px] uppercase tracking-widest text-muted mb-1.5">Detailers</div>
              <div className="flex flex-wrap gap-1">
                {selectedDetailerIds.map((id) => {
                  const d = detailers.find((x) => x.id === id);
                  return d ? (
                    <span key={id} className="text-xs bg-gold/10 text-gold border border-gold/20 rounded-sm px-2 py-0.5">
                      {d.nickname || d.name.split(' ')[0]}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          <div className="pt-1 text-[11px] text-muted border-t border-white/8">
            Booking will be created as <span className="text-success">Confirmed</span> — no approval needed.
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-5 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Creating…</>
            ) : (
              <><Check className="w-4 h-4" />Create {items.length > 1 ? `${items.length} Bookings` : 'Booking'}</>
            )}
          </button>
        </aside>
      </form>
    </AdminLayout>
  );
}

export default function AdminNewBookingPage() {
  return (
    <ProtectedRoute>
      <AdminNewBookingForm />
    </ProtectedRoute>
  );
}
