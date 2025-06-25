
"use client";

import { useState, useMemo } from 'react';
import type { Product, UserProfile } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Trash2, ShoppingCart, Search, ArrowUpDown, Pencil } from 'lucide-react';
import InvoiceDialog from './invoice-dialog';
import EditProductDialog from './edit-product-dialog';
import { Skeleton } from '@/components/ui/skeleton';

type InventoryTableProps = {
  products: Product[];
  removeProduct: (productId: string) => void;
  bulkRemoveProducts: (productIds: string[]) => void;
  updateProduct: (productId: string, data: Partial<Omit<Product, 'id'>>) => void;
  updateProductQuantity: (productId: string, newQuantity: number) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  selectedRows: string[];
  setSelectedRows: (ids: string[]) => void;
  onCreateInvoice: (invoiceData: { customerName: string; customerPhone: string; items: {id: string, quantity: number, price: number}[]; discountPercentage: number; }) => Promise<string>;
  isLoading: boolean;
  userRole: UserProfile['role'] | null;
};

type SortKey = keyof Product | null;

export default function InventoryTable({ products, removeProduct, bulkRemoveProducts, updateProduct, updateProductQuantity, filter, onFilterChange, selectedRows, setSelectedRows, onCreateInvoice, isLoading, userRole }: InventoryTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [productToRemove, setProductToRemove] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const isAdmin = userRole === 'admin';

  const filteredProducts = useMemo(() => {
    let sortableProducts = [...products];
    if (sortConfig.key) {
      sortableProducts.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableProducts.filter(p =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.barcode.toLowerCase().includes(filter.toLowerCase())
    );
  }, [products, filter, sortConfig]);

  const requestSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const handleSelectRow = (id: string) => {
    if (!isAdmin) return;
    const newSelection = selectedRows.includes(id)
      ? selectedRows.filter(rowId => rowId !== id)
      : [...selectedRows, id];
    setSelectedRows(newSelection);
  };

  const handleSelectAll = () => {
    if (!isAdmin) return;
    if (selectedRows.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredProducts.map(p => p.id));
    }
  };

  const selectedProductsForInvoice = useMemo(() => {
    return products.filter(p => selectedRows.includes(p.id));
  }, [products, selectedRows]);
  
  const SortableHeader = ({ tKey, title }: { tKey: keyof Product, title: string }) => (
    <Button variant="ghost" onClick={() => requestSort(tKey)}>
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  return (
    <section className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory</h2>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or scan barcode..."
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && selectedRows.length > 0 && (
          <div className="flex items-center gap-2">
            <InvoiceDialog 
              products={selectedProductsForInvoice} 
              onCreateInvoice={onCreateInvoice}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedRows.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground"
                  onClick={() => setIsBulkDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <div className="rounded-md border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={!isLoading && selectedRows.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  disabled={isLoading || filteredProducts.length === 0 || !isAdmin}
                />
              </TableHead>
              <TableHead><SortableHeader tKey="name" title="Product Name" /></TableHead>
              <TableHead className="hidden md:table-cell"><SortableHeader tKey="description" title="Description" /></TableHead>
              <TableHead className="w-[120px] text-right"><SortableHeader tKey="price" title="Price" /></TableHead>
              <TableHead className="w-[120px] text-center"><SortableHeader tKey="quantity" title="Quantity" /></TableHead>
              <TableHead className="hidden lg:table-cell"><SortableHeader tKey="barcode" title="Barcode" /></TableHead>
              {isAdmin && <TableHead className="text-right w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="hover:bg-transparent">
                  <TableCell className="w-[50px]">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-3/4" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-16 ml-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-8 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <TableRow key={product.id} data-state={selectedRows.includes(product.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.includes(product.id)}
                      onCheckedChange={() => handleSelectRow(product.id)}
                      aria-label={`Select ${product.name}`}
                      disabled={!isAdmin}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-xs">{product.description}</TableCell>
                  <TableCell className="text-right">₹{product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">{product.quantity}</TableCell>
                  <TableCell className="hidden font-mono lg:table-cell">{product.barcode}</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setProductToEdit(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateProductQuantity(product.id, product.quantity - 1)}
                            disabled={product.quantity === 0}
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Sell One
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="focus:bg-destructive/80 focus:text-destructive-foreground text-destructive" onClick={() => setProductToRemove(product.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                  No sarees found. Add one, or check your Firebase connection.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {productToEdit && (
        <EditProductDialog
          isOpen={!!productToEdit}
          onOpenChange={(isOpen) => !isOpen && setProductToEdit(null)}
          product={productToEdit}
          updateProduct={updateProduct}
        />
      )}

      <AlertDialog open={!!productToRemove} onOpenChange={(open) => !open && setProductToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the product from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => {
              if (productToRemove) {
                removeProduct(productToRemove);
                setProductToRemove(null);
              }
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteConfirmOpen} onOpenChange={setIsBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove {selectedRows.length} selected product(s) from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => {
              bulkRemoveProducts(selectedRows);
              setIsBulkDeleteConfirmOpen(false);
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
