
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

    // We create a new instance every time the dialog opens.
    // This is simpler to manage than a ref-based approach for this use case.
    const html5QrCode = new Html5Qrcode(qrcodeRegionId);
    let scannerRunning = false;

    const startScanner = () => {
      setError(null);
      // Config for the scanner
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.8);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };

      // Success and failure callbacks
      const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
        // Check if scanner is still considered running before acting on the scan
        if (scannerRunning) {
          scannerRunning = false; // Prevent multiple scans
          onScan(decodedText);
          onOpenChange(false);
          // The cleanup function will handle stopping the scanner
        }
      };

      const onScanFailure = (errorMessage: string, error: Html5QrcodeError) => {
        // This callback is called frequently, so we typically ignore it
        // unless we want to display a subtle scanning indicator.
      };
      
      // Start the scanner
      html5QrCode.start(
        { facingMode: "environment" }, // Prefer back camera
        config,
        onScanSuccess,
        onScanFailure
      ).then(() => {
        scannerRunning = true;
      }).catch((err: any) => {
        const errorMessage = typeof err === 'string' ? err : err.message;
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Camera Error',
          description: `Could not start scanner: ${errorMessage}`,
        });
      });
    };

    // A small delay can help ensure the DOM is ready, especially with dialog animations.
    const startTimeout = setTimeout(startScanner, 100);

    // Cleanup function
    return () => {
      clearTimeout(startTimeout);
      // Check if scanner is initialized and in a scanning state before trying to stop
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => {
          // This can sometimes fail if the component unmounts quickly.
          // It's generally safe to ignore, but we log for debugging.
          console.error("Failed to stop QR code scanner.", err);
        });
      }
      scannerRunning = false;
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
        {/* The div for the scanner needs to be in the DOM when the effect runs */}
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
