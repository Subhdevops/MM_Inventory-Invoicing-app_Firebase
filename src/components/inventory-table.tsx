
"use client";

import { useState, useMemo, useCallback, Fragment } from 'react';
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
import { MoreHorizontal, Trash2, ShoppingCart, Search, ArrowUpDown, Pencil, FileText, Tags, Camera, ChevronDown, ChevronRight, ArchiveRestore } from 'lucide-react';
import EditProductDialog from './edit-product-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CameraScannerDialog } from './camera-scanner-dialog';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { RestockDialog } from './restock-dialog';

type GroupedProduct = {
  barcode: string;
  name: string;
  description: string;
  price: number;
  items: Product[];
  availableCount: number;
};

type InventoryTableProps = {
  products: Product[];
  removeProduct: (productId: string) => void;
  bulkRemoveProducts: (productIds: string[]) => void;
  updateProduct: (productId: string, data: Partial<Omit<Product, 'id' | 'uniqueProductCode' | 'isSold'>>) => void;
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
  onRestockProduct: (originalProduct: Product, newUniqueProductCode: string) => Promise<void>;
  onDeleteAllSoldOut: () => Promise<void>;
};

type SortKey = keyof GroupedProduct | 'price' | null;
type View = 'available' | 'sold-out';

export default function InventoryTable({ products, removeProduct, bulkRemoveProducts, updateProduct, filter, onFilterChange, selectedRows, setSelectedRows, onCreateInvoice, isLoading, userRole, onScan, onOpenBulkEditDialog, onGenerateTags, onRestockProduct, onDeleteAllSoldOut }: InventoryTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [productToRemove, setProductToRemove] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isDeleteAllSoldConfirmOpen, setIsDeleteAllSoldConfirmOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productToRestock, setProductToRestock] = useState<Product | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [view, setView] = useState<View>('available');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  const isAdmin = userRole === 'admin';

  const { availableCount, soldOutCount } = useMemo(() => {
    return {
      availableCount: products.filter(p => !p.isSold).length,
      soldOutCount: products.filter(p => p.isSold).length
    };
  }, [products]);

  const handleScan = useCallback((barcode: string) => {
    onScan(barcode);
    onFilterChange('');
    setIsScannerOpen(false);
  }, [onScan, onFilterChange]);

  const handleRestock = async (newUniqueProductCode: string) => {
    if (!productToRestock) return;
    await onRestockProduct(productToRestock, newUniqueProductCode);
    setProductToRestock(null);
  };
  
  const toggleRowExpansion = (barcode: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barcode)) {
        newSet.delete(barcode);
      } else {
        newSet.add(barcode);
      }
      return newSet;
    });
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const displayedProductGroups = useMemo(() => {
    const groups: { [barcode: string]: GroupedProduct } = {};

    products.forEach(p => {
      if (!groups[p.barcode]) {
        groups[p.barcode] = {
          barcode: p.barcode,
          name: p.name,
          description: p.description,
          price: p.price,
          items: [],
          availableCount: 0,
        };
      }
      groups[p.barcode].items.push(p);
      if (!p.isSold) {
        groups[p.barcode].availableCount++;
      }
    });
    
    let filteredGroups = Object.values(groups);

    if (filter) {
      const lowercasedFilter = filter.toLowerCase();
      filteredGroups = filteredGroups.filter(g =>
        g.name.toLowerCase().includes(lowercasedFilter) ||
        g.barcode.toLowerCase().includes(lowercasedFilter) ||
        g.items.some(p => p.uniqueProductCode.toLowerCase().includes(lowercasedFilter))
      );
    }
    
    if (view === 'available') {
        filteredGroups = filteredGroups.filter(g => g.items.some(p => !p.isSold));
    } else {
        filteredGroups = filteredGroups.filter(g => g.items.some(p => p.isSold));
    }

    if (sortConfig.key) {
        filteredGroups.sort((a, b) => {
            const key = sortConfig.key as keyof GroupedProduct;
            const valA = a[key] ?? 0;
            const valB = b[key] ?? 0;
            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    return filteredGroups;
  }, [products, filter, sortConfig, view]);
  
  const handleSelectGroup = (group: GroupedProduct, isChecked: boolean) => {
    if (!isAdmin) return;
    const availableItemIds = group.items.filter(p => !p.isSold).map(p => p.id);
    const newSelection = new Set(selectedRows);
    if(isChecked) {
        availableItemIds.forEach(id => newSelection.add(id));
    } else {
        availableItemIds.forEach(id => newSelection.delete(id));
    }
    setSelectedRows(Array.from(newSelection));
  };
  
  const handleSelectAll = () => {
    if (!isAdmin) return;
    
    const allVisibleAvailableItemIds = displayedProductGroups
        .flatMap(g => g.items)
        .filter(p => !p.isSold)
        .map(p => p.id);
    
    const allSelected = allVisibleAvailableItemIds.length > 0 && allVisibleAvailableItemIds.every(id => selectedRows.includes(id));
    
    if (allSelected) {
        setSelectedRows([]);
    } else {
        setSelectedRows(allVisibleAvailableItemIds);
    }
  };


  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedRows.includes(p.id));
  }, [products, selectedRows]);
  
  const SortableHeader = ({ tKey, title }: { tKey: SortKey, title: string }) => (
    <Button variant="ghost" onClick={() => requestSort(tKey)}>
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
  
  const handleSelectRow = (id: string, isSold: boolean) => {
    if (!isAdmin || isSold) return;
    const newSelection = selectedRows.includes(id)
      ? selectedRows.filter(rowId => rowId !== id)
      : [...selectedRows, id];
    setSelectedRows(newSelection);
  };


  return (
    <section className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory</h2>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or any code..."
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              className="pl-10 w-full"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hidden md:inline-flex"
              onClick={() => setIsScannerOpen(true)}
              aria-label="Scan barcode with camera"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 p-1 bg-muted rounded-md shrink-0">
            <Button
              variant={view === 'available' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('available')}
              className="flex-1"
            >
              Available ({availableCount})
            </Button>
            <Button
              variant={view === 'sold-out' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('sold-out')}
              className="flex-1"
            >
              Sold Out ({soldOutCount})
            </Button>
          </div>
        </div>
        {isAdmin && selectedRows.length > 0 && view === 'available' && (
          <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end shrink-0">
             <Button 
              onClick={() => onGenerateTags(selectedProducts)}
              variant="outline"
              size="sm"
            >
                <Tags className="mr-2 h-4 w-4" />
                Generate Tags ({selectedRows.length})
            </Button>
            <Button 
              onClick={() => onCreateInvoice(selectedProducts)} 
              disabled={selectedProducts.some(p => p.isSold)}
              size="sm"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Invoice ({selectedRows.length})
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions ({selectedRows.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenBulkEditDialog(selectedProducts)} disabled={selectedProducts.some(p => p.isSold)}>
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
        {isAdmin && view === 'sold-out' && soldOutCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end shrink-0">
                <Button variant="destructive" onClick={() => setIsDeleteAllSoldConfirmOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Sold Items ({soldOutCount})
                </Button>
            </div>
        )}
      </div>
      <div className="rounded-md border bg-card shadow-sm">
        <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={!isLoading && displayedProductGroups.flatMap(g => g.items).filter(p => !p.isSold).length > 0 && displayedProductGroups.flatMap(g => g.items).filter(p => !p.isSold).every(p => selectedRows.includes(p.id))}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      disabled={isLoading || displayedProductGroups.length === 0 || !isAdmin || view === 'sold-out'}
                    />
                  </TableHead>
                  <TableHead><SortableHeader tKey="name" title="Product Name" /></TableHead>
                  <TableHead className="w-[120px]">Stock</TableHead>
                  <TableHead className="hidden md:table-cell"><SortableHeader tKey="description" title="Description" /></TableHead>
                  <TableHead className="w-[120px] text-right"><SortableHeader tKey="price" title="Price" /></TableHead>
                  <TableHead className="hidden lg:table-cell"><SortableHeader tKey="barcode" title="Barcode" /></TableHead>
                  {isAdmin && <TableHead className="text-right w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index} className="hover:bg-transparent">
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : displayedProductGroups.length > 0 ? (
                    displayedProductGroups.map(group => {
                        const isGroupSelected = group.availableCount > 0 && group.items.filter(p => !p.isSold).every(p => selectedRows.includes(p.id));
                        const isGroupIndeterminate = !isGroupSelected && group.items.filter(p => !p.isSold).some(p => selectedRows.includes(p.id));
                        const itemsInView = view === 'available' ? group.items.filter(p => !p.isSold) : group.items.filter(p => p.isSold);
                        if (itemsInView.length === 0 && filter) return null; // Don't show group if filter hides all items
                        
                        return(
                        <Fragment key={group.barcode}>
                            <TableRow className="font-bold bg-muted/30">
                                <TableCell>
                                    <Checkbox
                                        checked={isGroupSelected}
                                        onCheckedChange={(isChecked) => handleSelectGroup(group, !!isChecked)}
                                        aria-label={`Select all ${group.name}`}
                                        disabled={!isAdmin || group.availableCount === 0 || view === 'sold-out'}
                                        data-state={isGroupIndeterminate ? 'indeterminate' : (isGroupSelected ? 'checked' : 'unchecked')}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button variant="ghost" onClick={() => toggleRowExpansion(group.barcode)} className="px-2 py-1 h-auto">
                                        {expandedRows.has(group.barcode) ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                                        {group.name}
                                    </Button>
                                </TableCell>
                                <TableCell>{group.availableCount} / {group.items.length}</TableCell>
                                <TableCell className="hidden md:table-cell truncate max-w-xs">{group.description}</TableCell>
                                <TableCell className="text-right">₹{group.price.toFixed(2)}</TableCell>
                                <TableCell className="hidden font-mono lg:table-cell">{group.barcode}</TableCell>
                                {isAdmin && view === 'available' && (
                                    <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Group Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => onOpenBulkEditDialog(group.items.filter(p => !p.isSold))} disabled={group.availableCount === 0}>
                                                <Pencil className="mr-2 h-4 w-4" /> Bulk Edit Available
                                            </DropdownMenuItem>
                                             <DropdownMenuItem onClick={() => onCreateInvoice(group.items.filter(p => !p.isSold))} disabled={group.availableCount === 0}>
                                                <ShoppingCart className="mr-2 h-4 w-4" /> Sell All Available
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    </TableCell>
                                )}
                                {isAdmin && view === 'sold-out' && (
                                    <TableCell className="text-right"></TableCell>
                                )}
                            </TableRow>
                            {expandedRows.has(group.barcode) && (
                                <TableRow>
                                    <TableCell colSpan={isAdmin ? 7 : 6} className="p-0">
                                        <div className="bg-background p-2">
                                        <Table>
                                             <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                    <TableHead>Unique Code</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="w-[160px] text-right">Possible Discount</TableHead>
                                                    <TableHead className="w-[120px] text-center">Sale %</TableHead>
                                                    {isAdmin && <TableHead className="text-right w-[100px]">Actions</TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                            {group.items.filter(p => view === 'available' ? !p.isSold : p.isSold).map(product => (
                                                <TableRow key={product.id} data-state={selectedRows.includes(product.id) && "selected"} className={cn(product.isSold && "opacity-50", "hover:bg-muted/50")}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedRows.includes(product.id)}
                                                            onCheckedChange={() => handleSelectRow(product.id, product.isSold)}
                                                            aria-label={`Select ${product.uniqueProductCode}`}
                                                            disabled={!isAdmin || product.isSold}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono">{product.uniqueProductCode}</TableCell>
                                                    <TableCell>{product.isSold ? <Badge variant="destructive">Sold</Badge> : <Badge variant="secondary">Available</Badge>}</TableCell>
                                                    <TableCell className="text-right">
                                                        {product.possibleDiscount && product.possibleDiscount > 0 ? (
                                                        <span className="text-destructive font-semibold">
                                                            ₹{product.possibleDiscount.toFixed(2)}
                                                        </span>
                                                        ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {product.salePercentage && product.salePercentage > 0 ? (
                                                            <span className="font-bold text-destructive">
                                                            {product.salePercentage}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </TableCell>
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
                                                            {product.isSold ? (
                                                                <DropdownMenuItem onClick={() => setProductToRestock(product)}>
                                                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                                                    Restock
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => setProductToEdit(product)}>
                                                                        <Pencil className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => onCreateInvoice([product])}>
                                                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                                                        Sell This Item
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
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
                                            ))}
                                            </TableBody>
                                        </Table>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </Fragment>
                    )})
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
      </div>

       <Button 
        variant="default" 
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-20 animate-pulse-primary md:hidden"
        )}
        onClick={() => setIsScannerOpen(true)}
        aria-label="Scan barcode with camera"
      >
        <Camera className="h-6 w-6" />
      </Button>

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
      
      {productToRestock && (
        <RestockDialog
            isOpen={!!productToRestock}
            onOpenChange={(open) => !open && setProductToRestock(null)}
            product={productToRestock}
            onRestock={handleRestock}
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
              This action cannot be undone. This will permanently remove {selectedRows.length} selected product(s).
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
      
      <AlertDialog open={isDeleteAllSoldConfirmOpen} onOpenChange={setIsDeleteAllSoldConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all {soldOutCount} sold items from your inventory. This does not affect past invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                onDeleteAllSoldOut();
                setIsDeleteAllSoldConfirmOpen(false);
              }}
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
