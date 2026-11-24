import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ContactMessageRecord, MessageStatus } from '../../types';
import {
  buildClientWhatsAppHref,
  formatFullDateTime,
  formatTimeAgo,
  getInitial,
  getTimestampMs,
  normalizePhoneKey,
} from './adminUtils';

type FilterTab = 'all' | 'new' | 'replied' | 'done';
type SortOrder = 'newest' | 'oldest';

interface AdminMessagesViewProps {
  messages: ContactMessageRecord[];
  loadingMessages: boolean;
  initialSearch?: string;
  selectedModalMessage: ContactMessageRecord | null;
  onSelectModalMessage: (msg: ContactMessageRecord | null) => void;
  onUpdateStatus: (msg: ContactMessageRecord, nextStatus: MessageStatus) => Promise<void>;
  onDeleteMessage: (msg: ContactMessageRecord) => Promise<void>;
  hasGmailToken: boolean;
  onSendGmail: (
    msg: ContactMessageRecord,
    subject: string,
    body: string
  ) => Promise<void>;
}

function getStatusPill(status: MessageStatus): { label: string; className: string } {
  if (status === 'new') {
    return {
      label: 'New',
      className: 'bg-[#D4AF37]/15 text-[#FFD700] border border-[#D4AF37]/45',
    };
  }
  if (status === 'replied') {
    return {
      label: 'Replied',
      className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40',
    };
  }
  if (status === 'done') {
    return {
      label: 'Done',
      className: 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/40',
    };
  }
  if (status === 'reviewed') {
    return {
      label: 'Reviewed',
      className: 'bg-amber-500/15 text-amber-200 border border-amber-500/35',
    };
  }
  return {
    label: 'Archived',
    className: 'bg-white/5 text-neutral-400 border border-white/10',
  };
}

export const AdminMessagesView: React.FC<AdminMessagesViewProps> = ({
  messages,
  loadingMessages,
  initialSearch = '',
  selectedModalMessage,
  onSelectModalMessage,
  onUpdateStatus,
  onDeleteMessage,
  hasGmailToken,
  onSendGmail,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

  // Email composer state inside detail modal
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  React.useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  const counts = useMemo(
    () => ({
      all: messages.length,
      new: messages.filter((m) => m.status === 'new').length,
      replied: messages.filter((m) => m.status === 'replied').length,
      done: messages.filter((m) => m.status === 'done').length,
    }),
    [messages]
  );

  const visibleMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = messages.filter((m) => {
      if (filterTab !== 'all' && m.status !== filterTab) return false;
      if (!q) return true;
      return (
        m.senderName.toLowerCase().includes(q) ||
        m.senderPhone.toLowerCase().includes(q) ||
        m.senderEmail.toLowerCase().includes(q) ||
        m.serviceType.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const diff = getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
      return sortOrder === 'newest' ? diff : -diff;
    });
  }, [messages, searchTerm, filterTab, sortOrder]);

  const openModal = (msg: ContactMessageRecord) => {
    onSelectModalMessage(msg);
    setEmailComposerOpen(false);
    setEmailNotice(null);
    setReplySubject(`Re: Your ${msg.serviceType} inquiry — Aizer Tech`);
    setReplyBody(
      `Hi ${msg.senderName},\n\nThank you for reaching out to Aizer Tech regarding your ${msg.serviceType} (${msg.budgetTier}). I would love to get your project started.\n\nPlease reply with a good time to connect or any extra details you have.\n\nBest regards,\nSablaizer (Evans Kwaku Sablah)\nCEO, Aizer Tech · Accra, Ghana`
    );
  };

  const handleStatusClick = async (
    e: React.MouseEvent,
    msg: ContactMessageRecord,
    nextStatus: MessageStatus
  ) => {
    e.stopPropagation();
    const key = `${msg.sourceCollection}:${msg.id}`;
    setBusyId(key);
    try {
      await onUpdateStatus(msg, nextStatus);
      if (selectedModalMessage?.id === msg.id) {
        onSelectModalMessage({ ...msg, status: nextStatus });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async (
    e: React.MouseEvent,
    msg: ContactMessageRecord
  ) => {
    e.stopPropagation();
    const key = `${msg.sourceCollection}:${msg.id}`;
    setBusyId(key);
    try {
      await onDeleteMessage(msg);
      setConfirmDeleteKey(null);
      if (selectedModalMessage?.id === msg.id) {
        onSelectModalMessage(null);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModalMessage) return;
    setEmailNotice(null);
    setSendingEmail(true);
    try {
      await onSendGmail(selectedModalMessage, replySubject, replyBody);
      setEmailNotice({
        type: 'success',
        text: `Email delivered to ${selectedModalMessage.senderEmail} and marked Replied.`,
      });
      setEmailComposerOpen(false);
    } catch (error) {
      setEmailNotice({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not send email right now.',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedPublicLink(true);
      window.setTimeout(() => setCopiedPublicLink(false), 2400);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Search, Status Filter & Sort */}
      <div className="luxury-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              Client Inbox
            </p>
            <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
              Messages ({messages.length})
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-[#D4AF37]/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
              }
              className="haptic-tap-sm min-h-[42px] px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/50 inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          {(
            [
              { id: 'all', label: `All (${counts.all})` },
              { id: 'new', label: `New (${counts.new})` },
              { id: 'replied', label: `Replied (${counts.replied})` },
              { id: 'done', label: `Done (${counts.done})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`haptic-tap-sm min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                filterTab === tab.id
                  ? 'gold-gradient-btn'
                  : 'bg-white/[0.04] border border-white/10 text-neutral-300 hover:text-white hover:border-[#D4AF37]/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Cards */}
      {loadingMessages ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-3xl bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="luxury-card rounded-3xl p-10 text-center">
          <p className="font-luxury text-xl font-semibold text-white mb-2">
            No messages yet, CEO. Share your link.
          </p>
          <p className="text-xs text-neutral-400 mb-6">
            Every project brief submitted on your site lands here immediately.
          </p>
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="haptic-tap gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            {copiedPublicLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>Website Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Website Link</span>
              </>
            )}
          </button>
        </div>
      ) : visibleMessages.length === 0 ? (
        <div className="luxury-card rounded-3xl p-8 text-center">
          <p className="text-sm text-neutral-300 mb-4">
            No messages match your current search or filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterTab('all');
            }}
            className="haptic-tap-sm px-4 py-2 rounded-xl bg-white/[0.06] border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleMessages.map((msg, idx) => {
            const key = `${msg.sourceCollection}:${msg.id}`;
            const phoneDigits = normalizePhoneKey(msg.senderPhone);
            const pill = getStatusPill(msg.status);
            const isBusy = busyId === key;

            return (
              <motion.article
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.025, 0.2) }}
                onClick={() => openModal(msg)}
                className={`luxury-card luxury-card-hover rounded-3xl p-5 sm:p-7 cursor-pointer ${
                  msg.status === 'new' ? 'border-[#D4AF37]/45' : ''
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/10">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-base flex items-center justify-center shrink-0 shadow-[0_0_24px_-6px_rgba(212,175,55,0.65)]">
                      {getInitial(msg.senderName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-sora text-base sm:text-lg font-bold text-white truncate">
                          {msg.senderName}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1 break-all">
                        {msg.senderPhone ? `${msg.senderPhone} · ` : ''}
                        {msg.senderEmail}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[11px] font-semibold text-[#FFD700]">
                      {msg.serviceType}
                    </span>
                    <div className="text-right">
                      <p className="font-mono-tabular text-xs font-semibold text-white">
                        {msg.budgetTier}
                      </p>
                      <p className="font-mono-tabular text-[11px] text-neutral-400">
                        {formatTimeAgo(msg.createdAt)} · {formatFullDateTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Message Body */}
                <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap py-4">
                  {msg.message}
                </p>

                {/* Action Bar */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-white/10"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {phoneDigits && (
                      <>
                        <a
                          href={buildClientWhatsAppHref(
                            msg.senderPhone,
                            `Hello ${msg.senderName}, this is Sablaizer (CEO, Aizer Tech) following up on your ${msg.serviceType} inquiry.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/25"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Reply WhatsApp</span>
                        </a>

                        <a
                          href={`tel:${msg.senderPhone}`}
                          className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/25"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call</span>
                        </a>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={isBusy || msg.status === 'replied'}
                      onClick={(e) => handleStatusClick(e, msg, 'replied')}
                      className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-medium text-neutral-200 hover:border-emerald-400/50 hover:text-emerald-300 disabled:opacity-45 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Replied</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy || msg.status === 'done'}
                      onClick={(e) => handleStatusClick(e, msg, 'done')}
                      className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-medium text-neutral-200 hover:border-[#D4AF37]/50 hover:text-[#FFD700] disabled:opacity-45 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Done</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {confirmDeleteKey === key ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={(e) => handleDeleteConfirm(e, msg)}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteKey(null);
                          }}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-white/5 text-xs text-neutral-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteKey(key);
                        }}
                        className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/15 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Full Message Details Popup Modal */}
      {selectedModalMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-client-name"
          onClick={() => onSelectModalMessage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="luxury-card w-full max-w-2xl rounded-3xl p-6 sm:p-8 my-auto space-y-5"
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-base flex items-center justify-center shrink-0">
                  {getInitial(selectedModalMessage.senderName)}
                </div>
                <div className="min-w-0">
                  <h2
                    id="modal-client-name"
                    className="font-luxury text-xl sm:text-2xl font-bold text-white truncate"
                  >
                    {selectedModalMessage.senderName}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5 break-all">
                    {selectedModalMessage.senderEmail}
                    {selectedModalMessage.senderPhone
                      ? ` · ${selectedModalMessage.senderPhone}`
                      : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close message details"
                onClick={() => onSelectModalMessage(null)}
                className="min-w-[40px] min-h-[40px] rounded-2xl bg-white/[0.05] border border-white/12 flex items-center justify-center text-neutral-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5">
                <p className="text-neutral-400 mb-1">Service</p>
                <p className="font-semibold text-[#FFD700]">
                  {selectedModalMessage.serviceType}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5">
                <p className="text-neutral-400 mb-1">Budget</p>
                <p className="font-mono-tabular font-semibold text-white">
                  {selectedModalMessage.budgetTier}
                </p>
              </div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3.5">
                <p className="text-neutral-400 mb-1">Received</p>
                <p className="font-mono-tabular font-semibold text-white">
                  {formatFullDateTime(selectedModalMessage.createdAt)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0A0A0A] border border-white/10 p-4 sm:p-5">
              <p className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#D4AF37] mb-2">
                Full Project Brief
              </p>
              <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {selectedModalMessage.message}
              </p>
            </div>

            {emailNotice && (
              <div
                role="status"
                className={`rounded-2xl px-4 py-3 text-xs font-medium border ${
                  emailNotice.type === 'success'
                    ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200'
                    : 'bg-red-500/12 border-red-500/35 text-red-200'
                }`}
              >
                {emailNotice.text}
              </div>
            )}

            {emailComposerOpen ? (
              <form onSubmit={handleSendEmailSubmit} className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#FFD700]">
                    Send Email Reply via Gmail ({selectedModalMessage.senderEmail})
                  </p>
                  <button
                    type="button"
                    onClick={() => setEmailComposerOpen(false)}
                    className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                  >
                    Hide Composer
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <textarea
                  rows={5}
                  required
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-[#D4AF37]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sendingEmail}
                    className="haptic-tap gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {sendingEmail
                        ? 'Sending...'
                        : hasGmailToken
                        ? 'Send Email Now'
                        : 'Connect Gmail & Send'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  {normalizePhoneKey(selectedModalMessage.senderPhone) && (
                    <>
                      <a
                        href={buildClientWhatsAppHref(
                          selectedModalMessage.senderPhone,
                          `Hello ${selectedModalMessage.senderName}, this is Sablaizer from Aizer Tech regarding your ${selectedModalMessage.serviceType} project.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Reply WhatsApp</span>
                      </a>
                      <a
                        href={`tel:${selectedModalMessage.senderPhone}`}
                        className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-xs font-semibold text-[#FFD700]"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call</span>
                      </a>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setEmailComposerOpen(true)}
                    className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/[0.06] border border-white/12 text-xs font-semibold text-white hover:border-[#D4AF37]/50 cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-[#D4AF37]" />
                    <span>Reply Email</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) =>
                      handleStatusClick(e, selectedModalMessage, 'replied')
                    }
                    className="min-h-[42px] px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-semibold text-emerald-300 cursor-pointer"
                  >
                    Mark Replied
                  </button>
                  <button
                    type="button"
                    onClick={(e) =>
                      handleStatusClick(e, selectedModalMessage, 'done')
                    }
                    className="min-h-[42px] px-3.5 py-2 rounded-2xl gold-gradient-btn text-xs font-bold cursor-pointer"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
