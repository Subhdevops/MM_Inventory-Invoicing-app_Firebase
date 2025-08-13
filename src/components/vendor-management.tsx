
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isBefore, isToday, addDays } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreVertical, PlusCircle, User, Trash2, Pencil, Loader2, Calendar as CalendarIcon, Bell } from 'lucide-react';
import type { Vendor, UserProfile } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const vendorSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    contact: z.string().min(10, "A valid contact number or email is required."),
    sourcingDetails: z.string().min(3, "Sourcing details are required."),
    fabricCost: z.coerce.number().min(0, "Fabric cost must be a positive number."),
    stitchingCost: z.coerce.number().min(0, "Stitching cost must be a positive number."),
    notes: z.string().optional(),
    visitDate: z.date().optional(),
    followUpDate: z.date().optional(),
    reminder: z.boolean().default(false),
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
            visitDate: vendor?.visitDate ? new Date(vendor.visitDate) : undefined,
            followUpDate: vendor?.followUpDate ? new Date(vendor.followUpDate) : undefined,
            reminder: vendor?.reminder || false,
        }
    });

    const onSubmit = async (values: z.infer<typeof vendorSchema>) => {
        setIsProcessing(true);
        try {
            const dataToSave = {
                ...values,
                visitDate: values.visitDate ? values.visitDate.toISOString() : null,
                followUpDate: values.followUpDate ? values.followUpDate.toISOString() : null,
            };

            if (vendor) {
                // Update existing vendor
                const vendorRef = doc(db, 'events', activeEventId, 'vendors', vendor.id);
                await updateDoc(vendorRef, dataToSave);
                toast({ title: "Vendor Updated" });
            } else {
                // Create new vendor
                const newVendor = {
                    ...dataToSave,
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{vendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
                    <DialogDescription>
                        {vendor ? 'Update the details for this vendor.' : 'Enter the details for a new vendor.'}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                 <div className="p-4">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="visitDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Visiting Date</FormLabel>
                                <Popover><PopoverTrigger asChild>
                                <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl>
                                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent></Popover><FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="followUpDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Follow-up/Pickup Date</FormLabel>
                                <Popover><PopoverTrigger asChild>
                                <FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button></FormControl>
                                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                </PopoverContent></Popover><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional information..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="reminder" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5"><FormLabel>Set Reminder</FormLabel>
                                <DialogDescription>Enable notifications for this vendor's follow-up date.</DialogDescription></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                        <DialogFooter className="sticky bottom-0 bg-background/95 pt-4">
                            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
                            <Button type="submit" disabled={isProcessing}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {vendor ? 'Save Changes' : 'Add Vendor'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
                 </div>
                </ScrollArea>
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
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleEdit = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setIsEditDialogOpen(true);
    };

    const handleAddNew = () => {
        setSelectedVendor(null);
        setIsEditDialogOpen(true);
    };

    const handleDeleteTrigger = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedVendor || !activeEventId) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'events', activeEventId, 'vendors', selectedVendor.id));
            toast({ title: 'Vendor Deleted', variant: 'destructive' });
            setIsDeleteDialogOpen(false);
            setSelectedVendor(null);
        } catch (error) {
            console.error("Failed to delete vendor: ", error);
            toast({ title: "Deletion Failed", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const checkReminder = (vendor: Vendor) => {
        if (!vendor.reminder || !vendor.followUpDate) return false;
        const today = new Date();
        const followUpDate = new Date(vendor.followUpDate);
        const sevenDaysFromNow = addDays(today, 7);
        // Reminder if date is today, in the past, or within the next 7 days
        return isToday(followUpDate) || (isBefore(followUpDate, sevenDaysFromNow) && isBefore(today, addDays(followUpDate, 1)));
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
                                            <p className="font-semibold flex items-center gap-2">
                                                {vendor.name}
                                                {checkReminder(vendor) && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger>
                                                                <Bell className="h-4 w-4 text-destructive animate-pulse-red" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Follow-up on: {format(new Date(vendor.followUpDate!), 'PPP')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{vendor.sourcingDetails}</p>
                                        </div>
                                    </div>
                                    {isAdmin && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onSelect={() => handleEdit(vendor)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>Edit</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleDeleteTrigger(vendor)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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

            {isEditDialogOpen && activeEventId && (
                <VendorDialog 
                    vendor={selectedVendor} 
                    activeEventId={activeEventId} 
                    isOpen={isEditDialogOpen} 
                    onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) setSelectedVendor(null);
                    }}
                />
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the vendor {selectedVendor?.name}.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting} onClick={() => setSelectedVendor(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
