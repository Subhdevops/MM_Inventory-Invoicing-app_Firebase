
export type Event = {
  id: string;
  name: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  barcode: string;
  price: number;
  cost: number;
  possibleDiscount?: number;
  salePercentage?: number;
  uniqueProductCode: string; // New field for individual identification
  isSold: boolean; // To track if the specific item is sold
};

export type SoldProduct = {
  id:string;
  name: string;
  description: string;
  price: number;
  cost: number;
  barcode: string;
  possibleDiscount?: number;
  salePercentage?: number;
  uniqueProductCode: string;
}

export type CustomLineItem = {
  id: string; // Can be a UUID for the line item itself
  description: string;
  quantity: number;
  price: number;
}

export type Invoice = {
  id: string;
  invoiceNumber: number;
  date: string;
  customerName: string;
  customerPhone: string;
  items: SoldProduct[] | CustomLineItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  gstAmount: number;
  grandTotal: number;
  type: 'standard' | 'custom';
  title?: string;
};

export type UserProfile = {
  uid: string;
  email: string | null;
  role: 'admin' | 'user';
  activeEventId?: string | null;
  lastSignOutTimestamp?: number;
};

// This type is adjusted. An "InvoiceItem" is a representation of a product
// selected for invoicing. Since we sell unique items, quantity is always 1.
export type InvoiceItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    uniqueProductCode: string;
    possibleDiscount?: number;
};

export type SavedFile = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  fileType: string;
};
