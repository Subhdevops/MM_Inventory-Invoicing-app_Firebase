
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

type UploadPictureDialogProps = {
  onUpload: (file: File) => Promise<void>;
  disabled: boolean;
};

export function UploadPictureDialog({ onUpload, disabled }: UploadPictureDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
       if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file);
      setOpen(false); // Close dialog on success
    } catch (error) {
      // Error is caught and handled by the parent component's toast.
      // The dialog will remain open for the user to retry or cancel.
      console.error("Upload failed in dialog component.");
    } finally {
      setIsUploading(false); // Always stop loading indicator
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        // Reset state when closing
        setFile(null);
        setPreviewUrl(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
    setOpen(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <UploadCloud className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a Picture</DialogTitle>
          <DialogDescription>
            Save a design or reference picture. It will be stored securely.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {previewUrl ? (
             <div className="w-full h-64 relative rounded-md overflow-hidden border bg-muted/20">
                <Image src={previewUrl} alt="Preview" fill style={{ objectFit: 'contain' }} />
             </div>
          ) : (
             <label htmlFor="picture-upload" className="flex items-center justify-center w-full h-64 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="text-center text-muted-foreground">
                    <ImageIcon className="mx-auto h-12 w-12" />
                    <p className="mt-2">Click to select an image</p>
                    <p className="text-xs">PNG, JPG, GIF up to 5MB</p>
                </div>
             </label>
          )}
          <Input 
            id="picture-upload" 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            ref={fileInputRef}
            className="hidden"
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isUploading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isUploading ? "Uploading..." : "Upload and Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
