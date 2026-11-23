import React, { useEffect, useState } from 'react';
import { Menu, MessageCircle, X } from 'lucide-react';
import { buildWhatsAppUrl, isUsableWhatsAppNumber } from '../types';
import { BrandMark } from './BrandMark';

interface NavbarProps {
  whatsappNumber: string;
  onNavigateContact: () => void;
}

const NAV_LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'Our Work', href: '#portfolio' },
  { label: 'Why Us', href: '#why-us' },
  { label: 'Contact', href: '#contact' },
];

export const Navbar: React.FC<NavbarProps> = ({
  whatsappNumber,
  onNavigateContact,
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

  const hasValidWhatsApp = isUsableWhatsAppNumber(whatsappNumber);

  return (
    <>
      <header className="sticky top-0 z-50 h-16 header-blur border-b border-hairline">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4 lg:gap-8">
          <a
            href="#top"
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon"
          >
            <BrandMark size="sm" />
            <span>AizerTech GH</span>
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 lg:gap-8 text-sm font-medium text-ink-muted"
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-white transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-neon focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neon"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onNavigateContact}
              className="tap-feedback hidden md:inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon"
            >
              Start Your Project
            </button>

            <button
              type="button"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((prev) => !prev)}
              className="tap-feedback md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-hairline-strong text-white hover:border-neon/60 cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-[#050507]/98 backdrop-blur-xl flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between h-12 pb-4 border-b border-hairline">
              <span className="inline-flex items-center gap-2.5 font-display text-lg font-bold text-white">
                <BrandMark size="sm" />
                <span>AizerTech GH</span>
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="tap-feedback inline-flex items-center justify-center w-11 h-11 rounded-lg border border-hairline-strong text-white hover:border-neon/60 cursor-pointer"
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
                  className="tap-feedback text-left py-3.5 px-3 rounded-xl text-lg font-medium text-white hover:bg-surface-elevated hover:text-neon cursor-pointer"
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
              className="tap-feedback w-full py-3.5 px-4 rounded-xl bg-neon text-neon-ink text-sm font-semibold hover:bg-neon-hover cursor-pointer"
            >
              Start Your Project
            </button>
            {hasValidWhatsApp && (
              <a
                href={buildWhatsAppUrl(whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="tap-feedback w-full py-3.5 px-4 rounded-xl bg-surface border border-hairline-strong text-sm font-medium text-white inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-neon" />
                <span>WhatsApp {whatsappNumber}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
};
