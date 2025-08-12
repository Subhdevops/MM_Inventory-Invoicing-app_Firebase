
"use client";

import { useState, useRef } from 'react';
import * as z from "zod";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload, FileCode } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

const importSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  uniqueProductCode: z.string().min(1, { message: "Unique Product Code cannot be empty." }).transform(val => String(val)),
  barcode: z.string().min(1, { message: "Barcode cannot be empty." }).transform(val => String(val)),
  price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  cost: z.coerce.number().min(0, { message: "Cost must be a positive number." }),
  description: z.string().optional().default(''),
  possibleDiscount: z.coerce.number().min(0).optional().default(0),
  salePercentage: z.coerce.number().min(0).max(100).optional().default(0),
});

type ImportProduct = Omit<Product, 'id' | 'isSold'>;

type ImportInventoryDialogProps = {
  onImport: (products: ImportProduct[]) => Promise<void>;
};

export default function ImportInventoryDialog({ onImport }: ImportInventoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName("");
    }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
            toast({ title: "Empty File", variant: "destructive" });
            setIsImporting(false);
            return;
        }
        
        const normalizedJsonData = jsonData.map(row => {
            const newRow: {[key: string]: any} = {};
            for (const key in row) {
                const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, "");
                newRow[normalizedKey] = row[key];
            }
            if (newRow.hasOwnProperty('possiblediscount')) {
                newRow.possibleDiscount = newRow.possiblediscount;
                delete newRow.possiblediscount;
            }
            if (newRow.hasOwnProperty('salepercentage')) {
                newRow.salePercentage = newRow.salepercentage;
                delete newRow.salepercentage;
            }
            if (newRow.hasOwnProperty('uniqueproductcode')) {
                newRow.uniqueProductCode = newRow.uniqueproductcode;
                delete newRow.uniqueproductcode;
            }
            return newRow;
        });
        
        const requiredHeaders = ["barcode", "name", "price", "cost", "uniqueProductCode"];
        const actualHeaders = Object.keys(normalizedJsonData[0] || {});
        const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

        if (missingHeaders.length > 0) {
          toast({
            title: "Invalid Excel Format",
            description: `Missing columns: ${missingHeaders.join(', ')}.`,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        const validation = z.array(importSchema).safeParse(normalizedJsonData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          const errorRow = (firstError.path[0] as number) + 2; 
          const field = firstError.path[1] as string;
          const description = `Error in row ${errorRow}, column '${field}': ${firstError.message}.`;
          
          toast({ title: "Invalid Data in Excel File", description, variant: "destructive" });
          setIsImporting(false);
          return;
        }

        await onImport(validation.data);
        setIsImporting(false);
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setOpen(false);
      } catch (error) {
        toast({ title: "Parsing Error", variant: "destructive" });
        setIsImporting(false);
      }
    };
    
    reader.onerror = () => {
       toast({ title: "File Read Error", variant: "destructive" });
        setIsImporting(false);
    }

    reader.readAsArrayBuffer(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Import Inventory
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Inventory from Excel</DialogTitle>
          <DialogDescription>
            Select a .xlsx file. Required columns: 'uniqueProductCode', 'barcode', 'name', 'price', and 'cost'. Optional: 'description', 'possibleDiscount', 'salePercentage'.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <Button asChild variant="outline">
                <label htmlFor="excel-file" className="cursor-pointer">
                    <FileCode className="mr-2 h-4 w-4"/>
                    {fileName || "Choose a .xlsx file"}
                </label>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Each row in the Excel file will be added as a unique product item. This does not update existing items.
          </p>
        </div>
        <DialogFooter>
           <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isImporting}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleImport} disabled={isImporting || !fileName}>
            {isImporting ? 'Importing...' : 'Import Products'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
