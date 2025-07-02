
'use client';

import { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeError, Html5QrcodeResult } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CameraOff } from 'lucide-react';

interface CameraScannerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onScan: (decodedText: string) => void;
}

const qrcodeRegionId = "camera-scanner-region";

export function CameraScannerDialog({ isOpen, onOpenChange, onScan }: CameraScannerDialogProps) {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const html5QrCode = new Html5Qrcode(qrcodeRegionId);
    let isMounted = true;

    const startScanner = async () => {
      setError(null);
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          const cameraId = devices[0].id;
          
          const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
            if (isMounted) {
              onScan(decodedText);
              onOpenChange(false);
            }
          };

          const onScanFailure = (errorMessage: string, error: Html5QrcodeError) => {
            // This is called frequently, so we don't want to show a toast.
            // We can log it for debugging if needed.
          };

          await html5QrCode.start(
            cameraId,
            {
              fps: 10,
              qrbox: (viewfinderWidth, viewfinderHeight) => {
                  const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                  const qrboxSize = Math.floor(minEdge * 0.8);
                  return { width: qrboxSize, height: qrboxSize };
              },
              aspectRatio: 1.0,
            },
            onScanSuccess,
            onScanFailure
          );
        } else {
          throw new Error("No cameras found on this device.");
        }
      } catch (err: any) {
        if (isMounted) {
            const errorMessage = typeof err === 'string' ? err : err.message;
            setError(errorMessage);
            toast({
              variant: 'destructive',
              title: 'Camera Error',
              description: `Could not start scanner: ${errorMessage}`,
            });
        }
      }
    };
    
    startScanner();

    return () => {
      isMounted = false;
      // Using .getState() to check if scanner is running before stopping
      if (html5QrCode && html5QrCode.getState() === 2) { // 2 is SCANNING state
          html5QrCode.stop().catch(err => {
            // This can fail if the component unmounts before the scanner starts.
            // It's safe to ignore in most cases.
            console.error("Failed to stop QR code scanner gracefully.", err);
          });
      }
    };
  }, [isOpen, onScan, onOpenChange, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Point your camera at a QR code to scan the product barcode.
          </DialogDescription>
        </DialogHeader>
        <div id={qrcodeRegionId} className="w-full aspect-square rounded-md bg-muted" />
        {error && (
            <Alert variant="destructive">
                <CameraOff className="h-4 w-4" />
                <AlertTitle>Camera Access Error</AlertTitle>
                <AlertDescription>
                   {error} Please ensure camera permissions are enabled for this site.
                </AlertDescription>
            </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
