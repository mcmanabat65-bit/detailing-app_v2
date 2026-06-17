'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Car,
  Check,
  ClipboardList,
  Gauge,
  Pencil,
  Star,
  X,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MemberRoute } from '@/components/MemberRoute';
import { PortalLayout } from '@/components/PortalLayout';
import { formatCurrency } from '@/data/services';
import { formatDateLong } from '@/utils/bookingUtils';

const STATUS_STYLES = {
  pending: 'bg-gold/15 text-gold',
  confirmed: 'bg-success/15 text-success',
  completed: 'bg-sky-400/15 text-sky-400',
  cancelled: 'bg-danger/15 text-danger',
  no_show: 'bg-white/10 text-muted',
};

function Stat({ label, value }) {
  return (
    <div className="glass-card rounded-md p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted mb-1">{label}</div>
      <div className="text-cream text-lg font-serif">{value}</div>
    </div>
  );
}

function CarDetails() {
  const { carId } = useParams(); // = member_cars link id
  const {
    currentMember,
    getCarsForMember,
    getBookingsForMember,
    getConditionLogsForCar,
    updateMemberCarPlate,
    showToast,
    hydrated,
  } = useApp();

  const [editPlate, setEditPlate] = useState(false);
  const [plateDraft, setPlateDraft] = useState('');

  const fleet = useMemo(
    () => (currentMember ? getCarsForMember(currentMember.id) : []),
    [currentMember, getCarsForMember]
  );
  const car = fleet.find((c) => c.linkId === carId) || null;
  const isDefault = fleet[0]?.linkId === carId;

  const bookings = useMemo(() => {
    if (!currentMember || !car) return [];
    return getBookingsForMember(currentMember)
      .filter((b) => b.carId === car.id)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [currentMember, car, getBookingsForMember]);

  const logs = useMemo(
    () => (car ? getConditionLogsForCar(car.linkId) : []),
    [car, getConditionLogsForCar]
  );

  const lastVisit = bookings.find((b) => b.status === 'completed') || bookings[0] || null;
  const latestLog = logs[0] || null;

  const handleSavePlate = async () => {
    const res = await updateMemberCarPlate(car.linkId, plateDraft);
    if (res?.error) showToast(res.error, 'error');
    else showToast('Plate updated.', 'success');
    setEditPlate(false);
    setPlateDraft('');
  };

  if (!hydrated) {
    return <div className="text-muted text-sm">Loading…</div>;
  }

  if (!car) {
    return (
      <div className="max-w-3xl space-y-6">
        <Link
          href="/portal/fleet"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to fleet
        </Link>
        <div className="glass-card rounded-md p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <Car className="w-5 h-5 text-gold" />
          </div>
          <p className="text-muted text-sm">
            That car isn’t in your fleet. It may have been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/portal/fleet"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-gold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to fleet
      </Link>

      {/* Header */}
      <div className="glass-card rounded-md p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
            <Car className="w-6 h-6 text-gold" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-cream font-serif text-2xl">
                {car.year} {car.make} {car.model}
              </h2>
              {isDefault && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 rounded-full px-2 py-0.5">
                  <Star className="w-3 h-3" />
                  Default
                </span>
              )}
            </div>
            <div className="text-xs text-muted mt-1 uppercase tracking-widest">
              {car.size}
            </div>

            {editPlate ? (
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="text"
                  value={plateDraft}
                  onChange={(e) => setPlateDraft(e.target.value.toUpperCase())}
                  className="portal-input !py-1.5 max-w-[160px]"
                  placeholder="ABC-1234"
                  maxLength={10}
                  autoFocus
                />
                <button onClick={handleSavePlate} className="text-success hover:text-success/80" aria-label="Save plate">
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditPlate(false); setPlateDraft(''); }}
                  className="text-muted hover:text-cream"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditPlate(true); setPlateDraft(car.plateNumber || ''); }}
                className="inline-flex items-center gap-1.5 text-xs text-cream/70 hover:text-gold transition-colors mt-3"
              >
                <Pencil className="w-3 h-3" />
                {car.plateNumber ? `Plate: ${car.plateNumber}` : 'Add plate number'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Total visits" value={bookings.length} />
        <Stat
          label="Last visit"
          value={lastVisit ? formatDateLong(lastVisit.date) : '—'}
        />
        <Stat
          label="Latest condition"
          value={latestLog ? `${latestLog.overallRating}/10` : '—'}
        />
      </div>

      {/* Booking history */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-cream font-serif text-lg">
          <ClipboardList className="w-4 h-4 text-gold" />
          Visit history
        </div>
        {bookings.length === 0 ? (
          <div className="glass-card rounded-md p-8 text-center text-muted text-sm">
            No bookings recorded for this car yet.
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Link
                key={b.id}
                href={`/confirmation/${b.id}`}
                className="glass-card rounded-md p-4 flex items-start justify-between gap-4 hover:border-gold/30 transition-colors block"
              >
                <div className="min-w-0">
                  <div className="text-cream font-medium">{b.serviceName}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {formatDateLong(b.date)} · {b.time}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                      STATUS_STYLES[b.status] || 'bg-white/10 text-muted'
                    }`}
                  >
                    {b.status === 'no_show' ? 'no show' : b.status}
                  </span>
                  <span className="text-gold text-sm">{formatCurrency(b.servicePrice)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Condition history */}
      {logs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-cream font-serif text-lg">
            <Gauge className="w-4 h-4 text-gold" />
            Condition history
          </div>
          <div className="space-y-3">
            {logs.map((l) => (
              <div key={l.id} className="glass-card rounded-md p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-cream font-medium">
                    Overall {l.overallRating}/10
                  </div>
                  <div className="text-xs text-muted">
                    {formatDateLong(String(l.recordedAt).slice(0, 10))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-cream/70 mt-2">
                  {l.exteriorRating != null && <span>Exterior {l.exteriorRating}/10</span>}
                  {l.interiorRating != null && <span>Interior {l.interiorRating}/10</span>}
                  {l.mileage != null && <span>{l.mileage.toLocaleString()} km</span>}
                </div>
                {l.notes && (
                  <div className="text-xs text-muted mt-2 leading-relaxed">{l.notes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .portal-input {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: var(--color-cream);
          font-size: 14px;
        }
        .portal-input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}

export default function PortalCarDetailsPage() {
  return (
    <MemberRoute>
      <PortalLayout title="Car Details">
        <CarDetails />
      </PortalLayout>
    </MemberRoute>
  );
}
