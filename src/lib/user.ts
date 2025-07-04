import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';

export const checkAndCreateUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user, determine role based on email address
    const role = user.email === 'admin@admin.com' ? 'admin' : 'user';

    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: role,
      });
      return role;
    } catch (error) {
       console.error("Error creating user profile:", error);
       throw error;
    }
  }
  
  // If profile exists, just return their role.
  return userSnap.data().role;
};
