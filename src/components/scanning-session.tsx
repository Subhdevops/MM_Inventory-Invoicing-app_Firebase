
'use client';

import { useMemo } from 'react';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Trash2, FileText, Tags, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ScanningSessionProps {
  scannedProducts: Product[];
  onClear: () => void;
  onOpenInvoiceDialog: (products: Product[]) => void;
  onOpenBulkEditDialog: (products: Product[]) => void;
  onBulkRemove: (productIds: string[]) => void;
  onGenerateTags: (products: Product[]) => void;
}

export function ScanningSession({
  scannedProducts,
  onClear,
  onOpenInvoiceDialog,
  onOpenBulkEditDialog,
  onBulkRemove,
  onGenerateTags,
}: ScanningSessionProps) {
  const summary = useMemo(() => {
    const counts: Record<string, { product: Product; count: number }> = {};
    for (const product of scannedProducts) {
      if (counts[product.id]) {
        counts[product.id].count++;
      } else {
        counts[product.id] = { product, count: 1 };
      }
    }
    return Object.values(counts).sort((a,b) => a.product.name.localeCompare(b.product.name));
  }, [scannedProducts]);

  if (scannedProducts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Scanning Session</h2>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
                <CardTitle>Scanned Items ({scannedProducts.length})</CardTitle>
                <CardDescription>Items added via camera or keyboard scanner.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClear}>
                <X className="h-5 w-5" />
                <span className="sr-only">Clear Session</span>
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2 pr-4">
                {summary.map(({ product, count }) => (
                  <div key={product.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Barcode: {product.barcode}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-lg font-bold">x {count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex-wrap justify-end gap-2">
             <Button variant="outline" onClick={() => onGenerateTags(scannedProducts)}>
                <Tags className="mr-2 h-4 w-4" />
                Generate Tags
             </Button>
             <Button variant="outline" onClick={() => onOpenBulkEditDialog(scannedProducts)}>
                <Pencil className="mr-2 h-4 w-4" />
                Bulk Edit
             </Button>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove from Inventory
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently remove {scannedProducts.length} item(s) from your inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => onBulkRemove(scannedProducts.map(p => p.id))}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
             <Button onClick={() => onOpenInvoiceDialog(scannedProducts)}>
                <FileText className="mr-2 h-4 w-4" />
                Create Invoice
             </Button>
          </CardFooter>
        </Card>
    </section>
  );
}
