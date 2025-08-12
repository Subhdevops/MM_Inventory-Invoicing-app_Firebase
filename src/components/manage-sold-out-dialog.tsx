
'use client';

import { useState } from 'react';
import type { Product } from '@/lib/types';
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
import { ArchiveRestore, Trash2, Loader2 } from 'lucide-react';
import { RestockDialog } from './restock-dialog';

type ManageSoldOutDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  soldProducts: Product[];
  onRestock: (productData: Omit<Product, 'id' | 'isSold'>) => Promise<void>;
  onDeleteAllSoldOut: () => Promise<void>;
};

export default function ManageSoldOutDialog({ isOpen, onOpenChange, soldProducts, onRestock, onDeleteAllSoldOut }: ManageSoldOutDialogProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [productToRestock, setProductToRestock] = useState<Product | null>(null);

  const handleDeleteAll = async () => {
    setIsProcessing(true);
    await onDeleteAllSoldOut();
    setIsProcessing(false);
    setIsDeleteConfirmOpen(false);
    onOpenChange(false);
  };
  
  const handleRestock = async (newProductData: Omit<Product, 'id' | 'isSold'>) => {
    await onRestock(newProductData);
    setProductToRestock(null); // Close the restock dialog
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Sold Out Items</DialogTitle>
            <DialogDescription>
              Restock an item by creating a new inventory entry for it, or delete all sold items. These actions do not affect past invoices.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Unique Code</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soldProducts.length > 0 ? soldProducts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="font-mono">{p.uniqueProductCode}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setProductToRestock(p)}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">No sold items to manage.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          <DialogFooter className="pt-4 border-t justify-between shrink-0">
            <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)} disabled={soldProducts.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Sold Items
            </Button>
            <DialogClose asChild>
                <Button variant="ghost">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {productToRestock && (
        <RestockDialog
            isOpen={!!productToRestock}
            onOpenChange={(open) => !open && setProductToRestock(null)}
            product={productToRestock}
            onRestock={handleRestock}
        />
      )}
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {soldProducts.length} sold out items from your inventory. This action cannot be undone and does not affect your sales records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteAll}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isProcessing ? 'Deleting...' : 'Confirm Deletion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
