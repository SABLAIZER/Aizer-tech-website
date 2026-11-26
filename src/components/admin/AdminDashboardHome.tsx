import React from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Copy,
  Crown,
  Eye,
  Flame,
  FolderPlus,
  Globe,
  Inbox,
  Megaphone,
  MessageCircle,
  Monitor,
  Receipt,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ContactMessageRecord,
  formatAutoReplyTemplate,
  InvoiceRecord,
  RegisteredUserRecord,
  StudioProjectRecord,
  StudioSettings,
  VisitRecord,
} from '../../types';
import {
  buildClientWhatsAppHref,
  computeDashboardMetrics,
  formatFullDateTime,
  formatGhs,
  formatTimeAgo,
  getInitial,
  getLast7DaysUserGrowthBuckets,
  getLast7DaysVisitorBuckets,
  getPipelineStageMeta,
  getTopServicesBreakdown,
  getVisitorAnalytics,
  getWeeklyMessageCounts,
  normalizePhoneKey,
} from './adminUtils';

interface AdminDashboardHomeProps {
  messages: ContactMessageRecord[];
  projects: StudioProjectRecord[];
  invoices: InvoiceRecord[];
  visits: VisitRecord[];
  registeredUsers: RegisteredUserRecord[];
  studioSettings: StudioSettings;
  loadingMessages: boolean;
  loadingAnalytics?: boolean;
  onNavigateTab: (
    tab:
      | 'messages'
      | 'invoices'
      | 'bookings'
      | 'prices'
      | 'clients'
      | 'projects'
      | 'users'
      | 'settings'
  ) => void;
  onOpenMessageModal: (msg: ContactMessageRecord) => void;
  onOpenNewProjectModal: () => void;
  onOpenBroadcastModal: () => void;
}

export const AdminDashboardHome: React.FC<AdminDashboardHomeProps> = ({
  messages,
  projects,
  invoices,
  visits,
  registeredUsers,
  studioSettings,
  loadingMessages,
  loadingAnalytics = false,
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

  // Visitor & User Analytics
  const analytics = getVisitorAnalytics(visits, registeredUsers);
  const visitor7Days = getLast7DaysVisitorBuckets(visits);
  const maxDailyVisitors = Math.max(1, ...visitor7Days.map((d) => d.count));
  const userGrowth7Days = getLast7DaysUserGrowthBuckets(registeredUsers);
  const maxGrowthVal = Math.max(
    1,
    ...userGrowth7Days.map((b) => b.cumulativeTotal)
  );
  const latestVisitors = visits.slice(0, 6);
  const latestRegisteredUsers = registeredUsers.slice(0, 6);

  // Build SVG polyline points for Registered Users Growth chart
  const svgW = 320;
  const svgH = 128;
  const padX = 14;
  const padY = 14;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;
  const growthPoints = userGrowth7Days.map((bucket, idx) => {
    const x =
      userGrowth7Days.length <= 1
        ? svgW / 2
        : padX + (idx / (userGrowth7Days.length - 1)) * plotW;
    const y =
      padY + plotH - (bucket.cumulativeTotal / maxGrowthVal) * plotH;
    return { x, y, bucket };
  });
  const linePathD = growthPoints
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const areaPathD =
    growthPoints.length > 0
      ? `${linePathD} L ${growthPoints[growthPoints.length - 1].x.toFixed(1)} ${(
          svgH - padY
        ).toFixed(1)} L ${growthPoints[0].x.toFixed(1)} ${(svgH - padY).toFixed(1)} Z`
      : '';

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
          <button
            type="button"
            onClick={() => onNavigateTab('prices')}
            className="haptic-tap gold-gradient-btn px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <span>💰 Prices</span>
          </button>
        </div>
      </motion.div>

      {/* WEBSITE ANALYTICS (Real-Time Firestore Visits & Registered Users) */}
      <section aria-labelledby="website-analytics-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              Real-Time Traffic &amp; Auth Funnel
            </p>
            <h2
              id="website-analytics-heading"
              className="font-luxury text-xl sm:text-2xl font-bold text-white mt-0.5 flex items-center gap-2"
            >
              <span>Website Analytics</span>
              <Globe className="w-4 h-4 text-[#D4AF37]" />
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="text-xs font-semibold text-[#FFD700] hover:underline cursor-pointer"
          >
            All Registered Users ({analytics.registeredUsersCount}) →
          </button>
        </div>

        {/* 5 Analytics Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="luxury-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-400">
                Total Visitors (All Time)
              </span>
              <span className="w-9 h-9 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700]">
                <Eye className="w-4 h-4" />
              </span>
            </div>
            <p className="font-sora font-mono-tabular text-3xl font-bold gold-gradient-text">
              {loadingAnalytics ? '—' : analytics.totalVisitors}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Unique daily visits recorded
            </p>
          </div>

          <div className="luxury-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-400">
                Visitors Today
              </span>
              <span className="w-9 h-9 rounded-2xl bg-sky-500/15 border border-sky-500/35 flex items-center justify-center text-sky-300">
                <Activity className="w-4 h-4" />
              </span>
            </div>
            <p className="font-sora font-mono-tabular text-3xl font-bold text-white">
              {loadingAnalytics ? '—' : analytics.visitorsToday}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Deduplicated by device &amp; IP
            </p>
          </div>

          <div className="luxury-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-400">
                Visitors This Week
              </span>
              <span className="w-9 h-9 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700]">
                <Globe className="w-4 h-4" />
              </span>
            </div>
            <p className="font-sora font-mono-tabular text-3xl font-bold text-white">
              {loadingAnalytics ? '—' : analytics.visitorsThisWeek}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Rolling last 7 days
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('users')}
            className="luxury-card luxury-card-hover rounded-3xl p-5 text-left cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-400">
                Registered Users
              </span>
              <span className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-300">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>
            <p className="font-sora font-mono-tabular text-3xl font-bold text-emerald-300">
              {loadingAnalytics ? '—' : analytics.registeredUsersCount}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              Total Google logins
            </p>
          </button>

          <div className="luxury-card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-neutral-400">
                Conversion Rate
              </span>
              <span className="w-9 h-9 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 flex items-center justify-center text-[#FFD700]">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <p className="font-sora font-mono-tabular text-3xl font-bold gold-gradient-text">
              {loadingAnalytics ? '—' : `${analytics.conversionRatePct}%`}
            </p>
            <p className="text-[11px] text-neutral-400 mt-1.5">
              {analytics.conversionRatePct}% of visitors login
            </p>
          </div>
        </div>

        {/* Analytics Charts Row: Chart 1 (Gold Bar Chart) + Chart 2 (SVG Line Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 luxury-card rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                  Chart 1 · Daily Reach
                </p>
                <h3 className="font-luxury text-lg sm:text-xl font-bold text-white mt-0.5">
                  Visitors Per Day (Last 7 Days)
                </h3>
              </div>
              <span className="font-mono-tabular text-sm font-bold gold-gradient-text">
                {analytics.visitorsThisWeek} visits
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2.5 items-end h-40 pt-4 pb-2 border-b border-white/10">
              {visitor7Days.map((bucket) => {
                const heightPct =
                  bucket.count === 0
                    ? 8
                    : Math.max(18, Math.round((bucket.count / maxDailyVisitors) * 100));
                return (
                  <div
                    key={bucket.dateKey}
                    className="h-full flex flex-col items-center justify-end gap-1.5"
                  >
                    <span className="font-mono-tabular text-[11px] font-semibold text-[#FFD700]">
                      {bucket.count}
                    </span>
                    <div className="w-full max-w-[38px] h-28 flex items-end justify-center rounded-xl bg-white/[0.03] p-1">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className={`w-full rounded-lg ${
                          bucket.count > 0 ? 'luxury-bar-gold' : 'bg-white/10'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 gap-2.5 pt-2.5 text-center">
              {visitor7Days.map((bucket) => (
                <span
                  key={bucket.dateKey}
                  className={`text-[11px] font-medium ${
                    bucket.isToday ? 'text-[#FFD700] font-bold' : 'text-neutral-400'
                  }`}
                >
                  {bucket.label}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 luxury-card rounded-3xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                  Chart 2 · Account Signups
                </p>
                <h3 className="font-luxury text-lg sm:text-xl font-bold text-white mt-0.5">
                  Registered Users Growth
                </h3>
              </div>
              <span className="font-mono-tabular text-sm font-bold text-emerald-300">
                {analytics.registeredUsersCount} total
              </span>
            </div>

            <div className="w-full h-40 pt-2">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-full overflow-visible"
                role="img"
                aria-label="Registered users cumulative growth over the last 7 days"
              >
                <defs>
                  <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD700" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line
                  x1={padX}
                  y1={svgH - padY}
                  x2={svgW - padX}
                  y2={svgH - padY}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
                {areaPathD && <path d={areaPathD} fill="url(#userGrowthFill)" />}
                {linePathD && (
                  <path
                    d={linePathD}
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {growthPoints.map((pt) => (
                  <g key={pt.bucket.dateKey}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      fill="#0A0A0A"
                      stroke="#FFD700"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 9}
                      textAnchor="middle"
                      fill="#FFD700"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {pt.bucket.cumulativeTotal}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="grid grid-cols-7 gap-2.5 pt-2.5 text-center border-t border-white/10">
              {userGrowth7Days.map((bucket) => (
                <span key={bucket.dateKey} className="text-[11px] text-neutral-400">
                  {bucket.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics Tables Row: Table 1 (Latest Visitors) + Table 2 (Latest Registered Users) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 luxury-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                  Table 1 · Public Traffic
                </p>
                <h3 className="font-luxury text-lg font-bold text-white mt-0.5">
                  Latest Visitors
                </h3>
              </div>
              <span className="font-mono-tabular text-xs text-neutral-400">
                {visits.length} total
              </span>
            </div>

            {latestVisitors.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center text-xs text-neutral-400">
                No public visits tracked yet. Public visits appear here automatically (admin visits excluded).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-neutral-400">
                      <th className="pb-2.5 font-medium">Time</th>
                      <th className="pb-2.5 font-medium">Page</th>
                      <th className="pb-2.5 font-medium">Device</th>
                      <th className="pb-2.5 font-medium text-right">Country</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {latestVisitors.map((v) => (
                      <tr key={v.id} className="text-neutral-200">
                        <td className="py-2.5 font-mono-tabular whitespace-nowrap">
                          {v.dateKey} · {v.timeLabel}
                        </td>
                        <td className="py-2.5 font-medium text-[#FFD700]">
                          {v.pageVisited}
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1">
                            {v.device === 'Mobile' ? (
                              <Smartphone className="w-3.5 h-3.5 text-sky-300" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-[#D4AF37]" />
                            )}
                            <span>{v.device}</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-neutral-400">
                          {v.country || 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="lg:col-span-6 luxury-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                  Table 2 · Google Logins
                </p>
                <h3 className="font-luxury text-lg font-bold text-white mt-0.5">
                  Latest Registered Users
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('users')}
                className="text-xs font-semibold text-[#FFD700] hover:underline cursor-pointer"
              >
                View all →
              </button>
            </div>

            {latestRegisteredUsers.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center text-xs text-neutral-400">
                No registered users yet. Clients who continue with Google appear here immediately.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {latestRegisteredUsers.map((u) => (
                  <div
                    key={u.uid}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {u.photoUrl ? (
                        <img
                          src={u.photoUrl}
                          alt={u.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/45 shrink-0"
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitial(u.name)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {u.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-neutral-400 shrink-0">
                      {formatFullDateTime(u.firstLoginAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

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
