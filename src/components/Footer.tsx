import React from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, isUsableWhatsAppNumber } from '../types';
import { BrandMark } from './BrandMark';

interface FooterProps {
  whatsappNumber: string;
}

export const Footer: React.FC<FooterProps> = ({ whatsappNumber }) => {
  const hasValidWhatsApp = isUsableWhatsAppNumber(whatsappNumber);

  return (
    <footer className="border-t border-hairline bg-[#030305] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="font-display text-lg font-bold text-white">
              AizerTech GH — AizerTech
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            We Build Apps, Websites &amp; Brands That Sell · Sablaizer · Accra, Ghana
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-ink-muted">
          <a href="#services" className="hover:text-white transition-colors">
            Services
          </a>
          <a href="#portfolio" className="hover:text-white transition-colors">
            Our Work
          </a>
          <a href="#why-us" className="hover:text-white transition-colors">
            Why Us
          </a>
          <a href="#contact" className="hover:text-white transition-colors">
            Contact
          </a>
          {hasValidWhatsApp && (
            <a
              href={buildWhatsAppUrl(whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-neon hover:text-neon-hover font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 mt-8 pt-6 border-t border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-ink-subtle">
        <p>© {new Date().getFullYear()} AizerTech GH. All rights reserved.</p>
        <p>Accra, Ghana · Built by Sablaizer</p>
      </div>
    </footer>
  );
};
