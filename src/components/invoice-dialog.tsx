
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
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import Image from 'next/image';
import { InvoiceForm } from './invoice-form';
import { DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { InvoicePDFTemplate } from './invoice-pdf-template';


const generateInvoicePdf = async (invoice: Invoice, toast: ReturnType<typeof useToast>['toast']) => {
  const toastId = 'pdf-gen-toast';
  
  toast({
    id: toastId,
    title: 'Generating PDF...',
    description: 'Preparing your invoice, please wait.'
  });

  // Create a temporary, off-screen container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // Render the React component to the off-screen div
    root.render(React.createElement(InvoicePDFTemplate, { invoice }));

    // Wait a moment for all content, especially images, to render
    await new Promise(resolve => setTimeout(resolve, 500));

    const content = container.querySelector('div');
    if (!content) {
      throw new Error("Could not find rendered invoice content.");
    }
    
    // Use html2canvas to capture the rendered content as a canvas
    const canvas = await html2canvas(content, {
      scale: 2, // Use a higher scale for better PDF quality
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate the height of the image in the PDF's coordinate system to maintain aspect ratio
    const ratio = canvasWidth / pdfWidth;
    const imgHeightInPdf = canvasHeight / ratio;
    
    let heightLeft = imgHeightInPdf;
    let position = 0;

    // Add the first page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
    heightLeft -= pdfHeight;

    // Add subsequent pages if the content is taller than a single A4 page
    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightInPdf);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);

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
  } finally {
    // Cleanup: unmount the React component and remove the temporary div
    root.unmount();
    document.body.removeChild(container);
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
