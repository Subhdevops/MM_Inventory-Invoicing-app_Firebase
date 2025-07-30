
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
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, File as FileIcon, Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { SavedFile } from '@/lib/types';

type UploadFileDialogProps = {
  activeEventId: string | null;
  disabled: boolean;
  onUploadComplete: (fileData: Omit<SavedFile, 'id'>) => Promise<void>;
};

export function UploadFileDialog({ activeEventId, disabled, onUploadComplete }: UploadFileDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsUploading(false);
    setUploadProgress(0);
    setIsSuccess(false);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState(); // Reset if a new file is chosen
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !activeEventId) return;

    setIsUploading(true);
    setIsSuccess(false);
    setUploadProgress(0);

    const storageRef = ref(storage, `events/${activeEventId}/savedFiles/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        toast({
          title: "Upload Failed",
          description: "Please check your Firebase Storage setup and security rules.",
          variant: "destructive",
        });
        setIsUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await onUploadComplete({
            name: file.name,
            url: downloadURL,
            createdAt: new Date().toISOString(),
            fileType: file.type || 'application/octet-stream',
          });
          
          setIsSuccess(true);
          setIsUploading(false);

          setTimeout(() => {
            setOpen(false);
          }, 1500);

        } catch (dbError) {
          // Toast is handled by the parent page function
          setIsUploading(false);
        }
      }
    );
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    setOpen(isOpen);
  }

  const renderContent = () => {
    if (isUploading) {
      return (
        <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <p className="font-semibold mb-2">Uploading {file?.name}...</p>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm mt-2">{Math.round(uploadProgress)}%</p>
        </div>
      );
    }
    
    if (isSuccess) {
       return (
        <div className="text-center text-green-500 flex flex-col items-center justify-center h-full">
            <CheckCircle className="h-12 w-12 mb-4" />
            <p className="font-semibold">Upload Complete!</p>
        </div>
       );
    }

    return (
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
              <p className="text-xs">Images, PDF, DOC, TXT supported.</p>
          </div>
        )}
      </label>
    );
  };

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
            Save a design, document, or reference file. It will be stored securely.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {renderContent()}
          <Input 
            id="file-upload" 
            type="file" 
            accept="image/*,application/pdf,.txt,.doc,.docx" 
            onChange={handleFileChange} 
            ref={fileInputRef}
            className="hidden"
            disabled={isUploading || isSuccess}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isUploading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!file || isUploading || isSuccess}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload and Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
