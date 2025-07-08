
"use client";

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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

// Schema where all fields are optional. Empty strings are transformed to undefined
// so they are ignored during the update.
const bulkEditSchema = z.object({
  price: z.string()
    .transform(val => val === '' ? undefined : val)
    .pipe(z.coerce.number({invalid_type_error: "Price must be a number."}).min(0).optional()),
  cost: z.string()
    .transform(val => val === '' ? undefined : val)
    .pipe(z.coerce.number({invalid_type_error: "Cost must be a number."}).min(0).optional()),
  quantity: z.string()
    .transform(val => val === '' ? undefined : val)
    .pipe(z.coerce.number({invalid_type_error: "Quantity must be a number."}).int().min(0).optional()),
  possibleDiscount: z.string()
    .transform(val => val === '' ? undefined : val)
    .pipe(z.coerce.number({invalid_type_error: "Discount must be a number."}).min(0).optional()),
  salePercentage: z.string()
    .transform(val => val === '' ? undefined : val)
    .pipe(z.coerce.number({invalid_type_error: "Sale % must be a number."}).min(0).max(100).optional()),
});


type BulkEditDialogProps = {
  productIds: string[];
  onBulkUpdate: (productIds: string[], data: Partial<Omit<Product, 'id'>>) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function BulkEditDialog({ productIds, onBulkUpdate, isOpen, onOpenChange }: BulkEditDialogProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof bulkEditSchema>>({
    resolver: zodResolver(bulkEditSchema),
    defaultValues: {
      price: '',
      cost: '',
      quantity: '',
      possibleDiscount: '',
      salePercentage: '',
    },
  });

  const onSubmit = (values: z.infer<typeof bulkEditSchema>) => {
    const updateData: Partial<Omit<Product, 'id'>> = {};

    if (values.price !== undefined) {
      updateData.price = values.price;
    }
    if (values.cost !== undefined) {
      updateData.cost = values.cost;
    }
    if (values.quantity !== undefined) {
      updateData.quantity = values.quantity;
    }
    if (values.possibleDiscount !== undefined) {
      updateData.possibleDiscount = values.possibleDiscount;
    }
    if (values.salePercentage !== undefined) {
        updateData.salePercentage = values.salePercentage;
    }

    if (Object.keys(updateData).length === 0) {
      toast({
        title: "No Changes",
        description: "Please enter a value in at least one field to update.",
        variant: "destructive",
      });
      return;
    }

    onBulkUpdate(productIds, updateData);
    onOpenChange(false);
    form.reset();
  };
  
  // Reset form when dialog is opened or closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Edit Products</DialogTitle>
          <DialogDescription>
            Edit fields for {productIds.length} selected products. Only filled fields will be updated. Leave fields blank to keep original values.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g. 4999.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g. 2500.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="possibleDiscount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Possible Discount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g. 500.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="salePercentage"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Sale Discount (%)</FormLabel>
                    <FormControl>
                    <Input type="number" step="1" placeholder="e.g. 25" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 15" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Update Products</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
