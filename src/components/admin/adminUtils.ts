import {
  ContactMessageRecord,
  InvoiceRecord,
  LEAD_PIPELINE_STAGES,
  LeadPipelineStage,
  MessageStatus,
  RegisteredUserRecord,
  StudioProjectRecord,
  StudioSettings,
  VisitRecord,
} from '../../types';

export function getTimestampMs(
  ts?: { seconds: number; nanoseconds: number } | null
): number {
  if (!ts || typeof ts.seconds !== 'number') return 0;
  return ts.seconds * 1000;
}

export function formatTimeAgo(
  ts?: { seconds: number; nanoseconds: number } | null
): string {
  const ms = getTimestampMs(ts);
  if (!ms) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(ms).toLocaleDateString('en-GH', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatFullDateTime(
  ts?: { seconds: number; nanoseconds: number } | null
): string {
  const ms = getTimestampMs(ts);
  if (!ms) return 'Just now';
  return new Date(ms).toLocaleString('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatGhs(amount: number): string {
  const rounded = Math.round(amount);
  return `GHS ${rounded.toLocaleString('en-GH')}`;
}

export function getInitial(name?: string): string {
  const clean = (name || '').trim();
  return clean ? clean.charAt(0).toUpperCase() : 'A';
}

export function normalizePhoneKey(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 7) return '';
  if (digits.startsWith('0') && digits.length === 10) {
    return `233${digits.slice(1)}`;
  }
  return digits;
}

export function buildClientWhatsAppHref(phone: string, message: string): string {
  const digits = normalizePhoneKey(phone);
  if (!digits) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function normalizePipelineStage(status: MessageStatus): LeadPipelineStage {
  if (
    status === 'new' ||
    status === 'talking' ||
    status === 'quoted' ||
    status === 'paid' ||
    status === 'done' ||
    status === 'lost'
  ) {
    return status;
  }
  if (status === 'replied' || status === 'reviewed') {
    return 'talking';
  }
  return 'done';
}

export function getPipelineStageMeta(status: MessageStatus) {
  const stage = normalizePipelineStage(status);
  return (
    LEAD_PIPELINE_STAGES.find((s) => s.id === stage) || LEAD_PIPELINE_STAGES[0]
  );
}

export function getNextInvoiceNumber(invoices: InvoiceRecord[]): string {
  let maxNum = 0;
  for (const inv of invoices) {
    const match = /AT-(\d+)/i.exec(inv.invoiceNumber || '');
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  const next = Math.max(maxNum + 1, invoices.length + 1);
  return `AT-${String(next).padStart(3, '0')}`;
}

export function buildInvoiceWhatsAppMessage(
  invoice: InvoiceRecord,
  settings: StudioSettings
): string {
  const amountStr = formatGhs(invoice.amountGhs);
  const momoNum = settings.momoNumber || '027 633 5736';
  const momoName = settings.momoName || 'AizerTech GH';

  return [
    `*AIZERTECH GH — OFFICIAL INVOICE*`,
    `Invoice No: *${invoice.invoiceNumber}*`,
    `Date: ${invoice.invoiceDate}`,
    `Status: ${invoice.status === 'paid' ? 'PAID' : 'UNPAID'}`,
    ``,
    `Client: ${invoice.clientName}`,
    `Service: ${invoice.service}`,
    `Description: ${invoice.description}`,
    `Amount Due: *${amountStr}*`,
    ``,
    `*PAYMENT DETAILS:*`,
    `Pay via MTN MoMo / Telecel Cash to: *${momoNum}*`,
    `Account Name: *${momoName}*`,
    `Send screenshot after payment so we proceed immediately.`,
    ``,
    `Thank you for choosing AizerTech!`,
  ].join('\n');
}

export interface DayBucket {
  dayLabel: string;
  count: number;
  isToday: boolean;
}

export function getWeeklyMessageCounts(
  messages: ContactMessageRecord[]
): DayBucket[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const now = new Date();
  const jsDay = now.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  const mondayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset,
    0,
    0,
    0,
    0
  );
  const mondayMs = mondayStart.getTime();
  const sundayEndMs = mondayMs + 7 * 24 * 60 * 60 * 1000;
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;

  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const msg of messages) {
    const ms = getTimestampMs(msg.createdAt);
    if (ms >= mondayMs && ms < sundayEndMs) {
      const d = new Date(ms).getDay();
      const idx = d === 0 ? 6 : d - 1;
      counts[idx] += 1;
    }
  }

  return labels.map((dayLabel, idx) => ({
    dayLabel,
    count: counts[idx],
    isToday: idx === todayIdx,
  }));
}

export interface ServiceBreakdownItem {
  label: string;
  count: number;
  percentage: number;
}

export function getTopServicesBreakdown(
  messages: ContactMessageRecord[]
): ServiceBreakdownItem[] {
  let appCount = 0;
  let webCount = 0;
  let logoDesignCount = 0;

  for (const msg of messages) {
    const s = (msg.serviceType || '').toLowerCase();
    if (s.includes('app') || s.includes('food') || s.includes('mobile')) {
      appCount += 1;
    } else if (s.includes('web') || s.includes('site') || s.includes('portal')) {
      webCount += 1;
    } else {
      logoDesignCount += 1;
    }
  }

  const total = Math.max(1, messages.length);
  const buckets: ServiceBreakdownItem[] = [
    {
      label: 'App & Food Platform',
      count: appCount,
      percentage: messages.length ? Math.round((appCount / total) * 100) : 0,
    },
    {
      label: 'Business Website',
      count: webCount,
      percentage: messages.length ? Math.round((webCount / total) * 100) : 0,
    },
    {
      label: 'Logo, UI/UX & Branding',
      count: logoDesignCount,
      percentage: messages.length ? Math.round((logoDesignCount / total) * 100) : 0,
    },
  ];

  return buckets.sort((a, b) => b.count - a.count);
}

export interface DerivedClient {
  key: string;
  name: string;
  phone: string;
  email: string;
  messageCount: number;
  lastMessage: string;
  lastService: string;
  lastBudget: string;
  lastStage: LeadPipelineStage;
  lastNote: string;
  lastContactAt: { seconds: number; nanoseconds: number } | null;
  lastContactMs: number;
  services: string[];
}

export function deriveClientsFromMessages(
  messages: ContactMessageRecord[]
): DerivedClient[] {
  const map = new Map<string, DerivedClient>();
  const sorted = [...messages].sort(
    (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)
  );

  for (const msg of sorted) {
    const phoneKey = normalizePhoneKey(msg.senderPhone);
    const emailKey = (msg.senderEmail || '').trim().toLowerCase();
    const key = phoneKey || emailKey || msg.id;
    const msgMs = getTimestampMs(msg.createdAt);

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        name: msg.senderName || 'Unnamed Client',
        phone: msg.senderPhone || '',
        email: msg.senderEmail || '',
        messageCount: 1,
        lastMessage: msg.message,
        lastService: msg.serviceType || 'Project Inquiry',
        lastBudget: msg.budgetTier || 'Custom',
        lastStage: normalizePipelineStage(msg.status),
        lastNote: msg.adminNote || '',
        lastContactAt: msg.createdAt ?? null,
        lastContactMs: msgMs,
        services: msg.serviceType ? [msg.serviceType] : [],
      });
    } else {
      existing.messageCount += 1;
      if (!existing.phone && msg.senderPhone) existing.phone = msg.senderPhone;
      if (!existing.email && msg.senderEmail) existing.email = msg.senderEmail;
      if (!existing.lastNote && msg.adminNote) existing.lastNote = msg.adminNote;
      if (msg.serviceType && !existing.services.includes(msg.serviceType)) {
        existing.services.push(msg.serviceType);
      }
      if (msgMs > existing.lastContactMs) {
        existing.lastContactMs = msgMs;
        existing.lastContactAt = msg.createdAt ?? null;
        existing.lastMessage = msg.message;
        existing.lastService = msg.serviceType || existing.lastService;
        existing.lastBudget = msg.budgetTier || existing.lastBudget;
        existing.lastStage = normalizePipelineStage(msg.status);
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.lastContactMs - a.lastContactMs
  );
}

export function computeDashboardMetrics(
  messages: ContactMessageRecord[],
  projects: StudioProjectRecord[],
  invoices: InvoiceRecord[] = []
) {
  const totalMessages = messages.length;
  const newMessages = messages.filter((m) => m.status === 'new').length;
  const hotLeads = messages.filter((m) => {
    const stage = normalizePipelineStage(m.status);
    return stage === 'talking' || stage === 'quoted';
  });

  const uniquePhones = new Set<string>();
  for (const msg of messages) {
    const p = normalizePhoneKey(msg.senderPhone);
    if (p) uniquePhones.add(p);
  }

  const doneProjects = projects.filter((p) => p.status === 'done');
  const doneCount = doneProjects.length;
  const totalDoneSum = doneProjects.reduce(
    (sum, p) => sum + (Number.isFinite(p.amountGhs) ? p.amountGhs : 0),
    0
  );
  const averageDonePrice = doneCount > 0 ? totalDoneSum / doneCount : 0;
  const estimatedRevenue = doneCount * averageDonePrice;

  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const unpaidInvoices = invoices.filter((i) => i.status === 'unpaid');
  const totalRevenue = paidInvoices.reduce(
    (sum, i) => sum + (Number.isFinite(i.amountGhs) ? i.amountGhs : 0),
    0
  );
  const pendingPayments = unpaidInvoices.reduce(
    (sum, i) => sum + (Number.isFinite(i.amountGhs) ? i.amountGhs : 0),
    0
  );

  return {
    totalMessages,
    newMessages,
    hotLeads,
    clientsServed: uniquePhones.size,
    doneCount,
    averageDonePrice,
    estimatedRevenue,
    paidInvoiceCount: paidInvoices.length,
    unpaidInvoiceCount: unpaidInvoices.length,
    totalRevenue,
    pendingPayments,
  };
}

export function formatDateKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface VisitorAnalyticsSummary {
  totalVisitors: number;
  visitorsToday: number;
  visitorsThisWeek: number;
  registeredUsersCount: number;
  conversionRatePct: number;
}

export function getVisitorAnalytics(
  visits: VisitRecord[],
  users: RegisteredUserRecord[]
): VisitorAnalyticsSummary {
  const now = new Date();
  const todayKey = formatDateKeyLocal(now);

  const last7Keys = new Set<string>();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    last7Keys.add(formatDateKeyLocal(d));
  }

  const totalVisitors = visits.length;
  const visitorsToday = visits.filter((v) => v.dateKey === todayKey).length;
  const visitorsThisWeek = visits.filter((v) => last7Keys.has(v.dateKey)).length;
  const registeredUsersCount = users.length;
  const conversionRatePct =
    totalVisitors > 0
      ? Math.min(100, Math.round((registeredUsersCount / totalVisitors) * 100))
      : 0;

  return {
    totalVisitors,
    visitorsToday,
    visitorsThisWeek,
    registeredUsersCount,
    conversionRatePct,
  };
}

export interface VisitorDayBucket {
  dateKey: string;
  label: string;
  count: number;
  isToday: boolean;
}

export function getLast7DaysVisitorBuckets(
  visits: VisitRecord[]
): VisitorDayBucket[] {
  const now = new Date();
  const todayKey = formatDateKeyLocal(now);
  const counts = new Map<string, number>();

  for (const visit of visits) {
    if (visit.dateKey) {
      counts.set(visit.dateKey, (counts.get(visit.dateKey) || 0) + 1);
    }
  }

  const result: VisitorDayBucket[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = formatDateKeyLocal(d);
    const label = d.toLocaleDateString('en-GH', { weekday: 'short' });
    result.push({
      dateKey: key,
      label,
      count: counts.get(key) || 0,
      isToday: key === todayKey,
    });
  }
  return result;
}

export interface UserGrowthBucket {
  dateKey: string;
  label: string;
  dailyNew: number;
  cumulativeTotal: number;
}

export function getLast7DaysUserGrowthBuckets(
  users: RegisteredUserRecord[]
): UserGrowthBucket[] {
  const now = new Date();
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    0,
    0,
    0,
    0
  );
  const windowStartMs = windowStart.getTime();

  let baselineBeforeWindow = 0;
  const dailyMap = new Map<string, number>();

  for (const user of users) {
    const ms = getTimestampMs(user.firstLoginAt);
    if (!ms || ms < windowStartMs) {
      baselineBeforeWindow += 1;
    } else {
      const key = formatDateKeyLocal(new Date(ms));
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
  }

  let runningTotal = baselineBeforeWindow;
  const result: UserGrowthBucket[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = formatDateKeyLocal(d);
    const dailyNew = dailyMap.get(key) || 0;
    runningTotal += dailyNew;
    result.push({
      dateKey: key,
      label: d.toLocaleDateString('en-GH', { weekday: 'short' }),
      dailyNew,
      cumulativeTotal: runningTotal,
    });
  }

  return result;
}

