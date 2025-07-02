
"use client";

import { useState, useMemo, useCallback } from 'react';
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
import { MoreHorizontal, Trash2, ShoppingCart, Search, ArrowUpDown, Pencil, FileText, Tags, Camera } from 'lucide-react';
import EditProductDialog from './edit-product-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CameraScannerDialog } from './camera-scanner-dialog';
import { Badge } from '@/components/ui/badge';


type InventoryTableProps = {
  products: Product[];
  removeProduct: (productId: string) => void;
  bulkRemoveProducts: (productIds: string[]) => void;
  updateProduct: (productId: string, data: Partial<Omit<Product, 'id'>>) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  selectedRows: string[];
  setSelectedRows: (ids: string[]) => void;
  onCreateInvoice: (products: Product[]) => void;
  isLoading: boolean;
  userRole: UserProfile['role'] | null;
  onScan: (barcode: string) => void;
  onOpenBulkEditDialog: (products: Product[]) => void;
  onGenerateTags: (products: Product[]) => void;
};

type SortKey = keyof Product | null;

export default function InventoryTable({ products, removeProduct, bulkRemoveProducts, updateProduct, filter, onFilterChange, selectedRows, setSelectedRows, onCreateInvoice, isLoading, userRole, onScan, onOpenBulkEditDialog, onGenerateTags }: InventoryTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [productToRemove, setProductToRemove] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const isAdmin = userRole === 'admin';

  const { availableCount, soldOutCount } = useMemo(() => {
    return {
      availableCount: products.filter(p => p.quantity > 0).length,
      soldOutCount: products.filter(p => p.quantity === 0).length
    };
  }, [products]);

  const handleScan = useCallback((barcode: string) => {
    onScan(barcode);
    onFilterChange(''); // Clear search input for better UX
    setIsScannerOpen(false);
  }, [onScan, onFilterChange]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const { availableProducts, soldOutProducts } = useMemo(() => {
    let filtered = products;
    if (filter) {
        filtered = filtered.filter(p =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          p.barcode.toLowerCase().includes(filter.toLowerCase())
        );
    }
    
    const sortableProducts = [...filtered];
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

    return {
        availableProducts: sortableProducts.filter(p => p.quantity > 0),
        soldOutProducts: sortableProducts.filter(p => p.quantity === 0)
    };
  }, [products, filter, sortConfig]);

  const allFilteredProducts = useMemo(() => [...availableProducts, ...soldOutProducts], [availableProducts, soldOutProducts]);
  
  const handleSelectRow = (id: string) => {
    if (!isAdmin) return;
    const newSelection = selectedRows.includes(id)
      ? selectedRows.filter(rowId => rowId !== id)
      : [...selectedRows, id];
    setSelectedRows(newSelection);
  };

  const handleSelectAll = () => {
    if (!isAdmin) return;
    if (selectedRows.length === allFilteredProducts.length && allFilteredProducts.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(allFilteredProducts.map(p => p.id));
    }
  };

  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedRows.includes(p.id));
  }, [products, selectedRows]);
  
  const SortableHeader = ({ tKey, title }: { tKey: keyof Product, title: string }) => (
    <Button variant="ghost" onClick={() => requestSort(tKey)}>
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  const renderProductRow = (product: Product) => (
    <TableRow
      key={product.id}
      data-state={selectedRows.includes(product.id) && "selected"}
      className={product.quantity === 0 ? "opacity-60" : ""}
    >
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
                onClick={() => onCreateInvoice([product])}
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
  );

  return (
    <section className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory</h2>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or barcode..."
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              className="pl-10 pr-10"
            />
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setIsScannerOpen(true)}
                aria-label="Scan barcode with camera"
            >
                <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Available: {availableCount}</Badge>
            <Badge variant="destructive">Sold Out: {soldOutCount}</Badge>
          </div>
        </div>
        {isAdmin && selectedRows.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-start">
             <Button 
              onClick={() => onGenerateTags(selectedProducts)}
              variant="outline"
            >
                <Tags className="mr-2 h-4 w-4" />
                Generate Tags ({selectedRows.length})
            </Button>
            <Button 
              onClick={() => onCreateInvoice(selectedProducts)} 
              disabled={selectedProducts.length === 0 || selectedProducts.every(p => p.quantity === 0)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Invoice ({selectedRows.length})
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedRows.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenBulkEditDialog(selectedProducts)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Selected
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                  checked={!isLoading && allFilteredProducts.length > 0 && selectedRows.length === allFilteredProducts.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                  disabled={isLoading || allFilteredProducts.length === 0 || !isAdmin}
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
            ) : allFilteredProducts.length > 0 ? (
              <>
                {availableProducts.map(renderProductRow)}

                {soldOutProducts.length > 0 && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={isAdmin ? 7 : 6} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Sold Out
                    </TableCell>
                  </TableRow>
                )}
                
                {soldOutProducts.map(renderProductRow)}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CameraScannerDialog
        isOpen={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleScan}
      />

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
