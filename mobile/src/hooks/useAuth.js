import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginWithEmail,
  registerWithEmail,
  logout,
  subscribeToAuthState,
  getIdTokenResult,
  updateFcmToken,
} from '../firebase/auth';
import { getUserProfile, updateUserProfile } from '../firebase/firestore';
import { setUserRole } from '../firebase/functions';

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and exposes auth state + helpers.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Auth-state listener ─────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setLoading(true);

          // 1. Try custom claims first (fastest, authoritative)
          let resolvedRole = null;
          const { claims } = await getIdTokenResult();
          if (claims?.role) {
            resolvedRole = claims.role;
          }

          // 2. Fetch Firestore user profile
          const { data: profile } = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUserProfile(profile);
            if (!resolvedRole && profile.role) {
              resolvedRole = profile.role;
            }
          }

          setRole(resolvedRole);
          setUser(firebaseUser);
        } else {
          setUser(null);
          setRole(null);
          setUserProfile(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ── Email / password login ──────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { user: authUser, error: loginError } = await loginWithEmail(email, password);
      if (loginError) {
        setError(loginError);
        return { user: null, error: loginError };
      }
      return { user: authUser, error: null };
    } catch (err) {
      setError(err.message);
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Register (Offloaded to transactional 6-step flow in auth.js) ──
  const register = useCallback(async (name, email, phone, password, selectedRole) => {
    try {
      setLoading(true);
      setError(null);
      
      const { user: newUser, error: regError } = await registerWithEmail(
        email,
        password,
        selectedRole,
        name,
        phone
      );

      if (regError) {
        setError(regError);
        return { user: null, error: regError };
      }

      return { user: newUser, error: null };
    } catch (err) {
      setError(err.message);
      return { user: null, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Sign out ────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      setError(null);
      const { error: logoutError } = await logout();
      if (logoutError) {
        setError(logoutError);
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // ── Refresh Role Claims ─────────────────────────────────────
  const refreshRole = useCallback(async () => {
    try {
      setLoading(true);
      const { claims, error: claimsError } = await getIdTokenResult();
      if (claimsError) throw new Error(claimsError);
      
      if (claims?.role) {
        setRole(claims.role);
      }
      return { role: claims?.role || null, error: null };
    } catch (err) {
      setError(err.message);
      return { role: null, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Switch User Role ────────────────────────────────────────
  const switchUserRole = useCallback(async (newRole) => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      const { error: profileError } = await updateUserProfile(user.uid, {
        role: newRole,
      });
      if (profileError) {
        setError(profileError);
        return { error: profileError };
      }

      const { error: roleError } = await setUserRole(user.uid, newRole);
      if (roleError) {
        console.warn('Failed to set custom claim on role switch:', roleError);
      }

      const tokenResult = await getIdTokenResult();
      if (tokenResult.error) {
        console.warn('Failed to refresh token claims:', tokenResult.error);
      }

      setRole(newRole);
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Mark Onboarding Complete ───────────────────────────────
  const markOnboardingComplete = useCallback(async () => {
    try {
      if (!user) return;
      const { error: profileError } = await updateUserProfile(user.uid, {
        onboardingComplete: true,
      });
      if (profileError) {
        setError(profileError);
        return { error: profileError };
      }
      setUserProfile((prev) => ({ ...prev, onboardingComplete: true }));
      return { error: null };
    } catch (err) {
      console.error(err);
      return { error: err.message };
    }
  }, [user]);

  const value = {
    user,
    role,
    userProfile,
    loading,
    error,
    setError,
    login,
    register,
    signOut,
    refreshRole,
    switchUserRole,
    markOnboardingComplete,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
