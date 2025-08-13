
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
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
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreVertical, PlusCircle, User, Trash2, Pencil, Loader2 } from 'lucide-react';
import type { Vendor, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

const vendorSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    contact: z.string().min(10, "A valid contact number or email is required."),
    sourcingDetails: z.string().min(3, "Sourcing details are required."),
    fabricCost: z.coerce.number().min(0, "Fabric cost must be a positive number."),
    stitchingCost: z.coerce.number().min(0, "Stitching cost must be a positive number."),
    notes: z.string().optional(),
});

type VendorDialogProps = {
    vendor?: Vendor | null;
    activeEventId: string;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

function VendorDialog({ vendor, activeEventId, isOpen, onOpenChange }: VendorDialogProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const form = useForm<z.infer<typeof vendorSchema>>({
        resolver: zodResolver(vendorSchema),
        defaultValues: {
            name: vendor?.name || '',
            contact: vendor?.contact || '',
            sourcingDetails: vendor?.sourcingDetails || '',
            fabricCost: vendor?.fabricCost || 0,
            stitchingCost: vendor?.stitchingCost || 0,
            notes: vendor?.notes || '',
        }
    });

    const onSubmit = async (values: z.infer<typeof vendorSchema>) => {
        setIsProcessing(true);
        try {
            if (vendor) {
                // Update existing vendor
                const vendorRef = doc(db, 'events', activeEventId, 'vendors', vendor.id);
                await updateDoc(vendorRef, values);
                toast({ title: "Vendor Updated" });
            } else {
                // Create new vendor
                const newVendor = {
                    ...values,
                    createdAt: new Date().toISOString(),
                };
                await addDoc(collection(db, 'events', activeEventId, 'vendors'), newVendor);
                toast({ title: "Vendor Added" });
            }
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to save vendor:", error);
            toast({ title: "Operation Failed", variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                    <DialogDescription>
                        {vendor ? 'Update the details for this vendor.' : 'Enter the details for a new vendor.'}
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Vendor Name</FormLabel><FormControl><Input placeholder="e.g. Fabric Creations Inc." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="contact" render={({ field }) => (
                            <FormItem><FormLabel>Contact Info</FormLabel><FormControl><Input placeholder="Phone or Email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="sourcingDetails" render={({ field }) => (
                            <FormItem><FormLabel>Sourcing Details</FormLabel><FormControl><Input placeholder="e.g. Surat, Gujarat" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="fabricCost" render={({ field }) => (
                                <FormItem><FormLabel>Fabric Cost (per meter)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="stitchingCost" render={({ field }) => (
                                <FormItem><FormLabel>Stitching Cost (per piece)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional information..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {vendor ? 'Save Changes' : 'Add Vendor'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

type VendorManagementProps = {
    vendors: Vendor[];
    activeEventId: string | null;
    userRole: UserProfile['role'] | null;
    isLoading: boolean;
};

export default function VendorManagement({ vendors, activeEventId, userRole, isLoading }: VendorManagementProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleEdit = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setSelectedVendor(null);
        setIsDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!vendorToDelete || !activeEventId) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'events', activeEventId, 'vendors', vendorToDelete.id));
            toast({ title: 'Vendor Deleted', variant: 'destructive' });
            setVendorToDelete(null);
        } catch (error) {
            console.error("Failed to delete vendor: ", error);
            toast({ title: "Deletion Failed", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const isAdmin = userRole === 'admin';

    return (
        <>
            <Card className="lg:col-span-1 h-[400px] flex flex-col">
                <CardHeader>
                    <CardTitle>Vendor Management</CardTitle>
                    <CardDescription>Manage your fabric and production vendors.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : vendors.length > 0 ? (
                        <ScrollArea className="h-full">
                          <div className="space-y-2 p-6 pt-0">
                            {vendors.map(vendor => (
                                <div key={vendor.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-muted rounded-full">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{vendor.name}</p>
                                            <p className="text-xs text-muted-foreground">{vendor.sourcingDetails}</p>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                    <Dialog>
                                        <AlertDialog>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="w-auto max-w-[200px] p-0">
                                                <div className="p-1">
                                                     <Button variant="ghost" className="w-full justify-start" onClick={() => handleEdit(vendor)}><Pencil className="mr-2"/>Edit</Button>
                                                      <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => setVendorToDelete(vendor)}><Trash2 className="mr-2"/>Delete</Button>
                                                      </AlertDialogTrigger>
                                                </div>
                                            </DialogContent>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the vendor {vendorToDelete?.name}.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </Dialog>
                                    )}
                                </div>
                            ))}
                          </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                            <p className="text-sm">No vendors added yet.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleAddNew} disabled={!isAdmin || !activeEventId}>
                        <PlusCircle className="mr-2" />
                        Add New Vendor
                    </Button>
                </CardFooter>
            </Card>

            {isDialogOpen && (
                <VendorDialog 
                    vendor={selectedVendor} 
                    activeEventId={activeEventId!} 
                    isOpen={isDialogOpen} 
                    onOpenChange={setIsDialogOpen}
                />
            )}
        </>
    );
}
