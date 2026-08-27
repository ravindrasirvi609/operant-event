'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useAddExhibitorStaff } from '@/hooks/use-exhibitors';

export function AddStaffDialog({ conferenceId, exhibitorId }: { conferenceId: string; exhibitorId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const addStaff = useAddExhibitorStaff(conferenceId);

  async function handleAdd() {
    await addStaff.mutateAsync({ exhibitorId, name, email: email || undefined });
    setName('');
    setEmail('');
    setOpen(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Add staff
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add booth staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Name" htmlFor="staff-name">
              <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <FormField label="Email (optional)" htmlFor="staff-email">
              <Input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name.trim() || addStaff.isPending} onClick={handleAdd}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
