'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  generateBookingId,
  getSlotsConsumed,
} from '@/utils/bookingUtils';
import { services as staticServices } from '@/data/services';
import { timeSlots } from '@/data/timeSlots';
import { supabase, isSupabaseConfigured, fromRow, toRow } from '@/lib/supabase';

const AppContext = createContext(null);

/** Compute the slot-string range a booking will occupy at insert time. */
const computeOccupiesSlots = (startTime, serviceDuration) => {
  const startIdx = timeSlots.indexOf(startTime);
  if (startIdx < 0) return [];
  const consumed = getSlotsConsumed(serviceDuration || '1 hr');
  return timeSlots.slice(startIdx, startIdx + consumed);
};

export function AppProvider({ children }) {
  const [services, setServices] = useState(staticServices);
  const [bookings, setBookings] = useState([]);
  const [members, setMembers] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [adminSession, setAdminSessionState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ===== Refetch helpers =====
  const refetchServices = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('[services] fetch error', error);
      return;
    }
    if (data && data.length > 0) setServices(data.map(fromRow));
  }, []);

  const refetchBookings = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[bookings] fetch error', error);
      return;
    }
    setBookings((data || []).map(fromRow));
  }, []);

  const refetchMembers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('member_since', { ascending: false });
    if (error) {
      console.error('[members] fetch error', error);
      return;
    }
    setMembers((data || []).map(fromRow));
  }, []);

  const refetchBlockedSlots = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('blocked_slots')
      .select('*')
      .order('date', { ascending: true });
    if (error) {
      console.error('[blocked_slots] fetch error', error);
      return;
    }
    setBlockedSlots((data || []).map(fromRow));
  }, []);

  const refetchSettings = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      console.error('[settings] fetch error', error);
      return;
    }
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...fromRow(data) });
    // If no row yet, keep DEFAULT_SETTINGS — schema seed may not have run
  }, []);

  // Hydrate everything in parallel on mount.
  useEffect(() => {
    if (!supabase) {
      setHydrated(true);
      return;
    }

    // Sync admin session from Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdminSessionState(!!session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setAdminSessionState(!!session)
    );

    Promise.allSettled([
      refetchServices(),
      refetchBookings(),
      refetchMembers(),
      refetchBlockedSlots(),
      refetchSettings(),
    ]).finally(() => setHydrated(true));

    return () => subscription.unsubscribe();
  }, [refetchServices, refetchBookings, refetchMembers, refetchBlockedSlots, refetchSettings]);

  // ===== Services =====
  const upsertService = useCallback(
    async (service) => {
      if (!supabase) return { error: 'Database not connected.' };
      const row = toRow({
        id: service.id,
        name: service.name,
        price: Number(service.price),
        duration: service.duration,
        category: service.category,
        inclusions: service.inclusions ?? [],
        popular: Boolean(service.popular),
        minDetailers: Number(service.minDetailers) || 1,
        recommendedDetailers: Number(service.recommendedDetailers) || 1,
        sortOrder: Number(service.sortOrder) || 0,
      });
      const { data, error } = await supabase
        .from('services')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      if (error) return { error: error.message };
      await refetchServices();
      return fromRow(data);
    },
    [refetchServices]
  );

  const deleteService = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchServices();
      return { ok: true };
    },
    [refetchServices]
  );

  // ===== Bookings =====
  const addBooking = useCallback(
    async (booking) => {
      if (!supabase) {
        return {
          error:
            'Database not connected. Set Supabase env vars and reload.',
        };
      }
      const svc = services.find((s) => s.id === Number(booking.serviceId));
      const minDetailers = svc?.minDetailers ?? 1;
      const occupies = computeOccupiesSlots(
        booking.time,
        booking.serviceDuration || svc?.duration
      );
      if (occupies.length === 0) {
        return { error: 'Invalid time slot.' };
      }
      const requested =
        Number(booking.detailersAssigned) ||
        Math.max(minDetailers, settings.defaultDetailersPerBooking || 1);

      const payload = {
        ...toRow({
          id: booking.id || generateBookingId(),
          serviceId: booking.serviceId,
          serviceName: booking.serviceName,
          servicePrice: booking.servicePrice,
          serviceDuration: booking.serviceDuration,
          serviceCategory: booking.serviceCategory,
          date: booking.date,
          time: booking.time,
          customerName: booking.customerName,
          email: booking.email,
          phone: booking.phone,
          vehicle: booking.vehicle,
          vehicleYear: booking.vehicleYear,
          notes: booking.notes,
          isVip: booking.isVip,
          memberId: booking.memberId,
          coffeeOrder: booking.coffeeOrder,
          status: booking.status || 'confirmed',
          detailersAssigned: requested,
        }),
        min_detailers: minDetailers,
      };

      const { data, error } = await supabase.rpc('add_booking', {
        p: payload,
        p_occupies_slots: occupies,
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      await refetchBookings();
      return fromRow(data);
    },
    [services, settings, refetchBookings]
  );

  const updateBookingStatus = useCallback(
    async (id, status, cancellationReason = null) => {
      if (!supabase) return { error: 'Database not connected.' };
      const payload = { status };
      if (status === 'cancelled') {
        payload.cancellation_reason = cancellationReason || null;
      }
      const { error } = await supabase
        .from('bookings')
        .update(payload)
        .eq('id', id);
      if (error) return { error: error.message };
      await refetchBookings();
      return { ok: true };
    },
    [refetchBookings]
  );

  const updateBookingDetailers = useCallback(
    async (id, count) => {
      if (!supabase) return { error: 'Database not connected.' };
      const target = Number(count);
      if (!Number.isFinite(target) || target < 1) {
        return { error: 'Detailer count must be at least 1.' };
      }
      const booking = bookings.find((b) => b.id === id);
      const svc = booking ? services.find((s) => s.id === Number(booking.serviceId)) : null;
      const minDetailers = svc?.minDetailers ?? 1;

      const { data, error } = await supabase.rpc('update_booking_detailers', {
        p_id: id,
        p_count: target,
        p_min_detailers: minDetailers,
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      await refetchBookings();
      return { ok: true, detailersAssigned: target };
    },
    [services, bookings, refetchBookings]
  );

  const deleteBooking = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      if (error) return { error: error.message };
      await refetchBookings();
      return { ok: true };
    },
    [refetchBookings]
  );

  // ===== Members =====
  const addMember = useCallback(
    async (member) => {
      if (!supabase) return { error: 'Database not connected.' };
      const row = toRow({
        id: `MEM-${Date.now()}`,
        memberSince: new Date().toISOString(),
        status: 'pending',
        ...member,
      });
      const { data, error } = await supabase
        .from('members')
        .insert(row)
        .select()
        .single();
      if (error) return { error: error.message };
      await refetchMembers();
      return fromRow(data);
    },
    [refetchMembers]
  );

  const updateMemberStatus = useCallback(
    async (id, status) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase
        .from('members')
        .update({ status, decided_at: new Date().toISOString() })
        .eq('id', id);
      if (error) return { error: error.message };
      await refetchMembers();
      return { ok: true };
    },
    [refetchMembers]
  );

  const deleteMember = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchMembers();
      return { ok: true };
    },
    [refetchMembers]
  );

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
  const toggleBlockedSlot = useCallback(
    async (date, time, label = 'Unavailable') => {
      if (!supabase) return { error: 'Database not connected.' };
      const existing = blockedSlots.find(
        (b) => b.date === date && b.time === time
      );
      if (existing) {
        const { error } = await supabase
          .from('blocked_slots')
          .delete()
          .eq('id', existing.id);
        if (error) return { error: error.message };
      } else {
        const row = {
          id: `BLK-${Date.now()}`,
          date,
          time,
          label,
        };
        const { error } = await supabase.from('blocked_slots').insert(row);
        if (error) return { error: error.message };
      }
      await refetchBlockedSlots();
      return { ok: true };
    },
    [blockedSlots, refetchBlockedSlots]
  );

  // ===== Settings =====
  const updateSettings = useCallback(
    async (next) => {
      if (!supabase) return { error: 'Database not connected.' };
      const merged = { ...settings, ...next };
      const { data, error } = await supabase.rpc('update_settings', {
        p_pool_size: Number(merged.detailerPoolSize),
        p_default_per_booking: Number(merged.defaultDetailersPerBooking),
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };
      await refetchSettings();
      return { ok: true };
    },
    [settings, refetchSettings]
  );

  // ===== Admin session — backed by Supabase Auth =====
  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setAdminSessionState(false);
  }, []);

  // Keep setAdminSession as a no-op shim so existing call-sites don't break
  const setAdminSession = useCallback(() => {}, []);

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

  const getServiceById = useCallback(
    (id) => services.find((s) => s.id === Number(id)) || null,
    [services]
  );

  const value = useMemo(
    () => ({
      services,
      getServiceById,
      upsertService,
      deleteService,
      bookings,
      members,
      blockedSlots,
      settings,
      adminSession,
      hydrated,
      toasts,
      isSupabaseConfigured,
      addBooking,
      updateBookingStatus,
      updateBookingDetailers,
      deleteBooking,
      addMember,
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
      toggleBlockedSlot,
      updateSettings,
      setAdminSession,
      signOut,
      showToast,
      dismissToast,
    }),
    [
      services,
      getServiceById,
      upsertService,
      deleteService,
      bookings,
      members,
      blockedSlots,
      settings,
      adminSession,
      hydrated,
      toasts,
      addBooking,
      updateBookingStatus,
      updateBookingDetailers,
      deleteBooking,
      addMember,
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
      toggleBlockedSlot,
      updateSettings,
      setAdminSession,
      signOut,
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
