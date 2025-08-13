
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Invoice, CustomLineItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Image from 'next/image';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from './ui/table';
import { X, Plus, Loader2, FileText, IndianRupee, Percent } from 'lucide-react';
import MinimalMischiefLogo from './icons/minimal-mischief-logo';
import { ScrollArea } from './ui/scroll-area';

const GST_RATE = 0.05;

type CustomInvoiceDialogProps = {
  onCreateInvoice: (invoiceData: { title: string, customerName: string; customerPhone: string; items: Omit<CustomLineItem, 'id'>[]; discountPercentage: number; }) => Promise<Invoice>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const SuccessScreen = ({ handleClose }: { handleClose: () => void }) => (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 h-full">
      <Image 
        src="/invoice-success.png" 
        alt="Invoice Created Successfully" 
        width={300} 
        height={200}
        data-ai-hint="success celebration"
        className="rounded-lg shadow-md"
      />
      <Button onClick={handleClose} size="lg">Close</Button>
    </div>
);

export function CustomInvoiceDialog({ onCreateInvoice, isOpen, onOpenChange }: CustomInvoiceDialogProps) {
    const [title, setTitle] = useState('Invoice');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [items, setItems] = useState<CustomLineItem[]>([{ id: crypto.randomUUID(), description: '', quantity: 1, price: 0 }]);
    const [discountPercentage, setDiscountPercentage] = useState(0);
    const [grandTotalInput, setGrandTotalInput] = useState('');
    const [discountAmountInput, setDiscountAmountInput] = useState('');
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);

    const resetForm = () => {
        setTitle('Invoice');
        setCustomerName('');
        setCustomerPhone('');
        setItems([{ id: crypto.randomUUID(), description: '', quantity: 1, price: 0 }]);
        setDiscountPercentage(0);
        setGrandTotalInput('');
        setDiscountAmountInput('');
        setIsProcessing(false);
        setShowSuccessScreen(false);
    };

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const generatePdf = async (invoice: Invoice) => {
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
                    const logoWidth = 32;
                    const logoAspectRatio = logoElement.naturalHeight / logoElement.naturalWidth;
                    const logoHeight = logoWidth * logoAspectRatio;
                    const yPosition = 15;
                    docInstance.addImage(logoElement, 'PNG', 15, yPosition, logoWidth, logoHeight);
                    
                    docInstance.setFontSize(7);
                    docInstance.setTextColor(100);
                    docInstance.setFont('helvetica', 'italic');
                    const logoCenterX = 15 + logoWidth / 2;
                    docInstance.text('Simple by Nature, Mischief by Choice', logoCenterX, yPosition + logoHeight + 4, { align: 'center' });
                    docInstance.setFont('helvetica', 'normal');
                }

                docInstance.setFontSize(18);
                docInstance.setTextColor(41, 128, 185);
                docInstance.text(invoice.title || 'INVOICE', pageWidth - 15, 20, { align: 'right' });

                docInstance.setFontSize(9);
                docInstance.setTextColor(100);
                docInstance.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 15, 26, { align: 'right' });
                docInstance.text(`Date & Time: ${new Date(invoice.date).toLocaleString('en-IN')}`, pageWidth - 15, 30, { align: 'right' });
            }
        };

        const tableBody = invoice.items.map((item, index) => [
            index + 1,
            (item as CustomLineItem).description,
            item.quantity,
            formatCurrency(item.price),
            formatCurrency(item.price * item.quantity),
        ]);
        
        autoTable(doc, {
            startY: 55,
            body: [
                 [{ content: 'Bill To:', styles: { fontStyle: 'bold' } }, { content: 'From:', styles: { fontStyle: 'bold', halign: 'right' } }],
                [{ content: `${invoice.customerName}\n${invoice.customerPhone}` }, { content: `\n\n\n\n\n`, styles: { halign: 'right', fontSize: 8 } }]
            ],
            theme: 'plain',
            didDrawCell: (data) => {
                if (data.section === 'body' && data.row.index === 1 && data.column.index === 1) {
                    const cell = data.cell;
                    const x = cell.x + cell.width - cell.padding('right');
                    let y = cell.y + cell.padding('top');

                    const oldSize = doc.getFontSize();
                    const oldStyle = doc.getFont().fontStyle;

                    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                    doc.text('Minimal Mischief', x, y, { align: 'right' });
                    y += doc.getTextDimensions('R', {fontSize: 10}).h + 1;

                    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
                    const addressLines = ['Barasat', 'House / Building No', 'Kolkata West Bengal - 700XXX', 'Phone: XXXXXXXXXX', 'GSTIN: XXXXXXXXXXXXXXX'];
                    doc.text(addressLines.join('\n'), x, y, { align: 'right', lineHeightFactor: 1.15 });

                    doc.setFontSize(oldSize);
                    doc.setFont('helvetica', oldStyle);
                }
            }
        });
        
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['#', 'Item/Description', 'Qty', 'Price (pre-GST)', 'Total (pre-GST)']],
            body: tableBody,
            headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
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
            ...(invoice.discountAmount > 0 ? [[{ content: `Discount (${invoice.discountPercentage.toFixed(2)}%)`, styles: { textColor: [255, 0, 0] } }, { content: `- ${formatCurrency(invoice.discountAmount)}`, styles: { textColor: [255, 0, 0] } }]] : []),
            ['GST (5%)', formatCurrency(invoice.gstAmount)],
            [{ content: 'Grand Total', styles: { fontStyle: 'bold' } }, { content: formatCurrency(invoice.grandTotal), styles: { fontStyle: 'bold' } }]
        ];
        
        autoTable(doc, {
            startY: finalY + 10,
            body: totalsData,
            theme: 'plain',
            tableWidth: 'wrap',
            styles: { halign: 'right', fontSize: 10 },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
            margin: { left: pageWidth - 95, right: 15 },
        });

        addFooter(doc);
        
        try {
            doc.save(`${invoice.title}-${invoice.invoiceNumber}.pdf`);
            toast({ id: toastId, title: 'Success!', description: 'Your PDF has been downloaded.' });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast({ id: toastId, title: 'PDF Generation Failed', variant: 'destructive' });
            throw error;
        }
    };
    
    const subtotal = useMemo(() => items.reduce((acc, p) => acc + (p.price || 0) * p.quantity, 0), [items]);
    
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
    
    const handleItemChange = (id: string, field: keyof Omit<CustomLineItem, 'id'>, value: string | number) => {
        setItems(currentItems => currentItems.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'price') {
                    updatedItem[field] = Math.max(0, Number(value) || 0);
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const addItem = () => setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, price: 0 }]);
    const removeItem = (id: string) => setItems(items.filter(item => item.id !== id));

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

    const handleProcessAndDownload = async () => {
        if (!customerName || !customerPhone || !title) {
            toast({ title: "Missing Information", description: "Please enter title, customer name, and phone number.", variant: "destructive" });
            return;
        }
        if (!/^\d{10}$/.test(customerPhone)) {
          toast({ title: "Invalid Phone Number", description: "Phone number must be 10 digits.", variant: "destructive" });
          return;
        }
        const itemsToInvoice = items.filter(item => item.description.trim() && item.quantity > 0 && item.price > 0);
        if (itemsToInvoice.length === 0) {
            toast({ title: "No Items", description: "Add at least one valid line item.", variant: "destructive" });
            return;
        }

        setIsProcessing(true);
        try {
            const finalInvoice = await onCreateInvoice({
                title,
                customerName,
                customerPhone,
                discountPercentage,
                items: itemsToInvoice.map(({ id, ...rest }) => rest),
            });
            await generatePdf(finalInvoice);
            setShowSuccessScreen(true);
        } catch (error) {
            console.error("Processing failed:", error);
            toast({ title: "Processing Failed", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl flex flex-col max-h-[90vh]">
            {showSuccessScreen ? <SuccessScreen handleClose={() => onOpenChange(false)} /> : (
            <>
                <DialogHeader>
                    <DialogTitle>Create Custom Invoice / Letterhead</DialogTitle>
                    <DialogDescription>
                        Create a document for advance payments, quotations, or non-inventory items.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 grid md:grid-cols-2 gap-6 overflow-y-auto p-1 pr-4">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="invoiceTitle">Document Title</Label>
                            <Input id="invoiceTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Advance Payment, Quotation" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="customerName">Customer Name</Label>
                                <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name Title" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="customerPhone">Customer Phone</Label>
                                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="1234567890" />
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden mt-auto">
                            <Table>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-medium">Subtotal (pre-GST)</TableCell>
                                        <TableCell className="text-right font-medium">₹{invoiceDetails.subtotal.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-medium py-1">Discount</TableCell>
                                        <TableCell className="text-right font-medium py-1">
                                            <div className="relative">
                                                <Input type="number" className="w-24 ml-auto text-right h-8 pr-7" value={discountPercentage.toFixed(2)} onChange={(e) => handleDiscountChange(e.target.value)} onFocus={(e) => e.target.select()} />
                                                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-medium py-1">Discount Amount</TableCell>
                                        <TableCell className="text-right font-medium text-destructive py-1">
                                            <div className="relative">
                                                <IndianRupee className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" className="w-32 ml-auto text-right h-8 font-medium text-destructive pl-6" value={discountAmountInput} onChange={(e) => handleDiscountAmountChange(e.target.value)} onFocus={(e) => e.target.select()} placeholder="0.00" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-medium">GST ({GST_RATE * 100}%)</TableCell>
                                        <TableCell className="text-right font-medium">₹{invoiceDetails.gstAmount.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-primary/10 font-bold">
                                        <TableCell colSpan={3} className="text-right text-primary text-base">Grand Total</TableCell>
                                        <TableCell className="text-right text-primary text-base">
                                             <div className="relative">
                                                <IndianRupee className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" className="w-32 ml-auto text-right h-8 font-bold text-base pl-6" value={grandTotalInput} onChange={(e) => handleGrandTotalChange(e.target.value)} onFocus={(e) => e.target.select()} placeholder="0.00" />
                                             </div>
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden flex flex-col">
                        <ScrollArea className="flex-1 min-h-0">
                             <div className="p-2 space-y-2">
                                {items.map((item, index) => (
                                    <div key={item.id} className="p-3 rounded-md border bg-muted/50 space-y-2 relative">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                            <div className="col-span-full">
                                                <Label htmlFor={`desc-${index}`}>Description</Label>
                                                <Input id={`desc-${index}`} value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)} placeholder="e.g., Advance for Dress" className="h-9" />
                                            </div>
                                            <div className="col-span-1">
                                                <Label htmlFor={`qty-${index}`}>Quantity</Label>
                                                <Input id={`qty-${index}`} type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)} className="h-9 w-full" min="1" />
                                            </div>
                                            <div className="col-span-1">
                                                <Label htmlFor={`price-${index}`}>Price (₹)</Label>
                                                <Input id={`price-${index}`} type="number" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', e.target.value)} className="h-9 w-full" placeholder="0.00" />
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length <= 1} className="absolute top-1 right-1 h-7 w-7">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="p-2 border-t">
                            <Button variant="outline" size="sm" onClick={addItem} className="w-full">
                                <Plus className="mr-2 h-4 w-4" /> Add Line Item
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-end pt-4 border-t">
                    <DialogClose asChild>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleProcessAndDownload} className="bg-accent hover:bg-accent/90" disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        {isProcessing ? 'Processing...' : 'Create & Download PDF'}
                    </Button>
                </DialogFooter>
                </>
            )}
            </DialogContent>
            {/* These hidden images are required for jsPDF to be able to render them */}
            <img id="invoice-logo-for-pdf" src="/logo.png?v=3" style={{ display: 'none' }} alt="logo" />
            <img id="invoice-stamp-for-pdf" src="/stamp.png" style={{ display: 'none' }} alt="Stamp" />
        </Dialog>
    );
}
