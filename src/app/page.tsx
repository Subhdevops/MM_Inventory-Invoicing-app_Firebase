"use client";

import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import Header from '@/components/header';
import Dashboard from '@/components/dashboard';
import InventoryTable from '@/components/inventory-table';
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';

const initialProducts: Product[] = [
  { id: '1', name: 'Organic Bananas', quantity: 50, barcode: '789123456001' },
  { id: '2', name: 'Whole Milk, 1 Gallon', quantity: 20, barcode: '789123456002' },
  { id: '3', name: 'Artisan Sourdough Bread', quantity: 30, barcode: '789123456003' },
  { id: '4', name: 'Free-Range Eggs, Dozen', quantity: 45, barcode: '789123456004' },
  { id: '5', name: 'Greek Yogurt, Plain', quantity: 70, barcode: '789123456005' },
  { id: '6', name: 'Avocado Hass', quantity: 60, barcode: '789123456006' },
  { id: '7', name: 'Cold Brew Coffee', quantity: 25, barcode: '789123456007' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  // Any scan on the main page will update the filter
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
    const productName = products.find(p => p.id === productId)?.name;
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, quantity: Math.max(0, newQuantity) } : p))
    );
     toast({
      title: "Stock Updated",
      description: `Quantity for ${productName || 'Product'} has been updated.`,
    });
  };

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
        <Dashboard stats={dashboardStats} chartData={chartData} />
        <InventoryTable
          products={products}
          removeProduct={removeProduct}
          updateProductQuantity={updateProductQuantity}
          filter={filter}
          onFilterChange={setFilter}
        />
      </main>
    </div>
  );
}
