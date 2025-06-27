
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
import { UploadCloud, File as FileIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

type UploadFileDialogProps = {
  onUpload: (file: File) => Promise<void>;
  disabled: boolean;
};

export function UploadFileDialog({ onUpload, disabled }: UploadFileDialogProps) {
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
          description: "Please select a file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null);
      }
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
          <DialogTitle>Upload a File</DialogTitle>
          <DialogDescription>
            Save a design, document, or reference file. It will be stored securely. Max file size: 5MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <label htmlFor="file-upload" className="flex items-center justify-center w-full h-64 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
            {previewUrl ? (
              <div className="w-full h-full relative">
                 <Image src={previewUrl} alt="Preview" fill style={{ objectFit: 'contain' }} />
              </div>
            ) : file ? (
              <div className="text-center text-muted-foreground">
                <FileIcon className="mx-auto h-12 w-12" />
                <p className="mt-2 font-semibold">{file.name}</p>
                <p className="text-xs">Click to choose a different file</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                  <UploadCloud className="mx-auto h-12 w-12" />
                  <p className="mt-2">Click to select a file</p>
                  <p className="text-xs">Images, PDF, DOC, TXT up to 5MB</p>
              </div>
            )}
          </label>
          <Input 
            id="file-upload" 
            type="file" 
            accept="image/*,application/pdf,.txt,.doc,.docx" 
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
