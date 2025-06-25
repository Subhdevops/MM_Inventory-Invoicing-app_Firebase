
export type Product = {
  id: string;
  name: string;
  quantity: number;
  barcode: string;
  price: number;
  cost: number;
};

export type SoldProduct = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  cost: number;
}

export type Invoice = {
  id: string;
  customerName: string;
  customerPhone: string;
  items: SoldProduct[];
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  date: string;
  pdfUrl: string;
};
