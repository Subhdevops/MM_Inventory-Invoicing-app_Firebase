
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Product, Invoice, SavedFile, Vendor, UserProfile } from '@/lib/types';

export const useEventData = (activeEventId: string | null, userRole: UserProfile['role'] | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (!activeEventId) {
      setIsDataLoading(false);
      setProducts([]);
      setInvoices([]);
      setSavedFiles([]);
      setVendors([]);
      return;
    }

    setIsDataLoading(true);

    const subscriptions: (() => void)[] = [];

    const productsQuery = query(collection(db, "events", activeEventId, "products"), orderBy("name"));
    subscriptions.push(onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }));

    const invoicesQuery = query(collection(db, "events", activeEventId, "invoices"), orderBy("date", "desc"));
    subscriptions.push(onSnapshot(invoicesQuery, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    }));

    const savedFilesQuery = query(collection(db, 'events', activeEventId, 'savedFiles'), orderBy('createdAt', 'desc'));
    subscriptions.push(onSnapshot(savedFilesQuery, (snapshot) => {
      setSavedFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedFile)));
    }));
    
    // Only subscribe to vendors if the user is an admin
    if (userRole === 'admin') {
      const vendorsQuery = query(collection(db, 'events', activeEventId, 'vendors'), orderBy('createdAt', 'desc'));
      subscriptions.push(onSnapshot(vendorsQuery, (snapshot) => {
        setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
      }));
    } else {
        setVendors([]); // Ensure vendors is empty for non-admins
    }

    // A short delay to allow all initial data to be fetched
    const timer = setTimeout(() => setIsDataLoading(false), 500);
    subscriptions.push(() => clearTimeout(timer));


    // Cleanup function to unsubscribe from all listeners
    return () => {
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [activeEventId, userRole]);

  return { products, invoices, savedFiles, vendors, isDataLoading };
};
