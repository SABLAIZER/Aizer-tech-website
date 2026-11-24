import React, { useEffect, useState } from 'react';
import {
  Clock,
  KeyRound,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import {
  DEFAULT_STUDIO_SETTINGS,
  STUDIO_SETTINGS_LIMITS,
  StudioSettings,
  VALIDATION_LIMITS,
} from '../../types';

interface AdminSettingsViewProps {
  studioSettings: StudioSettings;
  userEmail: string;
  onSaveSettings: (next: StudioSettings) => Promise<void>;
  onChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  studioSettings,
  userEmail,
  onSaveSettings,
  onChangePassword,
}) => {
  const [draft, setDraft] = useState<StudioSettings>(studioSettings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Admin password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPass, setUpdatingPass] = useState(false);
  const [passNotice, setPassNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!dirty) {
      setDraft(studioSettings);
    }
  }, [studioSettings, dirty]);

  const updateField = <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K]
  ) => {
    setDirty(true);
    setSettingsNotice(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetDefaults = () => {
    setDirty(true);
    setDraft({
      ...DEFAULT_STUDIO_SETTINGS,
      updatedAt: studioSettings.updatedAt,
    });
    setSettingsNotice({
      type: 'info',
      text: 'Default studio values loaded. Click "Save & Sync Website" to publish live.',
    });
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsNotice(null);

    const whatsappNumber = draft.whatsappNumber.replace(/[^\d+]/g, '').trim();
    const contactEmail = draft.contactEmail.trim();
    const websiteStartingPrice = draft.websiteStartingPrice.trim();
    const mobileStartingPrice = draft.mobileStartingPrice.trim();
    const brandingStartingPrice = draft.brandingStartingPrice.trim();
    const announcementBanner = draft.announcementBanner.trim();
    const heroHeadline = draft.heroHeadline.trim();
    const heroSubheadline = draft.heroSubheadline.trim();
    const founderBio = draft.founderBio.trim();
    const momoNumber = draft.momoNumber.trim();
    const momoName = draft.momoName.trim();
    const autoReplyMessage = draft.autoReplyMessage.trim();
    const workingHours = draft.workingHours.trim();

    if (
      whatsappNumber.length < STUDIO_SETTINGS_LIMITS.MIN_PHONE_LEN ||
      whatsappNumber.length > STUDIO_SETTINGS_LIMITS.MAX_PHONE_LEN
    ) {
      setSettingsNotice({
        type: 'error',
        text: 'WhatsApp number must be between 7 and 20 characters (e.g. 233276335736).',
      });
      return;
    }

    if (!VALIDATION_LIMITS.EMAIL_REGEX.test(contactEmail)) {
      setSettingsNotice({
        type: 'error',
        text: 'Please enter a valid Studio Contact Email address.',
      });
      return;
    }

    if (momoNumber.length < 7) {
      setSettingsNotice({
        type: 'error',
        text: 'Please enter a valid MTN MoMo / Telecel Cash number.',
      });
      return;
    }

    if (momoName.length < 2) {
      setSettingsNotice({
        type: 'error',
        text: 'Please enter your MoMo Account Name (e.g. AizerTech GH).',
      });
      return;
    }

    if (
      websiteStartingPrice.length < STUDIO_SETTINGS_LIMITS.MIN_PRICE_LABEL ||
      mobileStartingPrice.length < STUDIO_SETTINGS_LIMITS.MIN_PRICE_LABEL ||
      brandingStartingPrice.length < STUDIO_SETTINGS_LIMITS.MIN_PRICE_LABEL
    ) {
      setSettingsNotice({
        type: 'error',
        text: 'Please provide valid pricing labels for all three service tiers.',
      });
      return;
    }

    if (
      heroHeadline.length < STUDIO_SETTINGS_LIMITS.MIN_HERO_HEADLINE ||
      heroSubheadline.length < STUDIO_SETTINGS_LIMITS.MIN_HERO_SUBHEADLINE ||
      founderBio.length < STUDIO_SETTINGS_LIMITS.MIN_FOUNDER_BIO
    ) {
      setSettingsNotice({
        type: 'error',
        text: 'Headline, subheadline, and founder bio must meet minimum length requirements.',
      });
      return;
    }

    setSaving(true);
    try {
      await onSaveSettings({
        whatsappNumber,
        contactEmail,
        websiteStartingPrice,
        mobileStartingPrice,
        brandingStartingPrice,
        announcementBanner,
        heroHeadline,
        heroSubheadline,
        founderBio,
        momoNumber,
        momoName,
        autoReplyMessage:
          autoReplyMessage || DEFAULT_STUDIO_SETTINGS.autoReplyMessage,
        workingHours: workingHours || DEFAULT_STUDIO_SETTINGS.workingHours,
      });
      setDirty(false);
      setSettingsNotice({
        type: 'success',
        text: 'Saved & synced live! Your MoMo invoice details, auto-reply template, working hours, and website updated immediately.',
      });
    } catch (error) {
      setSettingsNotice({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not save studio settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassNotice(null);

    if (newPassword.length < 8) {
      setPassNotice({
        type: 'error',
        text: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassNotice({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }

    setUpdatingPass(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPassNotice({
        type: 'success',
        text: 'Admin password updated securely on Firebase Authentication.',
      });
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code === 'auth/requires-recent-login') {
        setPassNotice({
          type: 'error',
          text: 'For security, please log out and log back in fresh before changing your admin password.',
        });
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPassNotice({
          type: 'error',
          text: 'Current password is incorrect.',
        });
      } else {
        setPassNotice({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Unable to update password right now.',
        });
      }
    } finally {
      setUpdatingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="luxury-card rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
            Business &amp; Payment Settings
          </p>
          <h1 className="font-luxury text-2xl sm:text-3xl font-bold text-white mt-1">
            Studio Settings
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage MoMo billing details, auto-reply template, working hours, and website contacts
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="haptic-tap-sm px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/12 text-xs font-semibold text-neutral-200 hover:border-[#D4AF37]/50 inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Live Business & Website Settings Form */}
      <form
        onSubmit={handleSubmitSettings}
        className="luxury-card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        {/* MoMo Payment + Working Hours + Auto-Reply */}
        <div className="space-y-4 pb-6 border-b border-white/10">
          <div>
            <h2 className="font-luxury text-xl font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#FFD700]" />
              <span>MoMo Payment, Auto-Reply &amp; Working Hours</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Printed on every PDF/WhatsApp invoice and shown when clients submit inquiries
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="set-momo-number"
                className="block text-xs font-medium text-neutral-300 mb-1.5"
              >
                My MoMo Number
              </label>
              <input
                id="set-momo-number"
                type="text"
                maxLength={STUDIO_SETTINGS_LIMITS.MAX_MOMO_NUMBER}
                value={draft.momoNumber}
                onChange={(e) => updateField('momoNumber', e.target.value)}
                placeholder="027 633 5736"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-[#FFD700] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label
                htmlFor="set-momo-name"
                className="block text-xs font-medium text-neutral-300 mb-1.5"
              >
                MoMo Name
              </label>
              <input
                id="set-momo-name"
                type="text"
                maxLength={STUDIO_SETTINGS_LIMITS.MAX_MOMO_NAME}
                value={draft.momoName}
                onChange={(e) => updateField('momoName', e.target.value)}
                placeholder="AizerTech GH"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label
                htmlFor="set-working-hours"
                className="block text-xs font-medium text-neutral-300 mb-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>My Working Hours</span>
                </span>
              </label>
              <input
                id="set-working-hours"
                type="text"
                maxLength={STUDIO_SETTINGS_LIMITS.MAX_WORKING_HOURS}
                value={draft.workingHours}
                onChange={(e) => updateField('workingHours', e.target.value)}
                placeholder="Mon – Sat · 8:00 AM – 7:00 PM GMT"
                className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="set-auto-reply"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>
                  My Auto-Reply Message (Use [Name] and [Service] placeholders)
                </span>
              </span>
            </label>
            <textarea
              id="set-auto-reply"
              rows={2}
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_AUTO_REPLY}
              value={draft.autoReplyMessage}
              onChange={(e) => updateField('autoReplyMessage', e.target.value)}
              placeholder="Hello [Name], Thanks for contacting AizerTech GH! We received your request for [Service]. We will reply within 30 minutes. - AizerTech"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {/* Contact & Prices */}
        <div>
          <h2 className="font-luxury text-xl font-bold text-white mb-1">
            Contact Channels &amp; Service Prices
          </h2>
          <p className="text-xs text-neutral-400">
            Synced directly to all WhatsApp buttons, footer, and service tier cards
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="set-whatsapp"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              WhatsApp Number (Country Code + Digits)
            </label>
            <input
              id="set-whatsapp"
              type="text"
              value={draft.whatsappNumber}
              onChange={(e) => updateField('whatsappNumber', e.target.value)}
              placeholder="233276335736"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="set-email"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Studio Contact Email
            </label>
            <input
              id="set-email"
              type="email"
              value={draft.contactEmail}
              onChange={(e) => updateField('contactEmail', e.target.value)}
              placeholder="sablahevans0@gmail.com"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="set-web-price"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Website Price
            </label>
            <input
              id="set-web-price"
              type="text"
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL}
              value={draft.websiteStartingPrice}
              onChange={(e) => updateField('websiteStartingPrice', e.target.value)}
              placeholder="From GHS 800"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="set-mobile-price"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Mobile / Food App Price
            </label>
            <input
              id="set-mobile-price"
              type="text"
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL}
              value={draft.mobileStartingPrice}
              onChange={(e) => updateField('mobileStartingPrice', e.target.value)}
              placeholder="From GHS 2,500"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="set-brand-price"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Logo / UI/UX Price
            </label>
            <input
              id="set-brand-price"
              type="text"
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_PRICE_LABEL}
              value={draft.brandingStartingPrice}
              onChange={(e) => updateField('brandingStartingPrice', e.target.value)}
              placeholder="Project Based"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm font-mono-tabular text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-4">
          <h3 className="font-luxury text-lg font-bold text-white">
            Homepage Copy &amp; Banner
          </h3>

          <div>
            <label
              htmlFor="set-banner"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Announcement Banner (Leave empty to hide)
            </label>
            <input
              id="set-banner"
              type="text"
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_ANNOUNCEMENT}
              value={draft.announcementBanner}
              onChange={(e) => updateField('announcementBanner', e.target.value)}
              placeholder="e.g. Booking November slots — 50% MoMo deposit secures kickoff."
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="set-headline"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Hero Headline
            </label>
            <input
              id="set-headline"
              type="text"
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_HERO_HEADLINE}
              value={draft.heroHeadline}
              onChange={(e) => updateField('heroHeadline', e.target.value)}
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="set-subheadline"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Hero Subheadline
            </label>
            <textarea
              id="set-subheadline"
              rows={3}
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_HERO_SUBHEADLINE}
              value={draft.heroSubheadline}
              onChange={(e) => updateField('heroSubheadline', e.target.value)}
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="set-founder-bio"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Founder Bio
            </label>
            <textarea
              id="set-founder-bio"
              rows={3}
              maxLength={STUDIO_SETTINGS_LIMITS.MAX_FOUNDER_BIO}
              value={draft.founderBio}
              onChange={(e) => updateField('founderBio', e.target.value)}
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {settingsNotice && (
          <div
            role={settingsNotice.type === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium border ${
              settingsNotice.type === 'success'
                ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200'
                : settingsNotice.type === 'error'
                ? 'bg-red-500/12 border-red-500/35 text-red-200'
                : 'bg-[#D4AF37]/12 border-[#D4AF37]/35 text-[#FFD700]'
            }`}
          >
            {settingsNotice.text}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="haptic-tap gold-gradient-btn px-6 py-3.5 rounded-2xl text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Live...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save &amp; Sync Website</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Admin Password Security Card */}
      <form
        onSubmit={handleSubmitPassword}
        className="luxury-card rounded-3xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-luxury text-xl font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#FFD700]" />
              <span>Admin Password</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Update or set a password for <span className="text-white font-medium">{userEmail}</span> in Firebase Authentication
            </p>
          </div>
          <ShieldCheck className="w-5 h-5 text-[#D4AF37] shrink-0" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="pw-current"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Current Password (if set)
            </label>
            <input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="pw-new"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              New Password (min 8 chars)
            </label>
            <input
              id="pw-new"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label
              htmlFor="pw-confirm"
              className="block text-xs font-medium text-neutral-300 mb-1.5"
            >
              Confirm New Password
            </label>
            <input
              id="pw-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {passNotice && (
          <div
            role={passNotice.type === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium border ${
              passNotice.type === 'success'
                ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-200'
                : 'bg-red-500/12 border-red-500/35 text-red-200'
            }`}
          >
            {passNotice.text}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updatingPass}
            className="haptic-tap px-5 py-3 rounded-2xl bg-white/[0.06] border border-[#D4AF37]/45 text-xs sm:text-sm font-semibold text-[#FFD700] hover:bg-[#D4AF37]/15 disabled:opacity-60 cursor-pointer"
          >
            {updatingPass ? 'Updating Password...' : 'Update Admin Password'}
          </button>
        </div>
      </form>
    </div>
  );
};
