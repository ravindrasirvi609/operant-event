'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getDeviceId } from '@/lib/checkin/device-id';
import { resolveSearchIdentifier } from '@/lib/checkin/resolve-search-identifier';
import { useBarcodeDetectorSupported } from '@/lib/checkin/use-barcode-detector-supported';
import { CHECKIN_TYPES, type CheckinResult, type CheckinType } from '@/lib/checkin/types';
import type { CheckinInput } from '@/hooks/use-checkins';

const RESULT_DISMISS_MS = 4000;

type ResultState = { kind: 'success' | 'reused' | 'error'; message: string } | null;

interface CheckinScannerProps {
  conferenceId: string;
  onCheckIn: (input: CheckinInput) => Promise<CheckinResult>;
}

/**
 * SRS §36: manual search is always visible and fully functional on its
 * own — it never waits on, or depends on, camera permission. Camera-based
 * QR scanning (native `BarcodeDetector` API, where the browser supports
 * it) is a progressive enhancement layered on top; see `useQrScanner`.
 */
export function CheckinScanner({ conferenceId, onCheckIn }: CheckinScannerProps) {
  const [query, setQuery] = useState('');
  const [checkinType, setCheckinType] = useState<CheckinType>('MAIN_EVENT');
  const [allowReentry, setAllowReentry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, []);

  function showResult(next: ResultState) {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    setResult(next);
    dismissTimer.current = setTimeout(() => setResult(null), RESULT_DISMISS_MS);
  }

  async function submitCheckin(identifier: { email: string } | { registrationNumber: string } | { qrCode: string }) {
    setSubmitting(true);
    try {
      const response = await onCheckIn({
        conferenceId,
        checkinType,
        allowReentry,
        deviceId: getDeviceId(),
        ...identifier,
      });
      showResult(
        response.reused
          ? { kind: 'reused', message: 'Already checked in.' }
          : { kind: 'success', message: 'Checked in.' },
      );
      setQuery('');
    } catch (error) {
      showResult({ kind: 'error', message: error instanceof Error ? error.message : 'Check-in failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualSubmit() {
    if (!query.trim()) {
      return;
    }
    await submitCheckin(resolveSearchIdentifier(query));
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label htmlFor="checkin-type" className="flex flex-col gap-1 text-sm font-medium">
          Check-in type
          <select
            id="checkin-type"
            className="h-11 rounded-lg border border-input bg-transparent px-3 text-base"
            value={checkinType}
            onChange={(event) => setCheckinType(event.target.value as CheckinType)}
          >
            {CHECKIN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="allow-reentry" className="flex items-center gap-2 self-end text-sm font-medium">
          <input
            id="allow-reentry"
            type="checkbox"
            className="size-6"
            checked={allowReentry}
            onChange={(event) => setAllowReentry(event.target.checked)}
          />
          Allow re-entry
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="checkin-search" className="text-sm font-medium">
          Search by registration number or email
        </label>
        <div className="flex gap-2">
          <input
            id="checkin-search"
            className="h-14 flex-1 rounded-lg border border-input bg-transparent px-4 text-lg"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void handleManualSubmit();
              }
            }}
          />
          <Button
            type="button"
            className="h-14 px-6 text-lg"
            disabled={submitting || !query.trim()}
            onClick={() => void handleManualSubmit()}
          >
            Check in
          </Button>
        </div>
      </div>

      <QrCameraScanner onDetected={(qrCode) => void submitCheckin({ qrCode })} />

      {result ? (
        <div
          role={result.kind === 'error' ? 'alert' : 'status'}
          className={`flex flex-1 items-center justify-center rounded-lg p-8 text-center text-2xl font-semibold ${
            result.kind === 'error'
              ? 'bg-destructive/10 text-destructive'
              : result.kind === 'reused'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'bg-green-500/10 text-green-700 dark:text-green-400'
          }`}
        >
          {result.message}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Progressive enhancement only: uses the native `BarcodeDetector` API
 * when the browser exposes it (checked at render time — jsdom/older
 * browsers/Safari never define it, so this renders nothing and the
 * manual-search path above is completely unaffected). There is no
 * bundled fallback JS decoding library — pulling one in was judged not
 * worth the dependency weight for a feature that degrades to a fully
 * functional manual-search UI; this is a deliberate scope decision, not
 * an oversight.
 */
function QrCameraScanner({ onDetected }: { onDetected: (qrCode: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const supported = useBarcodeDetectorSupported();

  useEffect(() => {
    if (!supported || !videoRef.current) {
      return;
    }
    let stopped = false;
    let stream: MediaStream | undefined;
    const video = videoRef.current;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch {
        return;
      }
      if (stopped || !video) {
        return;
      }
      video.srcObject = stream;
      await video.play();

      type BarcodeDetectorLike = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
      const DetectorCtor = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
      const detector = new DetectorCtor({ formats: ['qr_code'] });

      const scan = async () => {
        if (stopped) {
          return;
        }
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            onDetected(codes[0].rawValue);
          }
        } catch {
          // Detection failing on a given frame is expected/transient — keep scanning.
        }
        requestAnimationFrame(() => void scan());
      };
      void scan();
    }

    void start();

    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [supported, onDetected]);

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Camera QR scanning isn&apos;t supported in this browser — use manual search above.
      </p>
    );
  }

  return <video ref={videoRef} muted playsInline className="w-full max-w-sm rounded-lg" />;
}
