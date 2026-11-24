import React from 'react';
import { ArrowUpRight, MessageCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import {
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  WebsiteCmsData,
} from '../types';
import { BrandMark } from './BrandMark';

interface HeroProps {
  cms: WebsiteCmsData;
  loading?: boolean;
  onStartProject: () => void;
  onExplorePortfolio: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  cms,
  loading = false,
  onStartProject,
  onExplorePortfolio,
}) => {
  const { hero, services } = cms;
  const webService =
    services.find((s) => s.name.toLowerCase().includes('web')) || services[0];
  const appService =
    services.find((s) => s.name.toLowerCase().includes('app')) || services[1];

  const webRateLabel = webService?.startingPrice || 'From GHS 800';
  const mobileRateLabel = appService?.startingPrice || 'From GHS 2,500';
  const cleanWebRate = webRateLabel.replace(/^From\s+/i, '');
  const cleanMobileRate = mobileRateLabel.replace(/^From\s+/i, '');
  const whatsappDisplay = formatWhatsAppDisplay(hero.whatsappNumber);
  const announcement = hero.announcementBanner.trim();

  if (loading) {
    return (
      <section
        id="top"
        className="section-ambient pt-8 pb-14 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24 border-b border-hairline"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 space-y-5 py-2">
              <div className="h-4 w-56 rounded-full bg-surface-elevated" />
              <div className="h-12 w-full rounded-2xl bg-surface-elevated" />
              <div className="h-12 w-4/5 rounded-2xl bg-surface-elevated" />
              <div className="h-20 w-full max-w-2xl rounded-2xl bg-surface-elevated" />
              <div className="flex flex-wrap gap-3 pt-4">
                <div className="h-12 w-40 rounded-xl bg-surface-elevated" />
                <div className="h-12 w-48 rounded-xl bg-surface-elevated" />
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="ios-glass rounded-[24px] h-[340px] p-6" />
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-hairline grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="space-y-2">
                <div className="h-8 w-28 rounded-xl bg-surface-elevated" />
                <div className="h-4 w-36 rounded-lg bg-surface-elevated" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="top"
      className="section-ambient pt-8 pb-14 sm:pt-14 sm:pb-16 lg:pt-20 lg:pb-24 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        {announcement && (
          <div className="mb-6 sm:mb-8 rounded-xl ios-glass-gold px-4 py-3 flex items-start sm:items-center gap-2.5 text-xs sm:text-sm text-ink">
            <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">{announcement}</p>
          </div>
        )}

        {/* Split-Screen Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-stretch">
          {/* Left Column: Typographic Proposition */}
          <div className="lg:col-span-7 min-w-0 flex flex-col justify-between py-1 sm:py-2">
            <div>
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-ink-muted tracking-wide mb-5">
                <span>Aizer Tech</span>
                <span className="text-accent" aria-hidden="true">
                  ·
                </span>
                <span>{hero.location}</span>
                <span className="text-accent" aria-hidden="true">
                  ·
                </span>
                <span>Led by Sablaizer</span>
              </p>

              <h1 className="font-display text-[1.85rem] sm:text-4xl lg:text-[3.4rem] font-semibold tracking-tight text-ink leading-[1.2] break-words mb-5 sm:mb-6">
                {hero.heroTitle}
              </h1>

              <p className="text-[15px] sm:text-base lg:text-lg text-ink-secondary leading-relaxed max-w-2xl mb-8 sm:mb-10">
                {hero.heroSubtitle}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3.5 sm:gap-4">
              <button
                type="button"
                onClick={onStartProject}
                className="haptic-tap w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_30px_-10px_rgba(212,168,83,0.42)] sm:whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span>Request a Quote</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" />
              </button>

              <a
                href={buildWhatsAppUrl(
                  'Hello Aizer Tech, I would like to discuss building a website or mobile app.',
                  hero.whatsappNumber
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="haptic-tap ios-glass-subtle w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3.5 rounded-xl text-ink text-sm font-medium hover:border-[#25D366]/60 sm:whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                <span>WhatsApp {whatsappDisplay}</span>
              </a>

              <button
                type="button"
                onClick={onExplorePortfolio}
                className="haptic-tap w-full sm:w-auto inline-flex items-center justify-center px-3 py-3 text-sm font-medium text-ink-muted hover:text-ink sm:whitespace-nowrap shrink-0 cursor-pointer"
              >
                View Portfolio &amp; Demo
              </button>
            </div>
          </div>

          {/* Right Column: iOS Frosted Glass Studio Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 min-w-0 w-full"
          >
            <div className="ios-glass w-full h-full rounded-[24px] p-5 sm:p-6 lg:p-7 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4 mb-5 sm:mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandMark size="md" />
                  <div className="min-w-0">
                    <p className="text-xs text-ink-muted leading-snug">
                      Aizer Tech Studio Index
                    </p>
                    <p className="font-display text-lg font-semibold text-ink leading-[1.2] mt-1">
                      Web &amp; Mobile Craft
                    </p>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs text-accent shrink-0 uppercase">
                  {hero.location}
                </span>
              </div>

              {/* Frosted Glass Tier Surfaces */}
              <div className="space-y-4 my-auto">
                <div className="ios-glass-subtle rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 mb-2.5">
                    <span className="text-xs text-ink-muted">
                      Tier 01 · {webService?.name || 'Website Development'}
                    </span>
                    <span className="font-mono-tabular text-sm font-semibold text-accent">
                      {webRateLabel}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-ink leading-snug mb-1.5">
                    Signature Company Sites &amp; Booking Portals
                  </p>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Delivered in {webService?.deliveryTime || '7 Days'} with WhatsApp lead routing and fast mobile loading.
                  </p>
                </div>

                <div className="ios-glass-gold rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 mb-2.5">
                    <span className="text-xs text-accent font-medium">
                      Tier 02 · {appService?.name || 'App Development'}
                    </span>
                    <span className="font-mono-tabular text-sm font-semibold text-ink">
                      {mobileRateLabel}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-ink leading-snug mb-1.5">
                    iOS &amp; Android Apps with MoMo Checkout
                  </p>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    Delivered in {appService?.deliveryTime || '3 – 6 Weeks'} with MTN MoMo / Telecel Cash checkout and real-time sync.
                  </p>
                </div>
              </div>

              {/* iOS Glass Bottom Dock Bar */}
              <div className="pt-5 mt-5 sm:mt-6 border-t border-hairline flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-ink-muted">
                <span>Direct Founder Engineering</span>
                <button
                  type="button"
                  onClick={onExplorePortfolio}
                  className="haptic-tap text-left sm:text-right text-accent hover:opacity-80 font-medium cursor-pointer"
                >
                  Inspect Live Food App Demo →
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Full-Width 4-Column Benchmark Strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 sm:mt-12 lg:mt-16 pt-8 border-t border-hairline grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          <div className="min-w-0">
            <p className="font-mono-tabular text-2xl lg:text-3xl font-semibold text-ink leading-[1.2]">
              {cleanWebRate}
            </p>
            <p className="text-sm text-ink-muted mt-1.5">
              Business websites starting rate
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono-tabular text-2xl lg:text-3xl font-semibold text-ink leading-[1.2]">
              {cleanMobileRate}
            </p>
            <p className="text-sm text-ink-muted mt-1.5">
              Mobile applications starting rate
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl lg:text-3xl font-semibold text-ink leading-[1.2]">
              {hero.location}
            </p>
            <p className="text-sm text-ink-muted mt-1.5">
              Serving Ghana &amp; global teams
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono-tabular text-xl sm:text-2xl lg:text-3xl font-semibold text-accent leading-[1.2] break-words">
              {whatsappDisplay}
            </p>
            <p className="text-sm text-ink-muted mt-1.5">
              Direct WhatsApp consultation
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
