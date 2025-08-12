
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Invoice, SoldProduct, UserProfile, SavedFile, Event, CustomLineItem } from '@/lib/types';
import Header from '@/components/header';
import Dashboard from '@/components/dashboard';
import InventoryTable from '@/components/inventory-table';
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import * as XLSX from 'xlsx';
import { db, auth, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, writeBatch, query, orderBy, getDocs, setDoc, runTransaction, arrayUnion, getDoc, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import FirebaseConfigWarning from '@/components/firebase-config-warning';
import { Activity, Loader2 } from 'lucide-react';
import { checkAndCreateUserProfile } from '@/lib/user';
import { ViewFilesDialog } from '@/components/view-pictures-dialog';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { useMultiDeviceLogoutListener } from '@/hooks/use-multi-device-logout-listener';
import { ScanningSession } from '@/components/scanning-session';
import InvoiceDialog from '@/components/invoice-dialog';
import BulkEditDialog from '@/components/bulk-edit-dialog';
import { generatePriceTagsPDF } from '@/lib/generate-price-tags';
import { playBeep, playErrorBeep } from '@/lib/audio';
import { CustomInvoiceDialog } from '@/components/custom-invoice-dialog';


export default function Home() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile['role'] | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const { toast } = useToast();
  const [chartView, setChartView] = useState< 'top-stocked' | 'lowest-stocked' | 'best-sellers' | 'most-profitable' | 'sales-over-time'>('top-stocked');
  const [isViewFilesOpen, setIsViewFilesOpen] = useState(false);
  const [scannedProducts, setScannedProducts] = useState<Product[]>([]);
  const [productsForDialog, setProductsForDialog] = useState<Product[]>([]);
  const [isBulkInvoiceDialogOpen, setIsBulkInvoiceDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  const [isCustomInvoiceDialogOpen, setIsCustomInvoiceDialogOpen] = useState(false);

  useIdleTimeout(600000, user?.uid || null); // 10 minutes in milliseconds
  useMultiDeviceLogoutListener(user);
  
  const handleBarcodeScan = async (barcode: string) => {
    if(filter) {
      onFilterChange(barcode);
      return;
    }
    
    if (!activeEventId) return;

    // The barcode could be a standard barcode or our unique product code
    const availableProducts = products.filter(p => !p.isSold);
    const product = availableProducts.find(p => p.barcode === barcode || p.uniqueProductCode === barcode);
    
    if (product) {
      if (scannedProducts.some(p => p.id === product.id)) {
        playErrorBeep();
        toast({
          title: "Item Already Added",
          description: `${product.name} (${product.uniqueProductCode}) is already in the scanning session.`,
          variant: "destructive",
        });
      } else {
        playBeep();
        const sessionRef = doc(db, "events", activeEventId, "sessions", "active_session");
        await updateDoc(sessionRef, {
            productIds: arrayUnion(product.id)
        });
        toast({
          title: "Item Added",
          description: `${product.name} added to the scanning session.`,
        });
      }
    } else {
      playErrorBeep();
      toast({
        title: "Product Not Found or Sold",
        description: `No available product with code "${barcode}" exists in the inventory.`,
        variant: "destructive",
      });
    }
  };
  
  useBarcodeScanner(handleBarcodeScan);

  const dashboardStats = useMemo(() => {
    const availableProducts = products.filter(p => !p.isSold);
    const totalProducts = new Set(products.map(p => p.barcode)).size;
    const totalItems = availableProducts.length;
    const productsOutOfStock = products.filter(p => p.isSold).length === products.length && products.length > 0;
    
    const stockCounts = products.reduce((acc, p) => {
        if (!p.isSold) {
            acc[p.barcode] = (acc[p.barcode] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const outOfStockCount = totalProducts - Object.keys(stockCounts).length;

    return { totalProducts, totalItems, productsOutOfStock: outOfStockCount };
  }, [products]);


  const totalRevenue = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
  }, [invoices]);

  const totalProfit = useMemo(() => {
    return invoices.reduce((totalProfit, inv) => {
        if (inv.type === 'custom') {
            return totalProfit + (inv.subtotal - inv.discountAmount);
        }
        const invoiceCost = (inv.items as SoldProduct[]).reduce((acc, item) => acc + (item.cost || 0), 0);
        const invoiceProfit = (inv.subtotal - inv.discountAmount) - invoiceCost;
        return totalProfit + invoiceProfit;
    }, 0);
  }, [invoices]);

  const totalGst = useMemo(() => {
    return invoices.reduce((acc, inv) => acc + inv.gstAmount, 0);
  }, [invoices]);

  const topStockedData = useMemo(() => {
    const stockCounts: { [name: string]: number } = {};
    products.forEach(p => {
        if (!p.isSold) {
            stockCounts[p.name] = (stockCounts[p.name] || 0) + 1;
        }
    });

    return Object.entries(stockCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [products]);

  const lowestStockData = useMemo(() => {
    const stockCounts: { [name: string]: number } = {};
    products.forEach(p => {
        if (!p.isSold) {
            stockCounts[p.name] = (stockCounts[p.name] || 0) + 1;
        }
    });
    
    return Object.entries(stockCounts)
        .filter(([, value]) => value > 0 && value <= 10)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [products]);

  const bestSellersData = useMemo(() => {
    const salesCount: { [name: string]: number } = {};
    invoices.forEach(invoice => {
        if (invoice.type === 'standard') {
            (invoice.items as SoldProduct[]).forEach(item => {
                salesCount[item.name] = (salesCount[item.name] || 0) + 1;
            });
        }
    });

    return Object.entries(salesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
  }, [invoices]);

  const mostProfitableData = useMemo(() => {
    const profitData: { [name: string]: number } = {};
    invoices.forEach(invoice => {
        if(invoice.type === 'standard') {
            (invoice.items as SoldProduct[]).forEach(item => {
                const itemProfit = (item.price - (item.cost || 0));
                profitData[item.name] = (profitData[item.name] || 0) + itemProfit;
            });
        }
    });

    return Object.entries(profitData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [invoices]);
  
  const salesOverTimeData = useMemo(() => {
      const salesByDate: Record<string, number> = {};
      invoices.forEach(invoice => {
          const date = new Date(invoice.date).toISOString().split('T')[0]; // Get YYYY-MM-DD
          salesByDate[date] = (salesByDate[date] || 0) + 1;
      });

      return Object.entries(salesByDate)
          .map(([date, sales]) => ({ date, sales }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [invoices]);
  
  const activeEvent = useMemo(() => events.find(e => e.id === activeEventId), [events, activeEventId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      const fetchUserRole = async () => {
        setIsRoleLoading(true);
        try {
          const profile = await checkAndCreateUserProfile(user);
          setUserRole(profile.role);
          setActiveEventId(profile.activeEventId || null);
        } catch (error) {
          console.error("Failed to check or create user profile:", error);
          setUserRole('user');
        } finally {
          setIsRoleLoading(false);
        }
      };
      fetchUserRole();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setEvents(eventsData);
    });
    return () => unsubscribe();
  }, [user]);
  
  const clearScanningSession = async () => {
    if (!activeEventId) return;
    const sessionRef = doc(db, "events", activeEventId, "sessions", "active_session");
    const docSnap = await getDoc(sessionRef);
    if(docSnap.exists()){
        await updateDoc(sessionRef, { productIds: [] });
    }
  };
  
  useEffect(() => {
    if (!activeEventId || products.length === 0) {
        setScannedProducts([]);
        return;
    }

    const sessionRef = doc(db, "events", activeEventId, "sessions", "active_session");

    const unsubscribe = onSnapshot(sessionRef, async (docSnap) => {
        if (!docSnap.exists()) {
             await setDoc(sessionRef, { productIds: [] });
             setScannedProducts([]);
        } else {
            const data = docSnap.data();
            const productIds = data?.productIds || [];
            
            const productMap = new Map(products.map(p => [p.id, p]));
            const sessionProducts = productIds.map((id: string) => productMap.get(id)).filter(Boolean) as Product[];
            setScannedProducts(sessionProducts);
        }
    });

    return () => unsubscribe();
  }, [activeEventId, products]);

  useEffect(() => {
    if (!user || !activeEventId) {
      setProducts([]);
      setInvoices([]);
      setSavedFiles([]);
      setIsDataLoading(false);
      return;
    }

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    const eventRef = doc(db, "events", activeEventId);

    const productsQuery = query(collection(eventRef, "products"), orderBy("name"));
    const unsubscribeProducts = onSnapshot(productsQuery, (querySnapshot) => {
      const productsData: Product[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));
      setProducts(productsData);
      setIsDataLoading(false);
    });

    const invoicesQuery = query(collection(eventRef, "invoices"), orderBy("date", "desc"));
    const unsubscribeInvoices = onSnapshot(invoicesQuery, (querySnapshot) => {
      const invoicesData: Invoice[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Invoice));
      setInvoices(invoicesData);
    });

    const savedFilesQuery = query(collection(eventRef, "savedFiles"), orderBy("createdAt", "desc"));
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
  }, [user, activeEventId]);

  const handleSwitchEvent = async (eventId: string) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { activeEventId: eventId });
    setActiveEventId(eventId);
    toast({ title: 'Event Switched' });
  };

  const handleCreateEvent = async (name: string): Promise<Event> => {
      if (!user) throw new Error("User not authenticated");
      const newEventRef = doc(collection(db, "events"));
      const newEvent: Event = {
          id: newEventRef.id,
          name,
          createdAt: new Date().toISOString(),
      };
      await setDoc(newEventRef, newEvent);
      await handleSwitchEvent(newEvent.id);
      toast({ title: 'Event Created' });
      return newEvent;
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'isSold'>) => {
    if (!activeEventId) return;

    // Check if barcode already exists
    const qBarcode = query(collection(db, "events", activeEventId, "products"), where("barcode", "==", productData.barcode));
    const barcodeSnapshot = await getDocs(qBarcode);
    if (!barcodeSnapshot.empty && barcodeSnapshot.docs.some(doc => doc.data().name !== productData.name)) {
        toast({
            title: "Barcode Conflict",
            description: `Barcode "${productData.barcode}" is already used for a different product name.`,
            variant: "destructive",
        });
        return;
    }
    
    // Check if unique product code already exists
    const qUniqueCode = query(collection(db, "events", activeEventId, "products"), where("uniqueProductCode", "==", productData.uniqueProductCode));
    const uniqueCodeSnapshot = await getDocs(qUniqueCode);
    if (!uniqueCodeSnapshot.empty) {
        toast({
            title: "Unique Code Exists",
            description: `Unique Product Code "${productData.uniqueProductCode}" is already in use.`,
            variant: "destructive",
        });
        return;
    }

    try {
      const productRef = doc(collection(db, "events", activeEventId, "products"));
      const newProduct: Omit<Product, 'id'> = {
          ...productData,
          isSold: false
      };
      await setDoc(productRef, newProduct);
      
      toast({
        title: "Product Added",
        description: `${productData.name} has been added to the inventory.`,
      });
    } catch (error) {
      console.error("Error adding product: ", error);
      toast({ title: "Error", description: "Failed to add product.", variant: "destructive" });
    }
  };


  const removeProduct = async (productId: string) => {
    if (!activeEventId) return;
    const productName = products.find(p => p.id === productId)?.name || 'Product';
    try {
      await deleteDoc(doc(db, "events", activeEventId, "products", productId));
      toast({
        title: "Product Removed",
        description: `${productName} has been removed from the inventory.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error removing product: ", error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const bulkRemoveProducts = async (productIds: string[]) => {
    if (!activeEventId) return;
    try {
      const batch = writeBatch(db);
      productIds.forEach(id => {
        const docRef = doc(db, "events", activeEventId, "products", id);
        batch.delete(docRef);
      });
      await batch.commit();

      setSelectedRows([]);
      await clearScanningSession();
      toast({
        title: "Products Removed",
        description: `${productIds.length} items have been removed.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error bulk removing products: ", error);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const updateProduct = async (productId: string, data: Partial<Omit<Product, 'id' | 'uniqueProductCode' | 'isSold'>>) => {
    if (!activeEventId) return;
    const productRef = doc(db, "events", activeEventId, "products", productId);
    try {
      await updateDoc(productRef, data);
      toast({ title: "Product Updated" });
    } catch (error) {
        console.error("Error updating product: ", error);
        toast({ title: "Error", variant: "destructive" });
    }
  };
  
  const bulkUpdateProducts = async (productIds: string[], data: Partial<Omit<Product, 'id' | 'uniqueProductCode' | 'isSold'>>) => {
    if (productIds.length === 0 || !activeEventId) return;

    const batch = writeBatch(db);
    productIds.forEach(id => {
        const docRef = doc(db, "events", activeEventId, "products", id);
        batch.update(docRef, data);
    });

    try {
        await batch.commit();
        toast({ title: "Products Updated" });
        setSelectedRows([]);
        await clearScanningSession();
    } catch (error) {
        console.error("Error bulk updating products: ", error);
        toast({ title: "Error", variant: "destructive" });
    }
  };
  
  const handleImportInventory = async (newProducts: Omit<Product, 'id' | 'isSold'>[]) => {
    if (!activeEventId) return;
    
    const batch = writeBatch(db);
    
    for (const p of newProducts) {
      const productRef = doc(collection(db, "events", activeEventId, "products"));
      const newProduct: Omit<Product, 'id'> = {
          ...p,
          isSold: false
      };
      batch.set(productRef, newProduct);
    }

    try {
      await batch.commit();
      toast({
        title: "Inventory Imported",
        description: `${newProducts.length} total items have been added.`
      });
    } catch (error) {
      console.error("Error importing inventory:", error);
      toast({ title: "Import Failed", variant: "destructive" });
    }
  };


  const clearAllInvoices = async () => {
    if (!activeEventId) return;
    if (invoices.length === 0) {
      return;
    }
    const invoicesRef = collection(db, "events", activeEventId, "invoices");
    const querySnapshot = await getDocs(invoicesRef);
    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    toast({
      title: "All Invoices Cleared",
      variant: "destructive"
    });
  };

  const handleResetInvoiceCounter = async (newStartNumber?: number) => {
    if (!activeEventId) return;
    const DEFAULT_START_NUMBER = 20250600001;
    const numberToSet = newStartNumber ?? DEFAULT_START_NUMBER;

    if (isNaN(numberToSet) || numberToSet < 1) {
      throw new Error("Invalid invoice start number");
    }

    const counterValue = numberToSet - 1;
    const invoiceCounterRef = doc(db, 'events', activeEventId, 'counters', 'invoices');
    await setDoc(invoiceCounterRef, { currentNumber: counterValue });
    toast({ title: "Invoice Counter Updated" });
  };

  const handleCreateInvoice = async (invoiceData: { customerName: string; customerPhone: string; items: {id: string, price: number}[]; discountPercentage: number; }): Promise<Invoice> => {
    if (!activeEventId) throw new Error("No active event selected.");
    const eventRef = doc(db, "events", activeEventId);
    const invoiceCounterRef = doc(eventRef, 'counters', 'invoices');
    
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
            price: item.price,
            name: product?.name || 'Unknown Product',
            cost: product?.cost || 0,
            description: product?.description || '',
            barcode: product?.barcode || '',
            possibleDiscount: product?.possibleDiscount || 0,
            salePercentage: product?.salePercentage || 0,
            uniqueProductCode: product?.uniqueProductCode || '',
        };
    });

    const subtotal = itemsWithFullDetails.reduce((acc, item) => acc + item.price, 0);
    const discountAmount = subtotal * (invoiceData.discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const GST_RATE = 0.05;
    const gstAmount = subtotalAfterDiscount * GST_RATE;
    const grandTotal = subtotalAfterDiscount + gstAmount;
    
    const invoiceRef = doc(collection(eventRef, "invoices"));

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
      type: 'standard',
    };

    try {
      const batch = writeBatch(db);
      batch.set(invoiceRef, newInvoice);

      invoiceData.items.forEach(p => {
        const productRef = doc(db, "events", activeEventId, "products", p.id);
        batch.update(productRef, { isSold: true });
      });
      
      await batch.commit();
      setSelectedRows([]);
      await clearScanningSession();
      toast({ title: "Invoice Created" });
      return newInvoice;

    } catch (error) {
      console.error("Error creating invoice: ", error);
      toast({ title: "Error", variant: "destructive" });
      throw error;
    }
  };

  const handleCreateCustomInvoice = async (invoiceData: { title: string, customerName: string; customerPhone: string; items: Omit<CustomLineItem, 'id'>[]; discountPercentage: number; }): Promise<Invoice> => {
    if (!activeEventId) throw new Error("No active event selected.");
    const eventRef = doc(db, "events", activeEventId);
    const invoiceCounterRef = doc(eventRef, 'counters', 'invoices');
    
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

    const itemsWithIds: CustomLineItem[] = invoiceData.items.map(item => ({
        ...item,
        id: crypto.randomUUID(),
    }));

    const subtotal = itemsWithIds.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountAmount = subtotal * (invoiceData.discountPercentage / 100);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const GST_RATE = 0.05;
    const gstAmount = subtotalAfterDiscount * GST_RATE;
    const grandTotal = subtotalAfterDiscount + gstAmount;
    
    const invoiceRef = doc(collection(eventRef, "invoices"));

    const newInvoice: Invoice = {
      id: invoiceRef.id,
      invoiceNumber: newInvoiceNumber,
      date: new Date().toISOString(),
      title: invoiceData.title,
      customerName: invoiceData.customerName,
      customerPhone: invoiceData.customerPhone,
      items: itemsWithIds,
      subtotal,
      discountPercentage: invoiceData.discountPercentage,
      discountAmount,
      gstAmount,
      grandTotal,
      type: 'custom',
    };

    try {
      await setDoc(invoiceRef, newInvoice);
      toast({ title: "Custom Invoice Created" });
      return newInvoice;

    } catch (error) {
      console.error("Error creating custom invoice: ", error);
      toast({ title: "Error", variant: "destructive" });
      throw error;
    }
  };


  const exportInvoicesToXlsx = () => {
    if (invoices.length === 0) {
        return;
    }

    const dataToExport = invoices.flatMap(inv => 
        (inv.items as Array<SoldProduct | CustomLineItem>).map((item, index) => {
            const isStandard = 'barcode' in item;
            const row: any = {
                "Unique Product Code": isStandard ? (item as SoldProduct).uniqueProductCode : 'N/A',
                "Product Barcode": isStandard ? (item as SoldProduct).barcode : 'N/A',
                "Product Name": isStandard ? item.name : (item as CustomLineItem).description,
                "Quantity": isStandard ? 1 : (item as CustomLineItem).quantity,
                "Price": parseFloat(item.price.toFixed(2)),
                "Cost": isStandard ? parseFloat(((item as SoldProduct).cost || 0).toFixed(2)) : 'N/A',
            };

            if (index === 0) {
                row["Invoice Number"] = inv.invoiceNumber || inv.id;
                row["Invoice Title"] = inv.title || 'Standard Invoice';
                row["Date"] = new Date(inv.date).toLocaleString('en-IN');
                row["Customer Name"] = inv.customerName;
                row["Customer Phone"] = inv.customerPhone;
                row["Subtotal"] = parseFloat(inv.subtotal.toFixed(2));
                row["Discount %"] = parseFloat(inv.discountPercentage.toFixed(2));
                row["Discount Amount"] = parseFloat(inv.discountAmount.toFixed(2));
                row["GST"] = parseFloat(inv.gstAmount.toFixed(2));
                row["Grand Total"] = parseFloat(inv.grandTotal.toFixed(2));
            } else {
                row["Invoice Number"] = "";
                row["Invoice Title"] = "";
                row["Date"] = "";
                row["Customer Name"] = "";
                row["Customer Phone"] = "";
                row["Subtotal"] = "";
                row["Discount %"] = "";
                row["Discount Amount"] = "";
                row["GST"] = "";
                row["Grand Total"] = "";
            }
            return row;
        })
    );
    
    const orderedHeaders = [
        "Invoice Number", "Invoice Title", "Date", "Customer Name", "Customer Phone",
        "Unique Product Code", "Product Barcode", "Product Name", "Quantity",
        "Price", "Cost", "Subtotal", "Discount %", "Discount Amount", "GST", "Grand Total"
    ];

    const orderedDataToExport = dataToExport.map(row => {
        const newRow: any = {};
        for(const header of orderedHeaders) {
            newRow[header] = row[header] ?? "";
        }
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(orderedDataToExport, { header: orderedHeaders });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

    worksheet['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, 
        { wch: 25 }, { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, 
        { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ];

    XLSX.writeFile(workbook, "invoices.xlsx");
  }

  const exportInventoryToXlsx = () => {
    if (products.length === 0) {
      return;
    }

    const heading = [
      ["Unique Product Code", "Barcode", "Name", "Description", "Price", "Cost", "Possible Discount", "Sale Percentage", "Is Sold"],
    ];

    const dataToExport = products.map(p => [
      p.uniqueProductCode,
      p.barcode,
      p.name,
      p.description,
      p.price,
      p.cost,
      p.possibleDiscount || 0,
      p.salePercentage || 0,
      p.isSold ? 'Yes' : 'No',
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([...heading, ...dataToExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    
    worksheet['!cols'] = [
        { wch: 25 }, { wch: 20 }, { wch: 40 }, { wch: 50 }, { wch: 15 },
        { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 10 },
    ];

    XLSX.writeFile(workbook, "inventory.xlsx");
  };

  const addSavedFile = async (fileData: Omit<SavedFile, 'id'>) => {
    if (!activeEventId) return;
    await addDoc(collection(db, 'events', activeEventId, 'savedFiles'), fileData);
    toast({ title: "Upload Successful" });
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    if (!activeEventId) return;
    try {
      const storageRef = ref(storage, fileUrl);
      await deleteObject(storageRef);
      await deleteDoc(doc(db, "events", activeEventId, "savedFiles", fileId));
      toast({ title: "Deletion Successful", variant: "destructive" });
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
         await deleteDoc(doc(db, "events", activeEventId, "savedFiles", fileId));
         toast({ title: "Deletion Successful", variant: "destructive" });
      } else {
        toast({ title: "Deletion Failed", variant: "destructive" });
        throw error;
      }
    }
  };
  
  const restockProduct = useCallback(async (productData: Omit<Product, 'id' | 'isSold'>) => {
    await addProduct(productData);
    toast({
        title: "Product Restocked",
        description: `${productData.name} has been added back to inventory.`,
    });
  }, [addProduct, toast]);

  const deleteAllSoldOutProducts = useCallback(async () => {
    if (!activeEventId) return;
    
    const soldProductsToDelete = products.filter(p => p.isSold);
    if (soldProductsToDelete.length === 0) {
        toast({ title: "No sold out products to delete." });
        return;
    }

    try {
      const batch = writeBatch(db);
      soldProductsToDelete.forEach(product => {
        const docRef = doc(db, "events", activeEventId, "products", product.id);
        batch.delete(docRef);
      });
      await batch.commit();
      
      toast({
        title: "Sold Out Products Deleted",
        description: `${soldProductsToDelete.length} items have been removed.`,
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error deleting sold out products: ", error);
      toast({ title: "Error", description: "Failed to delete sold out products.", variant: "destructive" });
    }
  }, [activeEventId, products, toast]);

  const handleOpenInvoiceDialog = (products: Product[]) => {
    if (products.length === 0) return;
    setProductsForDialog(products);
    setIsBulkInvoiceDialogOpen(true);
  };
  
  const handleOpenBulkEditDialog = (products: Product[]) => {
    if (products.length === 0) return;
    setProductsForDialog(products);
    setIsBulkEditDialogOpen(true);
  };

  const handleGenerateTags = (products: Product[]) => {
    if (products.length === 0) return;
    generatePriceTagsPDF(products, toast);
  };
  
  const onFilterChange = (value: string) => {
    setFilter(value);
  }

  const chartData = {
    'top-stocked': topStockedData,
    'lowest-stocked': lowestStockData,
    'best-sellers': bestSellersData,
    'most-profitable': mostProfitableData,
    'sales-over-time': salesOverTimeData,
  };
  
  const isLoading = authLoading || isRoleLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderContent = () => {
    if (!user) {
        return null;
    }

    if (!activeEventId) {
        return (
            <main className="flex-1 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <Activity className="mx-auto h-12 w-12 text-primary" />
                    <h2 className="text-2xl font-bold tracking-tight">Welcome to Minimal Mischief</h2>
                    <p className="text-muted-foreground">
                        {events.length > 0 
                            ? "Select an event from the menu above to begin." 
                            : "Create your first event from the menu to get started."}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
            <FirebaseConfigWarning />
            <Dashboard 
              stats={dashboardStats} 
              chartData={chartData}
              chartView={chartView}
              onChartViewChange={setChartView} 
              onExportInvoices={exportInvoicesToXlsx} 
              onExportInventory={exportInventoryToXlsx}
              totalInvoices={invoices.length} 
              totalRevenue={totalRevenue}
              totalProfit={totalProfit}
              totalGst={totalGst}
              isLoading={isDataLoading}
              onClearAllInvoices={clearAllInvoices}
              onResetInvoiceCounter={handleResetInvoiceCounter}
              userRole={userRole}
              savedFilesCount={savedFiles.length}
              activeEventId={activeEventId}
              onViewFiles={() => setIsViewFilesOpen(true)}
              onOpenCustomInvoice={() => setIsCustomInvoiceDialogOpen(true)}
              onUploadComplete={addSavedFile}
              soldProducts={products.filter(p => p.isSold)}
              invoices={invoices}
              onRestockProduct={restockProduct}
              onDeleteAllSoldOut={deleteAllSoldOutProducts}
            />
            <ScanningSession
              scannedProducts={scannedProducts}
              onClear={clearScanningSession}
              onOpenInvoiceDialog={handleOpenInvoiceDialog}
              onOpenBulkEditDialog={handleOpenBulkEditDialog}
              onBulkRemove={bulkRemoveProducts}
              onGenerateTags={handleGenerateTags}
            />
            <InventoryTable
              products={products}
              removeProduct={removeProduct}
              bulkRemoveProducts={bulkRemoveProducts}
              updateProduct={updateProduct}
              filter={filter}
              onFilterChange={onFilterChange}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onCreateInvoice={handleOpenInvoiceDialog}
              isLoading={isDataLoading}
              userRole={userRole}
              onScan={handleBarcodeScan}
              onOpenBulkEditDialog={handleOpenBulkEditDialog}
              onGenerateTags={handleGenerateTags}
            />
        </main>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <Header 
        addProduct={addProduct}
        onImportInventory={handleImportInventory}
        userRole={userRole}
        events={events}
        activeEvent={activeEvent}
        onSwitchEvent={handleSwitchEvent}
        onCreateEvent={handleCreateEvent}
      />
      {renderContent()}
      <ViewFilesDialog 
        files={savedFiles}
        isOpen={isViewFilesOpen}
        onOpenChange={setIsViewFilesOpen}
        onDelete={handleDeleteFile}
      />
      <InvoiceDialog
        products={productsForDialog}
        onCreateInvoice={handleCreateInvoice}
        isOpen={isBulkInvoiceDialogOpen}
        onOpenChange={setIsBulkInvoiceDialogOpen}
      />
      <CustomInvoiceDialog
        isOpen={isCustomInvoiceDialogOpen}
        onOpenChange={setIsCustomInvoiceDialogOpen}
        onCreateInvoice={handleCreateCustomInvoice}
      />
      <BulkEditDialog
        isOpen={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        productIds={productsForDialog.map(p => p.id)}
        onBulkUpdate={bulkUpdateProducts}
      />
    </div>
  );
}
