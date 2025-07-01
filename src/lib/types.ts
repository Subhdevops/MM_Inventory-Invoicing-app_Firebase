
export type Product = {
  id: string;
  name: string;
  description: string;
  quantity: number;
  barcode: string;
  price: number;
  cost: number;
};

export type SoldProduct = {
  id:string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  cost: number;
  barcode: string;
}

export type Invoice = {
  id: string;
  invoiceNumber: number;
  date: string;
  customerName: string;
  customerPhone: string;
  items: SoldProduct[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  gstAmount: number;
  grandTotal: number;
};

export type UserProfile = {
  uid: string;
  email: string | null;
  role: 'admin' | 'user';
  lastSignOutTimestamp?: number;
};

export type InvoiceItem = {
    id: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    stock: number;
    quantity: number;
};

export type SavedFile = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  fileType: string;
};
