'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  /** SRS §35: high-impact/irreversible actions (refund, decision recording) require typing this string. */
  requireTypedConfirmation?: string;
  isConfirming?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  requireTypedConfirmation,
  isConfirming = false,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const typedConfirmationSatisfied = !requireTypedConfirmation || typedValue === requireTypedConfirmation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {requireTypedConfirmation ? (
          <div className="space-y-2">
            <label htmlFor="confirm-typed-value" className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold">{requireTypedConfirmation}</span> to confirm.
            </label>
            <Input
              id="confirm-typed-value"
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!typedConfirmationSatisfied || isConfirming}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
