
"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Product, SoldProduct, Invoice } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { FileText, Loader2, Percent } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RoopkothaLogo from './icons/roopkotha-logo';
import { db } from '@/lib/firebase';
import { runTransaction, doc } from 'firebase/firestore';

const GST_RATE = 0.05; // 5%

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: {id: string, quantity: number, price: number}[]; discountPercentage: number; }) => Promise<Invoice>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

type InvoiceItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    stock: number;
    quantity: number;
};

export default function InvoiceDialog({ products, onCreateInvoice, isOpen, onOpenChange }: InvoiceDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const { toast } = useToast();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalInvoiceData, setFinalInvoiceData] = useState<Invoice | null>(null);
  const pdfContentRef = useRef<HTMLDivElement | null>(null);
  const [pdfBackgroundColor, setPdfBackgroundColor] = useState('#ffffff');

  const setPdfContentRef = useCallback((node: HTMLDivElement) => {
    if (node) {
      pdfContentRef.current = node;
      // When the ref is attached, if we are in a state to generate a PDF, do it.
      if (finalInvoiceData) {
        generatePdf();
      }
    }
  }, [finalInvoiceData]);

  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setDiscountPercentage(0);
      setIsProcessing(false);
      setFinalInvoiceData(null);
      setItems(products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        cost: p.cost,
        stock: p.quantity,
        quantity: p.quantity > 0 ? 1 : 0,
      })));

      // Capture the current background color for the PDF
      const bodyStyles = window.getComputedStyle(document.body);
      const bgColor = bodyStyles.getPropertyValue('--background');
      const finalColor = `hsl(${bgColor.trim()})`;
      setPdfBackgroundColor(finalColor);
    }
  }, [products, isOpen]);

  const generatePdf = async () => {
    const invoiceElement = pdfContentRef.current;
    if (!invoiceElement) {
        toast({ title: "PDF Error", description: "Could not find invoice content to generate PDF.", variant: "destructive" });
        setIsProcessing(false);
        return;
    }

    try {
        const canvas = await html2canvas(invoiceElement, { scale: 1.5, backgroundColor: pdfBackgroundColor });
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${finalInvoiceData!.invoiceNumber}.pdf`);
        
        onOpenChange(false);
    } catch (error) {
        console.error("PDF generation failed:", error);
        toast({ title: "PDF Generation Failed", description: "An error occurred while generating the PDF.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
        setFinalInvoiceData(null); // Reset for next invoice
    }
  };


  const handleQuantityChange = (id: string, newQuantity: number) => {
    setItems(currentItems => currentItems.map(item => {
      if (item.id === id) {
        const validatedQuantity = Math.max(0, Math.min(newQuantity || 0, item.stock));
        return { ...item, quantity: validatedQuantity };
      }
      return item;
    }));
  };

  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      setDiscountPercentage(0);
    } else {
      setDiscountPercentage(Math.min(numValue, 100));
    }
  };

  const invoiceDetails = useMemo(() => {
    const subtotal = items.reduce((acc, p) => acc + (p.price || 0) * p.quantity, 0);
    const discountAmount = subtotal * (discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const gstAmount = subtotalAfterDiscount * GST_RATE;
    const grandTotal = subtotalAfterDiscount + gstAmount;
    return { subtotal, discountAmount, gstAmount, grandTotal };
  }, [items, discountPercentage]);

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
    
    const itemsToInvoice = items.filter(item => item.quantity > 0);

    if (itemsToInvoice.length === 0) {
        toast({ title: "No Items", description: "Add at least one item with a quantity greater than 0.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    
    try {
      const finalInvoice = await onCreateInvoice({
        customerName,
        customerPhone,
        discountPercentage,
        items: itemsToInvoice.map(item => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity
        })),
      });

      setFinalInvoiceData(finalInvoice);

    } catch (error) {
        console.error("Processing failed:", error);
        toast({ title: "Processing Failed", description: "Could not create invoice. Please try again.", variant: "destructive" });
        setIsProcessing(false);
    }
  };
  
  const PdfContent = ({ invoice, forwardedRef }: { invoice: Invoice | null, forwardedRef: React.Ref<HTMLDivElement> }) => {
    if (!invoice) return null;

    return (
      <div ref={forwardedRef} className="p-8 rounded-lg bg-background text-foreground" style={{ width: '800px', position: 'absolute', left: '-9999px', top: 0 }}>
        <header className="flex items-center justify-between pb-6 border-b">
            <RoopkothaLogo showTagline={true} />
            <div className="text-right">
                <h1 className="text-3xl font-bold text-primary tracking-tight">INVOICE</h1>
                <p className="text-sm text-muted-foreground">Invoice number: {invoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground mt-1">Date: {new Date(invoice.date).toLocaleDateString()}</p>
                <p className="text-xs text-muted-foreground">Time: {new Date(invoice.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}</p>
            </div>
        </header>
        
        <section className="grid grid-cols-2 gap-8 my-6">
              <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bill To</h2>
                  <p className="text-sm font-medium">Name: {invoice.customerName}</p>
                  <p className="text-sm text-muted-foreground">Phone No: {invoice.customerPhone}</p>
              </div>
              <div className="text-right space-y-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">From</h2>
                  <p className="font-bold text-primary">Roopkotha</p>
                  <p className="text-xs text-muted-foreground">Professor Colony, C/O, Deshbandhu Pal</p>
                  <p className="text-xs text-muted-foreground">Holding No :- 195/8, Ward no. 14</p>
                  <p className="text-xs text-muted-foreground">Bolpur, Birbhum, West Bengal - 731204</p>
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">GSTIN:</span> 19AANCR9537M1ZC</p>
                  <p className="text-xs text-muted-foreground"><span className="font-semibold">Phone:</span> 9476468690</p>
              </div>
        </section>
        
        <section className="border border-border rounded-lg overflow-hidden mt-6">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[50%] px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</TableHead>
                <TableHead className="w-[120px] px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity</TableHead>
                <TableHead className="w-[120px] px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price</TableHead>
                <TableHead className="w-[120px] px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map(item => (
                <TableRow key={item.id} className="border-b border-border">
                  <TableCell className="font-medium px-4 py-3">
                    {item.name}
                    {item.description && <p className="text-xs text-muted-foreground font-normal">{item.description}</p>}
                  </TableCell>
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
               {invoice.discountAmount > 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium px-4 py-2">Discount ({invoice.discountPercentage}%)</TableCell>
                    <TableCell className="text-right font-medium px-4 py-2 text-destructive">-₹{invoice.discountAmount.toFixed(2)}</TableCell>
                </TableRow>
              )}
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
        <footer className="text-center text-sm text-muted-foreground pt-8 mt-8 border-t">
              <p className="font-semibold">Thank you for shopping with us!
                                          Do visit again.</p>
        </footer>
      </div>
    );
  };


  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Fill in the customer details and confirm the items to generate an invoice PDF.
          </DialogDescription>
        </DialogHeader>
        <div id="invoice-form" className="grid md:grid-cols-2 gap-8 overflow-y-auto p-2 flex-1 min-h-0">
            <div className="flex flex-col gap-6">
                <header className="flex items-center justify-between pb-6 border-b">
                  <RoopkothaLogo showTagline={false} width={150} height={36} />
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
                
                <section className="border rounded-lg overflow-hidden mt-auto">
                  <Table>
                    <TableFooter>
                      <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Subtotal</TableCell>
                          <TableCell className="text-right font-medium">₹{invoiceDetails.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                      <TableRow>
                         <TableCell colSpan={2}></TableCell>
                         <TableCell className="text-right font-medium">Discount</TableCell>
                         <TableCell className="text-right font-medium">
                            <div className="relative">
                               <Input
                                    type="number"
                                    className="w-24 ml-auto text-right h-8 pr-7"
                                    value={discountPercentage}
                                    onChange={(e) => handleDiscountChange(e.target.value)}
                                    min="0"
                                    max="100"
                                />
                                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                         </TableCell>
                      </TableRow>
                      {invoiceDetails.discountAmount > 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-medium">Discount Amount</TableCell>
                            <TableCell className="text-right font-medium text-destructive">-₹{invoiceDetails.discountAmount.toFixed(2)}</TableCell>
                        </TableRow>
                      )}
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
            <div className="border rounded-lg overflow-hidden flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Product</TableHead>
                    <TableHead className="w-[120px] text-center">Quantity</TableHead>
                    <TableHead className="w-[120px] text-right">Price</TableHead>
                    <TableHead className="w-[120px] text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
               <div className="overflow-y-auto flex-1 min-h-0">
                  <Table>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium w-[50%]">
                            {item.name}
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </TableCell>
                          <TableCell className="w-[120px]">
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
                          <TableCell className="w-[120px] text-right">₹{item.price.toFixed(2)}</TableCell>
                          <TableCell className="w-[120px] text-right font-medium">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
            </div>
        </div>
        
        <DialogFooter className="sm:justify-end pt-4 border-t">
            <>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
                <Button onClick={handleProcessAndDownload} className="bg-accent hover:bg-accent/90" disabled={!customerName || !customerPhone || !hasItemsToInvoice || isProcessing}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {isProcessing ? 'Processing...' : 'Process & Download PDF'}
                </Button>
            </>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <PdfContent invoice={finalInvoiceData} forwardedRef={setPdfContentRef} />
    </>
  );
}
