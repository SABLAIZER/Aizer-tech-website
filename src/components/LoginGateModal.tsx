import React, { useState } from 'react';
import { Crown, Loader2, Lock, Phone, ShieldCheck, X } from 'lucide-react';
import { LoginGateReason } from '../types';

interface LoginGateModalProps {
  open: boolean;
  reason: LoginGateReason;
  authError: string | null;
  onGoogleLogin: () => Promise<void>;
  onClose: () => void;
}

const REASON_LABELS: Record<LoginGateReason, string> = {
  chat: 'to start a live chat with AizerTech',
  request: 'to submit a new project request',
  'book-call': 'to book your free discovery call',
  quote: 'to request an official GHS quote',
  'my-account': 'to open your Client Portal',
  login: 'to access your AizerTech account',
};

export const LoginGateModal: React.FC<LoginGateModalProps> = ({
  open,
  reason,
  authError,
  onGoogleLogin,
  onClose,
}) => {
  const [signingIn, setSigningIn] = useState(false);

  if (!open) return null;

  const handleContinue = async () => {
    setSigningIn(true);
    try {
      await onGoogleLogin();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-gate-title"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="luxury-card w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-6 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close login modal"
          className="absolute top-5 right-5 min-w-[38px] min-h-[38px] rounded-xl bg-white/[0.06] border border-white/10 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#B8860B] text-[#0A0A0A] flex items-center justify-center shadow-[0_0_24px_-6px_rgba(212,175,55,0.6)] shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              AizerTech GH Client Access
            </p>
            <h2
              id="login-gate-title"
              className="font-luxury text-xl sm:text-2xl font-bold text-white mt-0.5"
            >
              Login to Continue 🔐
            </h2>
          </div>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed">
          Login with Google to chat with AizerTech, track your project, and view invoices —{' '}
          <span className="text-[#FFD700] font-medium">
            {REASON_LABELS[reason]}.
          </span>
        </p>

        {authError && (
          <div
            role="alert"
            className="rounded-2xl bg-red-500/12 border border-red-500/35 px-4 py-3 text-xs text-red-200 leading-relaxed"
          >
            {authError}
          </div>
        )}

        <button
          type="button"
          disabled={signingIn}
          onClick={handleContinue}
          className="haptic-tap gold-gradient-btn w-full py-3.5 px-5 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
        >
          {signingIn ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting Google Account...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v2.98h5.35c-.23 1.48-1.73 4.35-5.35 4.35-3.22 0-5.85-2.67-5.85-5.93s2.63-5.93 5.85-5.93c1.83 0 3.06.78 3.76 1.45l2.56-2.48C16.69 4.02 14.55 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.59-.06-1.04-.15-1.1z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="pt-3 border-t border-white/10 flex items-start gap-2.5 text-xs text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <p>
            We only use your Google name &amp; email to reply to you. No spam.
          </p>
        </div>
      </div>
    </div>
  );
};

interface FirstLoginPhoneModalProps {
  open: boolean;
  userName: string;
  onSavePhone: (phone: string) => Promise<void>;
  onSkip: () => Promise<void>;
}

export const FirstLoginPhoneModal: React.FC<FirstLoginPhoneModalProps> = ({
  open,
  userName,
  onSavePhone,
  onSkip,
}) => {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = phone.trim();
    if (clean.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid WhatsApp or phone number.');
      return;
    }
    setSaving(true);
    try {
      await onSavePhone(clean);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save phone.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await onSkip();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-login-phone-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="luxury-card w-full max-w-md rounded-3xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFD700] flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-[#D4AF37]">
              Welcome, {userName}
            </p>
            <h2
              id="first-login-phone-title"
              className="font-luxury text-xl font-bold text-white mt-0.5"
            >
              Add Your WhatsApp Number
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
          One quick step so AizerTech GH can send project updates, invoices, and call confirmations directly to you.
        </p>

        <div>
          <label
            htmlFor="first-login-phone-input"
            className="block text-xs font-medium text-neutral-300 mb-1.5"
          >
            Phone / WhatsApp Number
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="first-login-phone-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+233 24 000 0000"
              className="w-full rounded-2xl bg-[#0A0A0A] border border-white/12 pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-300 bg-red-500/12 border border-red-500/35 rounded-2xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={handleSkip}
            className="px-4 py-3 rounded-2xl bg-white/[0.05] text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer"
          >
            Skip for now
          </button>
          <button
            type="submit"
            disabled={saving}
            className="gold-gradient-btn px-5 py-3 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save &amp; Continue</span>
          </button>
        </div>
      </form>
    </div>
  );
};
