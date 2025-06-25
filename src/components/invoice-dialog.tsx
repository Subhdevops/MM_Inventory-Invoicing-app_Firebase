
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import type { Product, SoldProduct, Invoice } from '@/lib/types';
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
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RoopkothaLogo from './icons/roopkotha-logo';
import { db } from '@/lib/firebase';
import { runTransaction, doc, collection, serverTimestamp } from 'firebase/firestore';

const GST_RATE = 0.05; // 5%

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: Omit<SoldProduct, 'name' | 'id'>[] }) => Promise<string>;
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
  const [finalInvoiceData, setFinalInvoiceData] = useState<Invoice | null>(null);

  useEffect(() => {
    if (open) {
      setCustomerName('');
      setCustomerPhone('');
      setIsProcessing(false);
      setFinalInvoiceData(null);
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

  useEffect(() => {
    const generatePdf = async () => {
      if (!finalInvoiceData) return;

      const invoiceElement = document.getElementById('invoice-pdf-content');
      if (!invoiceElement) {
        toast({ title: "PDF Error", description: "Could not find invoice content to generate PDF.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      try {
        const canvas = await html2canvas(invoiceElement, { scale: 1.5, backgroundColor: '#ffffff' });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${finalInvoiceData.id}.pdf`);
        
        setOpen(false);
      } catch (error) {
        console.error("PDF generation failed:", error);
        toast({ title: "PDF Generation Failed", description: "An error occurred while generating the PDF.", variant: "destructive" });
      } finally {
        setIsProcessing(false);
        setFinalInvoiceData(null); // Reset for next invoice
      }
    };

    generatePdf();
  }, [finalInvoiceData, toast]);

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

  const hasItemsToInvoice = useMemo(() => items.some(item => item.quantity > 0), [items]);

  const handleProcessAndDownload = async () => {
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
        .filter(item => item.quantity > 0);

    if (itemsToInvoice.length === 0) {
        toast({ title: "No Items", description: "Add at least one item with a quantity greater than 0.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    
    try {
      const invoiceCounterRef = doc(db, 'counters', 'invoices');
      const newInvoiceNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(invoiceCounterRef);
        if (!counterDoc.exists()) {
          transaction.set(invoiceCounterRef, { currentNumber: 20250600001 });
          return 20250600001;
        }
        const newNumber = counterDoc.data().currentNumber + 1;
        transaction.update(invoiceCounterRef, { currentNumber: newNumber });
        return newNumber;
      });

      const itemsWithFullDetails = itemsToInvoice.map(item => ({
          ...item,
          name: products.find(p => p.id === item.id)?.name || 'Unknown Product',
          cost: products.find(p => p.id === item.id)?.cost || 0,
      }));

      const subtotal = itemsWithFullDetails.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const gstAmount = subtotal * GST_RATE;
      const grandTotal = subtotal + gstAmount;

      const invoiceDataForPdf: Invoice = {
        id: newInvoiceNumber.toString(),
        customerName: customerName,
        customerPhone: customerPhone,
        items: itemsWithFullDetails,
        subtotal,
        gstAmount,
        grandTotal,
        date: new Date().toISOString(),
      };
      
      // Pass control to useEffect for PDF generation
      setFinalInvoiceData(invoiceDataForPdf);

      // Now create the invoice in Firestore in the background
      await onCreateInvoice({
        ...invoiceDataForPdf,
        items: itemsWithFullDetails.map(({ id, price, quantity, cost, name }) => ({ id, price, quantity, cost, name })),
      } as any);

    } catch (error) {
        console.error("Processing failed:", error);
        toast({ title: "Processing Failed", description: "Could not create invoice. Please try again.", variant: "destructive" });
        setIsProcessing(false);
    }
  };
  
  // This component will be rendered off-screen to generate the PDF
  const PdfContent = ({ invoice }: { invoice: Invoice | null }) => {
    if (!invoice) return null;

    return (
      <div id="invoice-pdf-content" className="p-8 border rounded-lg bg-white text-black" style={{ width: '800px', position: 'absolute', left: '-9999px', top: 0 }}>
        <header className="flex items-center justify-between pb-6 border-b">
            <RoopkothaLogo showTagline={false} />
            <div className="text-right">
                <h1 className="text-3xl font-bold text-primary tracking-tight">INVOICE</h1>
                <p className="text-sm text-gray-500">{invoice.id}</p>
                <p className="text-xs text-gray-500 mt-1">Date: {new Date(invoice.date).toLocaleDateString()}</p>
            </div>
        </header>
        
        <section className="grid grid-cols-2 gap-8 my-6">
              <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">Bill To</h2>
                  <p className="text-sm font-medium">{invoice.customerName}</p>
                  <p className="text-sm text-gray-600">{invoice.customerPhone}</p>
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
              {invoice.items.map(item => (
                <TableRow key={item.id} className="border-b border-gray-100">
                  <TableCell className="font-medium px-4 py-3">{item.name}</TableCell>
                  <TableCell className="px-4 py-3 text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right px-4 py-3">₹{item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium px-4 py-3">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium px-4 py-2">Subtotal</TableCell>
                  <TableCell className="text-right font-medium px-4 py-2">₹{invoice.subtotal.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium px-4 py-2">GST ({GST_RATE * 100}%)</TableCell>
                  <TableCell className="text-right font-medium px-4 py-2">₹{invoice.gstAmount.toFixed(2)}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                  <TableCell colSpan={3} className="text-right text-primary text-base px-4 py-3">Grand Total</TableCell>
                  <TableCell className="text-right text-primary text-base px-4 py-3">₹{invoice.grandTotal.toFixed(2)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </section>
        <footer className="text-center text-sm text-gray-500 pt-8 mt-8 border-t">
              <p className="font-semibold">Thank you for your business!</p>
        </footer>
      </div>
    );
  };


  return (
    <>
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
        <div id="invoice-form" className="p-2 space-y-6">
            <header className="flex items-center justify-between pb-6 border-b">
              <RoopkothaLogo />
            </header>
            
            <section className="grid grid-cols-2 gap-8">
                 <div className="space-y-4">
                     <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bill To</h2>
                     <div className="space-y-1">
                         <Label htmlFor="customerName" className="text-xs">Customer Name</Label>
                         <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
                     </div>
                     <div className="space-y-1">
                         <Label htmlFor="customerPhone" className="text-xs">Customer Phone</Label>
                         <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="1234567890" />
                     </div>
                 </div>
                 <div className="text-right space-y-1">
                     <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">From</h2>
                     <p className="font-bold text-primary">Roopkotha</p>
                     <p className="text-xs text-muted-foreground">Professor Colony, C/O, Deshbandhu Pal</p>
                     <p className="text-xs text-muted-foreground">Holding No :- 195/8, Ward no. 14</p>
                     <p className="text-xs text-muted-foreground">Bolpur, Birbhum, West Bengal - 731204</p>
                 </div>
            </section>
            
            <section className="border rounded-lg overflow-hidden mt-6">
              <Table>
                <TableHeader>
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
                      <TableCell>
                          <Input
                              type="number"
                              className="w-20 mx-auto text-center h-8"
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
                      <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
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
                  <TableRow className="bg-primary/10 font-bold">
                      <TableCell colSpan={3} className="text-right text-primary text-base">Grand Total</TableCell>
                      <TableCell className="text-right text-primary text-base">₹{invoiceDetails.grandTotal.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </section>
        </div>
        
        <DialogFooter className="sm:justify-end pt-4">
            <>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleProcessAndDownload} className="bg-accent hover:bg-accent/90" disabled={!customerName || !customerPhone || !hasItemsToInvoice || isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Processing...' : 'Process & Download PDF'}
                </Button>
            </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PdfContent invoice={finalInvoiceData} />
    </>
  );
}
