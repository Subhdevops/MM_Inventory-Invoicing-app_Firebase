import { doc, getDoc, setDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '@/lib/firebase';

export const checkAndCreateUserProfile = async (user: User) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user, determine role
    const usersCollectionRef = collection(db, 'users');
    // Check if any user document exists at all.
    const q = query(usersCollectionRef, limit(1));
    const existingUsersSnap = await getDocs(q);
    
    // If no users exist, the first one is an admin.
    const role = existingUsersSnap.empty ? 'admin' : 'user';

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
