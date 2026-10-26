
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { getDeviceId } from '@/lib/checkin/device-id';
import { resolveSearchIdentifier } from '@/lib/checkin/resolve-search-identifier';
import {
  CHECKIN_TYPES,
  type CheckinResult,
  type CheckinType,
} from '@/lib/checkin/types';
import type { CheckinInput } from '@/hooks/use-checkins';

const RESULT_DISMISS_MS = 4000;

type ResultState = {
  kind: 'success' | 'reused' | 'error';
  message: string;
} | null;

interface CheckinScannerProps {
  conferenceId: string;
  onCheckIn: (input: CheckinInput) => Promise<CheckinResult>;
}

export function CheckinScanner({
  conferenceId,
  onCheckIn,
}: CheckinScannerProps) {
  const [query, setQuery] = useState('');
  const [checkinType, setCheckinType] =
    useState<CheckinType>('MAIN_EVENT');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);

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

    dismissTimer.current = setTimeout(() => {
      setResult(null);
    }, RESULT_DISMISS_MS);
  }

  async function submitCheckin(
    identifier:
      | { email: string }
      | { registrationNumber: string }
      | { qrCode: string },
  ) {
    if (submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const response = await onCheckIn({
        conferenceId,
        checkinType,
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
      showResult({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Check-in failed.',
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleManualSubmit() {
    if (!query.trim() || submittingRef.current) {
      return;
    }

    await submitCheckin(resolveSearchIdentifier(query));
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 p-4">
      <div>
  <Button
    type="button"
    variant="outline"
    onClick={() => window.history.back()}
  >
    ← Back to Check-ins
  </Button>
</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label
          htmlFor="checkin-type"
          className="flex flex-col gap-1 text-sm font-medium"
        >
          Check-in type
          <select
            id="checkin-type"
            className="h-11 rounded-lg border border-input bg-transparent px-3 text-base"
            value={checkinType}
            onChange={(event) =>
              setCheckinType(event.target.value as CheckinType)
            }
          >
            {CHECKIN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="checkin-search"
          className="text-sm font-medium"
        >
          Search by registration number or email
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="checkin-search"
            className="h-14 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-4 text-lg"
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

      <QrCameraScanner
        disabled={submitting}
        onDetected={(qrCode) => {
          void submitCheckin({ qrCode });
        }}
      />

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

function QrCameraScanner({
  onDetected,
  disabled,
}: {
  onDetected: (qrCode: string) => void;
  disabled: boolean;
}) {
  const generatedId = useId();
  const elementId = `qr-scanner-${generatedId.replace(/:/g, '')}`;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onDetectedRef = useRef(onDetected);
  const detectedRef = useRef(false);
  const startingRef = useRef(false);

  const [active, setActive] = useState(false);
  const [detected, setDetected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner?.isScanning) {
        void scanner
          .stop()
          .catch(() => undefined)
          .finally(() => {
            try {
              scanner.clear();
            } catch {
              // The scanner may already have been cleared.
            }
          });
      } else if (scanner) {
        try {
          scanner.clear();
        } catch {
          // Safe cleanup when the scanner is not running.
        }
      }
    };
  }, []);

  async function startScanner() {
    if (startingRef.current || scannerRef.current) {
      return;
    }

    startingRef.current = true;
    detectedRef.current = false;
    setDetected(false);
    setCameraError(null);

    let scanner: Html5Qrcode | null = null;

    try {
      scanner = new Html5Qrcode(elementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (detectedRef.current) {
            return;
          }

          detectedRef.current = true;
          setDetected(true);
          onDetectedRef.current(decodedText);
        },
        () => {
          // No QR in the current frame is normal while scanning.
        },
      );

      setActive(true);
    } catch (error) {
      scannerRef.current = null;

      if (scanner) {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          scanner.clear();
        } catch {
          // Ignore cleanup errors after camera startup failure.
        }
      }

      setCameraError(
        error instanceof Error
          ? error.message
          : 'Camera could not be started. Check camera permission and try again.',
      );
    } finally {
      startingRef.current = false;
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;

    if (!scanner) {
      setActive(false);
      return;
    }

    scannerRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      // Continue cleanup even if the camera has already stopped.
    }

    try {
      scanner.clear();
    } catch {
      // The scanner may already have been cleared.
    }

    detectedRef.current = false;
    setDetected(false);
    setActive(false);
  }

  async function scanAgain() {
    await stopScanner();
    setCameraError(null);
    await startScanner();
  }

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">QR code scanner</h2>

        {!active ? (
          <Button
            type="button"
            onClick={() => void startScanner()}
            disabled={disabled}
          >
            Open camera
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => void stopScanner()}
          >
            Stop camera
          </Button>
        )}
      </div>

      <div
        id={elementId}
        className="w-full max-w-lg overflow-hidden rounded-lg"
      />

      {active ? (
        <p className="text-sm text-muted-foreground">
          Camera is active. Point it at the participant&apos;s QR code.
        </p>
      ) : null}

      {cameraError ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-destructive">
            Camera could not start: {cameraError}
          </p>
          <p className="text-sm text-muted-foreground">
            Allow camera access in your browser settings. Camera access
            usually requires localhost or a secure HTTPS connection.
            Manual check-in remains available above.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void startScanner()}
            disabled={disabled}
          >
            Try camera again
          </Button>
        </div>
      ) : null}

      {active && detected ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void scanAgain()}
          disabled={disabled}
        >
          Scan next participant
        </Button>
      ) : null}
    </section>
  );
}
