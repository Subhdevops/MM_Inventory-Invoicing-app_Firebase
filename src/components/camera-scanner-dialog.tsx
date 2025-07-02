
'use client';

import { useEffect, useRef, useState } from 'react';
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
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Cleanup function to stop the scanner safely
    const cleanup = () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(err => {
          // It's possible the scanner was already stopped. We can ignore this error.
          console.error("Failed to stop QR code scanner gracefully.", err);
        });
        html5QrCodeRef.current = null;
      }
    };

    if (isOpen) {
      // Use requestAnimationFrame to ensure the DOM is ready before starting
      requestRef.current = requestAnimationFrame(() => {
        if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode(qrcodeRegionId);
        }
        const scanner = html5QrCodeRef.current;

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
          onOpenChange(false);
          onScan(decodedText);
        };
  
        const onScanFailure = (errorMessage: string, error: Html5QrcodeError) => {
          // This callback is called frequently. We can ignore it.
        };

        if (!scanner.isScanning) {
            scanner.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanFailure
            ).catch((err: any) => {
                const errorMessage = typeof err === 'string' ? err : err.message;
                setError(errorMessage);
                toast({
                    variant: 'destructive',
                    title: 'Camera Error',
                    description: `Could not start scanner: ${errorMessage}`,
                });
            });
        }
      });
    } else {
      cleanup();
    }
    
    // This return statement is the effect's cleanup function.
    // It runs when the component unmounts or when `isOpen` changes.
    return cleanup;
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
