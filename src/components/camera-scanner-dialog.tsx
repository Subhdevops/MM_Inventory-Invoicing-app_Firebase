
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
    let isScannerStopped = false;

    const startScanner = async () => {
      setError(null);
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.8);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };

      const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
        if (!isScannerStopped) {
            isScannerStopped = true;
            onScan(decodedText);
            onOpenChange(false);
        }
      };
      
      const onScanFailure = (errorMessage: string, error: Html5QrcodeError) => {
        // This callback is called frequently, so we typically ignore it.
      };

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanFailure
        );
      } catch (err: any) {
        if (!isScannerStopped) {
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
    
    // Give a small delay for the dialog animation to complete.
    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      isScannerStopped = true;
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => {
          console.error("Failed to stop QR code scanner.", err);
        });
      }
    };
  }, [isOpen, onOpenChange, onScan, toast]);

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
