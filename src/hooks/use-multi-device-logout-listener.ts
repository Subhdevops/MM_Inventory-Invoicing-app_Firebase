
'use client';

import { useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { useToast } from './use-toast';

export const useMultiDeviceLogoutListener = (user: User | null | undefined) => {
    const { toast } = useToast();
    const initialSignInTime = useRef<number | null>(null);

    useEffect(() => {
        if (!user) {
            initialSignInTime.current = null;
            return;
        }

        // Store the sign-in time of the current session when the user object first becomes available.
        // This ensures we don't use a potentially updated lastSignInTime from a token refresh.
        if (initialSignInTime.current === null && user.metadata.lastSignInTime) {
            initialSignInTime.current = new Date(user.metadata.lastSignInTime).getTime();
        }

        const userRef = doc(db, 'users', user.uid);
        
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists() && initialSignInTime.current) {
                const userProfile = docSnap.data() as UserProfile;
                const lastSignOut = userProfile.lastSignOutTimestamp;

                if (lastSignOut && lastSignOut > initialSignInTime.current) {
                    unsubscribe(); // Stop listening to prevent loops
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
