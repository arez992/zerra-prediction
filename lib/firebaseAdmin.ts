import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function formatPrivateKey(key?: string) {
  return key
    ?.replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = formatPrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY);

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Firebase Admin environment variables are missing.");
}

const app =
  getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);