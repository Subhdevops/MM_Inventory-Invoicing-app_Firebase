
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
  Bar,
  BarChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Package, Boxes, AlertTriangle, FileText, Download, PackageSearch, IndianRupee, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/lib/types";
import ResetInvoiceNumberDialog from "./reset-invoice-number-dialog";

type ChartView = 'top-stocked' | 'lowest-stocked' | 'best-sellers' | 'most-profitable';

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
  };
  chartView: ChartView;
  onChartViewChange: (view: ChartView) => void;
  onExportInvoices: () => void;
  onExportInventory: () => void;
  totalInvoices: number;
  totalRevenue: number;
  totalProfit: number;
  isLoading: boolean;
  onClearAllInvoices: () => Promise<void>;
  onResetInvoiceCounter: (newStartNumber?: number) => Promise<void>;
  userRole: UserProfile['role'] | null;
};

const chartMeta: Record<ChartView, {
  title: string;
  config: any;
  label: string;
  icon: React.ElementType;
}> = {
  'top-stocked': {
    title: 'Top 5 Stocked Sarees',
    config: { value: { label: 'Quantity', color: 'hsl(var(--chart-1))' } },
    label: 'Quantity',
    icon: Boxes,
  },
  'lowest-stocked': {
    title: 'Top 5 Lowest Stock Sarees',
    config: { value: { label: 'Quantity', color: 'hsl(var(--chart-5))' } },
    label: 'Quantity',
    icon: TrendingDown,
  },
  'best-sellers': {
    title: 'Top 5 Best-Selling Sarees',
    config: { value: { label: 'Units Sold', color: 'hsl(var(--chart-2))' } },
    label: 'Units Sold',
    icon: TrendingUp,
  },
  'most-profitable': {
    title: 'Top 5 Most Profitable Sarees',
    config: { value: { label: 'Profit (₹)', color: 'hsl(var(--chart-4))' } },
    label: 'Profit',
    icon: IndianRupee,
  },
};

export default function Dashboard({ stats, chartData, chartView, onChartViewChange, onExportInvoices, onExportInventory, totalInvoices, totalRevenue, totalProfit, isLoading, onClearAllInvoices, onResetInvoiceCounter, userRole }: DashboardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  
  const handleClearInvoices = async () => {
    await onClearAllInvoices();
    setIsConfirmOpen(false);
  };
  
  const isAdmin = userRole === 'admin';

  const currentChartData = chartData[chartView];
  const currentChartMeta = chartMeta[chartView];

  return (
    <section className="space-y-6">
       <div className="flex justify-between items-center">
         <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
         <div className="flex items-center gap-2">
            <Button onClick={onExportInventory} variant="outline" size="icon" className="sm:w-auto sm:px-4" disabled={isLoading}>
              <PackageSearch className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export Inventory (CSV)</span>
            </Button>
            <Button onClick={onExportInvoices} variant="outline" size="icon" className="sm:w-auto sm:px-4" disabled={isLoading}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export Invoices (CSV)</span>
            </Button>
         </div>
       </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Total Designs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.totalProducts}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Unique saree designs in inventory</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Total quantity of all sarees</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stats.productsOutOfStock}</div>}
            {isLoading ? <Skeleton className="h-4 w-full mt-2" /> : <p className="text-xs text-muted-foreground">Sarees that need restocking</p>}
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{currentChartMeta.title}</CardTitle>
            <Select value={chartView} onValueChange={(value) => onChartViewChange(value as ChartView)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a view" />
              </SelectTrigger>
              <SelectContent>
                 {Object.entries(chartMeta).map(([key, { title, icon: Icon }]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{title.replace("Top 5 ", "")}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <Skeleton className="min-h-[300px] w-full" />
            ) : currentChartData.length > 0 ? (
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
            ) : (
               <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
                  <p>No data to display for this view.</p>
                </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
  );
}
