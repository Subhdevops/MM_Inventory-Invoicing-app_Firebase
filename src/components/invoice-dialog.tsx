
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Product, Invoice, InvoiceItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createRoot } from 'react-dom/client';
import Image from 'next/image';
import { InvoiceForm } from './invoice-form';

const SuccessScreen = ({ handleGoToHome }: { handleGoToHome: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 h-full">
    <DialogHeader className="text-center">
        <DialogTitle className="text-2xl">Invoice Processed!</DialogTitle>
        <DialogDescription>
            The invoice has been created and downloaded successfully.
        </DialogDescription>
    </DialogHeader>
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
  
  const generateInvoicePdf = async (invoice: Invoice) => {
    const toastId = 'pdf-gen-toast';
    
    toast({
      id: toastId,
      title: 'Generating PDF...',
      description: 'Preparing your invoice, please wait.'
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const addFooter = (docInstance: jsPDF, pageCount: number) => {
        const pageHeight = docInstance.internal.pageSize.height;
        docInstance.setFontSize(8);
        docInstance.setTextColor(100);
        docInstance.setFillColor(41, 128, 185);
        docInstance.rect(0, pageHeight - 15, docInstance.internal.pageSize.width, 15, 'F');
        docInstance.setTextColor(255);
        docInstance.text('Thank you for your business!', 15, pageHeight - 8);

        const pageText = `Page ${docInstance.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`;
        docInstance.text(pageText, docInstance.internal.pageSize.width - 15, pageHeight - 8, { align: 'right' });
    };

    // Main Header Table
    autoTable(doc, {
      head: [
        [
          { content: 'Roopkotha', colSpan: 5, styles: { halign: 'center', fillColor: [41, 128, 185], textColor: 255 } }
        ]
      ],
      body: [
        [{ content: `Invoice #: ${invoice.invoiceNumber}`, styles: { halign: 'left' } }, { content: `Date: ${new Date(invoice.date).toLocaleDateString()}`, styles: { halign: 'right' }, colSpan: 4 }],
        [{ content: '', colSpan: 5 }],
        [{ content: 'Bill To:', styles: { fontStyle: 'bold' } }, { content: 'From:', styles: { fontStyle: 'bold', halign: 'right' }, colSpan: 4 }],
        [
            { content: `${invoice.customerName}\n${invoice.customerPhone}`, styles: { halign: 'left' } },
            { content: `Roopkotha\nProfessor Colony, C/O, Deshbandhu Pal\nHolding No :- 195/8, Ward no. 14\nBolpur, Birbhum, West Bengal - 731204\nGSTIN: 19AANCR9537M1ZC`, styles: { halign: 'right', fontSize: 8 }, colSpan: 4 }
        ],
      ],
      theme: 'plain',
      styles: { fontSize: 9 },
    });

    const tableData = invoice.items.map((item, index) => [
        index + 1,
        item.name,
        item.quantity,
        item.price.toFixed(2),
        (item.price * item.quantity).toFixed(2)
    ]);

    // Items table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      head: [['#', 'Product', 'Qty', 'Price', 'Total']],
      body: tableData,
      theme: 'striped',
      margin: { top: 40, bottom: 30 },
      didDrawPage: (data) => {
        // Header on every page
        doc.setFontSize(20);
        doc.setTextColor(41, 128, 185);
        doc.text("Roopkotha", data.settings.margin.left, 15);

        // Footer on every page
        const pageCount = doc.internal.pages.length - 1;
        addFooter(doc, pageCount);
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Totals Section
    const totalsData = [
        ['Subtotal', `Rs. ${invoice.subtotal.toFixed(2)}`],
        [`Discount (${invoice.discountPercentage}%)`, `Rs. ${invoice.discountAmount.toFixed(2)}`],
        ['GST (5%)', `Rs. ${invoice.gstAmount.toFixed(2)}`],
        [{ content: 'Grand Total', styles: { fontStyle: 'bold' } }, { content: `Rs. ${invoice.grandTotal.toFixed(2)}`, styles: { fontStyle: 'bold' } }],
    ];

    autoTable(doc, {
        startY: finalY + 10,
        body: totalsData,
        theme: 'plain',
        tableWidth: 'wrap',
        styles: { halign: 'right', fontSize: 10 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        margin: { left: pageWidth / 2 + 15, right: 15 },
    });
    
    const pageCount = doc.internal.pages.length - 1;
    addFooter(doc, pageCount);
    
    try {
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

      await generateInvoicePdf(finalInvoice);
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
        {showSuccessScreen ? (
          <SuccessScreen handleGoToHome={handleGoToHome} />
        ) : (
          <>
            <DialogHeader className="sr-only">
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
      </DialogContent>
    </Dialog>
  );
}
