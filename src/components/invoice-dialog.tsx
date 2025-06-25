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

const watermarkImageData = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNTAgNTAiIHdpZHRoPSIyMDAiIGhlaWdodD0iNDAiPjx0ZXh0IHg9IjUiIHk9IjM1IiBmb250RmFtaWx5PSJHZW9yZ2lhLCBzZXJpZiIgZm9udFNpemU9IjMwIiBmb250V2VpZ2h0PSJib2xkIiBmaWxsPSJoc2wodmFyKC0tcHJpbWFyeSkpIiBsZXR0ZXJTcGFjaW5nPSIxIj5ST09QS09USEE8L3RleHQ+PHBhdGggZD0iTTIyMCwxNSBRMjMwLDI1IDIyMCwzNSIgc3Ryb2tlPSJoc2wodmFyKC0tYWNjZW50KSkiIHN0cm9rZVdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiIHN0cm9rZUxpbmVjYXA9InJvdW5kIi8+PC9zdmc+';
const GST_RATE = 0.05; // 5%

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: Omit<SoldProduct, 'name'>[]; }) => Promise<string>;
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

  const resetDialog = () => {
    setCustomerName('');
    setCustomerPhone('');
    setIsProcessing(false);
  };
  
  useEffect(() => {
    if (open) {
      resetDialog();
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
        const validatedQuantity = Math.max(1, Math.min(newQuantity || 1, item.stock));
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

  const generateAndDownloadPdf = async (generatedInvoiceId: string) => {
    const input = document.getElementById('invoice-content');
    if (!input) throw new Error("Could not find invoice content.");
    
    const originalWidth = input.style.width;
    
    try {
        input.style.width = '794px'; 
        const canvas = await html2canvas(input, { 
            scale: 1.5, 
            backgroundColor: '#ffffff', 
            logging: false,
            onclone: (clonedDoc) => {
                // Manipulate the CLONED document before screenshot
                const nameInput = clonedDoc.getElementById('customerName') as HTMLInputElement | null;
                const phoneInput = clonedDoc.getElementById('customerPhone') as HTMLInputElement | null;
                
                // Replace inputs with text in the cloned document
                if (nameInput?.parentElement) {
                    const nameText = clonedDoc.createElement('p');
                    nameText.className = "text-sm pt-2";
                    nameText.innerText = nameInput.value || 'N/A';
                    nameInput.parentElement.replaceWith(nameText);
                }

                if (phoneInput?.parentElement) {
                    const phoneText = clonedDoc.createElement('p');
                    phoneText.className = "text-sm";
                    phoneText.innerText = phoneInput.value || 'N/A';
                    phoneInput.parentElement.replaceWith(phoneText);
                }

                // Add watermark to the cloned document
                const clonedContent = clonedDoc.getElementById('invoice-content');
                const watermark = clonedDoc.createElement('img');
                watermark.src = watermarkImageData;
                watermark.style.position = 'absolute';
                watermark.style.top = '50%';
                watermark.style.left = '50%';
                watermark.style.transform = 'translate(-50%, -50%) rotate(-30deg)';
                watermark.style.zIndex = '0';
                watermark.style.opacity = '0.08';
                watermark.style.pointerEvents = 'none';
                watermark.style.width = '120%';
                
                const contentWrapper = clonedDoc.querySelector('#invoice-content-wrapper') as HTMLElement;
                if (clonedContent && contentWrapper) {
                  contentWrapper.style.position = 'relative';
                  contentWrapper.style.zIndex = '1';
                  clonedContent.insertBefore(watermark, contentWrapper);
                } else if(clonedContent) {
                   clonedContent.appendChild(watermark);
                }
            }
        });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`invoice-${generatedInvoiceId}.pdf`);
    } finally {
        // Revert styles on the original document
        input.style.width = originalWidth;
    }
  };


  const handleProcessSale = async () => {
    if (!customerName || !customerPhone) {
        toast({ title: "Missing Information", description: "Please enter customer name and phone number.", variant: "destructive" });
        return;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(customerPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
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
        const generatedInvoiceId = await onCreateInvoice(invoiceData as any);
        await generateAndDownloadPdf(generatedInvoiceId);
        setOpen(false); // Close dialog on success
    } catch (error) {
        console.error("Processing failed:", error);
        toast({ title: "Processing Failed", description: "Could not create invoice or generate PDF.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const renderInvoiceForm = () => (
    <>
      <div id="invoice-content" className="print:bg-white print:text-black p-6 bg-white relative">
        <div id="invoice-content-wrapper">
          <header className="flex items-start justify-between">
              <div>
                <RoopkothaLogo />
                <p className="text-sm text-muted-foreground ml-2">where fashion meets fairytale</p>
              </div>
              <div className="text-right">
                  <h2 className="text-2xl font-bold tracking-wider">INVOICE</h2>
                  <p className="text-sm text-muted-foreground">{invoiceId}</p>
                  <p className="text-sm text-muted-foreground">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </header>
            
            <Separator className="my-6"/>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-2">
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                   <div className="space-y-4">
                      <div>
                        <Label htmlFor="customerName" className="text-xs text-muted-foreground">Customer Name</Label>
                        <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone" className="text-xs text-muted-foreground">Customer Phone</Label>
                        <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="1234567890" />
                      </div>
                    </div>
              </div>
              <div className="text-right space-y-1 text-sm">
                  <h3 className="font-semibold mb-2">From:</h3>
                  <p className="font-bold">Roopkotha</p>
                  <p>Professor Colony, C/O, Deshbandhu Pal</p>
                  <p>Holding No :- 195/8, Ward no. 14</p>
                  <p>Bolpur, Birbhum, West Bengal - 731204</p>
                  <p><span className="font-semibold">GSTIN:</span> 19AANCR9537M1ZC</p>
                  <p><span className="font-semibold">Phone:</span> 9476468690</p>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden mt-6">
              <Table>
                <TableHeader className="bg-muted/50">
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
                      <TableCell className="text-center">
                          <Input
                              type="number"
                              className="w-20 mx-auto text-center h-8"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10))}
                              onBlur={(e) => {
                                if (!e.target.value) {
                                  handleQuantityChange(item.id, 1);
                                }
                              }}
                              min="1"
                              max={item.stock}
                              disabled={item.stock === 0}
                          />
                      </TableCell>
                      <TableCell className="text-right">₹{item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
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
                  <TableRow className="text-lg font-bold bg-primary text-primary-foreground hover:bg-primary">
                      <TableCell colSpan={3} className="text-right">Grand Total</TableCell>
                      <TableCell className="text-right">₹{invoiceDetails.grandTotal.toFixed(2)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <div className="text-center text-sm text-muted-foreground pt-6">
                  <p className="font-semibold">Thank you for shopping with us!</p>
              </div>
        </div>
      </div>
      <DialogFooter className="sm:justify-end p-6 pt-0">
        <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>Cancel</Button>
        <Button onClick={handleProcessSale} className="bg-accent hover:bg-accent/90" disabled={!customerName || !customerPhone || !hasItemsToInvoice || isProcessing}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {isProcessing ? 'Processing...' : 'Process Sale & Download PDF'}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={products.length === 0 || products.every(p => p.quantity === 0)}>
          <FileText className="mr-2 h-4 w-4" />
          Create Invoice ({products.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {renderInvoiceForm()}
      </DialogContent>
    </Dialog>
  );
}

    