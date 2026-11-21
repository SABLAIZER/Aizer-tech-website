import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
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
import { LogOut, Mail, MessageCircle, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

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
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in cancelled.';
      setAuthError(msg);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    } finally {
      setUpdatingId(null);
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
              className="font-display text-2xl font-semibold text-ink"
            >
              Saved Client Messages
            </h2>
          </div>

          <div className="flex items-center gap-2">
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
              <h3 className="font-display text-xl font-semibold text-ink mb-2">
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
              <button
                type="button"
                onClick={handleSignIn}
                className="haptic-tap px-6 py-3 rounded-lg bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover cursor-pointer"
              >
                Sign In with Google
              </button>
            </div>
          ) : !isAuthorizedAdmin ? (
            <div className="max-w-md mx-auto text-center py-10">
              <h3 className="font-display text-xl font-semibold text-ink mb-2">
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
                            <h4 className="font-display text-lg font-semibold text-ink">
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

                          <div className="flex items-center gap-2">
                            <a
                              href={`mailto:${item.senderEmail}?subject=${encodeURIComponent(
                                `Re: Your ${item.serviceType} inquiry — Aizer Tech`
                              )}`}
                              className="haptic-tap-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-elevated border border-hairline text-xs text-ink hover:border-accent/50"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Email</span>
                            </a>

                            {cleanDigits.length >= 9 && (
                              <a
                                href={`https://wa.me/${cleanDigits}`}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
