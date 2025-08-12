
"use client";

import React from 'react';
import type { InvoiceItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Percent, IndianRupee } from 'lucide-react';
import MinimalMischiefLogo from './icons/minimal-mischief-logo';
import { ScrollArea } from './ui/scroll-area';

const GST_RATE = 0.05; // 5%

interface InvoiceFormProps {
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  discountPercentage: number;
  handleDiscountChange: (value: string) => void;
  grandTotalInput: string;
  handleGrandTotalChange: (value: string) => void;
  discountAmountInput: string;
  handleDiscountAmountChange: (value: string) => void;
  items: InvoiceItem[];
  invoiceDetails: {
    subtotal: number;
    discountAmount: number;
    gstAmount: number;
    grandTotal: number;
  };
  onOpenChange: (open: boolean) => void;
  handleProcessAndDownload: () => void;
  isProcessing: boolean;
  totalPossibleDiscount: number;
}

export function InvoiceForm({
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  discountPercentage, handleDiscountChange,
  grandTotalInput, handleGrandTotalChange,
  discountAmountInput, handleDiscountAmountChange,
  items,
  invoiceDetails,
  onOpenChange,
  handleProcessAndDownload,
  isProcessing,
  totalPossibleDiscount
}: InvoiceFormProps) {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-8 overflow-y-auto p-2 flex-1 min-h-0">
          <div className="flex flex-col gap-6">
              <header className="flex items-center justify-between pb-6 border-b">
                <MinimalMischiefLogo showTagline={false} width={90} height={22} />
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
                       <p className="font-bold text-primary">Minimal Mischief</p>
                       <p className="text-xs text-muted-foreground">Barasat</p>
                       <p className="text-xs text-muted-foreground">House / Building No</p>
                       <p className="text-xs text-muted-foreground">Kolkata West Bengal - 700XXX</p>
                   </div>
              </section>
              
              <section className="border rounded-lg overflow-hidden mt-auto">
                <Table>
                  <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Subtotal (pre-GST)</TableCell>
                        <TableCell className="text-right font-medium">₹{invoiceDetails.subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                       <TableCell colSpan={2} className="py-1">
                         {totalPossibleDiscount > 0 && (
                           <p className="text-xs text-muted-foreground text-right">Max suggested discount: <span className="font-bold text-destructive">₹{totalPossibleDiscount.toFixed(2)}</span></p>
                         )}
                       </TableCell>
                       <TableCell className="text-right font-medium py-1">Discount</TableCell>
                       <TableCell className="text-right font-medium py-1">
                          <div className="relative">
                             <Input
                                  type="number"
                                  className="w-24 ml-auto text-right h-8 pr-7"
                                  value={discountPercentage.toFixed(2)}
                                  onChange={(e) => handleDiscountChange(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  min="0"
                                  max="100"
                              />
                              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                       </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium py-1">Discount Amount</TableCell>
                        <TableCell className="text-right font-medium text-destructive py-1">
                             <div className="relative">
                               <IndianRupee className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                               <Input
                                  type="number"
                                  className="w-32 ml-auto text-right h-8 font-medium text-destructive pl-6"
                                  value={discountAmountInput}
                                  onChange={(e) => handleDiscountAmountChange(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  placeholder="0.00"
                               />
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
                               <Input
                                  type="number"
                                  className="w-32 ml-auto text-right h-8 font-bold text-base pl-6"
                                  value={grandTotalInput}
                                  onChange={(e) => handleGrandTotalChange(e.target.value)}
                                  onFocus={(e) => e.target.select()}
                                  placeholder="0.00"
                               />
                             </div>
                        </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </section>
          </div>
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60%]">Product</TableHead>
                      <TableHead className="w-[20%] text-right">Price</TableHead>
                      <TableHead className="w-[20%] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: InvoiceItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium w-[60%]">
                          {item.name}
                          <p className="text-xs text-muted-foreground font-mono">{item.uniqueProductCode}</p>
                        </TableCell>
                        <TableCell className="w-[20%] text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="w-[20%] text-right font-medium">₹{item.price.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
          </div>
      </div>
      
      <DialogFooter className="sm:justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleProcessAndDownload} className="bg-accent hover:bg-accent/90" disabled={!customerName || !customerPhone || items.length === 0 || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Processing...' : 'Process & Download PDF'}
          </Button>
      </DialogFooter>
      <img id="invoice-logo-for-pdf" src="/logo.png?v=2" style={{ display: 'none' }} alt="logo" />
      <img id="invoice-stamp-for-pdf" src="/stamp.png" style={{ display: 'none' }} alt="Stamp" />
    </>
  );
}
