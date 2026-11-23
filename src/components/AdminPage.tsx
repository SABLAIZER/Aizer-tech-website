import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AdminAccountRecord,
  AizerMessage,
  CONTACT_SERVICE_OPTIONS,
  DEFAULT_SERVICES,
  formatGhs,
  MessageStatus,
  normalizePhoneForWhatsApp,
  ServiceItem,
  ServiceOption,
  SiteSettings,
} from '../types';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { BrandMark } from './BrandMark';

interface AdminPageProps {
  siteSettings: SiteSettings;
  onBackToSite: () => void;
}

const SESSION_LOCAL_KEY = 'aizertech_admin_stay_logged_in';
const SESSION_TAB_KEY = 'aizertech_admin_tab_session';

interface StoredSession {
  username: string;
  token: string;
}

function readStoredSession(): StoredSession | null {
  try {
    const localRaw = window.localStorage.getItem(SESSION_LOCAL_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw) as StoredSession;
      if (parsed?.username && parsed?.token) return parsed;
    }
    const tabRaw = window.sessionStorage.getItem(SESSION_TAB_KEY);
    if (tabRaw) {
      const parsed = JSON.parse(tabRaw) as StoredSession;
      if (parsed?.username && parsed?.token) return parsed;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

function saveStoredSession(session: StoredSession, stayLoggedIn: boolean): void {
  try {
    if (stayLoggedIn) {
      window.localStorage.setItem(SESSION_LOCAL_KEY, JSON.stringify(session));
      window.sessionStorage.removeItem(SESSION_TAB_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_TAB_KEY, JSON.stringify(session));
      window.localStorage.removeItem(SESSION_LOCAL_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(SESSION_LOCAL_KEY);
    window.sessionStorage.removeItem(SESSION_TAB_KEY);
  } catch {
    // Ignore storage access errors
  }
}

function formatMessageTimestamp(createdAt: AizerMessage['createdAt']): string {
  if (!createdAt || typeof createdAt.seconds !== 'number') {
    return 'Just now';
  }
  const date = new Date(createdAt.seconds * 1000);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildStatusLabel(status: MessageStatus): {
  label: string;
  classes: string;
  icon: React.ReactNode;
} {
  if (status === 'done') {
    return {
      label: 'Done',
      classes: 'bg-neon/15 text-neon border-neon/40',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }
  if (status === 'replied') {
    return {
      label: 'Replied',
      classes: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
      icon: <Check className="w-3.5 h-3.5" />,
    };
  }
  return {
    label: 'New',
    classes: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
    icon: <Clock className="w-3.5 h-3.5" />,
  };
}

export const AdminPage: React.FC<AdminPageProps> = ({
  siteSettings,
  onBackToSite,
}) => {
  const [bootState, setBootState] = useState<'loading' | 'setup' | 'login' | 'authenticated' | 'error'>('loading');
  const [bootError, setBootError] = useState('');
  const [adminRecord, setAdminRecord] = useState<AdminAccountRecord | null>(null);

  // First-time setup state
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [setupWhatsApp, setSetupWhatsApp] = useState('+233');
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Dashboard state
  const [activeTab, setActiveTab] = useState<'inbox' | 'settings'>('inbox');
  const [messages, setMessages] = useState<AizerMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MessageStatus>('all');
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');

  // Settings editor state
  const [editWhatsApp, setEditWhatsApp] = useState(siteSettings.whatsappNumber);
  const [editServices, setEditServices] = useState<ServiceItem[]>(siteSettings.services);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<{
    type: 'idle' | 'success' | 'error';
    text: string;
  }>({ type: 'idle', text: '' });

  useEffect(() => {
    setEditWhatsApp(siteSettings.whatsappNumber);
    setEditServices(siteSettings.services);
  }, [siteSettings]);

  const loadAdminState = async () => {
    setBootState('loading');
    setBootError('');
    try {
      const adminSnap = await getDoc(doc(db, 'aizertech_admin', 'primary'));
      if (!adminSnap.exists()) {
        setAdminRecord(null);
        setBootState('setup');
        return;
      }

      const data = adminSnap.data() as AdminAccountRecord;
      setAdminRecord(data);

      const stored = readStoredSession();
      const expectedToken = data.passwordHash.slice(-24);
      if (
        stored &&
        stored.username.toLowerCase() === data.username.toLowerCase() &&
        stored.token === expectedToken
      ) {
        setBootState('authenticated');
      } else {
        clearStoredSession();
        setBootState('login');
      }
    } catch (err) {
      setBootError(
        err instanceof Error
          ? err.message
          : 'Could not connect to Firestore. Please check your internet connection.'
      );
      setBootState('error');
    }
  };

  useEffect(() => {
    void loadAdminState();
  }, []);

  // Real-time messages listener once authenticated
  useEffect(() => {
    if (bootState !== 'authenticated') {
      return;
    }

    setMessagesLoading(true);
    setMessagesError('');

    const q = query(
      collection(db, 'aizertech_messages'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AizerMessage[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: String(d.name || ''),
            email: String(d.email || ''),
            phone: String(d.phone || ''),
            service: String(d.service || ''),
            budget: String(d.budget || ''),
            message: String(d.message || ''),
            status:
              d.status === 'replied' || d.status === 'done' ? d.status : 'new',
            createdAt: d.createdAt ?? null,
            updatedAt: d.updatedAt ?? null,
          };
        });
        setMessages(list);
        setMessagesLoading(false);
      },
      (err) => {
        setMessagesLoading(false);
        setMessagesError(
          err instanceof Error
            ? err.message
            : 'Unable to listen to client messages.'
        );
        try {
          handleFirestoreError(err, OperationType.LIST, 'aizertech_messages');
        } catch {
          // Error already logged cleanly
        }
      }
    );

    return () => unsubscribe();
  }, [bootState]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    const cleanUser = setupUsername.trim();
    const cleanPhone = setupWhatsApp.trim();

    if (!/^[a-zA-Z0-9_.\-]{3,50}$/.test(cleanUser)) {
      setSetupError(
        'Username must be 3–50 characters (letters, numbers, dots, underscores, or hyphens).'
      );
      return;
    }

    if (setupPassword.length < 6) {
      setSetupError('Password must be at least 6 characters.');
      return;
    }

    if (setupPassword !== setupConfirm) {
      setSetupError('Passwords do not match.');
      return;
    }

    if (cleanPhone.length < 6 || cleanPhone.length > 30) {
      setSetupError('Please enter a valid WhatsApp number (e.g. +233 24 000 0000).');
      return;
    }

    setSetupSubmitting(true);
    try {
      const passwordHash = await hashPassword(setupPassword);
      const record: AdminAccountRecord = {
        username: cleanUser,
        passwordHash,
        whatsappNumber: cleanPhone,
      };

      await setDoc(doc(db, 'aizertech_admin', 'primary'), {
        username: record.username,
        passwordHash: record.passwordHash,
        whatsappNumber: record.whatsappNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Sync initial WhatsApp number & default services to public site settings
      await setDoc(doc(db, 'aizertech_settings', 'site'), {
        whatsappNumber: cleanPhone,
        services: siteSettings.services.length ? siteSettings.services : DEFAULT_SERVICES,
        updatedAt: serverTimestamp(),
      });

      setAdminRecord(record);
      saveStoredSession(
        {
          username: record.username,
          token: record.passwordHash.slice(-24),
        },
        true
      );
      setBootState('authenticated');
    } catch (err) {
      setSetupError(
        err instanceof Error
          ? err.message
          : 'Failed to create admin account. Please check your connection and try again.'
      );
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!adminRecord) {
      setLoginError('Admin account not found.');
      return;
    }

    const cleanUser = loginUsername.trim();
    if (!cleanUser || !loginPassword) {
      setLoginError('Please enter both username and password.');
      return;
    }

    setLoginSubmitting(true);
    try {
      const usernameMatches =
        cleanUser.toLowerCase() === adminRecord.username.toLowerCase();
      const passwordMatches = await verifyPassword(
        loginPassword,
        adminRecord.passwordHash
      );

      if (!usernameMatches || !passwordMatches) {
        setLoginError('Invalid username or password.');
        return;
      }

      saveStoredSession(
        {
          username: adminRecord.username,
          token: adminRecord.passwordHash.slice(-24),
        },
        stayLoggedIn
      );
      setLoginPassword('');
      setBootState('authenticated');
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Unable to verify credentials.'
      );
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearStoredSession();
    setBootState('login');
  };

  const handleUpdateStatus = async (id: string, nextStatus: MessageStatus) => {
    setBusyMessageId(id);
    setActionFeedback('');
    try {
      await updateDoc(doc(db, 'aizertech_messages', id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setActionFeedback(
        err instanceof Error ? err.message : 'Failed to update message status.'
      );
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setBusyMessageId(id);
    setActionFeedback('');
    try {
      await deleteDoc(doc(db, 'aizertech_messages', id));
      setConfirmDeleteId(null);
    } catch (err) {
      setActionFeedback(
        err instanceof Error ? err.message : 'Failed to delete message.'
      );
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleServiceFieldChange = (
    index: number,
    field: keyof ServiceItem,
    value: string | number
  ) => {
    setEditServices((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]:
                field === 'priceGhs'
                  ? Math.max(0, Number(value) || 0)
                  : value,
            }
          : item
      )
    );
  };

  const handleAddService = () => {
    if (editServices.length >= 12) return;
    setEditServices((prev) => [
      ...prev,
      {
        id: `service-${Date.now()}`,
        title: 'New Custom Service',
        priceGhs: 1000,
        description: 'Custom digital solution tailored to your business goals.',
        contactService: 'Other',
      },
    ]);
  };

  const handleRemoveService = (index: number) => {
    if (editServices.length <= 1) return;
    setEditServices((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsNotice({ type: 'idle', text: '' });

    const cleanWhatsApp = editWhatsApp.trim();
    if (cleanWhatsApp.length < 6 || cleanWhatsApp.length > 30) {
      setSettingsNotice({
        type: 'error',
        text: 'Please enter a valid WhatsApp number (e.g. +233 24 000 0000).',
      });
      return;
    }

    const sanitizedServices = editServices.map((s) => ({
      id: s.id.trim().slice(0, 60) || `srv-${Date.now()}`,
      title: s.title.trim().slice(0, 80) || 'Service',
      priceGhs: Math.max(0, Math.min(1000000, Math.round(Number(s.priceGhs) || 0))),
      description: s.description.trim().slice(0, 300) || 'Digital solution.',
      contactService: CONTACT_SERVICE_OPTIONS.includes(s.contactService)
        ? s.contactService
        : 'Other',
    }));

    setSettingsSaving(true);
    try {
      await setDoc(doc(db, 'aizertech_settings', 'site'), {
        whatsappNumber: cleanWhatsApp,
        services: sanitizedServices,
        updatedAt: serverTimestamp(),
      });
      setSettingsNotice({
        type: 'success',
        text: 'Settings saved! Your main website WhatsApp number, services, and prices are now updated.',
      });
    } catch (err) {
      setSettingsNotice({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Unable to save settings to Firestore.',
      });
    } finally {
      setSettingsSaving(false);
    }
  };

  const counts = useMemo(() => {
    return {
      total: messages.length,
      newCount: messages.filter((m) => m.status === 'new').length,
      repliedCount: messages.filter((m) => m.status === 'replied').length,
      doneCount: messages.filter((m) => m.status === 'done').length,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.service.toLowerCase().includes(q)
      );
    });
  }, [messages, searchQuery, statusFilter]);

  if (bootState === 'loading') {
    return (
      <div className="min-h-screen bg-canvas text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-7 h-7 text-neon animate-spin" />
          <p className="text-sm text-ink-muted">
            Connecting to AizerTech GH Admin...
          </p>
        </div>
      </div>
    );
  }

  if (bootState === 'error') {
    return (
      <div className="min-h-screen bg-canvas text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-surface border border-red-500/40 p-7 space-y-4">
          <div className="flex items-center gap-2.5 text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <h1 className="font-display text-xl font-bold text-white">
              Connection Error
            </h1>
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">{bootError}</p>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void loadAdminState()}
              className="tap-feedback px-4 py-2.5 rounded-xl bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover cursor-pointer"
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={onBackToSite}
              className="tap-feedback px-4 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm font-medium text-white hover:border-neon/50 cursor-pointer"
            >
              Back to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (bootState === 'setup') {
    return (
      <div className="min-h-screen bg-canvas text-white flex items-center justify-center px-4 py-10 hero-ambient">
        <div className="max-w-md w-full rounded-2xl bg-surface border border-hairline-strong p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-6 pb-5 border-b border-hairline">
            <div className="inline-flex items-center gap-2.5">
              <BrandMark size="sm" />
              <span className="font-display text-lg font-bold text-white">
                AizerTech GH
              </span>
            </div>
            <button
              type="button"
              onClick={onBackToSite}
              className="text-xs text-ink-muted hover:text-white cursor-pointer"
            >
              View Site
            </button>
          </div>

          <div className="flex items-center gap-2 text-neon text-xs font-medium mb-2">
            <UserPlus className="w-4 h-4" />
            <span>First Time Setup</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Create Admin Account
          </h1>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed">
            Set your permanent username, password, and WhatsApp number. Your
            password is salted and hashed before saving to Firestore.
          </p>

          <form onSubmit={handleCreateAdmin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="setup-username"
                className="block text-xs font-medium text-ink-secondary mb-1.5"
              >
                Username
              </label>
              <input
                id="setup-username"
                type="text"
                required
                autoComplete="username"
                value={setupUsername}
                onChange={(e) => setSetupUsername(e.target.value)}
                placeholder="sablaizer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
              />
            </div>

            <div>
              <label
                htmlFor="setup-whatsapp"
                className="block text-xs font-medium text-ink-secondary mb-1.5"
              >
                WhatsApp Number
              </label>
              <input
                id="setup-whatsapp"
                type="tel"
                required
                value={setupWhatsApp}
                onChange={(e) => setSetupWhatsApp(e.target.value)}
                placeholder="+233 24 000 0000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
              />
            </div>

            <div>
              <label
                htmlFor="setup-password"
                className="block text-xs font-medium text-ink-secondary mb-1.5"
              >
                Password
              </label>
              <input
                id="setup-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
              />
            </div>

            <div>
              <label
                htmlFor="setup-confirm"
                className="block text-xs font-medium text-ink-secondary mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="setup-confirm"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
              />
            </div>

            {setupError && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-400/40 p-3 text-xs text-red-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{setupError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={setupSubmitting}
              className="tap-feedback w-full py-3.5 px-5 rounded-xl bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {setupSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Securing Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Create Admin Account</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (bootState === 'login') {
    return (
      <div className="min-h-screen bg-canvas text-white flex items-center justify-center px-4 py-10 hero-ambient">
        <div className="max-w-md w-full rounded-2xl bg-surface border border-hairline-strong p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 mb-6 pb-5 border-b border-hairline">
            <div className="inline-flex items-center gap-2.5">
              <BrandMark size="sm" />
              <span className="font-display text-lg font-bold text-white">
                AizerTech GH
              </span>
            </div>
            <button
              type="button"
              onClick={onBackToSite}
              className="text-xs text-ink-muted hover:text-white cursor-pointer"
            >
              View Site
            </button>
          </div>

          <div className="flex items-center gap-2 text-neon text-xs font-medium mb-2">
            <Lock className="w-4 h-4" />
            <span>Permanent Admin Portal</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Admin Login
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in with your AizerTech GH username and password to manage
            client inquiries and pricing.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium text-ink-secondary mb-1.5"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                required
                autoComplete="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-ink-secondary mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
              />
            </div>

            <label className="flex items-center gap-2.5 text-sm text-ink-secondary cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="w-4 h-4 rounded accent-[#00FF88] cursor-pointer"
              />
              <span>Stay Logged In</span>
            </label>

            {loginError && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-400/40 p-3 text-xs text-red-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginSubmitting}
              className="tap-feedback w-full py-3.5 px-5 rounded-xl bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover disabled:opacity-60 inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {loginSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Enter Admin</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-canvas text-white">
      <header className="sticky top-0 z-40 header-blur border-b border-hairline">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size="sm" />
            <h1 className="font-display text-base sm:text-lg font-bold text-white truncate">
              AizerTech Admin - Inbox
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onBackToSite}
              className="tap-feedback hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-hairline-strong text-xs font-medium text-ink-secondary hover:text-white hover:border-neon/50 cursor-pointer whitespace-nowrap"
            >
              <span>View Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="tap-feedback inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-hairline-strong text-xs font-semibold text-white hover:border-red-400/60 hover:text-red-300 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 space-y-8">
        {/* Dashboard Section Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-surface border border-hairline">
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`tap-feedback inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap ${
                activeTab === 'inbox'
                  ? 'bg-neon text-neon-ink'
                  : 'text-ink-muted hover:text-white'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Client Inbox</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`tap-feedback inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-neon text-neon-ink'
                  : 'text-ink-muted hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Site Settings</span>
            </button>
          </div>

          <p className="text-xs text-ink-muted">
            Signed in as <span className="text-white font-medium">{adminRecord?.username}</span>
          </p>
        </div>

        {activeTab === 'inbox' ? (
          <div className="space-y-6">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-surface border border-hairline p-5">
                <p className="text-xs text-ink-muted">Total Messages</p>
                <p className="mt-2 font-mono-tabular text-3xl font-bold text-white">
                  {counts.total}
                </p>
              </div>
              <div className="rounded-2xl bg-surface border border-amber-400/25 p-5">
                <p className="text-xs text-amber-300">New Messages</p>
                <p className="mt-2 font-mono-tabular text-3xl font-bold text-amber-300">
                  {counts.newCount}
                </p>
              </div>
              <div className="rounded-2xl bg-surface border border-sky-400/25 p-5">
                <p className="text-xs text-sky-300">Replied</p>
                <p className="mt-2 font-mono-tabular text-3xl font-bold text-sky-300">
                  {counts.repliedCount}
                </p>
              </div>
              <div className="rounded-2xl bg-surface border border-neon/25 p-5">
                <p className="text-xs text-neon">Done</p>
                <p className="mt-2 font-mono-tabular text-3xl font-bold text-neon">
                  {counts.doneCount}
                </p>
              </div>
            </div>

            {/* Search & Status Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-ink-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-hairline-strong text-sm text-white placeholder:text-ink-subtle focus:outline-none focus:border-neon"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-hairline overflow-x-auto">
                {(['all', 'new', 'replied', 'done'] as const).map((tab) => {
                  const label =
                    tab === 'all'
                      ? 'All'
                      : tab === 'new'
                      ? 'New'
                      : tab === 'replied'
                      ? 'Replied'
                      : 'Done';
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`tap-feedback px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                        statusFilter === tab
                          ? 'bg-neon text-neon-ink'
                          : 'text-ink-muted hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {actionFeedback && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-400/40 p-3.5 text-sm text-red-200 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{actionFeedback}</span>
              </div>
            )}

            {messagesError && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-400/40 p-4 text-sm text-red-200 flex items-center gap-2.5"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{messagesError}</span>
              </div>
            )}

            {/* Real-Time Message List */}
            {messagesLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((skeleton) => (
                  <div
                    key={skeleton}
                    className="h-40 rounded-2xl bg-surface border border-hairline animate-pulse"
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl bg-surface border border-hairline p-10 sm:p-14 text-center">
                <Inbox className="w-10 h-10 text-neon mx-auto mb-3" />
                <p className="font-display text-lg font-semibold text-white">
                  No client messages yet. Share your link to get messages.
                </p>
                <p className="mt-2 text-sm text-ink-muted max-w-md mx-auto">
                  New inquiries submitted on the AizerTech GH website will appear
                  here automatically in real time.
                </p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="rounded-2xl bg-surface border border-hairline p-10 text-center space-y-4">
                <p className="text-sm text-ink-muted">
                  No messages match your current search or filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="tap-feedback px-4 py-2 rounded-lg bg-neon text-neon-ink text-xs font-semibold cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMessages.map((msg) => {
                  const statusInfo = buildStatusLabel(msg.status);
                  const clientDigits = normalizePhoneForWhatsApp(msg.phone);
                  const waHref = clientDigits
                    ? `https://wa.me/${clientDigits}?text=${encodeURIComponent(
                        `Hello ${msg.name}, this is AizerTech GH regarding your ${msg.service} project inquiry.`
                      )}`
                    : '';
                  const mailSubject = encodeURIComponent(
                    `Re: Your AizerTech GH ${msg.service} Inquiry`
                  );
                  const mailBody = encodeURIComponent(
                    `Hello ${msg.name},\n\nThis is AizerTech GH following up on your ${msg.service} inquiry (${msg.budget}).\n\nBest regards,\nSablaizer\nAizerTech GH`
                  );
                  const mailHref = `mailto:${msg.email}?subject=${mailSubject}&body=${mailBody}`;
                  const isBusy = busyMessageId === msg.id;

                  return (
                    <article
                      key={msg.id}
                      className="rounded-2xl bg-surface border border-hairline p-5 sm:p-6 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="font-display text-lg sm:text-xl font-semibold text-white">
                              {msg.name}
                            </h2>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-medium ${statusInfo.classes}`}
                            >
                              {statusInfo.icon}
                              <span>{statusInfo.label}</span>
                            </span>
                          </div>

                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-ink-muted">
                            <span className="font-mono-tabular text-white">
                              {msg.phone}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{msg.email}</span>
                          </div>
                        </div>

                        <div className="text-left sm:text-right shrink-0">
                          <p className="font-mono-tabular text-xs text-ink-subtle">
                            {formatMessageTimestamp(msg.createdAt)}
                          </p>
                          <p className="mt-1 text-xs font-medium text-neon">
                            {msg.service} · {msg.budget}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl bg-field border border-hairline p-4 text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap break-words">
                        {msg.message}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        {waHref ? (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tap-feedback inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-neon text-neon-ink text-xs font-semibold hover:bg-neon-hover whitespace-nowrap"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Reply on WhatsApp</span>
                          </a>
                        ) : null}

                        <a
                          href={mailHref}
                          className="tap-feedback inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-elevated border border-hairline-strong text-xs font-semibold text-white hover:border-neon/60 whitespace-nowrap"
                        >
                          <Mail className="w-3.5 h-3.5 text-neon" />
                          <span>Reply via Email</span>
                        </a>

                        {msg.status !== 'replied' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleUpdateStatus(msg.id, 'replied')}
                            className="tap-feedback inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-field border border-hairline-strong text-xs font-medium text-sky-300 hover:border-sky-400/60 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark as Replied</span>
                          </button>
                        )}

                        {msg.status !== 'done' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleUpdateStatus(msg.id, 'done')}
                            className="tap-feedback inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-field border border-hairline-strong text-xs font-medium text-neon hover:border-neon/60 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Done</span>
                          </button>
                        )}

                        {confirmDeleteId === msg.id ? (
                          <div className="inline-flex items-center gap-2 ml-auto">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDeleteMessage(msg.id)}
                              className="tap-feedback px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 cursor-pointer whitespace-nowrap"
                            >
                              {isBusy ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="tap-feedback px-3 py-2 rounded-lg border border-hairline-strong text-xs text-ink-muted hover:text-white cursor-pointer whitespace-nowrap"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteId(msg.id)}
                            className="tap-feedback ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-hairline text-xs font-medium text-ink-muted hover:text-red-300 hover:border-red-400/50 cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Settings Tab */
          <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
            <div className="rounded-2xl bg-surface border border-hairline p-6 sm:p-7 space-y-4">
              <div>
                <h2 className="font-display text-xl font-semibold text-white">
                  Studio WhatsApp Number
                </h2>
                <p className="text-sm text-ink-muted mt-1">
                  Updates the WhatsApp chat links across your public AizerTech GH
                  website automatically.
                </p>
              </div>

              <div className="max-w-sm">
                <label
                  htmlFor="settings-whatsapp"
                  className="block text-xs font-medium text-ink-secondary mb-1.5"
                >
                  WhatsApp Number (Ghana / International)
                </label>
                <input
                  id="settings-whatsapp"
                  type="tel"
                  required
                  value={editWhatsApp}
                  onChange={(e) => setEditWhatsApp(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-field border border-hairline-strong text-sm text-white focus:outline-none focus:border-neon"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-surface border border-hairline p-6 sm:p-7 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">
                    Services &amp; Starting Prices (GHS)
                  </h2>
                  <p className="text-sm text-ink-muted mt-1">
                    Edit your services, GHS starting rates, and descriptions.
                    Changes reflect on the main site immediately.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddService}
                  disabled={editServices.length >= 12}
                  className="tap-feedback inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neon/40 text-xs font-semibold text-neon hover:bg-neon/10 disabled:opacity-50 cursor-pointer whitespace-nowrap self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Service</span>
                </button>
              </div>

              <div className="space-y-4">
                {editServices.map((service, index) => (
                  <div
                    key={service.id}
                    className="rounded-xl bg-field border border-hairline p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono-tabular text-xs font-semibold text-neon">
                        Service {String(index + 1).padStart(2, '0')} · Current:{' '}
                        {formatGhs(service.priceGhs)}
                      </span>
                      {editServices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveService(index)}
                          className="text-xs text-ink-muted hover:text-red-300 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs text-ink-muted mb-1">
                          Service Name
                        </label>
                        <input
                          type="text"
                          required
                          value={service.title}
                          onChange={(e) =>
                            handleServiceFieldChange(index, 'title', e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-hairline-strong text-sm text-white focus:outline-none focus:border-neon"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-ink-muted mb-1">
                          Starting Price (GHS)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={1000000}
                          required
                          value={service.priceGhs}
                          onChange={(e) =>
                            handleServiceFieldChange(
                              index,
                              'priceGhs',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-hairline-strong text-sm font-mono-tabular text-white focus:outline-none focus:border-neon"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-ink-muted mb-1">
                          Contact Dropdown Map
                        </label>
                        <select
                          value={service.contactService}
                          onChange={(e) =>
                            handleServiceFieldChange(
                              index,
                              'contactService',
                              e.target.value as ServiceOption
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-hairline-strong text-sm text-white focus:outline-none focus:border-neon"
                        >
                          {CONTACT_SERVICE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-ink-muted mb-1">
                        Short Description
                      </label>
                      <textarea
                        rows={2}
                        value={service.description}
                        onChange={(e) =>
                          handleServiceFieldChange(
                            index,
                            'description',
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-hairline-strong text-sm text-white focus:outline-none focus:border-neon resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {settingsNotice.type === 'success' && (
              <div
                role="status"
                className="rounded-xl bg-neon/10 border border-neon/40 p-4 flex items-center gap-3 text-sm text-white"
              >
                <CheckCircle2 className="w-5 h-5 text-neon shrink-0" />
                <span>{settingsNotice.text}</span>
              </div>
            )}

            {settingsNotice.type === 'error' && (
              <div
                role="alert"
                className="rounded-xl bg-red-500/10 border border-red-400/40 p-4 flex items-center gap-3 text-sm text-red-200"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{settingsNotice.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={settingsSaving}
              className="tap-feedback inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover disabled:opacity-60 cursor-pointer"
            >
              {settingsSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
