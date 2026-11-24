import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Check,
  Columns3,
  Copy,
  FilePlus2,
  List,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
  Search,
  Send,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ContactMessageRecord,
  formatAutoReplyTemplate,
  LEAD_PIPELINE_STAGES,
  LeadPipelineStage,
  MessageStatus,
  StudioSettings,
} from '../../types';
import { InvoiceDraftSeed } from './AdminInvoicesView';
import {
  buildClientWhatsAppHref,
  formatFullDateTime,
  formatTimeAgo,
  getInitial,
  getPipelineStageMeta,
  getTimestampMs,
  normalizePhoneKey,
  normalizePipelineStage,
} from './adminUtils';

type FilterTab = 'all' | LeadPipelineStage;
type SortOrder = 'newest' | 'oldest';
type ViewMode = 'list' | 'kanban';

interface AdminMessagesViewProps {
  messages: ContactMessageRecord[];
  loadingMessages: boolean;
  studioSettings: StudioSettings;
  initialSearch?: string;
  selectedModalMessage: ContactMessageRecord | null;
  onSelectModalMessage: (msg: ContactMessageRecord | null) => void;
  onUpdateStatus: (msg: ContactMessageRecord, nextStatus: MessageStatus) => Promise<void>;
  onSaveAdminNote: (msg: ContactMessageRecord, note: string) => Promise<void>;
  onCreateInvoiceFromMessage: (seed: InvoiceDraftSeed) => void;
  onDeleteMessage: (msg: ContactMessageRecord) => Promise<void>;
  hasGmailToken: boolean;
  onSendGmail: (
    msg: ContactMessageRecord,
    subject: string,
    body: string
  ) => Promise<void>;
}

export const AdminMessagesView: React.FC<AdminMessagesViewProps> = ({
  messages,
  loadingMessages,
  studioSettings,
  initialSearch = '',
  selectedModalMessage,
  onSelectModalMessage,
  onUpdateStatus,
  onSaveAdminNote,
  onCreateInvoiceFromMessage,
  onDeleteMessage,
  hasGmailToken,
  onSendGmail,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);

  // Private note draft inside modal
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

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

  React.useEffect(() => {
    if (selectedModalMessage) {
      setNoteDraft(selectedModalMessage.adminNote || '');
      setNoteSavedFeedback(false);
    }
  }, [selectedModalMessage]);

  const stageCounts = useMemo(() => {
    const map: Record<FilterTab, number> = {
      all: messages.length,
      new: 0,
      talking: 0,
      quoted: 0,
      paid: 0,
      done: 0,
      lost: 0,
    };
    for (const msg of messages) {
      const stage = normalizePipelineStage(msg.status);
      map[stage] += 1;
    }
    return map;
  }, [messages]);

  const visibleMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = messages.filter((m) => {
      const stage = normalizePipelineStage(m.status);
      if (filterTab !== 'all' && stage !== filterTab) return false;
      if (!q) return true;
      return (
        m.senderName.toLowerCase().includes(q) ||
        m.senderPhone.toLowerCase().includes(q) ||
        m.senderEmail.toLowerCase().includes(q) ||
        m.serviceType.toLowerCase().includes(q) ||
        (m.adminNote || '').toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const diff = getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt);
      return sortOrder === 'newest' ? diff : -diff;
    });
  }, [messages, searchTerm, filterTab, sortOrder]);

  const openModal = (msg: ContactMessageRecord) => {
    onSelectModalMessage(msg);
    setNoteDraft(msg.adminNote || '');
    setNoteSavedFeedback(false);
    setEmailComposerOpen(false);
    setEmailNotice(null);
    setReplySubject(`Re: Your ${msg.serviceType} inquiry — Aizer Tech`);
    setReplyBody(
      `${formatAutoReplyTemplate(
        studioSettings.autoReplyMessage,
        msg.senderName,
        msg.serviceType
      )}\n\nPlease reply with any extra details or let us know a good time to chat.\n\nBest regards,\nSablaizer (Evans Kwaku Sablah)\nCEO, AizerTech GH · Accra`
    );
  };

  const handleStageChange = async (
    msg: ContactMessageRecord,
    nextStage: LeadPipelineStage
  ) => {
    const key = `${msg.sourceCollection}:${msg.id}`;
    setBusyId(key);
    try {
      await onUpdateStatus(msg, nextStage);
      if (selectedModalMessage?.id === msg.id) {
        onSelectModalMessage({ ...msg, status: nextStage });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveNoteSubmit = async () => {
    if (!selectedModalMessage) return;
    setSavingNote(true);
    setNoteSavedFeedback(false);
    try {
      await onSaveAdminNote(selectedModalMessage, noteDraft.trim());
      onSelectModalMessage({
        ...selectedModalMessage,
        adminNote: noteDraft.trim(),
      });
      setNoteSavedFeedback(true);
      window.setTimeout(() => setNoteSavedFeedback(false), 2500);
    } finally {
      setSavingNote(false);
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
        text: `Email delivered to ${selectedModalMessage.senderEmail} and moved to Talking.`,
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

  const triggerCreateInvoice = (
    e: React.MouseEvent,
    msg: ContactMessageRecord
  ) => {
    e.stopPropagation();
    onCreateInvoiceFromMessage({
      clientName: msg.senderName,
      clientPhone: msg.senderPhone,
      clientEmail: msg.senderEmail,
      service: msg.serviceType,
      description: `${msg.serviceType} (${msg.budgetTier}) — ${msg.message.slice(
        0,
        140
      )}`,
      sourceMessageId: msg.id,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Search, Pipeline Stage Filter, Sort & List/Kanban Toggle */}
      <div className="luxury-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              Lead Pipeline &amp; Client Inbox
            </p>
            <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
              Messages ({messages.length})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px] sm:w-64">
              <Search className="w-4 h-4 text-[#D4AF37]/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, notes..."
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

            <div className="inline-flex rounded-2xl bg-[#0A0A0A] border border-white/12 p-1">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'list'
                    ? 'gold-gradient-btn'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'gold-gradient-btn'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
              }
              className="haptic-tap-sm min-h-[42px] px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/50 inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Pipeline Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`haptic-tap-sm min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
              filterTab === 'all'
                ? 'gold-gradient-btn'
                : 'bg-white/[0.04] border border-white/10 text-neutral-300 hover:text-white'
            }`}
          >
            All ({stageCounts.all})
          </button>

          {LEAD_PIPELINE_STAGES.map((stage) => {
            const active = filterTab === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setFilterTab(stage.id)}
                className={`haptic-tap-sm min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                  active ? 'gold-gradient-btn' : stage.badgeClass
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    active ? 'bg-[#0A0A0A]' : stage.dotClass
                  }`}
                />
                <span>
                  {stage.label} ({stageCounts[stage.id]})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading / Empty */}
      {loadingMessages ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-white/[0.04] animate-pulse" />
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
      ) : viewMode === 'kanban' ? (
        /* KANBAN PIPELINE VIEW */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_PIPELINE_STAGES.map((stage) => {
            const stageItems = visibleMessages.filter(
              (m) => normalizePipelineStage(m.status) === stage.id
            );
            return (
              <div
                key={stage.id}
                className="min-w-[290px] w-[290px] shrink-0 rounded-3xl bg-[#0F0F12]/90 border border-white/10 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${stage.badgeClass}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${stage.dotClass}`} />
                    <span>{stage.label}</span>
                  </span>
                  <span className="font-mono-tabular text-xs font-semibold text-neutral-400">
                    {stageItems.length}
                  </span>
                </div>

                {stageItems.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-8">
                    No leads in {stage.label}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stageItems.map((msg) => {
                      const phoneDigits = normalizePhoneKey(msg.senderPhone);
                      const autoDraft = formatAutoReplyTemplate(
                        studioSettings.autoReplyMessage,
                        msg.senderName,
                        msg.serviceType
                      );
                      return (
                        <div
                          key={`${msg.sourceCollection}-${msg.id}`}
                          onClick={() => openModal(msg)}
                          className={`rounded-2xl bg-[#141418] border p-4 space-y-2.5 cursor-pointer hover:border-[#D4AF37]/50 transition-colors ${stage.accentBorderClass}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-white truncate">
                              {msg.senderName}
                            </p>
                            <span className="font-mono-tabular text-[10px] text-neutral-400 shrink-0">
                              {formatTimeAgo(msg.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-[#FFD700] font-medium truncate">
                            {msg.serviceType}
                          </p>
                          <p className="font-mono-tabular text-[11px] text-neutral-300">
                            {msg.budgetTier}
                          </p>

                          {msg.adminNote && (
                            <p className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-2.5 py-1.5 line-clamp-2">
                              Note: {msg.adminNote}
                            </p>
                          )}

                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="pt-2 border-t border-white/10 space-y-2"
                          >
                            <select
                              aria-label="Pipeline stage"
                              value={normalizePipelineStage(msg.status)}
                              onChange={(e) =>
                                handleStageChange(
                                  msg,
                                  e.target.value as LeadPipelineStage
                                )
                              }
                              className="w-full rounded-xl bg-[#0A0A0A] border border-white/12 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                            >
                              {LEAD_PIPELINE_STAGES.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  Move: {opt.label}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-1.5">
                              {phoneDigits && (
                                <a
                                  href={buildClientWhatsAppHref(
                                    msg.senderPhone,
                                    autoDraft
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-[11px] font-semibold text-[#25D366] text-center"
                                >
                                  WhatsApp
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={(e) => triggerCreateInvoice(e, msg)}
                                className="flex-1 py-1.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[11px] font-semibold text-[#FFD700] cursor-pointer"
                              >
                                Invoice
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : visibleMessages.length === 0 ? (
        <div className="luxury-card rounded-3xl p-8 text-center">
          <p className="text-sm text-neutral-300 mb-4">
            No messages match your current search or stage filter.
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
        /* LIST VIEW */
        <div className="space-y-4">
          {visibleMessages.map((msg, idx) => {
            const key = `${msg.sourceCollection}:${msg.id}`;
            const phoneDigits = normalizePhoneKey(msg.senderPhone);
            const stageMeta = getPipelineStageMeta(msg.status);
            const isBusy = busyId === key;
            const autoDraft = formatAutoReplyTemplate(
              studioSettings.autoReplyMessage,
              msg.senderName,
              msg.serviceType
            );

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
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5 ${stageMeta.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${stageMeta.dotClass}`}
                          />
                          <span>{stageMeta.label}</span>
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

                {/* Full Message Body + Private Note */}
                <div className="py-4 space-y-3">
                  <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </p>

                  {msg.adminNote && (
                    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 flex items-start gap-2 text-xs text-amber-200">
                      <StickyNote className="w-3.5 h-3.5 text-[#FFD700] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#FFD700]">CEO Note:</strong>{' '}
                        {msg.adminNote}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-white/10"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => triggerCreateInvoice(e, msg)}
                      className="haptic-tap-sm min-h-[40px] gold-gradient-btn inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>Create Invoice</span>
                    </button>

                    {phoneDigits && (
                      <>
                        <a
                          href={buildClientWhatsAppHref(msg.senderPhone, autoDraft)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            if (msg.status === 'new') {
                              void handleStageChange(msg, 'talking');
                            }
                          }}
                          className="haptic-tap-sm min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/25"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Reply</span>
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

                    {/* Pipeline Stage Selector */}
                    <select
                      aria-label="Pipeline stage"
                      disabled={isBusy}
                      value={normalizePipelineStage(msg.status)}
                      onChange={(e) =>
                        handleStageChange(msg, e.target.value as LeadPipelineStage)
                      }
                      className="min-h-[40px] rounded-xl bg-[#0A0A0A] border border-white/15 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                    >
                      {LEAD_PIPELINE_STAGES.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          Stage: {stage.label}
                        </option>
                      ))}
                    </select>
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

      {/* Full Message Details + Private Notes + Pipeline Stage Modal */}
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

            {/* Pipeline Stage Strip */}
            <div className="space-y-2">
              <p className="text-[11px] font-mono-tabular uppercase tracking-wider text-neutral-400">
                Lead Pipeline Stage
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_PIPELINE_STAGES.map((stage) => {
                  const active =
                    normalizePipelineStage(selectedModalMessage.status) === stage.id;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() =>
                        handleStageChange(selectedModalMessage, stage.id)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                        active ? 'gold-gradient-btn' : stage.badgeClass
                      }`}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
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

            {/* Private CEO Notes */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-[#D4AF37]/25 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="ceo-private-note"
                  className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#FFD700] inline-flex items-center gap-1.5"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Private CEO Note</span>
                </label>
                {noteSavedFeedback && (
                  <span className="text-[11px] text-emerald-300 font-semibold">
                    Note saved
                  </span>
                )}
              </div>
              <textarea
                id="ceo-private-note"
                rows={2}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder='e.g. "Client wants app in 2 weeks, budget 3000"'
                className="w-full rounded-xl bg-[#121215] border border-white/12 px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={savingNote}
                  onClick={handleSaveNoteSubmit}
                  className="min-h-[36px] px-4 py-1.5 rounded-xl bg-white/[0.06] border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/15 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {savingNote ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Private Note</span>
                </button>
              </div>
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
                  <button
                    type="button"
                    onClick={(e) => {
                      onSelectModalMessage(null);
                      triggerCreateInvoice(e, selectedModalMessage);
                    }}
                    className="min-h-[42px] gold-gradient-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    <span>Create Invoice</span>
                  </button>

                  {normalizePhoneKey(selectedModalMessage.senderPhone) && (
                    <>
                      <a
                        href={buildClientWhatsAppHref(
                          selectedModalMessage.senderPhone,
                          formatAutoReplyTemplate(
                            studioSettings.autoReplyMessage,
                            selectedModalMessage.senderName,
                            selectedModalMessage.serviceType
                          )
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Auto-Reply WhatsApp</span>
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
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};
