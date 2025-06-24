"use client";

import { useState } from 'react';
import type { Product } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { FileText, Printer } from 'lucide-react';

type InvoiceDialogProps = {
  products: Product[];
  onInvoiceCreate: () => void;
};

export default function InvoiceDialog({ products, onInvoiceCreate }: InvoiceDialogProps) {
  const [open, setOpen] = useState(false);

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-content');
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      printWindow?.document.write('<html><head><title>Invoice</title>');
      
      // Link to the main stylesheet to get Tailwind styles
      const styles = Array.from(document.styleSheets)
        .map(s => s.href ? `<link rel="stylesheet" href="${s.href}">` : '')
        .join('');
      printWindow?.document.write(styles);

      printWindow?.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } }</style></head><body>');
      printWindow?.document.write(printContent.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      
      // Use a timeout to ensure styles are loaded before printing
      setTimeout(() => {
        printWindow?.print();
        printWindow?.close();
      }, 500);
    }
  };

  const handleCreateAndPrint = () => {
    onInvoiceCreate();
    handlePrint();
    setOpen(false);
  }

  const total = products.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Create Invoice ({products.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <div id="invoice-content" className="print:bg-white print:text-black">
          <DialogHeader>
            <DialogTitle className="text-2xl">Invoice</DialogTitle>
            <DialogDescription>
              Date: {new Date().toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">1</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total Items</TableCell>
                  <TableCell className="text-right font-bold">{total}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>
        <DialogFooter className="sm:justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateAndPrint} className="bg-accent hover:bg-accent/90">
            <Printer className="mr-2 h-4 w-4" />
            Process Sale & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
