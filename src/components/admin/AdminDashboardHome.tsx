import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Crown,
  Flame,
  FolderPlus,
  Inbox,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Receipt,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ContactMessageRecord,
  formatAutoReplyTemplate,
  InvoiceRecord,
  StudioProjectRecord,
  StudioSettings,
} from '../../types';
import {
  buildClientWhatsAppHref,
  computeDashboardMetrics,
  formatGhs,
  formatTimeAgo,
  getInitial,
  getPipelineStageMeta,
  getTopServicesBreakdown,
  getWeeklyMessageCounts,
  normalizePhoneKey,
} from './adminUtils';

interface AdminDashboardHomeProps {
  messages: ContactMessageRecord[];
  projects: StudioProjectRecord[];
  invoices: InvoiceRecord[];
  studioSettings: StudioSettings;
  loadingMessages: boolean;
  onNavigateTab: (
    tab: 'messages' | 'invoices' | 'bookings' | 'clients' | 'projects' | 'settings'
  ) => void;
  onOpenMessageModal: (msg: ContactMessageRecord) => void;
  onOpenNewProjectModal: () => void;
  onOpenBroadcastModal: () => void;
}

export const AdminDashboardHome: React.FC<AdminDashboardHomeProps> = ({
  messages,
  projects,
  invoices,
  studioSettings,
  loadingMessages,
  onNavigateTab,
  onOpenMessageModal,
  onOpenNewProjectModal,
  onOpenBroadcastModal,
}) => {
  const [copiedPublicUrl, setCopiedPublicUrl] = React.useState(false);

  const metrics = computeDashboardMetrics(messages, projects, invoices);
  const weeklyBuckets = getWeeklyMessageCounts(messages);
  const maxWeeklyCount = Math.max(1, ...weeklyBuckets.map((d) => d.count));
  const weeklyTotal = weeklyBuckets.reduce((sum, d) => sum + d.count, 0);
  const topServices = getTopServicesBreakdown(messages);
  const latestFive = messages.slice(0, 5);

  const todayFormatted = new Date().toLocaleDateString('en-GH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleCopyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedPublicUrl(true);
      window.setTimeout(() => setCopiedPublicUrl(false), 2400);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* CEO Hero Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="luxury-card rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
      >
        <div>
          <p className="text-xs font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37] mb-2">
            {todayFormatted}
          </p>
          <h1 className="font-luxury text-2xl sm:text-3xl lg:text-4xl font-bold text-white flex flex-wrap items-center gap-3 leading-tight">
            <span>Welcome Back, CEO Sablaizer</span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFD700]">
              <Crown className="w-5 h-5" />
            </span>
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 mt-2.5">
            {metrics.newMessages === 0 ? (
              <span>All caught up — zero unread client messages waiting.</span>
            ) : (
              <span>
                You have{' '}
                <span className="font-mono-tabular font-bold gold-gradient-text text-lg">
                  {metrics.newMessages}
                </span>{' '}
                new {metrics.newMessages === 1 ? 'message' : 'messages'} waiting
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenNewProjectModal}
            className="haptic-tap gold-gradient-btn px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ New Project</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('invoices')}
            className="haptic-tap px-5 py-3 rounded-2xl bg-white/[0.05] border border-[#D4AF37]/30 text-xs sm:text-sm font-semibold text-white hover:border-[#FFD700] inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Receipt className="w-4 h-4 text-[#D4AF37]" />
            <span>Invoices</span>
          </button>
        </div>
      </motion.div>

      {/* Primary KPI Grid (Total Revenue + Pending Payments + Leads + Clients) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <motion.button
          type="button"
          onClick={() => onNavigateTab('invoices')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04 }}
          className="luxury-card luxury-card-hover rounded-3xl p-6 text-left cursor-pointer border-emerald-500/25"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-neutral-400">
              Total Revenue (Paid Invoices)
            </span>
            <span className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-300">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <p className="font-sora font-mono-tabular text-3xl sm:text-4xl font-bold text-emerald-300 truncate">
            {formatGhs(metrics.totalRevenue)}
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-mono-tabular">
            {metrics.paidInvoiceCount} paid{' '}
            {metrics.paidInvoiceCount === 1 ? 'invoice' : 'invoices'}
          </p>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => onNavigateTab('invoices')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="luxury-card luxury-card-hover rounded-3xl p-6 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-neutral-400">
              Pending Payments (Unpaid)
            </span>
            <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700]">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <p className="font-sora font-mono-tabular text-3xl sm:text-4xl font-bold gold-gradient-text truncate">
            {formatGhs(metrics.pendingPayments)}
          </p>
          <p className="text-xs text-neutral-400 mt-2 font-mono-tabular">
            {metrics.unpaidInvoiceCount} unpaid awaiting MoMo
          </p>
        </motion.button>

        <motion.button
          type="button"
          onClick={() => onNavigateTab('messages')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="luxury-card luxury-card-hover rounded-3xl p-6 text-left cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-neutral-400 inline-flex items-center gap-2">
              <span>New Messages</span>
              {metrics.newMessages > 0 && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"
                  aria-label="Unread inquiries waiting"
                />
              )}
            </span>
            <span className="w-10 h-10 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700]">
              <Inbox className="w-5 h-5" />
            </span>
          </div>
          <p className="font-sora font-mono-tabular text-3xl sm:text-4xl font-bold gold-gradient-text">
            {loadingMessages ? '—' : metrics.newMessages}
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            {metrics.totalMessages} total inquiries · {metrics.clientsServed} unique clients
          </p>
        </motion.button>
      </div>

      {/* Hot Leads (Talking + Quoted) + Weekly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hot Leads Card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="lg:col-span-5 luxury-card rounded-3xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                  Pipeline Focus
                </p>
                <h2 className="font-luxury text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                  <span>Hot Leads ({metrics.hotLeads.length})</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('messages')}
                className="text-xs font-semibold text-[#FFD700] hover:underline cursor-pointer"
              >
                Pipeline →
              </button>
            </div>

            {metrics.hotLeads.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center text-xs text-neutral-400">
                No leads currently in <strong className="text-sky-300">Talking</strong> or{' '}
                <strong className="text-amber-300">Quoted</strong> stages. Move active prospects to Talking/Quoted in Messages to track them here.
              </div>
            ) : (
              <div className="divide-y divide-white/10 max-h-64 overflow-y-auto pr-1">
                {metrics.hotLeads.slice(0, 6).map((lead) => {
                  const stageMeta = getPipelineStageMeta(lead.status);
                  const hasPhone = Boolean(normalizePhoneKey(lead.senderPhone));
                  return (
                    <div
                      key={`${lead.sourceCollection}-${lead.id}`}
                      onClick={() => onOpenMessageModal(lead)}
                      className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.03] px-2 -mx-2 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitial(lead.senderName)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {lead.senderName}
                          </p>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {lead.serviceType} · {lead.budgetTier}
                          </p>
                        </div>
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2 shrink-0"
                      >
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stageMeta.badgeClass}`}
                        >
                          {stageMeta.label}
                        </span>
                        {hasPhone && (
                          <a
                            href={buildClientWhatsAppHref(
                              lead.senderPhone,
                              formatAutoReplyTemplate(
                                studioSettings.autoReplyMessage,
                                lead.senderName,
                                lead.serviceType
                              )
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`WhatsApp ${lead.senderName}`}
                            className="w-8 h-8 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] flex items-center justify-center"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenBroadcastModal}
              className="haptic-tap-sm py-2.5 px-3 rounded-2xl bg-emerald-500/12 border border-emerald-500/35 text-xs font-semibold text-emerald-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Broadcast</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('projects')}
              className="haptic-tap-sm py-2.5 px-3 rounded-2xl bg-white/[0.04] border border-white/12 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Projects ({projects.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37]" />
            </button>
          </div>
        </motion.section>

        {/* Bar Chart: Messages This Week */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="lg:col-span-7 luxury-card rounded-3xl p-6 sm:p-7 flex flex-col justify-between"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                Weekly Velocity
              </p>
              <h2 className="font-luxury text-xl sm:text-2xl font-bold text-white mt-1">
                Messages This Week
              </h2>
            </div>
            <div className="text-right">
              <p className="font-mono-tabular text-xl font-bold gold-gradient-text">
                {weeklyTotal}
              </p>
              <p className="text-[11px] text-neutral-400">Mon – Sun total</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2.5 sm:gap-4 items-end h-52 pt-6 pb-2 border-b border-white/10">
            {weeklyBuckets.map((bucket) => {
              const heightPct =
                bucket.count === 0
                  ? 8
                  : Math.max(18, Math.round((bucket.count / maxWeeklyCount) * 100));
              return (
                <div
                  key={bucket.dayLabel}
                  className="h-full flex flex-col items-center justify-end gap-2"
                >
                  <span className="font-mono-tabular text-xs font-semibold text-[#FFD700]">
                    {bucket.count}
                  </span>
                  <div className="w-full max-w-[42px] h-36 flex items-end justify-center rounded-2xl bg-white/[0.03] p-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className={`w-full rounded-xl ${
                        bucket.count > 0 ? 'luxury-bar-gold' : 'bg-white/10'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 gap-2.5 sm:gap-4 pt-3 text-center">
            {weeklyBuckets.map((bucket) => (
              <span
                key={bucket.dayLabel}
                className={`text-xs font-medium ${
                  bucket.isToday ? 'text-[#FFD700] font-bold' : 'text-neutral-400'
                }`}
              >
                {bucket.dayLabel}
              </span>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Bottom Row: Top Services + Latest Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="lg:col-span-4 luxury-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-luxury text-xl font-bold text-white">
              Top Services
            </h2>
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </div>

          <div className="space-y-4">
            {topServices.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-neutral-200 font-medium">
                    {item.label}
                  </span>
                  <span className="font-mono-tabular text-[#FFD700] font-semibold">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#FFD700]"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Clients Served</span>
            </span>
            <span className="font-mono-tabular font-bold text-white">
              {metrics.clientsServed}
            </span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.28 }}
          className="lg:col-span-8 luxury-card rounded-3xl p-6 sm:p-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                Real-Time Stream
              </p>
              <h2 className="font-luxury text-xl sm:text-2xl font-bold text-white mt-1">
                Latest Messages
              </h2>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigateTab('messages')}
                className="haptic-tap-sm text-xs font-semibold text-[#FFD700] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>See full inbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loadingMessages ? (
            <div className="space-y-3">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="h-16 rounded-2xl bg-white/[0.04] animate-pulse"
                />
              ))}
            </div>
          ) : latestFive.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.03] border border-[#D4AF37]/20 p-8 text-center">
              <p className="font-luxury text-lg font-semibold text-white mb-2">
                No messages yet, CEO. Share your link.
              </p>
              <p className="text-xs text-neutral-400 mb-5">
                Client briefs submitted from your public website appear here live in real time.
              </p>
              <button
                type="button"
                onClick={handleCopyPublicLink}
                className="haptic-tap gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                {copiedPublicUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Website Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Website Link</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {latestFive.map((msg) => {
                const badge = getPipelineStageMeta(msg.status);
                return (
                  <button
                    key={`${msg.sourceCollection}-${msg.id}`}
                    type="button"
                    onClick={() => onOpenMessageModal(msg)}
                    className="w-full py-3.5 px-2 sm:px-3 -mx-2 sm:-mx-3 rounded-2xl hover:bg-white/[0.04] transition-colors flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-sm flex items-center justify-center shrink-0">
                        {getInitial(msg.senderName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {msg.senderName}
                        </p>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {msg.serviceType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline font-mono-tabular text-xs text-neutral-400">
                        {formatTimeAgo(msg.createdAt)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold ${badge.badgeClass}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};
