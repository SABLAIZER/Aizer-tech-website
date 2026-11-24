import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Crown,
  Download,
  Eye,
  FilePlus2,
  Loader2,
  MessageCircle,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  AIZER_LOGO_URL,
  InvoiceRecord,
  InvoiceStatus,
  StudioSettings,
} from '../../types';
import { downloadInvoicePdf } from '../../utils/invoicePdf';
import {
  buildClientWhatsAppHref,
  buildInvoiceWhatsAppMessage,
  formatGhs,
  getInitial,
  getNextInvoiceNumber,
} from './adminUtils';

export interface InvoiceDraftSeed {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  service: string;
  description: string;
  sourceMessageId: string;
}

interface AdminInvoicesViewProps {
  invoices: InvoiceRecord[];
  loadingInvoices: boolean;
  studioSettings: StudioSettings;
  seedDraft: InvoiceDraftSeed | null;
  onClearSeedDraft: () => void;
  onCreateInvoice: (payload: {
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
  }) => Promise<void>;
  onToggleInvoiceStatus: (invoice: InvoiceRecord) => Promise<void>;
  onDeleteInvoice: (invoiceId: string) => Promise<void>;
}

export const AdminInvoicesView: React.FC<AdminInvoicesViewProps> = ({
  invoices,
  loadingInvoices,
  studioSettings,
  seedDraft,
  onClearSeedDraft,
  onCreateInvoice,
  onToggleInvoiceStatus,
  onDeleteInvoice,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create invoice modal state
  const [createOpen, setCreateOpen] = useState(Boolean(seedDraft));
  const [clientName, setClientName] = useState(seedDraft?.clientName || '');
  const [clientPhone, setClientPhone] = useState(seedDraft?.clientPhone || '');
  const [clientEmail, setClientEmail] = useState(seedDraft?.clientEmail || '');
  const [service, setService] = useState(seedDraft?.service || 'Business Website');
  const [amountInput, setAmountInput] = useState('1200');
  const [description, setDescription] = useState(
    seedDraft?.description || 'Custom design, build & Mobile Money integration'
  );
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<InvoiceStatus>('unpaid');
  const [sourceMessageId, setSourceMessageId] = useState(
    seedDraft?.sourceMessageId || ''
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (seedDraft) {
      setClientName(seedDraft.clientName);
      setClientPhone(seedDraft.clientPhone);
      setClientEmail(seedDraft.clientEmail);
      setService(seedDraft.service || 'Business Website');
      setDescription(
        seedDraft.description || 'Custom digital build for your business'
      );
      setSourceMessageId(seedDraft.sourceMessageId || '');
      setInvoiceDate(new Date().toISOString().slice(0, 10));
      setStatus('unpaid');
      setFormError(null);
      setCreateOpen(true);
    }
  }, [seedDraft]);

  const nextInvoiceNumber = useMemo(
    () => getNextInvoiceNumber(invoices),
    [invoices]
  );

  const summary = useMemo(() => {
    const paidSum = invoices
      .filter((i) => i.status === 'paid')
      .reduce((acc, i) => acc + (Number.isFinite(i.amountGhs) ? i.amountGhs : 0), 0);
    const unpaidSum = invoices
      .filter((i) => i.status === 'unpaid')
      .reduce((acc, i) => acc + (Number.isFinite(i.amountGhs) ? i.amountGhs : 0), 0);
    return {
      paidSum,
      unpaidSum,
      paidCount: invoices.filter((i) => i.status === 'paid').length,
      unpaidCount: invoices.filter((i) => i.status === 'unpaid').length,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.clientPhone.toLowerCase().includes(q) ||
        inv.service.toLowerCase().includes(q)
      );
    });
  }, [invoices, filterStatus, searchTerm]);

  const openBlankCreateModal = () => {
    onClearSeedDraft();
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setService('Business Website');
    setAmountInput('1200');
    setDescription('Custom design & development milestone');
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setStatus('unpaid');
    setSourceMessageId('');
    setFormError(null);
    setCreateOpen(true);
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = Number(amountInput);
    if (clientName.trim().length < 2) {
      setFormError('Please enter the client name.');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError('Please enter a valid invoice amount in GHS.');
      return;
    }
    if (description.trim().length < 2) {
      setFormError('Please enter a description for the invoice.');
      return;
    }

    setSaving(true);
    try {
      await onCreateInvoice({
        invoiceNumber: nextInvoiceNumber,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim(),
        service: service.trim() || 'Digital Engineering',
        amountGhs: amt,
        description: description.trim(),
        invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
        status,
        sourceMessageId,
      });
      setCreateOpen(false);
      onClearSeedDraft();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to save invoice.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (inv: InvoiceRecord) => {
    setBusyId(inv.id);
    try {
      await onToggleInvoiceStatus(inv);
      if (previewInvoice?.id === inv.id) {
        setPreviewInvoice({
          ...inv,
          status: inv.status === 'paid' ? 'unpaid' : 'paid',
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await onDeleteInvoice(id);
      setConfirmDeleteId(null);
      if (previewInvoice?.id === id) {
        setPreviewInvoice(null);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Finance Totals */}
      <div className="luxury-card rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              Billing &amp; MTN MoMo / Telecel Cash
            </p>
            <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
              Invoices ({invoices.length})
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              MoMo Destination: <span className="text-[#FFD700] font-mono-tabular font-semibold">{studioSettings.momoNumber}</span> · {studioSettings.momoName}
            </p>
          </div>

          <button
            type="button"
            onClick={openBlankCreateModal}
            className="haptic-tap gold-gradient-btn px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>+ Create Invoice</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="rounded-2xl bg-[#0A0A0A] border border-emerald-500/25 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">Total Revenue (Paid Invoices)</p>
              <p className="font-sora font-mono-tabular text-2xl font-bold text-emerald-300 mt-1">
                {formatGhs(summary.paidSum)}
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-emerald-300/80">
              {summary.paidCount} paid
            </span>
          </div>

          <div className="rounded-2xl bg-[#0A0A0A] border border-[#D4AF37]/30 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-400">Pending Payments (Unpaid)</p>
              <p className="font-sora font-mono-tabular text-2xl font-bold gold-gradient-text mt-1">
                {formatGhs(summary.unpaidSum)}
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-[#FFD700]/80">
              {summary.unpaidCount} unpaid
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'all', label: `All (${invoices.length})` },
                { id: 'unpaid', label: `Unpaid (${summary.unpaidCount})` },
                { id: 'paid', label: `Paid (${summary.paidCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                  filterStatus === tab.id
                    ? 'gold-gradient-btn'
                    : 'bg-white/[0.04] border border-white/10 text-neutral-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#D4AF37]/75 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search #AT-001 or client..."
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>
      </div>

      {/* Empty / Loading / List */}
      {loadingInvoices ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <div className="luxury-card rounded-3xl p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/12 border border-[#D4AF37]/30 flex items-center justify-center text-[#FFD700] mx-auto mb-4">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="font-luxury text-xl font-semibold text-white mb-2">
            No invoices yet
          </p>
          <p className="text-xs text-neutral-400 mb-6">
            Create an invoice from any client message or click below to send MTN MoMo payment details.
          </p>
          <button
            type="button"
            onClick={openBlankCreateModal}
            className="haptic-tap gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Create First Invoice</span>
          </button>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="luxury-card rounded-3xl p-8 text-center">
          <p className="text-sm text-neutral-300">No invoices match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredInvoices.map((inv, idx) => {
            const isPaid = inv.status === 'paid';
            const isBusy = busyId === inv.id;
            const waHref = buildClientWhatsAppHref(
              inv.clientPhone,
              buildInvoiceWhatsAppMessage(inv, studioSettings)
            );

            return (
              <motion.article
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.2) }}
                className={`luxury-card rounded-3xl p-6 flex flex-col justify-between gap-4 ${
                  isPaid ? 'border-emerald-500/25' : 'border-[#D4AF37]/35'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] font-sora font-bold text-sm flex items-center justify-center shrink-0">
                        {getInitial(inv.clientName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular text-xs font-bold text-[#FFD700]">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-xs text-neutral-500">·</span>
                          <span className="font-mono-tabular text-xs text-neutral-400">
                            {inv.invoiceDate}
                          </span>
                        </div>
                        <h2 className="font-sora text-base font-bold text-white truncate mt-0.5">
                          {inv.clientName}
                        </h2>
                        <p className="text-xs text-neutral-400 truncate">
                          {inv.clientPhone || inv.clientEmail || 'Direct Client'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-sora font-mono-tabular text-xl font-bold gold-gradient-text">
                        {formatGhs(inv.amountGhs)}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isPaid
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                            : 'bg-[#D4AF37]/15 text-[#FFD700] border border-[#D4AF37]/45'
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{isPaid ? 'Paid' : 'Unpaid'}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#D4AF37] mb-1">
                      {inv.service}
                    </p>
                    <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                      {inv.description}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="haptic-tap-sm min-h-[38px] px-3 py-1.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/45 text-xs font-semibold text-[#25D366] hover:bg-[#25D366]/25 inline-flex items-center gap-1.5"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => downloadInvoicePdf(inv, studioSettings)}
                      className="haptic-tap-sm min-h-[38px] px-3 py-1.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/25 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewInvoice(inv)}
                      className="haptic-tap-sm min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-medium text-neutral-200 hover:border-[#D4AF37]/50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Preview</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggle(inv)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        isPaid
                          ? 'bg-white/[0.06] border border-white/15 text-neutral-300'
                          : 'gold-gradient-btn'
                      }`}
                    >
                      {isPaid ? 'Mark Unpaid' : 'Mark as Paid'}
                    </button>

                    {confirmDeleteId === inv.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(inv.id)}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[38px] px-2 py-1.5 rounded-xl bg-white/5 text-xs text-neutral-300 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete invoice ${inv.invoiceNumber}`}
                        onClick={() => setConfirmDeleteId(inv.id)}
                        className="min-h-[38px] min-w-[38px] rounded-xl border border-red-500/35 text-red-400 hover:bg-red-500/15 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Luxury Gold + Black Invoice Preview Modal */}
      {previewInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewInvoice(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-[#070708] border border-[#D4AF37]/50 shadow-[0_30px_90px_-15px_rgba(212,175,55,0.35)] overflow-hidden my-auto"
          >
            {/* Gold Top Header */}
            <div className="bg-gradient-to-r from-[#14110B] via-[#0A0A0A] to-[#17120A] p-6 sm:p-8 border-b border-[#D4AF37]/30 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={AIZER_LOGO_URL}
                  alt="AizerTech GH"
                  className="w-12 h-12 rounded-2xl object-cover border border-[#D4AF37]/50"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-luxury text-xl font-bold gold-gradient-text">
                      AIZERTECH GH
                    </h2>
                    <Crown className="w-4 h-4 text-[#FFD700]" />
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Accra, Ghana · Digital Engineering Studio
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-mono-tabular uppercase tracking-widest text-neutral-400">
                    Invoice
                  </p>
                  <p className="font-mono-tabular text-lg font-bold text-[#FFD700]">
                    {previewInvoice.invoiceNumber}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      previewInvoice.status === 'paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-[#D4AF37]/20 text-[#FFD700] border border-[#D4AF37]/45'
                    }`}
                  >
                    {previewInvoice.status === 'paid' ? 'PAID' : 'UNPAID'}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close invoice preview"
                  onClick={() => setPreviewInvoice(null)}
                  className="min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.06] text-neutral-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="uppercase tracking-wider text-[#D4AF37] font-semibold mb-1">
                    Billed To
                  </p>
                  <p className="text-base font-bold text-white">
                    {previewInvoice.clientName}
                  </p>
                  {previewInvoice.clientPhone && (
                    <p className="text-neutral-400 mt-0.5">
                      {previewInvoice.clientPhone}
                    </p>
                  )}
                  {previewInvoice.clientEmail && (
                    <p className="text-neutral-400">{previewInvoice.clientEmail}</p>
                  )}
                </div>

                <div className="sm:text-right">
                  <p className="uppercase tracking-wider text-[#D4AF37] font-semibold mb-1">
                    Invoice Date
                  </p>
                  <p className="font-mono-tabular text-sm font-semibold text-white">
                    {previewInvoice.invoiceDate}
                  </p>
                  <p className="text-neutral-400 mt-0.5">
                    {studioSettings.contactEmail}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#111114] border border-white/10 p-5 space-y-3">
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                      Service
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {previewInvoice.service}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                      Amount
                    </p>
                    <p className="font-sora font-mono-tabular text-2xl font-bold gold-gradient-text">
                      {formatGhs(previewInvoice.amountGhs)}
                    </p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {previewInvoice.description}
                </p>
              </div>

              {/* MoMo Payment Details */}
              <div className="rounded-2xl bg-gradient-to-br from-[#D4AF37]/15 to-[#0E0E10] border border-[#D4AF37]/45 p-5 space-y-2">
                <p className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#FFD700] font-bold">
                  Mobile Money Payment Details
                </p>
                <p className="text-sm font-semibold text-white">
                  Pay via MTN MoMo / Telecel Cash to:{' '}
                  <span className="font-mono-tabular text-[#FFD700]">
                    {studioSettings.momoNumber}
                  </span>{' '}
                  — Name:{' '}
                  <span className="text-[#FFD700]">{studioSettings.momoName}</span>
                </p>
                <p className="text-xs text-neutral-300">
                  Send screenshot after payment so your build moves forward immediately.
                </p>
              </div>

              <div className="text-center pt-2">
                <p className="font-luxury text-base font-semibold gold-gradient-text">
                  Thank you for choosing AizerTech
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={buildClientWhatsAppHref(
                      previewInvoice.clientPhone,
                      buildInvoiceWhatsAppMessage(previewInvoice, studioSettings)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="haptic-tap min-h-[42px] px-4 py-2 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/50 text-xs font-bold text-[#25D366] inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Invoice via WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => downloadInvoicePdf(previewInvoice, studioSettings)}
                    className="haptic-tap min-h-[42px] px-4 py-2 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/50 text-xs font-bold text-[#FFD700] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(previewInvoice)}
                    className="min-h-[42px] px-4 py-2 rounded-2xl gold-gradient-btn text-xs font-bold cursor-pointer"
                  >
                    {previewInvoice.status === 'paid'
                      ? 'Mark Unpaid'
                      : 'Mark as Paid'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(previewInvoice.id)}
                    className="min-h-[42px] px-3.5 py-2 rounded-2xl border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/15 cursor-pointer"
                  >
                    Delete Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setCreateOpen(false);
            onClearSeedDraft();
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSubmitCreate}
            onClick={(e) => e.stopPropagation()}
            className="luxury-card w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <p className="text-[11px] font-mono-tabular uppercase tracking-wider text-[#D4AF37]">
                  Invoice #{nextInvoiceNumber}
                </p>
                <h2 className="font-luxury text-xl font-bold text-white">
                  Create Client Invoice
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => {
                  setCreateOpen(false);
                  onClearSeedDraft();
                }}
                className="min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Service
                </label>
                <input
                  type="text"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="Business Website"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Amount (GHS)
                </label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm font-mono-tabular text-[#FFD700] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Payment Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="50% deposit for custom website development..."
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {formError && (
              <p className="text-xs text-red-300 bg-red-500/12 border border-red-500/35 rounded-2xl px-4 py-2.5">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  onClearSeedDraft();
                }}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.05] text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Create Invoice ({nextInvoiceNumber})</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
