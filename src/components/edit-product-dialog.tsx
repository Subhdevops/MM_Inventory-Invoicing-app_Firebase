
"use client";

import { useEffect } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import type { Product } from '@/lib/types';

// This schema doesn't include quantity, as each product is now a unique item.
const productSchema = z.object({
  name: z.string().min(2, { message: "Product name must be at least 2 characters." }),
  description: z.string().optional(),
  barcode: z.string().min(1, { message: "Barcode cannot be empty." }),
  price: z.coerce.number().min(0, { message: "Price must be a positive number." }),
  cost: z.coerce.number().min(0, { message: "Cost must be a positive number." }),
  possibleDiscount: z.coerce.number().min(0, { message: "Discount must be a positive number." }).optional(),
  salePercentage: z.coerce.number().min(0).max(100, { message: "Sale percentage must be between 0 and 100." }).optional(),
});

type EditProductDialogProps = {
  product: Product;
  updateProduct: (productId: string, data: Partial<Omit<Product, 'id' | 'uniqueProductCode' | 'isSold'>>) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function EditProductDialog({ product, updateProduct, isOpen, onOpenChange }: EditProductDialogProps) {
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name,
      description: product.description,
      barcode: product.barcode,
      price: product.price,
      cost: product.cost,
      possibleDiscount: product.possibleDiscount,
      salePercentage: product.salePercentage,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        price: product.price,
        cost: product.cost,
        possibleDiscount: product.possibleDiscount || 0,
        salePercentage: product.salePercentage || 0,
      });
    }
  }, [product, form]);

  const onSubmit = (values: z.infer<typeof productSchema>) => {
    updateProduct(product.id, {
        ...values,
        description: values.description || ''
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Make changes to your product. This will not affect other items with the same barcode.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Blue Cotton T-Shirt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. 100% premium cotton." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>
             <div className="grid grid-cols-1 gap-4">
                 <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input placeholder="Scan or enter barcode" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
            </div>
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
