
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
import { Progress } from '@/components/ui/progress';
import { UploadCloud, File as FileIcon, Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { SavedFile } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

type UploadFileDialogProps = {
  activeEventId: string | null;
  disabled: boolean;
  onUploadComplete: (fileData: Omit<SavedFile, 'id'>) => Promise<void>;
};

export function UploadFileDialog({ activeEventId, disabled, onUploadComplete }: UploadFileDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[] | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetState = () => {
    setFiles(null);
    setPreviewUrls(null);
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentFileIndex(0);
    setIsSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles);
      setFiles(filesArray);
      
      const imagePreviews = filesArray
        .filter(file => file.type.startsWith('image/'))
        .map(file => URL.createObjectURL(file));
      setPreviewUrls(imagePreviews);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0 || !activeEventId) return;

    setIsUploading(true);
    setIsSuccess(false);
    setUploadProgress(0);
    setCurrentFileIndex(0);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileIndex(i);
        try {
            await uploadFile(file, activeEventId);
        } catch (error) {
            toast({
                title: `Upload Failed for ${file.name}`,
                description: "An error occurred during upload. Please try again.",
                variant: "destructive",
            });
            setIsUploading(false);
            return; // Stop on first error
        }
    }
    
    setIsSuccess(true);
    setIsUploading(false);

    setTimeout(() => {
        setOpen(false);
    }, 1500);
  };

  const uploadFile = (file: File, activeEventId: string) => {
    return new Promise<void>((resolve, reject) => {
        const storageRef = ref(storage, `events/${activeEventId}/savedFiles/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
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
                    resolve();
                } catch (dbError) {
                    reject(dbError);
                }
            }
        );
    });
  }
  
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
            <p className="font-semibold mb-2">Uploading file {currentFileIndex + 1} of {files?.length}...</p>
            <p className="text-sm truncate w-full px-4">{files?.[currentFileIndex]?.name}</p>
            <Progress value={uploadProgress} className="w-full mt-2" />
            <p className="text-sm mt-2">{Math.round(uploadProgress)}%</p>
        </div>
      );
    }
    
    if (isSuccess) {
       return (
        <div className="text-center text-green-500 flex flex-col items-center justify-center h-full">
            <CheckCircle className="h-12 w-12 mb-4" />
            <p className="font-semibold">{files?.length} file(s) uploaded successfully!</p>
        </div>
       );
    }

    const hasSingleImage = files?.length === 1 && files[0].type.startsWith('image/');

    return (
      <label htmlFor="file-upload" className="flex items-center justify-center w-full h-64 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
        {hasSingleImage && previewUrls?.[0] ? (
          <div className="w-full h-full relative">
              <Image src={previewUrls[0]} alt="Preview" fill style={{ objectFit: 'contain' }} />
          </div>
        ) : files && files.length > 0 ? (
          <ScrollArea className="w-full h-full">
            <div className="text-left text-muted-foreground p-4 space-y-2">
              <p className="font-bold text-foreground">{files.length} files selected:</p>
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileIcon className="h-4 w-4 shrink-0"/>
                  <span className="truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center text-muted-foreground">
              <UploadCloud className="mx-auto h-12 w-12" />
              <p className="mt-2">Click to select files</p>
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
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Save designs, documents, or reference files. They will be stored securely.
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
            multiple
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isUploading}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload} disabled={!files || isUploading || isSuccess}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload and Save ({files?.length || 0})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
