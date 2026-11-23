import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { OfflineOutboxItem } from './types';

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string })
  .firestoreDatabaseId;
export const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore client is offline. Offline queue fallback is active.');
    }
  }
}

void testConnection();

const OFFLINE_OUTBOX_KEY = 'aizertech_offline_outbox';

export function getOfflineOutbox(): OfflineOutboxItem[] {
  try {
    const raw = window.localStorage.getItem(OFFLINE_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveToOfflineOutbox(item: OfflineOutboxItem): void {
  try {
    const existing = getOfflineOutbox();
    existing.push(item);
    window.localStorage.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage quota errors
  }
}

function setOfflineOutbox(items: OfflineOutboxItem[]): void {
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(OFFLINE_OUTBOX_KEY);
    } else {
      window.localStorage.setItem(OFFLINE_OUTBOX_KEY, JSON.stringify(items));
    }
  } catch {
    // Ignore storage errors
  }
}

export function isLikelyOfflineError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code).toLowerCase()
      : '';
  return (
    code === 'unavailable' ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('unavailable')
  );
}

let isSyncingOutbox = false;

export async function syncOfflineOutbox(): Promise<number> {
  if (isSyncingOutbox) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;

  const queue = getOfflineOutbox();
  if (queue.length === 0) return 0;

  isSyncingOutbox = true;
  const remaining: OfflineOutboxItem[] = [];
  let syncedCount = 0;

  try {
    for (const item of queue) {
      try {
        await addDoc(collection(db, 'aizertech_messages'), {
          name: item.name,
          email: item.email,
          phone: item.phone,
          service: item.service,
          budget: item.budget,
          message: item.message,
          status: 'new',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        syncedCount += 1;
      } catch (err) {
        if (isLikelyOfflineError(err)) {
          remaining.push(item);
        } else {
          console.error('Failed to sync queued message:', err);
        }
      }
    }
    setOfflineOutbox(remaining);
  } finally {
    isSyncingOutbox = false;
  }

  return syncedCount;
}
