
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Product, SoldProduct } from '@/lib/types';
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

const GST_RATE = 0.05; // 5%

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: SoldProduct[] }) => void;
};

type InvoiceItem = {
    id: string;
    name: string;
    price: number;
    stock: number;
    quantity: number;
};

export default function InvoiceDialog({ products, onCreateInvoice }: InvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const { toast } = useToast();
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    if (open) {
      setItems(products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.quantity,
        quantity: p.quantity > 0 ? 1 : 0,
      })));
    }
  }, [products, open]);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    setItems(currentItems => currentItems.map(item => {
      if (item.id === id) {
        const validatedQuantity = Math.max(1, Math.min(newQuantity || 1, item.stock));
        return { ...item, quantity: validatedQuantity };
      }
      return item;
    }));
  };

  const invoiceDetails = useMemo(() => {
    const subtotal = items.reduce((acc, p) => acc + (p.price || 0) * p.quantity, 0);
    const gstAmount = subtotal * GST_RATE;
    const grandTotal = subtotal + gstAmount;
    return { subtotal, gstAmount, grandTotal };
  }, [items]);

  const invoiceId = useMemo(() => `INV-${Date.now()}`, [open]);

  const handleDownloadPdf = async () => {
    const input = document.getElementById('invoice-content');
    if (!input) {
      toast({ title: "Error", description: "Could not find invoice content to generate PDF.", variant: "destructive"});
      return;
    };
    
    const noPrintElements = input.querySelectorAll('.no-print');
    noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');
    
    const printElements = input.querySelectorAll('.print-only');
    printElements.forEach(el => (el as HTMLElement).style.display = 'block');
    
    const originalStyle = input.getAttribute('style');

    try {
        input.style.width = '794px'; 

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
        printElements.forEach(el => (el as HTMLElement).style.display = 'none');
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

    const itemsToInvoice = items
        .filter(item => item.quantity > 0)
        .map(({ id, name, price, quantity }) => ({ id, name, price, quantity }));

    if (itemsToInvoice.length === 0) {
        toast({ title: "No Items", description: "Please add at least one item with a quantity greater than 0.", variant: "destructive" });
        return;
    }

    onCreateInvoice({
        customerName,
        customerPhone,
        items: itemsToInvoice,
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Invoice</DialogTitle>
        <DialogDescription className="sr-only">A printable invoice for the selected products.</DialogDescription>
        <div id="invoice-content" className="print:bg-white print:text-black p-6 space-y-8">
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">ROOPKOTHA</h1>
              <p className="text-muted-foreground">Sales & Management</p>
            </div>
            <div className="text-right">
                <h2 className="text-2xl font-bold tracking-wider">INVOICE</h2>
                <p className="text-sm text-muted-foreground">{invoiceId}</p>
                <p className="text-sm text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </header>
          
          <Separator />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-2">
                <h3 className="font-semibold mb-2">Bill To:</h3>
                 <div className="space-y-4 no-print">
                    <div>
                      <Label htmlFor="customerName" className="text-xs text-muted-foreground">Customer Name</Label>
                      <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone" className="text-xs text-muted-foreground">Customer Phone</Label>
                      <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="123-456-7890" />
                    </div>
                  </div>
                 <div className="print-only hidden text-sm pt-2">
                    <p>{customerName || '____________________'}</p>
                    <p>{customerPhone || '____________________'}</p>
                </div>
            </div>
            <div className="text-right space-y-1 text-sm">
                <h3 className="font-semibold mb-2">From:</h3>
                <p className="font-bold">Roopkotha</p>
                <p>Professor Colony, C/O, Deshbandhu Pal</p>
                <p>Holding No :- 195/8, Ward no. 14</p>
                <p>Bolpur, Birbhum, West Bengal - 731204</p>
                <p><span className="font-semibold">GSTIN:</span> 19AANCR9537M1ZC</p>
                <p><span className="font-semibold">Phone:</span> 9476468690</p>
            </div>
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[50%]">Product</TableHead>
                  <TableHead className="w-[120px] text-center">Quantity</TableHead>
                  <TableHead className="w-[120px] text-right">Price</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center no-print">
                        <Input
                            type="number"
                            className="w-20 mx-auto text-center h-8"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10))}
                            onBlur={(e) => {
                              if (!e.target.value) {
                                handleQuantityChange(item.id, 1);
                              }
                            }}
                            min="1"
                            max={item.stock}
                            disabled={item.stock === 0}
                        />
                    </TableCell>
                     <TableCell className="text-center print-only hidden">{item.quantity}</TableCell>
                    <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
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
                <TableRow className="text-lg font-bold bg-primary text-primary-foreground hover:bg-primary">
                    <TableCell colSpan={3} className="text-right">Grand Total</TableCell>
                    <TableCell className="text-right">₹{invoiceDetails.grandTotal.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-6">
                <p className="font-semibold">Thank you for shopping with us!</p>
            </div>
        </div>
        <DialogFooter className="sm:justify-end no-print p-6 pt-0">
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
