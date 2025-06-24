
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Package, Boxes, AlertTriangle, FileText, Download, PackageSearch } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

type DashboardProps = {
  stats: {
    totalProducts: number;
    totalItems: number;
    productsOutOfStock: number;
  };
  chartData: { name: string; quantity: number; }[];
  onExportInvoices: () => void;
  onExportInventory: () => void;
  totalInvoices: number;
  isLoading: boolean;
};

const chartConfig = {
  quantity: {
    label: "Quantity",
    color: "hsl(var(--primary))",
  },
}

export default function Dashboard({ stats, chartData, onExportInvoices, onExportInventory, totalInvoices, isLoading }: DashboardProps) {
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
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Stocked Sarees</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          {isLoading ? (
            <Skeleton className="min-h-[300px] w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 15) + (value.length > 15 ? '...' : '')}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="quantity" fill="var(--color-quantity)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
