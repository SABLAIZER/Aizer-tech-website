import React, { useState } from 'react';
import { MapPin, MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, FOUNDER_PORTRAIT_URL, StudioSettings } from '../types';
import { Reveal } from './Reveal';

interface FounderSectionProps {
  settings: StudioSettings;
}

export const FounderSection: React.FC<FounderSectionProps> = ({ settings }) => {
  const [portraitFailed, setPortraitFailed] = useState(false);

  return (
    <section
      id="founder"
      className="section-ambient py-16 sm:py-20 lg:py-28 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <Reveal>
          <div className="ios-glass rounded-[28px] p-5 sm:p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: Real Founder Portrait + Static Caption Bar (no absolute text) */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[360px] rounded-[22px] border border-accent/35 overflow-hidden bg-surface-elevated shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)] flex flex-col">
                <div className="w-full aspect-[4/5] overflow-hidden bg-surface">
                  {!portraitFailed ? (
                    <img
                      src={FOUNDER_PORTRAIT_URL}
                      alt="Sablaizer — Evans Kwaku Sablah, Founder of Aizer Tech in Accra, Ghana"
                      referrerPolicy="no-referrer"
                      onError={() => setPortraitFailed(true)}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-surface-elevated to-surface">
                      <div className="ios-glass-gold w-24 h-24 rounded-full flex items-center justify-center mb-4">
                        <span className="font-display text-2xl font-semibold text-ink">
                          EKS
                        </span>
                      </div>
                      <p className="text-sm font-medium text-ink">
                        Evans Kwaku Sablah
                      </p>
                      <p className="text-xs text-ink-muted mt-1">Accra, Ghana</p>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 border-t border-hairline bg-surface flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold text-ink leading-[1.2]">
                      Evans Kwaku Sablah
                    </p>
                    <p className="text-xs text-accent flex items-center gap-1 mt-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>Sablaizer · Accra, Ghana</span>
                    </p>
                  </div>
                  <span className="font-mono-tabular text-[11px] text-ink-muted shrink-0">
                    FOUNDER
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Founder Bio & Attribution */}
            <div className="lg:col-span-7 min-w-0">
              <p className="text-sm text-accent font-medium mb-3">
                Studio Leadership
              </p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-5">
                Founded by Sablaizer - Evans Kwaku Sablah from Accra
              </h2>
              <p className="text-sm sm:text-base text-ink-secondary leading-relaxed mb-5">
                {settings.founderBio}
              </p>
              <p className="text-sm sm:text-base text-ink-secondary leading-relaxed mb-8">
                Every website (
                <span className="text-ink font-mono-tabular font-semibold whitespace-nowrap">
                  {settings.websiteStartingPrice}
                </span>
                ) and mobile application (
                <span className="text-ink font-mono-tabular font-semibold whitespace-nowrap">
                  {settings.mobileStartingPrice}
                </span>
                ) is architected with clean code, Mobile Money readiness, and direct founder accountability from kickoff to launch.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4">
                <a
                  href={buildWhatsAppUrl(
                    'Hello Sablaizer, I would like to speak with you directly about a project with Aizer Tech.',
                    settings.whatsappNumber
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="haptic-tap ios-glass-subtle w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium text-ink hover:border-[#25D366]/60"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span>Speak Directly with Sablaizer</span>
                </a>
                <a
                  href="#contact"
                  className="haptic-tap w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover"
                >
                  Start Your Project
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
