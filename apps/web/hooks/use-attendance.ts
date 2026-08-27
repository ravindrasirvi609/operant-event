'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import type { AttendanceWithDetail } from '@/lib/checkin/types';

/** Whole-conference flat list — no pagination, no per-registration/per-session filtering despite the model supporting it. */
export function useAttendance(conferenceId: string) {
  return useQuery({
    queryKey: ['conferences', conferenceId, 'attendance'],
    queryFn: () => apiGet<AttendanceWithDetail[]>(`conferences/${conferenceId}/attendance`),
    enabled: Boolean(conferenceId),
  });
}
