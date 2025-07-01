
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';

export const useIdleTimeout = (timeout: number, userId: string | null) => {
  const { toast } = useToast();
  const timer = useRef<NodeJS.Timeout>();

  const handleLogout = useCallback(async () => {
    if (userId) {
        try {
            // Signal other devices to log out
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                lastSignOutTimestamp: new Date().getTime()
            });
        } catch (error) {
            console.error("Failed to signal global logout:", error);
            // Don't block local logout if this fails
        }
    }
    
    await signOut(auth);

    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'destructive',
    });
  }, [toast, userId]);

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
    
    if (userId) {
        events.forEach(event => window.addEventListener(event, handleEvent));
        resetTimer(); // Start the timer on initial load
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      events.forEach(event => window.removeEventListener(event, handleEvent));
    };
  }, [resetTimer, userId]);
};
