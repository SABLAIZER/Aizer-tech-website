import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Crown, Eye, EyeOff, Loader2, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { ADMIN_EMAIL } from '../../types';

interface AdminLoginCardProps {
  authError: string | null;
  stayLoggedIn: boolean;
  onToggleStayLoggedIn: (value: boolean) => void;
  onEmailPasswordSignIn: (usernameOrEmail: string, password: string) => Promise<void>;
  onGoogleSignIn: (withGmailScope: boolean) => Promise<void>;
  onBackToSite: () => void;
}

export const AdminLoginCard: React.FC<AdminLoginCardProps> = ({
  authError,
  stayLoggedIn,
  onToggleStayLoggedIn,
  onEmailPasswordSignIn,
  onGoogleSignIn,
  onBackToSite,
}) => {
  const [identifier, setIdentifier] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setSubmitting(true);
    try {
      await onEmailPasswordSignIn(identifier.trim(), password);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async (withGmail: boolean) => {
    setGoogleBusy(true);
    try {
      await onGoogleSignIn(withGmail);
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-admin relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
      {/* Luxury Gold Ambient Orbs */}
      <div
        className="pointer-events-none fixed -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-[#D4AF37]/16 blur-[130px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -bottom-40 -right-24 w-[460px] h-[460px] rounded-full bg-[#FFD700]/12 blur-[150px]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <button
          type="button"
          onClick={onBackToSite}
          className="haptic-tap-sm inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-medium text-neutral-300 hover:text-white hover:border-[#D4AF37]/50 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Public Website</span>
        </button>

        <span className="text-[11px] font-mono-tabular uppercase tracking-[0.22em] text-[#D4AF37]/80">
          Accra · Private Portal
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md mx-auto my-8"
      >
        <div className="luxury-card rounded-3xl p-6 sm:p-9">
          {/* Gold Crown Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 bg-gradient-to-br from-[#FFD700]/25 via-[#D4AF37]/15 to-transparent border border-[#D4AF37]/45 flex items-center justify-center shadow-[0_0_32px_-6px_rgba(212,175,55,0.5)]">
              <Crown className="w-7 h-7 text-[#FFD700]" />
            </div>
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.26em] text-[#D4AF37] mb-1.5">
              Executive Suite
            </p>
            <h1 className="font-luxury text-2xl sm:text-3xl font-bold tracking-tight gold-gradient-text">
              AIZERTECH ADMIN
            </h1>
            <p className="text-xs text-neutral-400 mt-2">
              Private command portal for CEO Sablaizer
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/35 px-4 py-3 text-xs text-red-200 leading-relaxed"
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-medium text-neutral-300 mb-1.5"
              >
                Username or Admin Email
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#D4AF37]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="sablahevans0@gmail.com"
                  className="w-full rounded-2xl bg-[#0A0A0A]/90 border border-white/12 pl-10 pr-4 py-3.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-neutral-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#D4AF37]/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-2xl bg-[#0A0A0A]/90 border border-white/12 pl-10 pr-12 py-3.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-[#FFD700] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={(e) => onToggleStayLoggedIn(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#D4AF37] cursor-pointer"
                />
                <span>Stay Logged In</span>
              </label>
              <span className="text-[11px] text-neutral-500">Encrypted Auth</span>
            </div>

            <button
              type="submit"
              disabled={submitting || googleBusy}
              className="haptic-tap gold-gradient-btn w-full py-3.5 px-5 rounded-2xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Enter Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#111113] px-3 text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                Or Instant SSO
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={submitting || googleBusy}
              onClick={() => handleGoogleClick(true)}
              className="haptic-tap w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white text-[#141414] text-sm font-semibold hover:bg-neutral-100 disabled:opacity-60 cursor-pointer"
            >
              <svg viewBox="0 0 48 48" className="w-4 h-4 shrink-0" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{googleBusy ? 'Connecting...' : 'Continue with Google'}</span>
            </button>

            <button
              type="button"
              disabled={submitting || googleBusy}
              onClick={() => handleGoogleClick(false)}
              className="w-full py-2 text-[11px] text-neutral-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
            >
              Google Sign-In without Gmail permission
            </button>
          </div>
        </div>
      </motion.div>

      <p className="relative z-10 text-center text-[11px] text-neutral-500">
        AizerTech GH · Protected by Firebase Authentication &amp; Strict Access Rules
      </p>
    </div>
  );
};
