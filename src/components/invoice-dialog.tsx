
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
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RoopkothaLogo from './icons/roopkotha-logo';

const GST_RATE = 0.05; // 5%

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: Omit<SoldProduct, 'name'>[] }) => Promise<string>;
};

type InvoiceItem = {
    id: string;
    name: string;
    price: number;
    cost: number;
    stock: number;
    quantity: number;
};

export default function InvoiceDialog({ products, onCreateInvoice }: InvoiceDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const { toast } = useToast();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setCustomerName('');
      setCustomerPhone('');
      setIsProcessing(false);
      setItems(products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        cost: p.cost,
        stock: p.quantity,
        quantity: p.quantity > 0 ? 1 : 0,
      })));
    }
  }, [products, open]);

  const handleQuantityChange = (id: string, newQuantity: number) => {
    setItems(currentItems => currentItems.map(item => {
      if (item.id === id) {
        const validatedQuantity = Math.max(0, Math.min(newQuantity || 0, item.stock));
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

  const invoiceId = useMemo(() => `INV-${Date.now()}`, []);
  const hasItemsToInvoice = useMemo(() => items.some(item => item.quantity > 0), [items]);

  const handleProcessSale = async () => {
    if (!customerName || !customerPhone) {
        toast({ title: "Missing Information", description: "Please enter customer name and phone number.", variant: "destructive" });
        return;
    }
    
    if (!/^\d{10}$/.test(customerPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Phone number must be exactly 10 digits.",
        variant: "destructive",
      });
      return;
    }
    
    const itemsToInvoice = items
        .filter(item => item.quantity > 0)
        .map(({ id, price, quantity, cost }) => ({ id, price, quantity, cost }));

    if (itemsToInvoice.length === 0) {
        toast({ title: "No Items", description: "Add at least one item with a quantity greater than 0.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    
    try {
        const invoiceData = { customerName, customerPhone, items: itemsToInvoice };
        const newInvoiceId = await onCreateInvoice(invoiceData as any);
        
        const invoiceElement = document.getElementById('invoice-content');
        if (!invoiceElement) {
            throw new Error("Could not find invoice content.");
        }

        // --- Start of PDF Generation Logic ---
        const clonedInvoice = invoiceElement.cloneNode(true) as HTMLElement;

        // Replace inputs with static text for PDF
        const customerNameInput = clonedInvoice.querySelector<HTMLInputElement>('#customerName');
        if (customerNameInput) {
            const p = document.createElement('p');
            p.textContent = customerName;
            p.className = 'text-sm';
            customerNameInput.parentElement?.replaceWith(p);
        }

        const customerPhoneInput = clonedInvoice.querySelector<HTMLInputElement>('#customerPhone');
        if (customerPhoneInput) {
            const p = document.createElement('p');
            p.textContent = customerPhone;
            p.className = 'text-sm';
            customerPhoneInput.parentElement?.replaceWith(p);
        }

        const itemRows = clonedInvoice.querySelectorAll<HTMLTableRowElement>('tbody tr');
        itemRows.forEach((row, index) => {
            const item = items[index];
            const quantityInput = row.querySelector<HTMLInputElement>('.quantity-input');
            const quantityCell = quantityInput?.parentElement;

            if (quantityCell && item) {
                const p = document.createElement('p');
                p.textContent = String(item.quantity);
                p.className = 'text-center text-sm';
                quantityCell.innerHTML = '';
                quantityCell.appendChild(p);
            }
        });

        clonedInvoice.style.position = 'absolute';
        clonedInvoice.style.left = '-9999px';
        clonedInvoice.style.width = '800px'; 
        document.body.appendChild(clonedInvoice);
        
        const canvas = await html2canvas(clonedInvoice, { scale: 2, backgroundColor: '#ffffff' });
        
        document.body.removeChild(clonedInvoice);
        // --- End of PDF Generation Logic ---

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${newInvoiceId}.pdf`);
        
        setOpen(false);

    } catch (error) {
        console.error("Processing failed:", error);
        toast({ title: "Processing Failed", description: "Could not create invoice or generate PDF.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={products.length === 0 || products.every(p => p.quantity === 0)}>
          <FileText className="mr-2 h-4 w-4" />
          Create Invoice ({products.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Fill in the customer details and confirm the items to generate an invoice PDF.
          </DialogDescription>
        </DialogHeader>
        <div id="invoice-content" className="p-8 border rounded-lg bg-white text-black">
            <header className="flex items-center justify-between pb-6 border-b">
              <div className="flex items-center gap-4">
                <RoopkothaLogo />
              </div>
              <div className="text-right">
                  <h1 className="text-3xl font-bold text-primary tracking-tight">INVOICE</h1>
                  <p className="text-sm text-gray-500">{invoiceId}</p>
              </div>
            </header>
            
            <section className="grid grid-cols-2 gap-8 my-6">
                 <div className="space-y-4">
                     <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Bill To</h2>
                     <div className="space-y-1">
                         <Label htmlFor="customerName" className="text-xs">Customer Name</Label>
                         <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" className="bg-gray-50" />
                     </div>
                     <div className="space-y-1">
                         <Label htmlFor="customerPhone" className="text-xs">Customer Phone</Label>
                         <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="1234567890" className="bg-gray-50"/>
                     </div>
                 </div>
                 <div className="text-right space-y-1">
                     <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">From</h2>
                     <p className="font-bold text-primary">Roopkotha</p>
                     <p className="text-xs text-gray-500">Professor Colony, C/O, Deshbandhu Pal</p>
                     <p className="text-xs text-gray-500">Holding No :- 195/8, Ward no. 14</p>
                     <p className="text-xs text-gray-500">Bolpur, Birbhum, West Bengal - 731204</p>
                     <p className="text-xs text-gray-500"><span className="font-semibold">GSTIN:</span> 19AANCR9537M1ZC</p>
                     <p className="text-xs text-gray-500"><span className="font-semibold">Phone:</span> 9476468690</p>
                 </div>
            </section>
            
            <section className="border border-gray-200 rounded-lg overflow-hidden mt-6">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[50%] px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product</TableHead>
                    <TableHead className="w-[120px] px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Quantity</TableHead>
                    <TableHead className="w-[120px] px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Price</TableHead>
                    <TableHead className="w-[120px] px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => (
                    <TableRow key={item.id} className="border-b border-gray-100">
                      <TableCell className="font-medium px-4 py-3">{item.name}</TableCell>
                      <TableCell className="px-4 py-3">
                          <Input
                              type="number"
                              className="w-20 mx-auto text-center h-8 bg-gray-50 quantity-input"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10))}
                              onBlur={(e) => {
                                if (!e.target.value) {
                                  handleQuantityChange(item.id, 0);
                                }
                              }}
                              min="0"
                              max={item.stock}
                              disabled={item.stock === 0}
                          />
                      </TableCell>
                      <TableCell className="text-right px-4 py-3">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium px-4 py-3">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium px-4 py-2">Subtotal</TableCell>
                      <TableCell className="text-right font-medium px-4 py-2">₹{invoiceDetails.subtotal.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium px-4 py-2">GST ({GST_RATE * 100}%)</TableCell>
                      <TableCell className="text-right font-medium px-4 py-2">₹{invoiceDetails.gstAmount.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/10 font-bold">
                      <TableCell colSpan={3} className="text-right text-primary text-base px-4 py-3">Grand Total</TableCell>
                      <TableCell className="text-right text-primary text-base px-4 py-3">₹{invoiceDetails.grandTotal.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </section>
            <footer className="text-center text-sm text-gray-500 pt-8 mt-8 border-t">
                  <p className="font-semibold">Thank you for your business!</p>
                  <p>where fashion meets fairytale</p>
            </footer>
        </div>
        
        <DialogFooter className="sm:justify-end pt-4">
            <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleProcessSale} className="bg-accent hover:bg-accent/90" disabled={!customerName || !customerPhone || !hasItemsToInvoice || isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Processing...' : 'Process & Download PDF'}
                </Button>
            </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
