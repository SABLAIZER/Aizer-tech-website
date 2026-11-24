import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, Menu, MessageCircle, X } from 'lucide-react';
import { RegisteredUserRecord } from '../types';
import { BrandMark } from './BrandMark';
import { getInitial } from './admin/adminUtils';

interface NavbarProps {
  authUser: User | null;
  userProfile: RegisteredUserRecord | null;
  onNavigateContact: () => void;
  onOpenLogin: () => void;
  onOpenMyAccount: () => void;
  onLogout: () => void;
  onChatWithUs: () => void;
}

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'Portfolio', href: '#portfolio' },
  { label: 'Reviews', href: '#client-success' },
  { label: 'Book Call', href: '#book-call' },
  { label: 'Contact', href: '#contact' },
];

export const Navbar: React.FC<NavbarProps> = ({
  authUser,
  userProfile,
  onNavigateContact,
  onOpenLogin,
  onOpenMyAccount,
  onLogout,
  onChatWithUs,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleMobileNav = (href: string) => {
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isLoggedIn = Boolean(authUser && authUser.emailVerified);
  const displayName =
    userProfile?.name ||
    authUser?.displayName ||
    authUser?.email?.split('@')[0] ||
    'My Account';
  const shortName = displayName.split(' ')[0] || displayName;
  const photoUrl = userProfile?.photoUrl || authUser?.photoURL || '';

  return (
    <>
      <header className="sticky top-0 z-50 h-16 header-blur border-b border-hairline">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-3 lg:gap-6">
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-ink whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <BrandMark size="sm" />
            <span>Aizer Tech</span>
          </a>

          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-ink-muted"
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-ink transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={onOpenMyAccount}
                  className="haptic-tap hidden sm:inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-xl bg-surface-elevated border border-accent/40 text-xs font-semibold text-ink hover:border-accent whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-accent/60 shrink-0"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-accent-btn text-accent-ink font-bold text-[11px] flex items-center justify-center shrink-0">
                      {getInitial(displayName)}
                    </span>
                  )}
                  <span className="max-w-[140px] truncate">
                    My Account · {shortName}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="haptic-tap hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-hairline-strong text-xs font-medium text-ink-muted hover:text-red-400 hover:border-red-400/50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="haptic-tap inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-accent/50 bg-surface-elevated text-ink text-xs sm:text-sm font-semibold hover:border-accent whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-accent" />
                <span>Login</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNavigateContact}
              className="haptic-tap hidden md:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-accent-btn text-accent-ink text-xs sm:text-sm font-semibold hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Get Quote
            </button>

            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="haptic-tap lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-hairline-strong text-ink hover:border-accent/60 cursor-pointer shrink-0"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-canvas/95 backdrop-blur-xl flex flex-col justify-between p-6 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between h-12 pb-4 border-b border-hairline">
              <span className="inline-flex items-center gap-2.5 font-display text-lg font-semibold text-ink">
                <BrandMark size="sm" />
                <span>Aizer Tech</span>
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="haptic-tap inline-flex items-center justify-center w-11 h-11 rounded-xl border border-hairline-strong text-ink hover:border-accent/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav aria-label="Mobile" className="flex flex-col gap-2 pt-6">
              {NAV_LINKS.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleMobileNav(item.href)}
                  className="haptic-tap text-left py-3.5 px-3 rounded-xl text-lg font-medium text-ink hover:bg-surface-elevated hover:text-accent cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="space-y-3 pt-6 border-t border-hairline">
            {isLoggedIn ? (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenMyAccount();
                  }}
                  className="haptic-tap w-full py-3 px-4 rounded-xl bg-surface-elevated border border-accent/45 text-sm font-semibold text-ink flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={displayName}
                      referrerPolicy="no-referrer"
                      className="w-6 h-6 rounded-full object-cover border border-accent/60"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-accent-btn text-accent-ink font-bold text-xs flex items-center justify-center">
                      {getInitial(displayName)}
                    </span>
                  )}
                  <span className="truncate">My Account · {displayName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="haptic-tap w-full py-3 px-4 rounded-xl border border-red-500/35 text-xs font-semibold text-red-400 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenLogin();
                }}
                className="haptic-tap w-full py-3.5 px-4 rounded-xl border border-accent/60 bg-surface-elevated text-sm font-semibold text-ink inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-accent" />
                <span>Login with Google</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigateContact();
              }}
              className="haptic-tap w-full py-3.5 px-4 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover cursor-pointer"
            >
              Get Quote / New Request
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onChatWithUs();
              }}
              className="haptic-tap ios-glass-subtle w-full py-3.5 px-4 rounded-xl text-sm font-medium text-ink inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Chat With Us</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
