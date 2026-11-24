import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  FileText,
  Loader2,
  LogOut,
  MessageCircle,
  MessageSquare,
  Phone,
  Receipt,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BookingRecord,
  buildWhatsAppUrl,
  ChatMessageRecord,
  ChatThreadRecord,
  ContactMessageRecord,
  InvoiceRecord,
  RegisteredUserRecord,
  StudioSettings,
  WebsiteCmsData,
} from '../types';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import {
  formatFullDateTime,
  formatGhs,
  formatTimeAgo,
  getInitial,
  getPipelineStageMeta,
  getTimestampMs,
} from './admin/adminUtils';

interface ClientPortalPageProps {
  user: User;
  userProfile: RegisteredUserRecord | null;
  cms: WebsiteCmsData;
  studioSettings: StudioSettings;
  initialTab?: 'chat' | 'requests' | 'invoices';
  onBackToSite: () => void;
  onJumpToSection: (sectionId: string) => void;
  onSavePhone: (phone: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

type PortalTab = 'chat' | 'requests' | 'invoices';

export const ClientPortalPage: React.FC<ClientPortalPageProps> = ({
  user,
  userProfile,
  cms,
  studioSettings,
  initialTab = 'chat',
  onBackToSite,
  onJumpToSection,
  onSavePhone,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<PortalTab>(initialTab);
  const [chatThread, setChatThread] = useState<ChatThreadRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessageRecord[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const [myRequests, setMyRequests] = useState<ContactMessageRecord[]>([]);
  const [myBookings, setMyBookings] = useState<BookingRecord[]>([]);
  const [myInvoices, setMyInvoices] = useState<InvoiceRecord[]>([]);
  const [loadingPortalData, setLoadingPortalData] = useState(true);

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(userProfile?.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setPhoneDraft(userProfile?.phone || '');
  }, [userProfile?.phone]);

  // Real-time chat thread + messages for this authenticated user
  useEffect(() => {
    const threadRef = doc(db, 'aizertech_chats', user.uid);
    const unsubThread = onSnapshot(
      threadRef,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setChatThread({
            userId: String(d.userId || user.uid),
            userName: String(d.userName || user.displayName || 'Client'),
            userEmail: String(d.userEmail || user.email || ''),
            userPhoto: String(d.userPhoto || user.photoURL || ''),
            userPhone: String(d.userPhone || ''),
            lastMessage: String(d.lastMessage || ''),
            lastSenderRole: d.lastSenderRole === 'admin' ? 'admin' : 'client',
            unreadByAdmin: Number(d.unreadByAdmin) || 0,
            unreadByClient: Number(d.unreadByClient) || 0,
            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          });
        } else {
          setChatThread(null);
        }
      },
      (err) => {
        console.error('Chat thread listener warning:', err);
      }
    );

    const msgsQuery = query(
      collection(db, 'aizertech_chats', user.uid, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubMsgs = onSnapshot(
      msgsQuery,
      (snap) => {
        const rows: ChatMessageRecord[] = snap.docs.map((dSnap) => {
          const d = dSnap.data();
          return {
            id: dSnap.id,
            senderId: String(d.senderId || ''),
            senderName: String(d.senderName || 'User'),
            senderRole: d.senderRole === 'admin' ? 'admin' : 'client',
            text: String(d.text || ''),
            createdAt: d.createdAt || null,
          };
        });
        setChatMessages(rows);
        setLoadingChat(false);
      },
      (err) => {
        console.error('Chat messages listener warning:', err);
        setLoadingChat(false);
      }
    );

    return () => {
      unsubThread();
      unsubMsgs();
    };
  }, [user.uid, user.displayName, user.email, user.photoURL]);

  // Clear client unread indicator when viewing chat
  useEffect(() => {
    if (activeTab === 'chat' && chatThread && chatThread.unreadByClient > 0) {
      updateDoc(doc(db, 'aizertech_chats', user.uid), {
        unreadByClient: 0,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, [activeTab, chatThread, user.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, activeTab]);

  // Real-time requests, bookings & invoices owned by this user
  useEffect(() => {
    setLoadingPortalData(true);

    const reqQuery = query(
      collection(db, 'aizertech_messages'),
      where('userId', '==', user.uid)
    );
    const unsubReqs = onSnapshot(
      reqQuery,
      (snap) => {
        const rows: ContactMessageRecord[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: String(d.userId || user.uid),
              sourceCollection: 'aizertech_messages' as const,
              senderName: String(d.name || 'Client'),
              senderEmail: String(d.email || ''),
              senderPhone: String(d.phone || ''),
              serviceType: String(d.service || 'Project Inquiry'),
              budgetTier: String(d.budget || 'Custom'),
              message: String(d.message || ''),
              status: (d.status || 'new') as ContactMessageRecord['status'],
              createdAt: d.createdAt || null,
              updatedAt: d.updatedAt || null,
            };
          })
          .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        setMyRequests(rows);
        setLoadingPortalData(false);
      },
      () => setLoadingPortalData(false)
    );

    const bookingsQuery = query(
      collection(db, 'aizertech_bookings'),
      where('userId', '==', user.uid)
    );
    const unsubBookings = onSnapshot(
      bookingsQuery,
      (snap) => {
        const rows: BookingRecord[] = snap.docs
          .map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: String(d.userId || user.uid),
              clientName: String(d.clientName || 'Client'),
              clientPhone: String(d.clientPhone || ''),
              preferredDate: String(d.preferredDate || ''),
              preferredTime: String(d.preferredTime || ''),
              service: String(d.service || 'Consultation'),
              status: (d.status || 'pending') as BookingRecord['status'],
              createdAt: d.createdAt || null,
              updatedAt: d.updatedAt || null,
            };
          })
          .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
        setMyBookings(rows);
      },
      () => {}
    );

    const userEmail = (user.email || '').trim();
    let unsubInvoices = () => {};
    if (userEmail) {
      const invQuery = query(
        collection(db, 'aizertech_invoices'),
        where('clientEmail', '==', userEmail)
      );
      unsubInvoices = onSnapshot(
        invQuery,
        (snap) => {
          const rows: InvoiceRecord[] = snap.docs
            .map((docSnap) => {
              const d = docSnap.data();
              return {
                id: docSnap.id,
                invoiceNumber: String(d.invoiceNumber || 'AT-001'),
                clientName: String(d.clientName || 'Client'),
                clientPhone: String(d.clientPhone || ''),
                clientEmail: String(d.clientEmail || ''),
                service: String(d.service || ''),
                amountGhs: Number(d.amountGhs) || 0,
                description: String(d.description || ''),
                invoiceDate: String(d.invoiceDate || ''),
                status: (d.status === 'paid' ? 'paid' : 'unpaid') as InvoiceRecord['status'],
                sourceMessageId: String(d.sourceMessageId || ''),
                createdAt: d.createdAt || null,
                updatedAt: d.updatedAt || null,
              };
            })
            .sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
          setMyInvoices(rows);
        },
        () => {}
      );
    }

    return () => {
      unsubReqs();
      unsubBookings();
      unsubInvoices();
    };
  }, [user.uid, user.email]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim().slice(0, 2000);
    if (!text) return;

    const senderName = (
      userProfile?.name ||
      user.displayName ||
      user.email?.split('@')[0] ||
      'Client'
    ).slice(0, 120);
    const senderEmail = (user.email || '').slice(0, 150);
    const senderPhoto = (userProfile?.photoUrl || user.photoURL || '').slice(0, 1000);
    const senderPhone = (userProfile?.phone || '').slice(0, 30);

    setSendingChat(true);
    try {
      const threadRef = doc(db, 'aizertech_chats', user.uid);
      if (!chatThread) {
        await setDoc(threadRef, {
          userId: user.uid,
          userName: senderName,
          userEmail: senderEmail,
          userPhoto: senderPhoto,
          userPhone: senderPhone,
          lastMessage: text.slice(0, 500),
          lastSenderRole: 'client',
          unreadByAdmin: 1,
          unreadByClient: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(threadRef, {
          userName: senderName,
          userEmail: senderEmail,
          userPhoto: senderPhoto,
          userPhone: senderPhone,
          lastMessage: text.slice(0, 500),
          lastSenderRole: 'client',
          unreadByAdmin: Math.min(999, (chatThread.unreadByAdmin || 0) + 1),
          unreadByClient: 0,
          updatedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, 'aizertech_chats', user.uid, 'messages'), {
        senderId: user.uid,
        senderName,
        senderRole: 'client',
        text,
        createdAt: serverTimestamp(),
      });

      setChatInput('');
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `aizertech_chats/${user.uid}/messages`
      );
    } finally {
      setSendingChat(false);
    }
  };

  const handleSavePhoneInline = async () => {
    setSavingPhone(true);
    try {
      await onSavePhone(phoneDraft);
      setEditingPhone(false);
    } finally {
      setSavingPhone(false);
    }
  };

  const displayName =
    userProfile?.name || user.displayName || user.email?.split('@')[0] || 'Client';
  const displayPhoto = userProfile?.photoUrl || user.photoURL || '';
  const unreadFromAdmin = chatThread?.unreadByClient || 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-admin pb-16">
      <div
        className="pointer-events-none fixed top-0 right-0 w-[420px] h-[320px] rounded-full bg-[#D4AF37]/8 blur-[150px]"
        aria-hidden="true"
      />

      {/* Portal Header */}
      <header className="sticky top-0 z-30 h-16 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToSite}
              className="haptic-tap-sm px-3 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-medium text-neutral-200 hover:border-[#D4AF37]/50 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Website</span>
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-[#FFD700] shrink-0" />
              <span className="font-luxury text-base sm:text-lg font-bold gold-gradient-text truncate">
                My Account · Client Portal
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="haptic-tap-sm px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Client Profile Banner */}
        <section className="luxury-card rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37]/60 shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-lg flex items-center justify-center shrink-0">
                {getInitial(displayName)}
              </div>
            )}

            <div className="min-w-0">
              <h1 className="font-luxury text-xl sm:text-2xl font-bold text-white truncate">
                {displayName}
              </h1>
              <p className="text-xs text-neutral-400 truncate mt-0.5">
                {user.email}
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-neutral-300">
                {editingPhone ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="rounded-xl bg-[#0A0A0A] border border-[#D4AF37]/50 px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={savingPhone}
                      onClick={handleSavePhoneInline}
                      className="gold-gradient-btn px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingPhone(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#FFD700] hover:underline cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>
                      {userProfile?.phone
                        ? userProfile.phone
                        : 'Add WhatsApp / Phone number'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-white/10">
            <div>
              <p className="text-[11px] text-neutral-400">Requests</p>
              <p className="font-mono-tabular text-lg font-bold text-[#FFD700]">
                {myRequests.length + myBookings.length}
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" aria-hidden="true" />
            <div>
              <p className="text-[11px] text-neutral-400">Invoices</p>
              <p className="font-mono-tabular text-lg font-bold text-white">
                {myInvoices.length}
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" aria-hidden="true" />
            <button
              type="button"
              onClick={() => onJumpToSection('contact')}
              className="gold-gradient-btn px-4 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ New Request</span>
            </button>
          </div>
        </section>

        {/* Portal Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-white/[0.04] border border-white/10 p-1.5 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'chat'
                ? 'gold-gradient-btn font-bold'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Live Chat</span>
            {unreadFromAdmin > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {unreadFromAdmin}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'requests'
                ? 'gold-gradient-btn font-bold'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Requests &amp; Calls ({myRequests.length + myBookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'invoices'
                ? 'gold-gradient-btn font-bold'
                : 'text-neutral-300 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices ({myInvoices.length})</span>
          </button>
        </div>

        {/* Tab 1: Real-Time Live Chat */}
        {activeTab === 'chat' && (
          <section className="luxury-card rounded-3xl overflow-hidden flex flex-col h-[520px]">
            <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
              <div>
                <h2 className="font-luxury text-lg font-bold text-white">
                  Direct Live Chat with AizerTech GH
                </h2>
                <p className="text-xs text-neutral-400">
                  Real-time messages go straight to CEO Sablaizer · {studioSettings.workingHours}
                </p>
              </div>
              <a
                href={buildWhatsAppUrl(
                  `Hello AizerTech GH, I am ${displayName} (${user.email || ''}) chatting from my client account.`,
                  cms.hero.whatsappNumber
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/25 inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Backup</span>
              </a>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
              {loadingChat ? (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#FFD700]" />
                  Loading conversation...
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center text-[#FFD700]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <p className="font-luxury text-base font-bold text-white">
                    Start a live chat with CEO Sablaizer
                  </p>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Ask about pricing, delivery timelines, or share your project idea below.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isClient = msg.senderRole === 'client';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isClient ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          isClient
                            ? 'bg-gradient-to-br from-[#FFD700] to-[#C89B24] text-[#0A0A0A] font-medium'
                            : 'bg-white/[0.06] border border-[#D4AF37]/30 text-white'
                        }`}
                      >
                        <p className="text-[10px] font-semibold opacity-75 mb-1">
                          {isClient ? 'You' : 'Sablaizer · AizerTech CEO'}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      </div>
                      <span className="text-[10px] font-mono-tabular text-neutral-500 mt-1 px-1">
                        {formatTimeAgo(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={handleSendChat}
              className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center gap-3"
            >
              <input
                type="text"
                maxLength={2000}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your message to AizerTech GH..."
                className="flex-1 rounded-2xl bg-[#0A0A0A] border border-white/15 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {sendingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Send</span>
              </button>
            </form>
          </section>
        )}

        {/* Tab 2: My Requests & Bookings */}
        {activeTab === 'requests' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="luxury-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-luxury text-xl font-bold text-white">
                  Project Requests ({myRequests.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onJumpToSection('contact')}
                  className="text-xs font-semibold text-[#FFD700] hover:underline cursor-pointer"
                >
                  + New Request
                </button>
              </div>

              {loadingPortalData ? (
                <p className="text-xs text-neutral-400 py-6 text-center">
                  Loading requests...
                </p>
              ) : myRequests.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center space-y-3">
                  <p className="text-sm font-medium text-neutral-300">
                    No project requests yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onJumpToSection('contact')}
                    className="gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Submit Your First Request
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => {
                    const meta = getPipelineStageMeta(req.status);
                    return (
                      <div
                        key={req.id}
                        className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#FFD700]">
                            {req.serviceType}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.badgeClass}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          {req.message}
                        </p>
                        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-neutral-400 pt-1">
                          <span>Budget: {req.budgetTier}</span>
                          <span>{formatFullDateTime(req.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="luxury-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-luxury text-xl font-bold text-white">
                  Free Call Bookings ({myBookings.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onJumpToSection('book-call')}
                  className="text-xs font-semibold text-[#FFD700] hover:underline cursor-pointer"
                >
                  + Book Call
                </button>
              </div>

              {myBookings.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center space-y-3">
                  <p className="text-sm font-medium text-neutral-300">
                    No call bookings yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => onJumpToSection('book-call')}
                    className="gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Book Free Call
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {myBookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {b.service}
                        </p>
                        <p className="text-xs font-mono-tabular text-neutral-400 inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>
                            {b.preferredDate} · {b.preferredTime}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase shrink-0 ${
                          b.status === 'confirmed'
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40'
                            : b.status === 'done'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                              : b.status === 'cancelled'
                                ? 'bg-red-500/15 text-red-300 border border-red-500/40'
                                : 'bg-[#D4AF37]/15 text-[#FFD700] border border-[#D4AF37]/40'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 3: My Invoices */}
        {activeTab === 'invoices' && (
          <section className="luxury-card rounded-3xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-luxury text-xl font-bold text-white">
                  My Invoices ({myInvoices.length})
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Official GHS invoices issued to {user.email}
                </p>
              </div>
              <div className="text-xs text-neutral-300 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-2.5">
                Pay via MTN MoMo / Telecel Cash:{' '}
                <span className="font-mono-tabular font-bold text-[#FFD700]">
                  {studioSettings.momoNumber}
                </span>{' '}
                ({studioSettings.momoName})
              </div>
            </div>

            {myInvoices.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-8 text-center">
                <Receipt className="w-8 h-8 text-[#D4AF37] mx-auto mb-3 opacity-80" />
                <p className="text-sm font-medium text-neutral-300">
                  No invoices issued for your account yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myInvoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  return (
                    <div
                      key={inv.id}
                      className="rounded-2xl bg-white/[0.03] border border-[#D4AF37]/25 p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono-tabular text-xs font-bold text-[#FFD700]">
                            {inv.invoiceNumber} · {inv.invoiceDate}
                          </p>
                          <h3 className="font-sora text-base font-bold text-white mt-1">
                            {inv.service}
                          </h3>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isPaid ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{isPaid ? 'PAID' : 'UNPAID'}</span>
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed">
                        {inv.description}
                      </p>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <p className="font-mono-tabular text-xl font-bold gold-gradient-text">
                          {formatGhs(inv.amountGhs)}
                        </p>
                        <button
                          type="button"
                          onClick={() => downloadInvoicePdf(inv, studioSettings)}
                          className="gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
