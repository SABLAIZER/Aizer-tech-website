import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Inbox,
  Link2,
  LogOut,
  Mail,
  MailOpen,
  MessageCircle,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  auth,
  clearGmailAccessToken,
  db,
  getGmailAccessToken,
  GmailTokenExpiredError,
  googleSignInBasic,
  googleSignInWithGmail,
  handleFirestoreError,
  OperationType,
  sendGmailReply,
  signOutAdmin,
} from '../firebase';
import {
  ADMIN_EMAIL,
  ContactMessageRecord,
  DEFAULT_STUDIO_SETTINGS,
  MessageStatus,
  STUDIO_SETTINGS_LIMITS,
  StudioSettings,
} from '../types';

interface AdminInboxModalProps {
  open: boolean;
  fullPage?: boolean;
  studioSettings: StudioSettings;
  onClose: () => void;
}

type AdminTab = 'messages' | 'website';

const STATUS_OPTIONS: MessageStatus[] = ['new', 'reviewed', 'replied', 'archived'];

function formatTimestamp(ts?: { seconds: number; nanoseconds: number } | null): string {
  if (!ts || typeof ts.seconds !== 'number') return 'Just now';
  return new Date(ts.seconds * 1000).toLocaleString('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export const AdminInboxModal: React.FC<AdminInboxModalProps> = ({
  open,
  fullPage = false,
  studioSettings,
  onClose,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('messages');

  // Inbox state
  const [messages, setMessages] = useState<ContactMessageRecord[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | MessageStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [copiedField, setCopiedField] = useState<'email' | 'reply' | null>(null);
  const [replyNotice, setReplyNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [confirmSendItem, setConfirmSendItem] = useState<ContactMessageRecord | null>(
    null
  );
  const [sendingEmail, setSendingEmail] = useState(false);
  const [hasGmailToken, setHasGmailToken] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);

  // Live website editor state
  const [draftSettings, setDraftSettings] = useState<StudioSettings>(studioSettings);
  const [editorDirty, setEditorDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editorNotice, setEditorNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setHasGmailToken(Boolean(getGmailAccessToken()));
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!editorDirty) {
      setDraftSettings(studioSettings);
    }
  }, [studioSettings, editorDirty]);

  useEffect(() => {
    if (!open) {
      setConfirmSendItem(null);
      setReplyTargetId(null);
      setReplyNotice(null);
      setAuthError(null);
      setEditorNotice(null);
    }
  }, [open]);

  const isAuthorizedAdmin =
    Boolean(user) &&
    user?.email === ADMIN_EMAIL &&
    Boolean(user?.emailVerified);

  useEffect(() => {
    if (!open || !authReady || !isAuthorizedAdmin) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const messagesQuery = query(
      collection(db, 'contactMessages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const rows: ContactMessageRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            senderName: String(data.senderName || ''),
            senderEmail: String(data.senderEmail || ''),
            senderPhone: String(data.senderPhone || ''),
            serviceType: data.serviceType,
            budgetTier: data.budgetTier,
            message: String(data.message || ''),
            status: (data.status as MessageStatus) || 'new',
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
          };
        });
        setMessages(rows);
        setLoadingMessages(false);
      },
      (error) => {
        setLoadingMessages(false);
        handleFirestoreError(error, OperationType.LIST, 'contactMessages');
      }
    );

    return () => unsubscribe();
  }, [open, authReady, isAuthorizedAdmin]);

  const unreadCount = useMemo(
    () => messages.filter((msg) => msg.status === 'new').length,
    [messages]
  );

  const filteredMessages = useMemo(() => {
    if (statusFilter === 'all') return messages;
    return messages.filter((msg) => msg.status === statusFilter);
  }, [messages, statusFilter]);

  const formatAuthError = (error: unknown): string => {
    const raw = error instanceof Error ? error.message : String(error || 'Sign-in cancelled.');
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';

    if (code === 'auth/unauthorized-domain' || raw.includes('auth/unauthorized-domain')) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return `This domain (${host}) is not whitelisted yet in Firebase. Open Firebase Console → project "aizerchat" → Authentication → Settings → Authorized domains → Add domain → enter "${host}".`;
    }
    if (code === 'auth/popup-blocked' || raw.includes('auth/popup-blocked')) {
      return 'Pop-up was blocked by your browser. In iPhone Settings → Safari, turn off "Block Pop-ups" or tap Allow when Safari asks, then tap Sign in with Google again.';
    }
    return raw;
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      const result = await googleSignInWithGmail();
      setUser(result.user);
      setHasGmailToken(Boolean(result.accessToken));
    } catch (error) {
      setAuthError(formatAuthError(error));
    }
  };

  const handleBasicSignIn = async () => {
    setAuthError(null);
    try {
      const signedUser = await googleSignInBasic();
      setUser(signedUser);
      setHasGmailToken(false);
    } catch (error) {
      setAuthError(formatAuthError(error));
    }
  };

  const handleCopyAdminLink = async () => {
    try {
      const adminUrl = `${window.location.origin}/admin`;
      await navigator.clipboard.writeText(adminUrl);
      setCopiedAdminLink(true);
      window.setTimeout(() => setCopiedAdminLink(false), 2400);
    } catch {
      setAuthError('Could not copy link automatically. Bookmark /admin after the website URL.');
    }
  };

  const handleSignOut = async () => {
    setConfirmSendItem(null);
    setReplyTargetId(null);
    setHasGmailToken(false);
    await signOutAdmin();
  };

  const handleStatusChange = async (id: string, nextStatus: MessageStatus) => {
    setUpdatingId(id);
    const path = `contactMessages/${id}`;
    try {
      await updateDoc(doc(db, 'contactMessages', id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleReadStatus = async (item: ContactMessageRecord) => {
    const isUnread = item.status === 'new';
    await handleStatusChange(item.id, isUnread ? 'reviewed' : 'new');
  };

  const handleDelete = async (id: string) => {
    setUpdatingId(id);
    const path = `contactMessages/${id}`;
    try {
      await deleteDoc(doc(db, 'contactMessages', id));
      if (replyTargetId === id) {
        setReplyTargetId(null);
      }
      if (confirmSendItem?.id === id) {
        setConfirmSendItem(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setUpdatingId(null);
    }
  };

  const openEmailComposer = (item: ContactMessageRecord) => {
    if (replyTargetId === item.id) {
      setReplyTargetId(null);
      setConfirmSendItem(null);
      setReplyNotice(null);
      return;
    }
    setReplyTargetId(item.id);
    setConfirmSendItem(null);
    setReplySubject(`Re: Your ${item.serviceType} inquiry — Aizer Tech`);
    setReplyBody(
      `Hi ${item.senderName},\n\nThank you for reaching out to Aizer Tech regarding your ${item.serviceType} (${item.budgetTier}). I wanted to follow up by email so we can get your project moving.\n\nPlease reply directly to this email with a convenient time to connect or any extra details you would like to share.\n\nBest regards,\nSablaizer (Evans Kwaku Sablah)\nFounder, Aizer Tech · Accra, Ghana\nWhatsApp / Call: +233 27 633 5736`
    );
    setCopiedField(null);
    setReplyNotice(null);
  };

  const markAsRepliedIfNeeded = async (item: ContactMessageRecord) => {
    if (item.status !== 'replied') {
      await handleStatusChange(item.id, 'replied');
    }
  };

  const handleRequestSendEmail = (item: ContactMessageRecord) => {
    if (!replySubject.trim()) {
      setReplyNotice({
        type: 'error',
        text: 'Please enter a subject line before sending.',
      });
      return;
    }
    if (!replyBody.trim()) {
      setReplyNotice({
        type: 'error',
        text: 'Please enter a message before sending.',
      });
      return;
    }
    setReplyNotice(null);
    setConfirmSendItem(item);
  };

  const handleConfirmAndSendEmail = async () => {
    if (!confirmSendItem) return;
    const item = confirmSendItem;
    setSendingEmail(true);
    setReplyNotice(null);

    try {
      let token = getGmailAccessToken();
      if (!token) {
        const signInResult = await googleSignInWithGmail();
        setUser(signInResult.user);
        token = signInResult.accessToken;
        setHasGmailToken(Boolean(token));

        if (
          signInResult.user.email !== ADMIN_EMAIL ||
          !signInResult.user.emailVerified
        ) {
          throw new Error(
            `Please authorize with the studio Gmail account (${ADMIN_EMAIL}) to send replies.`
          );
        }
      }

      if (!token) {
        throw new Error(
          'Gmail access permission was not received. Please click Confirm & Send Email and allow Gmail sending.'
        );
      }

      try {
        await sendGmailReply({
          accessToken: token,
          to: item.senderEmail,
          subject: replySubject,
          body: replyBody,
        });
      } catch (err) {
        if (err instanceof GmailTokenExpiredError) {
          clearGmailAccessToken();
          setHasGmailToken(false);
          const refreshed = await googleSignInWithGmail();
          setUser(refreshed.user);
          setHasGmailToken(Boolean(refreshed.accessToken));
          if (
            refreshed.user.email !== ADMIN_EMAIL ||
            !refreshed.user.emailVerified
          ) {
            throw new Error(
              `Please authorize with the studio Gmail account (${ADMIN_EMAIL}) to send replies.`
            );
          }
          if (!refreshed.accessToken) {
            throw err;
          }
          await sendGmailReply({
            accessToken: refreshed.accessToken,
            to: item.senderEmail,
            subject: replySubject,
            body: replyBody,
          });
        } else {
          throw err;
        }
      }

      await markAsRepliedIfNeeded(item);
      setConfirmSendItem(null);
      setReplyNotice({
        type: 'success',
        text: `Email sent to ${item.senderEmail} via Gmail and inquiry marked as replied.`,
      });
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Could not send email right now. Please try again.';
      setConfirmSendItem(null);
      setReplyNotice({ type: 'error', text: msg });
    } finally {
      setHasGmailToken(Boolean(getGmailAccessToken()));
      setSendingEmail(false);
    }
  };

  const handleCopyText = async (
    text: string,
    field: 'email' | 'reply',
    item?: ContactMessageRecord
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      if (field === 'reply' && item) {
        await markAsRepliedIfNeeded(item);
        setReplyNotice({
          type: 'info',
          text: 'Reply copied to clipboard and inquiry marked as replied.',
        });
      } else if (field === 'email') {
        setReplyNotice({
          type: 'info',
          text: 'Client email address copied.',
        });
      }
      window.setTimeout(() => {
        setCopiedField((prev) => (prev === field ? null : prev));
      }, 2400);
    } catch {
      setReplyNotice({
        type: 'error',
        text: 'Clipboard access blocked—please select and copy the text above.',
      });
    }
  };

  const handleDraftChange = <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K]
  ) => {
    setEditorDirty(true);
    setEditorNotice(null);
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetDefaults = () => {
    setEditorDirty(true);
    setDraftSettings((prev) => ({
      ...DEFAULT_STUDIO_SETTINGS,
      updatedAt: prev.updatedAt,
    }));
    setEditorNotice({
      type: 'info',
      text: 'Default studio text loaded into the form. Tap "Save & Publish Changes" to push it live.',
    });
  };

  const handleSaveStudioSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditorNotice(null);

    const heroHeadline = draftSettings.heroHeadline.trim();
    const heroSubheadline = draftSettings.heroSubheadline.trim();
    const announcementBanner = draftSettings.announcementBanner.trim();
    const websiteStartingPrice = draftSettings.websiteStartingPrice.trim();
    const mobileStartingPrice = draftSettings.mobileStartingPrice.trim();
    const founderBio = draftSettings.founderBio.trim();

    if (
      heroHeadline.length < STUDIO_SETTINGS_LIMITS.MIN_HERO_HEADLINE ||
      heroHeadline.length > STUDIO_SETTINGS_LIMITS.MAX_HERO_HEADLINE
    ) {
      setEditorNotice({
        type: 'error',
        text: `Hero headline must be between ${STUDIO_SETTINGS_LIMITS.MIN_HERO_HEADLINE} and ${STUDIO_SETTINGS_LIMITS.MAX_HERO_HEADLINE} characters.`,
      });
      return;
    }

    if (
      heroSubheadline.length < STUDIO_SETTINGS_LIMITS.MIN_HERO_SUBHEADLINE ||
      heroSubheadline.length > STUDIO_SETTINGS_LIMITS.MAX_HERO_SUBHEADLINE
    ) {
      setEditorNotice({
        type: 'error',
        text: `Hero subheadline must be between ${STUDIO_SETTINGS_LIMITS.MIN_HERO_SUBHEADLINE} and ${STUDIO_SETTINGS_LIMITS.MAX_HERO_SUBHEADLINE} characters.`,
      });
      return;
    }

    if (announcementBanner.length > STUDIO_SETTINGS_LIMITS.MAX_ANNOUNCEMENT) {
      setEditorNotice({
        type: 'error',
        text: `Announcement banner must be ${STUDIO_SETTINGS_LIMITS.MAX_ANNOUNCEMENT} characters or fewer.`,
      });
      return;
    }

    if (
      websiteStartingPrice.length < STUDIO_SETTINGS_LIMITS.MIN_PRICE_LABEL ||
      websiteStartingPrice.length > STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL ||
      mobileStartingPrice.length < STUDIO_SETTINGS_LIMITS.MIN_PRICE_LABEL ||
      mobileStartingPrice.length > STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL
    ) {
      setEditorNotice({
        type: 'error',
        text: `Starting price labels must be between ${STUDIO_SETTINGS_LIMITS.MIN_PRICE_LABEL} and ${STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL} characters.`,
      });
      return;
    }

    if (
      founderBio.length < STUDIO_SETTINGS_LIMITS.MIN_FOUNDER_BIO ||
      founderBio.length > STUDIO_SETTINGS_LIMITS.MAX_FOUNDER_BIO
    ) {
      setEditorNotice({
        type: 'error',
        text: `Founder bio must be between ${STUDIO_SETTINGS_LIMITS.MIN_FOUNDER_BIO} and ${STUDIO_SETTINGS_LIMITS.MAX_FOUNDER_BIO} characters.`,
      });
      return;
    }

    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'studioSettings', 'public'), {
        heroHeadline,
        heroSubheadline,
        announcementBanner,
        websiteStartingPrice,
        mobileStartingPrice,
        founderBio,
        updatedAt: serverTimestamp(),
      });
      setEditorDirty(false);
      setEditorNotice({
        type: 'success',
        text: 'Live website changes saved and published. All visitors now see the updated text and pricing.',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'studioSettings/public');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!open) return null;

  const panelContent = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-hairline">
        <div>
          <p className="text-xs text-accent font-medium mb-1">
            Aizer Tech · Studio Owner Console
          </p>
          <h1
            id="studio-inbox-title"
            className="font-display text-2xl sm:text-3xl font-semibold text-ink leading-[1.2]"
          >
            {isAuthorizedAdmin && activeTab === 'website'
              ? 'Live Website Editor'
              : 'Saved Client Messages'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyAdminLink}
            title="Copy direct /admin bookmark URL"
            className="haptic-tap-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-hairline text-xs font-medium text-ink-secondary hover:text-accent hover:border-accent/50 cursor-pointer"
          >
            {copiedAdminLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Link2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {copiedAdminLink ? 'Admin Link Copied' : 'Copy Admin Link'}
            </span>
          </button>

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="haptic-tap-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-hairline text-xs font-medium text-ink-secondary hover:text-ink cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}

          {fullPage ? (
            <button
              type="button"
              onClick={onClose}
              className="haptic-tap-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-hairline text-xs font-medium text-ink-secondary hover:text-ink cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>View Public Site</span>
            </button>
          ) : (
            <button
              type="button"
              aria-label="Close studio inbox"
              onClick={onClose}
              className="haptic-tap-sm w-10 h-10 rounded-lg bg-surface-elevated border border-hairline flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isAuthorizedAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-field border border-hairline">
            <button
              type="button"
              onClick={() => setActiveTab('messages')}
              className={`haptic-tap-sm inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-accent-btn text-accent-ink'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Client Messages ({messages.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('website')}
              className={`haptic-tap-sm inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                activeTab === 'website'
                  ? 'bg-accent-btn text-accent-ink'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Edit Website (Live)</span>
            </button>
          </div>

          <p className="text-xs text-ink-subtle font-mono-tabular">
            Signed in as {user?.email}
          </p>
        </div>
      )}

      <div className={fullPage ? 'pt-6' : 'flex-1 overflow-y-auto pt-6'}>
        {!authReady ? (
          <p className="text-sm text-ink-muted py-12 text-center">
            Checking studio session...
          </p>
        ) : !user ? (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-display text-xl font-semibold text-ink leading-[1.2] mb-2">
              Studio Owner Sign-In Required
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed mb-6">
              Sign in with <span className="text-ink font-medium">{ADMIN_EMAIL}</span> to manage client inquiries and publish live updates to the public website.
            </p>

            {authError && (
              <p
                role="alert"
                className="text-xs text-red-600 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4"
              >
                {authError}
              </p>
            )}

            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleSignIn}
                className="haptic-tap inline-flex items-center justify-center gap-3 px-6 py-3 rounded-full bg-white text-[#1F1F1F] border border-[#747775]/40 text-sm font-medium shadow-sm hover:bg-[#F8F9FA] cursor-pointer"
              >
                <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                onClick={handleBasicSignIn}
                className="haptic-tap-sm text-xs text-ink-muted hover:text-accent underline underline-offset-4 cursor-pointer py-1"
              >
                Open Console Without Gmail Scope (Read, Edit Site &amp; WhatsApp)
              </button>
            </div>

            <p className="text-[11px] text-ink-subtle leading-relaxed mt-5">
              Tip: Open <span className="text-ink-secondary font-mono-tabular">/admin</span> on your phone and tap &ldquo;Add to Home Screen&rdquo; for one-tap access.
            </p>
          </div>
        ) : !isAuthorizedAdmin ? (
          <div className="max-w-md mx-auto text-center py-12">
            <h2 className="font-display text-xl font-semibold text-ink leading-[1.2] mb-2">
              Access Restricted
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed mb-6">
              Signed in as <span className="text-ink font-medium">{user.email}</span>. Only the studio owner account ({ADMIN_EMAIL}) can access this admin workspace.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="haptic-tap px-5 py-2.5 rounded-lg bg-surface-elevated border border-hairline text-sm font-medium text-ink cursor-pointer"
            >
              Switch Google Account
            </button>
          </div>
        ) : activeTab === 'website' ? (
          <form onSubmit={handleSaveStudioSettings} className="space-y-6">
            <div className="rounded-xl ios-glass-gold p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-ink leading-relaxed">
                <span className="font-semibold text-accent">Instant Live Sync:</span>{' '}
                Changes saved here update the public website immediately for all visitors.
                {studioSettings.updatedAt && (
                  <span className="block text-xs text-ink-muted mt-1">
                    Last published: {formatTimestamp(studioSettings.updatedAt)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="haptic-tap-sm inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-hairline text-xs font-medium text-ink-secondary hover:text-ink shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Defaults</span>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="setting-announcement"
                  className="text-xs font-medium text-ink"
                >
                  Top Announcement Banner (Optional)
                </label>
                <span className="text-[11px] font-mono-tabular text-ink-subtle">
                  {draftSettings.announcementBanner.length}/{STUDIO_SETTINGS_LIMITS.MAX_ANNOUNCEMENT}
                </span>
              </div>
              <input
                id="setting-announcement"
                type="text"
                maxLength={STUDIO_SETTINGS_LIMITS.MAX_ANNOUNCEMENT}
                value={draftSettings.announcementBanner}
                onChange={(e) => handleDraftChange('announcementBanner', e.target.value)}
                placeholder="e.g. Booking November slots — 50% MoMo deposit secures kickoff this week."
                className="w-full rounded-xl bg-field border border-hairline-strong px-4 py-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Leave empty to hide the announcement bar on the homepage.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="setting-headline"
                  className="text-xs font-medium text-ink"
                >
                  Hero Main Headline
                </label>
                <span className="text-[11px] font-mono-tabular text-ink-subtle">
                  {draftSettings.heroHeadline.length}/{STUDIO_SETTINGS_LIMITS.MAX_HERO_HEADLINE}
                </span>
              </div>
              <input
                id="setting-headline"
                type="text"
                maxLength={STUDIO_SETTINGS_LIMITS.MAX_HERO_HEADLINE}
                value={draftSettings.heroHeadline}
                onChange={(e) => handleDraftChange('heroHeadline', e.target.value)}
                className="w-full rounded-xl bg-field border border-hairline-strong px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="setting-subheadline"
                  className="text-xs font-medium text-ink"
                >
                  Hero Subheadline
                </label>
                <span className="text-[11px] font-mono-tabular text-ink-subtle">
                  {draftSettings.heroSubheadline.length}/{STUDIO_SETTINGS_LIMITS.MAX_HERO_SUBHEADLINE}
                </span>
              </div>
              <textarea
                id="setting-subheadline"
                rows={3}
                maxLength={STUDIO_SETTINGS_LIMITS.MAX_HERO_SUBHEADLINE}
                value={draftSettings.heroSubheadline}
                onChange={(e) => handleDraftChange('heroSubheadline', e.target.value)}
                className="w-full rounded-xl bg-field border border-hairline-strong px-4 py-3 text-sm text-ink leading-relaxed focus:outline-none focus:border-accent resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="setting-web-price"
                    className="text-xs font-medium text-ink"
                  >
                    Business Website Starting Price
                  </label>
                  <span className="text-[11px] font-mono-tabular text-ink-subtle">
                    {draftSettings.websiteStartingPrice.length}/{STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL}
                  </span>
                </div>
                <input
                  id="setting-web-price"
                  type="text"
                  maxLength={STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL}
                  value={draftSettings.websiteStartingPrice}
                  onChange={(e) =>
                    handleDraftChange('websiteStartingPrice', e.target.value)
                  }
                  placeholder="From GHS 800"
                  className="w-full rounded-xl bg-field border border-hairline-strong px-4 py-3 text-sm font-mono-tabular text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="setting-mobile-price"
                    className="text-xs font-medium text-ink"
                  >
                    Mobile App Starting Price
                  </label>
                  <span className="text-[11px] font-mono-tabular text-ink-subtle">
                    {draftSettings.mobileStartingPrice.length}/{STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL}
                  </span>
                </div>
                <input
                  id="setting-mobile-price"
                  type="text"
                  maxLength={STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL}
                  value={draftSettings.mobileStartingPrice}
                  onChange={(e) =>
                    handleDraftChange('mobileStartingPrice', e.target.value)
                  }
                  placeholder="From GHS 2,500"
                  className="w-full rounded-xl bg-field border border-hairline-strong px-4 py-3 text-sm font-mono-tabular text-ink focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="setting-founder-bio"
                  className="text-xs font-medium text-ink"
                >
                  Founder Section Intro
                </label>
                <span className="text-[11px] font-mono-tabular text-ink-subtle">
                  {draftSettings.founderBio.length}/{STUDIO_SETTINGS_LIMITS.MAX_FOUNDER_BIO}
                </span>
              </div>
              <textarea
                id="setting-founder-bio"
                rows={4}
                maxLength={STUDIO_SETTINGS_LIMITS.MAX_FOUNDER_BIO}
                value={draftSettings.founderBio}
                onChange={(e) => handleDraftChange('founderBio', e.target.value)}
                className="w-full rounded-xl bg-field border border-hairline-strong px-4 py-3 text-sm text-ink leading-relaxed focus:outline-none focus:border-accent resize-y"
              />
            </div>

            {editorNotice && (
              <p
                role={editorNotice.type === 'error' ? 'alert' : 'status'}
                className={`text-xs sm:text-sm font-medium rounded-xl px-4 py-3 border ${
                  editorNotice.type === 'success'
                    ? 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                    : editorNotice.type === 'error'
                    ? 'text-red-600 dark:text-red-300 bg-red-500/10 border-red-500/30'
                    : 'text-accent bg-accent/10 border-accent/30'
                }`}
              >
                {editorNotice.text}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="haptic-tap inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>
                  {savingSettings ? 'Publishing...' : 'Save & Publish Changes'}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <div>
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-field border border-hairline">
                {(['all', ...STATUS_OPTIONS] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`haptic-tap-sm px-3 py-1.5 rounded-md text-xs font-medium capitalize cursor-pointer ${
                      statusFilter === status
                        ? 'bg-accent-btn text-accent-ink'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <p className="text-xs font-mono-tabular text-ink-subtle">
                {filteredMessages.length}{' '}
                {filteredMessages.length === 1 ? 'message' : 'messages'} ·{' '}
                <span className={unreadCount > 0 ? 'text-accent font-medium' : ''}>
                  {unreadCount} unread
                </span>
              </p>
            </div>

            {loadingMessages ? (
              <p className="text-sm text-ink-muted py-10 text-center">
                Loading saved inquiries...
              </p>
            ) : filteredMessages.length === 0 ? (
              <div className="rounded-xl bg-field border border-hairline p-10 text-center">
                <p className="text-base font-medium text-ink mb-1">
                  No messages in this view
                </p>
                <p className="text-sm text-ink-subtle">
                  New submissions from the contact form will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((item) => {
                  const cleanDigits = item.senderPhone.replace(/\D/g, '');
                  const isUnread = item.status === 'new';
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl bg-field border p-5 transition-colors ${
                        isUnread ? 'border-accent/55' : 'border-hairline'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 pb-3 mb-3 border-b border-hairline">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-display text-lg font-semibold text-ink leading-[1.2]">
                              {item.senderName}
                            </h3>
                            <span
                              className={`text-[11px] font-mono-tabular uppercase tracking-wider font-semibold ${
                                isUnread ? 'text-accent' : 'text-ink-subtle'
                              }`}
                            >
                              · {isUnread ? 'Unread' : 'Read'}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {item.senderEmail}
                            {item.senderPhone ? ` · ${item.senderPhone}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono-tabular text-accent font-medium">
                            {item.budgetTier}
                          </p>
                          <p className="text-[11px] font-mono-tabular text-ink-subtle mt-0.5">
                            {formatTimestamp(item.createdAt)}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-ink-muted mb-2">
                        Service: <span className="text-ink font-medium">{item.serviceType}</span>
                      </p>
                      <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap mb-4">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hairline">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`status-${item.id}`}
                            className="text-xs text-ink-subtle"
                          >
                            Status:
                          </label>
                          <select
                            id={`status-${item.id}`}
                            disabled={updatingId === item.id}
                            value={item.status}
                            onChange={(e) =>
                              handleStatusChange(item.id, e.target.value as MessageStatus)
                            }
                            className="rounded-md bg-surface-elevated border border-hairline-strong px-2.5 py-1.5 text-xs text-ink capitalize focus:outline-none focus:border-accent"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleToggleReadStatus(item)}
                            aria-pressed={!isUnread}
                            className={`haptic-tap-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer disabled:opacity-60 ${
                              isUnread
                                ? 'bg-surface-elevated border-accent/45 text-accent hover:bg-accent/10'
                                : 'bg-surface-elevated border-hairline text-ink-muted hover:text-ink hover:border-hairline-strong'
                            }`}
                          >
                            {isUnread ? (
                              <>
                                <MailOpen className="w-3.5 h-3.5 shrink-0" />
                                <span>Mark as Read</span>
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                                <span>Mark as Unread</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEmailComposer(item)}
                            aria-expanded={replyTargetId === item.id}
                            className={`haptic-tap-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer ${
                              replyTargetId === item.id
                                ? 'bg-accent-btn border-accent text-accent-ink font-semibold'
                                : 'bg-surface-elevated border-hairline text-ink hover:border-accent/50'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>{replyTargetId === item.id ? 'Close Email' : 'Email'}</span>
                          </button>

                          {cleanDigits.length >= 9 && (
                            <a
                              href={`https://wa.me/${cleanDigits}?text=${encodeURIComponent(
                                `Hello ${item.senderName}, this is Sablaizer from Aizer Tech following up on your ${item.serviceType} request.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="haptic-tap-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-elevated border border-hairline text-xs text-emerald-600 dark:text-[#25D366] hover:border-emerald-500/50"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={updatingId === item.id}
                            onClick={() => handleDelete(item.id)}
                            aria-label={`Delete message from ${item.senderName}`}
                            className="haptic-tap-sm inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-surface-elevated border border-hairline text-xs text-ink-muted hover:text-red-500 dark:hover:text-red-300 hover:border-red-500/40 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Email Reply Composer */}
                      {replyTargetId === item.id && (
                        <div className="mt-4 pt-4 border-t border-hairline space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-accent">
                                Reply by Email
                              </p>
                              <p className="text-xs text-ink-muted break-all mt-0.5">
                                To: <span className="text-ink font-medium">{item.senderEmail}</span>
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyText(item.senderEmail, 'email')}
                              className="haptic-tap-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-elevated border border-hairline text-xs text-ink-secondary hover:text-ink cursor-pointer"
                            >
                              {copiedField === 'email' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedField === 'email' ? 'Email Copied' : 'Copy Email'}</span>
                            </button>
                          </div>

                          <div>
                            <label
                              htmlFor={`reply-subject-${item.id}`}
                              className="block text-[11px] text-ink-subtle mb-1"
                            >
                              Subject
                            </label>
                            <input
                              id={`reply-subject-${item.id}`}
                              type="text"
                              value={replySubject}
                              onChange={(e) => setReplySubject(e.target.value)}
                              className="w-full rounded-lg bg-surface-elevated border border-hairline-strong px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`reply-body-${item.id}`}
                              className="block text-[11px] text-ink-subtle mb-1"
                            >
                              Email Message
                            </label>
                            <textarea
                              id={`reply-body-${item.id}`}
                              rows={5}
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                              className="w-full rounded-lg bg-surface-elevated border border-hairline-strong px-3 py-2 text-xs text-ink leading-relaxed focus:outline-none focus:border-accent resize-y"
                            />
                          </div>

                          {replyNotice && (
                            <p
                              role={replyNotice.type === 'error' ? 'alert' : 'status'}
                              className={`text-xs font-medium rounded-lg px-3 py-2 border ${
                                replyNotice.type === 'success'
                                  ? 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                                  : replyNotice.type === 'error'
                                  ? 'text-red-600 dark:text-red-300 bg-red-500/10 border-red-500/30'
                                  : 'text-accent bg-accent/10 border-accent/30'
                              }`}
                            >
                              {replyNotice.text}
                            </p>
                          )}

                          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 pt-1">
                            <button
                              type="button"
                              disabled={sendingEmail}
                              onClick={() => handleRequestSendEmail(item)}
                              className="haptic-tap inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent-btn text-accent-ink text-xs font-semibold hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {sendingEmail ? 'Sending Email...' : 'Send Email'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCopyText(
                                  `To: ${item.senderEmail}\nSubject: ${replySubject}\n\n${replyBody}`,
                                  'reply',
                                  item
                                )
                              }
                              className="haptic-tap inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-surface-elevated border border-hairline text-xs font-medium text-ink-secondary hover:text-ink cursor-pointer"
                            >
                              {copiedField === 'reply' ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>
                                {copiedField === 'reply' ? 'Copied' : 'Copy Reply'}
                              </span>
                            </button>

                            <a
                              href={`mailto:${item.senderEmail}?subject=${encodeURIComponent(
                                replySubject
                              )}&body=${encodeURIComponent(replyBody)}`}
                              onClick={() => {
                                void markAsRepliedIfNeeded(item);
                              }}
                              className="haptic-tap inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-surface-elevated border border-hairline text-xs font-medium text-ink-muted hover:text-ink"
                            >
                              <Mail className="w-3.5 h-3.5 shrink-0" />
                              <span>Open Mail App</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {fullPage ? (
        <div className="min-h-screen bg-canvas text-ink section-ambient py-6 sm:py-10 px-4 sm:px-6 lg:px-10">
          <div className="max-w-5xl mx-auto ios-glass rounded-[24px] p-5 sm:p-8">
            {panelContent}
          </div>
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="studio-inbox-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          <div
            className="ios-glass max-w-4xl w-full rounded-[24px] p-6 sm:p-8 max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {panelContent}
          </div>
        </div>
      )}

      {/* Explicit Send Confirmation Dialog (Workspace Mutating Action Safeguard) */}
      {confirmSendItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-send-title"
          className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sendingEmail && setConfirmSendItem(null)}
        >
          <div
            className="ios-glass max-w-lg w-full rounded-[22px] p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-hairline">
              <div>
                <p className="text-xs font-medium text-accent mb-1">
                  Confirm Gmail Dispatch
                </p>
                <h3
                  id="confirm-send-title"
                  className="font-display text-lg font-semibold text-ink leading-[1.2]"
                >
                  Send email reply to {confirmSendItem.senderName}?
                </h3>
              </div>
              <button
                type="button"
                disabled={sendingEmail}
                aria-label="Cancel email send"
                onClick={() => setConfirmSendItem(null)}
                className="haptic-tap-sm w-9 h-9 rounded-lg bg-surface-elevated border border-hairline flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-field border border-hairline p-4 space-y-2 text-xs">
              <p className="text-ink-muted break-all">
                From:{' '}
                <span className="text-ink font-medium">
                  {user?.email || ADMIN_EMAIL}
                </span>
              </p>
              <p className="text-ink-muted break-all">
                To:{' '}
                <span className="text-ink font-medium">
                  {confirmSendItem.senderEmail}
                </span>
              </p>
              <p className="text-ink-muted break-words">
                Subject:{' '}
                <span className="text-ink font-medium">{replySubject}</span>
              </p>
              <div className="pt-2 border-t border-hairline">
                <p className="text-ink-secondary leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {replyBody}
                </p>
              </div>
            </div>

            {!hasGmailToken && (
              <p className="text-xs text-ink-muted leading-relaxed">
                Google may ask you to confirm Gmail sending permission in a quick pop-up before dispatching this message.
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={sendingEmail}
                onClick={() => setConfirmSendItem(null)}
                className="haptic-tap px-4 py-2.5 rounded-lg bg-surface-elevated border border-hairline text-xs font-medium text-ink-secondary hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingEmail}
                onClick={handleConfirmAndSendEmail}
                className="haptic-tap inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent-btn text-accent-ink text-xs font-semibold hover:bg-accent-hover disabled:opacity-60 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {sendingEmail
                    ? 'Sending via Gmail...'
                    : hasGmailToken
                    ? 'Confirm & Send Email'
                    : 'Connect Gmail & Send'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
