import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isFired = false;
    
    const safetyTimeout = setTimeout(() => {
      if (!isFired) {
        console.warn("Firebase Auth listener timed out. Bypassing loader to allow UI interactions.");
        setError("Firebase connection is taking longer than expected. Please make sure Firebase Authentication and Firestore are enabled in the Firebase Console.");
        setLoading(false);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      isFired = true;
      clearTimeout(safetyTimeout);
      setLoading(true);
      setError(null);
      if (firebaseUser) {
        try {
          // 1. Get role from custom claims
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          let userRole = idTokenResult.claims.role;

          // 2. Fallback to reading users/{uid} document if claim is missing with a 5-second timeout
          if (!userRole) {
            const docRef = doc(db, 'users', firebaseUser.uid);
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Firestore connection timeout (Is your database provisioned?)')), 5000)
            );
            
            const userDoc = await Promise.race([
              getDoc(docRef),
              timeoutPromise
            ]);

            if (userDoc.exists()) {
              userRole = userDoc.data().role;
            } else if (firebaseUser.email === 'kamachisundar073@gmail.com') {
              // Self-repair for the main admin account after DB wipe
              import('firebase/firestore').then(async ({ setDoc }) => {
                await setDoc(docRef, {
                  userId: firebaseUser.uid,
                  role: 'admin',
                  name: 'System Admin',
                  email: firebaseUser.email,
                  phoneNumber: '',
                  isActive: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              });
              userRole = 'admin';
            }

          }

          if (userRole === 'admin') {
            setUser(firebaseUser);
            setRole(userRole);
          } else {
            // Not an admin, reject access
            await firebaseSignOut(auth);
            setUser(null);
            setRole(null);
            setError('Access Denied: You do not have administrator privileges.');
          }
        } catch (err) {
          console.error('Error fetching user claims/doc:', err);
          setUser(null);
          setRole(null);
          setError('Failed to verify administrator privileges.');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(safetyTimeout);
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error('Login error:', err);
      let errMsg = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email format.';
      }
      setError(errMsg);
      setLoading(false);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to sign out.');
    }
    setLoading(false);
  };

  return React.createElement(
    AuthContext.Provider, 
    { value: { user, role, loading, error, login, logout, setError } }, 
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
