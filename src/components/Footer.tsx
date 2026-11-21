import React from 'react';
import {
  buildWhatsAppUrl,
  THEME_OPTIONS,
  ThemeMode,
  WHATSAPP_DISPLAY,
} from '../types';
import { BrandMark } from './BrandMark';

interface FooterProps {
  onOpenInbox: () => void;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenInbox,
  theme,
  onChangeTheme,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-hairline bg-footer pt-12 pb-24 sm:pb-12 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 space-y-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <BrandMark size="sm" />
              <p className="font-display text-lg font-semibold text-ink leading-[1.2]">
                Aizer Tech
              </p>
            </div>
            <p className="text-xs text-ink-subtle mt-2 leading-relaxed">
              Accra, Ghana · Founded by Sablaizer - Evans Kwaku Sablah · Websites from GHS 800 · Mobile Apps from GHS 2,500
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-xs text-ink-muted">
            <a href="#services" className="hover:text-ink transition-colors">
              Services
            </a>
            <a href="#portfolio" className="hover:text-ink transition-colors">
              Food App
            </a>
            <a href="#founder" className="hover:text-ink transition-colors">
              Founder
            </a>
            <a href="#contact" className="hover:text-ink transition-colors">
              Contact
            </a>
            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 dark:text-[#25D366] font-medium hover:underline"
            >
              WhatsApp {WHATSAPP_DISPLAY}
            </a>

            <button
              type="button"
              onClick={onOpenInbox}
              className="haptic-tap text-ink-subtle hover:text-accent cursor-pointer"
            >
              Studio Inbox
            </button>
          </div>
        </div>

        {/* Footer Theme Toggle & Copyright Bar */}
        <div className="pt-6 border-t border-hairline flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <p className="text-[11px] font-mono-tabular uppercase tracking-[0.14em] text-ink-subtle">
              Surface Theme
            </p>

            <div
              role="group"
              aria-label="Select studio color theme"
              className="ios-glass-subtle inline-flex flex-wrap items-center gap-1 p-1 rounded-xl w-fit"
            >
              {THEME_OPTIONS.map((option) => {
                const active = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChangeTheme(option.id)}
                    className={`haptic-tap-sm inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-accent-btn text-accent-ink font-semibold shadow-sm'
                        : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full border border-hairline-strong shrink-0"
                      style={{ backgroundColor: option.swatch }}
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-ink-subtle leading-relaxed">
            © {currentYear} Aizer Tech. All rights reserved. · Built by Sablaizer in Accra, Ghana
          </p>
        </div>
      </div>
    </footer>
  );
};
