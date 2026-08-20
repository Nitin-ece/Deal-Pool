import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) {
    throw new Error("Google sign-in is not configured. Add VITE_FIREBASE_* keys to .env.");
  }
  if (!app) {
    app = initializeApp({
      apiKey: firebaseConfig.apiKey!,
      authDomain: firebaseConfig.authDomain!,
      projectId: firebaseConfig.projectId!,
      appId: firebaseConfig.appId,
    });
    auth = getAuth(app);
  }
  return auth!;
}

/** Popup Google sign-in; returns tokens for POST /api/auth/google. */
export async function getGoogleAuthTokens(): Promise<{
  idToken: string;
  refreshToken?: string;
}> {
  const firebaseAuth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(firebaseAuth, provider);
  const idToken = await result.user.getIdToken(/* forceRefresh */ true);
  return {
    idToken,
    refreshToken: result.user.refreshToken || undefined,
  };
}

/** @deprecated Prefer getGoogleAuthTokens */
export async function getGoogleIdToken(): Promise<string> {
  const { idToken } = await getGoogleAuthTokens();
  return idToken;
}
