
'use client';

import { useState, useMemo } from 'react';
import type { Product, Invoice, SoldProduct } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Undo, Loader2 } from 'lucide-react';

type ManageSoldOutDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  soldProducts: Product[];
  invoices: Invoice[];
  onReturnItemToStock: (productId: string) => Promise<void>;
};

export default function ManageSoldOutDialog({ isOpen, onOpenChange, soldProducts, invoices, onReturnItemToStock }: ManageSoldOutDialogProps) {
  const [productToReturn, setProductToReturn] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const productDetails = useMemo(() => {
    const invoiceMap = new Map<string, Invoice>();
    invoices.forEach(inv => {
        if (inv.type === 'standard') {
            (inv.items as SoldProduct[]).forEach(item => {
                invoiceMap.set(item.id, inv);
            });
        }
    });

    return soldProducts.map(p => ({
      ...p,
      invoice: invoiceMap.get(p.id),
    }));
  }, [soldProducts, invoices]);

  const handleReturnClick = (product: Product) => {
    setProductToReturn(product);
  };

  const handleConfirmReturn = async () => {
    if (!productToReturn) return;
    setIsProcessing(true);
    await onReturnItemToStock(productToReturn.id);
    setIsProcessing(false);
    setProductToReturn(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Sold Out Items</DialogTitle>
            <DialogDescription>
              Return items to stock if a sale was made by mistake. This will update the original invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Unique Code</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productDetails.length > 0 ? productDetails.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="font-mono">{p.uniqueProductCode}</TableCell>
                      <TableCell>{p.invoice?.invoiceNumber || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturnClick(p)}
                          disabled={!p.invoice}
                        >
                          <Undo className="mr-2 h-4 w-4" />
                          Return to Stock
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">No sold items to manage.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="ghost">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!productToReturn} onOpenChange={(open) => !open && setProductToReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return Item to Stock?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{productToReturn?.name}" from invoice #{productToReturn && productDetails.find(p => p.id === productToReturn.id)?.invoice?.invoiceNumber} and mark it as available. The invoice totals will be recalculated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmReturn}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isProcessing ? 'Processing...' : 'Confirm Return'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
