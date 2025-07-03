
"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Product, Invoice, InvoiceItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RoopkothaLogo from './icons/roopkotha-logo';
import Image from 'next/image';
import { InvoiceForm } from './invoice-form';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';


const PdfContent = React.forwardRef<HTMLDivElement, { invoice: Invoice | null }>(({ invoice }, ref) => {
  if (!invoice) return null;

  return (
    <div ref={ref} className="p-8 rounded-lg bg-background text-foreground" style={{ width: '800px', position: 'absolute', left: '-9999px', top: 0 }}>
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
                <TableCell colSpan={3} className="text-right font-medium px-4 py-2">GST ({0.05 * 100}%)</TableCell>
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
        <p className="font-semibold">Thank you for shopping with us! Do visit again.</p>
        <div className="mt-8">
            <Image
                src="/stamp.png"
                alt="Signature or Stamp"
                width={200}
                height={100}
                className="mx-auto"
            />
        </div>
      </footer>
    </div>
  );
});
PdfContent.displayName = "PdfContent";


const SuccessScreen = ({ handleGoToHome }: { handleGoToHome: () => void }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 h-full">
        <Image 
          src="/invoice-success.png" 
          alt="Invoice Created Successfully" 
          width={300} 
          height={200}
          className="rounded-lg shadow-md"
        />
        <Button onClick={handleGoToHome} size="lg">Go to Home</Button>
    </div>
);

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: {id: string, quantity: number, price: number}[]; discountPercentage: number; }) => Promise<Invoice>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function InvoiceDialog({ products, onCreateInvoice, isOpen, onOpenChange }: InvoiceDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const { toast } = useToast();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalInvoiceData, setFinalInvoiceData] = useState<Invoice | null>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement | null>(null);

  const generatePdf = useCallback(async () => {
    const invoiceElement = pdfContentRef.current;
    if (!invoiceElement || !finalInvoiceData) {
      toast({ title: "PDF Error", description: "Could not find invoice content to generate PDF.", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      await pdf.html(invoiceElement, {
        callback: (doc) => {
          doc.save(`${finalInvoiceData.invoiceNumber}.pdf`);
          setShowSuccessScreen(true);
        },
        x: 0,
        y: 0,
        width: 210, // A4 width in mm
        windowWidth: 800, // The width of the offscreen component
        autoPaging: 'text', // Tries to avoid cutting text lines.
        margin: [15, 10, 15, 10], // Top, Left, Bottom, Right margins
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({ title: "PDF Generation Failed", description: "An error occurred while generating the PDF.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  }, [finalInvoiceData, toast]);
  
  useEffect(() => {
    if (finalInvoiceData && pdfContentRef.current && !showSuccessScreen) {
        // A small delay to ensure images/fonts are loaded and rendered in the off-screen div.
        const timer = setTimeout(() => {
            generatePdf();
        }, 500); 
        return () => clearTimeout(timer);
    }
  }, [finalInvoiceData, showSuccessScreen, generatePdf]);

  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setDiscountPercentage(0);
      setIsProcessing(false);
      setFinalInvoiceData(null);
      setShowSuccessScreen(false);

      // Calculate quantities from the products prop, which may have duplicates from scanning
      const productCounts = products.reduce((acc, p) => {
        acc[p.id] = (acc[p.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get a list of unique products for the invoice item list
      const uniqueProducts = [...new Map(products.map(item => [item.id, item])).values()];

      setItems(uniqueProducts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        cost: p.cost,
        stock: p.quantity,
        // Use the counted quantity if available, otherwise default to 1
        quantity: productCounts[p.id] || (p.quantity > 0 ? 1 : 0),
      })));
    }
  }, [products, isOpen]);


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
    const gstAmount = subtotalAfterDiscount * 0.05;
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

  const handleGoToHome = () => {
    onOpenChange(false);
  };
  
  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
        {!showSuccessScreen && (
          <>
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                Fill in the customer details and confirm the items to generate an invoice PDF.
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              discountPercentage={discountPercentage}
              handleDiscountChange={handleDiscountChange}
              items={items}
              handleQuantityChange={handleQuantityChange}
              invoiceDetails={invoiceDetails}
              onOpenChange={onOpenChange}
              handleProcessAndDownload={handleProcessAndDownload}
              isProcessing={isProcessing}
              hasItemsToInvoice={hasItemsToInvoice}
            />
          </>
        )}
        {showSuccessScreen && (
          <SuccessScreen handleGoToHome={handleGoToHome} />
        )}
      </DialogContent>
    </Dialog>
    <PdfContent invoice={finalInvoiceData} ref={pdfContentRef} />
    </>
  );
}
