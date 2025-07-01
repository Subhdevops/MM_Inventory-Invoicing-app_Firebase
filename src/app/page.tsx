
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Invoice, SoldProduct, UserProfile, SavedFile } from '@/lib/types';
import Header from '@/components/header';
import Dashboard from '@/components/dashboard';
import InventoryTable from '@/components/inventory-table';
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import Papa from 'papaparse';
import { db, auth, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, writeBatch, query, orderBy, getDocs, setDoc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import FirebaseConfigWarning from '@/components/firebase-config-warning';
import { Loader2 } from 'lucide-react';
import { checkAndCreateUserProfile } from '@/lib/user';
import { ViewFilesDialog } from '@/components/view-pictures-dialog';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';


export default function Home() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile['role'] | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const { toast } = useToast();
  const [chartView, setChartView] = useState<'top-stocked' | 'lowest-stocked' | 'best-sellers' | 'most-profitable'>('top-stocked');
  const [isViewFilesOpen, setIsViewFilesOpen] = useState(false);

  useIdleTimeout(900000); // 15 minutes in milliseconds
  useBarcodeScanner(setFilter);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      const fetchUserRole = async () => {
        setIsRoleLoading(true);
        try {
          const role = await checkAndCreateUserProfile(user);
          setUserRole(role);
        } catch (error) {
          console.error("Failed to check or create user profile:", error);
          setUserRole('user'); // Default to restricted access on error
          toast({
            title: "Error fetching user profile",
            description: "There was a problem verifying your account permissions. Please try logging in again.",
            variant: "destructive",
          });
        } finally {
          setIsRoleLoading(false);
        }
      };
      fetchUserRole();
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (!user) return; // Don't fetch data if user is not authenticated

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      setIsProductsLoading(false);
      return;
    }

    const productsQuery = query(collection(db, "products"), orderBy("name"));
    const unsubscribeProducts = onSnapshot(productsQuery, (querySnapshot) => {
      const productsData: Product[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);
      setIsProductsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({
        title: "Database Connection Error",
        description: "Could not fetch products. Please ensure your Firebase config is correct and your Firestore security rules allow reads.",
        variant: "destructive",
      });
      setIsProductsLoading(false);
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
      setIsProductsLoading(false);
    });

    const savedFilesQuery = query(collection(db, "savedFiles"), orderBy("createdAt", "desc"));
    const unsubscribeSavedFiles = onSnapshot(savedFilesQuery, (querySnapshot) => {
        const filesData: SavedFile[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SavedFile));
        setSavedFiles(filesData);
    });


    return () => {
      unsubscribeProducts();
      unsubscribeInvoices();
      unsubscribeSavedFiles();
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
    } catch (error)      {
        console.error("Error updating product: ", error);
        toast({ title: "Error", description: "Failed to update product.", variant: "destructive" });
    }
  };
  
  const bulkUpdateProducts = async (productIds: string[], data: Partial<Omit<Product, 'id'>>) => {
    if (productIds.length === 0) return;

    const batch = writeBatch(db);
    productIds.forEach(id => {
        const docRef = doc(db, "products", id);
        batch.update(docRef, data);
    });

    try {
        await batch.commit();
        toast({
        title: "Products Updated",
        description: `${productIds.length} products have been updated.`,
        });
        setSelectedRows([]); // Clear selection after bulk action
    } catch (error) {
        console.error("Error bulk updating products: ", error);
        toast({ title: "Error", description: "Failed to update selected products.", variant: "destructive" });
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

  const handleResetInvoiceCounter = async (newStartNumber?: number) => {
    // The transaction logic adds 1 to the current number to get the new invoice number.
    // So, to make the *next* invoice X, we must set the counter to X-1.
    const DEFAULT_START_NUMBER = 20250600001;
    const numberToSet = newStartNumber ?? DEFAULT_START_NUMBER;

    if (isNaN(numberToSet) || numberToSet < 1) {
      toast({
        title: "Invalid Number",
        description: "Invoice start number must be a positive number.",
        variant: "destructive",
      });
      throw new Error("Invalid invoice start number");
    }

    const counterValue = numberToSet - 1;
    const invoiceCounterRef = doc(db, 'counters', 'invoices');

    try {
      await setDoc(invoiceCounterRef, { currentNumber: counterValue });
      toast({
        title: "Invoice Counter Updated",
        description: `Next invoice number will be ${numberToSet}.`,
      });
    } catch (error) {
      console.error("Error resetting invoice counter: ", error);
      toast({
        title: "Error",
        description: "Failed to update invoice counter.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleCreateInvoice = async (invoiceData: { customerName: string; customerPhone: string; items: {id: string, quantity: number, price: number}[]; discountPercentage: number; }): Promise<Invoice> => {
    const invoiceCounterRef = doc(db, 'counters', 'invoices');
    
    const newInvoiceNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(invoiceCounterRef);
        if (!counterDoc.exists()) {
            transaction.set(invoiceCounterRef, { currentNumber: 20250600001 });
            return 20250600001;
        }
        const newNumber = counterDoc.data().currentNumber + 1;
        transaction.update(invoiceCounterRef, { currentNumber: newNumber });
        return newNumber;
    });

    const itemsWithFullDetails: SoldProduct[] = invoiceData.items.map(item => {
        const product = products.find(p => p.id === item.id);
        return {
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            name: product?.name || 'Unknown Product',
            cost: product?.cost || 0,
            description: product?.description || '',
            barcode: product?.barcode || '',
        };
    });

    const subtotal = itemsWithFullDetails.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountAmount = subtotal * (invoiceData.discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const GST_RATE = 0.05;
    const gstAmount = subtotalAfterDiscount * GST_RATE;
    const grandTotal = subtotalAfterDiscount + gstAmount;
    
    const invoiceRef = doc(collection(db, "invoices"));

    const newInvoice: Invoice = {
      id: invoiceRef.id,
      invoiceNumber: newInvoiceNumber,
      date: new Date().toISOString(),
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone,
      items: itemsWithFullDetails,
      subtotal,
      discountPercentage: invoiceData.discountPercentage,
      discountAmount,
      gstAmount,
      grandTotal,
    };

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
      toast({ title: "Invoice Created", description: `Invoice ${newInvoiceNumber} created successfully.` });
      return newInvoice;

    } catch (error) {
      console.error("Error creating invoice: ", error);
      toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
      throw error; // Re-throw to be caught in the dialog
    }
  };

  const exportInvoicesToCsv = () => {
    const productsMap = new Map(products.map(p => [p.id, p.barcode]));
    const dataToExport = invoices.flatMap(inv => 
        inv.items.map(item => ({
            invoiceId: inv.invoiceNumber || inv.id,
            invoiceDate: new Date(inv.date).toLocaleDateString(),
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            productId: item.barcode || productsMap.get(item.id) || item.id,
            productName: item.name,
            productDescription: item.description,
            quantity: item.quantity,
            price: item.price.toFixed(2),
            cost: (item.cost || 0).toFixed(2),
            subtotal: inv.subtotal.toFixed(2),
            discountPercentage: inv.discountPercentage,
            discountAmount: inv.discountAmount.toFixed(2),
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
      description: p.description,
      quantity: p.quantity,
      price: p.price.toFixed(2),
      cost: p.cost.toFixed(2),
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

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    const toastId = "upload-toast";
    toast({
      id: toastId,
      title: "Uploading File...",
      description: "Please wait while the file is being uploaded.",
    });

    const storageRef = ref(storage, `savedFiles/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await addDoc(collection(db, "savedFiles"), {
        name: file.name,
        url: downloadURL,
        createdAt: new Date().toISOString(),
        fileType: file.type || 'application/octet-stream',
      });
      toast({
        id: toastId,
        title: "Upload Successful",
        description: `${file.name} has been saved.`,
      });
    } catch (error) {
      console.error("Error uploading file: ", error);
      toast({
        id: toastId,
        title: "Upload Failed",
        description: "Please check your Firebase Storage setup and security rules.",
        variant: "destructive",
      });
      throw error; // Re-throw error to be caught by the dialog
    }
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    const toastId = "delete-toast";
    toast({
      id: toastId,
      title: "Deleting File...",
      description: "Please wait while the file is being removed.",
    });

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "savedFiles", fileId));
      
      // Delete from Storage
      const storageRef = ref(storage, fileUrl);
      await deleteObject(storageRef);
      
      toast({
        id: toastId,
        title: "Deletion Successful",
        description: "The file has been removed.",
        variant: "destructive"
      });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      // Handle cases where file might not exist in storage anymore but doc does
      if (error.code === 'storage/object-not-found') {
         await deleteDoc(doc(db, "savedFiles", fileId)); // Clean up firestore doc anyway
         toast({
           id: toastId,
           title: "Deletion Successful",
           description: "The file record was removed.",
           variant: "destructive"
         });
      } else {
        toast({
          id: toastId,
          title: "Deletion Failed",
          description: "Could not remove the file. Please try again.",
          variant: "destructive",
        });
      }
      throw error;
    }
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

  const totalProfit = useMemo(() => {
    return invoices.reduce((totalProfit, inv) => {
        const invoiceCost = inv.items.reduce((acc, item) => acc + (item.cost || 0) * item.quantity, 0);
        const invoiceProfit = (inv.subtotal - inv.discountAmount) - invoiceCost;
        return totalProfit + invoiceProfit;
    }, 0);
  }, [invoices]);

  const totalGst = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + inv.gstAmount, 0);
  }, [invoices]);

  const topStockedData = useMemo(() => {
    return [...products]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map(p => ({ name: p.name, value: p.quantity }));
  }, [products]);

  const lowestStockData = useMemo(() => {
    return [...products]
      .filter(p => p.quantity > 0 && p.quantity <= 10)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5)
      .map(p => ({ name: p.name, value: p.quantity }));
  }, [products]);

  const bestSellersData = useMemo(() => {
    const salesCount: { [productId: string]: { name: string, quantity: number } } = {};
    invoices.forEach(invoice => {
        invoice.items.forEach(item => {
            if (salesCount[item.id]) {
                salesCount[item.id].quantity += item.quantity;
            } else {
                const product = products.find(p => p.id === item.id);
                salesCount[item.id] = { name: product?.name || item.name, quantity: item.quantity };
            }
        });
    });

    return Object.values(salesCount)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map(p => ({ name: p.name, value: p.quantity }));
  }, [invoices, products]);

  const mostProfitableData = useMemo(() => {
    const profitData: { [productId: string]: { name: string, profit: number } } = {};
    invoices.forEach(invoice => {
        invoice.items.forEach(item => {
            const itemProfit = (item.price - (item.cost || 0)) * item.quantity;
            if (profitData[item.id]) {
                profitData[item.id].profit += itemProfit;
            } else {
                const product = products.find(p => p.id === item.id);
                profitData[item.id] = { name: product?.name || item.name, profit: itemProfit };
            }
        });
    });

    return Object.values(profitData)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5)
        .map(p => ({ name: p.name, value: Math.round(p.profit) }));
  }, [invoices, products]);

  const chartData = {
    'top-stocked': topStockedData,
    'lowest-stocked': lowestStockData,
    'best-sellers': bestSellersData,
    'most-profitable': mostProfitableData,
  };

  const isLoading = authLoading || isRoleLoading || isProductsLoading;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header addProduct={addProduct} onImportInventory={handleImportInventory} userRole={userRole} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <FirebaseConfigWarning />
        <Dashboard 
          stats={dashboardStats} 
          chartData={chartData}
          chartView={chartView}
          onChartViewChange={setChartView} 
          onExportInvoices={exportInvoicesToCsv} 
          onExportInventory={exportInventoryToCsv}
          totalInvoices={invoices.length} 
          totalRevenue={totalRevenue}
          totalProfit={totalProfit}
          totalGst={totalGst}
          isLoading={isLoading}
          onClearAllInvoices={clearAllInvoices}
          onResetInvoiceCounter={handleResetInvoiceCounter}
          userRole={userRole}
          savedFilesCount={savedFiles.length}
          onUploadFile={handleUploadFile}
          onViewFiles={() => setIsViewFilesOpen(true)}
        />
        <InventoryTable
          products={products}
          removeProduct={removeProduct}
          bulkRemoveProducts={bulkRemoveProducts}
          updateProduct={updateProduct}
          bulkUpdateProducts={bulkUpdateProducts}
          filter={filter}
          onFilterChange={setFilter}
          selectedRows={selectedRows}
          setSelectedRows={setSelectedRows}
          onCreateInvoice={handleCreateInvoice}
          isLoading={isLoading}
          userRole={userRole}
        />
      </main>
      <ViewFilesDialog 
        files={savedFiles}
        isOpen={isViewFilesOpen}
        onOpenChange={setIsViewFilesOpen}
        onDelete={handleDeleteFile}
      />
    </div>
  );
}
