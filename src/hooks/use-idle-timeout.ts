
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export const useIdleTimeout = (timeout: number) => {
  const { toast } = useToast();
  const timer = useRef<NodeJS.Timeout>();

  const handleLogout = useCallback(() => {
    signOut(auth).then(() => {
      toast({
        title: 'Session Expired',
        description: 'You have been logged out due to inactivity.',
        variant: 'destructive',
      });
      // The auth state listener in `page.tsx` will redirect to /login
    });
  }, [toast]);

  const resetTimer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(handleLogout, timeout);
  }, [timeout, handleLogout]);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    const handleEvent = () => {
      resetTimer();
    };

    events.forEach(event => window.addEventListener(event, handleEvent));
    resetTimer(); // Start the timer on initial load

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      events.forEach(event => window.removeEventListener(event, handleEvent));
    };
  }, [resetTimer]);
};
