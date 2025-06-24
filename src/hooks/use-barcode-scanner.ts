'use client';

import { useEffect, useRef, useCallback } from 'react';

const SCANNER_INPUT_TIMEOUT = 50; // ms between keystrokes

type BarcodeScannerOptions = {
  enabled?: boolean;
};

export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options?: BarcodeScannerOptions
) {
  const { enabled = true } = options || {};
  const lastKeyTime = useRef(Date.now());
  const buffer = useRef<string[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      // Intercept Enter key to prevent form submission if we're scanning
      if (e.key === 'Enter') {
        if (buffer.current.length > 3) {
          e.preventDefault();
          const barcode = buffer.current.join('');
          onScan(barcode);
        }
        buffer.current = []; // Reset buffer after enter
        return;
      }

      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTime.current;

      if (timeSinceLastKey > SCANNER_INPUT_TIMEOUT) {
        // It's probably manual typing, so reset the buffer
        buffer.current = [];
      }

      lastKeyTime.current = currentTime;

      // Ignore control keys, function keys, etc.
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        buffer.current.push(e.key);
      }
    },
    [onScan, enabled]
  );

  useEffect(() => {
    // Use capture phase to intercept event before it reaches other elements
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);
}
