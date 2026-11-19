import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  BOOTSTRAPPED_ADMIN_EMAILS,
  type AuthorProfile,
  type Category,
  type SiteSettings,
} from '../types/portal';
import { DEFAULT_CATEGORIES, DEFAULT_PROFILE_DATA, DEFAULT_SITE_SETTINGS } from '../data/seedData';
import { fetchActiveCategories, fetchPublicProfile, fetchSiteSettings } from '../services/firestoreService';
import { GOOGLE_DRIVE_SCOPES } from '../services/googleDriveService';

// Strictly in-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let cachedDriveAccessToken: string | null = null;

interface PortalContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  adminChecked: boolean;
  driveAccessToken: string | null;
  driveConnected: boolean;
  settings: SiteSettings;
  profile: AuthorProfile;
  categories: Category[];
  dataReady: boolean;
  sessionWarning: string | null;
  signInWithGoogle: () => Promise<void>;
  connectGoogleDrive: () => Promise<string>;
  clearDriveToken: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendAdminPasswordReset: (email: string) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshPortalGlobals: () => Promise<void>;
}

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

const fallbackCategories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
  ...c,
  isActive: true,
  createdAt: null,
  updatedAt: null,
}));

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(cachedDriveAccessToken);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS as SiteSettings);
  const [profile, setProfile] = useState<AuthorProfile>(DEFAULT_PROFILE_DATA as AuthorProfile);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [dataReady, setDataReady] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<string | null>(null);

  const inactivityTimerRef = useRef<number | null>(null);
  const isSigningInWithGoogleRef = useRef(false);

  const refreshPortalGlobals = useCallback(async () => {
    try {
      const [loadedSettings, loadedProfile, loadedCategories] = await Promise.all([
        fetchSiteSettings(),
        fetchPublicProfile(),
        fetchActiveCategories(),
      ]);
      if (loadedSettings) setSettings(loadedSettings);
      if (loadedProfile) {
        const legacyPlaceholder = '/src/assets/images/about_chambers_study_1795074956618.jpg';
        const resolvedImageUrl =
          !loadedProfile.profileImageUrl || loadedProfile.profileImageUrl === legacyPlaceholder
            ? '/assets/aistudio/jameel-khan_2505a7a3.jpg'
            : loadedProfile.profileImageUrl;
        setProfile({ ...loadedProfile, profileImageUrl: resolvedImageUrl });
      }
      if (loadedCategories.length > 0) setCategories(loadedCategories);
    } catch (err) {
      console.warn('Could not refresh global portal config:', err);
    } finally {
      setDataReady(true);
    }
  }, []);

  useEffect(() => {
    refreshPortalGlobals();
  }, [refreshPortalGlobals]);

  const verifyAdminAuthority = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }

    if (!firebaseUser.emailVerified) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }

    const email = (firebaseUser.email || '').toLowerCase();
    const isBootstrapped = (BOOTSTRAPPED_ADMIN_EMAILS as readonly string[]).includes(email);

    try {
      const adminRef = doc(db, 'admins', firebaseUser.uid);
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        setIsAdmin(true);
      } else if (isBootstrapped) {
        // Provision admin record for the bootstrapped owner
        try {
          await setDoc(adminRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || email,
            displayName: firebaseUser.displayName || 'Jameel Khan',
            role: 'super_admin',
            inactivityTimeoutMinutes: 30,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setIsAdmin(true);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `admins/${firebaseUser.uid}`);
        }
      } else {
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(isBootstrapped);
    } finally {
      setAdminChecked(true);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        cachedDriveAccessToken = null;
        setDriveAccessToken(null);
      } else if (!isSigningInWithGoogleRef.current && !cachedDriveAccessToken) {
        setDriveAccessToken(null);
      }
      setUser(nextUser);
      setAuthReady(true);
      setAdminChecked(false);
      await verifyAdminAuthority(nextUser);
    });
    return () => unsub();
  }, [verifyAdminAuthority]);

  const clearDriveToken = useCallback(() => {
    cachedDriveAccessToken = null;
    setDriveAccessToken(null);
  }, []);

  const logout = useCallback(async (reason?: string) => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    cachedDriveAccessToken = null;
    setDriveAccessToken(null);
    await signOut(auth);
    setIsAdmin(false);
    if (reason) setSessionWarning(reason);
  }, []);

  // Configurable inactivity auto-logout for Admin session
  useEffect(() => {
    if (!user || !isAdmin) return;
    const timeoutMins = Math.max(5, settings.inactivityTimeoutMinutes || 30);
    const timeoutMs = timeoutMins * 60 * 1000;

    const resetTimer = () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = window.setTimeout(() => {
        logout(`Session automatically signed out after ${timeoutMins} minutes of inactivity.`);
      }, timeoutMs);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [user, isAdmin, settings.inactivityTimeoutMinutes, logout]);

  const buildGoogleProvider = useCallback((loginHintEmail?: string | null) => {
    const provider = new GoogleAuthProvider();
    GOOGLE_DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));
    const params: Record<string, string> = { prompt: 'select_account' };
    if (loginHintEmail) {
      params.login_hint = loginHintEmail;
      params.prompt = 'consent';
    }
    provider.setCustomParameters(params);
    return provider;
  }, []);

  const signInWithGoogle = async () => {
    setSessionWarning(null);
    isSigningInWithGoogleRef.current = true;
    try {
      const provider = buildGoogleProvider();
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedDriveAccessToken = credential.accessToken;
        setDriveAccessToken(credential.accessToken);
      }
    } finally {
      isSigningInWithGoogleRef.current = false;
    }
  };

  const connectGoogleDrive = useCallback(async (): Promise<string> => {
    isSigningInWithGoogleRef.current = true;
    try {
      const provider = buildGoogleProvider(auth.currentUser?.email);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (!token) {
        throw new Error('Could not obtain Google Drive access token. Please allow Google Drive permissions in the popup.');
      }
      cachedDriveAccessToken = token;
      setDriveAccessToken(token);
      return token;
    } finally {
      isSigningInWithGoogleRef.current = false;
    }
  }, [buildGoogleProvider]);

  const signInWithEmail = async (email: string, password: string) => {
    setSessionWarning(null);
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const sendAdminPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <PortalContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        adminChecked,
        driveAccessToken,
        driveConnected: Boolean(driveAccessToken),
        settings,
        profile,
        categories,
        dataReady,
        sessionWarning,
        signInWithGoogle,
        connectGoogleDrive,
        clearDriveToken,
        signInWithEmail,
        sendAdminPasswordReset,
        logout,
        refreshPortalGlobals,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}
