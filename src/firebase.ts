import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
] as const;

const app = initializeApp(firebaseConfig);
const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string })
  .firestoreDatabaseId;
export const db = firestoreDatabaseId
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({ prompt: 'consent select_account' });

const basicGoogleProvider = new GoogleAuthProvider();
basicGoogleProvider.setCustomParameters({ prompt: 'select_account' });

// Strict in-memory token cache (never stored in localStorage/sessionStorage)
let cachedGmailAccessToken: string | null = null;
let isSigningIn = false;

onAuthStateChanged(auth, (firebaseUser) => {
  if (!firebaseUser && !isSigningIn) {
    cachedGmailAccessToken = null;
  }
});

export function getGmailAccessToken(): string | null {
  return cachedGmailAccessToken;
}

export function clearGmailAccessToken(): void {
  cachedGmailAccessToken = null;
}

export async function googleSignInBasic(): Promise<User> {
  const result = await signInWithPopup(auth, basicGoogleProvider);
  return result.user;
}

export async function googleSignInWithGmail(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedGmailAccessToken = credential?.accessToken ?? null;
    return { user: result.user, accessToken: cachedGmailAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutAdmin(): Promise<void> {
  cachedGmailAccessToken = null;
  await signOut(auth);
}

function encodeUtf8Base64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function encodeBase64Url(input: string): string {
  return encodeUtf8Base64(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export class GmailTokenExpiredError extends Error {
  constructor(message = 'Your Gmail session expired. Please reconnect your Google account to send.') {
    super(message);
    this.name = 'GmailTokenExpiredError';
  }
}

export interface SendGmailReplyParams {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendGmailReply({
  accessToken,
  to,
  subject,
  body,
}: SendGmailReplyParams): Promise<void> {
  const cleanTo = to.replace(/[\r\n]+/g, ' ').trim();
  const cleanSubject = subject.replace(/[\r\n]+/g, ' ').trim();
  const cleanBody = body.replace(/\r?\n/g, '\r\n').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) {
    throw new Error('Invalid recipient email address.');
  }
  if (!cleanSubject) {
    throw new Error('Please enter an email subject before sending.');
  }
  if (!cleanBody) {
    throw new Error('Please enter a message before sending.');
  }

  const encodedSubject = `=?UTF-8?B?${encodeUtf8Base64(cleanSubject)}?=`;
  const mimeMessage = [
    `To: ${cleanTo}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    cleanBody,
  ].join('\r\n');

  const raw = encodeBase64Url(mimeMessage);

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!response.ok) {
    let rawMessage = '';
    let reason = '';
    try {
      const errorData = (await response.json()) as {
        error?: {
          message?: string;
          status?: string;
          errors?: Array<{ reason?: string; message?: string }>;
        };
      };
      rawMessage = errorData?.error?.message || '';
      reason = errorData?.error?.errors?.[0]?.reason || errorData?.error?.status || '';
    } catch {
      // Ignore JSON parse errors
    }

    if (response.status === 401) {
      cachedGmailAccessToken = null;
      throw new GmailTokenExpiredError();
    }

    if (response.status === 403) {
      const lower = rawMessage.toLowerCase();
      if (
        reason === 'accessNotConfigured' ||
        lower.includes('has not been used in project') ||
        lower.includes('is disabled')
      ) {
        throw new Error(
          'Gmail API is disabled in your Google Cloud project (AizerChat). Open Google Cloud Console → APIs & Services → Library → search "Gmail API" → tap Enable, then try sending again.'
        );
      }

      cachedGmailAccessToken = null;
      if (
        reason === 'insufficientPermissions' ||
        reason === 'PERMISSION_DENIED' ||
        lower.includes('insufficient authentication scopes')
      ) {
        throw new Error(
          'Gmail send permission was not checked. Tap Send Email → Connect Gmail & Send, and make sure to check "Send email on your behalf" on the Google permission screen.'
        );
      }

      throw new Error(
        rawMessage ||
          'Gmail blocked sending (403). Make sure Gmail API is enabled in Google Cloud and the send permission box is checked.'
      );
    }

    throw new Error(rawMessage || 'Failed to send email via Gmail.');
  }
}

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
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

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();
