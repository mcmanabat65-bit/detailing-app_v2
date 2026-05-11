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
  const [cars, setCars] = useState([]);
  const [memberCars, setMemberCars] = useState([]);
  const [coffees, setCoffees] = useState([]);
  const [serviceCategories, setServiceCategories] = useState([]);
  const [detailers, setDetailers] = useState([]);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [adminSession, setAdminSessionState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [supabaseError, setSupabaseError] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ===== Refetch helpers =====
  const refetchServices = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true })
      .limit(500);
    if (error) {
      console.error('[services] fetch error', error);
      return;
    }
    if (data) setServices(data.length > 0 ? data.map(fromRow) : []);
  }, []);

  const refetchBookings = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
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
      .order('member_since', { ascending: false })
      .limit(1000);
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

  const refetchCars = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('make', { ascending: true })
      .order('model', { ascending: true })
      .order('year', { ascending: false })
      .limit(1000);
    if (error) {
      console.error('[cars] fetch error', error);
      return;
    }
    setCars((data || []).map(fromRow));
  }, []);

  const refetchMemberCars = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('member_cars')
      .select('*')
      .order('member_id', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[member_cars] fetch error', error);
      return;
    }
    setMemberCars((data || []).map(fromRow));
  }, []);

  const refetchCoffees = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('coffees')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error('[coffees] fetch error', error);
      return;
    }
    setCoffees((data || []).map(fromRow));
  }, []);

  const refetchServiceCategories = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error('[service_categories] fetch error', error);
      return;
    }
    setServiceCategories((data || []).map(fromRow));
  }, []);

  const refetchDetailers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('detailers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) {
      console.error('[detailers] fetch error', error);
      return;
    }
    setDetailers((data || []).map(fromRow));
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
    supabase.auth.getSession()
      .then(({ data: { session } }) => setAdminSessionState(!!session))
      .catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setAdminSessionState(!!session)
    );

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        setSupabaseError('Database is not responding. Check your connection and reload.');
        setHydrated(true);
      }
    }, 10_000);

    Promise.allSettled([
      refetchServices(),
      refetchBookings(),
      refetchMembers(),
      refetchBlockedSlots(),
      refetchCars(),
      refetchMemberCars(),
      refetchCoffees(),
      refetchServiceCategories(),
      refetchDetailers(),
      refetchSettings(),
    ]).finally(() => {
      settled = true;
      clearTimeout(timer);
      setHydrated(true);
    });

    return () => subscription.unsubscribe();
  }, [refetchServices, refetchBookings, refetchMembers, refetchBlockedSlots, refetchCars, refetchMemberCars, refetchCoffees, refetchServiceCategories, refetchDetailers, refetchSettings]);

  // ===== Services =====
  const upsertService = useCallback(
    async (service) => {
      if (!supabase) return { error: 'Database not connected.' };
      const isEdit = Boolean(service.id);

      // Fields sent on both insert and update
      const fields = toRow({
        name: service.name,
        price: Number(service.price),
        duration: service.duration,
        category: service.category,
        inclusions: service.inclusions ?? [],
        popular: Boolean(service.popular),
        minDetailers: Number(service.minDetailers) || 1,
        recommendedDetailers: Number(service.recommendedDetailers) || 1,
      });

      let query;
      if (isEdit) {
        query = supabase.from('services').update(fields).eq('id', service.id).select().single();
      } else {
        // id and sort_order are auto-assigned by the database
        query = supabase.from('services').insert(fields).select().single();
      }

      const { data, error } = await query;
      if (error) return { error: error.message };
      await refetchServices();
      return fromRow(data);
    },
    [refetchServices]
  );

  const reorderServices = useCallback(
    async (orderedIds) => {
      if (!supabase) return { error: 'Database not connected.' };
      const results = await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from('services').update({ sort_order: i + 1 }).eq('id', id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed) return { error: failed.error.message };
      await refetchServices();
      return { ok: true };
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
          status: booking.status || 'pending',
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

  // ===== Cars (catalog) =====
  /**
   * Upserts a car into the shared catalog. Catalog rows are de-duplicated
   * by (lower(make), lower(model), year) — repeated submissions of the
   * same vehicle just return the existing row.
   */
  const upsertCar = useCallback(
    async (car) => {
      if (!supabase) return { error: 'Database not connected.' };
      const trimmedMake = (car.make || '').trim();
      const trimmedModel = (car.model || '').trim();
      const yearNum = Number(car.year);
      if (!trimmedMake) return { error: 'Make is required.' };
      if (!trimmedModel) return { error: 'Model is required.' };
      if (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return { error: 'Year must be between 1900 and 2100.' };
      }
      if (!['small', 'medium', 'large', 'xl'].includes(car.size)) {
        return { error: 'Size must be small, medium, large, or xl.' };
      }
      const row = {
        make: trimmedMake,
        year: yearNum,
        model: trimmedModel,
        size: car.size,
        updated_at: new Date().toISOString(),
      };
      // Try to find an existing catalog row first so duplicate submissions
      // collapse into one car_id.
      if (!car.id) {
        const { data: existing } = await supabase
          .from('cars')
          .select('*')
          .ilike('make', trimmedMake)
          .ilike('model', trimmedModel)
          .eq('year', yearNum)
          .maybeSingle();
        if (existing) {
          // Update size/case in case admin tweaked it
          if (existing.size !== car.size) {
            await supabase.from('cars').update({ size: car.size }).eq('id', existing.id);
          }
          await refetchCars();
          return fromRow({ ...existing, size: car.size });
        }
      }
      let query;
      if (car.id) {
        query = supabase.from('cars').update(row).eq('id', car.id).select().single();
      } else {
        query = supabase.from('cars').insert(row).select().single();
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      await refetchCars();
      return fromRow(data);
    },
    [refetchCars]
  );

  const deleteCar = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('cars').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchCars();
      await refetchMemberCars();
      return { ok: true };
    },
    [refetchCars, refetchMemberCars]
  );

  // ===== Member ↔ Cars =====
  const addCarToMember = useCallback(
    async (memberId, carId) => {
      if (!supabase) return { error: 'Database not connected.' };
      if (!memberId || !carId) {
        return { error: 'memberId and carId are required.' };
      }
      // Append at the end — sort_order = max(existing) + 1
      const existing = memberCars.filter((mc) => mc.memberId === memberId);
      const nextOrder = existing.length
        ? Math.max(...existing.map((mc) => mc.sortOrder ?? 0)) + 1
        : 0;
      const { data, error } = await supabase
        .from('member_cars')
        .insert({ member_id: memberId, car_id: carId, sort_order: nextOrder })
        .select()
        .single();
      if (error) return { error: error.message };
      await refetchMemberCars();
      return fromRow(data);
    },
    [memberCars, refetchMemberCars]
  );

  const removeCarFromMember = useCallback(
    async (memberCarId) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase
        .from('member_cars')
        .delete()
        .eq('id', memberCarId);
      if (error) return { error: error.message };
      await refetchMemberCars();
      return { ok: true };
    },
    [refetchMemberCars]
  );

  const setMemberCarOrder = useCallback(
    async (memberCarId, sortOrder) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase
        .from('member_cars')
        .update({ sort_order: sortOrder })
        .eq('id', memberCarId);
      if (error) return { error: error.message };
      await refetchMemberCars();
      return { ok: true };
    },
    [refetchMemberCars]
  );

  /**
   * Returns a member's owned cars in display order, joined to the catalog.
   * Each item has the member_cars row id (`linkId`), sort order, and the
   * full catalog car object spread on top.
   */
  const getCarsForMember = useCallback(
    (memberId) => {
      if (!memberId) return [];
      return memberCars
        .filter((mc) => mc.memberId === memberId)
        .map((mc) => {
          const car = cars.find((c) => c.id === mc.carId);
          if (!car) return null;
          return {
            linkId: mc.id,
            sortOrder: mc.sortOrder ?? 0,
            ...car,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    [memberCars, cars]
  );

  // ===== Coffees =====
  const upsertCoffee = useCallback(
    async (coffee) => {
      if (!supabase) return { error: 'Database not connected.' };
      const row = {
        name: (coffee.name || '').trim(),
        available: coffee.available !== false,
        sort_order: Number(coffee.sortOrder) || 0,
      };
      if (!row.name) return { error: 'Name is required.' };
      let query;
      if (coffee.id) {
        query = supabase.from('coffees').update(row).eq('id', coffee.id).select().single();
      } else {
        query = supabase.from('coffees').insert(row).select().single();
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      await refetchCoffees();
      return fromRow(data);
    },
    [refetchCoffees]
  );

  const deleteCoffee = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('coffees').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchCoffees();
      return { ok: true };
    },
    [refetchCoffees]
  );

  // ===== Detailers =====
  const upsertDetailer = useCallback(
    async (detailer) => {
      if (!supabase) return { error: 'Database not connected.' };
      const name = (detailer.name || '').trim();
      if (!name) return { error: 'Name is required.' };
      const row = {
        name,
        nickname: (detailer.nickname || '').trim() || null,
        role: (detailer.role || 'Detailer').trim() || 'Detailer',
        is_active: detailer.isActive !== false,
        sort_order: Number(detailer.sortOrder) || 0,
      };
      let query;
      if (detailer.id) {
        query = supabase.from('detailers').update(row).eq('id', detailer.id).select().single();
      } else {
        query = supabase.from('detailers').insert(row).select().single();
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      await refetchDetailers();
      return fromRow(data);
    },
    [refetchDetailers]
  );

  const deleteDetailer = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('detailers').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchDetailers();
      return { ok: true };
    },
    [refetchDetailers]
  );

  // ===== Service Categories =====
  const upsertServiceCategory = useCallback(
    async (cat) => {
      if (!supabase) return { error: 'Database not connected.' };
      const name = (cat.name || '').trim();
      if (!name) return { error: 'Name is required.' };
      const slug = (cat.slug || name).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!slug) return { error: 'Slug is required.' };
      const row = {
        name,
        slug,
        color: (cat.color || '').trim() || 'bg-white/10 text-cream',
        sort_order: Number(cat.sortOrder) || 0,
      };
      let query;
      if (cat.id) {
        query = supabase.from('service_categories').update(row).eq('id', cat.id).select().single();
      } else {
        query = supabase.from('service_categories').insert(row).select().single();
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      await refetchServiceCategories();
      return fromRow(data);
    },
    [refetchServiceCategories]
  );

  const deleteServiceCategory = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchServiceCategories();
      return { ok: true };
    },
    [refetchServiceCategories]
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
      reorderServices,
      deleteService,
      bookings,
      members,
      blockedSlots,
      cars,
      memberCars,
      coffees,
      upsertCoffee,
      deleteCoffee,
      detailers,
      upsertDetailer,
      deleteDetailer,
      serviceCategories,
      upsertServiceCategory,
      deleteServiceCategory,
      settings,
      adminSession,
      hydrated,
      supabaseError,
      toasts,
      isSupabaseConfigured,
      refetchBookings,
      addBooking,
      updateBookingStatus,
      updateBookingDetailers,
      deleteBooking,
      addMember,
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
      toggleBlockedSlot,
      upsertCar,
      deleteCar,
      addCarToMember,
      removeCarFromMember,
      setMemberCarOrder,
      getCarsForMember,
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
      reorderServices,
      deleteService,
      bookings,
      members,
      blockedSlots,
      cars,
      memberCars,
      coffees,
      upsertCoffee,
      deleteCoffee,
      detailers,
      upsertDetailer,
      deleteDetailer,
      serviceCategories,
      upsertServiceCategory,
      deleteServiceCategory,
      settings,
      adminSession,
      hydrated,
      supabaseError,
      toasts,
      refetchBookings,
      addBooking,
      updateBookingStatus,
      updateBookingDetailers,
      deleteBooking,
      addMember,
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
      toggleBlockedSlot,
      upsertCar,
      deleteCar,
      addCarToMember,
      removeCarFromMember,
      setMemberCarOrder,
      getCarsForMember,
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
