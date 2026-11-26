import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';

const LOCAL_VISITOR_ID_KEY = 'aizer_visitor_token_v1';
const DAILY_VISIT_DATE_KEY = 'aizer_visit_tracked_date_v1';

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function detectDeviceType(): 'Mobile' | 'Desktop' {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = window.navigator.userAgent || '';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    ua
  );
  if (isMobileUa || window.innerWidth < 768) {
    return 'Mobile';
  }
  return 'Desktop';
}

export function detectPageVisited(): string {
  if (typeof window === 'undefined') return 'Home';
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();
  if (path === '/my-account' || hash === '#my-account') return 'My Account';
  if (hash === '#services') return 'Services';
  if (hash === '#portfolio') return 'Portfolio';
  if (hash === '#client-success') return 'Reviews';
  if (hash === '#book-call') return 'Book Call';
  if (hash === '#contact') return 'Contact';
  if (hash === '#founder') return 'About';
  return 'Home';
}

function getOrCreateLocalVisitorToken(): string {
  try {
    const existing = window.localStorage.getItem(LOCAL_VISITOR_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const randomPart = Math.random().toString(36).slice(2, 12);
    const timePart = Date.now().toString(36);
    const created = `v_${timePart}_${randomPart}`;
    window.localStorage.setItem(LOCAL_VISITOR_ID_KEY, created);
    return created;
  } catch {
    return `v_${Date.now().toString(36)}`;
  }
}

async function hashStringShort(input: string): Promise<string> {
  try {
    if (window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(input);
      const buf = await window.crypto.subtle.digest('SHA-256', encoded);
      const hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `ip_${hex.slice(0, 20)}`;
    }
  } catch {
    // Fallback below
  }
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return `ip_${Math.abs(hash).toString(36)}`;
}

async function resolveVisitorGeo(): Promise<{
  visitorKey: string;
  country: string;
}> {
  const localToken = getOrCreateLocalVisitorToken();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 1400);

  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) {
      return { visitorKey: localToken, country: 'Unknown' };
    }
    const data = (await res.json()) as {
      ip?: string;
      country_name?: string;
    };
    const rawIp = typeof data.ip === 'string' ? data.ip.trim() : '';
    const country =
      typeof data.country_name === 'string' && data.country_name.trim()
        ? data.country_name.trim().slice(0, 80)
        : 'Unknown';

    const visitorKey = rawIp ? await hashStringShort(rawIp) : localToken;
    return { visitorKey, country };
  } catch {
    window.clearTimeout(timer);
    return { visitorKey: localToken, country: 'Unknown' };
  }
}

export async function trackUniqueDailyVisit(options: {
  isAdmin: boolean;
  isAdminRoute: boolean;
}): Promise<boolean> {
  if (options.isAdmin || options.isAdminRoute) return true;

  const dateKey = getTodayDateKey();
  try {
    const alreadyTracked = window.localStorage.getItem(DAILY_VISIT_DATE_KEY);
    if (alreadyTracked === dateKey) return true;
  } catch {
    // Continue with deterministic IP/token docId even if localStorage is blocked
  }

  const pageVisited = detectPageVisited();
  const device = detectDeviceType();
  const timeLabel = new Date().toLocaleTimeString('en-GH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const { visitorKey, country } = await resolveVisitorGeo();
  const safeVisitorKey = visitorKey.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const visitDocId = `${dateKey}_${safeVisitorKey}`;

  try {
    await setDoc(doc(db, 'aizertech_visits', visitDocId), {
      dateKey,
      timeLabel: (timeLabel && timeLabel.trim().length >= 2 ? timeLabel.trim() : '12:00 PM').slice(0, 20),
      pageVisited: pageVisited.slice(0, 60),
      device,
      country: country.slice(0, 80),
      visitorKey: safeVisitorKey,
      createdAt: serverTimestamp(),
    });
    try {
      window.localStorage.setItem(DAILY_VISIT_DATE_KEY, dateKey);
    } catch {
      // Ignore storage access errors
    }
    return true;
  } catch (err) {
    // Do not lock localStorage on failed write so a subsequent retry or login can record the visit.
    console.warn(
      'Visitor tracking write deferred:',
      err instanceof Error ? err.message : 'unavailable'
    );
    return false;
  }
}

export async function upsertRegisteredUserProfile(user: User): Promise<{
  needsPhonePrompt: boolean;
}> {
  if (!user.email || !user.emailVerified) {
    return { needsPhonePrompt: false };
  }

  const userRef = doc(db, 'aizertech_users', user.uid);
  const fallbackName =
    user.displayName?.trim() || user.email.split('@')[0] || 'Client';
  const safeName = fallbackName.slice(0, 120);
  const safePhoto = (user.photoURL || '').slice(0, 1000);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: safeName,
        email: user.email.slice(0, 150),
        photoUrl: safePhoto,
        phone: '',
        phonePrompted: false,
        firstLoginAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        totalRequests: 0,
      });
      return { needsPhonePrompt: true };
    }

    const existing = snap.data();
    await updateDoc(userRef, {
      name: safeName,
      photoUrl: safePhoto,
      lastActiveAt: serverTimestamp(),
    });

    const hasPhone =
      typeof existing.phone === 'string' && existing.phone.trim().length > 0;
    const prompted = Boolean(existing.phonePrompted);
    return { needsPhonePrompt: !hasPhone && !prompted };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `aizertech_users/${user.uid}`);
  }
}

export async function saveUserPhoneAndMarkPrompted(
  uid: string,
  phone: string
): Promise<void> {
  const userRef = doc(db, 'aizertech_users', uid);
  try {
    await updateDoc(userRef, {
      phone: phone.trim().slice(0, 30),
      phonePrompted: true,
      lastActiveAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `aizertech_users/${uid}`);
  }
}

export async function incrementUserTotalRequests(uid: string): Promise<void> {
  const userRef = doc(db, 'aizertech_users', uid);
  try {
    await updateDoc(userRef, {
      totalRequests: increment(1),
      lastActiveAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Could not increment user request count:', error);
  }
}
