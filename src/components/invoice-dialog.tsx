
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Product, Invoice, InvoiceItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Image from 'next/image';
import { InvoiceForm } from './invoice-form';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const generateInvoicePdf = async (invoice: Invoice, toast: ReturnType<typeof useToast>['toast']) => {
  const doc = new jsPDF();
  const toastId = 'pdf-gen-toast';
  
  toast({
    id: toastId,
    title: 'Generating PDF...',
    description: 'Preparing your invoice, please wait.'
  });

  try {
    // --- Load assets ---
    const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

    const logoImg = await fetch('/logo.png').then(res => res.blob());
    const stampImg = await fetch('/stamp.png').then(res => res.blob());
    const logoBase64 = await toBase64(logoImg);
    const stampBase64 = await toBase64(stampImg);

    // --- PDF Content ---
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // Header
    doc.addImage(logoBase64, 'PNG', margin, 10, 50, 12);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - margin, 18, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - margin, 24, { align: 'right' });
    doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - margin, 29, { align: 'right' });
    
    doc.setDrawColor(224, 224, 224); // A light grey color
    doc.line(margin, 35, pageWidth - margin, 35);

    // Billing Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customerName, margin, 50);
    doc.text(invoice.customerPhone, margin, 55);
    
    const fromAddress = [
      'Roopkotha',
      'Professor Colony, C/O, Deshbandhu Pal',
      'Holding No :- 195/8, Ward no. 14',
      'Bolpur, Birbhum, West Bengal - 731204',
      'GSTIN: 19AANCR9537M1ZC',
      'Phone: 9476468690'
    ];
    doc.text(fromAddress, pageWidth - margin, 45, { align: 'right', 'lineHeightFactor': 1.5 });

    // Table
    const tableData = invoice.items.map((item, index) => {
      const productName = item.name;
      const productDescription = item.description ? `\n${item.description}` : '';
      return [
          index + 1,
          `${productName}${productDescription}`,
          item.quantity,
          `₹${item.price.toFixed(2)}`,
          `₹${(item.price * item.quantity).toFixed(2)}`,
      ]
    });

    let finalY = 0;
    autoTable(doc, {
        startY: 75,
        head: [['#', 'Product', 'Qty', 'Price', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [248, 249, 250], textColor: [33, 37, 41], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' }, // S.No.
            1: { cellWidth: 'auto' }, // Product Name
            2: { cellWidth: 15, halign: 'center' }, // Qty
            3: { cellWidth: 25, halign: 'right' }, // Price
            4: { cellWidth: 30, halign: 'right' }, // Total
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
            // Can add page-specific footers here if needed, e.g., page numbers
        },
    });

    finalY = (doc as any).lastAutoTable.finalY;
    
    let totalsY = finalY + 10;
    if (totalsY > pageHeight - 60) {
        doc.addPage();
        totalsY = margin;
    }

    // Totals Section
    const totalsX = pageWidth - margin;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX - 35, totalsY, { align: 'right' });
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, totalsX, totalsY, { align: 'right' });

    let currentY = totalsY;
    if (invoice.discountAmount > 0) {
      currentY += 5;
      doc.text(`Discount (${invoice.discountPercentage}%):`, totalsX - 35, currentY, { align: 'right' });
      doc.text(`-₹${invoice.discountAmount.toFixed(2)}`, totalsX, currentY, { align: 'right' });
    }

    currentY += 5;
    doc.text('GST (5%):', totalsX - 35, currentY, { align: 'right' });
    doc.text(`₹${invoice.gstAmount.toFixed(2)}`, totalsX, currentY, { align: 'right' });
    
    currentY += 3;
    doc.setDrawColor(224, 224, 224);
    doc.line(totalsX - 70, currentY, totalsX, currentY);
    
    currentY += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Grand Total:', totalsX - 35, currentY, { align: 'right' });
    doc.text(`₹${invoice.grandTotal.toFixed(2)}`, totalsX, currentY, { align: 'right' });

    // Footer
    const footerY = pageHeight - 45;
    doc.setPage(doc.internal.getNumberOfPages()); // Go to last page
    finalY = (doc as any).lastAutoTable.finalY || currentY; // Use currentY as a fallback

    const placeFooter = (y: number) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Thank you for shopping with us! Do visit again.', pageWidth / 2, y, { align: 'center' });
      doc.addImage(stampBase64, 'PNG', pageWidth / 2 - 25, y + 5, 50, 25);
    };

    if (currentY > footerY - 30) {
      doc.addPage();
      placeFooter(margin + 10);
    } else {
      placeFooter(footerY);
    }
    
    doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
    toast({
      id: toastId,
      title: 'Success!',
      description: 'Your invoice has been downloaded.'
    });

  } catch (error) {
    console.error("PDF generation failed:", error);
    toast({ 
      id: toastId,
      title: 'PDF Generation Failed', 
      description: 'There was an error creating the invoice PDF.',
      variant: 'destructive'
    });
    throw error;
  }
};


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
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setDiscountPercentage(0);
      setIsProcessing(false);
      setShowSuccessScreen(false);

      const productCounts = products.reduce((acc, p) => {
        acc[p.id] = (acc[p.id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const uniqueProducts = [...new Map(products.map(item => [item.id, item])).values()];

      setItems(uniqueProducts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        cost: p.cost,
        stock: p.quantity,
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

      await generateInvoicePdf(finalInvoice, toast);
      setShowSuccessScreen(true);

    } catch (error) {
        console.error("Processing failed:", error);
        toast({ title: "Processing Failed", description: "Could not create invoice. Please try again.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleGoToHome = () => {
    onOpenChange(false);
  };
  
  return (
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
  );
}
