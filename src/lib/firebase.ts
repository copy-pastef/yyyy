/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Securely load from environment variables with graceful defaults
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBofQx8seTAl_4xK2eyc9CO1CDvgKGr2LQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "deposit-app-f8a98.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "deposit-app-f8a98",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "deposit-app-f8a98.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "630087153343",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:630087153343:web:1a921fa254e6fa6781f80a"
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

