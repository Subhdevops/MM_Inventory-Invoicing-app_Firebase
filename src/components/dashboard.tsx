
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Package, Boxes, AlertTriangle, FileText, Download, PackageSearch, IndianRupee, Trash2, TrendingUp, TrendingDown, Receipt, FolderOpen, Eye, FileSignature, ArchiveRestore, LineChart as LineChartIcon } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile, SavedFile, Product, Invoice } from "@/lib/types";
import ResetInvoiceNumberDialog from "./reset-invoice-number-dialog";
import { UploadFileDialog } from "./upload-picture-dialog";
import ManageSoldOutDialog from "./manage-sold-out-dialog";

type ChartView = 'top-stocked' | 'lowest-stocked' | 'best-sellers' | 'most-profitable' | 'sales-over-time';

type DashboardProps = {
  stats: {
    totalProducts: number;
    totalItems: number;
    productsOutOfStock: number;
  };
  chartData: {
    'top-stocked': { name: string; value: number }[];
    'lowest-stocked': { name: string; value: number }[];
    'best-sellers': { name: string; value: number }[];
    'most-profitable': { name: string; value: number }[];
    'sales-over-time': { date: string; sales: number }[];
  };
  chartView: ChartView;
  onChartViewChange: (view: ChartView) => void;
  onExportInvoices: () => void;
  onExportInventory: () => void;
  totalInvoices: number;
  totalRevenue: number;
  totalProfit: number;
  totalGst: number;
  isLoading: boolean;
  onClearAllInvoices: () => Promise<void>;
  onResetInvoiceCounter: (newStartNumber?: number) => Promise<void>;
  userRole: UserProfile['role'] | null;
  savedFilesCount: number;
  activeEventId: string | null;
  onViewFiles: () => void;
  onOpenCustomInvoice: () => void;
  onUploadComplete: (fileData: Omit<SavedFile, 'id'>) => Promise<void>;
  soldProducts: Product[];
  onRestockProduct: (productData: Omit<Product, 'id' | 'isSold'>) => Promise<void>;
  onDeleteAllSoldOut: () => Promise<void>;
};

const chartMeta: Record<ChartView, {
  title: string;
  config: any;
  label: string;
  icon: React.ElementType;
}> = {
  'top-stocked': {
    title: 'Top 5 Stocked Items',
    config: { value: { label: 'Quantity', color: 'hsl(var(--chart-1))' } },
    label: 'Quantity',
    icon: Boxes,
  },
  'lowest-stocked': {
    title: 'Top 5 Lowest Stock Items',
    config: { value: { label: 'Quantity', color: 'hsl(var(--chart-5))' } },
    label: 'Quantity',
    icon: TrendingDown,
  },
  'best-sellers': {
    title: 'Top 5 Best-Selling Items',
    config: { value: { label: 'Units Sold', color: 'hsl(var(--chart-2))' } },
    label: 'Units Sold',
    icon: TrendingUp,
  },
  'most-profitable': {
    title: 'Top 5 Most Profitable Items',
    config: { value: { label: 'Profit (₹)', color: 'hsl(var(--chart-4))' } },
    label: 'Profit',
    icon: IndianRupee,
  },
  'sales-over-time': {
      title: 'Sales Over Time',
      config: { sales: { label: 'Sales', color: 'hsl(var(--chart-3))' } },
      label: 'Sales',
      icon: LineChartIcon,
  }
};

export default function Dashboard({ stats, chartData, chartView, onChartViewChange, onExportInvoices, onExportInventory, totalInvoices, totalRevenue, totalProfit, totalGst, isLoading, onClearAllInvoices, onResetInvoiceCounter, userRole, savedFilesCount, activeEventId, onViewFiles, onOpenCustomInvoice, onUploadComplete, soldProducts, onRestockProduct, onDeleteAllSoldOut }: DashboardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isManageSoldOutOpen, setIsManageSoldOutOpen] = useState(false);
  
  const handleClearInvoices = async () => {
    await onClearAllInvoices();
    setIsConfirmOpen(false);
  };
  
  const isAdmin = userRole === 'admin';

  const currentChartData = chartData[chartView];
  const currentChartMeta = chartMeta[chartView];

  const renderChart = () => {
    if (isLoading) {
      return <Skeleton className="min-h-[300px] w-full" />;
    }

    if (currentChartData.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
          <p>No data to display for this view.</p>
        </div>
      );
    }
    
    if (chartView === 'sales-over-time') {
      return (
        <ChartContainer config={currentChartMeta.config} className="min-h-[300px] w-full">
            <LineChart
                accessibilityLayer
                data={chartData['sales-over-time']}
                margin={{
                    left: 12,
                    right: 12,
                }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <Tooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Line
                    dataKey="sales"
                    type="natural"
                    stroke="var(--color-sales)"
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ChartContainer>
      );
    }

    return (
        <ChartContainer config={currentChartMeta.config} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={currentChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 15) + (value.length > 15 ? '…' : '')}
                />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                    formatter={(value) => {
                        if (chartView === 'most-profitable') {
                            return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value as number);
                        }
                        return value.toLocaleString();
                    }}
                />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
        </ChartContainer>
    );
};

  return (
    <>
    <section className="space-y-6">
       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
         <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
         <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <Button onClick={onOpenCustomInvoice} variant="outline" size="sm" disabled={isLoading}>
                  <FileSignature className="mr-2 h-4 w-4" />
                  <span>Custom Invoice</span>
                </Button>
                <Button onClick={onExportInventory} variant="outline" size="sm" disabled={isLoading}>
                  <PackageSearch className="mr-2 h-4 w-4" />
                  <span>Export Inventory</span>
                </Button>
                <Button onClick={onExportInvoices} variant="outline" size="sm" disabled={isLoading}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Export Invoices</span>
                </Button>
              </>
            )}
         </div>
       </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{
              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalRevenue)
            }</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Total sales from all invoices</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{
              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalProfit)
            }</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Total profit after costs</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GST Collected</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{
              new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalGst)
            }</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Total GST from all sales</p>}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Files</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={onViewFiles} disabled={isLoading || savedFilesCount === 0}>
                <Eye className="h-4 w-4" />
              </Button>
              <UploadFileDialog activeEventId={activeEventId} disabled={isLoading || !isAdmin} onUploadComplete={onUploadComplete} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{savedFilesCount}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Designs, documents, and references.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Designs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.totalProducts}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Unique product designs in inventory</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Total quantity of all items</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.productsOutOfStock}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Items that need restocking</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{totalInvoices}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Total sales generated</p>}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between pb-2 gap-2">
            <CardTitle>{currentChartMeta.title}</CardTitle>
            <Select value={chartView} onValueChange={(value) => onChartViewChange(value as ChartView)}>
              <SelectTrigger className="w-full sm:w-auto">
                <SelectValue placeholder="Select a view" />
              </SelectTrigger>
              <SelectContent>
                 {Object.entries(chartMeta).map(([key, { title, icon: Icon }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{title.replace("Top 5 ", "").replace(" Items", "")}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pl-2">
            {renderChart()}
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Button variant="destructive" onClick={() => setIsManageSoldOutOpen(true)} disabled={isLoading || !isAdmin || soldProducts.length === 0}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Manage Sold Out Items
              </Button>
               <p className="text-xs text-muted-foreground mt-2">Restock or permanently delete sold out items from inventory.</p>
            </div>
            <div>
              <Button variant="destructive" onClick={() => setIsConfirmOpen(true)} disabled={isLoading || !isAdmin}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Invoices
              </Button>
               <p className="text-xs text-muted-foreground mt-2">Permanently delete all invoice records from the database.</p>
            </div>
            <div>
              <ResetInvoiceNumberDialog onReset={onResetInvoiceCounter} disabled={isLoading || !isAdmin} />
              <p className="text-xs text-muted-foreground mt-2">Reset the starting number for future invoices. Use with caution.</p>
            </div>
             {!isAdmin && <p className="text-xs text-destructive mt-2">Admin access required for these actions.</p>}
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all invoices from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleClearInvoices}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
    <ManageSoldOutDialog 
        isOpen={isManageSoldOutOpen}
        onOpenChange={setIsManageSoldOutOpen}
        soldProducts={soldProducts}
        onRestock={onRestockProduct}
        onDeleteAllSoldOut={onDeleteAllSoldOut}
    />
    </>
  );
}
