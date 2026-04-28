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

/**
 * Seed members covering all three statuses. Approved members reuse the
 * email addresses of the seeded VIP bookings so the "Bookings" column on
 * /admin/members shows realistic counts.
 */
const buildSeedMembers = () => {
  const now = new Date();
  const daysAgo = (n) => new Date(now.getTime() - n * 86_400_000).toISOString();

  return [
    // Approved — these emails match seeded VIP bookings
    {
      id: 'MEM-seed-001',
      name: 'Juan dela Cruz',
      email: 'juan.delacruz@email.com',
      phone: '0917 123 4567',
      memberSince: daysAgo(90),
      status: 'approved',
      decidedAt: daysAgo(89),
    },
    {
      id: 'MEM-seed-002',
      name: 'Ramon Aquino',
      email: 'ramon.aquino@email.com',
      phone: '0920 333 1122',
      memberSince: daysAgo(60),
      status: 'approved',
      decidedAt: daysAgo(60),
    },
    {
      id: 'MEM-seed-003',
      name: 'Carlos Bautista',
      email: 'carlos.bautista@email.com',
      phone: '0917 990 8877',
      memberSince: daysAgo(45),
      status: 'approved',
      decidedAt: daysAgo(44),
    },
    // Pending — recent applications awaiting admin action
    {
      id: 'MEM-seed-004',
      name: 'Isabella Mendoza',
      email: 'isabella.mendoza@email.com',
      phone: '0917 222 3344',
      memberSince: daysAgo(2),
      status: 'pending',
    },
    {
      id: 'MEM-seed-005',
      name: 'Miguel Tan',
      email: 'miguel.tan@email.com',
      phone: '0918 555 6677',
      memberSince: daysAgo(1),
      status: 'pending',
    },
    {
      id: 'MEM-seed-006',
      name: 'Patricia Lim',
      email: 'patricia.lim@email.com',
      phone: '0925 111 2233',
      memberSince: now.toISOString(),
      status: 'pending',
    },
    // Rejected — for filter completeness / demo
    {
      id: 'MEM-seed-007',
      name: 'Mario Gomez',
      email: 'mario.gomez@email.com',
      phone: '0915 999 8877',
      memberSince: daysAgo(15),
      status: 'rejected',
      decidedAt: daysAgo(14),
    },
  ];
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
    const storedMembers = safeParse(STORAGE_KEYS.members, null);
    if (storedMembers && storedMembers.length) {
      setMembers(storedMembers);
    } else {
      const seedM = buildSeedMembers();
      localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(seedM));
      setMembers(seedM);
    }
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
      status: 'pending',
      ...member,
    };
    setMembers((prev) => [m, ...prev]);
    return m;
  }, []);

  const updateMemberStatus = useCallback((id, status) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              decidedAt: new Date().toISOString(),
            }
          : m
      )
    );
  }, []);

  const deleteMember = useCallback((id) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Email lookup used by the booking flow to auto-detect approved VIPs.
  // Treats absent `status` as 'approved' so members created before this
  // workflow existed don't get silently demoted.
  const findApprovedMemberByEmail = useCallback(
    (email) => {
      if (!email) return null;
      const target = email.trim().toLowerCase();
      if (!target) return null;
      return (
        members.find(
          (m) =>
            (m.email || '').trim().toLowerCase() === target &&
            (m.status ?? 'approved') === 'approved'
        ) || null
      );
    },
    [members]
  );

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
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
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
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
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
