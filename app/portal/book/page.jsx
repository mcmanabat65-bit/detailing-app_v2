'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { MemberRoute } from '@/components/MemberRoute';
import { PortalLayout } from '@/components/PortalLayout';
import { BookingFlow } from '@/components/booking/BookingFlow';

function PortalBook() {
  const { currentMember } = useApp();
  const router = useRouter();
  return (
    <Suspense fallback={null}>
      <BookingFlow
        member={currentMember}
        onComplete={() => router.push('/portal/bookings')}
      />
    </Suspense>
  );
}

export default function PortalBookPage() {
  return (
    <MemberRoute>
      <PortalLayout title="Book a Detail">
        <PortalBook />
      </PortalLayout>
    </MemberRoute>
  );
}
