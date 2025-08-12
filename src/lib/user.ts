import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import type { UserProfile } from './types';

export const checkAndCreateUserProfile = async (user: User): Promise<Pick<UserProfile, 'role' | 'activeEventId'>> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user, determine role based on email address
    const role = user.email === 'admin@minimalmischief.com' ? 'admin' : 'user';

    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: role,
        activeEventId: null,
      });
      return { role, activeEventId: null };
    } catch (error) {
       console.error("Error creating user profile:", error);
       throw error;
    }
  }
  
  const data = userSnap.data();
  return { role: data.role, activeEventId: data.activeEventId || null };
};
