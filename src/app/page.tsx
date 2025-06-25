
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Invoice, SoldProduct } from '@/lib/types';
import Header from '@/components/header';
import Dashboard from '@/components/dashboard';
import InventoryTable from '@/components/inventory-table';
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import Papa from 'papaparse';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, writeBatch, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import FirebaseConfigWarning from '@/components/firebase-config-warning';
import { Loader2 } from 'lucide-react';


export default function Home() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useBarcodeScanner(setFilter);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return; // Don't fetch data if user is not authenticated

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      setIsLoading(false);
      return;
    }

    const productsQuery = query(collection(db, "products"), orderBy("name"));
    const unsubscribeProducts = onSnapshot(productsQuery, (querySnapshot) => {
      const productsData: Product[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({
        title: "Database Connection Error",
        description: "Could not fetch products. Please ensure your Firebase config is correct and your Firestore security rules allow reads.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    const invoicesQuery = query(collection(db, "invoices"), orderBy("date", "desc"));
    const unsubscribeInvoices = onSnapshot(invoicesQuery, (querySnapshot) => {
      const invoicesData: Invoice[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Invoice));
      setInvoices(invoicesData);
    }, (error) => {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Database Connection Error",
        description: "Could not fetch invoices. Please check your Firestore security rules.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeInvoices();
    };
  }, [toast, user]);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    if (products.some(p => p.barcode === product.barcode)) {
      toast({
        title: "Duplicate Barcode",
        description: `A product with the barcode "${product.barcode}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await addDoc(collection(db, "products"), product);
      toast({
        title: "Product Added",
        description: `${product.name} has been added to the inventory.`,
      });
    } catch (error) {
      console.error("Error adding product: ", error);
      toast({ title: "Error", description: "Failed to add product.", variant: "destructive" });
    }
  };

  const removeProduct = async (productId: string) => {
    const productName = products.find(p => p.id === productId)?.name || 'Product';
    try {
      await deleteDoc(doc(db, "products", productId));
      toast({
        title: "Product Removed",
        description: `${productName} has been removed from the inventory.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error removing product: ", error);
      toast({ title: "Error", description: "Failed to remove product.", variant: "destructive" });
    }
  };

  const bulkRemoveProducts = async (productIds: string[]) => {
    try {
      const batch = writeBatch(db);
      productIds.forEach(id => {
        const docRef = doc(db, "products", id);
        batch.delete(docRef);
      });
      await batch.commit();

      setSelectedRows([]);
      toast({
        title: "Products Removed",
        description: `${productIds.length} items have been removed.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error bulk removing products: ", error);
      toast({ title: "Error", description: "Failed to remove selected products.", variant: "destructive" });
    }
  };

  const updateProduct = async (productId: string, data: Partial<Omit<Product, 'id'>>) => {
    const productRef = doc(db, "products", productId);
    try {
      await updateDoc(productRef, data);
      toast({
        title: "Product Updated",
        description: `Your product has been updated successfully.`,
      });
    } catch (error) {
      console.error("Error updating product: ", error);
      toast({ title: "Error", description: "Failed to update product.", variant: "destructive" });
    }
  };
  
  const handleImportInventory = async (newProducts: Omit<Product, 'id'>[]) => {
    const existingProductsMap = new Map(products.map(p => [p.barcode, p]));
    const batch = writeBatch(db);

    let updatedCount = 0;
    let addedCount = 0;

    for (const p of newProducts) {
      if (existingProductsMap.has(p.barcode)) {
        const existingProduct = existingProductsMap.get(p.barcode)!;
        const productRef = doc(db, "products", existingProduct.id);
        batch.update(productRef, p as any);
        updatedCount++;
      } else {
        const productRef = doc(collection(db, "products"));
        batch.set(productRef, p);
        addedCount++;
        existingProductsMap.set(p.barcode, { ...p, id: productRef.id }); // Add to map to handle duplicates in CSV
      }
    }

    try {
      await batch.commit();
      toast({
        title: "Inventory Imported",
        description: `${addedCount} products added and ${updatedCount} products updated.`
      });
    } catch (error) {
      console.error("Error importing inventory:", error);
      toast({
        title: "Import Failed",
        description: "An error occurred while importing the inventory.",
        variant: "destructive"
      });
    }
  };

  const clearAllInvoices = async () => {
    if (invoices.length === 0) {
      toast({ title: "No invoices to clear", description: "Your invoice list is already empty." });
      return;
    }
    try {
      const invoicesRef = collection(db, "invoices");
      const querySnapshot = await getDocs(invoicesRef);
      const batch = writeBatch(db);
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      toast({
        title: "All Invoices Cleared",
        description: `${invoices.length} invoices have been permanently removed.`,
        variant: "destructive"
      });
    } catch (error) {
      console.error("Error clearing invoices: ", error);
      toast({ title: "Error", description: "Failed to clear invoices.", variant: "destructive" });
    }
  };

  const updateProductQuantity = async (productId: string, newQuantity: number) => {
    const productRef = doc(db, "products", productId);
    try {
        await updateDoc(productRef, {
            quantity: Math.max(0, newQuantity)
        });
    } catch (error) {
        console.error("Error updating quantity: ", error);
        toast({ title: "Error", description: "Failed to update product quantity.", variant: "destructive" });
    }
  };
  
  const handleToastForQuantityUpdate = (productName: string) => {
     toast({
      title: "Stock Updated",
      description: `Quantity for ${productName || 'Product'} has been updated.`,
    });
  }

  const handleCreateInvoice = async (invoiceData: { customerName: string; customerPhone: string; items: SoldProduct[]; pdfUrl: string; }): Promise<string> => {
    const subtotal = invoiceData.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const GST_RATE = 0.05;
    const gstAmount = subtotal * GST_RATE;
    const grandTotal = subtotal + gstAmount;

    const newInvoice: Omit<Invoice, 'id'> = {
      date: new Date().toISOString(),
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone,
      items: invoiceData.items,
      subtotal,
      gstAmount,
      grandTotal,
      pdfUrl: invoiceData.pdfUrl,
    };
    
    const invoiceRef = doc(collection(db, "invoices"));

    try {
      const batch = writeBatch(db);
      batch.set(invoiceRef, newInvoice);

      invoiceData.items.forEach(p => {
        const currentProduct = products.find(prod => prod.id === p.id);
        if (currentProduct) {
          const productRef = doc(db, "products", p.id);
          const newStock = Math.max(0, currentProduct.quantity - p.quantity);
          batch.update(productRef, { quantity: newStock });
        }
      });
      
      await batch.commit();
      setSelectedRows([]);
      toast({ title: "Invoice Created", description: `Invoice ${invoiceRef.id} created successfully.` });
      return invoiceRef.id;

    } catch (error) {
      console.error("Error creating invoice: ", error);
      toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
      throw error; // Re-throw to be caught in the dialog
    }
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

  const exportInventoryToCsv = () => {
    if (products.length === 0) {
      toast({ title: "No inventory to export", variant: "destructive", description: "Add a product first." });
      return;
    }

    const dataToExport = products.map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: p.quantity,
      price: p.price.toFixed(2),
      barcode: p.barcode,
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'inventory.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dashboardStats = useMemo(() => {
    const totalProducts = products.length;
    const totalItems = products.reduce((acc, p) => acc + p.quantity, 0);
    const productsOutOfStock = products.filter(p => p.quantity === 0).length;
    return { totalProducts, totalItems, productsOutOfStock };
  }, [products]);

  const totalRevenue = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  }, [invoices]);
  
  const chartData = useMemo(() => {
    return [...products]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({ name: p.name, quantity: p.quantity }));
  }, [products]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header addProduct={addProduct} onImportInventory={handleImportInventory} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <FirebaseConfigWarning />
        <Dashboard 
          stats={dashboardStats} 
          chartData={chartData} 
          onExportInvoices={exportInvoicesToCsv} 
          onExportInventory={exportInventoryToCsv}
          totalInvoices={invoices.length} 
          totalRevenue={totalRevenue}
          isLoading={isLoading}
          onClearAllInvoices={clearAllInvoices}
        />
        <InventoryTable
          products={products}
          removeProduct={removeProduct}
          bulkRemoveProducts={bulkRemoveProducts}
          updateProduct={updateProduct}
          updateProductQuantity={(id, qty) => {
            updateProductQuantity(id, qty);
            handleToastForQuantityUpdate(products.find(p => p.id === id)?.name || 'Product');
          }}
          filter={filter}
          onFilterChange={setFilter}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          onCreateInvoice={handleCreateInvoice}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
