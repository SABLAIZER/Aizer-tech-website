import React from 'react';
import { MessageCircle } from 'lucide-react';
import {
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  StudioSettings,
  THEME_OPTIONS,
  ThemeMode,
} from '../types';
import { BrandMark } from './BrandMark';

interface FooterProps {
  theme: ThemeMode;
  settings: StudioSettings;
  onChangeTheme: (theme: ThemeMode) => void;
}

export const Footer: React.FC<FooterProps> = ({
  theme,
  settings,
  onChangeTheme,
}) => {
  const cleanWebRate = settings.websiteStartingPrice.replace(/^From\s+/i, '');
  const cleanMobileRate = settings.mobileStartingPrice.replace(/^From\s+/i, '');

  return (
    <footer className="border-t border-hairline bg-surface py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="font-display text-lg font-semibold text-ink">
              Aizer Tech
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            Websites from {cleanWebRate} · Mobile &amp; Food Apps from {cleanMobileRate} · Sablaizer · Accra, Ghana
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-sm text-ink-muted">
          <a href="#services" className="hover:text-ink transition-colors">
            Services
          </a>
          <a href="#portfolio" className="hover:text-ink transition-colors">
            Food App Demo
          </a>
          <a href="#founder" className="hover:text-ink transition-colors">
            Founder
          </a>
          <a href="#contact" className="hover:text-ink transition-colors">
            Contact
          </a>
          <a
            href={buildWhatsAppUrl(
              'Hello Aizer Tech, I would like to discuss a website or mobile app.',
              settings.whatsappNumber
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#25D366] hover:opacity-85 font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp {formatWhatsAppDisplay(settings.whatsappNumber)}</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-8 pt-6 border-t border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-ink-subtle">
        <p>
          © {new Date().getFullYear()} Aizer Tech · Founded by Evans Kwaku Sablah (Sablaizer) in Accra, Ghana ·{' '}
          <a
            href={`mailto:${settings.contactEmail}`}
            className="hover:text-ink transition-colors"
          >
            {settings.contactEmail}
          </a>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-muted mr-1">Surface Theme:</span>
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChangeTheme(option.id)}
              className={`haptic-tap-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer ${
                theme === option.id
                  ? 'border-accent text-ink bg-surface-elevated font-medium'
                  : 'border-hairline text-ink-muted hover:text-ink'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-hairline-strong shrink-0"
                style={{ backgroundColor: option.swatch }}
                aria-hidden="true"
              />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </footer>
  );
};
