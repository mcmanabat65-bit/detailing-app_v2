'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { STORAGE_KEYS, generateBookingId, toIsoDate } from '@/utils/bookingUtils';
import { services } from '@/data/services';

const AppContext = createContext(null);

const safeParse = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

/** Build 5 sample bookings spread across the next 7 days. */
const buildSeedBookings = () => {
  const samples = [
    {
      customerName: 'Juan dela Cruz',
      email: 'juan.delacruz@email.com',
      phone: '0917 123 4567',
      vehicle: '2019 Toyota Fortuner',
      vehicleYear: '2019',
      notes: 'Has a small scratch on the rear bumper.',
      isVip: true,
      coffeeOrder: 'Macchiato',
      serviceId: 2,
      time: '10:00 AM',
      offsetDays: 1,
    },
    {
      customerName: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '0918 456 7890',
      vehicle: '2021 Honda CR-V',
      vehicleYear: '2021',
      notes: '',
      isVip: false,
      coffeeOrder: '',
      serviceId: 1,
      time: '9:00 AM',
      offsetDays: 2,
    },
    {
      customerName: 'Ramon Aquino',
      email: 'ramon.aquino@email.com',
      phone: '0920 333 1122',
      vehicle: '2018 BMW 320i',
      vehicleYear: '2018',
      notes: 'Please pay extra attention to the wheels.',
      isVip: true,
      coffeeOrder: 'Cappuccino',
      serviceId: 4,
      time: '8:00 AM',
      offsetDays: 3,
    },
    {
      customerName: 'Liza Reyes',
      email: 'liza.reyes@email.com',
      phone: '0925 789 1234',
      vehicle: '2022 Mazda 3',
      vehicleYear: '2022',
      notes: 'Pick-up at 5pm.',
      isVip: false,
      coffeeOrder: '',
      serviceId: 6,
      time: '11:00 AM',
      offsetDays: 4,
    },
    {
      customerName: 'Carlos Bautista',
      email: 'carlos.bautista@email.com',
      phone: '0917 990 8877',
      vehicle: '2020 Ford Ranger Raptor',
      vehicleYear: '2020',
      notes: 'Off-roading dust — needs deep clean.',
      isVip: true,
      coffeeOrder: 'Latte',
      serviceId: 3,
      time: '8:00 AM',
      offsetDays: 6,
    },
  ];

  const today = new Date();
  return samples.map((s, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + s.offsetDays);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    const svc = services.find((x) => x.id === s.serviceId);
    return {
      id: `OBS-${toIsoDate(d).replace(/-/g, '')}-${1000 + i}`,
      serviceId: svc.id,
      serviceName: svc.name,
      servicePrice: svc.price,
      serviceDuration: svc.duration,
      serviceCategory: svc.category,
      date: toIsoDate(d),
      time: s.time,
      customerName: s.customerName,
      email: s.email,
      phone: s.phone,
      vehicle: s.vehicle,
      vehicleYear: s.vehicleYear,
      notes: s.notes,
      isVip: s.isVip,
      coffeeOrder: s.coffeeOrder,
      status: 'confirmed',
      createdAt: new Date(today.getTime() - i * 36e5).toISOString(),
    };
  });
};

export function AppProvider({ children }) {
  const [bookings, setBookings] = useState([]);
  const [members, setMembers] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [adminSession, setAdminSessionState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Hydrate from localStorage on the client only
  useEffect(() => {
    const stored = safeParse(STORAGE_KEYS.bookings, null);
    if (stored && stored.length) {
      setBookings(stored);
    } else {
      const seed = buildSeedBookings();
      localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(seed));
      setBookings(seed);
    }
    setMembers(safeParse(STORAGE_KEYS.members, []));
    setBlockedSlots(safeParse(STORAGE_KEYS.blockedSlots, []));
    setAdminSessionState(
      typeof window !== 'undefined' &&
        localStorage.getItem(STORAGE_KEYS.adminSession) === 'true'
    );
    setHydrated(true);
  }, []);

  // Persistence (only after hydration so we don't overwrite stored data with []).
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(bookings));
  }, [bookings, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members));
  }, [members, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEYS.blockedSlots,
      JSON.stringify(blockedSlots)
    );
  }, [blockedSlots, hydrated]);

  // ===== Bookings =====
  const addBooking = useCallback((booking) => {
    const id = booking.id || generateBookingId();
    const full = {
      id,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      ...booking,
    };
    setBookings((prev) => [full, ...prev]);
    return full;
  }, []);

  const updateBookingStatus = useCallback((id, status) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  }, []);

  const deleteBooking = useCallback((id) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ===== Members =====
  const addMember = useCallback((member) => {
    const m = {
      id: `MEM-${Date.now()}`,
      memberSince: new Date().toISOString(),
      ...member,
    };
    setMembers((prev) => [m, ...prev]);
    return m;
  }, []);

  // ===== Blocked slots =====
  const toggleBlockedSlot = useCallback((date, time, label = 'Unavailable') => {
    setBlockedSlots((prev) => {
      const exists = prev.find((b) => b.date === date && b.time === time);
      if (exists) return prev.filter((b) => !(b.date === date && b.time === time));
      return [...prev, { date, time, label, id: `BLK-${Date.now()}` }];
    });
  }, []);

  // ===== Admin =====
  const setAdminSession = useCallback((value) => {
    setAdminSessionState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.adminSession, value ? 'true' : 'false');
    }
  }, []);

  // ===== Toasts =====
  const showToast = useCallback((message, variant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      bookings,
      members,
      blockedSlots,
      adminSession,
      hydrated,
      toasts,
      addBooking,
      updateBookingStatus,
      deleteBooking,
      addMember,
      toggleBlockedSlot,
      setAdminSession,
      showToast,
      dismissToast,
    }),
    [
      bookings,
      members,
      blockedSlots,
      adminSession,
      hydrated,
      toasts,
      addBooking,
      updateBookingStatus,
      deleteBooking,
      addMember,
      toggleBlockedSlot,
      setAdminSession,
      showToast,
      dismissToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
