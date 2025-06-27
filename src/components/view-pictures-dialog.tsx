
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
import { Trash2, Link as LinkIcon, Download, Loader2, Image as ImageIcon, Eye, X } from 'lucide-react';
import type { SavedPicture } from '@/lib/types';
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

type ViewPicturesDialogProps = {
  pictures: SavedPicture[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDelete: (pictureId: string, pictureUrl: string) => Promise<void>;
};

export function ViewPicturesDialog({ pictures, isOpen, onOpenChange, onDelete }: ViewPicturesDialogProps) {
  const [pictureToDelete, setPictureToDelete] = useState<SavedPicture | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fullViewPicture, setFullViewPicture] = useState<SavedPicture | null>(null);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!pictureToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(pictureToDelete.id, pictureToDelete.url);
      setPictureToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link Copied!', description: 'The image URL has been copied to your clipboard.' });
  };
  
  const handleDownload = async (picture: SavedPicture) => {
    try {
      const response = await fetch(picture.url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = picture.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download image", error);
      toast({
        title: "Download Failed",
        description: "Could not download the image. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      setFullViewPicture(null); // Ensure lightbox closes if main dialog closes
    }
    onOpenChange(open); // Propagate state change up
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Saved Pictures</DialogTitle>
            <DialogDescription>
              Browse your saved designs and references. Click an image to view it full screen.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow pr-4 -mr-4">
            {pictures.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4">
                {pictures.map((pic) => (
                  <Card key={pic.id} className="overflow-hidden group">
                    <CardContent className="p-0">
                      <div 
                        className="aspect-square w-full relative bg-muted cursor-pointer"
                        onClick={() => setFullViewPicture(pic)}
                      >
                        <Image
                          src={pic.url}
                          alt={pic.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          style={{ objectFit: 'cover' }}
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Eye className="text-white h-8 w-8" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col items-start p-3 bg-muted/50">
                        <p className="text-sm font-medium truncate w-full" title={pic.name}>{pic.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {new Date(pic.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex items-center justify-end w-full gap-1 mt-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(pic.url)}>
                                <LinkIcon className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(pic)}>
                                <Download className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setPictureToDelete(pic)}>
                                <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center text-muted-foreground">
                <ImageIcon className="h-16 w-16 mb-4" />
                <h3 className="text-lg font-semibold">No Pictures Saved</h3>
                <p className="text-sm">Upload a picture to get started.</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* Full screen view overlay */}
      {fullViewPicture && (
        <div 
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in-0"
            onClick={() => setFullViewPicture(null)}
        >
            <button 
                className="absolute top-4 right-4 text-white hover:text-gray-300 z-[101]"
                onClick={() => setFullViewPicture(null)}
            >
                <X className="h-8 w-8" />
            </button>
            <div 
                className="relative w-full h-full"
                onClick={(e) => e.stopPropagation()}
            >
                <Image
                    src={fullViewPicture.url}
                    alt={fullViewPicture.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="100vw"
                />
            </div>
        </div>
      )}

      <AlertDialog open={!!pictureToDelete} onOpenChange={(open) => !open && setPictureToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the picture from your storage.
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
