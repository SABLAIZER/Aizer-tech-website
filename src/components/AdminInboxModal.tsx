import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  addDoc,
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
  Calendar,
  Check,
  Crown,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  MailCheck,
  MessageCircle,
  MessageSquare,
  Receipt,
  RefreshCw,
  Settings,
  Star,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  auth,
  changeAdminPassword,
  clearGmailAccessToken,
  db,
  emailPasswordSignIn,
  getGmailAccessToken,
  GmailTokenExpiredError,
  googleSignInBasic,
  googleSignInWithGmail,
  handleFirestoreError,
  OperationType,
  reloadAdminUser,
  sendAdminVerificationEmail,
  sendGmailReply,
  signOutAdmin,
} from '../firebase';
import {
  ADMIN_EMAIL,
  BookingRecord,
  BookingStatus,
  ChatThreadRecord,
  ContactMessageRecord,
  InvoiceRecord,
  InvoiceStatus,
  isAllowedAdminEmail,
  MessageStatus,
  normalizeWebsiteCms,
  RegisteredUserRecord,
  StudioProjectRecord,
  StudioSettings,
  TestimonialRecord,
  VisitRecord,
  WebsiteBackupRecord,
  WebsiteCmsData,
} from '../types';
import { AdminBookingsView } from './admin/AdminBookingsView';
import { AdminClientsView } from './admin/AdminClientsView';
import { AdminDashboardHome } from './admin/AdminDashboardHome';
import { AdminInvoicesView, InvoiceDraftSeed } from './admin/AdminInvoicesView';
import { AdminLoginCard } from './admin/AdminLoginCard';
import { AdminMessagesView } from './admin/AdminMessagesView';
import { AdminProjectsView } from './admin/AdminProjectsView';
import { AdminRegisteredUsersView } from './admin/AdminRegisteredUsersView';
import { AdminSettingsView } from './admin/AdminSettingsView';
import { AdminTestimonialsView } from './admin/AdminTestimonialsView';
import { AdminWebsiteControlView } from './admin/AdminWebsiteControlView';
import {
  buildClientWhatsAppHref,
  deriveClientsFromMessages,
  getInitial,
  getTimestampMs,
  normalizePhoneKey,
} from './admin/adminUtils';

interface AdminInboxModalProps {
  open: boolean;
  fullPage?: boolean;
  liveCms: WebsiteCmsData;
  studioSettings: StudioSettings;
  onClose: () => void;
}

type AdminSection =
  | 'dashboard'
  | 'messages'
  | 'invoices'
  | 'bookings'
  | 'testimonials'
  | 'website'
  | 'users'
  | 'clients'
  | 'projects'
  | 'settings';

function normalizeStatus(raw: unknown): MessageStatus {
  const val = String(raw || 'new').toLowerCase();
  if (
    val === 'new' ||
    val === 'talking' ||
    val === 'quoted' ||
    val === 'paid' ||
    val === 'done' ||
    val === 'lost' ||
    val === 'reviewed' ||
    val === 'replied' ||
    val === 'archived'
  ) {
    return val;
  }
  return 'new';
}

export const AdminInboxModal: React.FC<AdminInboxModalProps> = ({
  open,
  liveCms,
  studioSettings,
  onClose,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [hasGmailToken, setHasGmailToken] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [checkingVerify, setCheckingVerify] = useState(false);

  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);

  // Website Control CMS streams (aizertech_draft, aizertech_live check, aizertech_backup)
  const [draftCms, setDraftCms] = useState<WebsiteCmsData | null>(null);
  const [hasLiveDoc, setHasLiveDoc] = useState(false);
  const [backups, setBackups] = useState<WebsiteBackupRecord[]>([]);

  // Dual real-time Firestore streams (aizertech_messages + contactMessages)
  const [aizerMessages, setAizerMessages] = useState<ContactMessageRecord[]>([]);
  const [legacyMessages, setLegacyMessages] = useState<ContactMessageRecord[]>([]);
  const [loadingAizer, setLoadingAizer] = useState(false);
  const [loadingLegacy, setLoadingLegacy] = useState(false);

  // Real-time studioProjects stream
  const [projects, setProjects] = useState<StudioProjectRecord[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Real-time Invoices, Bookings, and Testimonials streams
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);

  // Real-time Registered Users, Visits Analytics & Live Chats
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [chatThreads, setChatThreads] = useState<ChatThreadRecord[]>([]);

  // Cross-view controls & modals
  const [messageSearchSeed, setMessageSearchSeed] = useState('');
  const [invoiceSeedDraft, setInvoiceSeedDraft] = useState<InvoiceDraftSeed | null>(null);
  const [selectedModalMessage, setSelectedModalMessage] =
    useState<ContactMessageRecord | null>(null);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  // New project form state
  const [projTitle, setProjTitle] = useState('');
  const [projClientName, setProjClientName] = useState('');
  const [projClientPhone, setProjClientPhone] = useState('');
  const [projService, setProjService] = useState('Business Website');
  const [projAmount, setProjAmount] = useState('600');
  const [projStatus, setProjStatus] = useState<'in_progress' | 'done'>('in_progress');
  const [projNotes, setProjNotes] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projError, setProjError] = useState<string | null>(null);

  // Broadcast WhatsApp composer
  const [broadcastText, setBroadcastText] = useState(
    'Hello from Aizer Tech! We have open build slots this week for high-converting websites and mobile apps. Reply here if you would like to get started.'
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setHasGmailToken(Boolean(getGmailAccessToken()));
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isAdminEmailMatch = Boolean(user && isAllowedAdminEmail(user.email));
  const isAuthorizedAdmin = Boolean(
    user && isAdminEmailMatch && user.emailVerified
  );

  // Subscribe to messages, studioProjects, invoices, bookings, testimonials & CMS
  useEffect(() => {
    if (!open || !authReady || !isAuthorizedAdmin) {
      setAizerMessages([]);
      setLegacyMessages([]);
      setProjects([]);
      setInvoices([]);
      setBookings([]);
      setTestimonials([]);
      setRegisteredUsers([]);
      setVisits([]);
      setChatThreads([]);
      return;
    }

    setLoadingAizer(true);
    setLoadingLegacy(true);
    setLoadingProjects(true);
    setLoadingInvoices(true);
    setLoadingBookings(true);
    setLoadingTestimonials(true);
    setLoadingUsers(true);
    setLoadingVisits(true);

    const aizerQuery = query(
      collection(db, 'aizertech_messages'),
      orderBy('createdAt', 'desc')
    );
    const unsubAizer = onSnapshot(
      aizerQuery,
      (snapshot) => {
        const rows: ContactMessageRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            sourceCollection: 'aizertech_messages',
            senderName: String(d.name || d.senderName || 'Client'),
            senderEmail: String(d.email || d.senderEmail || ''),
            senderPhone: String(d.phone || d.senderPhone || ''),
            serviceType: String(d.service || d.serviceType || 'Project Inquiry'),
            budgetTier: String(d.budget || d.budgetTier || 'Custom'),
            message: String(d.message || ''),
            status: normalizeStatus(d.status),
            adminNote: typeof d.adminNote === 'string' ? d.adminNote : '',
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          };
        });
        setAizerMessages(rows);
        setLoadingAizer(false);
      },
      (error) => {
        setLoadingAizer(false);
        handleFirestoreError(error, OperationType.LIST, 'aizertech_messages');
      }
    );

    const legacyQuery = query(
      collection(db, 'contactMessages'),
      orderBy('createdAt', 'desc')
    );
    const unsubLegacy = onSnapshot(
      legacyQuery,
      (snapshot) => {
        const rows: ContactMessageRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            sourceCollection: 'contactMessages',
            senderName: String(d.senderName || d.name || 'Client'),
            senderEmail: String(d.senderEmail || d.email || ''),
            senderPhone: String(d.senderPhone || d.phone || ''),
            serviceType: String(d.serviceType || d.service || 'Project Inquiry'),
            budgetTier: String(d.budgetTier || d.budget || 'Custom'),
            message: String(d.message || ''),
            status: normalizeStatus(d.status),
            adminNote: typeof d.adminNote === 'string' ? d.adminNote : '',
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          };
        });
        setLegacyMessages(rows);
        setLoadingLegacy(false);
      },
      (error) => {
        setLoadingLegacy(false);
        handleFirestoreError(error, OperationType.LIST, 'contactMessages');
      }
    );

    const projectsQuery = query(
      collection(db, 'studioProjects'),
      orderBy('createdAt', 'desc')
    );
    const unsubProjects = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const rows: StudioProjectRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: String(d.title || 'Untitled Project'),
            clientName: String(d.clientName || ''),
            clientPhone: String(d.clientPhone || ''),
            serviceType: String(d.serviceType || 'Website'),
            amountGhs: Number(d.amountGhs) || 0,
            status: d.status === 'done' ? 'done' : 'in_progress',
            notes: String(d.notes || ''),
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          };
        });
        setProjects(rows);
        setLoadingProjects(false);
      },
      (error) => {
        setLoadingProjects(false);
        handleFirestoreError(error, OperationType.LIST, 'studioProjects');
      }
    );

    const invoicesQuery = query(
      collection(db, 'aizertech_invoices'),
      orderBy('createdAt', 'desc')
    );
    const unsubInvoices = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        const rows: InvoiceRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            invoiceNumber: String(d.invoiceNumber || 'AT-001'),
            clientName: String(d.clientName || 'Client'),
            clientPhone: String(d.clientPhone || ''),
            clientEmail: String(d.clientEmail || ''),
            service: String(d.service || 'Project Service'),
            amountGhs: Number(d.amountGhs) || 0,
            description: String(d.description || ''),
            invoiceDate: String(d.invoiceDate || ''),
            status: d.status === 'paid' ? 'paid' : 'unpaid',
            sourceMessageId: String(d.sourceMessageId || ''),
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          };
        });
        setInvoices(rows);
        setLoadingInvoices(false);
      },
      (error) => {
        setLoadingInvoices(false);
        handleFirestoreError(error, OperationType.LIST, 'aizertech_invoices');
      }
    );

    const bookingsQuery = query(
      collection(db, 'aizertech_bookings'),
      orderBy('createdAt', 'desc')
    );
    const unsubBookings = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const rows: BookingRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const st = String(d.status || 'pending');
          const status: BookingStatus =
            st === 'confirmed' || st === 'done' || st === 'cancelled'
              ? st
              : 'pending';
          return {
            id: docSnap.id,
            clientName: String(d.clientName || 'Client'),
            clientPhone: String(d.clientPhone || ''),
            preferredDate: String(d.preferredDate || ''),
            preferredTime: String(d.preferredTime || ''),
            service: String(d.service || 'Consultation'),
            status,
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          };
        });
        setBookings(rows);
        setLoadingBookings(false);
      },
      (error) => {
        setLoadingBookings(false);
        handleFirestoreError(error, OperationType.LIST, 'aizertech_bookings');
      }
    );

    const testimonialsQuery = query(
      collection(db, 'aizertech_testimonials'),
      orderBy('createdAt', 'desc')
    );
    const unsubTestimonials = onSnapshot(
      testimonialsQuery,
      (snapshot) => {
        const rows: TestimonialRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            clientName: String(d.clientName || 'Client'),
            service: String(d.service || 'Project'),
            rating: Number(d.rating) || 5,
            message: String(d.message || ''),
            photoUrl: String(d.photoUrl || ''),
            approved: Boolean(d.approved),
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          };
        });
        setTestimonials(rows);
        setLoadingTestimonials(false);
      },
      (error) => {
        setLoadingTestimonials(false);
        handleFirestoreError(error, OperationType.LIST, 'aizertech_testimonials');
      }
    );

    const unsubDraft = onSnapshot(
      doc(db, 'aizertech_draft', 'website'),
      (snap) => {
        if (snap.exists()) {
          setDraftCms(normalizeWebsiteCms(snap.data()));
        } else {
          setDraftCms(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'aizertech_draft/website');
      }
    );

    const unsubLiveCheck = onSnapshot(
      doc(db, 'aizertech_live', 'website'),
      (snap) => {
        setHasLiveDoc(snap.exists());
      },
      () => {
        setHasLiveDoc(false);
      }
    );

    const backupQuery = query(
      collection(db, 'aizertech_backup'),
      orderBy('backedUpAt', 'desc')
    );
    const unsubBackups = onSnapshot(
      backupQuery,
      (snap) => {
        const rows: WebsiteBackupRecord[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            label: String(d.label || 'Backup Snapshot'),
            snapshot: normalizeWebsiteCms(d.snapshot),
            backedUpAt: d.backedUpAt || null,
          };
        });
        setBackups(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'aizertech_backup');
      }
    );

    const usersQuery = query(
      collection(db, 'aizertech_users'),
      orderBy('firstLoginAt', 'desc')
    );
    const unsubUsers = onSnapshot(
      usersQuery,
      (snap) => {
        const rows: RegisteredUserRecord[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            uid: String(d.uid || docSnap.id),
            name: String(d.name || 'Client'),
            email: String(d.email || ''),
            photoUrl: String(d.photoUrl || ''),
            phone: String(d.phone || ''),
            phonePrompted: Boolean(d.phonePrompted),
            firstLoginAt: d.firstLoginAt || null,
            lastActiveAt: d.lastActiveAt || null,
            totalRequests: Number(d.totalRequests) || 0,
          };
        });
        setRegisteredUsers(rows);
        setLoadingUsers(false);
      },
      (error) => {
        setLoadingUsers(false);
        handleFirestoreError(error, OperationType.LIST, 'aizertech_users');
      }
    );

    const visitsQuery = query(
      collection(db, 'aizertech_visits'),
      orderBy('createdAt', 'desc')
    );
    const unsubVisits = onSnapshot(
      visitsQuery,
      (snap) => {
        const rows: VisitRecord[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            dateKey: String(d.dateKey || ''),
            timeLabel: String(d.timeLabel || ''),
            pageVisited: String(d.pageVisited || 'Home'),
            device: d.device === 'Mobile' ? 'Mobile' : 'Desktop',
            country: String(d.country || 'Unknown'),
            visitorKey: String(d.visitorKey || ''),
            createdAt: d.createdAt || null,
          };
        });
        setVisits(rows);
        setLoadingVisits(false);
      },
      (error) => {
        setLoadingVisits(false);
        handleFirestoreError(error, OperationType.LIST, 'aizertech_visits');
      }
    );

    const chatsQuery = query(
      collection(db, 'aizertech_chats'),
      orderBy('updatedAt', 'desc')
    );
    const unsubChats = onSnapshot(
      chatsQuery,
      (snap) => {
        const rows: ChatThreadRecord[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            userId: String(d.userId || docSnap.id),
            userName: String(d.userName || 'Client'),
            userEmail: String(d.userEmail || ''),
            userPhoto: String(d.userPhoto || ''),
            userPhone: String(d.userPhone || ''),
            lastMessage: String(d.lastMessage || ''),
            lastSenderRole: d.lastSenderRole === 'admin' ? 'admin' : 'client',
            unreadByAdmin: Number(d.unreadByAdmin) || 0,
            unreadByClient: Number(d.unreadByClient) || 0,
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          };
        });
        setChatThreads(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'aizertech_chats');
      }
    );

    return () => {
      unsubAizer();
      unsubLegacy();
      unsubProjects();
      unsubInvoices();
      unsubBookings();
      unsubTestimonials();
      unsubDraft();
      unsubLiveCheck();
      unsubBackups();
      unsubUsers();
      unsubVisits();
      unsubChats();
    };
  }, [open, authReady, isAuthorizedAdmin]);

  const allMessages = useMemo(() => {
    return [...aizerMessages, ...legacyMessages].sort(
      (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
    );
  }, [aizerMessages, legacyMessages]);

  const unreadLiveChatCount = useMemo(
    () => chatThreads.reduce((sum, t) => sum + (t.unreadByAdmin || 0), 0),
    [chatThreads]
  );

  const unreadCount = useMemo(
    () =>
      allMessages.filter((m) => m.status === 'new').length + unreadLiveChatCount,
    [allMessages, unreadLiveChatCount]
  );

  const unpaidInvoicesCount = useMemo(
    () => invoices.filter((inv) => inv.status === 'unpaid').length,
    [invoices]
  );

  const pendingBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === 'pending').length,
    [bookings]
  );

  const clientsWithPhones = useMemo(() => {
    return deriveClientsFromMessages(allMessages).filter(
      (c) => normalizePhoneKey(c.phone).length >= 7
    );
  }, [allMessages]);

  const formatAuthError = (error: unknown): string => {
    const raw =
      error instanceof Error
        ? error.message
        : String(error || 'Authentication failed.');
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';

    if (
      code === 'auth/unauthorized-domain' ||
      raw.includes('auth/unauthorized-domain')
    ) {
      const host =
        typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return `Domain "${host}" is not authorized yet. Add it in Firebase Console → Authentication → Settings → Authorized domains.`;
    }
    if (
      code === 'auth/operation-not-allowed' ||
      raw.includes('auth/operation-not-allowed')
    ) {
      return 'Email/Password sign-in is not enabled yet in Firebase Console. Enable Email/Password under Authentication → Sign-in method, or use Continue with Google below.';
    }
    if (
      code === 'auth/invalid-credential' ||
      code === 'auth/wrong-password' ||
      code === 'auth/user-not-found'
    ) {
      return 'Invalid admin username/email or password. Check your Firebase Auth credentials or sign in with Google below.';
    }
    if (code === 'auth/popup-blocked' || raw.includes('auth/popup-blocked')) {
      return 'Pop-up was blocked by Safari/browser. Allow pop-ups for this site and tap Continue with Google again.';
    }
    return raw;
  };

  const handleEmailPasswordLogin = async (
    usernameOrEmail: string,
    password: string
  ) => {
    setAuthError(null);
    try {
      const signed = await emailPasswordSignIn(
        usernameOrEmail,
        password,
        stayLoggedIn
      );
      setUser(signed);
    } catch (error) {
      setAuthError(formatAuthError(error));
    }
  };

  const handleGoogleLogin = async (withGmailScope: boolean) => {
    setAuthError(null);
    try {
      if (withGmailScope) {
        const res = await googleSignInWithGmail(stayLoggedIn);
        setUser(res.user);
        setHasGmailToken(Boolean(res.accessToken));
      } else {
        const signed = await googleSignInBasic(stayLoggedIn);
        setUser(signed);
        setHasGmailToken(false);
      }
    } catch (error) {
      setAuthError(formatAuthError(error));
    }
  };

  const handleSignOut = async () => {
    setSelectedModalMessage(null);
    setNewProjectModalOpen(false);
    setBroadcastModalOpen(false);
    setHasGmailToken(false);
    await signOutAdmin();
  };

  const handleCopyAdminLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/admin`);
      setCopiedAdminLink(true);
      window.setTimeout(() => setCopiedAdminLink(false), 2400);
    } catch {
      // Ignore
    }
  };

  const handleUpdateMessageStatus = async (
    msg: ContactMessageRecord,
    nextStatus: MessageStatus
  ) => {
    const path = `${msg.sourceCollection}/${msg.id}`;
    try {
      await updateDoc(doc(db, msg.sourceCollection, msg.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleSaveAdminNote = async (
    msg: ContactMessageRecord,
    note: string
  ) => {
    const path = `${msg.sourceCollection}/${msg.id}`;
    const trimmed = note.trim().slice(0, 1500);
    try {
      await updateDoc(doc(db, msg.sourceCollection, msg.id), {
        adminNote: trimmed,
        updatedAt: serverTimestamp(),
      });
      if (selectedModalMessage?.id === msg.id) {
        setSelectedModalMessage((prev) =>
          prev ? { ...prev, adminNote: trimmed } : prev
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteMessage = async (msg: ContactMessageRecord) => {
    const path = `${msg.sourceCollection}/${msg.id}`;
    try {
      await deleteDoc(doc(db, msg.sourceCollection, msg.id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleSendAdminChatReply = async (
    thread: ChatThreadRecord,
    text: string
  ) => {
    if (!user) return;
    const clean = text.trim().slice(0, 2000);
    if (!clean) return;
    try {
      await updateDoc(doc(db, 'aizertech_chats', thread.userId), {
        userName: thread.userName,
        userEmail: thread.userEmail,
        userPhoto: thread.userPhoto,
        userPhone: thread.userPhone,
        lastMessage: clean.slice(0, 500),
        lastSenderRole: 'admin',
        unreadByAdmin: 0,
        unreadByClient: Math.min(999, (thread.unreadByClient || 0) + 1),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'aizertech_chats', thread.userId, 'messages'), {
        senderId: user.uid,
        senderName: 'Sablaizer (CEO)',
        senderRole: 'admin',
        text: clean,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `aizertech_chats/${thread.userId}/messages`
      );
    }
  };

  const handleMarkChatReadByAdmin = async (userId: string) => {
    const thread = chatThreads.find((t) => t.userId === userId);
    if (!thread) return;
    try {
      await updateDoc(doc(db, 'aizertech_chats', userId), {
        userName: thread.userName,
        userEmail: thread.userEmail,
        userPhoto: thread.userPhoto,
        userPhone: thread.userPhone,
        lastMessage: thread.lastMessage,
        lastSenderRole: thread.lastSenderRole,
        unreadByAdmin: 0,
        unreadByClient: thread.unreadByClient || 0,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Ignore transient mark-read failures
    }
  };

  const handleCreateInvoice = async (payload: {
    invoiceNumber: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    service: string;
    amountGhs: number;
    description: string;
    invoiceDate: string;
    status: InvoiceStatus;
    sourceMessageId: string;
  }) => {
    try {
      await addDoc(collection(db, 'aizertech_invoices'), {
        ...payload,
        clientEmail: payload.clientEmail.trim().toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'aizertech_invoices');
      throw error;
    }
  };

  const handleToggleInvoiceStatus = async (invoice: InvoiceRecord) => {
    const nextStatus: InvoiceStatus =
      invoice.status === 'paid' ? 'unpaid' : 'paid';
    const path = `aizertech_invoices/${invoice.id}`;
    try {
      await updateDoc(doc(db, 'aizertech_invoices', invoice.id), {
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientPhone: invoice.clientPhone,
        clientEmail: invoice.clientEmail,
        service: invoice.service,
        amountGhs: invoice.amountGhs,
        description: invoice.description,
        invoiceDate: invoice.invoiceDate,
        sourceMessageId: invoice.sourceMessageId,
        status: nextStatus,
        createdAt: invoice.createdAt,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const path = `aizertech_invoices/${invoiceId}`;
    try {
      await deleteDoc(doc(db, 'aizertech_invoices', invoiceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleUpdateBookingStatus = async (
    booking: BookingRecord,
    nextStatus: BookingStatus
  ) => {
    const path = `aizertech_bookings/${booking.id}`;
    try {
      await updateDoc(doc(db, 'aizertech_bookings', booking.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const path = `aizertech_bookings/${bookingId}`;
    try {
      await deleteDoc(doc(db, 'aizertech_bookings', bookingId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleAddTestimonial = async (payload: {
    clientName: string;
    service: string;
    rating: number;
    message: string;
    photoUrl: string;
    approved: boolean;
  }) => {
    try {
      await addDoc(collection(db, 'aizertech_testimonials'), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'aizertech_testimonials');
      throw error;
    }
  };

  const handleToggleApproveTestimonial = async (
    testimonial: TestimonialRecord
  ) => {
    const path = `aizertech_testimonials/${testimonial.id}`;
    try {
      await updateDoc(doc(db, 'aizertech_testimonials', testimonial.id), {
        clientName: testimonial.clientName,
        service: testimonial.service,
        rating: testimonial.rating,
        message: testimonial.message,
        photoUrl: testimonial.photoUrl,
        approved: !testimonial.approved,
        createdAt: testimonial.createdAt,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteTestimonial = async (testimonialId: string) => {
    const path = `aizertech_testimonials/${testimonialId}`;
    try {
      await deleteDoc(doc(db, 'aizertech_testimonials', testimonialId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleSendGmail = async (
    msg: ContactMessageRecord,
    subject: string,
    body: string
  ) => {
    let token = getGmailAccessToken();
    if (!token) {
      const res = await googleSignInWithGmail(stayLoggedIn);
      setUser(res.user);
      token = res.accessToken;
      setHasGmailToken(Boolean(token));

      if (!isAllowedAdminEmail(res.user.email) || !res.user.emailVerified) {
        throw new Error(`Authorize with ${ADMIN_EMAIL} to send Gmail replies.`);
      }
    }

    if (!token) {
      throw new Error(
        'Gmail send permission was not granted. Please authorize Gmail access on the Google popup.'
      );
    }

    try {
      await sendGmailReply({
        accessToken: token,
        to: msg.senderEmail,
        subject,
        body,
      });
    } catch (err) {
      if (err instanceof GmailTokenExpiredError) {
        clearGmailAccessToken();
        setHasGmailToken(false);
        const refreshed = await googleSignInWithGmail(stayLoggedIn);
        setUser(refreshed.user);
        setHasGmailToken(Boolean(refreshed.accessToken));
        if (!refreshed.accessToken) throw err;
        await sendGmailReply({
          accessToken: refreshed.accessToken,
          to: msg.senderEmail,
          subject,
          body,
        });
      } else {
        throw err;
      }
    }

    if (msg.status !== 'replied') {
      await handleUpdateMessageStatus(msg, 'replied');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setProjError(null);

    const title = projTitle.trim();
    const clientName = projClientName.trim();
    const clientPhone = projClientPhone.trim();
    const serviceType = projService.trim();
    const amountGhs = Number(projAmount);

    if (title.length < 2) {
      setProjError('Please enter a project title.');
      return;
    }
    if (clientName.length < 2) {
      setProjError('Please enter the client name.');
      return;
    }
    if (!Number.isFinite(amountGhs) || amountGhs < 0) {
      setProjError('Please enter a valid GHS price.');
      return;
    }

    setCreatingProject(true);
    try {
      await addDoc(collection(db, 'studioProjects'), {
        title: title.slice(0, 120),
        clientName: clientName.slice(0, 100),
        clientPhone: clientPhone.slice(0, 30),
        serviceType: serviceType.slice(0, 80),
        amountGhs,
        status: projStatus,
        notes: projNotes.trim().slice(0, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setProjTitle('');
      setProjClientName('');
      setProjClientPhone('');
      setProjAmount('600');
      setProjStatus('in_progress');
      setProjNotes('');
      setNewProjectModalOpen(false);
      setActiveSection('projects');
    } catch (error) {
      setProjError(
        error instanceof Error ? error.message : 'Unable to save project.'
      );
    } finally {
      setCreatingProject(false);
    }
  };

  const handleToggleProjectStatus = async (project: StudioProjectRecord) => {
    const nextStatus = project.status === 'done' ? 'in_progress' : 'done';
    const path = `studioProjects/${project.id}`;
    try {
      await updateDoc(doc(db, 'studioProjects', project.id), {
        title: project.title,
        clientName: project.clientName,
        clientPhone: project.clientPhone,
        serviceType: project.serviceType,
        amountGhs: project.amountGhs,
        notes: project.notes,
        status: nextStatus,
        createdAt: project.createdAt,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const path = `studioProjects/${projectId}`;
    try {
      await deleteDoc(doc(db, 'studioProjects', projectId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleSaveSettings = async (next: StudioSettings) => {
    try {
      await setDoc(doc(db, 'studioSettings', 'public'), {
        heroHeadline: next.heroHeadline,
        heroSubheadline: next.heroSubheadline,
        announcementBanner: next.announcementBanner,
        websiteStartingPrice: next.websiteStartingPrice,
        mobileStartingPrice: next.mobileStartingPrice,
        brandingStartingPrice: next.brandingStartingPrice,
        whatsappNumber: next.whatsappNumber,
        contactEmail: next.contactEmail,
        founderBio: next.founderBio,
        momoNumber: next.momoNumber,
        momoName: next.momoName,
        autoReplyMessage: next.autoReplyMessage,
        workingHours: next.workingHours,
        updatedAt: serverTimestamp(),
      });

      const baseCms = draftCms || liveCms;
      const syncedCms: WebsiteCmsData = {
        ...baseCms,
        hero: {
          ...baseCms.hero,
          heroTitle: next.heroHeadline.trim() || baseCms.hero.heroTitle,
          heroSubtitle: next.heroSubheadline.trim() || baseCms.hero.heroSubtitle,
          announcementBanner: next.announcementBanner.trim(),
          whatsappNumber: next.whatsappNumber.trim() || baseCms.hero.whatsappNumber,
          email: next.contactEmail.trim() || baseCms.hero.email,
          aboutText: next.founderBio.trim() || baseCms.hero.aboutText,
        },
        services: baseCms.services.map((svc) => {
          const lower = svc.name.toLowerCase();
          if (lower.includes('website')) {
            return { ...svc, startingPrice: next.websiteStartingPrice.trim() || svc.startingPrice };
          }
          if (lower.includes('app')) {
            return { ...svc, startingPrice: next.mobileStartingPrice.trim() || svc.startingPrice };
          }
          if (lower.includes('logo') || lower.includes('ui/ux')) {
            return { ...svc, startingPrice: next.brandingStartingPrice.trim() || svc.startingPrice };
          }
          return svc;
        }),
      };
      const livePayload = buildCmsPayload(syncedCms, true);
      await setDoc(doc(db, 'aizertech_live', 'website'), livePayload);
      await setDoc(doc(db, 'aizertech_draft', 'website'), livePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'studioSettings/public');
    }
  };

  const buildCmsPayload = (cms: WebsiteCmsData, isPublish: boolean) => ({
    hero: {
      heroTitle: cms.hero.heroTitle.trim(),
      heroSubtitle: cms.hero.heroSubtitle.trim(),
      announcementBanner: cms.hero.announcementBanner.trim(),
      whatsappNumber: cms.hero.whatsappNumber.trim(),
      email: cms.hero.email.trim(),
      location: cms.hero.location.trim(),
      aboutText: cms.hero.aboutText.trim(),
      whyUsPoints: cms.hero.whyUsPoints.map((pt) => pt.trim()).filter(Boolean),
    },
    services: cms.services.map((s) => ({
      id: s.id,
      name: s.name.trim(),
      description: s.description.trim(),
      startingPrice: s.startingPrice.trim(),
      deliveryTime: s.deliveryTime.trim(),
      visible: Boolean(s.visible),
      featured: Boolean(s.featured),
      deliverables: s.deliverables || [],
    })),
    projects: cms.projects.map((p) => ({
      id: p.id,
      title: p.title.trim(),
      category: p.category.trim(),
      price: p.price.trim(),
      description: p.description.trim(),
      imageUrl: p.imageUrl.trim(),
      clientName: p.clientName.trim(),
      location: p.location.trim(),
    })),
    updatedAt: serverTimestamp(),
    ...(isPublish ? { publishedAt: serverTimestamp() } : {}),
  });

  const handleSaveDraft = async (nextDraft: WebsiteCmsData) => {
    try {
      await setDoc(
        doc(db, 'aizertech_draft', 'website'),
        buildCmsPayload(nextDraft, false)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'aizertech_draft/website');
    }
  };

  const handlePublishLive = async (nextLive: WebsiteCmsData) => {
    try {
      // 1. Auto-Backup current live snapshot to aizertech_backup before publishing
      const backupLabel = `Live Snapshot (${new Date().toLocaleString('en-GH', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })})`;
      await addDoc(collection(db, 'aizertech_backup'), {
        label: backupLabel.slice(0, 120),
        snapshot: {
          hero: liveCms.hero,
          services: liveCms.services,
          projects: liveCms.projects,
        },
        backedUpAt: serverTimestamp(),
      });

      // 2. Write published content to aizertech_live/website and sync aizertech_draft/website
      const livePayload = buildCmsPayload(nextLive, true);
      await setDoc(doc(db, 'aizertech_live', 'website'), livePayload);
      await setDoc(doc(db, 'aizertech_draft', 'website'), livePayload);

      // 3. Mirror key contact & hero values to studioSettings/public for backward compatibility
      const webSvc = nextLive.services.find((s) =>
        s.name.toLowerCase().includes('web')
      );
      const appSvc = nextLive.services.find((s) =>
        s.name.toLowerCase().includes('app')
      );
      const brandSvc = nextLive.services.find(
        (s) =>
          s.name.toLowerCase().includes('logo') ||
          s.name.toLowerCase().includes('ui')
      );
      await setDoc(doc(db, 'studioSettings', 'public'), {
        heroHeadline: nextLive.hero.heroTitle.trim().slice(0, 140),
        heroSubheadline: nextLive.hero.heroSubtitle.trim().slice(0, 350),
        announcementBanner: nextLive.hero.announcementBanner.trim().slice(0, 160),
        websiteStartingPrice: (
          webSvc?.startingPrice || studioSettings.websiteStartingPrice
        ).slice(0, 40),
        mobileStartingPrice: (
          appSvc?.startingPrice || studioSettings.mobileStartingPrice
        ).slice(0, 40),
        brandingStartingPrice: (
          brandSvc?.startingPrice || studioSettings.brandingStartingPrice
        ).slice(0, 40),
        whatsappNumber: nextLive.hero.whatsappNumber.trim().slice(0, 20),
        contactEmail: nextLive.hero.email.trim().slice(0, 150),
        founderBio: nextLive.hero.aboutText.trim().slice(0, 600),
        momoNumber: studioSettings.momoNumber.trim().slice(0, 30),
        momoName: studioSettings.momoName.trim().slice(0, 80),
        autoReplyMessage: studioSettings.autoReplyMessage.trim().slice(0, 500),
        workingHours: studioSettings.workingHours.trim().slice(0, 120),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'aizertech_live/website');
    }
  };

  const handleRestoreBackup = async (backup: WebsiteBackupRecord) => {
    try {
      const restoredPayload = buildCmsPayload(backup.snapshot, true);
      await setDoc(doc(db, 'aizertech_live', 'website'), restoredPayload);
      await setDoc(doc(db, 'aizertech_draft', 'website'), restoredPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'aizertech_live/website');
    }
  };

  if (!open) return null;

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-admin flex flex-col items-center justify-center p-6">
        <Crown className="w-8 h-8 text-[#FFD700] mb-3 animate-pulse" />
        <p className="text-xs font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
          Initializing AizerTech Executive Suite...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <AdminLoginCard
        authError={authError}
        stayLoggedIn={stayLoggedIn}
        onToggleStayLoggedIn={setStayLoggedIn}
        onEmailPasswordSignIn={handleEmailPasswordLogin}
        onGoogleSignIn={handleGoogleLogin}
        onBackToSite={onClose}
      />
    );
  }

  if (!isAdminEmailMatch) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-admin flex items-center justify-center p-6">
        <div className="luxury-card rounded-3xl p-8 max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/35 flex items-center justify-center text-red-400 mx-auto">
            <Crown className="w-6 h-6" />
          </div>
          <h1 className="font-luxury text-2xl font-bold text-white">
            CEO Access Only
          </h1>
          <p className="text-xs text-neutral-300 leading-relaxed">
            Signed in as <span className="text-white font-semibold">{user.email}</span>. Only the authorized AizerTech GH CEO account ({ADMIN_EMAIL}) can unlock this portal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleSignOut}
              className="gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold cursor-pointer"
            >
              Switch Account
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-white cursor-pointer"
            >
              Public Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white font-admin flex items-center justify-center p-6">
        <div className="luxury-card rounded-3xl p-8 max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#FFD700] mx-auto">
            <MailCheck className="w-6 h-6" />
          </div>
          <h1 className="font-luxury text-2xl font-bold text-white">
            Verify Admin Email
          </h1>
          <p className="text-xs text-neutral-300 leading-relaxed">
            For executive security, Firestore requires a verified email for{' '}
            <span className="text-[#FFD700] font-semibold">{user.email}</span>. Send a verification link or tap Continue with Google to unlock instantly.
          </p>
          {verificationSent && (
            <p className="text-xs text-emerald-300 bg-emerald-500/12 border border-emerald-500/35 rounded-2xl p-3">
              Verification link sent to {user.email}. Click it in your inbox, then tap &ldquo;I&apos;ve Verified&rdquo;.
            </p>
          )}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={async () => {
                await sendAdminVerificationEmail();
                setVerificationSent(true);
              }}
              className="gold-gradient-btn w-full py-3 rounded-2xl text-xs font-bold cursor-pointer"
            >
              Send Verification Email
            </button>
            <button
              type="button"
              disabled={checkingVerify}
              onClick={async () => {
                setCheckingVerify(true);
                const reloaded = await reloadAdminUser();
                setUser(reloaded ? { ...reloaded } : null);
                setCheckingVerify(false);
              }}
              className="w-full py-3 rounded-2xl bg-white/[0.06] border border-white/12 text-xs font-semibold text-white inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingVerify ? 'animate-spin' : ''}`} />
              <span>I&apos;ve Verified — Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => handleGoogleLogin(true)}
              className="w-full py-2.5 text-xs text-[#FFD700] hover:underline cursor-pointer"
            >
              Or Continue with Google (Instantly Verified)
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: {
    id: AdminSection;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
    { id: 'messages', label: 'Messages', shortLabel: 'Inbox', icon: MessageSquare, badge: unreadCount },
    { id: 'users', label: 'Registered Users', shortLabel: 'Users', icon: UserCheck },
    { id: 'invoices', label: 'Invoices', shortLabel: 'Invoices', icon: Receipt, badge: unpaidInvoicesCount },
    { id: 'bookings', label: 'Bookings', shortLabel: 'Calls', icon: Calendar, badge: pendingBookingsCount },
    { id: 'testimonials', label: 'Testimonials', shortLabel: 'Reviews', icon: Star },
    { id: 'website', label: 'Website Control', shortLabel: 'Site', icon: Globe },
    { id: 'clients', label: 'Clients', shortLabel: 'Clients', icon: Users },
    { id: 'projects', label: 'Projects', shortLabel: 'Jobs', icon: FolderKanban },
    { id: 'settings', label: 'Settings', shortLabel: 'Config', icon: Settings },
  ];

  const loadingMessages = loadingAizer || loadingLegacy;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-admin relative flex flex-col lg:flex-row">
      {/* Subtle Ambient Gold Glow */}
      <div
        className="pointer-events-none fixed top-0 right-0 w-[500px] h-[360px] rounded-full bg-[#D4AF37]/8 blur-[160px]"
        aria-hidden="true"
      />

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-[264px] lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 z-30 bg-[#0D0D0F]/95 border-r border-[#D4AF37]/18 px-5 py-6 justify-between backdrop-blur-xl">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 pb-6 mb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] flex items-center justify-center shadow-[0_0_24px_-6px_rgba(212,175,55,0.65)] shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-luxury text-base font-bold tracking-wide gold-gradient-text leading-tight">
                AIZERTECH
              </p>
              <p className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-neutral-400">
                CEO Suite
              </p>
            </div>
          </div>

          <nav aria-label="Admin Navigation" className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'messages') setMessageSearchSeed('');
                    setActiveSection(item.id);
                  }}
                  className={`haptic-tap-sm w-full px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between cursor-pointer transition-all ${
                    active
                      ? 'gold-gradient-btn font-bold'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="inline-flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        active ? 'text-[#0A0A0A]' : 'text-[#D4AF37]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </span>

                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`font-mono-tabular text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        active
                          ? 'bg-[#0A0A0A] text-[#FFD700]'
                          : 'bg-[#D4AF37]/20 text-[#FFD700]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2 pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/50 flex items-center gap-2.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
            <span>View Public Site</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full px-4 py-3 rounded-2xl text-xs font-semibold text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-h-screen pb-24 lg:pb-10">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-14 sm:h-16 bg-[#0A0A0A]/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] shrink-0">
              <Crown className="w-4 h-4" />
            </span>
            <p className="font-sora text-sm sm:text-base font-bold text-white capitalize truncate">
              <span className="lg:hidden gold-gradient-text mr-2">AIZERTECH ·</span>
              {activeSection}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopyAdminLink}
              className="haptic-tap-sm min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-medium text-neutral-300 hover:border-[#D4AF37]/50 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {copiedAdminLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Link2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              )}
              <span className="hidden sm:inline">
                {copiedAdminLink ? 'Admin Link Copied' : 'Copy /admin'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="lg:hidden min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-medium text-neutral-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Site</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Logout"
              className="lg:hidden min-h-[38px] min-w-[38px] rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Active View Content */}
        <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeSection === 'dashboard' && (
            <AdminDashboardHome
              messages={allMessages}
              projects={projects}
              invoices={invoices}
              visits={visits}
              registeredUsers={registeredUsers}
              studioSettings={studioSettings}
              loadingMessages={loadingMessages}
              loadingAnalytics={loadingVisits || loadingUsers}
              onNavigateTab={(tab) => setActiveSection(tab)}
              onOpenMessageModal={(msg) => {
                setSelectedModalMessage(msg);
                setActiveSection('messages');
              }}
              onOpenNewProjectModal={() => setNewProjectModalOpen(true)}
              onOpenBroadcastModal={() => setBroadcastModalOpen(true)}
            />
          )}

          {activeSection === 'messages' && (
            <AdminMessagesView
              messages={allMessages}
              chatThreads={chatThreads}
              loadingMessages={loadingMessages}
              studioSettings={studioSettings}
              initialSearch={messageSearchSeed}
              selectedModalMessage={selectedModalMessage}
              onSelectModalMessage={setSelectedModalMessage}
              onUpdateStatus={handleUpdateMessageStatus}
              onSaveAdminNote={handleSaveAdminNote}
              onCreateInvoiceFromMessage={(seed) => {
                setInvoiceSeedDraft(seed);
                setSelectedModalMessage(null);
                setActiveSection('invoices');
              }}
              onDeleteMessage={handleDeleteMessage}
              onSendAdminChatReply={handleSendAdminChatReply}
              onMarkChatReadByAdmin={handleMarkChatReadByAdmin}
              hasGmailToken={hasGmailToken}
              onSendGmail={handleSendGmail}
            />
          )}

          {activeSection === 'users' && (
            <AdminRegisteredUsersView
              users={registeredUsers}
              loadingUsers={loadingUsers}
              onFilterMessagesByUser={(queryText) => {
                setMessageSearchSeed(queryText);
                setActiveSection('messages');
              }}
            />
          )}

          {activeSection === 'invoices' && (
            <AdminInvoicesView
              invoices={invoices}
              loadingInvoices={loadingInvoices}
              studioSettings={studioSettings}
              seedDraft={invoiceSeedDraft}
              onClearSeedDraft={() => setInvoiceSeedDraft(null)}
              onCreateInvoice={handleCreateInvoice}
              onToggleInvoiceStatus={handleToggleInvoiceStatus}
              onDeleteInvoice={handleDeleteInvoice}
            />
          )}

          {activeSection === 'bookings' && (
            <AdminBookingsView
              bookings={bookings}
              loadingBookings={loadingBookings}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onDeleteBooking={handleDeleteBooking}
            />
          )}

          {activeSection === 'testimonials' && (
            <AdminTestimonialsView
              testimonials={testimonials}
              loadingTestimonials={loadingTestimonials}
              onAddTestimonial={handleAddTestimonial}
              onToggleApprove={handleToggleApproveTestimonial}
              onDeleteTestimonial={handleDeleteTestimonial}
            />
          )}

          {activeSection === 'website' && (
            <AdminWebsiteControlView
              liveCms={liveCms}
              draftCms={draftCms}
              hasLiveDoc={hasLiveDoc}
              backups={backups}
              onSaveDraft={handleSaveDraft}
              onPublishLive={handlePublishLive}
              onRestoreBackup={handleRestoreBackup}
            />
          )}

          {activeSection === 'clients' && (
            <AdminClientsView
              messages={allMessages}
              onFilterMessagesByClient={(queryText) => {
                setMessageSearchSeed(queryText);
                setActiveSection('messages');
              }}
            />
          )}

          {activeSection === 'projects' && (
            <AdminProjectsView
              projects={projects}
              messages={allMessages}
              loadingProjects={loadingProjects}
              onOpenNewProjectModal={() => setNewProjectModalOpen(true)}
              onToggleProjectStatus={handleToggleProjectStatus}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {activeSection === 'settings' && (
            <AdminSettingsView
              studioSettings={studioSettings}
              userEmail={user.email || ADMIN_EMAIL}
              onSaveSettings={handleSaveSettings}
              onChangePassword={changeAdminPassword}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile Admin Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/92 backdrop-blur-xl border-t border-[#D4AF37]/20 flex items-center overflow-x-auto no-scrollbar px-1 h-16 pb-safe"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className="relative min-w-[68px] shrink-0 h-full min-h-[44px] flex flex-col items-center justify-center gap-1 px-2 cursor-pointer"
            >
              <Icon
                className={`w-5 h-5 ${
                  active ? 'text-[#FFD700]' : 'text-neutral-400'
                }`}
              />
              <span
                className={`text-[10px] font-medium tracking-tight whitespace-nowrap ${
                  active ? 'text-[#FFD700] font-semibold' : 'text-neutral-400'
                }`}
              >
                {item.shortLabel}
              </span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span className="absolute top-1.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* + New Project Modal */}
      {newProjectModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-heading"
          onClick={() => setNewProjectModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleCreateProject}
            onClick={(e) => e.stopPropagation()}
            className="luxury-card w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2
                id="new-project-heading"
                className="font-luxury text-xl font-bold text-white"
              >
                + New Client Project
              </h2>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setNewProjectModalOpen(false)}
                className="min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Project Title
              </label>
              <input
                type="text"
                required
                value={projTitle}
                onChange={(e) => setProjTitle(e.target.value)}
                placeholder="e.g. ChopBox Food Delivery App"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={projClientName}
                  onChange={(e) => setProjClientName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Client Phone (Optional)
                </label>
                <input
                  type="text"
                  value={projClientPhone}
                  onChange={(e) => setProjClientPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Service
                </label>
                <select
                  value={projService}
                  onChange={(e) => setProjService(e.target.value)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-3 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="Business Website">Business Website</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Food App Platform">Food App Platform</option>
                  <option value="Logo & Branding">Logo &amp; Branding</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Price (GHS)
                </label>
                <input
                  type="number"
                  min={0}
                  step="50"
                  required
                  value={projAmount}
                  onChange={(e) => setProjAmount(e.target.value)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Status
                </label>
                <select
                  value={projStatus}
                  onChange={(e) =>
                    setProjStatus(e.target.value as 'in_progress' | 'done')
                  }
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-3 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={projNotes}
                onChange={(e) => setProjNotes(e.target.value)}
                placeholder="Deposit received, launch target, deliverables..."
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {projError && (
              <p className="text-xs text-red-300 bg-red-500/12 border border-red-500/35 rounded-2xl px-4 py-2.5">
                {projError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewProjectModalOpen(false)}
                className="px-4 py-3 rounded-2xl bg-white/[0.05] text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingProject}
                className="gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                {creatingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Project</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Broadcast WhatsApp Modal */}
      {broadcastModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="broadcast-heading"
          onClick={() => setBroadcastModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="luxury-card w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-5 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2
                  id="broadcast-heading"
                  className="font-luxury text-xl font-bold text-white"
                >
                  Broadcast WhatsApp
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Send your update to real clients who shared a phone number
                </p>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setBroadcastModalOpen(false)}
                className="min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Broadcast Message
              </label>
              <textarea
                rows={3}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {clientsWithPhones.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center text-xs text-neutral-400">
                No clients with phone numbers yet, CEO. Once clients leave their WhatsApp numbers, they appear here for 1-tap messaging.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-white/10 pr-1">
                {clientsWithPhones.map((client) => (
                  <div
                    key={client.key}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-bold text-xs flex items-center justify-center shrink-0">
                        {getInitial(client.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {client.name}
                        </p>
                        <p className="text-[11px] font-mono-tabular text-neutral-400">
                          {client.phone}
                        </p>
                      </div>
                    </div>

                    <a
                      href={buildClientWhatsAppHref(
                        client.phone,
                        `Hi ${client.name}, ${broadcastText}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/25 inline-flex items-center gap-1.5 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
