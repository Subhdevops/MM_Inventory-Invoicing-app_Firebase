
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: {id: string, price: number}[]; discountPercentage: number; }) => Promise<Invoice>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const GST_RATE = 0.05;

export default function InvoiceDialog({ products, onCreateInvoice, isOpen, onOpenChange }: InvoiceDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [grandTotalInput, setGrandTotalInput] = useState('');
  const [discountAmountInput, setDiscountAmountInput] = useState('');
  const { toast } = useToast();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  
  const generateInvoicePdf = async (invoice: Invoice) => {
    const toastId = 'pdf-gen-toast';
    
    toast({
      id: toastId,
      title: 'Generating PDF...',
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    const formatCurrency = (amount: number) => `Rs. ${amount.toFixed(2)}`;

    const addFooter = (docInstance: jsPDF) => {
        const pageHeight = docInstance.internal.pageSize.height;
        docInstance.setFontSize(8);
        docInstance.setTextColor(100);
        docInstance.setFillColor(41, 128, 185);
        docInstance.rect(0, pageHeight - 15, docInstance.internal.pageSize.width, 15, 'F');
        docInstance.setTextColor(255);
        docInstance.text('Thank you for your business!', 15, pageHeight - 8);

        const pageText = `Page ${docInstance.internal.getCurrentPageInfo().pageNumber} of ${(docInstance.internal as any).pages.length - 1}`;
        docInstance.text(pageText, docInstance.internal.pageSize.width - 15, pageHeight - 8, { align: 'right' });
    };

    const addPageHeader = (docInstance: jsPDF, isFirstPage: boolean) => {
      if (isFirstPage) {
          const logoElement = document.getElementById('invoice-logo-for-pdf') as HTMLImageElement;
          if (logoElement && logoElement.naturalWidth > 0) {
              const logoWidth = 40; 
              const logoHeight = 40;
              const yPosition = 15;
              docInstance.addImage(logoElement, 'PNG', 15, yPosition, logoWidth, logoHeight);
          }
          
          const title = invoice.title || "INVOICE";
          docInstance.setFontSize(18);
          docInstance.setTextColor(41, 128, 185);
          docInstance.text(title, pageWidth - 15, 20, { align: 'right' });

          docInstance.setFontSize(9);
          docInstance.setTextColor(100);
          docInstance.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 15, 26, { align: 'right' });
          docInstance.text(`Date & Time: ${new Date(invoice.date).toLocaleString('en-IN')}`, pageWidth - 15, 30, { align: 'right' });
      }
    };

    const tableBody = invoice.items.map((item, index) => {
        let productName = 'barcode' in item ? item.name : item.description;
        let uniqueCode = 'uniqueProductCode' in item ? item.uniqueProductCode : '';
        if (uniqueCode) {
            productName += `\n(${uniqueCode})`
        }

        return [
            index + 1,
            productName,
            'quantity' in item ? item.quantity : 1, // Custom items have quantity
            formatCurrency(item.price),
            formatCurrency('quantity' in item ? item.price * item.quantity : item.price),
        ];
    });
    
    autoTable(doc, {
        startY: 55,
        body: [
             [
              { content: 'Bill To:', styles: { fontStyle: 'bold' } },
              { content: 'From:', styles: { fontStyle: 'bold', halign: 'right' } }
            ],
            [
              { content: `${invoice.customerName}\n${invoice.customerPhone}` },
              { content: `\n\n\n\n\n`, styles: { halign: 'right', fontSize: 8 } }
            ]
        ],
        theme: 'plain',
        didDrawCell: function(data) {
            if (data.section === 'body' && data.row.index === 1 && data.column.index === 1) {
                const cell = data.cell;
                const x = cell.x + cell.width - cell.padding('right');
                let y = cell.y + cell.padding('top');

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text('Minimal Mischief', x, y, { align: 'right' });
                y += doc.getTextDimensions('R', {fontSize: 10}).h + 1;

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                const addressLines = ['Barasat', 'House / Building No', 'Kolkata West Bengal - 700XXX', 'Phone: XXXXXXXXXX', 'GSTIN: XXXXXXXXXXXXXXX'];
                doc.text(addressLines.join('\n'), x, y, { align: 'right', lineHeightFactor: 1.15 });
            }
        }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
      head: [['#', 'Item/Description', 'Qty', 'Price (pre-GST)', 'Total (pre-GST)']],
      body: tableBody,
      columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      theme: 'striped',
      didDrawPage: (data) => {
        addPageHeader(doc, data.pageNumber === 1);
        addFooter(doc);
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    const totalsData: any[] = [
        ['Subtotal (pre-GST)', formatCurrency(invoice.subtotal)],
    ];
    
    if (invoice.discountAmount > 0) {
        totalsData.push([
            { content: `Discount (${invoice.discountPercentage.toFixed(2)}%)`, styles: { textColor: [255, 0, 0] } },
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
    
    const totalsTableHeight = 25; 
    const requiredHeight = Math.max(stampHeight, totalsTableHeight) + 10;
    
    let startYForTotals = currentY + 10;

    if (doc.internal.pageSize.height - finalY < requiredHeight) {
        doc.addPage();
        startYForTotals = 20;
    }
    
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
        margin: { left: pageWidth - 95, right: 15 },
    });
    
    addFooter(doc);
    
    try {
        doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
        toast({ id: toastId, title: 'Success!' });
    } catch (error) {
        console.error("PDF generation failed:", error);
        toast({ id: toastId, title: 'PDF Generation Failed', variant: 'destructive' });
        throw error;
    }
  };

  const subtotal = useMemo(() => {
    return items.reduce((acc, p) => acc + (p.price || 0), 0);
  }, [items]);

  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setDiscountPercentage(0);
      setGrandTotalInput('');
      setDiscountAmountInput('');
      setIsProcessing(false);
      setShowSuccessScreen(false);

      const GST_INCLUSIVE_MULTIPLIER = 1.05;

      setItems(products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price / GST_INCLUSIVE_MULTIPLIER,
        cost: p.cost,
        uniqueProductCode: p.uniqueProductCode,
        possibleDiscount: p.possibleDiscount || 0,
      })));
    }
  }, [products, isOpen]);
  
  const invoiceDetails = useMemo(() => {
    const discountAmount = subtotal * (discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const gstAmount = subtotalAfterDiscount * GST_RATE;
    const grandTotal = subtotalAfterDiscount + gstAmount;
    return { subtotal, discountAmount, gstAmount, grandTotal };
  }, [subtotal, discountPercentage]);
  
  useEffect(() => {
      setGrandTotalInput(invoiceDetails.grandTotal > 0 ? invoiceDetails.grandTotal.toFixed(2) : '');
      setDiscountAmountInput(invoiceDetails.discountAmount > 0 ? invoiceDetails.discountAmount.toFixed(2) : '');
  }, [invoiceDetails.grandTotal, invoiceDetails.discountAmount]);

  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value);
    const newDiscount = isNaN(numValue) || numValue < 0 ? 0 : Math.min(numValue, 100);
    setDiscountPercentage(newDiscount);
  };

  const handleGrandTotalChange = (value: string) => {
    setGrandTotalInput(value);
    const customGrandTotal = parseFloat(value);
    if (isNaN(customGrandTotal) || customGrandTotal < 0 || subtotal === 0) return;
    const newDiscountPercent = (1 - (customGrandTotal / (subtotal * (1 + GST_RATE)))) * 100;
    setDiscountPercentage(Math.max(0, Math.min(newDiscountPercent, 100)));
  };
  
  const handleDiscountAmountChange = (value: string) => {
    setDiscountAmountInput(value);
    const customDiscountAmount = parseFloat(value);
    if (isNaN(customDiscountAmount) || customDiscountAmount < 0 || subtotal === 0) return;
    const newDiscountPercent = (customDiscountAmount / subtotal) * 100;
    setDiscountPercentage(Math.max(0, Math.min(newDiscountPercent, 100)));
  };

  const totalPossibleDiscount = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.possibleDiscount || 0), 0);
  }, [items]);

  const handleProcessAndDownload = async () => {
    if (!customerName || !customerPhone) {
        toast({ title: "Missing Information", variant: "destructive" });
        return;
    }
    
    if (!/^\d{10}$/.test(customerPhone)) {
      toast({ title: "Invalid Phone Number", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    
    try {
      const finalInvoice = await onCreateInvoice({
        customerName,
        customerPhone,
        discountPercentage,
        items: items.map(item => ({
          id: item.id,
          price: item.price
        })),
      });

      await generateInvoicePdf(finalInvoice);
      setShowSuccessScreen(true);

    } catch (error) {
        console.error("Processing failed:", error);
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
                Fill customer details and confirm items to generate an invoice.
              </DialogDescription>
            </DialogHeader>
            <InvoiceForm
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              discountPercentage={discountPercentage}
              handleDiscountChange={handleDiscountChange}
              grandTotalInput={grandTotalInput}
              handleGrandTotalChange={handleGrandTotalChange}
              discountAmountInput={discountAmountInput}
              handleDiscountAmountChange={handleDiscountAmountChange}
              items={items}
              invoiceDetails={invoiceDetails}
              onOpenChange={onOpenChange}
              handleProcessAndDownload={handleProcessAndDownload}
              isProcessing={isProcessing}
              totalPossibleDiscount={totalPossibleDiscount}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
