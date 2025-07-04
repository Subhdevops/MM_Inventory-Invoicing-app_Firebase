
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

const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a positive number." }),
  barcode: z.string().min(1, { message: "Barcode cannot be empty." }).transform(val => String(val)), // Ensure barcode is a string
  price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  cost: z.coerce.number().min(0, { message: "Cost must be a positive number." }),
  description: z.string().optional().default(''),
});

type ImportInventoryDialogProps = {
  onImport: (products: Omit<Product, 'id'>[]) => Promise<void>;
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
      toast({
        title: "No file selected",
        description: "Please select an Excel file (.xlsx) to import.",
        variant: "destructive",
      });
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
            toast({
                title: "Empty File",
                description: "The selected Excel file is empty or has no data.",
                variant: "destructive",
            });
            setIsImporting(false);
            return;
        }
        
        // Normalize headers to lowercase and trimmed
        const normalizedJsonData = jsonData.map(row => {
            const newRow: {[key: string]: any} = {};
            for (const key in row) {
                newRow[key.trim().toLowerCase()] = row[key];
            }
            return newRow;
        });

        const requiredHeaders = ["barcode", "name", "price", "cost", "quantity"];
        const actualHeaders = Object.keys(normalizedJsonData[0] || {});
        const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

        if (missingHeaders.length > 0) {
          toast({
            title: "Invalid Excel Format",
            description: `Your file is missing required columns: ${missingHeaders.join(', ')}.`,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        const validation = z.array(productSchema).safeParse(normalizedJsonData);
        if (!validation.success) {
          const firstError = validation.error.errors[0];
          const errorRow = (firstError.path[0] as number) + 2; 
          const field = firstError.path[1] as string;
          const description = `Error in row ${errorRow}, column '${field}': ${firstError.message}. Please check your Excel data.`;
          
          console.error(validation.error.errors);
          toast({
            title: "Invalid Data in Excel File",
            description: description,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        await onImport(validation.data);
        setIsImporting(false);
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setOpen(false);
      } catch (error) {
        toast({
          title: "Parsing Error",
          description: `Failed to parse Excel file. Ensure it is a valid .xlsx file.`,
          variant: "destructive",
        });
        setIsImporting(false);
      }
    };
    
    reader.onerror = () => {
       toast({
          title: "File Read Error",
          description: "Could not read the selected file.",
          variant: "destructive",
        });
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
            Select an Excel (.xlsx) file to add or update products. It must have columns for 'barcode', 'name', 'price', 'cost', and 'quantity'. An optional 'description' column can be included.
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
            Products with existing barcodes will be updated. New barcodes will be added as new products.
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
