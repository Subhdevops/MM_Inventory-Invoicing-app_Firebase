
"use client";

import React from 'react';
import type { InvoiceItem } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, Percent } from 'lucide-react';
import RoopkothaLogo from './icons/roopkotha-logo';

const GST_RATE = 0.05; // 5%

interface InvoiceFormProps {
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  discountPercentage: number;
  handleDiscountChange: (value: string) => void;
  items: InvoiceItem[];
  handleQuantityChange: (id: string, quantity: number) => void;
  invoiceDetails: {
    subtotal: number;
    discountAmount: number;
    gstAmount: number;
    grandTotal: number;
  };
  onOpenChange: (open: boolean) => void;
  handleProcessAndDownload: () => void;
  isProcessing: boolean;
  hasItemsToInvoice: boolean;
}

export function InvoiceForm({
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  discountPercentage, handleDiscountChange,
  items, handleQuantityChange,
  invoiceDetails,
  onOpenChange,
  handleProcessAndDownload,
  isProcessing,
  hasItemsToInvoice
}: InvoiceFormProps) {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-8 overflow-y-auto p-2 flex-1 min-h-0">
          <div className="flex flex-col gap-6">
              <header className="flex items-center justify-between pb-6 border-b">
                <RoopkothaLogo showTagline={false} width={150} height={36} />
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
                       <p className="font-bold text-primary">Roopkotha</p>
                       <p className="text-xs text-muted-foreground">Professor Colony, C/O, Deshbandhu Pal</p>
                       <p className="text-xs text-muted-foreground">Holding No :- 195/8, Ward no. 14</p>
                       <p className="text-xs text-muted-foreground">Bolpur, Birbhum, West Bengal - 731204</p>
                   </div>
              </section>
              
              <section className="border rounded-lg overflow-hidden mt-auto">
                <Table>
                  <TableFooter>
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">Subtotal</TableCell>
                        <TableCell className="text-right font-medium">₹{invoiceDetails.subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow>
                       <TableCell colSpan={2}></TableCell>
                       <TableCell className="text-right font-medium">Discount</TableCell>
                       <TableCell className="text-right font-medium">
                          <div className="relative">
                             <Input
                                  type="number"
                                  className="w-24 ml-auto text-right h-8 pr-7"
                                  value={discountPercentage}
                                  onChange={(e) => handleDiscountChange(e.target.value)}
                                  min="0"
                                  max="100"
                              />
                              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          </div>
                       </TableCell>
                    </TableRow>
                    {invoiceDetails.discountAmount > 0 && (
                      <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Discount Amount</TableCell>
                          <TableCell className="text-right font-medium text-destructive">-₹{invoiceDetails.discountAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                        <TableCell colSpan={3} className="text-right font-medium">GST ({GST_RATE * 100}%)</TableCell>
                        <TableCell className="text-right font-medium">₹{invoiceDetails.gstAmount.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/10 font-bold">
                        <TableCell colSpan={3} className="text-right text-primary text-base">Grand Total</TableCell>
                        <TableCell className="text-right text-primary text-base">₹{invoiceDetails.grandTotal.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </section>
          </div>
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1 min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Product</TableHead>
                      <TableHead className="w-[120px] text-center">Quantity</TableHead>
                      <TableHead className="w-[120px] text-right">Price</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: InvoiceItem) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium w-[50%]">
                          {item.name}
                          {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                        </TableCell>
                        <TableCell className="w-[120px]">
                            <Input
                                type="number"
                                className="w-20 mx-auto text-center h-8"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value, 10))}
                                onBlur={(e) => {
                                  if (!e.target.value) {
                                    handleQuantityChange(item.id, 0);
                                  }
                                }}
                                min="0"
                                max={item.stock}
                                disabled={item.stock === 0}
                            />
                        </TableCell>
                        <TableCell className="w-[120px] text-right">₹{item.price.toFixed(2)}</TableCell>
                        <TableCell className="w-[120px] text-right font-medium">₹{(item.price * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
          </div>
      </div>
      
      <DialogFooter className="sm:justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button onClick={handleProcessAndDownload} className="bg-accent hover:bg-accent/90" disabled={!customerName || !customerPhone || !hasItemsToInvoice || isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Processing...' : 'Process & Download PDF'}
          </Button>
      </DialogFooter>
      <img id="invoice-logo-for-pdf" src="/logo.png" style={{ display: 'none' }} alt="logo" />
    </>
  );
}
