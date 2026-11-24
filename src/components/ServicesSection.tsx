import React from 'react';
import { ArrowUpRight, Clock, MessageCircle, Wallet } from 'lucide-react';
import {
  BudgetTier,
  buildWhatsAppUrl,
  CmsServiceItem,
  ServiceType,
  WebsiteCmsData,
} from '../types';
import { Reveal } from './Reveal';

interface ServicesSectionProps {
  cms: WebsiteCmsData;
  loading?: boolean;
  onSelectService: (service: ServiceType, budget: BudgetTier) => void;
}

function mapServiceToBookingArgs(service: CmsServiceItem): {
  serviceType: ServiceType;
  defaultBudget: BudgetTier;
} {
  const n = service.name.toLowerCase();
  if (n.includes('app') || n.includes('mobile')) {
    return {
      serviceType: 'Mobile App (from GHS 2,500)',
      defaultBudget: 'GHS 2,500 - 5,000',
    };
  }
  if (n.includes('e-commerce') || n.includes('ecommerce') || n.includes('food')) {
    return {
      serviceType: 'Food App / Custom Platform',
      defaultBudget: 'GHS 1,500 - 2,500',
    };
  }
  if (n.includes('web') || n.includes('site')) {
    return {
      serviceType: 'Business Website (from GHS 800)',
      defaultBudget: 'GHS 800 - 1,500',
    };
  }
  return {
    serviceType: 'Consulting & UI/UX',
    defaultBudget: 'GHS 800 - 1,500',
  };
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  cms,
  loading = false,
  onSelectService,
}) => {
  const visibleServices = cms.services.filter((item) => item.visible);

  if (loading) {
    return (
      <section
        id="services"
        className="py-16 sm:py-20 lg:py-28 border-b border-hairline"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 animate-pulse">
          <div className="h-8 w-80 rounded-2xl bg-surface-elevated mb-10" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="lg:col-span-6 h-72 rounded-[22px] ios-glass p-7"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="services"
      className="py-16 sm:py-20 lg:py-28 border-b border-hairline"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <Reveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 lg:gap-8 mb-10 sm:mb-14">
            <div className="max-w-2xl">
              <p className="text-sm text-accent font-medium mb-3">
                Capabilities &amp; Transparent Pricing
              </p>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-ink leading-[1.2] mb-1">
                Focused engineering services with clear starting rates.
              </h2>
            </div>
            <p className="text-sm lg:text-base text-ink-muted max-w-md leading-relaxed">
              Every Aizer Tech engagement includes clean source architecture, mobile optimization, and direct engineering communication from {cms.hero.location}.
            </p>
          </div>
        </Reveal>

        {/* Live Dynamic Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {visibleServices.map((service, index) => {
            const numberLabel = `${String(index + 1).padStart(2, '0')}.`;
            const isOddLast =
              visibleServices.length % 2 === 1 &&
              index === visibleServices.length - 1;
            const colSpan = isOddLast ? 'lg:col-span-12' : 'lg:col-span-6';
            const booking = mapServiceToBookingArgs(service);

            return (
              <Reveal
                key={service.id}
                delay={Math.min(index * 0.05, 0.2)}
                className={`${colSpan} w-full`}
              >
                <article className="h-full w-full min-w-0 ios-glass rounded-[22px] p-5 sm:p-7 lg:p-8 flex flex-col justify-between transition-colors duration-150 hover:border-accent/50">
                  <div className="min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2.5 sm:gap-4 pb-5 mb-5 sm:mb-6 border-b border-hairline">
                      <div className="flex items-baseline gap-2.5 min-w-0">
                        <span className="font-mono-tabular text-sm text-accent shrink-0">
                          {numberLabel}
                        </span>
                        <h3 className="font-display text-lg sm:text-xl lg:text-2xl font-semibold text-ink leading-[1.2] break-words">
                          {service.name}
                        </h3>
                      </div>
                      <span className="font-mono-tabular text-sm sm:text-base font-semibold text-accent sm:whitespace-nowrap shrink-0">
                        {service.startingPrice}
                      </span>
                    </div>

                    <p className="text-xs text-ink-subtle mb-3 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      <span>Delivery: {service.deliveryTime}</span>
                    </p>
                    <p className="text-sm lg:text-[15px] text-ink-secondary leading-relaxed mb-6">
                      {service.description}
                    </p>

                    {service.deliverables.length > 0 && (
                      <ul className="space-y-2.5 mb-8">
                        {service.deliverables.map((item) => (
                          <li
                            key={item}
                            className="text-sm text-ink-secondary flex items-start gap-2.5"
                          >
                            <span
                              className="text-accent mt-0.5 select-none shrink-0"
                              aria-hidden="true"
                            >
                              —
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-5 border-t border-hairline flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        onSelectService(booking.serviceType, booking.defaultBudget)
                      }
                      className="haptic-tap ios-glass-subtle w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-ink hover:border-accent hover:text-accent sm:whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>Book This Tier</span>
                      <ArrowUpRight className="w-4 h-4 shrink-0" />
                    </button>

                    <a
                      href={buildWhatsAppUrl(
                        `Hello Aizer Tech, I am interested in ${service.name} (${service.startingPrice}).`,
                        cms.hero.whatsappNumber
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="haptic-tap w-full sm:w-auto inline-flex items-center justify-center sm:justify-start gap-2 py-1.5 text-sm text-ink-muted hover:text-[#25D366] sm:whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                      <span>Ask on WhatsApp</span>
                    </a>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* Dedicated MoMo 50% Deposit Bar */}
        <Reveal delay={0.1}>
          <div className="mt-8 ios-glass-gold rounded-[22px] p-5 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-accent mb-2">
                Fast Kickoff · MTN MoMo &amp; Telecel Cash
              </p>
              <h3 className="font-display text-lg sm:text-xl font-semibold text-ink leading-[1.2] mb-2">
                Lock your project build slot with a 50% Mobile Money deposit.
              </h3>
              <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
                Balance is due only after your website or mobile app is tested and ready to launch.
              </p>
            </div>

            <a
              href={buildWhatsAppUrl(
                'Hello Aizer Tech, I am ready to pay the 50% deposit via MoMo to start my project. Please share your Mobile Money details.',
                cms.hero.whatsappNumber
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="haptic-tap w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl bg-accent-btn text-accent-ink text-sm font-semibold hover:bg-accent-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] shrink-0 text-center"
            >
              <Wallet className="w-4 h-4 shrink-0" />
              <span>Pay 50% Deposit via MoMo</span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
};
