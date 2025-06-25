
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Rewind } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ResetInvoiceNumberDialogProps = {
  onReset: (newStartNumber?: number) => Promise<void>;
  disabled: boolean;
};

const DEFAULT_INVOICE_START_NUMBER = 20250600001;

export default function ResetInvoiceNumberDialog({ onReset, disabled }: ResetInvoiceNumberDialogProps) {
  const [open, setOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [customNumber, setCustomNumber] = useState('');
  const [resetAction, setResetAction] = useState<'default' | 'custom' | null>(null);
  const { toast } = useToast();

  const handleTriggerReset = (action: 'default' | 'custom') => {
    if (action === 'custom' && (!customNumber || isNaN(Number(customNumber)))) {
      toast({
        title: 'Invalid Number',
        description: 'Please enter a valid starting number.',
        variant: 'destructive',
      });
      return;
    }
    setResetAction(action);
    setIsConfirmOpen(true);
  };

  const handleConfirmReset = async () => {
    try {
      if (resetAction === 'default') {
        await onReset(DEFAULT_INVOICE_START_NUMBER);
      } else if (resetAction === 'custom') {
        const num = Number(customNumber);
        await onReset(num);
      }
    } catch (error) {
      // The error toast is handled in the parent function
    } finally {
      setIsConfirmOpen(false);
      setOpen(false);
      setCustomNumber('');
      setResetAction(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={disabled}>
            <Rewind className="mr-2 h-4 w-4" />
            Reset Invoice Counter
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Invoice Counter</DialogTitle>
            <DialogDescription>
              This action will change the starting number for future invoices. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-invoice-number">Set Custom Start Number</Label>
              <Input
                id="custom-invoice-number"
                type="number"
                placeholder="e.g. 20250600100"
                value={customNumber}
                onChange={(e) => setCustomNumber(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => handleTriggerReset('custom')}
              disabled={!customNumber}
            >
              Set Custom Start Number
            </Button>
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
            </div>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleTriggerReset('default')}
            >
              Reset to Default ({DEFAULT_INVOICE_START_NUMBER})
            </Button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the invoice numbering sequence. This action is not recommended unless you are starting a new financial year or fixing a sequence error.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmReset}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
