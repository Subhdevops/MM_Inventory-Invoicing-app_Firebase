"use client";

import AddProductDialog from './add-product-dialog';
import type { Product } from '@/lib/types';

type HeaderProps = {
  addProduct: (product: Omit<Product, 'id'>) => void;
};

export default function Header({ addProduct }: HeaderProps) {
  return (
    <header className="flex-shrink-0 bg-card border-b shadow-sm sticky top-0 z-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">ROOPKOTHA</h1>
          </div>
          <AddProductDialog addProduct={addProduct} />
        </div>
      </div>
    </header>
  );
}
