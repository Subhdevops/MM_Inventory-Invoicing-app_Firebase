
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Product, Invoice, SoldProduct, UserProfile, SavedFile, Event } from '@/lib/types';
import Header from '@/components/header';
import Dashboard from '@/components/dashboard';
import InventoryTable from '@/components/inventory-table';
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import * as XLSX from 'xlsx';
import { db, auth, storage } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc, writeBatch, query, orderBy, getDocs, setDoc, runTransaction, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import FirebaseConfigWarning from '@/components/firebase-config-warning';
import { Activity, Loader2 } from 'lucide-react';
import { checkAndCreateUserProfile } from '@/lib/user';
import { ViewFilesDialog } from '@/components/view-pictures-dialog';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import HummingbirdAnimation from '@/components/hummingbird-animation';
import { useMultiDeviceLogoutListener } from '@/hooks/use-multi-device-logout-listener';
import { ScanningSession } from '@/components/scanning-session';
import InvoiceDialog from '@/components/invoice-dialog';
import BulkEditDialog from '@/components/bulk-edit-dialog';
import { generatePriceTagsPDF } from '@/lib/generate-price-tags';
import { playBeep, playErrorBeep } from '@/lib/audio';


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
  const [chartView, setChartView] = useState<'top-stocked' | 'lowest-stocked' | 'best-sellers' | 'most-profitable'>('top-stocked');
  const [isViewFilesOpen, setIsViewFilesOpen] = useState(false);
  const [scannedProducts, setScannedProducts] = useState<Product[]>([]);
  const [productsForDialog, setProductsForDialog] = useState<Product[]>([]);
  const [isBulkInvoiceDialogOpen, setIsBulkInvoiceDialogOpen] = useState(false);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);

  // All hooks must be called unconditionally at the top level
  useIdleTimeout(600000, user?.uid || null); // 10 minutes in milliseconds
  useMultiDeviceLogoutListener(user);
  
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
  
  const activeEvent = useMemo(() => events.find(e => e.id === activeEventId), [events, activeEventId]);

  const handleScanAndAdd = async (barcode: string) => {
    if (!activeEventId) return;
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      const alreadyScannedCount = scannedProducts.filter(p => p.id === product.id).length;

      if (alreadyScannedCount >= product.quantity) {
        playErrorBeep();
        toast({
          title: "Stock Limit Reached",
          description: `All available units of ${product.name} have been added.`,
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
        title: "Product Not Found",
        description: `No product with barcode "${barcode}" exists in the inventory.`,
        variant: "destructive",
      });
    }
  };
  
  useBarcodeScanner(handleScanAndAdd);

  // Effect to fetch user profile, including their last active event
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

  // Effect to fetch the list of all available events
  useEffect(() => {
    if (!user) return;
    const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setEvents(eventsData);
    }, (error) => {
        console.error("Error fetching events:", error);
        toast({
            title: "Error fetching events",
            description: "Could not retrieve the list of events.",
            variant: "destructive",
        });
    });
    return () => unsubscribe();
  }, [user, toast]);
  
  const clearScanningSession = async () => {
    if (!activeEventId) return;
    const sessionRef = doc(db, "events", activeEventId, "sessions", "active_session");
    await updateDoc(sessionRef, { productIds: [] });
  };
  
  // Effect to sync scanning session
  useEffect(() => {
    if (!activeEventId || products.length === 0) {
        setScannedProducts([]);
        return;
    }

    const sessionRef = doc(db, "events", activeEventId, "sessions", "active_session");

    const unsubscribe = onSnapshot(sessionRef, async (docSnap) => {
        if (!docSnap.exists()) {
             await setDoc(sessionRef, { productIds: [] }); // Initialize if doesn't exist
             setScannedProducts([]);
        } else {
            const data = docSnap.data();
            const productIds = data?.productIds || [];
            
            // Map product IDs back to full product objects
            const productMap = new Map(products.map(p => [p.id, p]));
            const sessionProducts = productIds.map((id: string) => productMap.get(id)).filter(Boolean) as Product[];
            setScannedProducts(sessionProducts);
        }
    });

    return () => unsubscribe();
  }, [activeEventId, products]);

  // Effect to fetch data scoped to the active event
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
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({
        title: "Database Connection Error",
        description: "Could not fetch products. Please ensure your Firebase config is correct and your Firestore security rules allow reads.",
        variant: "destructive",
      });
      setIsDataLoading(false);
    });

    const invoicesQuery = query(collection(eventRef, "invoices"), orderBy("date", "desc"));
    const unsubscribeInvoices = onSnapshot(invoicesQuery, (querySnapshot) => {
      const invoicesData: Invoice[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Invoice));
      setInvoices(invoicesData);
    }, (error) => {
      console.error("Error fetching invoices:", error);
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
  }, [toast, user, activeEventId]);

  const handleSwitchEvent = async (eventId: string) => {
    if (!user) return;
    try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { activeEventId: eventId });
        setActiveEventId(eventId);
        toast({ title: 'Event Switched', description: 'Loading data for the selected event.' });
    } catch (error) {
        console.error("Error switching event:", error);
        toast({ title: "Error", description: "Failed to switch event.", variant: "destructive" });
    }
  };

  const handleCreateEvent = async (name: string): Promise<Event> => {
      if (!user) throw new Error("User not authenticated");
      try {
          const newEventRef = doc(collection(db, "events"));
          const newEvent: Event = {
              id: newEventRef.id,
              name,
              createdAt: new Date().toISOString(),
          };
          await setDoc(newEventRef, newEvent);
          await handleSwitchEvent(newEvent.id);
          toast({ title: 'Event Created', description: `Successfully created and switched to "${name}".` });
          return newEvent;
      } catch (error) {
          console.error("Error creating event:", error);
          toast({ title: "Error", description: "Failed to create new event.", variant: "destructive" });
          throw error;
      }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    if (!activeEventId) return;
    if (products.some(p => p.barcode === product.barcode)) {
      toast({
        title: "Duplicate Barcode",
        description: `A product with the barcode "${product.barcode}" already exists in this event.`,
        variant: "destructive",
      });
      return;
    }
    try {
      await addDoc(collection(db, "events", activeEventId, "products"), product);
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
      toast({ title: "Error", description: "Failed to remove product.", variant: "destructive" });
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
      toast({ title: "Error", description: "Failed to remove selected products.", variant: "destructive" });
    }
  };

  const updateProduct = async (productId: string, data: Partial<Omit<Product, 'id'>>) => {
    if (!activeEventId) return;
    const productRef = doc(db, "events", activeEventId, "products", productId);
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
    if (productIds.length === 0 || !activeEventId) return;

    const batch = writeBatch(db);
    productIds.forEach(id => {
        const docRef = doc(db, "events", activeEventId, "products", id);
        batch.update(docRef, data);
    });

    try {
        await batch.commit();
        toast({
        title: "Products Updated",
        description: `${productIds.length} products have been updated.`,
        });
        setSelectedRows([]); // Clear selection after bulk action
        await clearScanningSession();
    } catch (error) {
        console.error("Error bulk updating products: ", error);
        toast({ title: "Error", description: "Failed to update selected products.", variant: "destructive" });
    }
  };
  
  const handleImportInventory = async (newProducts: Omit<Product, 'id'>[]) => {
    if (!activeEventId) return;
    const existingProductsMap = new Map(products.map(p => [p.barcode, p]));
    const batch = writeBatch(db);

    let updatedCount = 0;
    let addedCount = 0;

    for (const p of newProducts) {
      if (existingProductsMap.has(p.barcode)) {
        const existingProduct = existingProductsMap.get(p.barcode)!;
        const productRef = doc(db, "events", activeEventId, "products", existingProduct.id);
        batch.update(productRef, p as any);
        updatedCount++;
      } else {
        const productRef = doc(collection(db, "events", activeEventId, "products"));
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
    if (!activeEventId) return;
    if (invoices.length === 0) {
      toast({ title: "No invoices to clear", description: "Your invoice list is already empty." });
      return;
    }
    try {
      const invoicesRef = collection(db, "events", activeEventId, "invoices");
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
    if (!activeEventId) return;
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
    const invoiceCounterRef = doc(db, 'events', activeEventId, 'counters', 'invoices');

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
            quantity: item.quantity,
            price: item.price,
            name: product?.name || 'Unknown Product',
            cost: product?.cost || 0,
            description: product?.description || '',
            barcode: product?.barcode || '',
            possibleDiscount: product?.possibleDiscount || 0,
            salePercentage: product?.salePercentage || 0,
        };
    });

    const subtotal = itemsWithFullDetails.reduce((acc, item) => acc + item.price * item.quantity, 0);
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
    };

    try {
      const batch = writeBatch(db);
      batch.set(invoiceRef, newInvoice);

      invoiceData.items.forEach(p => {
        const currentProduct = products.find(prod => prod.id === p.id);
        if (currentProduct) {
          const productRef = doc(db, "events", activeEventId, "products", p.id);
          const newStock = Math.max(0, currentProduct.quantity - p.quantity);
          batch.update(productRef, { quantity: newStock });
        }
      });
      
      await batch.commit();
      setSelectedRows([]);
      await clearScanningSession();
      toast({ title: "Invoice Created", description: `Invoice ${newInvoiceNumber} created successfully.` });
      return newInvoice;

    } catch (error) {
      console.error("Error creating invoice: ", error);
      toast({ title: "Error", description: "Failed to create invoice.", variant: "destructive" });
      throw error; // Re-throw to be caught in the dialog
    }
  };

  const exportInvoicesToXlsx = () => {
    const productsMap = new Map(products.map(p => [p.id, p.barcode]));
    const dataToExport = invoices.flatMap(inv => 
        inv.items.map(item => ({
            "Invoice Number": inv.invoiceNumber || inv.id,
            "Date": new Date(inv.date).toLocaleString('en-IN'),
            "Customer Name": inv.customerName,
            "Customer Phone": inv.customerPhone,
            "Product Barcode": item.barcode || productsMap.get(item.id) || item.id,
            "Product Name": item.name,
            "Product Description": item.description,
            "Quantity": item.quantity,
            "Price": item.price,
            "Cost": item.cost || 0,
            "Subtotal": inv.subtotal,
            "Discount %": inv.discountPercentage,
            "Discount Amount": inv.discountAmount,
            "GST": inv.gstAmount,
            "Grand Total": inv.grandTotal,
        }))
    );

    if (dataToExport.length === 0) {
        toast({ title: "No invoices to export", variant: "destructive", description: "Create an invoice first." });
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");

    worksheet['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
        { wch: 40 }, { wch: 50 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ];

    XLSX.writeFile(workbook, "invoices.xlsx");
  }

  const exportInventoryToXlsx = () => {
    if (products.length === 0) {
      toast({ title: "No inventory to export", variant: "destructive", description: "Add a product first." });
      return;
    }

    const heading = [
      ["Barcode", "Name", "Description", "Quantity", "Price", "Cost", "Possible Discount", "Sale Percentage"],
    ];

    const dataToExport = products.map(p => [
      p.barcode,
      p.name,
      p.description,
      p.quantity,
      p.price,
      p.cost,
      p.possibleDiscount || 0,
      p.salePercentage || 0,
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([...heading, ...dataToExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    
    // Set column widths for better readability
    worksheet['!cols'] = [
        { wch: 20 }, // Barcode
        { wch: 40 }, // Name
        { wch: 50 }, // Description
        { wch: 10 }, // Quantity
        { wch: 15 }, // Price
        { wch: 15 }, // Cost
        { wch: 20 }, // Possible Discount
        { wch: 20 }, // Sale Percentage
    ];

    XLSX.writeFile(workbook, "inventory.xlsx");
  };

  const handleUploadFile = async (file: File) => {
    if (!file || !activeEventId) return;

    const toastId = "upload-toast";
    toast({
      id: toastId,
      title: "Uploading File...",
      description: "Please wait while the file is being uploaded.",
    });

    const storageRef = ref(storage, `events/${activeEventId}/savedFiles/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      await addDoc(collection(db, "events", activeEventId, "savedFiles"), {
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
      throw error;
    }
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    if (!activeEventId) return;
    const toastId = "delete-toast";
    toast({
      id: toastId,
      title: "Deleting File...",
      description: "Please wait while the file is being removed.",
    });

    try {
      await deleteDoc(doc(db, "events", activeEventId, "savedFiles", fileId));
      
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
      if (error.code === 'storage/object-not-found') {
         await deleteDoc(doc(db, "events", activeEventId, "savedFiles", fileId));
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

  const handleOpenInvoiceDialog = (products: Product[]) => {
    if (products.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select products to create an invoice.",
        variant: "destructive"
      });
      return;
    }
    setProductsForDialog(products);
    setIsBulkInvoiceDialogOpen(true);
  };
  
  const handleOpenBulkEditDialog = (products: Product[]) => {
    if (products.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select products to edit.",
        variant: "destructive"
      });
      return;
    }
    setProductsForDialog(products);
    setIsBulkEditDialogOpen(true);
  };

  const handleGenerateTags = (products: Product[]) => {
    if (products.length === 0) {
        toast({
            title: "No Products Selected",
            description: "Please select products to generate tags.",
            variant: "destructive",
        });
        return;
    }
    generatePriceTagsPDF(products, toast);
  };
  
  const isLoading = authLoading || isRoleLoading;

  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderContent = () => {
    if (!activeEventId) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Activity className="mx-auto h-12 w-12 text-primary" />
                    <h2 className="text-2xl font-bold tracking-tight">Welcome to Roopkotha</h2>
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
              onUploadFile={handleUploadFile}
              onViewFiles={() => setIsViewFilesOpen(true)}
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
              onFilterChange={setFilter}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onCreateInvoice={handleOpenInvoiceDialog}
              isLoading={isDataLoading}
              userRole={userRole}
              onScan={handleScanAndAdd}
              onOpenBulkEditDialog={handleOpenBulkEditDialog}
              onGenerateTags={handleGenerateTags}
            />
        </main>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <HummingbirdAnimation />
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
      <BulkEditDialog
        isOpen={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        productIds={productsForDialog.map(p => p.id)}
        onBulkUpdate={bulkUpdateProducts}
      />
    </div>
  );
}
