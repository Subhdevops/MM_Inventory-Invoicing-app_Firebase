
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, QrCode } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';

const restockSchema = z.object({
  uniqueProductCode: z.string().min(1, { message: 'New Unique Product Code cannot be empty.' }),
});

type RestockDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onRestock: (newUniqueProductCode: string) => Promise<void>;
};

export function RestockDialog({ isOpen, onOpenChange, product, onRestock }: RestockDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const form = useForm<z.infer<typeof restockSchema>>({
    resolver: zodResolver(restockSchema),
    defaultValues: { uniqueProductCode: '' },
  });
  
  useBarcodeScanner(
    (barcode) => {
        form.setValue('uniqueProductCode', barcode, { shouldValidate: true });
    },
    { enabled: isOpen }
  );
  
  useEffect(() => {
    if(isOpen) {
        // Pre-fill the form with the original code
        form.reset({ uniqueProductCode: product.uniqueProductCode });
    } else {
        form.reset({ uniqueProductCode: '' });
    }
  }, [isOpen, product, form]);

  const onSubmit = async (values: z.infer<typeof restockSchema>) => {
    setIsProcessing(true);
    try {
      await onRestock(values.uniqueProductCode);
      onOpenChange(false);
    } catch (error) {
      // Toast is handled by the parent component
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Restock Product</DialogTitle>
          <DialogDescription>
            To restock this item, re-enter its original code. To create a new item with the same details, enter a new unique code.
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm space-y-2 py-4">
            <p><span className="font-semibold">Product Name:</span> {product.name}</p>
            <p><span className="font-semibold">Original Code:</span> <span className="font-mono bg-muted px-1 py-0.5 rounded">{product.uniqueProductCode}</span></p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="uniqueProductCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unique Product Code</FormLabel>
                  <FormControl>
                    <div className="relative">
                        <Input placeholder="Scan or enter unique code" {...field} />
                        <QrCode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isProcessing}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Restock
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
