
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
      data-ai-hint="success celebration"
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
    
    const formatCurrency = (amount: number) => `Rs. ${amount.toFixed(2)}`;

    const addFooter = (docInstance: jsPDF) => {
        const pageCount = (docInstance.internal as any).pages.length - 1;
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

    const addPageHeader = (docInstance: jsPDF, isFirstPage: boolean) => {
      if (isFirstPage) {
          const logoElement = document.getElementById('invoice-logo-for-pdf') as HTMLImageElement;
          if (logoElement && logoElement.naturalWidth > 0) {
              const logoWidth = 50;
              const logoAspectRatio = logoElement.naturalHeight / logoElement.naturalWidth;
              const logoHeight = logoWidth * logoAspectRatio;
              const yPosition = 15; // Added vertical space
              docInstance.addImage(logoElement, 'PNG', 15, yPosition, logoWidth, logoHeight);
              
              // Add tagline, centered
              docInstance.setFontSize(7);
              docInstance.setTextColor(100);
              docInstance.setFont('helvetica', 'italic');
              const logoCenterX = 15 + logoWidth / 2;
              docInstance.text('Where fashion meets fairytale', logoCenterX, yPosition + logoHeight + 4, { align: 'center' });
              docInstance.setFont('helvetica', 'normal'); // Reset font style
          }

          docInstance.setFontSize(18);
          docInstance.setTextColor(41, 128, 185);
          docInstance.text("INVOICE", pageWidth - 15, 20, { align: 'right' });

          docInstance.setFontSize(9);
          docInstance.setTextColor(100);
          docInstance.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 15, 26, { align: 'right' });
          docInstance.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, pageWidth - 15, 30, { align: 'right' });
      }
    };

    const tableBody = invoice.items.map((item, index) => {
        let productName = item.name;
        if (item.description) {
            productName += ` (${item.description})`;
        }

        return [
            index + 1,
            productName,
            item.quantity,
            formatCurrency(item.price),
            formatCurrency(item.price * item.quantity),
        ];
    });
    
    // Address table
    autoTable(doc, {
        startY: 55, // Increased startY for more header space
        body: [
             [
              { content: 'Bill To:', styles: { fontStyle: 'bold' } },
              { content: 'From:', styles: { fontStyle: 'bold', halign: 'right' } }
            ],
            [
              { content: `${invoice.customerName}\n${invoice.customerPhone}` },
              { content: `Roopkotha\nProfessor Colony, C/O, Deshbandhu Pal\nHolding No :- 195/8, Ward no. 14\nBolpur, Birbhum, West Bengal - 731204\nPhone: 9476468690\nGSTIN: 19AANCR9537M1ZC`, styles: { halign: 'right', fontSize: 8 } }
            ]
        ],
        theme: 'plain',
    });

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
      head: [['#', 'Product', 'Qty', 'Price (Rs.)', 'Total (Rs.)']],
      body: tableBody,
      columnStyles: {
        0: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      theme: 'striped',
      didDrawPage: (data) => {
        addPageHeader(doc, data.pageNumber === 1);
        addFooter(doc);
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Totals Section
    const totalsData: any[] = [
        ['Subtotal', formatCurrency(invoice.subtotal)],
    ];
    
    if (invoice.discountAmount > 0) {
        totalsData.push([
            { content: `Discount (${invoice.discountPercentage}%)`, styles: { textColor: [255, 0, 0] } },
            { content: `- ${formatCurrency(invoice.discountAmount)}`, styles: { textColor: [255, 0, 0] } }
        ]);
    }
    
    totalsData.push(
        ['GST (5%)', formatCurrency(invoice.gstAmount)],
        [{ content: 'Grand Total', styles: { fontStyle: 'bold' } }, { content: formatCurrency(invoice.grandTotal), styles: { fontStyle: 'bold' } }]
    );
    
    const stampElement = document.getElementById('invoice-stamp-for-pdf') as HTMLImageElement;
    
    let currentY = finalY;
    const stampWidth = 30;
    const stampHeight = (stampElement && stampElement.naturalWidth > 0) ? stampWidth * (stampElement.naturalHeight / stampElement.naturalWidth) : stampWidth;
    
    const totalsTableHeight = 25; // Estimated
    const requiredHeight = Math.max(stampHeight, totalsTableHeight) + 10;
    
    let startYForTotals = currentY + 10;

    // Check if there is enough space on the current page
    if (doc.internal.pageSize.height - finalY < requiredHeight) {
        doc.addPage();
        startYForTotals = 20; // Start near top on new page
    }
    
    // Draw stamp on the left side
    if (stampElement && stampElement.naturalWidth > 0) {
        doc.addImage(stampElement, 'PNG', 15, startYForTotals, stampWidth, stampHeight);
    }
    
    autoTable(doc, {
        startY: startYForTotals,
        body: totalsData,
        theme: 'plain',
        tableWidth: 'wrap',
        styles: { halign: 'right', fontSize: 10 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        margin: { left: pageWidth - 95, right: 15 }, // Shifted to the right
    });
    
    // Manually draw the footer on the last page because autotable's didDrawPage won't run if no new page is added
    addFooter(doc);
    
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
      </DialogContent>
    </Dialog>
  );
}
