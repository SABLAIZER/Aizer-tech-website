import React, { useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CmsServiceItem,
  DEFAULT_CMS_SERVICES,
  WebsiteCmsData,
} from '../../types';
import { formatFullDateTime } from './adminUtils';

interface AdminPriceManagerViewProps {
  liveCms: WebsiteCmsData;
  onSavePricesLive: (nextLive: WebsiteCmsData) => Promise<void>;
}

type EditingTarget =
  | { kind: 'service'; id: string; name: string; current: string }
  | { kind: 'hero-web'; name: string; current: string }
  | { kind: 'hero-app'; name: string; current: string }
  | { kind: 'project'; id: string; name: string; current: string };

const CORE_SERVICE_IDS = new Set(DEFAULT_CMS_SERVICES.map((s) => s.id));

function extractDigitsOrRaw(priceText: string): string {
  const clean = (priceText || '').trim();
  const match = clean.match(/(\d[\d,]*)/);
  if (match) {
    return match[1].replace(/,/g, '');
  }
  return clean;
}

function formatPriceInput(
  rawInput: string,
  style: 'from-ghs' | 'ghs'
): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed.replace(/,/g, ''))) {
    const num = Number(trimmed.replace(/,/g, ''));
    if (Number.isFinite(num)) {
      const formatted = num.toLocaleString('en-US');
      return style === 'from-ghs' ? `From GHS ${formatted}` : `GHS ${formatted}`;
    }
  }
  return trimmed;
}

export const AdminPriceManagerView: React.FC<AdminPriceManagerViewProps> = ({
  liveCms,
  onSavePricesLive,
}) => {
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [draftInput, setDraftInput] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Add New Service Price form state
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPriceRaw, setNewPriceRaw] = useState('');
  const [newDelivery, setNewDelivery] = useState('7 Days');
  const [newDesc, setNewDesc] = useState('');
  const [addingNew, setAddingNew] = useState(false);

  const webService =
    liveCms.services.find(
      (s) =>
        s.id === 'website-development' ||
        s.name.toLowerCase().includes('web') ||
        s.name.toLowerCase().includes('site')
    ) || liveCms.services[0];
  const appService =
    liveCms.services.find(
      (s) =>
        s.id === 'app-development' ||
        s.name.toLowerCase().includes('app') ||
        s.name.toLowerCase().includes('mobile')
    ) || liveCms.services[1];

  const heroWebPrice =
    liveCms.hero.heroWebsitePrice !== undefined
      ? liveCms.hero.heroWebsitePrice
      : webService?.startingPrice || 'From GHS 600';
  const heroAppPrice =
    liveCms.hero.heroAppPrice !== undefined
      ? liveCms.hero.heroAppPrice
      : appService?.startingPrice || 'From GHS 1,500';

  const lastUpdatedText = formatFullDateTime(
    liveCms.updatedAt || liveCms.publishedAt
  );

  const runLiveUpdate = async (
    actionKey: string,
    nextCms: WebsiteCmsData,
    successText: string
  ) => {
    setNotice(null);
    setSavingId(actionKey);
    try {
      await onSavePricesLive(nextCms);
      setNotice({ type: 'success', text: successText });
    } catch (err) {
      setNotice({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Could not save price update to live site.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const startEdit = (target: EditingTarget) => {
    setNotice(null);
    setEditing(target);
    setDraftInput(extractDigitsOrRaw(target.current));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;

    const style = editing.kind === 'project' ? 'ghs' : 'from-ghs';
    const formatted = formatPriceInput(draftInput, style);
    if (!formatted) {
      setNotice({
        type: 'error',
        text: 'Please enter a valid price number or label.',
      });
      return;
    }

    if (editing.kind === 'service') {
      const nextServices = liveCms.services.map((svc) =>
        svc.id === editing.id
          ? { ...svc, startingPrice: formatted, priceHidden: false }
          : svc
      );
      await runLiveUpdate(
        `service-${editing.id}`,
        { ...liveCms, services: nextServices },
        `Updated ${editing.name} to ${formatted} live for logged-in users.`
      );
      setEditing(null);
      return;
    }

    if (editing.kind === 'hero-web') {
      await runLiveUpdate(
        'hero-web',
        {
          ...liveCms,
          hero: {
            ...liveCms.hero,
            heroWebsitePrice: formatted,
            heroWebsitePriceHidden: false,
          },
        },
        `Updated Hero Website price to ${formatted} live.`
      );
      setEditing(null);
      return;
    }

    if (editing.kind === 'hero-app') {
      await runLiveUpdate(
        'hero-app',
        {
          ...liveCms,
          hero: {
            ...liveCms.hero,
            heroAppPrice: formatted,
            heroAppPriceHidden: false,
          },
        },
        `Updated Hero App price to ${formatted} live.`
      );
      setEditing(null);
      return;
    }

    if (editing.kind === 'project') {
      const nextProjects = liveCms.projects.map((proj) =>
        proj.id === editing.id
          ? { ...proj, price: formatted, priceHidden: false }
          : proj
      );
      await runLiveUpdate(
        `project-${editing.id}`,
        { ...liveCms, projects: nextProjects },
        `Updated ${editing.name} price to ${formatted} live.`
      );
      setEditing(null);
    }
  };

  const handleToggleServicePriceHidden = async (svc: CmsServiceItem) => {
    const nextHidden = !svc.priceHidden;
    const nextServices = liveCms.services.map((item) =>
      item.id === svc.id ? { ...item, priceHidden: nextHidden } : item
    );
    await runLiveUpdate(
      `service-${svc.id}`,
      { ...liveCms, services: nextServices },
      nextHidden
        ? `Hid price for ${svc.name} across the website.`
        : `Price for ${svc.name} is now visible to logged-in users.`
    );
  };

  const handleDeleteServicePrice = async (svc: CmsServiceItem) => {
    const isCustom = !CORE_SERVICE_IDS.has(svc.id);
    if (isCustom) {
      const nextServices = liveCms.services.filter((item) => item.id !== svc.id);
      await runLiveUpdate(
        `service-${svc.id}`,
        { ...liveCms, services: nextServices },
        `Deleted service "${svc.name}" and its price.`
      );
      return;
    }

    const nextServices = liveCms.services.map((item) =>
      item.id === svc.id
        ? { ...item, startingPrice: '', priceHidden: true }
        : item
    );
    await runLiveUpdate(
      `service-${svc.id}`,
      { ...liveCms, services: nextServices },
      `Removed price for ${svc.name} (service remains visible without a price).`
    );
  };

  const handleToggleHeroPriceHidden = async (which: 'web' | 'app') => {
    if (which === 'web') {
      const nextHidden = !liveCms.hero.heroWebsitePriceHidden;
      await runLiveUpdate(
        'hero-web',
        {
          ...liveCms,
          hero: { ...liveCms.hero, heroWebsitePriceHidden: nextHidden },
        },
        nextHidden
          ? 'Hid Hero Website starting price.'
          : 'Hero Website starting price is now visible to logged-in users.'
      );
    } else {
      const nextHidden = !liveCms.hero.heroAppPriceHidden;
      await runLiveUpdate(
        'hero-app',
        {
          ...liveCms,
          hero: { ...liveCms.hero, heroAppPriceHidden: nextHidden },
        },
        nextHidden
          ? 'Hid Hero App starting price.'
          : 'Hero App starting price is now visible to logged-in users.'
      );
    }
  };

  const handleDeleteHeroPrice = async (which: 'web' | 'app') => {
    if (which === 'web') {
      await runLiveUpdate(
        'hero-web',
        {
          ...liveCms,
          hero: {
            ...liveCms.hero,
            heroWebsitePrice: '',
            heroWebsitePriceHidden: true,
          },
        },
        'Removed Hero Website starting price.'
      );
    } else {
      await runLiveUpdate(
        'hero-app',
        {
          ...liveCms,
          hero: {
            ...liveCms.hero,
            heroAppPrice: '',
            heroAppPriceHidden: true,
          },
        },
        'Removed Hero App starting price.'
      );
    }
  };

  const handleToggleProjectPriceHidden = async (projectId: string) => {
    const target = liveCms.projects.find((p) => p.id === projectId);
    if (!target) return;
    const nextHidden = !target.priceHidden;
    const nextProjects = liveCms.projects.map((p) =>
      p.id === projectId ? { ...p, priceHidden: nextHidden } : p
    );
    await runLiveUpdate(
      `project-${projectId}`,
      { ...liveCms, projects: nextProjects },
      nextHidden
        ? `Hid price for ${target.title}.`
        : `Price for ${target.title} is now visible to logged-in users.`
    );
  };

  const handleDeleteProjectPrice = async (projectId: string) => {
    const target = liveCms.projects.find((p) => p.id === projectId);
    if (!target) return;
    const nextProjects = liveCms.projects.map((p) =>
      p.id === projectId ? { ...p, price: '', priceHidden: true } : p
    );
    await runLiveUpdate(
      `project-${projectId}`,
      { ...liveCms, projects: nextProjects },
      `Removed price for ${target.title}.`
    );
  };

  const handleAddNewServicePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const cleanName = newName.trim();
    const formattedPrice = formatPriceInput(newPriceRaw, 'from-ghs');
    const cleanDelivery = newDelivery.trim() || '7 Days';
    const cleanDesc =
      newDesc.trim() ||
      `Bespoke ${cleanName} engineered by AizerTech GH with dedicated Accra support.`;

    if (cleanName.length < 2) {
      setNotice({
        type: 'error',
        text: 'Please enter a service name (at least 2 characters).',
      });
      return;
    }
    if (!formattedPrice) {
      setNotice({
        type: 'error',
        text: 'Please enter a starting price in GHS.',
      });
      return;
    }

    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32);
    const id = `${slug || 'service'}-${Date.now().toString(36)}`;

    const nextService: CmsServiceItem = {
      id,
      name: cleanName.slice(0, 80),
      description: cleanDesc.slice(0, 400),
      startingPrice: formattedPrice,
      deliveryTime: cleanDelivery.slice(0, 40),
      visible: true,
      priceHidden: false,
      deliverables: [
        'Custom design & clean production build',
        'Mobile optimization & WhatsApp integration',
      ],
    };

    setAddingNew(true);
    try {
      await onSavePricesLive({
        ...liveCms,
        services: [...liveCms.services, nextService],
      });
      setNewName('');
      setNewPriceRaw('');
      setNewDelivery('7 Days');
      setNewDesc('');
      setAddOpen(false);
      setNotice({
        type: 'success',
        text: `Added "${nextService.name}" (${formattedPrice}) live for logged-in users.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Unable to add new service price.',
      });
    } finally {
      setAddingNew(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="luxury-card rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
      >
        <div>
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37] mb-1.5">
            Live Pricing Control
          </p>
          <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <span>Price Manager</span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFD700]">
              <Coins className="w-5 h-5" />
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-300 mt-2 max-w-2xl">
            Edit, add, hide, or remove any GHS price across your website. Updates go live instantly for logged-in clients while staying hidden from logged-out visitors.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10">
              <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Last updated: {lastUpdatedText}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Visitors still cannot see prices</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAddOpen((prev) => !prev)}
          className="haptic-tap gold-gradient-btn px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Price</span>
        </button>
      </motion.div>

      {/* Feedback Notice */}
      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          className={`rounded-2xl px-5 py-3.5 text-xs sm:text-sm font-medium border flex items-center justify-between gap-3 ${
            notice.type === 'error'
              ? 'bg-red-500/12 border-red-500/35 text-red-200'
              : 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200'
          }`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notice"
            className="p-1 opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add New Service Price Card */}
      {addOpen && (
        <form
          onSubmit={handleAddNewServicePrice}
          className="luxury-card rounded-3xl p-6 space-y-4 border-[#D4AF37]/40"
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                New Service &amp; Price
              </p>
              <h2 className="font-luxury text-lg font-bold text-white mt-0.5">
                Add New Service Price
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.05] text-neutral-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Service Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. SEO & Maintenance"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Price (GHS)
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={newPriceRaw}
                onChange={(e) => setNewPriceRaw(e.target.value)}
                placeholder="e.g. 450"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Delivery Time
              </label>
              <input
                type="text"
                value={newDelivery}
                onChange={(e) => setNewDelivery(e.target.value)}
                placeholder="7 Days"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Short Description (Optional)
            </label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What is included in this service..."
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white/[0.05] text-xs font-semibold text-neutral-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingNew}
              className="min-h-[44px] gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              {addingNew ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Save New Price</span>
            </button>
          </div>
        </form>
      )}

      {/* Group 1: Services Prices */}
      <section className="luxury-card rounded-3xl p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              Services Section
            </p>
            <h2 className="font-luxury text-lg sm:text-xl font-bold text-white mt-0.5">
              Service Starting Prices ({liveCms.services.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {liveCms.services.map((svc) => {
            const isEditingThis =
              editing?.kind === 'service' && editing.id === svc.id;
            const isBusy = savingId === `service-${svc.id}`;
            const isHidden = Boolean(svc.priceHidden || !svc.startingPrice.trim());

            return (
              <div key={svc.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-white">
                        {svc.name}
                      </p>
                      {isHidden && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-700/60 text-neutral-300 border border-white/10">
                          Price Hidden
                        </span>
                      )}
                    </div>
                    <p
                      className={`font-mono-tabular text-sm sm:text-base font-bold mt-1 ${
                        isHidden ? 'text-neutral-500 line-through' : 'gold-gradient-text'
                      }`}
                    >
                      {svc.startingPrice.trim() || 'No price set'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        startEdit({
                          kind: 'service',
                          id: svc.id,
                          name: svc.name,
                          current: svc.startingPrice,
                        })
                      }
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/25 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleServicePriceHidden(svc)}
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/40 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {svc.priceHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Show</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                          <span>Hide</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeleteServicePrice(svc)}
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {isEditingThis && (
                  <form
                    onSubmit={handleSaveEdit}
                    className="rounded-2xl bg-[#0A0A0A] border border-[#D4AF37]/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Enter new amount (GHS) or full label
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={draftInput}
                        onChange={(e) => setDraftInput(e.target.value)}
                        placeholder="e.g. 800"
                        className="w-full rounded-xl bg-[#121216] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:pt-5">
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="min-h-[42px] gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-neutral-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Group 2: Hero Starting Prices */}
      <section className="luxury-card rounded-3xl p-5 sm:p-7 space-y-4">
        <div className="border-b border-white/10 pb-3">
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
            Hero &amp; Footer Benchmark Strip
          </p>
          <h2 className="font-luxury text-lg sm:text-xl font-bold text-white mt-0.5">
            Hero Starting Prices
          </h2>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {[
            {
              key: 'hero-web' as const,
              which: 'web' as const,
              title: 'Hero · Websites Starting From',
              value: heroWebPrice,
              hidden: Boolean(liveCms.hero.heroWebsitePriceHidden || !heroWebPrice.trim()),
            },
            {
              key: 'hero-app' as const,
              which: 'app' as const,
              title: 'Hero · Apps Starting From',
              value: heroAppPrice,
              hidden: Boolean(liveCms.hero.heroAppPriceHidden || !heroAppPrice.trim()),
            },
          ].map((item) => {
            const isEditingThis = editing?.kind === item.key;
            const isBusy = savingId === item.key;

            return (
              <div key={item.key} className="py-4 first:pt-1 last:pb-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-white">
                        {item.title}
                      </p>
                      {item.hidden && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-700/60 text-neutral-300 border border-white/10">
                          Price Hidden
                        </span>
                      )}
                    </div>
                    <p
                      className={`font-mono-tabular text-sm sm:text-base font-bold mt-1 ${
                        item.hidden ? 'text-neutral-500 line-through' : 'gold-gradient-text'
                      }`}
                    >
                      {item.value.trim() || 'No price set'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        startEdit({
                          kind: item.key,
                          name: item.title,
                          current: item.value,
                        })
                      }
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/25 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleHeroPriceHidden(item.which)}
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/40 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {item.hidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Show</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                          <span>Hide</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeleteHeroPrice(item.which)}
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {isEditingThis && (
                  <form
                    onSubmit={handleSaveEdit}
                    className="rounded-2xl bg-[#0A0A0A] border border-[#D4AF37]/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Enter new amount (GHS) or full label
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={draftInput}
                        onChange={(e) => setDraftInput(e.target.value)}
                        placeholder="e.g. 800"
                        className="w-full rounded-xl bg-[#121216] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:pt-5">
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="min-h-[42px] gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-neutral-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Group 3: Portfolio Prices */}
      <section className="luxury-card rounded-3xl p-5 sm:p-7 space-y-4">
        <div className="border-b border-white/10 pb-3">
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
            Portfolio Showcase
          </p>
          <h2 className="font-luxury text-lg sm:text-xl font-bold text-white mt-0.5">
            Portfolio Project Prices ({liveCms.projects.length})
          </h2>
        </div>

        <div className="divide-y divide-white/[0.08]">
          {liveCms.projects.map((proj) => {
            const isEditingThis =
              editing?.kind === 'project' && editing.id === proj.id;
            const isBusy = savingId === `project-${proj.id}`;
            const isHidden = Boolean(proj.priceHidden || !proj.price.trim());

            return (
              <div key={proj.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-white">
                        {proj.title}
                      </p>
                      {isHidden && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-700/60 text-neutral-300 border border-white/10">
                          Price Hidden
                        </span>
                      )}
                    </div>
                    <p
                      className={`font-mono-tabular text-sm sm:text-base font-bold mt-1 ${
                        isHidden ? 'text-neutral-500 line-through' : 'gold-gradient-text'
                      }`}
                    >
                      {proj.price.trim() || 'No price set'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        startEdit({
                          kind: 'project',
                          id: proj.id,
                          name: proj.title,
                          current: proj.price,
                        })
                      }
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/25 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleProjectPriceHidden(proj.id)}
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/40 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {isHidden ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Show</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                          <span>Hide</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeleteProjectPrice(proj.id)}
                      className="haptic-tap-sm min-h-[42px] px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-300 hover:bg-red-500/20 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {isEditingThis && (
                  <form
                    onSubmit={handleSaveEdit}
                    className="rounded-2xl bg-[#0A0A0A] border border-[#D4AF37]/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Enter new amount (GHS) or full label
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={draftInput}
                        onChange={(e) => setDraftInput(e.target.value)}
                        placeholder="e.g. 3500"
                        className="w-full rounded-xl bg-[#121216] border border-white/15 px-3.5 py-2.5 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:pt-5">
                      <button
                        type="submit"
                        disabled={isBusy}
                        className="min-h-[42px] gold-gradient-btn px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {isBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-neutral-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
