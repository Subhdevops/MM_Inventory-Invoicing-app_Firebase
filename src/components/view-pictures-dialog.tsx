
'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Link as LinkIcon, Download, Loader2, File as FileIcon, Eye, X, FolderOpen } from 'lucide-react';
import type { SavedFile } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

type ViewFilesDialogProps = {
  files: SavedFile[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDelete: (fileId: string, fileUrl: string) => Promise<void>;
};

export function ViewFilesDialog({ files, isOpen, onOpenChange, onDelete }: ViewFilesDialogProps) {
  const [fileToDelete, setFileToDelete] = useState<SavedFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fullViewFile, setFullViewFile] = useState<SavedFile | null>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(fileToDelete.id, fileToDelete.url);
      setFileToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link Copied!', description: 'The file URL has been copied to your clipboard.' });
  };
  
  const handleDownload = async (file: SavedFile) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download file", error);
      toast({
        title: "Download Failed",
        description: "Could not download the file. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleView = (file: SavedFile) => {
    if (file.fileType.startsWith('image/')) {
      setFullViewFile(file);
    } else {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  }

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      setFullViewFile(null); // Ensure lightbox closes if main dialog closes
    }
    onOpenChange(open); // Propagate state change up
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Saved Files</DialogTitle>
            <DialogDescription>
              Browse your saved files. Click view to open an image preview or open a document.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-4 -mr-4">
            {files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
                {files.map((file) => (
                  <Card key={file.id} className="overflow-hidden group flex flex-col">
                    <CardContent className="p-0 flex-grow">
                      <div className="aspect-square w-full relative bg-muted flex items-center justify-center">
                        {file.fileType.startsWith('image/') ? (
                          <Image
                            src={file.url}
                            alt={file.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            style={{ objectFit: 'cover' }}
                            className="group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <FileIcon className="w-16 h-16 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col items-start p-3 bg-muted/50">
                        <p className="text-sm font-medium truncate w-full" title={file.name}>{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center justify-end w-full gap-1 mt-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(file)}>
                                <Eye className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(file.url)}>
                                <LinkIcon className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(file)}>
                                <Download className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setFileToDelete(file)}>
                                <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-muted-foreground">
                <FolderOpen className="h-16 w-16 mb-4" />
                <h3 className="text-lg font-semibold">No Files Saved</h3>
                <p className="text-sm">Upload a file to get started.</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Full screen image view overlay */}
      {fullViewFile && (
        <div 
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in-0"
            onClick={() => setFullViewFile(null)}
        >
            <button 
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-[101]"
                onClick={() => setFullViewFile(null)}
            >
                <X className="h-8 w-8" />
            </button>
            <div 
                className="relative w-full h-full"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={fullViewFile.url}
                    alt={fullViewFile.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="100vw"
                />
            </div>
        </div>
      )}

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the file from your storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeleting ? 'Deleting...' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
