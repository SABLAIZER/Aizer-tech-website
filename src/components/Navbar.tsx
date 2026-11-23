import React, { useEffect, useState } from 'react';
import { Menu, MessageCircle, X } from 'lucide-react';
import { buildWhatsAppUrl, WHATSAPP_DISPLAY } from '../types';
import { BrandMark } from './BrandMark';

interface NavbarProps {
  onNavigateContact: () => void;
}

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'Food App Demo', href: '#portfolio' },
  { label: 'Process', href: '#process' },
  { label: 'Founder', href: '#founder' },
  { label: 'Contact', href: '#contact' },
];

export const Navbar: React.FC<NavbarProps> = ({ onNavigateContact }) => {
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

  return (
    <>
      <header className="sticky top-0 z-50 h-16 header-blur border-b border-hairline">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4 lg:gap-8">
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight text-ink whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <BrandMark size="sm" />
            <span>Aizer Tech</span>
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-ink-muted"
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

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onNavigateContact}
              className="haptic-tap hidden md:inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start a Project
            </button>

            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="haptic-tap md:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl border border-hairline-strong text-ink hover:border-accent/60 cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-canvas/95 backdrop-blur-xl flex flex-col justify-between p-6">
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
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigateContact();
              }}
              className="haptic-tap w-full py-3.5 px-4 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover cursor-pointer"
            >
              Start a Project
            </button>
            <a
              href={buildWhatsAppUrl(
                'Hello Aizer Tech, I would like to discuss a website or mobile app project.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="haptic-tap ios-glass-subtle w-full py-3.5 px-4 rounded-xl text-sm font-medium text-ink inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>WhatsApp {WHATSAPP_DISPLAY}</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
};
