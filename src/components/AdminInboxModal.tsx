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
  updateDoc,
} from 'firebase/firestore';
import {
  Check,
  Copy,
  Link2,
  LogOut,
  Mail,
  MessageCircle,
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
  MessageStatus,
} from '../types';

interface AdminInboxModalProps {
  open: boolean;
  onClose: () => void;
}

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
  onClose,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setHasGmailToken(Boolean(getGmailAccessToken()));
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!open) {
      setConfirmSendItem(null);
      setReplyTargetId(null);
      setReplyNotice(null);
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

  const filteredMessages = useMemo(() => {
    if (statusFilter === 'all') return messages;
    return messages.filter((msg) => msg.status === statusFilter);
  }, [messages, statusFilter]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      const result = await googleSignInWithGmail();
      setUser(result.user);
      setHasGmailToken(Boolean(result.accessToken));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in cancelled.';
      setAuthError(msg);
    }
  };

  const handleBasicSignIn = async () => {
    setAuthError(null);
    try {
      const signedUser = await googleSignInBasic();
      setUser(signedUser);
      setHasGmailToken(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in cancelled.';
      setAuthError(msg);
    }
  };

  const handleCopyAdminLink = async () => {
    try {
      const adminUrl = `${window.location.origin}/#aizertechgh-admin`;
      await navigator.clipboard.writeText(adminUrl);
      setCopiedAdminLink(true);
      window.setTimeout(() => setCopiedAdminLink(false), 2400);
    } catch {
      setAuthError('Could not copy link automatically. Add /#aizertechgh-admin to the website URL to bookmark it.');
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

  if (!open) return null;

  return (
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
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-hairline">
          <div>
            <p className="text-xs text-accent font-medium mb-1">
              Aizer Tech · Private Database View
            </p>
            <h2
              id="studio-inbox-title"
              className="font-display text-2xl font-semibold text-ink leading-[1.2]"
            >
              Saved Client Messages
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyAdminLink}
              title="Copy direct /#aizertechgh-admin bookmark URL"
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
            <button
              type="button"
              aria-label="Close studio inbox"
              onClick={onClose}
              className="haptic-tap-sm w-10 h-10 rounded-lg bg-surface-elevated border border-hairline flex items-center justify-center text-ink-muted hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-6">
          {!authReady ? (
            <p className="text-sm text-ink-muted py-8 text-center">
              Checking studio session...
            </p>
          ) : !user ? (
            <div className="max-w-md mx-auto text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center text-accent mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-semibold text-ink leading-[1.2] mb-2">
                Studio Owner Sign-In Required
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed mb-6">
                Sign in with <span className="text-ink font-medium">{ADMIN_EMAIL}</span> to view, triage, and manage saved client inquiries.
              </p>
              {authError && (
                <p className="text-xs text-red-600 dark:text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
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
                  Open Inbox Only (Read &amp; Reply on WhatsApp)
                </button>
              </div>
              <p className="text-[11px] text-ink-subtle leading-relaxed mt-5">
                Tip: Open <span className="text-ink-secondary font-mono-tabular">/#aizertechgh-admin</span> and add it to your iPhone Home Screen so it looks like a one-tap app icon.
              </p>
            </div>
          ) : !isAuthorizedAdmin ? (
            <div className="max-w-md mx-auto text-center py-10">
              <h3 className="font-display text-xl font-semibold text-ink leading-[1.2] mb-2">
                Access Restricted
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed mb-6">
                Signed in as <span className="text-ink font-medium">{user.email}</span>. Only the studio owner account ({ADMIN_EMAIL}) can read private client inquiries.
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="haptic-tap px-5 py-2.5 rounded-lg bg-surface-elevated border border-hairline text-sm font-medium text-ink cursor-pointer"
              >
                Switch Google Account
              </button>
            </div>
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
                  {filteredMessages.length === 1 ? 'message' : 'messages'}
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
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl bg-field border border-hairline p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4 pb-3 mb-3 border-b border-hairline">
                          <div>
                            <h4 className="font-display text-lg font-semibold text-ink leading-[1.2]">
                              {item.senderName}
                            </h4>
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
      </div>

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
    </div>
  );
};
