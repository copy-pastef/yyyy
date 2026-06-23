/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Securely load from environment variables with graceful defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDJ9NiJTZN2b1UPYPr_l0aCBH9LgVkHe_A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "optimistic-mark-kthgf.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "optimistic-mark-kthgf",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "optimistic-mark-kthgf.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "57319821109",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:57319821109:web:ff58e112b0cd05ab59867c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore using secure custom database ID if available, otherwise fallback to standard default Firestore
const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('Firestore Error Registered Context:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

