import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: string; // 'super_admin', 'technician', 'user'
  department?: string;
}

export const authService = {
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role and department from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || userData?.name,
        role: userData?.role || 'user',
        department: userData?.department
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  // Create new user account
  async signUp(email: string, password: string, name: string, department: string): Promise<AuthUser> {
    try {
      // Create Firebase Auth account
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore with profile data
      // Convert department to uppercase for consistency
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
        department: department.toUpperCase(),
        role: 'user', // Default role
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        uid: user.uid,
        email: user.email,
        displayName: name
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser(): User | null {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user role and department from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();

          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || userData?.name,
            role: userData?.role || 'user',
            department: userData?.department
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback without role/department
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: 'user'
          });
        }
      } else {
        callback(null);
      }
    });
  }
};