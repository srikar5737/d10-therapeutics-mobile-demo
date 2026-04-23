/**
 * D-10 Therapeutics — Firebase Project Configuration
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO FILL THESE VALUES
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project named "d10-therapeutics" (or open your existing one)
 * 3. Click the gear icon → Project settings → Your apps
 * 4. Add a Web app (the Firebase JS SDK works for both React Native and web)
 * 5. Copy the values from the `firebaseConfig` object Firebase shows you
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT TO ENABLE IN THE FIREBASE CONSOLE
 * ─────────────────────────────────────────────────────────────────────────────
 * - Firestore Database  → Build → Firestore Database → Create database
 *     Start in TEST MODE for initial development, then apply security rules later
 * - Authentication      → Build → Authentication → Sign-in method
 *     Enable "Email/Password" for initial demo login
 *     (Twilio SMS / phone auth comes later)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION NOTE
 * ─────────────────────────────────────────────────────────────────────────────
 * For production, move these values into environment variables using one of:
 *   - expo-constants + app.json "extra" field (recommended for Expo)
 *   - A .env file + babel-plugin-inline-dotenv
 * Never commit real API keys to a public repository.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const firebaseConfig: FirebaseAppConfig = {
  apiKey: 'REPLACE_WITH_FIREBASE_API_KEY',
  authDomain: 'REPLACE_WITH_PROJECT_ID.firebaseapp.com',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'REPLACE_WITH_MESSAGING_SENDER_ID',
  appId: 'REPLACE_WITH_APP_ID',
};

/**
 * Returns true only after you have replaced all placeholder strings above.
 * Used throughout the service layer to gracefully skip cloud calls
 * when Firebase is not yet configured, keeping the demo working as-is.
 */
export function isFirebaseConfigured(): boolean {
  return !firebaseConfig.apiKey.startsWith('REPLACE_');
}

export default firebaseConfig;
