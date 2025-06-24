"use client";

import { useState, useMemo } from 'react';
import type { Product, Invoice } from '@/lib/types';
import Header from '@/components/header';
import Dashboard from '@/components/dashboard';
import InventoryTable from '@/components/inventory-table';
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import Papa from 'papaparse';

const initialProducts: Product[] = [
  { id: '1', name: 'Organic Bananas', quantity: 50, barcode: '789123456001', price: 2.99 },
  { id: '2', name: 'Whole Milk, 1 Gallon', quantity: 20, barcode: '789123456002', price: 4.50 },
  { id: '3', name: 'Artisan Sourdough Bread', quantity: 30, barcode: '789123456003', price: 5.25 },
  { id: '4', name: 'Free-Range Eggs, Dozen', quantity: 45, barcode: '789123456004', price: 6.00 },
  { id: '5', name: 'Greek Yogurt, Plain', quantity: 70, barcode: '789123456005', price: 3.75 },
  { id: '6', name: 'Avocado Hass', quantity: 60, barcode: '789123456006', price: 1.50 },
  { id: '7', name: 'Cold Brew Coffee', quantity: 25, barcode: '789123456007', price: 4.99 },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const { toast } = useToast();

  useBarcodeScanner(setFilter);

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Date.now().toString() };
    setProducts(prev => [newProduct, ...prev]);
    toast({
      title: "Product Added",
      description: `${product.name} has been added to the inventory.`,
      variant: "default",
    });
  };

  const removeProduct = (productId: string) => {
    const productName = products.find(p => p.id === productId)?.name;
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({
      title: "Product Removed",
      description: `${productName || 'Product'} has been removed from the inventory.`,
      variant: "destructive",
    });
  };

  const updateProductQuantity = (productId: string, newQuantity: number) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, quantity: Math.max(0, newQuantity) } : p))
    );
  };
  
  const handleToastForQuantityUpdate = (productName: string) => {
     toast({
      title: "Stock Updated",
      description: `Quantity for ${productName || 'Product'} has been updated.`,
    });
  }

  const handleCreateInvoice = (invoiceData: { customerName: string; customerPhone: string; items: Product[] }) => {
    const subtotal = invoiceData.items.reduce((acc, item) => acc + (item.price || 0), 0);
    const GST_RATE = 0.18;
    const gstAmount = subtotal * GST_RATE;
    const grandTotal = subtotal + gstAmount;

    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      date: new Date().toISOString(),
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone,
      items: invoiceData.items.map(p => ({ id: p.id, name: p.name, price: p.price, quantity: 1 })),
      subtotal,
      gstAmount,
      grandTotal,
    };

    setInvoices(prev => [newInvoice, ...prev]);

    invoiceData.items.forEach(p => {
      updateProductQuantity(p.id, p.quantity - 1);
    });
    
    setSelectedRows([]);
    
    toast({ title: "Invoice Created", description: `Invoice ${newInvoice.id} created successfully.` });
  };

  const exportInvoicesToCsv = () => {
    const dataToExport = invoices.flatMap(inv => 
        inv.items.map(item => ({
            invoiceId: inv.id,
            invoiceDate: new Date(inv.date).toLocaleDateString(),
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price.toFixed(2),
            subtotal: inv.subtotal.toFixed(2),
            gst: inv.gstAmount.toFixed(2),
            total: inv.grandTotal.toFixed(2),
        }))
    );

    if (dataToExport.length === 0) {
        toast({ title: "No invoices to export", variant: "destructive", description: "Create an invoice first." });
        return;
    }

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'invoices.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const dashboardStats = useMemo(() => {
    const totalProducts = products.length;
    const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);
    const productsOutOfStock = products.filter(p => p.quantity === 0).length;
    return { totalProducts, totalItems, productsOutOfStock };
  }, [products]);
  
  const chartData = useMemo(() => {
    return [...products]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({ name: p.name, quantity: p.quantity }));
  }, [products]);

  return (
    <div className="flex flex-col h-full bg-background">
      <Header addProduct={addProduct} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <Dashboard stats={dashboardStats} chartData={chartData} onExport={exportInvoicesToCsv} totalInvoices={invoices.length} />
        <InventoryTable
          products={products}
          removeProduct={removeProduct}
          updateProductQuantity={(id, qty) => {
            updateProductQuantity(id, qty);
            handleToastForQuantityUpdate(products.find(p => p.id === id)?.name || 'Product');
          }}
          filter={filter}
          onFilterChange={setFilter}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          onCreateInvoice={handleCreateInvoice}
        />
      </main>
    </div>
  );
}
