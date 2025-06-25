
"use client";

import { useState, useRef } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import Papa from 'papaparse';
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  quantity: z.coerce.number().int().min(0, { message: "Quantity must be a positive number." }),
  barcode: z.string().min(1, { message: "Barcode cannot be empty." }),
  price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  cost: z.coerce.number().min(0, { message: "Cost must be a positive number." }),
});

const fileSchema = z.object({
  file: z.instanceof(File).refine(file => file.size > 0, 'File is required.'),
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
        description: "Please select a CSV file to import.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    Papa.parse<Omit<Product, 'id'>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const requiredHeaders = ["barcode", "name", "price", "cost", "quantity"];
        const actualHeaders = results.meta.fields || [];
        const missingHeaders = requiredHeaders.filter(h => !actualHeaders.includes(h));

        if (missingHeaders.length > 0) {
          toast({
            title: "Invalid CSV format",
            description: `File is missing required headers: ${missingHeaders.join(', ')}`,
            variant: "destructive",
          });
          setIsImporting(false);
          return;
        }

        const validation = z.array(productSchema).safeParse(results.data);
        if (!validation.success) {
          console.error(validation.error.errors);
          toast({
            title: "Invalid Data",
            description: `Your CSV contains invalid data. Please check product names, quantities, prices, costs, and barcodes.`,
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
      },
      error: (error) => {
        toast({
          title: "Parsing Error",
          description: `Failed to parse CSV file: ${error.message}`,
          variant: "destructive",
        });
        setIsImporting(false);
      },
    });
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
          <DialogTitle>Import Inventory from CSV</DialogTitle>
          <DialogDescription>
            Select a CSV file to add or update products. The file must contain 'barcode', 'name', 'price', 'cost', and 'quantity' columns.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <Button asChild variant="outline">
                <label htmlFor="csv-file" className="cursor-pointer">
                    <FileCode className="mr-2 h-4 w-4"/>
                    {fileName || "Choose a .csv file"}
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
