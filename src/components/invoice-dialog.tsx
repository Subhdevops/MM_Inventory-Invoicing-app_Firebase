
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
import { FileText, Loader2, Copy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RoopkothaLogo from './icons/roopkotha-logo';

const GST_RATE = 0.05; // 5%

type InvoiceDialogProps = {
  products: Product[];
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: Omit<SoldProduct, 'name'>[]; pdfDataUri: string }) => Promise<{invoiceId: string, pdfUrl: string}>;
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
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const resetDialog = () => {
    setCustomerName('');
    setCustomerPhone('');
    setIsProcessing(false);
    setGeneratedPdfUrl(null);
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

  const generatePdfDataUri = async (): Promise<string> => {
    const input = document.getElementById('invoice-content');
    if (!input) throw new Error("Could not find invoice content.");
    
    const canvas = await html2canvas(input, { scale: 2, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('datauristring');
  };

  const handleCopyLink = () => {
    if (generatedPdfUrl) {
      navigator.clipboard.writeText(generatedPdfUrl);
      toast({ title: "Link Copied!", description: "Invoice link copied to clipboard." });
    }
  };


  const handleProcessSale = async () => {
    if (!customerName || !customerPhone) {
        toast({ title: "Missing Information", description: "Please enter customer name and phone number.", variant: "destructive" });
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
    setGeneratedPdfUrl(null);

    try {
        const pdfDataUri = await generatePdfDataUri();
        const invoiceData = { customerName, customerPhone, items: itemsToInvoice, pdfDataUri };
        const { pdfUrl } = await onCreateInvoice(invoiceData as any);
        setGeneratedPdfUrl(pdfUrl);
    } catch (error) {
        console.error("Processing failed:", error);
        toast({ title: "Processing Failed", description: "Could not create invoice or generate PDF link.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={products.length === 0 || products.every(p => p.quantity === 0)}>
          <FileText className="mr-2 h-4 w-4" />
          Create Invoice ({products.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Fill in the customer details and confirm the items to generate an invoice PDF.
          </DialogDescription>
        </DialogHeader>
        <div id="invoice-content" className="p-6 border rounded-lg bg-background">
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
              <div className="space-y-4">
                  <h3 className="font-semibold mb-2">Bill To:</h3>
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone">Customer Phone</Label>
                    <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="1234567890" />
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
        
        {generatedPdfUrl && (
          <div className="mt-4 space-y-2 px-6">
            <Label htmlFor="pdf-link">Shareable Invoice Link</Label>
            <div className="flex items-center space-x-2">
              <Input id="pdf-link" value={generatedPdfUrl} readOnly className="flex-1" />
              <Button onClick={handleCopyLink} size="icon" variant="outline">
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy Link</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can send this link to your customer via WhatsApp, SMS, or email.
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-end pt-4">
           {generatedPdfUrl ? (
             <Button onClick={() => setOpen(false)}>Done</Button>
           ) : (
             <>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>Cancel</Button>
               <Button onClick={handleProcessSale} className="bg-accent hover:bg-accent/90" disabled={!customerName || !customerPhone || !hasItemsToInvoice || isProcessing}>
                 {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                 {isProcessing ? 'Processing...' : 'Process Sale & Get Link'}
               </Button>
             </>
           )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
