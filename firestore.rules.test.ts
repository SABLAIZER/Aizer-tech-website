/**
 * Security Rule Verification Matrix for Eks Sablaizer DC Portfolio
 * Matches the Dirty Dozen payloads in security_spec.md against firestore.rules.
 */

export interface ContactMessagePayload {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  serviceType: string;
  budgetTier: string;
  message: string;
  status: string;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface StudioSettingsPayload {
  heroHeadline: string;
  heroSubheadline: string;
  announcementBanner: string;
  websiteStartingPrice: string;
  mobileStartingPrice: string;
  founderBio: string;
  updatedAt: unknown;
}

export const dirtyDozenPayloads = [
  { name: 'Unauthenticated list on /contactMessages', expected: 'PERMISSION_DENIED' },
  { name: 'Non-admin get on /contactMessages/{id}', expected: 'PERMISSION_DENIED' },
  { name: 'Unverified email spoofing admin', expected: 'PERMISSION_DENIED' },
  { name: 'Create with shadow field isAdmin: true', expected: 'PERMISSION_DENIED' },
  { name: 'Create with status: replied', expected: 'PERMISSION_DENIED' },
  { name: 'Create with client-forged timestamp', expected: 'PERMISSION_DENIED' },
  { name: 'Create with oversized 50KB message', expected: 'PERMISSION_DENIED' },
  { name: 'Create with invalid email format', expected: 'PERMISSION_DENIED' },
  { name: 'Create with invalid serviceType enum', expected: 'PERMISSION_DENIED' },
  { name: 'Create with invalid document ID', expected: 'PERMISSION_DENIED' },
  { name: 'Admin update mutating senderEmail', expected: 'PERMISSION_DENIED' },
  { name: 'Client write to /admins/{uid}', expected: 'PERMISSION_DENIED' },
  { name: 'Non-admin write to /studioSettings/public', expected: 'PERMISSION_DENIED' },
  { name: 'Unauthenticated list on /studioSettings', expected: 'PERMISSION_DENIED' },
  { name: 'Admin write to /studioSettings/public with oversized field', expected: 'PERMISSION_DENIED' },
] as const;
