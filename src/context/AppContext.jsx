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
  parseTimeToMinutes,
} from '@/utils/bookingUtils';
import { services as staticServices } from '@/data/services';
import { timeSlots } from '@/data/timeSlots';
import { supabase, isSupabaseConfigured, fromRow, toRow } from '@/lib/supabase';
import { ROLES, can as canForRole, isValidRole } from '@/lib/permissions';

const AppContext = createContext(null);

/** Compute the slot-string range a booking will occupy at insert time.
 *  Handles arbitrary start times (e.g. "8:15 AM") by mapping to the
 *  nearest grid slot at or before the chosen time.
 */
const computeOccupiesSlots = (startTime, serviceDuration) => {
  // Try exact match first, then fall back to nearest slot at or before
  let startIdx = timeSlots.indexOf(startTime);
  if (startIdx < 0) {
    const mins = parseTimeToMinutes(startTime);
    if (mins < 0) return [];
    for (let i = 0; i < timeSlots.length; i++) {
      if (parseTimeToMinutes(timeSlots[i]) <= mins) startIdx = i;
      else break;
    }
  }
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
  const [testimonials, setTestimonials] = useState([]);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [addonCatalog, setAddonCatalog] = useState([]);
  const [carConditionLogs, setCarConditionLogs] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [coffeeRecipes, setCoffeeRecipes] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [posOrders, setPosOrders] = useState([]);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [adminSession, setAdminSessionState] = useState(false);
  const [authEmail, setAuthEmail] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersHydrated, setAdminUsersHydrated] = useState(false);
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

  const refetchTestimonials = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[testimonials] fetch error', error);
      return;
    }
    setTestimonials((data || []).map(fromRow));
  }, []);

  const refetchRecurringSchedules = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('recurring_schedules')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[recurring_schedules] fetch error', error);
      return;
    }
    setRecurringSchedules((data || []).map(fromRow));
  }, []);

  const refetchAddonCatalog = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('addon_catalog')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name',       { ascending: true });
    if (error) { console.error('[addon_catalog] fetch error', error); return; }
    setAddonCatalog((data || []).map(fromRow));
  }, []);

  const refetchCarConditionLogs = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('car_condition_logs')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(2000);
    if (error) { console.error('[car_condition_logs] fetch error', error); return; }
    setCarConditionLogs((data || []).map(fromRow));
  }, []);

  const refetchInventoryItems = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(1000);
    if (error) { console.error('[inventory_items] fetch error', error); return; }
    setInventoryItems((data || []).map(fromRow));
  }, []);

  const refetchCoffeeRecipes = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('coffee_recipes')
      .select('*')
      .limit(5000);
    if (error) { console.error('[coffee_recipes] fetch error', error); return; }
    setCoffeeRecipes((data || []).map(fromRow));
  }, []);

  const refetchInventoryTransactions = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) { console.error('[inventory_transactions] fetch error', error); return; }
    setInventoryTransactions((data || []).map(fromRow));
  }, []);

  // POS orders (with their line items) — authenticated-read like inventory.
  const refetchPosOrders = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('pos_orders')
      .select('*, items:pos_order_items(*)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) { console.error('[pos_orders] fetch error', error); return; }
    setPosOrders(
      (data || []).map((o) => ({ ...fromRow(o), items: (o.items || []).map(fromRow) }))
    );
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

  // admin_users is authenticated-read-only, so it only resolves once a session
  // exists. adminUsersHydrated flips true after each attempt so role resolution
  // can wait until we actually know the list (avoids a wrong-role flash).
  const refetchAdminUsers = useCallback(async () => {
    if (!supabase) { setAdminUsersHydrated(true); return; }
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[admin_users] fetch error', error);
    } else {
      setAdminUsers((data || []).map(fromRow));
    }
    setAdminUsersHydrated(true);
  }, []);

  // Hydrate everything in parallel on mount.
  useEffect(() => {
    if (!supabase) {
      setHydrated(true);
      return;
    }

    const applySession = (session) => {
      setAdminSessionState(!!session);
      setAuthEmail(session?.user?.email?.trim().toLowerCase() || null);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => applySession(session)
    );

    // Resolve auth session first so adminSession is accurate before hydrated=true.
    // This prevents ProtectedRoute from seeing hydrated=true + adminSession=false
    // in the same render cycle and bouncing back to login after a fresh login.
    const authPromise = supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => {});

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        setSupabaseError('Database is not responding. Check your connection and reload.');
        setHydrated(true);
      }
    }, 10_000);

    Promise.allSettled([
      authPromise,
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
      refetchTestimonials(),
      refetchRecurringSchedules(),
      refetchAddonCatalog(),
      refetchCarConditionLogs(),
      refetchInventoryItems(),
      refetchCoffeeRecipes(),
      refetchInventoryTransactions(),
    ]).finally(() => {
      settled = true;
      clearTimeout(timer);
      setHydrated(true);
    });

    return () => subscription.unsubscribe();
  }, [refetchServices, refetchBookings, refetchMembers, refetchBlockedSlots, refetchCars, refetchMemberCars, refetchCoffees, refetchServiceCategories, refetchDetailers, refetchSettings, refetchTestimonials, refetchRecurringSchedules, refetchAddonCatalog, refetchCarConditionLogs, refetchInventoryItems, refetchCoffeeRecipes, refetchInventoryTransactions]);

  // Resolve the current admin's role from admin_users whenever the session
  // changes. admin_users is authenticated-read-only, so we (re)fetch it on
  // login and clear it on logout.
  useEffect(() => {
    if (adminSession) {
      setAdminUsersHydrated(false);
      refetchAdminUsers();
      // inventory tables are authenticated-read-only — (re)fetch once a session
      // exists (the anon hydrate on mount returns nothing for them).
      refetchInventoryItems();
      refetchCoffeeRecipes();
      refetchInventoryTransactions();
      refetchPosOrders();
    } else {
      setAdminUsers([]);
      setAdminUsersHydrated(true);
      setInventoryItems([]);
      setCoffeeRecipes([]);
      setInventoryTransactions([]);
      setPosOrders([]);
    }
  }, [adminSession, refetchAdminUsers, refetchInventoryItems, refetchCoffeeRecipes, refetchInventoryTransactions, refetchPosOrders]);

  // Global Realtime subscription — one shared WebSocket channel for the entire
  // app. Any page that reads `bookings` from context (bookings, schedule,
  // dashboard, monitor) automatically receives live updates without each page
  // managing its own channel.
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('app-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        refetchBookings();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchBookings]);

  // ===== Services =====
  const upsertService = useCallback(
    async (service) => {
      if (!supabase) return { error: 'Database not connected.' };
      const isEdit = Boolean(service.id);

      // Fields sent on both insert and update
      const fields = toRow({
        name: service.name,
        description: service.description || null,
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
          nickname: booking.nickname || null,
          email: booking.email,
          phone: booking.phone,
          vehicle: booking.vehicle,
          vehicleYear: booking.vehicleYear,
          vehicleType: booking.vehicleType || 1,
          notes: booking.notes,
          isVip: booking.isVip,
          memberId: booking.memberId,
          carId: booking.carId || null,
          coffeeOrder: booking.coffeeOrder,
          status: booking.status || 'pending',
          detailersAssigned: booking.assignedDetailerIds || [],
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

      // Status changes go through a SECURITY DEFINER RPC so a plain admin
      // (barista) can advance status without table-level UPDATE rights — while
      // other booking edits stay super-admin only. The RPC also writes the
      // audit log (which is otherwise super-admin-only to insert).
      const { data, error } = await supabase.rpc('update_booking_status', {
        p_id: id,
        p_status: status,
        p_reason: cancellationReason,
      });

      if (error) {
        // Fallback for databases that haven't applied the RPC migration yet:
        // update the table directly (works for super admins / open RLS).
        const missing =
          error.code === 'PGRST202' ||
          /update_booking_status|function .* does not exist|could not find the function/i.test(
            error.message || ''
          );
        if (!missing) return { error: error.message };

        const current = bookings.find((b) => b.id === id);
        const fromStatus = current?.status ?? null;
        const payload = { status };
        if (status === 'cancelled') payload.cancellation_reason = cancellationReason || null;

        const { error: upErr } = await supabase.from('bookings').update(payload).eq('id', id);
        if (upErr) return { error: upErr.message };
        await supabase.from('booking_status_logs').insert({
          booking_id: id,
          from_status: fromStatus,
          to_status: status,
          notes: cancellationReason || null,
        });
      } else if (data?.error) {
        return { error: data.error };
      }

      await refetchBookings();
      return { ok: true };
    },
    [bookings, refetchBookings]
  );

  const fetchBookingLogs = useCallback(
    async (bookingId) => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('booking_status_logs')
        .select('*')
        .eq('booking_id', bookingId)
        .order('changed_at', { ascending: true });
      if (error) return [];
      return data.map(fromRow);
    },
    []
  );

  const updateBookingDetailers = useCallback(
    async (id, detailerIds) => {
      if (!supabase) return { error: 'Database not connected.' };
      const ids = Array.isArray(detailerIds) ? detailerIds : [];
      if (ids.length < 1) {
        return { error: 'At least one detailer must be assigned.' };
      }
      const booking = bookings.find((b) => b.id === id);
      const svc = booking ? services.find((s) => s.id === Number(booking.serviceId)) : null;
      const minDetailers = svc?.minDetailers ?? 1;

      const { data, error } = await supabase.rpc('update_booking_detailers', {
        p_id: id,
        p_detailer_ids: ids,
        p_min_detailers: minDetailers,
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      await refetchBookings();
      return { ok: true, detailersAssigned: ids };
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

  const updateMember = useCallback(
    async (id, fields) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('members').update(toRow(fields)).eq('id', id);
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
      const vehicleType = car.vehicleType === 2 ? 2 : 1;
      const row = {
        make: trimmedMake,
        year: yearNum,
        model: trimmedModel,
        size: car.size,
        vehicle_type: vehicleType,
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
          // Update size/vehicle_type in case admin tweaked them
          const needsUpdate = existing.size !== car.size || existing.vehicle_type !== vehicleType;
          if (needsUpdate) {
            await supabase.from('cars').update({ size: car.size, vehicle_type: vehicleType }).eq('id', existing.id);
          }
          await refetchCars();
          return fromRow({ ...existing, size: car.size, vehicle_type: vehicleType });
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
    async (memberId, carId, plateNumber = null) => {
      if (!supabase) return { error: 'Database not connected.' };
      if (!memberId || !carId) {
        return { error: 'memberId and carId are required.' };
      }
      // Append at the end — sort_order = max(existing) + 1
      const existing = memberCars.filter((mc) => mc.memberId === memberId);
      const nextOrder = existing.length
        ? Math.max(...existing.map((mc) => mc.sortOrder ?? 0)) + 1
        : 0;
      const plate = (plateNumber || '').trim().toUpperCase() || null;
      const { data, error } = await supabase
        .from('member_cars')
        .insert({ member_id: memberId, car_id: carId, plate_number: plate, sort_order: nextOrder })
        .select()
        .single();
      if (error) return { error: error.message };
      await refetchMemberCars();
      return fromRow(data);
    },
    [memberCars, refetchMemberCars]
  );

  // Update plate number on an existing member_cars link
  const updateMemberCarPlate = useCallback(
    async (memberCarId, plateNumber) => {
      if (!supabase) return { error: 'Database not connected.' };
      const plate = (plateNumber || '').trim().toUpperCase() || null;
      const { error } = await supabase
        .from('member_cars')
        .update({ plate_number: plate })
        .eq('id', memberCarId);
      if (error) return { error: error.message };
      await refetchMemberCars();
      return { ok: true };
    },
    [refetchMemberCars]
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
            plateNumber: mc.plateNumber ?? null, // per-member plate, not from catalog
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

  // ===== Recurring Schedules =====
  const getRecurringSchedulesForMember = useCallback(
    (memberId) => recurringSchedules.filter((s) => s.memberId === memberId),
    [recurringSchedules]
  );

  const addRecurringSchedule = useCallback(
    async (schedule) => {
      if (!supabase) return { error: 'Database not connected.' };
      const row = toRow({
        memberId: schedule.memberId,
        carId: schedule.carId || null,
        serviceId: Number(schedule.serviceId),
        dayOfWeek: Number(schedule.dayOfWeek),
        preferredTime: schedule.preferredTime,
        isActive: schedule.isActive !== false,
        notes: schedule.notes?.trim() || null,
      });
      const { data, error } = await supabase.from('recurring_schedules').insert(row).select().single();
      if (error) return { error: error.message };
      await refetchRecurringSchedules();
      return fromRow(data);
    },
    [refetchRecurringSchedules]
  );

  const updateRecurringSchedule = useCallback(
    async (id, fields) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('recurring_schedules').update(toRow(fields)).eq('id', id);
      if (error) return { error: error.message };
      await refetchRecurringSchedules();
      return { ok: true };
    },
    [refetchRecurringSchedules]
  );

  const deleteRecurringSchedule = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('recurring_schedules').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchRecurringSchedules();
      return { ok: true };
    },
    [refetchRecurringSchedules]
  );

  // Generates confirmed bookings for all active recurring schedules of a member.
  // Returns { created: [{date, car, service}], skipped: [{date, car, reason}] }
  const generateRecurringBookings = useCallback(
    async (memberId, weeksAhead = 4) => {
      if (!supabase) return { error: 'Database not connected.' };
      const member = members.find((m) => m.id === memberId);
      if (!member) return { error: 'Member not found.' };

      const activeSchedules = recurringSchedules.filter(
        (s) => s.memberId === memberId && s.isActive
      );
      if (activeSchedules.length === 0) return { created: [], skipped: [], empty: true };

      const localIso = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + weeksAhead * 7);

      const created = [];
      const skipped = [];

      for (const schedule of activeSchedules) {
        const svc = services.find((s) => s.id === schedule.serviceId);
        if (!svc) continue;
        const car = cars.find((c) => c.id === schedule.carId);
        const vehicleStr  = car ? `${car.make} ${car.model}` : '';
        const vehicleYear = car ? String(car.year) : '';
        const carLabel    = car ? `${car.year} ${car.make} ${car.model}` : 'No car';

        const current = new Date(today);
        while (current <= endDate) {
          if (current.getDay() === schedule.dayOfWeek) {
            const dateStr = localIso(current);

            // Skip if a non-cancelled booking already exists for this member/vehicle/date
            const alreadyBooked = bookings.some(
              (b) =>
                b.memberId === memberId &&
                b.date === dateStr &&
                b.vehicle === vehicleStr &&
                b.status !== 'cancelled'
            );

            if (alreadyBooked) {
              skipped.push({ date: dateStr, car: carLabel, reason: 'Already booked' });
            } else {
              const result = await addBooking({
                serviceId:        svc.id,
                serviceName:      svc.name,
                servicePrice:     svc.price,
                serviceDuration:  svc.duration,
                serviceCategory:  svc.category,
                date:             dateStr,
                time:             schedule.preferredTime,
                customerName:     member.name,
                nickname:         member.nickname || null,
                email:            member.email,
                phone:            member.phone,
                vehicle:          vehicleStr,
                vehicleYear,
                notes:            schedule.notes ? `[Recurring] ${schedule.notes}` : '[Recurring booking]',
                isVip:            true,
                memberId:         member.id,
                carId:            schedule.carId || null,
                coffeeOrder:      '',
                status:           'confirmed',
                assignedDetailerIds: [],
                detailersAssigned: Math.max(svc.minDetailers ?? 1, settings?.defaultDetailersPerBooking ?? 1),
              });
              if (result?.error) {
                skipped.push({ date: dateStr, car: carLabel, reason: result.error });
              } else {
                created.push({ date: dateStr, car: carLabel, service: svc.name });
              }
            }
          }
          current.setDate(current.getDate() + 1);
        }
      }

      return { created, skipped };
    },
    [supabase, members, recurringSchedules, services, cars, bookings, settings, addBooking]
  );

  // ===== Car Condition Logs =====
  const addCarConditionLog = useCallback(
    async (log) => {
      if (!supabase) return { error: 'Database not connected.' };
      const row = toRow({
        memberCarId:       log.memberCarId,
        bookingId:         log.bookingId || null,
        overallRating:     Number(log.overallRating),
        exteriorRating:    log.exteriorRating ? Number(log.exteriorRating) : null,
        interiorRating:    log.interiorRating ? Number(log.interiorRating) : null,
        exteriorCondition: log.exteriorCondition || null,
        interiorCondition: log.interiorCondition || null,
        mileage:           log.mileage ? Number(log.mileage) : null,
        notes:             (log.notes || '').trim() || null,
        recordedAt:        log.recordedAt || new Date().toISOString(),
      });
      const { data, error } = await supabase
        .from('car_condition_logs')
        .insert(row)
        .select()
        .single();
      if (error) return { error: error.message };
      await refetchCarConditionLogs();
      return fromRow(data);
    },
    [refetchCarConditionLogs]
  );

  const deleteCarConditionLog = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('car_condition_logs').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchCarConditionLogs();
      return { ok: true };
    },
    [refetchCarConditionLogs]
  );

  const getConditionLogsForCar = useCallback(
    (memberCarId) => {
      if (!memberCarId) return [];
      return carConditionLogs.filter((l) => l.memberCarId === memberCarId);
    },
    [carConditionLogs]
  );

  // ===== Coffee Ingredient Inventory =====
  // Ingredient catalog CRUD. stock_qty is NOT edited here — it moves only
  // through restockInventoryItem / consume_coffee_serve so every change is
  // logged in inventory_transactions. On create, an optional opening stock is
  // recorded as an 'initial' transaction.
  const upsertInventoryItem = useCallback(
    async (item) => {
      if (!supabase) return { error: 'Database not connected.' };
      const name = (item.name || '').trim();
      if (!name) return { error: 'Item name is required.' };
      const unitCost = Number(item.unitCost) || 0;
      if (unitCost < 0) return { error: 'Unit cost cannot be negative.' };
      const lowStockAt = Number(item.lowStockAt) || 0;

      const fields = {
        brand: (item.brand || '').trim() || null,
        name,
        description: (item.description || '').trim() || null,
        type: (item.type || '').trim() || null,
        uom: (item.uom || 'pc').trim() || 'pc',
        pack_volume: item.packVolume === '' || item.packVolume == null ? null : Number(item.packVolume),
        unit_cost: unitCost,
        low_stock_at: lowStockAt,
        is_active: item.isActive !== false,
        sort_order: Number(item.sortOrder) || 0,
        updated_at: new Date().toISOString(),
      };

      if (item.id) {
        const { data, error } = await supabase
          .from('inventory_items').update(fields).eq('id', item.id).select().single();
        if (error) return { error: error.message };
        await refetchInventoryItems();
        return fromRow(data);
      }

      // New item — set opening stock, then log it as an 'initial' movement.
      const opening = Number(item.stockQty) || 0;
      const { data, error } = await supabase
        .from('inventory_items').insert({ ...fields, stock_qty: opening }).select().single();
      if (error) return { error: error.message };
      if (opening !== 0) {
        await supabase.from('inventory_transactions').insert({
          item_id: data.id, qty_change: opening, reason: 'initial', note: 'Opening stock',
        });
      }
      await refetchInventoryItems();
      await refetchInventoryTransactions();
      return fromRow(data);
    },
    [refetchInventoryItems, refetchInventoryTransactions]
  );

  const deleteInventoryItem = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchInventoryItems();
      await refetchCoffeeRecipes();
      await refetchInventoryTransactions();
      return { ok: true };
    },
    [refetchInventoryItems, refetchCoffeeRecipes, refetchInventoryTransactions]
  );

  // Apply a signed stock delta (restock / manual adjustment). Goes through a
  // SECURITY DEFINER RPC that updates stock_qty and logs the movement atomically.
  const adjustInventoryItem = useCallback(
    async (id, qtyChange, reason = 'adjustment', note = null) => {
      if (!supabase) return { error: 'Database not connected.' };
      const delta = Number(qtyChange);
      if (!Number.isFinite(delta) || delta === 0) {
        return { error: 'Enter a non-zero quantity.' };
      }
      const { data, error } = await supabase.rpc('adjust_inventory_item', {
        p_item_id: id,
        p_qty_change: delta,
        p_reason: reason,
        p_note: note,
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };
      await refetchInventoryItems();
      await refetchInventoryTransactions();
      return { ok: true };
    },
    [refetchInventoryItems, refetchInventoryTransactions]
  );

  // Replace a coffee's full recipe (bill of materials) in one pass: delete the
  // existing rows for that coffee, then insert the provided lines. Each line:
  // { itemId, qtyPerServe }.
  const setCoffeeRecipe = useCallback(
    async (coffeeId, lines) => {
      if (!supabase) return { error: 'Database not connected.' };
      if (!coffeeId) return { error: 'Coffee is required.' };
      const rows = (lines || [])
        .filter((l) => l.itemId && Number(l.qtyPerServe) > 0)
        .map((l) => ({
          coffee_id: coffeeId,
          item_id: l.itemId,
          qty_per_serve: Number(l.qtyPerServe),
        }));
      const { error: delErr } = await supabase
        .from('coffee_recipes').delete().eq('coffee_id', coffeeId);
      if (delErr) return { error: delErr.message };
      if (rows.length > 0) {
        const { error: insErr } = await supabase.from('coffee_recipes').insert(rows);
        if (insErr) return { error: insErr.message };
      }
      await refetchCoffeeRecipes();
      return { ok: true };
    },
    [refetchCoffeeRecipes]
  );

  const getRecipeForCoffee = useCallback(
    (coffeeId) => coffeeRecipes.filter((r) => r.coffeeId === coffeeId),
    [coffeeRecipes]
  );

  // ===== Barista POS =====
  // Tender a coffee order: records the order + deducts each coffee's recipe
  // from inventory via a SECURITY DEFINER RPC (so a plain admin/barista can
  // deduct stock without table-level inventory write rights). Coffee serving
  // lives here now — booking completion no longer touches inventory.
  // `lines`: [{ coffeeId?, coffeeName, qty }]. Returns { ok, deducted, warnings }.
  const createPosOrder = useCallback(
    async ({ memberId = null, memberName = null, note = null, lines = [] } = {}) => {
      if (!supabase) return { error: 'Database not connected.' };
      const payload = (lines || [])
        .filter((l) => (l.coffeeName || '').trim() && Number(l.qty) > 0)
        .map((l) => ({
          coffee_id: l.coffeeId || null,
          coffee_name: (l.coffeeName || '').trim(),
          qty: Math.max(1, Math.trunc(Number(l.qty) || 1)),
        }));
      if (payload.length === 0) return { error: 'Add at least one coffee to the order.' };

      const { data, error } = await supabase.rpc('tender_pos_order', {
        p_member_id: memberId,
        p_member_name: memberName,
        p_note: note,
        p_lines: payload,
      });
      if (error) return { error: error.message };
      if (data?.error) return { error: data.error };

      await refetchPosOrders();
      await refetchInventoryItems();
      await refetchInventoryTransactions();
      return {
        ok: true,
        orderId: data?.order_id ?? null,
        deducted: data?.deducted ?? [],
        warnings: data?.warnings ?? [],
      };
    },
    [refetchPosOrders, refetchInventoryItems, refetchInventoryTransactions]
  );

  // ===== Add-on Catalog =====
  const upsertAddonCatalogItem = useCallback(
    async (item) => {
      if (!supabase) return { error: 'Database not connected.' };
      const name = (item.name || '').trim();
      if (!name) return { error: 'Name is required.' };
      const price = Number(item.defaultPrice ?? item.default_price ?? 0);
      if (!Number.isFinite(price) || price < 0) return { error: 'Price must be 0 or more.' };
      const row = { name, default_price: price };
      let query;
      if (item.id) {
        query = supabase.from('addon_catalog').update(row).eq('id', item.id).select().single();
      } else {
        const { data: last } = await supabase.from('addon_catalog').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
        query = supabase.from('addon_catalog').insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 }).select().single();
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      await refetchAddonCatalog();
      return fromRow(data);
    },
    [refetchAddonCatalog]
  );

  const deleteAddonCatalogItem = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('addon_catalog').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchAddonCatalog();
      return { ok: true };
    },
    [refetchAddonCatalog]
  );

  const reorderAddonCatalog = useCallback(
    async (orderedIds) => {
      if (!supabase) return { error: 'Database not connected.' };
      const results = await Promise.all(
        orderedIds.map((id, i) => supabase.from('addon_catalog').update({ sort_order: i + 1 }).eq('id', id))
      );
      const failed = results.find((r) => r.error);
      if (failed) return { error: failed.error.message };
      await refetchAddonCatalog();
      return { ok: true };
    },
    [refetchAddonCatalog]
  );

  // ===== Booking Add-Ons =====
  // add_ons is a JSONB array on the bookings row: [{ name, price, notes }].
  // Goes through a SECURITY DEFINER RPC so a plain admin can manage add-ons
  // without table-level UPDATE rights (bookings UPDATE stays super-admin only).
  const updateBookingAddOns = useCallback(
    async (bookingId, addOns) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { data, error } = await supabase.rpc('update_booking_addons', {
        p_id: bookingId,
        p_addons: addOns,
      });
      if (error) {
        const missing =
          error.code === 'PGRST202' ||
          /update_booking_addons|function .* does not exist|could not find the function/i.test(
            error.message || ''
          );
        if (!missing) return { error: error.message };
        // Fallback for databases without the RPC migration applied yet.
        const { error: upErr } = await supabase
          .from('bookings')
          .update({ add_ons: addOns })
          .eq('id', bookingId);
        if (upErr) return { error: upErr.message };
      } else if (data?.error) {
        return { error: data.error };
      }
      await refetchBookings();
      return { ok: true };
    },
    [refetchBookings]
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

  // ===== Admin users / roles =====
  const upsertAdminUser = useCallback(
    async ({ id, email, role }) => {
      if (!supabase) return { error: 'Database not connected.' };
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail) return { error: 'Email is required.' };
      if (!isValidRole(role)) return { error: 'Invalid role.' };
      const row = { email: cleanEmail, role };
      let query;
      if (id) {
        query = supabase.from('admin_users').update(row).eq('id', id).select().single();
      } else {
        query = supabase.from('admin_users').insert(row).select().single();
      }
      const { data, error } = await query;
      if (error) {
        if (error.code === '23505') return { error: 'That email already has a role assigned.' };
        return { error: error.message };
      }
      await refetchAdminUsers();
      return fromRow(data);
    },
    [refetchAdminUsers]
  );

  const deleteAdminUser = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchAdminUsers();
      return { ok: true };
    },
    [refetchAdminUsers]
  );

  // Creates a Supabase Auth login account (with a password) AND assigns its
  // role, in one step, via the server-side admin route. Only a super_admin may
  // call it (enforced in the route). Pass no/empty password to just assign a
  // role to an account that already exists.
  const createStaffAccount = useCallback(
    async ({ email, password, role }) => {
      try {
        const res = await fetch('/api/admin/create-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { error: data?.error || 'Could not create the account.' };
        await refetchAdminUsers();
        return data;
      } catch (e) {
        return { error: e?.message || 'Network error.' };
      }
    },
    [refetchAdminUsers]
  );

  // The approved member matching the signed-in email. Admins take precedence:
  // an email present in admin_users is treated as an admin, never a member.
  // Returns null while role data is still resolving (so callers can wait).
  const currentMember = useMemo(() => {
    if (!adminSession || !authEmail) return null;
    if (!adminUsersHydrated) return null;
    if (adminUsers.some((u) => u.email === authEmail)) return null; // admin wins
    return (
      members.find(
        (m) =>
          (m.email || '').trim().toLowerCase() === authEmail &&
          (m.status ?? 'pending') === 'approved'
      ) || null
    );
  }, [adminSession, authEmail, adminUsersHydrated, adminUsers, members]);

  // Current admin's role. Resolved by email match against admin_users.
  //  - Returns null while still resolving (so callers can wait, not flash).
  //  - Listed in admin_users → that row's role.
  //  - An approved member (and not listed as admin) → null (they're a member).
  //  - Empty admin_users table → first non-member login is super_admin (bootstrap).
  //  - Authenticated but neither admin nor member → null (no access). Public
  //    member sign-up means an unknown authenticated user must NOT inherit
  //    admin access — real admins are always seeded in admin_users.
  const adminRole = useMemo(() => {
    if (!adminSession) return null;
    if (!adminUsersHydrated) return null;
    const match = adminUsers.find((u) => u.email === authEmail);
    if (match) return match.role;
    if (currentMember) return null;
    // Bootstrap: until a super_admin has been configured, any signed-in
    // non-member (not otherwise listed) is treated as super_admin. This is
    // based on "no super_admin exists" — NOT "table empty" — so the boss can
    // never lock themselves out by adding a plain admin before adding self.
    const hasSuperAdmin = adminUsers.some((u) => u.role === ROLES.SUPER_ADMIN);
    if (!hasSuperAdmin) return ROLES.SUPER_ADMIN;
    return null;
  }, [adminSession, adminUsersHydrated, adminUsers, authEmail, currentMember]);

  // 'admin' | 'member' | null (null = resolving, or authenticated-but-neither).
  const accountType = useMemo(() => {
    if (adminRole != null) return 'admin';
    if (currentMember) return 'member';
    return null;
  }, [adminRole, currentMember]);

  const isSuperAdmin = adminRole === ROLES.SUPER_ADMIN;

  const can = useCallback(
    (permission) => canForRole(adminRole, permission),
    [adminRole]
  );

  // Bookings tied to a given member — by memberId, or by email for bookings
  // created before the member had a login.
  const getBookingsForMember = useCallback(
    (member) => {
      if (!member) return [];
      const email = (member.email || '').trim().toLowerCase();
      return bookings.filter(
        (b) =>
          b.memberId === member.id ||
          (email && (b.email || '').trim().toLowerCase() === email)
      );
    },
    [bookings]
  );

  // ===== Member portal — self-service auth on top of Supabase Auth =====
  // Anyone can create an auth account, but portal access is gated by
  // currentMember (an approved member matching the email). See MemberRoute.
  const memberSignUp = useCallback(async (email, password) => {
    if (!supabase) return { error: 'Database not connected.' };
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return { error: 'Email is required.' };
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }
    const { data, error } = await supabase.auth.signUp({
      email: clean,
      password,
    });
    if (error) return { error: error.message };
    // When email confirmation is enabled, no session is returned until the
    // user confirms via the emailed link.
    return { ok: true, needsConfirmation: !data.session };
  }, []);

  const updateOwnPassword = useCallback(async (password) => {
    if (!supabase) return { error: 'Database not connected.' };
    if (!password || password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return { ok: true };
  }, []);

  // Members may edit only their own name / nickname / phone — never email or
  // status (email is the auth identity; status is admin-controlled). The DB
  // trigger members_self_update_guard enforces this server-side too.
  const updateOwnMemberProfile = useCallback(
    async (fields) => {
      if (!currentMember) return { error: 'Not signed in as a member.' };
      const name = (fields.name ?? currentMember.name ?? '').trim();
      if (!name) return { error: 'Name is required.' };
      const phone = (fields.phone ?? currentMember.phone ?? '').trim();
      if (!phone) return { error: 'Phone is required.' };
      return updateMember(currentMember.id, {
        name,
        nickname: (fields.nickname ?? currentMember.nickname ?? '').trim() || null,
        phone,
      });
    },
    [currentMember, updateMember]
  );

  // ===== Admin session — backed by Supabase Auth =====
  const signOut = useCallback(async () => {
    // Clear local state first so the UI reacts immediately and ProtectedRoute
    // redirects to login — independent of how the network call resolves.
    setAdminSessionState(false);
    setAuthEmail(null);
    setAdminUsers([]);
    setAdminUsersHydrated(true);
    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* already signed out */ }
    }
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

  // ===== Testimonials =====
  const upsertTestimonial = useCallback(
    async (testimonial) => {
      if (!supabase) return { error: 'Database not connected.' };
      const row = {
        name: (testimonial.name || '').trim(),
        car: (testimonial.car || '').trim(),
        quote: (testimonial.quote || '').trim(),
        rating: Number(testimonial.rating) || 5,
        is_visible: testimonial.isVisible !== false,
        sort_order: Number(testimonial.sortOrder) || 0,
        status: testimonial.status || 'approved',
      };
      if (!row.name) return { error: 'Name is required.' };
      if (!row.car) return { error: 'Car is required.' };
      if (!row.quote) return { error: 'Quote is required.' };
      let query;
      if (testimonial.id) {
        query = supabase.from('testimonials').update(row).eq('id', testimonial.id).select().single();
      } else {
        query = supabase.from('testimonials').insert(row).select().single();
      }
      const { data, error } = await query;
      if (error) return { error: error.message };
      await refetchTestimonials();
      return fromRow(data);
    },
    [refetchTestimonials]
  );

  const approveTestimonial = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase
        .from('testimonials')
        .update({ status: 'approved', is_visible: true })
        .eq('id', id);
      if (error) return { error: error.message };
      await refetchTestimonials();
      return { ok: true };
    },
    [refetchTestimonials]
  );

  const rejectTestimonial = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase
        .from('testimonials')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) return { error: error.message };
      await refetchTestimonials();
      return { ok: true };
    },
    [refetchTestimonials]
  );

  // Public submission — no auth required, uses anon key
  const submitTestimonial = useCallback(
    async ({ name, car, quote, rating }) => {
      if (!supabase) return { error: 'Database not connected.' };
      const row = {
        name: (name || '').trim(),
        car: (car || '').trim(),
        quote: (quote || '').trim(),
        rating: Number(rating) || 5,
        is_visible: false,
        sort_order: 0,
        status: 'pending',
      };
      if (!row.name) return { error: 'Name is required.' };
      if (!row.car) return { error: 'Vehicle is required.' };
      if (!row.quote) return { error: 'Review is required.' };
      const { error } = await supabase.from('testimonials').insert(row);
      if (error) return { error: error.message };
      return { ok: true };
    },
    []
  );

  const deleteTestimonial = useCallback(
    async (id) => {
      if (!supabase) return { error: 'Database not connected.' };
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) return { error: error.message };
      await refetchTestimonials();
      return { ok: true };
    },
    [refetchTestimonials]
  );

  const reorderTestimonials = useCallback(
    async (orderedIds) => {
      if (!supabase) return { error: 'Database not connected.' };
      const results = await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from('testimonials').update({ sort_order: i + 1 }).eq('id', id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed) return { error: failed.error.message };
      await refetchTestimonials();
      return { ok: true };
    },
    [refetchTestimonials]
  );

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
      testimonials,
      upsertTestimonial,
      approveTestimonial,
      rejectTestimonial,
      submitTestimonial,
      deleteTestimonial,
      reorderTestimonials,
      detailers,
      upsertDetailer,
      deleteDetailer,
      serviceCategories,
      upsertServiceCategory,
      deleteServiceCategory,
      addonCatalog,
      upsertAddonCatalogItem,
      deleteAddonCatalogItem,
      reorderAddonCatalog,
      updateBookingAddOns,
      recurringSchedules,
      getRecurringSchedulesForMember,
      addRecurringSchedule,
      updateRecurringSchedule,
      deleteRecurringSchedule,
      generateRecurringBookings,
      settings,
      adminSession,
      adminRole,
      accountType,
      currentMember,
      getBookingsForMember,
      memberSignUp,
      updateOwnPassword,
      updateOwnMemberProfile,
      isSuperAdmin,
      can,
      authEmail,
      adminUsers,
      adminUsersHydrated,
      upsertAdminUser,
      deleteAdminUser,
      createStaffAccount,
      hydrated,
      supabaseError,
      toasts,
      isSupabaseConfigured,
      refetchBookings,
      addBooking,
      updateBookingStatus,
      fetchBookingLogs,
      updateBookingDetailers,
      deleteBooking,
      addMember,
      updateMember,
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
      toggleBlockedSlot,
      upsertCar,
      deleteCar,
      addCarToMember,
      updateMemberCarPlate,
      removeCarFromMember,
      setMemberCarOrder,
      getCarsForMember,
      carConditionLogs,
      addCarConditionLog,
      deleteCarConditionLog,
      getConditionLogsForCar,
      inventoryItems,
      coffeeRecipes,
      inventoryTransactions,
      upsertInventoryItem,
      deleteInventoryItem,
      adjustInventoryItem,
      setCoffeeRecipe,
      getRecipeForCoffee,
      posOrders,
      createPosOrder,
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
      testimonials,
      upsertTestimonial,
      approveTestimonial,
      rejectTestimonial,
      submitTestimonial,
      deleteTestimonial,
      reorderTestimonials,
      detailers,
      upsertDetailer,
      deleteDetailer,
      serviceCategories,
      upsertServiceCategory,
      deleteServiceCategory,
      addonCatalog,
      upsertAddonCatalogItem,
      deleteAddonCatalogItem,
      reorderAddonCatalog,
      updateBookingAddOns,
      recurringSchedules,
      getRecurringSchedulesForMember,
      addRecurringSchedule,
      updateRecurringSchedule,
      deleteRecurringSchedule,
      generateRecurringBookings,
      settings,
      adminSession,
      adminRole,
      accountType,
      currentMember,
      getBookingsForMember,
      memberSignUp,
      updateOwnPassword,
      updateOwnMemberProfile,
      isSuperAdmin,
      can,
      authEmail,
      adminUsers,
      adminUsersHydrated,
      upsertAdminUser,
      deleteAdminUser,
      createStaffAccount,
      hydrated,
      supabaseError,
      toasts,
      refetchBookings,
      addBooking,
      updateBookingStatus,
      fetchBookingLogs,
      updateBookingDetailers,
      deleteBooking,
      addMember,
      updateMember,
      updateMemberStatus,
      deleteMember,
      findApprovedMemberByEmail,
      toggleBlockedSlot,
      upsertCar,
      deleteCar,
      addCarToMember,
      updateMemberCarPlate,
      removeCarFromMember,
      setMemberCarOrder,
      getCarsForMember,
      carConditionLogs,
      addCarConditionLog,
      deleteCarConditionLog,
      getConditionLogsForCar,
      inventoryItems,
      coffeeRecipes,
      inventoryTransactions,
      upsertInventoryItem,
      deleteInventoryItem,
      adjustInventoryItem,
      setCoffeeRecipe,
      getRecipeForCoffee,
      posOrders,
      createPosOrder,
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
