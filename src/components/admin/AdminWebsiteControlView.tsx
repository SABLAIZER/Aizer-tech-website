import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  History,
  ImagePlus,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  CmsPortfolioProject,
  CmsServiceItem,
  DEFAULT_WEBSITE_CMS,
  WebsiteBackupRecord,
  WebsiteCmsData,
} from '../../types';
import { formatFullDateTime } from './adminUtils';

type ControlSubTab = 'services' | 'projects' | 'hero';

interface AdminWebsiteControlViewProps {
  liveCms: WebsiteCmsData;
  draftCms: WebsiteCmsData | null;
  hasLiveDoc: boolean;
  backups: WebsiteBackupRecord[];
  onSaveDraft: (nextDraft: WebsiteCmsData) => Promise<void>;
  onPublishLive: (nextLive: WebsiteCmsData) => Promise<void>;
  onRestoreBackup: (backup: WebsiteBackupRecord) => Promise<void>;
}

function stableCmsFingerprint(data: WebsiteCmsData): string {
  return JSON.stringify({
    hero: data.hero,
    services: data.services,
    projects: data.projects,
  });
}

async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const maxWidth = 820;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Browser canvas is unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(dataUrl);
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export const AdminWebsiteControlView: React.FC<AdminWebsiteControlViewProps> = ({
  liveCms,
  draftCms,
  hasLiveDoc,
  backups,
  onSaveDraft,
  onPublishLive,
  onRestoreBackup,
}) => {
  const [subTab, setSubTab] = useState<ControlSubTab>('services');
  const [workingCms, setWorkingCms] = useState<WebsiteCmsData>(
    draftCms || liveCms || DEFAULT_WEBSITE_CMS
  );
  const [localDirty, setLocalDirty] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Project add/edit modal state
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState('');
  const [pCategory, setPCategory] = useState('Website');
  const [pPrice, setPPrice] = useState('GHS 1,200');
  const [pDescription, setPDescription] = useState('');
  const [pImageUrl, setPImageUrl] = useState('');
  const [pClientName, setPClientName] = useState('');
  const [pLocation, setPLocation] = useState('Accra, Ghana');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  // Why Us input
  const [newWhyPoint, setNewWhyPoint] = useState('');

  // Sync incoming Firestore draft/live when local editor isn't mid-edit
  useEffect(() => {
    if (!localDirty) {
      setWorkingCms(draftCms || liveCms || DEFAULT_WEBSITE_CMS);
    }
  }, [draftCms, liveCms, localDirty]);

  const isDraftDifferentFromLive = useMemo(() => {
    if (!hasLiveDoc) return true;
    return stableCmsFingerprint(workingCms) !== stableCmsFingerprint(liveCms);
  }, [workingCms, liveCms, hasLiveDoc]);

  const latestBackup = backups[0] || null;

  const updateHeroField = <K extends keyof WebsiteCmsData['hero']>(
    key: K,
    value: WebsiteCmsData['hero'][K]
  ) => {
    setLocalDirty(true);
    setNotice(null);
    setWorkingCms((prev) => ({
      ...prev,
      hero: { ...prev.hero, [key]: value },
    }));
  };

  const updateServiceField = <K extends keyof CmsServiceItem>(
    id: string,
    key: K,
    value: CmsServiceItem[K]
  ) => {
    setLocalDirty(true);
    setNotice(null);
    setWorkingCms((prev) => ({
      ...prev,
      services: prev.services.map((s) =>
        s.id === id ? { ...s, [key]: value } : s
      ),
    }));
  };

  const handleAddService = () => {
    setLocalDirty(true);
    setNotice(null);
    const id = `service-${Date.now()}`;
    const newSvc: CmsServiceItem = {
      id,
      name: 'New Studio Service',
      description: 'Describe what this package includes for your clients.',
      startingPrice: 'From GHS 1,000',
      deliveryTime: '7 Days',
      visible: true,
      deliverables: ['Custom tailored build', 'Direct CEO support'],
    };
    setWorkingCms((prev) => ({
      ...prev,
      services: [...prev.services, newSvc],
    }));
  };

  const handleDeleteService = (id: string) => {
    setLocalDirty(true);
    setNotice(null);
    setWorkingCms((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }));
  };

  const openAddProjectModal = () => {
    setEditingProjectId(null);
    setPTitle('');
    setPCategory('App');
    setPPrice('GHS 2,500');
    setPDescription('');
    setPImageUrl('');
    setPClientName('');
    setPLocation(workingCms.hero.location || 'Accra, Ghana');
    setProjectFormError(null);
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (proj: CmsPortfolioProject) => {
    setEditingProjectId(proj.id);
    setPTitle(proj.title);
    setPCategory(proj.category);
    setPPrice(proj.price);
    setPDescription(proj.description);
    setPImageUrl(proj.imageUrl);
    setPClientName(proj.clientName);
    setPLocation(proj.location || 'Accra, Ghana');
    setProjectFormError(null);
    setProjectModalOpen(true);
  };

  const handleProjectImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProjectFormError(null);
    setUploadingImage(true);
    try {
      const compressed = await compressImageFileToDataUrl(file);
      setPImageUrl(compressed);
    } catch (error) {
      setProjectFormError(
        error instanceof Error ? error.message : 'Image upload failed.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProjectModal = (e: React.FormEvent) => {
    e.preventDefault();
    setProjectFormError(null);

    if (pTitle.trim().length < 2) {
      setProjectFormError('Please enter a project title.');
      return;
    }
    if (pDescription.trim().length < 8) {
      setProjectFormError('Please add a brief project description.');
      return;
    }

    const projectPayload: CmsPortfolioProject = {
      id: editingProjectId || `proj-${Date.now()}`,
      title: pTitle.trim(),
      category: pCategory.trim() || 'Website',
      price: pPrice.trim() || 'Project Based',
      description: pDescription.trim(),
      imageUrl: pImageUrl.trim(),
      clientName: pClientName.trim(),
      location: pLocation.trim() || 'Accra, Ghana',
    };

    setLocalDirty(true);
    setNotice(null);
    setWorkingCms((prev) => ({
      ...prev,
      projects: editingProjectId
        ? prev.projects.map((p) => (p.id === editingProjectId ? projectPayload : p))
        : [projectPayload, ...prev.projects],
    }));
    setProjectModalOpen(false);
  };

  const handleDeleteProject = (id: string) => {
    setLocalDirty(true);
    setNotice(null);
    setWorkingCms((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  const handleAddWhyUsPoint = () => {
    const clean = newWhyPoint.trim();
    if (!clean) return;
    setLocalDirty(true);
    setWorkingCms((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        whyUsPoints: [...prev.hero.whyUsPoints, clean],
      },
    }));
    setNewWhyPoint('');
  };

  const handleUpdateWhyUsPoint = (idx: number, val: string) => {
    setLocalDirty(true);
    setWorkingCms((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        whyUsPoints: prev.hero.whyUsPoints.map((pt, i) => (i === idx ? val : pt)),
      },
    }));
  };

  const handleRemoveWhyUsPoint = (idx: number) => {
    setLocalDirty(true);
    setWorkingCms((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        whyUsPoints: prev.hero.whyUsPoints.filter((_, i) => i !== idx),
      },
    }));
  };

  const validateBeforeSave = (): string | null => {
    if (workingCms.hero.heroTitle.trim().length < 4) {
      return 'Hero Title must be at least 4 characters.';
    }
    if (workingCms.hero.heroSubtitle.trim().length < 4) {
      return 'Hero Subtitle must be at least 4 characters.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workingCms.hero.email.trim())) {
      return 'Please enter a valid Studio Email address.';
    }
    if (workingCms.hero.whatsappNumber.replace(/\D/g, '').length < 7) {
      return 'Please enter a valid WhatsApp number.';
    }
    if (workingCms.hero.aboutText.trim().length < 10) {
      return 'About Text must be at least 10 characters.';
    }
    return null;
  };

  const handleSaveAsDraftClick = async () => {
    const err = validateBeforeSave();
    if (err) {
      setNotice({ type: 'error', text: err });
      return;
    }
    setNotice(null);
    setSavingDraft(true);
    try {
      await onSaveDraft(workingCms);
      setLocalDirty(false);
      setNotice({
        type: 'info',
        text: 'Saved to Draft (aizertech_draft). Your live website has NOT changed yet — click "Publish to Website" when ready.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save draft.',
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishClick = async () => {
    const err = validateBeforeSave();
    if (err) {
      setNotice({ type: 'error', text: err });
      return;
    }
    setNotice(null);
    setPublishing(true);
    try {
      await onPublishLive(workingCms);
      setLocalDirty(false);
      setNotice({
        type: 'success',
        text: 'Published live to aizertech_live! Previous version backed up automatically and your main website updated in real time.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to publish live.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!latestBackup) return;
    setRestoring(true);
    setNotice(null);
    try {
      await onRestoreBackup(latestBackup);
      setLocalDirty(false);
      setConfirmRestoreOpen(false);
      setNotice({
        type: 'success',
        text: `Restored backup (${latestBackup.label}) to live website and draft!`,
      });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not restore backup.',
      });
    } finally {
      setRestoring(false);
    }
  };

  const actionBar = (
    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/10">
      <button
        type="button"
        disabled={savingDraft || publishing}
        onClick={handleSaveAsDraftClick}
        className="haptic-tap min-h-[44px] px-5 py-2.5 rounded-2xl bg-white/[0.06] border border-[#D4AF37]/45 text-xs sm:text-sm font-semibold text-[#FFD700] hover:bg-[#D4AF37]/15 disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer"
      >
        {savingDraft ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        <span>Save as Draft</span>
      </button>

      <button
        type="button"
        disabled={savingDraft || publishing}
        onClick={handlePublishClick}
        className="haptic-tap gold-gradient-btn min-h-[44px] px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer"
      >
        {publishing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Rocket className="w-4 h-4" />
        )}
        <span>
          {subTab === 'services' ? 'Publish to Website' : 'Publish'}
        </span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Command Header + Live / Draft Badge + Backup Restore */}
      <div className="luxury-card rounded-3xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
                Full Website Control Center
              </p>

              {isDraftDifferentFromLive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/18 border border-[#D4AF37]/55 text-[11px] font-bold text-[#FFD700]">
                  <span className="w-2 h-2 rounded-full bg-[#FFD700]" />
                  <span>Draft - Not Published</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/18 border border-emerald-500/50 text-[11px] font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Live</span>
                </span>
              )}
            </div>

            <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white">
              Website Control
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Edit services, prices, portfolio projects, hero copy, and contacts with draft safety &amp; 1-click rollback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setPreviewOpen((p) => !p)}
              className="haptic-tap-sm min-h-[42px] px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/50 inline-flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#D4AF37]" />
              <span>{previewOpen ? 'Hide Preview' : 'Draft Preview'}</span>
            </button>

            <button
              type="button"
              disabled={!latestBackup || restoring}
              onClick={() => setConfirmRestoreOpen(true)}
              className="haptic-tap-sm min-h-[42px] px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/60 disabled:opacity-45 inline-flex items-center gap-2 cursor-pointer"
            >
              <History className="w-4 h-4 text-[#D4AF37]" />
              <span>Restore Last Version</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'services', label: 'Services & Prices', icon: Layers },
                { id: 'projects', label: 'Projects / Portfolio', icon: Sparkles },
                { id: 'hero', label: 'Hero & Contact', icon: Globe },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = subTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubTab(tab.id)}
                  className={`haptic-tap-sm min-h-[40px] px-4 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'gold-gradient-btn'
                      : 'bg-white/[0.04] border border-white/10 text-neutral-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {latestBackup && (
            <p className="text-[11px] font-mono-tabular text-neutral-400">
              Auto-backup saved: {formatFullDateTime(latestBackup.backedUpAt)}
            </p>
          )}
        </div>

        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium border ${
              notice.type === 'success'
                ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200'
                : notice.type === 'error'
                ? 'bg-red-500/12 border-red-500/35 text-red-200'
                : 'bg-[#D4AF37]/12 border-[#D4AF37]/35 text-[#FFD700]'
            }`}
          >
            {notice.text}
          </div>
        )}
      </div>

      {/* Inline Admin Draft Preview Drawer */}
      {previewOpen && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="luxury-card rounded-3xl p-6 border-[#D4AF37]/45 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <p className="text-xs font-mono-tabular uppercase tracking-wider text-[#FFD700]">
              Admin-Only Preview ({isDraftDifferentFromLive ? 'Draft State' : 'Live State'})
            </p>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="rounded-2xl bg-[#070708] border border-white/10 p-5 space-y-3">
            <p className="text-[11px] text-[#D4AF37]">
              Aizer Tech · {workingCms.hero.location} · WhatsApp +{workingCms.hero.whatsappNumber}
            </p>
            <h3 className="font-luxury text-xl font-bold text-white">
              {workingCms.hero.heroTitle}
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {workingCms.hero.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {workingCms.services
                .filter((s) => s.visible)
                .map((s) => (
                  <span
                    key={s.id}
                    className="px-3 py-1 rounded-xl bg-white/[0.05] border border-[#D4AF37]/25 text-[11px] text-neutral-200"
                  >
                    {s.name}: <strong className="text-[#FFD700]">{s.startingPrice}</strong> ({s.deliveryTime})
                  </span>
                ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* TAB 1: SERVICES & PRICES */}
      {subTab === 'services' && (
        <div className="luxury-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-luxury text-xl font-bold text-white">
                Services &amp; Pricing ({workingCms.services.length})
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Edit service name, price in GHS, delivery time, description, or toggle Show/Hide
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddService}
              className="haptic-tap-sm px-4 py-2.5 rounded-2xl bg-white/[0.06] border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] hover:bg-[#D4AF37]/15 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>

          <div className="space-y-5">
            {workingCms.services.map((service, index) => (
              <div
                key={service.id}
                className={`rounded-3xl bg-[#0A0A0A]/90 border p-5 sm:p-6 space-y-4 ${
                  service.visible ? 'border-white/12' : 'border-white/5 opacity-70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <span className="font-mono-tabular text-xs font-semibold text-[#D4AF37]">
                    SERVICE #{index + 1}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateServiceField(service.id, 'visible', !service.visible)
                      }
                      className={`haptic-tap-sm min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                        service.visible
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 border border-white/15 text-neutral-400'
                      }`}
                    >
                      {service.visible ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Status: Show</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Status: Hidden</span>
                        </>
                      )}
                    </button>

                    {workingCms.services.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Delete ${service.name}`}
                        onClick={() => handleDeleteService(service.id)}
                        className="min-h-[36px] min-w-[36px] rounded-xl border border-red-500/35 text-red-400 hover:bg-red-500/15 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Service Name
                    </label>
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) =>
                        updateServiceField(service.id, 'name', e.target.value)
                      }
                      className="w-full rounded-2xl bg-[#121215] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Starting Price (GHS)
                    </label>
                    <input
                      type="text"
                      value={service.startingPrice}
                      onChange={(e) =>
                        updateServiceField(
                          service.id,
                          'startingPrice',
                          e.target.value
                        )
                      }
                      placeholder="From GHS 800"
                      className="w-full rounded-2xl bg-[#121215] border border-white/12 px-4 py-2.5 text-sm font-mono-tabular text-[#FFD700] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Delivery Time
                    </label>
                    <input
                      type="text"
                      value={service.deliveryTime}
                      onChange={(e) =>
                        updateServiceField(
                          service.id,
                          'deliveryTime',
                          e.target.value
                        )
                      }
                      placeholder="7 Days"
                      className="w-full rounded-2xl bg-[#121215] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={service.description}
                    onChange={(e) =>
                      updateServiceField(service.id, 'description', e.target.value)
                    }
                    className="w-full rounded-2xl bg-[#121215] border border-white/12 px-4 py-2.5 text-sm text-neutral-200 leading-relaxed focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            ))}
          </div>

          {actionBar}
        </div>
      )}

      {/* TAB 2: PROJECTS / PORTFOLIO */}
      {subTab === 'projects' && (
        <div className="luxury-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-luxury text-xl font-bold text-white">
                Portfolio Projects ({workingCms.projects.length})
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Manage the showcase cards visitors see on your main website
              </p>
            </div>
            <button
              type="button"
              onClick={openAddProjectModal}
              className="haptic-tap gold-gradient-btn px-4 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Project</span>
            </button>
          </div>

          {workingCms.projects.length === 0 ? (
            <div className="rounded-3xl bg-[#0A0A0A] border border-white/10 p-10 text-center">
              <p className="text-sm text-neutral-300 mb-4">
                No portfolio projects added yet.
              </p>
              <button
                type="button"
                onClick={openAddProjectModal}
                className="gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer"
              >
                + Add First Portfolio Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {workingCms.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-3xl bg-[#0A0A0A]/90 border border-white/12 overflow-hidden flex flex-col justify-between"
                >
                  {proj.imageUrl ? (
                    <div className="w-full h-40 bg-black overflow-hidden border-b border-white/10">
                      <img
                        src={proj.imageUrl}
                        alt={proj.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-[#D4AF37]/12 to-transparent border-b border-white/10 flex items-center justify-center text-xs text-neutral-500">
                      No cover image uploaded
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#FFD700] font-semibold">
                          {proj.category}
                        </span>
                        <span className="font-mono-tabular font-bold text-white">
                          {proj.price}
                        </span>
                      </div>
                      <h3 className="font-sora text-base font-bold text-white">
                        {proj.title}
                      </h3>
                      {proj.clientName && (
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Client: {proj.clientName}
                        </p>
                      )}
                      <p className="text-xs text-neutral-300 leading-relaxed mt-2 line-clamp-3">
                        {proj.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => openEditProjectModal(proj)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/12 text-xs font-semibold text-white hover:border-[#D4AF37]/60 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id)}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-red-500/40 text-xs font-semibold text-red-400 hover:bg-red-500/15 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {actionBar}
        </div>
      )}

      {/* TAB 3: HERO, CONTACT, ABOUT & WHY US */}
      {subTab === 'hero' && (
        <div className="luxury-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-luxury text-xl font-bold text-white">
              Hero, Contact &amp; About Section
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Update your main headline, contact channels, Accra location, About bio, and Why Us points
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Hero Title
              </label>
              <input
                type="text"
                value={workingCms.hero.heroTitle}
                onChange={(e) => updateHeroField('heroTitle', e.target.value)}
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Hero Subtitle
              </label>
              <textarea
                rows={3}
                value={workingCms.hero.heroSubtitle}
                onChange={(e) => updateHeroField('heroSubtitle', e.target.value)}
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Announcement Banner (Optional — leave blank to hide)
              </label>
              <input
                type="text"
                value={workingCms.hero.announcementBanner}
                onChange={(e) =>
                  updateHeroField('announcementBanner', e.target.value)
                }
                placeholder="e.g. Booking November projects — 50% MoMo deposit starts immediately."
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={workingCms.hero.whatsappNumber}
                  onChange={(e) =>
                    updateHeroField('whatsappNumber', e.target.value)
                  }
                  placeholder="233276335736"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={workingCms.hero.email}
                  onChange={(e) => updateHeroField('email', e.target.value)}
                  placeholder="sablahevans0@gmail.com"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={workingCms.hero.location}
                  onChange={(e) => updateHeroField('location', e.target.value)}
                  placeholder="Accra, Ghana"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                About Text
              </label>
              <textarea
                rows={3}
                value={workingCms.hero.aboutText}
                onChange={(e) => updateHeroField('aboutText', e.target.value)}
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Why Us Points */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <label className="block text-xs font-medium text-neutral-300">
                Why Us Points ({workingCms.hero.whyUsPoints.length})
              </label>
              <div className="space-y-2.5">
                {workingCms.hero.whyUsPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#D4AF37]/15 text-[#FFD700] flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => handleUpdateWhyUsPoint(idx, e.target.value)}
                      className="flex-1 rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                    <button
                      type="button"
                      aria-label="Remove point"
                      onClick={() => handleRemoveWhyUsPoint(idx)}
                      className="min-w-[38px] min-h-[38px] rounded-xl border border-red-500/35 text-red-400 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newWhyPoint}
                  onChange={(e) => setNewWhyPoint(e.target.value)}
                  placeholder="Add a new Why Aizer Tech highlight..."
                  className="flex-1 rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={handleAddWhyUsPoint}
                  className="min-h-[40px] px-4 py-2 rounded-2xl bg-white/[0.06] border border-[#D4AF37]/40 text-xs font-semibold text-[#FFD700] cursor-pointer"
                >
                  + Add Point
                </button>
              </div>
            </div>
          </div>

          {actionBar}
        </div>
      )}

      {/* Add / Edit Portfolio Project Modal */}
      {projectModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setProjectModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSaveProjectModal}
            onClick={(e) => e.stopPropagation()}
            className="luxury-card w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="font-luxury text-xl font-bold text-white">
                {editingProjectId ? 'Edit Portfolio Project' : 'Add Portfolio Project'}
              </h2>
              <button
                type="button"
                aria-label="Close project modal"
                onClick={() => setProjectModalOpen(false)}
                className="min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.05] text-neutral-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  placeholder="e.g. GoldCoast Bistro App"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Category
                </label>
                <select
                  value={pCategory}
                  onChange={(e) => setPCategory(e.target.value)}
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="App">App</option>
                  <option value="Website">Website</option>
                  <option value="Logo">Logo</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="UI/UX">UI/UX</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Price (GHS)
                </label>
                <input
                  type="text"
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value)}
                  placeholder="GHS 2,500"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm font-mono-tabular text-[#FFD700] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Client Name
                </label>
                <input
                  type="text"
                  value={pClientName}
                  onChange={(e) => setPClientName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={pLocation}
                  onChange={(e) => setPLocation(e.target.value)}
                  placeholder="Accra, Ghana"
                  className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                required
                value={pDescription}
                onChange={(e) => setPDescription(e.target.value)}
                placeholder="Explain what Aizer Tech designed and built for this client..."
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Image URL OR Upload Image */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-medium text-neutral-300">
                Project Image (Paste Link OR Upload Photo)
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={pImageUrl}
                  onChange={(e) => setPImageUrl(e.target.value)}
                  placeholder="https://... or upload from phone/desktop"
                  className="flex-1 rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                />
                <label className="haptic-tap-sm min-h-[42px] px-4 py-2 rounded-2xl bg-white/[0.06] border border-[#D4AF37]/45 text-xs font-semibold text-[#FFD700] inline-flex items-center justify-center gap-2 cursor-pointer shrink-0">
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProjectImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {pImageUrl && (
                <div className="relative rounded-2xl overflow-hidden border border-white/15 h-36 bg-black">
                  <img
                    src={pImageUrl}
                    alt="Project preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPImageUrl('')}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/75 text-[11px] text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ImagePlus className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              )}
            </div>

            {projectFormError && (
              <p className="text-xs text-red-300 bg-red-500/12 border border-red-500/35 rounded-2xl px-4 py-2.5">
                {projectFormError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProjectModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.05] text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold cursor-pointer"
              >
                {editingProjectId ? 'Apply Project Edit' : 'Add to Portfolio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Restore Last Version Modal */}
      {confirmRestoreOpen && latestBackup && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmRestoreOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="luxury-card w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-4"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#FFD700]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="font-luxury text-xl font-bold text-white">
              Restore Last Live Version?
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This will immediately roll back your live website and draft to backup:{' '}
              <span className="text-[#FFD700] font-semibold">
                {latestBackup.label}
              </span>{' '}
              ({formatFullDateTime(latestBackup.backedUpAt)}).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.05] text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={handleConfirmRestore}
                className="gold-gradient-btn px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
              >
                {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Restore Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
