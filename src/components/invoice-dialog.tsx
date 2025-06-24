
"use client";

import { useState, useMemo } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FileText, FileDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const GST_RATE = 0.18; // 18%

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: Product[] }) => void;
};

export default function InvoiceDialog({ products, onCreateInvoice }: InvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const { toast } = useToast();

  const invoiceDetails = useMemo(() => {
    const subtotal = products.reduce((acc, p) => acc + (p.price || 0), 0);
    const gstAmount = subtotal * GST_RATE;
    const grandTotal = subtotal + gstAmount;
    return { subtotal, gstAmount, grandTotal };
  }, [products]);

  const invoiceId = useMemo(() => `INV-${Date.now()}`, [open]);

  const handleDownloadPdf = async () => {
    const input = document.getElementById('invoice-content');
    if (!input) {
      toast({ title: "Error", description: "Could not find invoice content to generate PDF.", variant: "destructive"});
      return;
    };
    
    const noPrintElements = input.querySelectorAll('.no-print');
    noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');
    
    const originalStyle = input.getAttribute('style');

    try {
        // Temporarily apply a fixed width to ensure the layout is consistent for the PDF,
        // regardless of the screen size. This forces a desktop-like layout for the capture.
        input.style.width = '794px'; // Standard A4 width in pixels.

        const canvas = await html2canvas(input, { 
          scale: 2,
          windowWidth: input.scrollWidth,
          windowHeight: input.scrollHeight,
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`invoice-${invoiceId}.pdf`);
    } catch(e) {
        toast({ title: "PDF Generation Failed", variant: "destructive" });
    } finally {
        noPrintElements.forEach(el => (el as HTMLElement).style.display = '');
        // Restore original styles
        if (originalStyle) {
          input.setAttribute('style', originalStyle);
        } else {
          input.removeAttribute('style');
        }
    }
  };

  const handleCreateAndDownloadPdf = async () => {
    if (!customerName || !customerPhone) {
        toast({ title: "Missing Information", description: "Please enter customer name and phone number.", variant: "destructive" });
        return;
    }
    onCreateInvoice({
        customerName,
        customerPhone,
        items: products,
    });
    
    await handleDownloadPdf();

    setOpen(false);
    setCustomerName('');
    setCustomerPhone('');
  }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={products.length === 0}>
          <FileText className="mr-2 h-4 w-4" />
          Create Invoice ({products.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Invoice</DialogTitle>
        <DialogDescription className="sr-only">A printable invoice for the selected products.</DialogDescription>
        <div id="invoice-content" className="print:bg-white print:text-black p-2">
          <DialogHeader className="mb-6">
             <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-primary">ROOPKOTHA</h1>
                  <p className="text-muted-foreground">Sales & Management</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold">INVOICE</h2>
                    <p className="text-sm text-muted-foreground">{invoiceId}</p>
                    <p className="text-sm text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
            <Separator className="my-4" />
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <h3 className="font-semibold mb-2">Bill To:</h3>
                    <p>{customerName || 'Customer Name'}</p>
                    <p>{customerPhone || 'Customer Phone'}</p>
                </div>
                <div className="text-right">
                    <h3 className="font-semibold mb-2">From:</h3>
                    <p>Roopkotha Fashion Private Limited</p>
                    <p>123 Fictional Street</p>
                    <p>City, State, 12345</p>
                </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 no-print my-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="123-456-7890" />
              </div>
            </div>
          </div>
          <div className="my-4 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[100px] text-center">Quantity</TableHead>
                  <TableHead className="w-[100px] text-right">Price</TableHead>
                  <TableHead className="w-[100px] text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-center">1</TableCell>
                    <TableCell className="text-right">₹{p.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{p.price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">Subtotal</TableCell>
                    <TableCell className="text-right font-medium">₹{invoiceDetails.subtotal.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">GST ({GST_RATE * 100}%)</TableCell>
                    <TableCell className="text-right font-medium">₹{invoiceDetails.gstAmount.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="text-lg font-bold bg-muted/50">
                    <TableCell colSpan={3} className="text-right">Grand Total</TableCell>
                    <TableCell className="text-right">₹{invoiceDetails.grandTotal.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
           <div className="text-center text-xs text-muted-foreground mt-6">
                <p>Thank you for your business!</p>
            </div>
        </div>
        <DialogFooter className="sm:justify-end no-print">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateAndDownloadPdf} className="bg-accent hover:bg-accent/90">
            <FileDown className="mr-2 h-4 w-4" />
            Process Sale & Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
