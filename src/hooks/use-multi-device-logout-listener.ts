
'use client';

import { useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from './use-toast';

const SESSION_SIGN_IN_TIME_KEY = 'roopkotha_session_signin_time';

export const useMultiDeviceLogoutListener = (user: User | null | undefined) => {
    const { toast } = useToast();
    // This ref holds the sign-in time for the current session.
    // It's initialized from sessionStorage to persist across refreshes.
    const sessionSignInTime = useRef<number | null>(null);

    useEffect(() => {
        if (!user) {
            // User logged out, clear session storage and ref
            sessionStorage.removeItem(SESSION_SIGN_IN_TIME_KEY);
            sessionSignInTime.current = null;
            return;
        }

        // Try to get sign-in time from session storage first
        const storedTime = sessionStorage.getItem(SESSION_SIGN_IN_TIME_KEY);

        if (storedTime) {
            sessionSignInTime.current = parseInt(storedTime, 10);
        } else {
            // If not in storage, this is a new session.
            // Use current time and store it.
            const now = new Date().getTime();
            sessionSignInTime.current = now;
            sessionStorage.setItem(SESSION_SIGN_IN_TIME_KEY, now.toString());
        }

        const userRef = doc(db, 'users', user.uid);
        
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists() && sessionSignInTime.current) {
                const userProfile = docSnap.data() as UserProfile;
                const lastSignOut = userProfile.lastSignOutTimestamp;

                // If a logout happened after this session started, sign out.
                if (lastSignOut && lastSignOut > sessionSignInTime.current) {
                    unsubscribe(); // Stop listening to prevent loops or multiple toasts
                    signOut(auth).then(() => {
                        toast({
                            title: "Signed Out",
                            description: "This session has been signed out from another device.",
                            variant: 'destructive',
                        });
                    });
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [user, toast]);
};
